/**
 * 程序化音效骨架测试。
 *
 * 重点：环境里没有 AudioContext（jsdom 就是这样）时，全模块必须**静默 no-op**，
 * 否则现有页面用例会被音频模块拖垮。另外覆盖静音开关的持久化与订阅。
 */

import { beforeEach, describe, expect, it } from 'vitest';
import { SFX_MUTE_KEY, isMuted, playSfx, setMuted, subscribeMuted, unlockAudio } from './audio';

describe('程序化音效', () => {
  beforeEach(() => {
    localStorage.clear();
    setMuted(false);
  });

  it('没有 AudioContext（jsdom）时 playSfx / unlockAudio 都不抛错', () => {
    expect(() => unlockAudio()).not.toThrow();
    expect(() => playSfx('click')).not.toThrow();
    expect(() => playSfx('clue')).not.toThrow();
    expect(() => playSfx('reveal')).not.toThrow();
  });

  it('静音开关写进 localStorage，并能读回', () => {
    expect(isMuted()).toBe(false);
    setMuted(true);
    expect(isMuted()).toBe(true);
    expect(localStorage.getItem(SFX_MUTE_KEY)).toBe('true');
    setMuted(false);
    expect(localStorage.getItem(SFX_MUTE_KEY)).toBe('false');
  });

  it('订阅者能收到开关变化，取消订阅后不再收到', () => {
    let calls = 0;
    const unsubscribe = subscribeMuted(() => {
      calls += 1;
    });
    setMuted(true);
    expect(calls).toBe(1);
    unsubscribe();
    setMuted(false);
    expect(calls).toBe(1);
  });
});
