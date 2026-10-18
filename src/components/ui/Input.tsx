import { Search } from 'lucide-react';
import type { InputHTMLAttributes } from 'react';
import { cn } from './cn';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  icon?: boolean;
}

export function Input({ icon = false, className, ...props }: InputProps) {
  return (
    <div className="relative">
      {icon && (
        <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
      )}
      <input
        className={cn(
          'w-full rounded-full border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-paper',
          'placeholder:text-muted/70 focus:border-gold/50 focus:outline-none focus:ring-1 focus:ring-gold/30',
          icon && 'pl-11',
          className,
        )}
        {...props}
      />
    </div>
  );
}