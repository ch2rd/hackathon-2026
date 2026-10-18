import { useEffect, useRef, useState } from 'react';
import { sendMessage } from '../../api/rooms';
import { readApiError, useGameStore } from '../../stores/gameStore';
import type { RoomState } from '../../types/models';

export function DiscussionPanel({ state }: { state: RoomState }) {
  const [recipient, setRecipient] = useState('public');
  const [draft, setDraft] = useState('');
  const [clueId, setClueId] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const bottom = useRef<HTMLDivElement>(null);
  const introduction = state.room.gameplayPhase === 'introduction';
  const me = state.me.player;
  const others = state.players.filter((player) => player.id !== me.id);
  const target = introduction ? 'public' : recipient;
  const messages = (state.messages ?? []).filter((message) => target === 'public'
    ? message.channel === 'public'
    : message.channel === 'direct' && (message.senderPlayerId === target || message.receiverPlayerId === target));
  useEffect(() => { bottom.current?.scrollIntoView?.({ block: 'nearest' }); }, [messages.length, target]);
  useEffect(() => { setDraft(''); setClueId(''); setError(''); }, [target, state.room.id]);

  async function handleSend() {
    if (busy || (!draft.trim() && !clueId)) return;
    if (clueId && state.me.visibleClues.find((clue) => clue.id === clueId)?.visibility === 'private'
      && !window.confirm(target === 'public' ? '这条私密线索将向所有玩家公开，确定分享？' : '这条私密线索将分享给当前私聊对象，确定分享？')) return;
    setBusy(true); setError('');
    try {
      await sendMessage(state.room.id, me.id, { channel: target === 'public' ? 'public' : 'direct',
        receiverPlayerId: target === 'public' ? undefined : target, content: draft, clueId: clueId || undefined });
      setDraft(''); setClueId('');
      await useGameStore.getState().pollOnce();
    } catch (failure) { setError(readApiError(failure).message); }
    finally { setBusy(false); }
  }

  return <section className="min-w-0 rounded-lg border border-gold/30 bg-surface p-4" aria-label="玩家讨论">
    <h2 className="text-lg font-medium text-gold">{introduction ? '人物出场 · 围桌初识' : '搜证后讨论 · 交换疑点'}</h2>
    <p className="mt-2 text-sm leading-6 text-muted">{introduction
      ? '请依次介绍你的姓名、身份、与事件的关系，并向其他角色提一个问题。只分享你愿意公开的经历，保留自己的秘密。'
      : '先交流发现，再核对时间线、追问矛盾。可在公聊分享线索，也可选择一位玩家私下核实信息。讨论结束后由房主推进。'}</p>
    {introduction && state.me.character && <button type="button" className="mt-3 text-sm text-gold underline"
      onClick={() => { setDraft(`大家好，我是${state.me.character!.name}，${state.me.character!.identity}。${state.me.character!.publicIntro}`); setClueId(''); }}>
      填入我的公开介绍（可编辑）
    </button>}
    <label className="mt-4 flex flex-wrap items-center gap-2 text-sm text-paper">聊天对象
      <select aria-label="聊天对象" value={target} disabled={introduction || busy}
        onChange={(event) => setRecipient(event.target.value)} className="max-w-full rounded border border-gold/30 bg-ink p-2">
        <option value="public">公聊 · 全体玩家</option>
        {others.map((player) => <option key={player.id} value={player.id}>私聊 · {player.characterName ?? player.nickname}</option>)}
      </select>
    </label>
    <p className="mt-2 text-xs text-muted">{target === 'public' ? '此频道的消息全体玩家可见' : '此频道的消息仅你和对方可见'} · 每 2 秒同步</p>
    <div role="log" aria-label="聊天记录" aria-live="polite" className="my-4 max-h-80 min-h-32 space-y-3 overflow-y-auto rounded bg-ink p-3">
      {messages.length === 0 && <p className="text-sm text-muted">{introduction ? '还没有人发言，来做第一个自我介绍吧。' : '暂无消息，试着从一条线索或一个疑问开始。'}</p>}
      {messages.map((message) => <article key={message.id} className="min-w-0 break-words border-b border-gold/10 pb-3">
        <p className="text-xs text-gold">{state.players.find((player) => player.id === message.senderPlayerId)?.characterName ?? message.senderName}
          {message.senderPlayerId === me.id ? '（我）' : ''} · {new Date(message.createdAt).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}</p>
        {message.title && <p className="mt-1 text-sm font-medium text-gold">分享线索：{message.title}</p>}
        <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-paper">{message.content}</p>
      </article>)}
      <div ref={bottom} />
    </div>
    <form onSubmit={(event) => { event.preventDefault(); void handleSend(); }} className="space-y-3">
      {!introduction && <label className="block text-sm text-muted">分享已获得的线索
        <select aria-label="分享线索" value={clueId} disabled={busy} onChange={(event) => setClueId(event.target.value)}
          className="mt-1 w-full min-w-0 rounded border border-gold/30 bg-ink p-2">
          <option value="">不附带线索</option>
          {state.me.visibleClues.map((clue) => <option key={clue.id} value={clue.id}>{clue.visibility === 'private' ? '私密 · ' : '公开 · '}{clue.title}</option>)}
        </select>
      </label>}
      {clueId ? <p className="text-sm text-gold">将分享线索原文；私密线索分享前会再次确认。</p> : <textarea aria-label="发言内容" value={draft} maxLength={1000} disabled={busy}
        onChange={(event) => setDraft(event.target.value)} rows={3} placeholder={introduction ? '我是谁、为什么来到这里、想认识谁…' : '我发现了…，我想向…确认…'}
        className="w-full resize-y rounded border border-gold/30 bg-ink p-3 text-sm text-paper" />}
      {error && <p role="alert" className="text-sm text-gold">{error}</p>}
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs text-muted">{clueId ? '分享至当前频道' : `${draft.length}/1000`}</span>
        <button type="submit" disabled={busy || (!draft.trim() && !clueId)} className="rounded border border-gold/50 px-4 py-2 text-sm text-gold disabled:opacity-40">
          {busy ? '发送中…' : target === 'public' ? '发送公聊' : '发送私聊'}
        </button>
      </div>
    </form>
  </section>;
}
