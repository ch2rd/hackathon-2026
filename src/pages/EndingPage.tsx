/**
 * 结局页（B 维护，路由 /rooms/:roomId/ending）。
 *
 * ended 只读（§4.10）：不开轮询，进页面拉一次状态即可。
 * 展示投票结果、真相揭晓、对错判定；「再来一局」= 清身份回剧本库创建新房间。
 */

import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AmbienceLayer } from '../components/game/AmbienceLayer';
import { AudioToggle } from '../components/game/AudioToggle';
import { gameAudio } from '../game/audio';
import { voteCountsByPlayer } from '../game/selectors';
import { loadIdentity, useGameStore } from '../stores/gameStore';

export function EndingPage() {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();

  const roomState = useGameStore((s) => s.roomState);
  const status = useGameStore((s) => s.status);
  const error = useGameStore((s) => s.error);

  useEffect(() => {
    if (!roomId) return;
    const store = useGameStore.getState();
    if (store.roomId !== roomId || !store.playerId) {
      const identity = loadIdentity();
      if (!identity || identity.roomId !== roomId) return;
      store.enterRoom(identity);
    }
    void store.pollOnce(); // 只拉一次；ended 后本来也不会再有更新
  }, [roomId]);

  const roomStatus = roomState?.room.status;
  useEffect(() => {
    if (!roomStatus || !roomId) return;
    if (roomStatus === 'waiting' || roomStatus === 'selecting') {
      navigate(`/rooms/${roomId}`, { replace: true });
    } else if (roomStatus === 'playing' || roomStatus === 'voting') {
      navigate(`/rooms/${roomId}/play`, { replace: true });
    }
  }, [roomStatus, roomId, navigate]);

  // 结局揭晓节奏：状态同步 + 延迟 0.9s 后按结果播放和弦
  const resultSummary = roomState?.result
    ? `${roomState.result.isCorrect}|${roomState.result.topVotedCharacterId ?? ''}`
    : null;
  useEffect(() => {
    if (!resultSummary) return;
    gameAudio.setStage('ended');
    const [isCorrectStr, topVotedCharacterId] = resultSummary.split('|');
    const timer = setTimeout(
      () => gameAudio.sfx(isCorrectStr === 'true' ? 'revealGood' : topVotedCharacterId ? 'revealBad' : 'revealTie'),
      900,
    );
    return () => clearTimeout(timer);
  }, [resultSummary]);

  if (!roomState) {
    if (error?.code === 'NOT_FOUND') {
      return (
        <section className="mx-auto max-w-md p-6 text-center">
          <h1 className="text-lg font-medium">房间不存在或已解散</h1>
          <button
            type="button"
            className="mt-4 rounded-md border border-neutral-700 px-4 py-2 text-sm"
            onClick={() => navigate('/scripts')}
          >
            去剧本库
          </button>
        </section>
      );
    }
    return <p className="p-6 text-neutral-400">{status === 'syncing' ? '正在揭晓真相…' : '加载中…'}</p>;
  }

  const result = roomState.result;
  if (!result) {
    return <p className="p-6 text-neutral-400">结算数据尚未就绪，请稍后刷新。</p>;
  }

  const counts = voteCountsByPlayer(roomState);
  const murdererPlayer = roomState.players.find((p) => p.characterId === result.murdererCharacterId) ?? null;
  const topVotedPlayer = result.topVotedCharacterId
    ? roomState.players.find((p) => p.characterId === result.topVotedCharacterId) ?? null
    : null;
  const ranking = [...roomState.players].sort((a, b) => (counts[b.id] ?? 0) - (counts[a.id] ?? 0));

  return (
    <>
      <AmbienceLayer stage="ended" mood={result.isCorrect ? 'good' : 'bad'} />
      <AudioToggle />
      <section className="relative z-10 mx-auto flex max-w-2xl flex-col gap-5 p-6">
      <h1 className="fx-stamp text-center text-2xl font-medium">真相揭晓</h1>

      <div
        className={[
          'fx-fade rounded-md border p-4 text-center',
          result.isCorrect ? 'border-emerald-700 bg-emerald-950 text-emerald-200' : 'border-amber-800 bg-amber-950 text-amber-200',
        ].join(' ')}
        data-testid="verdict"
      >
        {result.isCorrect ? (
          <p className="text-lg font-medium">推理成功！你们找出了真正的凶手。</p>
        ) : topVotedPlayer ? (
          <p className="text-lg font-medium">
            投错了——被推出的是 {topVotedPlayer.characterName}，而真凶另有其人。
          </p>
        ) : (
          <p className="text-lg font-medium">平票，无人被推出，真凶混在了人群里。</p>
        )}
      </div>

      <div className="fx-rise rounded-md border border-neutral-700 bg-neutral-900/80 p-4" style={{ animationDelay: '300ms' }}>
        <h2 className="text-sm text-neutral-400">凶手是</h2>
        <p className="mt-1 text-xl font-medium text-red-300">
          {murdererPlayer
            ? `${murdererPlayer.characterName}（玩家：${murdererPlayer.nickname}）`
            : '本局数据异常（未找到凶手角色）'}
        </p>
      </div>

      <div className="flex flex-col gap-2">
        <h2 className="text-sm font-medium text-neutral-300">投票结果</h2>
        {ranking.map((player, index) => (
          <div
            key={player.id}
            className="fx-rise flex items-center justify-between rounded-md border border-neutral-800 bg-neutral-950/80 p-3 text-sm"
            style={{ animationDelay: `${450 + index * 120}ms` }}
          >
            <span>
              <span className="font-medium">{player.nickname}</span>
              <span className="ml-2 text-neutral-400">{player.characterName ?? '未选角'}</span>
              {player.characterId === result.murdererCharacterId && (
                <span className="ml-2 rounded bg-red-950 px-1.5 py-0.5 text-xs text-red-300">真凶</span>
              )}
            </span>
            <span className="text-neutral-400">{counts[player.id] ?? 0} 票</span>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={() => {
          useGameStore.getState().leaveRoom(); // 不复用旧状态（§4.10）
          navigate('/scripts', { replace: true });
        }}
        className="rounded-md border border-emerald-700 bg-emerald-900 p-3 font-medium transition hover:brightness-125"
      >
        再来一局（创建新房间）
      </button>
      </section>
    </>
  );
}
