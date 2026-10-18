import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { cn } from './cn';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  children: ReactNode;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    'bg-gold text-ink hover:bg-[#d6b77c] active:bg-[#c19a55] shadow-[0_0_24px_rgba(200,169,106,0.24)]',
  secondary:
    'border border-white/15 bg-white/[0.03] text-paper hover:border-gold/50 hover:text-gold',
  ghost: 'text-muted hover:bg-white/[0.04] hover:text-paper',
  danger:
    'border border-crimson/60 bg-crimson/10 text-[#f2b8bf] hover:border-crimson hover:bg-crimson/20',
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'px-3 py-1.5 text-xs tracking-[0.18em]',
  md: 'px-5 py-2.5 text-sm tracking-[0.12em]',
  lg: 'px-7 py-3.5 text-base tracking-[0.08em]',
};

export function Button({
  variant = 'primary',
  size = 'md',
  className,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-full font-medium transition-all duration-200',
        'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold',
        'disabled:cursor-not-allowed disabled:opacity-50',
        variantClasses[variant],
        sizeClasses[size],
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}