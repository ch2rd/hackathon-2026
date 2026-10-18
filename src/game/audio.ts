/**
 * 游戏音频引擎 —— 只播放一段文件音乐。
 *
 * 音源：`public/audio/universfield-suspenseful-dark-background.mp3`（循环播放）。
 *
 * 设计（2026-10-18 按需求调整）：
 * - 程序化合成的 BGM 与音效**已按需求全部移除**，游戏内唯一的声音来源就是上面这段音乐；
 * - 不再创建 AudioContext，只用 `<audio>` 元素：兼容面更宽，也没有自动播放策略的坑；
 * - 开关状态持久化 localStorage（key: truth-bureau:audio），默认关闭；
 * - 必须可降级：文件缺失 / 解码失败 / 环境不支持（jsdom）时静默跳过，不抛错、不阻塞游戏。
 *
 * 兼容说明：`setStage()` 与 `sfx()` 保留为空实现，因为 GamePage / RoomPage / EndingPage /
 * AudioToggle 还在调用它们。要彻底清掉，连调用点一起删即可，删完本文件可以只剩
 * `enabled` + `toggle()` + `setEnabled()`。
 */

export type AudioStage = 'waiting' | 'selecting' | 'playing' | 'voting' | 'ended';

/** 保留类型以兼容既有调用点：合成音效已移除，`sfx()` 现在是空操作。 */
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

/** 唯一的音乐文件：悬疑感铺底乐 */
const MUSIC_SRC = '/audio/universfield-suspenseful-dark-background.mp3';

/** 背景音乐音量（0~1）。嫌吵就调小这里。 */
const MUSIC_VOLUME = 0.35;

class GameAudioEngine {
  /** 当前阶段。目前只有一段音乐，不按阶段切歌；保留给以后按阶段换曲子用。 */
  stage: AudioStage = 'waiting';
  enabled = false;
  /** 音乐元素；声音未开启时恒为 null */
  private el: HTMLAudioElement | null = null;

  constructor() {
    try {
      this.enabled = localStorage.getItem(STORAGE_KEY) === 'on';
    } catch {
      this.enabled = false;
    }
  }

  /** 切换开关；返回最新状态。第一次点即用户手势，浏览器允许此时起播。 */
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
      this.playMusic();
    } else {
      this.pauseMusic();
    }
  }

  /** 记录当前阶段（不切歌）。 */
  setStage(stage: AudioStage): void {
    this.stage = stage;
  }

  /** 合成音效已移除，保留空实现以兼容现有调用点。 */
  sfx(_name: SfxName): void {
    /* 无操作：音效按需求移除，游戏内只保留文件音乐 */
  }

  // ---------- 内部 ----------

  /**
   * 播放音乐。任何异常都吞掉：
   * 宁可整局没有声音，也不能让游戏页因为一段背景音报错
   * （部署漏带 public/audio、浏览器拦截自动播放时尤其重要）。
   */
  private playMusic(): void {
    if (typeof Audio === 'undefined') return; // jsdom / 极旧环境
    try {
      if (!this.el) {
        const el = new Audio(MUSIC_SRC);
        el.loop = true;
        el.preload = 'none';
        this.el = el;
      }
      this.el.volume = MUSIC_VOLUME;
      void this.el.play().catch(() => undefined);
    } catch {
      this.el = null;
    }
  }

  /** 暂停音乐。不销毁元素，重新开启声音时直接续播。 */
  private pauseMusic(): void {
    try {
      this.el?.pause();
    } catch {
      /* 环境不支持则忽略 */
    }
  }
}

/** 全局单例：页面只通过它控制声音。 */
export const gameAudio = new GameAudioEngine();
