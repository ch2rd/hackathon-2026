import { useEffect, useState } from 'react';

/**
 * 打字机效果：文本逐字浮现（旁白用）。
 * 尊重 prefers-reduced-motion：系统设置减弱动效时直接全文显示。
 */

export function useTypewriter(text: string, speedMs = 26): string {
  const [shownChars, setShownChars] = useState(text.length);

  useEffect(() => {
    if (typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
      setShownChars(text.length);
      return;
    }
    setShownChars(0);
    let chars = 0;
    const timer = setInterval(() => {
      chars += 1;
      setShownChars(chars);
      if (chars >= text.length) clearInterval(timer);
    }, speedMs);
    return () => clearInterval(timer);
  }, [text, speedMs]);

  return text.slice(0, shownChars);
}
