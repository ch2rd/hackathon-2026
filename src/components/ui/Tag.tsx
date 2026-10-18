import type { ReactNode } from 'react';
import { cn } from './cn';

interface TagProps {
  children: ReactNode;
  variant?: 'default' | 'gold' | 'crimson';
  className?: string;
}

const variantClasses = {
  default: 'border-white/10 bg-white/[0.04] text-muted',
  gold: 'border-gold/40 bg-gold/10 text-gold',
  crimson: 'border-crimson/40 bg-crimson/10 text-[#e5a4ae]',
} as const;

export function Tag({ children, variant = 'default', className }: TagProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-3 py-1 text-[11px] tracking-[0.12em]',
        variantClasses[variant],
        className,
      )}
    >
      {children}
    </span>
  );
}