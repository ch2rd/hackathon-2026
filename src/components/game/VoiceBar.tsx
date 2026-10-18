import { AlertTriangle, Mic, MicOff, PhoneOff } from 'lucide-react';
import { useEffect, useSyncExternalStore, type PointerEvent as ReactPointerEvent } from 'react';
import {
  getVoiceSnapshot,
  joinVoice,
  leaveVoice,
  setVoiceTransmitting,
  subscribeVoice,
  syncVoiceContext,
} from '../../game/voiceChat';
import { useGameStore } from '../../stores/gameStore';

/**
 * 玩家语音条（B 的 game 组件）。
 *
 * 交互模型是「开麦 → 按住说话」：
 * - 点「开麦」= 申请麦克风并加入语音频道（加入后默认闭麦，不会一直传声音）；
 * - 按住「按住说话」= 才真的把 `track.enabled` 打开；
 * - 松手 / 指针移出按钮 = 立刻闭麦。
 *
 * 为什么用 pointer 事件而不是 mouse/touch 各写一套：Pointer Events 一套覆盖鼠标、触摸、
 * 手写笔，配合 `setPointerCapture` 能保证「按住后手指滑出按钮」也不会卡在开麦状态。
 */

export function VoiceBar() {
  const snapshot = useSyncExternalStore(subscribeVoice, getVoiceSnapshot);
  const roomState = useGameStore((s) => s.roomState);

  // 房间轮询每次都把最新的玩家名单同步进语音引擎（幂等）
  useEffect(() => {
    if (!roomState) return;
    syncVoiceContext(
      roomState.room.id,
      roomState.me.player.id,
      roomState.players.map((player) => ({ id: player.id, nickname: player.nickname })),
    );
  }, [roomState]);

  // 离开页面必须关麦，否则麦克风指示灯会一直亮着
  useEffect(
    () => () => {
      leaveVoice();
    },
    [],
  );

  const startTalk = (event: ReactPointerEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    setVoiceTransmitting(true);
  };

  const stopTalk = (event: ReactPointerEvent<HTMLButtonElement>) => {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    setVoiceTransmitting(false);
  };

  if (!snapshot.supported) {
    return (
      <div
        data-testid="voice-bar"
        className="rounded-md border border-amber-800/70 bg-amber-950/50 p-3 text-xs text-amber-200"
      >
        <p className="flex items-center gap-1.5 font-medium">
          <AlertTriangle className="h-3.5 w-3.5" />
          这台设备暂时开不了麦
        </p>
        <p className="mt-1 leading-5">
          {snapshot.insecure
            ? '当前是 http 局域网地址，浏览器出于安全策略禁用了麦克风。请改用 https 访问，或在 Chrome 打开 chrome://flags/#unsafely-treat-insecure-origin-as-secure 把本站加入白名单后重启浏览器。'
            : '当前浏览器不支持 WebRTC 录音（建议 Chrome / Edge / Safari 新版本）。'}
        </p>
      </div>
    );
  }

  const joined = snapshot.status === 'joined';
  const onlineCount = snapshot.peers.filter((peer) => peer.connected).length;

  return (
    <div
      data-testid="voice-bar"
      className="flex flex-wrap items-center gap-2 rounded-md border border-neutral-800 bg-neutral-950/80 p-2 text-xs"
    >
      {!joined ? (
        <button
          type="button"
          onClick={() => void joinVoice()}
          disabled={snapshot.status === 'joining'}
          className="flex items-center gap-1.5 rounded-md border border-emerald-700 bg-emerald-900/60 px-3 py-1.5 font-medium text-emerald-100 transition hover:bg-emerald-900 disabled:opacity-50"
        >
          <Mic className="h-3.5 w-3.5" />
          {snapshot.status === 'joining' ? '正在请求麦克风…' : '开麦'}
        </button>
      ) : (
        <>
          <button
            type="button"
            onPointerDown={startTalk}
            onPointerUp={stopTalk}
            onPointerCancel={stopTalk}
            onLostPointerCapture={() => setVoiceTransmitting(false)}
            onContextMenu={(event) => event.preventDefault()}
            className={[
              'flex touch-none select-none items-center gap-1.5 rounded-md border px-3 py-1.5 font-medium transition',
              snapshot.transmitting
                ? 'border-red-500 bg-red-900/80 text-red-100'
                : 'border-neutral-700 bg-neutral-900 text-neutral-200 hover:border-neutral-500',
            ].join(' ')}
          >
            {snapshot.transmitting ? <Mic className="h-3.5 w-3.5" /> : <MicOff className="h-3.5 w-3.5" />}
            {snapshot.transmitting ? '正在说话…' : '按住说话'}
          </button>

          <button
            type="button"
            onClick={leaveVoice}
            className="flex items-center gap-1.5 rounded-md border border-neutral-700 px-2 py-1.5 text-neutral-400 transition hover:border-red-700 hover:text-red-300"
          >
            <PhoneOff className="h-3.5 w-3.5" />
            退出
          </button>

          <span className="text-neutral-600">|</span>
          <span className="text-neutral-400">
            语音 {onlineCount + 1} 人
            {snapshot.peers.length > onlineCount && `（${snapshot.peers.length - onlineCount} 人连接中）`}
          </span>

          {snapshot.peers.map((peer) => (
            <span
              key={peer.playerId}
              className="flex items-center gap-1 rounded border border-neutral-800 px-1.5 py-0.5 text-neutral-400"
            >
              <span
                className={[
                  'h-1.5 w-1.5 rounded-full',
                  peer.connected ? 'bg-emerald-400' : 'bg-neutral-600',
                ].join(' ')}
              />
              {peer.nickname}
            </span>
          ))}
        </>
      )}

      {snapshot.micError && <span className="w-full leading-5 text-amber-300">{snapshot.micError}</span>}
    </div>
  );
}
