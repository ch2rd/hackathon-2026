import { cn } from '../ui/cn';
import type { CharacterPublic } from '../../types/models';
import { Card } from '../ui/Card';

interface CharacterCardProps {
  character: CharacterPublic;
  selected?: boolean;
  disabled?: boolean;
  onSelect?: (characterId: string) => void;
}

export function CharacterCard({ character, selected = false, disabled = false, onSelect }: CharacterCardProps) {
  return (
    <Card
      interactive={!disabled}
      className={cn(
        'h-full p-5 text-left',
        selected && 'border-gold/60 shadow-[0_0_30px_-12px_rgba(200,169,106,0.5)]',
        disabled && 'cursor-not-allowed opacity-50',
      )}
      onClick={() => !disabled && onSelect?.(character.id)}
    >
      <div className="flex items-start gap-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-gold/30 bg-gradient-to-br from-gold/20 to-crimson/10 font-display text-lg text-gold">
          {character.name.slice(0, 1)}
        </div>
        <div className="min-w-0">
          <h3 className="font-display text-lg text-paper">{character.name}</h3>
          <p className="mt-1 text-xs tracking-[0.18em] text-gold/80">{character.identity}</p>
          <p className="mt-3 line-clamp-3 text-sm leading-6 text-muted">{character.publicIntro}</p>
        </div>
      </div>
      {selected && (
        <div className="mt-4 rounded-lg border border-gold/30 bg-gold/10 px-3 py-2 text-xs text-gold">
          已选择
        </div>
      )}
    </Card>
  );
}