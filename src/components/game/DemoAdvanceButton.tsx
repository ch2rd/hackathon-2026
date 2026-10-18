import { useState } from 'react';

/**
 * 演示推进按钮（AGENTS.md §4.10 演示兜底 / §10.3）。
 * 规则：仅在 VITE_DEMO_MODE=true 时由页面渲染本组件（页面用
 * selectors.canDemoAdvance 判断）；点击必须二次确认才回调。
 */

export interface DemoAdvanceButtonProps {
  onAdvance: () => void;
  disabled?: boolean;
}

export function DemoAdvanceButton({ onAdvance, disabled = false }: DemoAdvanceButtonProps) {
  const [isConfirming, setIsConfirming] = useState(false);

  const handleClick = () => {
    if (isConfirming) {
      setIsConfirming(false);
      onAdvance();
    } else {
      setIsConfirming(true);
    }
  };

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={handleClick}
      onBlur={() => setIsConfirming(false)}
      className={[
        'rounded-md border px-4 py-2 text-sm transition',
        isConfirming
          ? 'border-red-500 bg-red-950 text-red-200'
          : 'border-neutral-700 bg-neutral-900 text-neutral-300 hover:border-neutral-500',
        disabled ? 'opacity-50' : '',
      ].join(' ')}
    >
      {isConfirming ? '再点一次确认强制推进' : '演示推进'}
    </button>
  );
}
