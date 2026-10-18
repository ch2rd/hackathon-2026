import { cn } from '../ui/cn';

interface ScriptFiltersProps {
  genres: string[];
  activeGenre: string;
  onSelect: (genre: string) => void;
}

export function ScriptFilters({ genres, activeGenre, onSelect }: ScriptFiltersProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {genres.map((genre) => (
        <button
          key={genre}
          type="button"
          onClick={() => onSelect(genre)}
          className={cn(
            'rounded-full border px-4 py-2 text-xs tracking-[0.18em] transition',
            activeGenre === genre
              ? 'border-gold/60 bg-gold/10 text-gold'
              : 'border-white/10 bg-white/[0.03] text-muted hover:border-gold/40 hover:text-gold',
          )}
        >
          {genre}
        </button>
      ))}
    </div>
  );
}