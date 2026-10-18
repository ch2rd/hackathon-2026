import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { CharacterCard } from '../components/character/CharacterCard';
import { ScriptCover } from '../components/scripts/ScriptCover';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { EmptyState } from '../components/ui/EmptyState';
import { Input } from '../components/ui/Input';
import { SectionHeading } from '../components/ui/SectionHeading';
import { Tag } from '../components/ui/Tag';
import { getScriptDetail } from '../api/scripts';
import { createRoom } from '../api/rooms';
import { saveIdentity } from '../stores/gameStore';
import type { ScriptDetail } from '../types/models';

export default function ScriptDetailPage() {
  const { scriptId } = useParams<{ scriptId: string }>();
  const navigate = useNavigate();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [nickname, setNickname] = useState('玩家');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
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
          <ScriptCover title={script.title} genre={script.genre} coverUrl={script.coverUrl} priority className="aspect-[4/5] w-full" />
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
            <Button size="lg" onClick={() => setIsCreateOpen(true)}>
              创建房间
            </Button>
            <Link to="/rooms/join">
              <Button size="lg" variant="secondary">加入房间</Button>
            </Link>
            <Link to={`/scripts/${script.id}/character`}>
              <Button size="lg" variant="ghost">查看角色档案</Button>
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

      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-white/10 bg-surface p-6 shadow-2xl">
            <h2 className="font-display text-2xl text-paper">创建房间</h2>
            <p className="mt-2 text-sm text-muted">剧本：{script.title}</p>

            <label className="mt-6 block text-xs uppercase tracking-[0.24em] text-gold" htmlFor="nickname">
              你的昵称
            </label>
            <Input
              id="nickname"
              value={nickname}
              maxLength={12}
              onChange={(event) => setNickname(event.target.value)}
              placeholder="输入你的昵称"
              className="mt-3"
            />

            {createError && <p className="mt-3 text-sm text-[#e5a4ae]">{createError}</p>}

            <div className="mt-6 flex justify-end gap-3">
              <Button
                variant="ghost"
                onClick={() => {
                  setIsCreateOpen(false);
                  setCreateError(null);
                }}
                disabled={creating}
              >
                取消
              </Button>
              <Button
                disabled={creating || !nickname.trim()}
                onClick={async () => {
                  setCreating(true);
                  setCreateError(null);
                  try {
                    const session = await createRoom({
                      scriptId: script.id,
                      nickname: nickname.trim(),
                    });
                    saveIdentity({ roomId: session.room.id, playerId: session.player.id });
                    navigate(`/rooms/${session.room.id}`);
                  } catch {
                    setCreateError('创建房间失败，请重试');
                  } finally {
                    setCreating(false);
                  }
                }}
              >
                {creating ? '创建中…' : '创建并进入'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
