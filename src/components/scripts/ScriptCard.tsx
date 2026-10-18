import { Clock, Users } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { ScriptSummary } from '../../types/models';
import { Card } from '../ui/Card';
import { Tag } from '../ui/Tag';
import { ScriptCover } from './ScriptCover';

interface ScriptCardProps {
  script: ScriptSummary;
  actCount?: number;
}

function difficultyLabel(difficulty: number): string {
  return '★'.repeat(difficulty) + '☆'.repeat(Math.max(0, 5 - difficulty));
}

export function ScriptCard({ script, actCount }: ScriptCardProps) {
  return (
    <Card interactive className="group overflow-hidden p-0">
      <Link to={`/scripts/${script.id}`} className="block">
        <ScriptCover title={script.title} genre={script.genre} className="aspect-[4/3]" />
        <div className="space-y-4 p-5">
          <div>
            <h3 className="font-display text-lg text-paper">{script.title}</h3>
            <p className="mt-2 line-clamp-2 text-sm leading-6 text-muted">{script.subtitle}</p>
          </div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted">
            <span className="inline-flex items-center gap-1.5">
              <Users className="h-3.5 w-3.5 text-gold/70" />
              {script.playerCount} 人
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5 text-gold/70" />
              {script.durationMinutes} 分钟
            </span>
            <span className="text-gold/80">{difficultyLabel(script.difficulty)}</span>
            {actCount && <span>{actCount} 幕</span>}
          </div>
          <div className="flex flex-wrap gap-2">
            {script.tags.slice(0, 3).map((tag) => (
              <Tag key={tag}>{tag}</Tag>
            ))}
          </div>
        </div>
      </Link>
    </Card>
  );
}