/**
 * 游戏音频引擎（B 维护）——纯 Web Audio API 程序化合成，零音频文件、零新依赖。
 *
 * 设计：
 * - BGM 按 RoomStatus 分阶段（waiting 稀疏雨夜氛围 → voting 心跳低音 → ended 定音）；
 * - 音效短小（点击/雷鸣/翻页/投票落槌/结局和弦），全部即时合成；
 * - 浏览器自动播放策略：AudioContext 只在用户点「声音开关」时创建；
 * - 开关状态持久化 localStorage（key: truth-bureau:audio），默认关闭。
 *
 * 注意：setStage/sfx 在未开启时是空操作，且绝不触碰 AudioContext——
 * 保证 jsdom 测试环境（无 AudioContext）下页面效果安全。
 */

export type AudioStage = 'waiting' | 'selecting' | 'playing' | 'voting' | 'ended';

export type SfxName =
  | 'click'
  | 'join'
  | 'thunder'
  | 'pageTurn'
  | 'vote'
  | 'revealGood'
  | 'revealBad'
  | 'revealTie';

const STORAGE_KEY = 'truth-bureau:audio';

/** 各阶段的音阶（A 小调系，越紧张音域越低、节奏越密） */
const STAGE_SCALES: Record<AudioStage, number[]> = {
  waiting: [220, 261.63, 329.63, 392, 440],
  selecting: [220, 246.94, 293.66, 329.63, 392],
  playing: [220, 261.63, 311.13, 329.63, 415.3],
  voting: [110, 130.81, 146.83, 164.81, 220],
  ended: [220, 277.18, 329.63, 440],
};

/** 相邻两音的间隔（秒） */
const STAGE_NOTE_GAP: Record<AudioStage, number> = {
  waiting: 2.4,
  selecting: 1.9,
  playing: 1.5,
  voting: 1.1,
  ended: 2.8,
};

class GameAudioEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private bgmGain: GainNode | null = null;
  private droneOscs: OscillatorNode[] = [];
  private schedulerId: ReturnType<typeof setInterval> | null = null;
  private nextNoteAt = 0;
  private heartbeat = 0;
  stage: AudioStage = 'waiting';
  enabled = false;

  constructor() {
    try {
      this.enabled = localStorage.getItem(STORAGE_KEY) === 'on';
    } catch {
      this.enabled = false;
    }
  }

  /** 切换开关；返回最新状态。只有这里允许创建 AudioContext（用户手势内）。 */
  toggle(): boolean {
    this.setEnabled(!this.enabled);
    return this.enabled;
  }

  setEnabled(on: boolean): void {
    this.enabled = on;
    try {
      localStorage.setItem(STORAGE_KEY, on ? 'on' : 'off');
    } catch {
      /* 隐私模式下降级即可 */
    }
    if (on) {
      this.ensureContext();
      this.startBgm();
    } else {
      this.stopBgm();
    }
  }

  setStage(stage: AudioStage): void {
    this.stage = stage;
  }

  sfx(name: SfxName): void {
    if (!this.enabled) return;
    this.ensureContext();
    const ctx = this.ctx;
    const master = this.masterGain;
    if (!ctx || !master) return;
    const now = ctx.currentTime;
    switch (name) {
      case 'click':
        this.blip(880, 0.05, 0.05, 'square', now);
        break;
      case 'join':
        this.blip(523.25, 0.09, 0.08, 'triangle', now);
        this.blip(783.99, 0.12, 0.08, 'triangle', now + 0.1);
        break;
      case 'thunder':
        this.noiseBurst(1.8, 120, 0.5, now);
        break;
      case 'pageTurn':
        this.noiseBurst(0.22, 2400, 0.12, now);
        break;
      case 'vote':
        this.blip(320, 0.09, 0.25, 'triangle', now);
        this.blip(180, 0.14, 0.3, 'sine', now + 0.02);
        break;
      case 'revealGood':
        [261.63, 329.63, 392, 523.25].forEach((freq, index) => {
          this.blip(freq, 0.5, 0.16, 'sine', now + index * 0.14);
        });
        break;
      case 'revealBad':
        this.blip(110, 1.6, 0.2, 'sawtooth', now);
        this.blip(116.54, 1.6, 0.16, 'sawtooth', now);
        break;
      case 'revealTie':
        this.blip(146.83, 1.2, 0.18, 'sine', now);
        break;
    }
  }

  // ---------- 内部 ----------

  private ensureContext(): void {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') void this.ctx.resume();
      return;
    }
    try {
      const ctx = new AudioContext();
      this.masterGain = ctx.createGain();
      this.masterGain.gain.value = 0.5;
      this.masterGain.connect(ctx.destination);
      this.bgmGain = ctx.createGain();
      this.bgmGain.gain.value = 0.32;
      this.bgmGain.connect(this.masterGain);
      this.ctx = ctx;
    } catch {
      this.ctx = null; // 环境不支持则整体静默
    }
  }

  private startBgm(): void {
    const ctx = this.ctx;
    const bgm = this.bgmGain;
    if (!ctx || !bgm || this.schedulerId) return;
    // 持续低音 drone：两只微失谐正弦 + 低通，营造雨夜底噪
    const droneFilter = ctx.createBiquadFilter();
    droneFilter.type = 'lowpass';
    droneFilter.frequency.value = 220;
    droneFilter.connect(bgm);
    this.droneOscs = [55, 55.5].map((freq) => {
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = freq;
      const gain = ctx.createGain();
      gain.gain.value = 0.12;
      osc.connect(gain);
      gain.connect(droneFilter);
      osc.start();
      return osc;
    });
    this.nextNoteAt = ctx.currentTime + 0.5;
    this.heartbeat = 0;
    this.schedulerId = setInterval(() => this.schedule(), 120);
  }

  private stopBgm(): void {
    if (this.schedulerId) {
      clearInterval(this.schedulerId);
      this.schedulerId = null;
    }
    for (const osc of this.droneOscs) {
      try {
        osc.stop();
      } catch {
        /* 已停止 */
      }
    }
    this.droneOscs = [];
  }

  /** 前瞻调度器：把接下来 0.3 秒内该响的音排进 AudioContext 时间线 */
  private schedule(): void {
    const ctx = this.ctx;
    if (!ctx) return;
    while (this.nextNoteAt < ctx.currentTime + 0.3) {
      const scale = STAGE_SCALES[this.stage];
      const freq = scale[Math.floor(Math.random() * scale.length)];
      this.blip(freq, 0.9, 0.05, this.stage === 'voting' ? 'sine' : 'triangle', this.nextNoteAt, this.bgmGain ?? undefined);
      if (this.stage === 'voting') {
        // 心跳：每两个音各来一下闷响
        this.blip(60, 0.16, 0.22, 'sine', this.nextNoteAt + (this.heartbeat % 2) * 0.35, this.bgmGain ?? undefined);
        this.heartbeat += 1;
      }
      this.nextNoteAt += STAGE_NOTE_GAP[this.stage] * (0.8 + Math.random() * 0.5);
    }
  }

  private blip(freq: number, durSec: number, gainVal: number, type: OscillatorType, at: number, dest?: GainNode): void {
    const ctx = this.ctx;
    const master = this.masterGain;
    if (!ctx || !master) return;
    const osc = ctx.createOscillator();
    osc.type = type;
    osc.frequency.value = freq;
    const env = ctx.createGain();
    env.gain.setValueAtTime(0.0001, at);
    env.gain.exponentialRampToValueAtTime(gainVal, at + 0.02);
    env.gain.exponentialRampToValueAtTime(0.0001, at + durSec);
    osc.connect(env);
    env.connect(dest ?? master);
    osc.start(at);
    osc.stop(at + durSec + 0.05);
  }

  private noiseBurst(durSec: number, lowpassHz: number, gainVal: number, at: number): void {
    const ctx = this.ctx;
    const master = this.masterGain;
    if (!ctx || !master) return;
    const length = Math.floor(ctx.sampleRate * durSec);
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i += 1) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / length);
    }
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = lowpassHz;
    const env = ctx.createGain();
    env.gain.value = gainVal;
    source.connect(filter);
    filter.connect(env);
    env.connect(master);
    source.start(at);
  }
}

/** 全局单例：页面只通过它发声，永不直接 new AudioContext。 */
export const gameAudio = new GameAudioEngine();
