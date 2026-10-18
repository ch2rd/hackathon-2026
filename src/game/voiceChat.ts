/**
 * 玩家语音（B 维护）—— WebRTC 全互联 + 轮询信令，零依赖、零音频素材。
 *
 * ## 为什么这么设计
 *
 * - **信令走轮询而不是 WebSocket**：AGENTS.md §0.1 把「WebSocket 实时同步」列为 MVP 非目标，
 *   所以 SDP/ICE 这些「小纸条」复用现有 HTTP 轮询通道（Mock 模式走 localStorage 队列）。
 *   真正的说话声是 **WebRTC P2P 直连**，不经过服务器、不进 localStorage。
 * - **一次 getUserMedia，之后只切 `track.enabled`**：按住说话不需要重新协商（renegotiation），
 *   这是 PTT 最稳的做法 —— 如果每次开麦都 addTrack/removeTrack，每次都要重新握手，延迟高且易抖。
 * - **发起方规则是确定性的**：`playerId` 字典序小的一方发 offer。
 *   两边同时发 offer 会 glare，用这条规则彻底绕开，不需要 perfect negotiation 那套复杂度。
 * - **`hello` 用来发现谁真的开了麦**：否则会对没加入语音的玩家白建连接，
 *   那些连接永远停在 connecting，既浪费又难看。
 *
 * ## 拓扑
 *
 * 全互联 mesh：N 个人每人 (N-1) 条连接。语音是 opus 低码率，4～6 人够用；
 * 再多就该上 SFU 了，那超出黑客松范围。
 *
 * ## 麦克风安全上下文
 *
 * `getUserMedia` 只在 https / localhost 存在。用 http 局域网地址访问时
 * `navigator.mediaDevices` 直接是 undefined —— 本模块会通过 `insecure` 标记把这件事
 * 如实报给 UI，而不是假装能用。
 */

import { pollVoiceSignals, sendVoiceSignal } from '../api/voice';
import type { VoiceSignal, VoiceSignalKind } from '../types/models';

/** 公共 STUN。局域网内靠 host candidate 就能直连，STUN 只是提高公网成功率。 */
const ICE_SERVERS: RTCIceServer[] = [{ urls: 'stun:stun.l.google.com:19302' }];

/** 信令轮询间隔。ICE 有几十秒的容忍度，800ms 足够，又不会把后端刷爆。 */
const POLL_INTERVAL_MS = 800;

/** 单条连接最多重试几次，避免失败后在后台无限重建。 */
const MAX_RETRIES = 3;

const RETRY_DELAY_MS = 1500;

export type VoiceStatus = 'idle' | 'joining' | 'joined' | 'error';

export interface VoicePeerView {
  playerId: string;
  nickname: string;
  connected: boolean;
}

export interface VoiceSnapshot {
  /** 浏览器是否具备 WebRTC + 麦克风能力 */
  supported: boolean;
  /** 是否非安全上下文（http 局域网地址）—— 麦克风会被浏览器禁用 */
  insecure: boolean;
  status: VoiceStatus;
  /** 按住说话中 */
  transmitting: boolean;
  micError: string | null;
  peers: VoicePeerView[];
}

interface PlayerBrief {
  id: string;
  nickname: string;
}

interface PeerEntry {
  pc: RTCPeerConnection;
  nickname: string;
  connected: boolean;
  retries: number;
  /** 是否已经发过 offer（防止 hello 重复触发） */
  offered: boolean;
}

interface VoiceSession {
  roomId: string;
  mePlayerId: string;
  players: PlayerBrief[];
  stream: MediaStream | null;
  track: MediaStreamTrack | null;
  peers: Map<string, PeerEntry>;
  /** 远端音轨挂载的 <audio>，key 是对端 playerId */
  audio: Map<string, HTMLAudioElement>;
  /** 远端描述还没设好时先缓存 candidate，否则 addIceCandidate 会抛错 */
  pendingIce: Map<string, RTCIceCandidateInit[]>;
  pollTimer: number | null;
  polling: boolean;
}

