import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { CharacterCard } from '../components/character/CharacterCard';
import { ScriptCover } from '../components/scripts/ScriptCover';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { EmptyState } from '../components/ui/EmptyState';
import { SectionHeading } from '../components/ui/SectionHeading';
import { Tag } from '../components/ui/Tag';
import { getScriptDetail } from '../api/scripts';
import type { ScriptDetail } from '../types/models';

export default function ScriptDetailPage() {
  const { scriptId } = useParams<{ scriptId: string }>();
  const [script, setScript] = useState<ScriptDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!scriptId) return;
    let active = true;
    setLoading(true);
    getScriptDetail(scriptId)
      .then((data) => {
        if (active) setScript(data);
      })
      .catch(() => {
        if (active) setError('无法加载剧本详情');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [scriptId]);

  if (loading) {
    return <div className="rounded-2xl border border-white/10 p-10 text-center text-muted">加载中…</div>;
  }

  if (error || !script) {
    return <EmptyState title="剧本不存在" description={error ?? '这个剧本可能已经下架。'} />;
  }

  return (
    <div className="space-y-12 pb-4">
      <div className="grid gap-8 lg:grid-cols-[0.85fr_1.15fr]">
        <div>
          <ScriptCover title={script.title} genre={script.genre} className="aspect-[4/5] w-full" />
        </div>

        <div className="space-y-7">
          <div>
            <Tag variant="gold" className="mb-4">
              {script.genre}
            </Tag>
            <h1 className="font-display text-4xl leading-tight text-paper">{script.title}</h1>
            <p className="mt-4 text-sm leading-7 text-muted md:text-base">{script.subtitle}</p>
          </div>

          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {[
              { label: '玩家人数', value: `${script.playerCount} 人` },
              { label: '游戏时长', value: `${script.durationMinutes} 分钟` },
              { label: '难度', value: '★'.repeat(script.difficulty) },
              { label: '状态', value: '可开' },
            ].map((item) => (
              <div key={item.label} className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
                <div className="text-[11px] uppercase tracking-[0.2em] text-muted">
                  {item.label}
                </div>
                <div className="mt-2 text-sm text-paper">{item.value}</div>
              </div>
            ))}
          </div>

          <div className="flex flex-wrap gap-2">
            {script.tags.map((tag) => (
              <Tag key={tag}>{tag}</Tag>
            ))}
          </div>

          <div className="flex flex-wrap gap-3">
            <Link to={`/scripts/${script.id}/character`}>
              <Button size="lg">查看角色档案</Button>
            </Link>
            <Link to="/scripts">
              <Button size="lg" variant="secondary">
                返回剧本库
              </Button>
            </Link>
          </div>
        </div>
      </div>

      <section className="space-y-6">
        <SectionHeading title="故事简介" />
        <Card className="p-6 md:p-8">
          <div className="space-y-4 text-sm leading-8 text-paper/90 md:text-base">
            {script.description.split('\n\n').map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
          </div>
        </Card>
      </section>

      <section className="space-y-6">
        <SectionHeading
          title="角色列表"
          description="这里只显示公开身份。每个角色的秘密，只有进入游戏后才能看到。"
        />
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {script.characters.map((character) => (
            <CharacterCard key={character.id} character={character} />
          ))}
        </div>
      </section>
    </div>
  );
}