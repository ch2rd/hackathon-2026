import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { CharacterCard } from '../components/character/CharacterCard';
import { CharacterSheet } from '../components/character/CharacterSheet';
import { Button } from '../components/ui/Button';
import { EmptyState } from '../components/ui/EmptyState';
import { SectionHeading } from '../components/ui/SectionHeading';
import { getScriptDetail } from '../api/scripts';
import { useGameStore } from '../stores/gameStore';
import type { ScriptDetail } from '../types/models';

export default function CharacterPage() {
  const params = useParams<{ roomId?: string; scriptId?: string; characterId?: string }>();
  const roomId = params.roomId;
  const scriptId = params.scriptId;
  const characterId = params.characterId;

  const roomState = useGameStore((state) => state.roomState);
  const context = useGameStore((state) => state.context);

  const [script, setScript] = useState<ScriptDetail | null>(null);
  const [loading, setLoading] = useState(!roomId);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (roomId || !scriptId) return;
    let active = true;
    setLoading(true);
    getScriptDetail(scriptId)
      .then((data) => {
        if (active) setScript(data);
      })
      .catch(() => {
        if (active) setError('无法加载剧本数据');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [roomId, scriptId]);

  if (roomId) {
    const selectedCharacter = roomState?.me.character;
    const otherCharacters = context?.characters ?? [];

    if (!selectedCharacter) {
      return (
        <EmptyState
          title="还没有角色档案"
          description="先在房间页完成选角，进入游戏后这里会显示你的秘密和任务。"
        />
      );
    }

    return (
      <div className="space-y-10 pb-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <SectionHeading title="角色档案" description="你的秘密只属于你。" />
          <Link to={`/rooms/${roomId}/play`}>
            <Button variant="secondary">进入游戏房间</Button>
          </Link>
        </div>

        <CharacterSheet
          character={selectedCharacter}
          secret={selectedCharacter.secret}
          goals={selectedCharacter.goals}
        />

        {otherCharacters.length > 0 && (
          <section className="space-y-6">
            <SectionHeading
              title="其他角色"
              description="你只能看到他们的公开身份，看不到他们的秘密。"
            />
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {otherCharacters.map((item) => (
                <CharacterCard
                  key={item.id}
                  character={item}
                  selected={item.id === selectedCharacter.id}
                />
              ))}
            </div>
          </section>
        )}
      </div>
    );
  }

  if (loading) {
    return <div className="rounded-2xl border border-white/10 p-10 text-center text-muted">加载中…</div>;
  }

  if (error || !script) {
    return <EmptyState title="无法打开角色档案" description={error ?? '剧本不存在。'} />;
  }

  const character = script.characters.find((item) => item.id === characterId) ?? script.characters[0];

  if (!character) {
    return <EmptyState title="角色不存在" description="这个剧本还没有公开角色数据。" />;
  }

  return (
    <div className="space-y-10 pb-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <SectionHeading title="角色档案" description="你的秘密只属于你。" />
        <Link to={`/scripts/${script.id}`}>
          <Button variant="secondary">返回剧本详情</Button>
        </Link>
      </div>

      <CharacterSheet character={character} />

      <section className="space-y-6">
        <SectionHeading
          title="其他角色"
          description="你只能看到他们的公开身份，看不到他们的秘密。"
        />
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {script.characters.map((item) => (
            <CharacterCard key={item.id} character={item} selected={item.id === character.id} />
          ))}
        </div>
      </section>
    </div>
  );
}