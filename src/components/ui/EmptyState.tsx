import { SearchX } from 'lucide-react';

interface EmptyStateProps {
  title: string;
  description: string;
}

export function EmptyState({ title, description }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-white/15 bg-white/[0.02] px-6 py-16 text-center">
      <div className="mb-4 rounded-full border border-white/10 bg-white/[0.03] p-3">
        <SearchX className="h-5 w-5 text-muted" />
      </div>
      <h3 className="font-display text-lg text-paper">{title}</h3>
      <p className="mt-2 max-w-md text-sm leading-6 text-muted">{description}</p>
    </div>
  );
}