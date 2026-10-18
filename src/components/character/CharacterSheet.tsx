import { Lock } from 'lucide-react';
import type { CharacterPublic } from '../../types/models';
import { Card } from '../ui/Card';
import { Tag } from '../ui/Tag';

interface CharacterSheetProps {
  character: CharacterPublic;
  secret?: string;
  goals?: string[];
}

export function CharacterSheet({ character, secret, goals }: CharacterSheetProps) {
  const hasSecret = Boolean(secret || goals?.length);

  return (
    <Card className="p-6 md:p-8">
      <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
        <div className="flex items-start gap-5">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full border border-gold/40 bg-gradient-to-br from-gold/20 to-crimson/10 font-display text-2xl text-gold">
            {character.name.slice(0, 1)}
          </div>
          <div>
            <h1 className="font-display text-3xl text-paper">{character.name}</h1>
            <p className="mt-2 text-sm tracking-[0.2em] text-gold/80">{character.identity}</p>
            <p className="mt-1 text-xs text-muted">{character.age} 岁</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Tag variant="gold">角色档案</Tag>
          <Tag>{character.publicIntro.slice(0, 12)}…</Tag>
        </div>
      </div>

      <div className="mt-8 grid gap-6 md:grid-cols-2">
        <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
          <h2 className="text-xs uppercase tracking-[0.28em] text-gold">公开身份</h2>
          <p className="mt-3 text-sm leading-7 text-paper/90">{character.publicIntro}</p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
          <h2 className="text-xs uppercase tracking-[0.28em] text-gold">你的任务</h2>
          {goals?.length ? (
            <ul className="mt-3 space-y-2 text-sm leading-6 text-paper/90">
              {goals.map((goal) => (
                <li key={goal} className="flex gap-2">
                  <span className="text-gold/70">·</span>
                  {goal}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-sm leading-6 text-muted">进入游戏后，这里会显示你的个人任务。</p>
          )}
        </div>
      </div>

      <div className="mt-6 rounded-2xl border border-crimson/30 bg-crimson/[0.06] p-5">
        <div className="flex items-center gap-3">
          <Lock className="h-4 w-4 text-[#e5a4ae]" />
          <h2 className="text-xs uppercase tracking-[0.28em] text-[#e5a4ae]">你的秘密</h2>
        </div>
        <p className="mt-3 text-sm leading-7 text-muted">
          {hasSecret
            ? secret
            : '这部分内容会在你进入游戏房间后解锁。其他玩家看不到这段信息。'}
        </p>
      </div>
    </Card>
  );
}