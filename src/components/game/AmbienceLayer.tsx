import './game-fx.css';
import type { AudioStage } from '../../game/audio';

/**
 * 全屏氛围层（B 的 game 组件）：雨、雾、闪电、暗角随游戏阶段变化。
 * 纯装饰：pointer-events-none，永远垫在内容（z-0）之下，页面内容需自带 z-10。
 */

export interface AmbienceLayerProps {
  stage: AudioStage;
  /** 结局页专用情绪：good=投对泛金，bad=错/平票泛红 */
  mood?: 'good' | 'bad';
}

export function AmbienceLayer({ stage, mood }: AmbienceLayerProps) {
  return (
    <div className="fx-ambience" data-stage={stage} data-mood={mood} aria-hidden="true">
      <div className="fx-rain-far" />
      <div className="fx-rain" />
      <div className="fx-fog" />
      {stage === 'playing' && <div className="fx-lightning" />}
      <div className="fx-vignette" />
    </div>
  );
}
