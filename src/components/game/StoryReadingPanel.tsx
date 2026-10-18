import { useState } from 'react';
import { confirmStoryRead } from '../../api/rooms';
import { readApiError, useGameStore } from '../../stores/gameStore';
import type { RoomState } from '../../types/models';

export function StoryReadingPanel({ state }: { state: RoomState }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const reading = state.room.status === 'playing' && state.room.gameplayPhase === 'reading';
  const character = state.me.character;
  const readers = new Set(state.room.storyReadPlayerIds ?? []);
  const hasRead = readers.has(state.me.player.id);
  const readCount = state.players.filter((player) => readers.has(player.id)).length;

  async function handleConfirm() {
    if (busy || hasRead) return;
    setBusy(true); setError('');
    try {
      await confirmStoryRead(state.room.id, state.me.player.id);
      await useGameStore.getState().pollOnce();
    } catch (failure) { setError(readApiError(failure).message); }
    finally { setBusy(false); }
  }

  if (!character || character.id !== state.me.player.characterId) {
    return <p role="status" className="rounded-lg border border-gold/30 p-4 text-muted">正在同步你的个人故事…</p>;
  }

  return <section aria-label="我的个人故事" className="min-w-0 space-y-6 rounded-lg border border-gold/30 bg-surface p-5 sm:p-7">
    <header>
      <p className="text-xs tracking-widest text-gold">{reading ? '序章 · 进入角色' : '个人档案 · 随时回看'}</p>
      <h2 className="mt-2 font-display text-2xl text-paper">你是{character.name}</h2>
      <p className="mt-2 text-sm text-muted">{character.identity} · {character.age} 岁 · 以下故事、秘密与任务仅你可见</p>
    </header>
    <article>
      <h3 className="text-sm font-medium text-gold">你的故事背景</h3>
      <p className="mt-3 whitespace-pre-line break-words text-sm leading-8 text-paper">{character.backgroundStory ?? character.publicIntro}</p>
    </article>
    <article className="rounded border border-crimson/30 bg-crimson/5 p-4">
      <h3 className="text-sm font-medium text-gold">你独自知道的事</h3>
      <p className="mt-3 whitespace-pre-line break-words text-sm leading-7 text-paper">{character.secret}</p>
    </article>
    <article>
      <h3 className="text-sm font-medium text-gold">这一次，你想完成的事</h3>
      <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-7 text-paper">
        {character.goals.map((goal) => <li key={goal}>{goal}</li>)}
      </ul>
    </article>
    <article className="rounded border border-gold/20 p-4">
      <h3 className="text-sm font-medium text-gold">准备你的自我介绍</h3>
      <p className="mt-2 text-sm leading-7 text-muted">先说清你的姓名、身份和来到这里的缘由，再决定要向大家公开哪些经历。秘密与个人任务由你自己决定是否透露。</p>
      <p className="mt-3 whitespace-pre-line text-sm leading-7 text-paper">{character.publicIntro}</p>
    </article>
    {reading && <footer className="space-y-3 border-t border-gold/20 pt-4">
      <p role="status" className="text-sm text-muted">已读完 {readCount}/{state.players.length} 人{hasRead ? '，等待其他玩家读完后一起进入公聊。' : '，请读完故事后确认。'}</p>
      <button type="button" disabled={busy || hasRead} onClick={() => void handleConfirm()}
        className="rounded border border-gold/50 px-4 py-3 text-sm text-gold disabled:opacity-50">
        {busy ? '正在确认…' : hasRead ? '已读完，等待其他玩家' : '我已读完，准备自我介绍'}
      </button>
      {error && <p role="alert" className="text-sm text-gold">{error}</p>}
    </footer>}
  </section>;
}
