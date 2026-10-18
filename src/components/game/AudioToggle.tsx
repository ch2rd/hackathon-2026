import { useState } from 'react';
import { Volume2, VolumeX } from 'lucide-react';
import { gameAudio } from '../../game/audio';

/**
 * BGM 与音效开关。
 * 固定在右下角 AI 助手旁；首次点击即用户手势，Web Audio 在此处才创建 AudioContext。
 */

export function AudioToggle() {
  const [isOn, setIsOn] = useState(gameAudio.enabled);

  return (
    <button
      type="button"
      onClick={() => {
        const next = gameAudio.toggle();
        setIsOn(next);
        if (next) gameAudio.sfx('click');
      }}
      aria-label={isOn ? '关闭声音' : '开启声音'}
      title={isOn ? '关闭 BGM 与音效' : '开启 BGM 与音效'}
      className={[
        'fixed bottom-5 right-24 z-30 flex h-11 w-11 items-center justify-center rounded-full border shadow-lg transition',
        isOn
          ? 'border-amber-600 bg-neutral-900 text-amber-300'
          : 'border-neutral-700 bg-neutral-900 text-neutral-500 hover:text-neutral-300',
      ].join(' ')}
    >
      {isOn ? <Volume2 size={20} /> : <VolumeX size={20} />}
    </button>
  );
}