// ---------- 外部上下文与内部会话 ----------

interface VoiceContext {
  roomId: string;
  mePlayerId: string;
  players: PlayerBrief[];
}

let context: VoiceContext | null = null;
let session: VoiceSession | null = null;

// ---------- 快照（给 useSyncExternalStore 用）----------

function detectSupport(): { supported: boolean; insecure: boolean } {
  if (typeof window === 'undefined') return { supported: false, insecure: false };
  const insecure = window.isSecureContext === false;
  const hasRtc = typeof RTCPeerConnection !== 'undefined';
  const hasMic = typeof navigator !== 'undefined' && navigator.mediaDevices?.getUserMedia !== undefined;
  return { supported: hasRtc && hasMic, insecure };
}

const detected = detectSupport();

let snapshot: VoiceSnapshot = {
  supported: detected.supported,
  insecure: detected.insecure,
  status: 'idle',
  transmitting: false,
  micError: null,
  peers: [],
};

const listeners = new Set<() => void>();

export function getVoiceSnapshot(): VoiceSnapshot {
  return snapshot;
}

export function subscribeVoice(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function peerViews(): VoicePeerView[] {
  if (!session) return [];
  return session.players
    .filter((player) => player.id !== session?.mePlayerId)
    .map((player) => ({
      playerId: player.id,
      nickname: player.nickname,
      connected: session?.peers.get(player.id)?.connected ?? false,
    }));
}

function sameSnapshot(a: VoiceSnapshot, b: VoiceSnapshot): boolean {
  if (
    a.supported !== b.supported ||
    a.insecure !== b.insecure ||
    a.status !== b.status ||
    a.transmitting !== b.transmitting ||
    a.micError !== b.micError ||
    a.peers.length !== b.peers.length
  ) {
    return false;
  }
  return a.peers.every((peer, index) => {
    const other = b.peers[index];
    return peer.playerId === other.playerId && peer.nickname === other.nickname && peer.connected === other.connected;
  });
}

function publish(patch: Partial<VoiceSnapshot> = {}): void {
  const next: VoiceSnapshot = {
    ...snapshot,
    ...patch,
    peers: patch.peers ?? peerViews(),
  };
  if (sameSnapshot(snapshot, next)) return;
  snapshot = next;
  listeners.forEach((listener) => listener());
}

// ---------- 信令收发 ----------

function nicknameOf(playerId: string): string {
  return context?.players.find((player) => player.id === playerId)?.nickname ?? '队友';
}

async function send(peerId: string, kind: VoiceSignalKind, payload: string): Promise<void> {
  if (!session) return;
  try {
    await sendVoiceSignal({
      roomId: session.roomId,
      fromPlayerId: session.mePlayerId,
      toPlayerId: peerId,
      kind,
      payload,
    });
  } catch {
    // 单条信令失败不阻塞：下一轮轮询还能补发（offer 会由重试逻辑重来）
  }
}

// ---------- 连接管理 ----------

function attachAudio(peerId: string, stream: MediaStream): void {
  if (!session) return;

  let element = session.audio.get(peerId);
  if (!element) {
    element = document.createElement('audio');
    element.autoplay = true;
    element.setAttribute('playsinline', 'true');
    element.dataset.voicePeer = peerId;
    document.body.appendChild(element);
    session.audio.set(peerId, element);
  }
  element.srcObject = stream;
  // 自动播放可能被策略拦截；被拦时保持静默，用户点一下「开麦」后的手势会放行
  void element.play().catch(() => undefined);
}

function ensurePeer(peerId: string): PeerEntry | null {
  if (!session) return null;

  const existing = session.peers.get(peerId);
  if (existing) {
    existing.nickname = nicknameOf(peerId);
    return existing;
  }

  const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
  const entry: PeerEntry = { pc, nickname: nicknameOf(peerId), connected: false, retries: 0, offered: false };

  pc.onicecandidate = (event) => {
    if (event.candidate) void send(peerId, 'ice', JSON.stringify(event.candidate.toJSON()));
  };

  pc.ontrack = (event) => {
    const [stream] = event.streams;
    if (stream) attachAudio(peerId, stream);
  };

  pc.onconnectionstatechange = () => {
    entry.connected = pc.connectionState === 'connected';
    publish();
    if (pc.connectionState === 'failed') retryPeer(peerId);
  };

  // 必须在 createOffer 之前把音轨加进去，否则 SDP 里没有音频
  if (session.track && session.stream) {
    pc.addTrack(session.track, session.stream);
  }

  session.peers.set(peerId, entry);
  publish();
  return entry;
}

/** 只有字典序小的一方发 offer —— 确定性规则，彻底避开 glare。 */
async function offerTo(peerId: string): Promise<void> {
  if (!session) return;
  if (session.mePlayerId >= peerId) return;

  const entry = ensurePeer(peerId);
  if (!entry || entry.offered) return;

  entry.offered = true;
  try {
    const offer = await entry.pc.createOffer();
    await entry.pc.setLocalDescription(offer);
    await send(peerId, 'offer', JSON.stringify(entry.pc.localDescription));
  } catch {
    entry.offered = false;
  }
}

async function flushPendingIce(peerId: string): Promise<void> {
  if (!session) return;
  const entry = session.peers.get(peerId);
  const queued = session.pendingIce.get(peerId);
  if (!entry || !queued || queued.length === 0) return;

  session.pendingIce.delete(peerId);
  for (const candidate of queued) {
    try {
      await entry.pc.addIceCandidate(candidate);
    } catch {
      // 过期 candidate 忽略即可
    }
  }
}

function retryPeer(peerId: string): void {
  if (!session) return;
  const entry = session.peers.get(peerId);
  if (!entry || entry.retries >= MAX_RETRIES) return;

  const retries = entry.retries + 1;
  entry.retries = retries;
  try {
    entry.pc.close();
  } catch {
    // 已经关掉了
  }
  session.peers.delete(peerId);
  publish();

  window.setTimeout(() => {
    if (!session) return;
    if (session.mePlayerId < peerId) {
      void offerTo(peerId);
    } else {
      // 我是被动方：喊一声 hello，让对方重新发 offer
      void send(peerId, 'hello', '{}');
    }
  }, RETRY_DELAY_MS);
}

async function handleSignal(signal: VoiceSignal): Promise<void> {
  if (!session || signal.toPlayerId !== session.mePlayerId) return;
  const from = signal.fromPlayerId;

  if (signal.kind === 'hello') {
    ensurePeer(from);
    if (session.mePlayerId < from) void offerTo(from);
    return;
  }

  const entry = ensurePeer(from);
  if (!entry) return;

  try {
    if (signal.kind === 'offer') {
      await entry.pc.setRemoteDescription(JSON.parse(signal.payload) as RTCSessionDescriptionInit);
      await flushPendingIce(from);
      const answer = await entry.pc.createAnswer();
      await entry.pc.setLocalDescription(answer);
      await send(from, 'answer', JSON.stringify(entry.pc.localDescription));
      return;
    }

    if (signal.kind === 'answer') {
      await entry.pc.setRemoteDescription(JSON.parse(signal.payload) as RTCSessionDescriptionInit);
      await flushPendingIce(from);
      return;
    }

    // ice
    const candidate = JSON.parse(signal.payload) as RTCIceCandidateInit;
    if (entry.pc.remoteDescription) {
      await entry.pc.addIceCandidate(candidate);
    } else {
      const queued = session.pendingIce.get(from) ?? [];
      queued.push(candidate);
      session.pendingIce.set(from, queued);
    }
  } catch {
    // 单条坏信令不该中断整轮轮询；握手失败会由 connectionState 触发重试
  }
}

function startPolling(): void {
  if (!session || session.pollTimer !== null) return;

  const tick = async (): Promise<void> => {
    if (!session || session.polling) return;
    session.polling = true;
    try {
      const signals = await pollVoiceSignals(session.roomId, session.mePlayerId);
      for (const signal of signals) {
        await handleSignal(signal);
      }
    } catch {
      // 网络抖动：下一轮继续
    } finally {
      if (session) session.polling = false;
    }
  };

  session.pollTimer = window.setInterval(() => void tick(), POLL_INTERVAL_MS);
  void tick();
}

function stopSession(): void {
  if (!session) return;

  if (session.pollTimer !== null) window.clearInterval(session.pollTimer);

  session.peers.forEach((entry) => {
    try {
      entry.pc.close();
    } catch {
      // 已经关掉了
    }
  });

  session.audio.forEach((element) => {
    element.srcObject = null;
    element.remove();
  });

  session.stream?.getTracks().forEach((track) => track.stop());
  session = null;
}

// ---------- 对外 API ----------

/**
 * 把最新的房间/玩家信息同步进来。房间轮询每次都会调它，必须是幂等的。
 * 房间或本人身份变了会强制断开重建（避免把麦克风流接到错误的房间）。
 */
export function syncVoiceContext(roomId: string, mePlayerId: string, players: PlayerBrief[]): void {
  if (session && (session.roomId !== roomId || session.mePlayerId !== mePlayerId)) {
    stopSession();
    publish({ status: 'idle', transmitting: false, peers: [], micError: null });
  }

  context = { roomId, mePlayerId, players };

  if (session) {
    session.players = players;
    publish();
  }
}

function micErrorMessage(error: unknown): string {
  const name = typeof error === 'object' && error !== null ? (error as { name?: string }).name : undefined;
  if (name === 'NotAllowedError' || name === 'SecurityError') {
    return '麦克风权限被拒绝了。点地址栏左侧的图标允许麦克风，然后重试。';
  }
  if (name === 'NotFoundError' || name === 'OverconstrainedError') {
    return '没找到可用的麦克风设备。';
  }
  if (name === 'NotReadableError') {
    return '麦克风被其它程序占用了（比如会议软件），关掉它再试。';
  }
  return '麦克风打开失败，请检查设备与浏览器权限。';
}

/** 加入语音频道（申请麦克风并开始握手）。 */
export async function joinVoice(): Promise<void> {
  if (!context) return;
  if (session) return;

  const support = detectSupport();
  if (!support.supported) {
    publish({
      supported: false,
      insecure: support.insecure,
      status: 'error',
      micError: support.insecure ? '当前是非安全上下文（http），浏览器禁用了麦克风。' : '当前浏览器不支持语音。',
    });
    return;
  }

  publish({ status: 'joining', micError: null });

  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
    });
    const track = stream.getAudioTracks()[0] ?? null;

    // 加入即静音待命：按住说话才把 enabled 打开
    if (track) track.enabled = false;

    session = {
      roomId: context.roomId,
      mePlayerId: context.mePlayerId,
      players: context.players,
      stream,
      track,
      peers: new Map(),
      audio: new Map(),
      pendingIce: new Map(),
      pollTimer: null,
      polling: false,
    };

    publish({ status: 'joined', transmitting: false, micError: null });

    // 广播 hello：告诉房间里其他人「我开了麦」，顺便发现谁已经开了麦
    const others = context.players.filter((player) => player.id !== context?.mePlayerId);
    await Promise.all(others.map((player) => send(player.id, 'hello', '{}')));

    startPolling();
  } catch (error) {
    stopSession();
    publish({ status: 'error', micError: micErrorMessage(error) });
  }
}

/** 退出语音频道，关掉麦克风并释放所有连接。 */
export function leaveVoice(): void {
  stopSession();
  publish({ status: 'idle', transmitting: false, peers: [], micError: null });
}

/** 按住说话：true = 开麦，false = 闭麦。 */
export function setVoiceTransmitting(on: boolean): void {
  if (!session?.track) return;
  session.track.enabled = on;
  publish({ transmitting: on });
}
