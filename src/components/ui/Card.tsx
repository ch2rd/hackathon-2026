import type { HTMLAttributes } from 'react';
import { cn } from './cn';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  interactive?: boolean;
}

export function Card({ interactive = false, className, children, ...props }: CardProps) {
  return (
    <div
      className={cn(
        'rounded-2xl border border-white/10 bg-surface/80 backdrop-blur',
        interactive &&
          'transition-all duration-300 hover:-translate-y-1 hover:border-gold/40 hover:shadow-[0_20px_60px_-24px_rgba(200,169,106,0.35)]',
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}