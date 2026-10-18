/**
 * 程序化音效骨架（B 维护）—— 零素材、零依赖，全部用 Web Audio API 现场合成。
 *
 * 为什么不用音频文件：项目的场景、立绘、封面全部是程序化生成的（CSS/SVG），
 * 音效走同一条路——体积为 0、没有素材授权问题；而且 AGENTS.md §1.1 的依赖白名单里
 * 本来就没有音频库，howler / tone.js 之类一律不能引。
 *
 * 环境安全：拿不到 AudioContext（jsdom、老浏览器、被策略禁用）时**全模块静默 no-op**，
 * 绝不抛错——否则现有 vitest 用例会被拖垮。
 *
 * 浏览器自动播放策略：用户第一次交互之前 AudioContext 是 suspended，这时播了也没声。
 * 所有 playSfx 都从点击事件里调用，所以在里面顺手 resume() 即可；
 * 另外导出 unlockAudio() 供「全局第一个手势」显式解锁（见 CharacterIntro）。
 */

/** 静音开关在 localStorage 里的键。 */
export const SFX_MUTE_KEY = 'zhenxiangju:sfx-muted';

/** 已配好的音效名。加新音效 = 往 RECIPES 里加一条，调用方只认名字。 */
export type SfxName =
  | 'click' // 点击场景物件
  | 'clue' // 发现线索
  | 'confirm' // 本幕讨论确认
  | 'advance' // 推进下一幕
  | 'vote' // 投票
  | 'reveal' // 结局揭晓
  | 'deny'; // 操作被拒

type AudioContextCtor = typeof AudioContext;

let ctx: AudioContext | null = null;
/** 一旦确认音频不可用就不再重试，避免每次点击都走异常路径。 */
let unavailable = false;

function readMuted(): boolean {
  try {
    return localStorage.getItem(SFX_MUTE_KEY) === 'true';
  } catch {
    return false;
  }
}

let muted = readMuted();
const listeners = new Set<() => void>();

/** 当前是否静音（供 useSyncExternalStore 取快照）。 */
export function isMuted(): boolean {
  return muted;
}

/** 设置静音开关并持久化。 */
export function setMuted(next: boolean): void {
  muted = next;
  try {
    localStorage.setItem(SFX_MUTE_KEY, String(next));
  } catch {
    // 存储不可用（隐私模式等）时只是不持久化，不影响本次会话
  }
  listeners.forEach((listener) => listener());
}

/** 订阅静音开关变化；返回取消订阅函数。 */
export function subscribeMuted(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getAudioContextCtor(): AudioContextCtor | null {
  // 标准全局优先；jsdom / 老环境里可能压根不存在
  if (typeof AudioContext !== 'undefined') return AudioContext;
  if (typeof window === 'undefined') return null;
  const legacy = window as unknown as { webkitAudioContext?: AudioContextCtor };
  return legacy.webkitAudioContext ?? null;
}

/** 懒创建 AudioContext；环境不支持时返回 null。 */
function ac(): AudioContext | null {
  if (unavailable) return null;
  if (ctx) return ctx;
  const Ctor = getAudioContextCtor();
  if (!Ctor) {
    unavailable = true;
    return null;
  }
  try {
    ctx = new Ctor();
  } catch {
    unavailable = true;
    return null;
  }
  return ctx;
}

/** 在用户手势里调用，解锁音频（浏览器自动播放策略）。 */
export function unlockAudio(): void {
  const c = ac();
  if (c && c.state === 'suspended') void c.resume();
}

// ---------- 合成基元 ----------

interface ToneOptions {
  freq: number;
  type: OscillatorType;
  duration: number;
  gain: number;
  /** 扫频目标频率（做下滑 / 上扬） */
  slideTo?: number;
  /** 延迟若干秒再响（拼和弦 / 双音） */
  delay?: number;
}

/** 一个带包络的振荡器音。 */
function tone(c: AudioContext, options: ToneOptions): void {
  const start = c.currentTime + (options.delay ?? 0);
  const osc = c.createOscillator();
  const gain = c.createGain();

  osc.type = options.type;
  osc.frequency.setValueAtTime(options.freq, start);
  if (options.slideTo !== undefined) {
    osc.frequency.exponentialRampToValueAtTime(options.slideTo, start + options.duration);
  }

  // 指数包络不能到 0，所以用极小值当「静音」；起音 12ms 避免爆音
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(options.gain, start + 0.012);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + options.duration);

  osc.connect(gain).connect(c.destination);
  osc.start(start);
  osc.stop(start + options.duration + 0.03);
}

/** 一段过低通的噪声（风、摩挲、闷响）。 */
function noise(c: AudioContext, options: { duration: number; gain: number; cutoff: number }): void {
  const frames = Math.max(1, Math.floor(c.sampleRate * options.duration));
  const buffer = c.createBuffer(1, frames, c.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < frames; i += 1) data[i] = Math.random() * 2 - 1;

  const source = c.createBufferSource();
  source.buffer = buffer;

  const filter = c.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = options.cutoff;

  const gain = c.createGain();
  gain.gain.setValueAtTime(options.gain, c.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + options.duration);

  source.connect(filter).connect(gain).connect(c.destination);
  source.start();
  source.stop(c.currentTime + options.duration);
}

/** 音效配方：一个名字对应一小段合成脚本。 */
const RECIPES: Record<SfxName, (c: AudioContext) => void> = {
  // 木头「叩」——点了个没东西的物件
  click: (c) => tone(c, { freq: 220, type: 'triangle', duration: 0.09, gain: 0.14 }),

  // 上行两音 C5 → G5：发现线索的清脆提示
  clue: (c) => {
    tone(c, { freq: 523.25, type: 'sine', duration: 0.16, gain: 0.18 });
    tone(c, { freq: 783.99, type: 'sine', duration: 0.24, gain: 0.14, delay: 0.1 });
  },

  // 沉稳「叮」：本幕讨论确认
  confirm: (c) => {
    tone(c, { freq: 392, type: 'sine', duration: 0.26, gain: 0.18 });
    tone(c, { freq: 784, type: 'sine', duration: 0.14, gain: 0.05 });
  },

  // 低沉扫频：推进下一幕
  advance: (c) => tone(c, { freq: 110, type: 'sawtooth', duration: 0.5, gain: 0.09, slideTo: 165 }),

  // 闷响 + 心跳低频：投票
  vote: (c) => {
    noise(c, { duration: 0.18, gain: 0.08, cutoff: 600 });
    tone(c, { freq: 60, type: 'sine', duration: 0.32, gain: 0.16 });
  },

  // A 小调三音：悬疑而克制的「揭晓」
  reveal: (c) => {
    tone(c, { freq: 440, type: 'sine', duration: 1.1, gain: 0.13 });
    tone(c, { freq: 523.25, type: 'sine', duration: 1.2, gain: 0.1, delay: 0.12 });
    tone(c, { freq: 659.25, type: 'sine', duration: 1.5, gain: 0.08, delay: 0.24 });
  },

  // 下行方波：操作被拒
  deny: (c) => tone(c, { freq: 200, type: 'square', duration: 0.18, gain: 0.1, slideTo: 120 }),
};

/**
 * 播放一个音效。
 * 静音、环境不支持、或合成过程出错时都静默返回，绝不影响游戏流程。
 */
export function playSfx(name: SfxName): void {
  if (muted) return;
  const c = ac();
  if (!c) return;
  if (c.state === 'suspended') void c.resume(); // 在用户手势里顺手解锁
  try {
    RECIPES[name](c);
  } catch {
    unavailable = true;
  }
}
