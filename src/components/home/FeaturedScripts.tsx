import type { ScriptSummary } from '../../types/models';
import { ScriptCard } from '../scripts/ScriptCard';

interface FeaturedScriptsProps {
  scripts: ScriptSummary[];
}

export function FeaturedScripts({ scripts }: FeaturedScriptsProps) {
  return (
    <div className="grid gap-5 md:grid-cols-2">
      {scripts.map((script) => (
        <ScriptCard key={script.id} script={script} />
      ))}
    </div>
  );
}