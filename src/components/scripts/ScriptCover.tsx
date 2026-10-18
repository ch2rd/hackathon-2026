import { useState } from 'react';
import type { Genre } from '../../types/models';
import { cn } from '../ui/cn';

interface ScriptCoverProps {
  title: string;
  genre: Genre;
  coverUrl?: string;
  priority?: boolean;
  className?: string;
}

const genreClasses: Record<Genre, string> = {
  硬核: 'from-[#131a2a] via-[#1b2436] to-[#0b0b0f]',
  情感: 'from-[#2a1420] via-[#3b1c2a] to-[#0b0b0f]',
  恐怖: 'from-[#131313] via-[#1f1f1f] to-[#0b0b0f]',
  欢乐: 'from-[#2a1e10] via-[#3a2a15] to-[#0b0b0f]',
  推理: 'from-[#101828] via-[#1d2433] to-[#0b0b0f]',
};

export function ScriptCover({ title, genre, coverUrl, priority = false, className }: ScriptCoverProps) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const hasArtwork = Boolean(coverUrl && coverUrl !== failedUrl);
  const stillUrl = coverUrl?.startsWith('/covers/') && coverUrl.endsWith('.svg')
    ? coverUrl.replace(/\.svg$/, '.poster.svg')
    : coverUrl;

  return (
    <div className={cn('relative isolate overflow-hidden rounded-xl bg-gradient-to-br', genreClasses[genre], className)}>
      <div className="absolute inset-0 opacity-40 mix-blend-soft-light [background-image:radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.16),transparent_45%),radial-gradient(circle_at_80%_80%,rgba(200,169,106,0.16),transparent_40%)]" />
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="font-display text-5xl text-white/5 md:text-7xl">{title.slice(0, 1)}</span>
      </div>
      {hasArtwork && (
        <picture>
          <source media="(prefers-reduced-motion: reduce)" srcSet={stillUrl} />
          <img
            src={coverUrl}
            alt={`${title}的故事场景封面`}
            loading={priority ? 'eager' : 'lazy'}
            decoding="async"
            onError={() => setFailedUrl(coverUrl ?? null)}
            className="absolute inset-0 h-full w-full object-cover"
          />
        </picture>
      )}
      <div className="pointer-events-none absolute inset-0 rounded-[inherit] ring-1 ring-inset ring-gold/15" />
      <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-4 bg-gradient-to-t from-ink via-ink/75 to-transparent px-5 pb-5 pt-20">
        <span className="font-display text-2xl tracking-[0.12em] text-paper drop-shadow-lg">{title}</span>
        <span className="mb-1 shrink-0 border-l border-gold/40 pl-3 text-[10px] tracking-[0.24em] text-gold">{genre}</span>
      </div>
    </div>
  );
}
