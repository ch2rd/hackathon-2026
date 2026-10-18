/**
 * 游戏进行页（B 维护，路由 /rooms/:roomId/play）。
 *
 * 覆盖 RoomStatus：playing（当前幕 + 线索 + AI 推理）与 voting（投票阶段）。
 * §2.2：投票不单独做路由，就是本页的一个阶段。
 * waiting/selecting 跳回房间页，ended 跳结局页。
 */

import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { getAIHint } from '../api/ai';
import { isDemoMode } from '../api/client';
import { AIHintCard } from '../components/game/AIHintCard';
import { CharacterIntro } from '../components/game/CharacterIntro';
import { ClueList } from '../components/game/ClueList';
import { DemoAdvanceButton } from '../components/game/DemoAdvanceButton';
import { SceneExplorer } from '../components/game/SceneExplorer';
import { VotePanel } from '../components/game/VotePanel';
import { resolveActScene, resolveMemoryFilter } from '../components/game/visuals';
import {
  canDemoAdvance,
  canNextAct,
  isFinalAct,
  readyProgress,
  voteCountsByPlayer,
  voteProgress,
  voteTargets,
} from '../game/selectors';
import { loadIdentity, readApiError, useGameStore } from '../stores/gameStore';
import type { AIHint } from '../types/models';

export function GamePage() {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();

  const roomState = useGameStore((s) => s.roomState);
  const context = useGameStore((s) => s.context);
  const status = useGameStore((s) => s.status);
  const error = useGameStore((s) => s.error);
  const isActing = useGameStore((s) => s.isActing);

  // AI 推理是「请求-展示」交互，不是游戏状态，放页面本地即可
  const [hint, setHint] = useState<AIHint | null>(null);
  const [isAskingAI, setIsAskingAI] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [discoveredClueIds, setDiscoveredClueIds] = useState<Set<string>>(new Set());
  // 出场声明动画是否已看完（进入 playing 后先播一次）
  const [introDone, setIntroDone] = useState(false);

  useEffect(() => {
    if (!roomId) return;
    const store = useGameStore.getState();
    if (store.roomId !== roomId || !store.playerId) {
      const identity = loadIdentity();
      if (!identity || identity.roomId !== roomId) return;
      store.enterRoom(identity);
    }
    void store.ensureContext();
    store.startPolling();
    return () => useGameStore.getState().stopPolling();
  }, [roomId]);

  const roomStatus = roomState?.room.status;
  useEffect(() => {
    if (!roomStatus || !roomId) return;
    if (roomStatus === 'waiting' || roomStatus === 'selecting') {
      navigate(`/rooms/${roomId}`, { replace: true });
    } else if (roomStatus === 'ended') {
      navigate(`/rooms/${roomId}/ending`, { replace: true });
    }
  }, [roomStatus, roomId, navigate]);

  async function handleAskAI() {
    if (!roomId || !roomState) return;
    setIsAskingAI(true);
    setAiError(null);
    try {
      setHint(await getAIHint(roomId, roomState.me.player.id));
    } catch (aiFailure) {
      setAiError(readApiError(aiFailure).message);
    } finally {
      setIsAskingAI(false);
    }
  }

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
    return <p className="p-6 text-neutral-400">{status === 'syncing' ? '正在同步房间…' : '加载中…'}</p>;
  }

  const me = roomState.me.player;
  const myVotedTargetId = roomState.votes.find((v) => v.voterPlayerId === me.id)?.targetPlayerId ?? null;
  const progress = voteProgress(roomState);
  const showDemoAdvance = canDemoAdvance(roomState, me.id, isDemoMode());
  const ready = readyProgress(roomState);
  const meReady = roomState.me.player.isReady;
  const finalAct = context ? isFinalAct(roomState, context) : false;
  const discoveredClues = roomState?.me.visibleClues.filter((clue) => discoveredClueIds.has(clue.id)) ?? [];
  const myCharacter = roomState.me.character;
  // 回忆滤镜：每个角色的画面观感都不同
  const memory = myCharacter ? resolveMemoryFilter(myCharacter.identity).filter : undefined;
  // 出场声明动画只在「playing + 有本人角色 + 还没看完」时播
  const showIntro = roomStatus === 'playing' && !introDone && myCharacter !== null;

  return (
    <section className="mx-auto flex max-w-3xl flex-col gap-5 p-6">
      <header className="flex items-end justify-between">
        <h1 className="text-xl font-medium">
          {roomStatus === 'voting' ? '投票阶段' : `第 ${roomState.room.currentAct}${context ? ` / ${context.acts.length}` : ''} 幕`}
          {roomState.currentAct && roomStatus === 'playing' && (
            <span className="ml-2 text-base font-normal text-neutral-400">{roomState.currentAct.title}</span>
          )}
        </h1>
        <Link to={`/rooms/${roomId}/character`} className="text-sm text-neutral-400 underline">
          我的角色档案
        </Link>
      </header>

      {status === 'offline' && (
        <div className="flex items-center justify-between rounded-md border border-red-900 bg-red-950 p-3 text-sm text-red-200">
          <span>网络异常，显示的可能不是最新状态。</span>
          <button type="button" className="underline" onClick={() => void useGameStore.getState().pollOnce()}>
            重试
          </button>
        </div>
      )}
      {status !== 'offline' && error && (
        <div className="rounded-md border border-amber-900 bg-amber-950 p-3 text-sm text-amber-200">{error.message}</div>
      )}

      {/* 出场声明动画：进入 playing 后先播一次，看完才进入房间探索 */}
      {showIntro && myCharacter && (
        <CharacterIntro
          character={myCharacter}
          scene={resolveActScene(roomState.room.currentAct)}
          onEnter={() => setIntroDone(true)}
        />
      )}

      {roomStatus === 'playing' && (
        <>
          <div className="rounded-md border border-neutral-800 bg-neutral-900 p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-sm font-medium text-neutral-200">本幕讨论</h2>
                <p className="mt-1 text-sm text-neutral-400">
                  所有玩家确认讨论完成后，房主才能推进。已确认 {ready.confirmed}/{ready.total}
                </p>
              </div>
              {meReady ? (
                <span className="rounded-md border border-emerald-800 bg-emerald-950 px-3 py-2 text-sm text-emerald-300">
                  已确认
                </span>
              ) : (
                <button
                  type="button"
                  disabled={isActing}
                  onClick={() => void useGameStore.getState().setReady(true)}
                  className="rounded-md border border-emerald-700 bg-emerald-900 px-3 py-2 text-sm font-medium disabled:opacity-50"
                >
                  本幕讨论完成
                </button>
              )}
            </div>
            <ul className="mt-3 grid grid-cols-2 gap-2 text-sm sm:grid-cols-3">
              {roomState.players.map((player) => (
                <li
                  key={player.id}
                  className="flex items-center justify-between rounded border border-neutral-800 px-2 py-1"
                >
                  <span className="text-neutral-300">{player.nickname}</span>
                  <span className={player.isReady ? 'text-emerald-400' : 'text-neutral-500'}>
                    {player.isReady ? '已确认' : '讨论中'}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <SceneExplorer
            clues={roomState.me.visibleClues}
            discoveredIds={discoveredClueIds}
            memory={memory}
            onDiscover={(clue) =>
              setDiscoveredClueIds((current) => {
                const next = new Set(current);
                next.add(clue.id);
                return next;
              })
            }
          />

          {roomState.currentAct && (
            <article className="rounded-md border border-neutral-800 bg-neutral-950 p-4">
              <p className="whitespace-pre-line text-sm leading-6 text-neutral-200">{roomState.currentAct.narration}</p>
            </article>
          )}
          <div className="flex items-center gap-3">
            {canNextAct(roomState, me.id) ? (
              <button
                type="button"
                disabled={isActing}
                onClick={() => {
                  if (
                    finalAct &&
                    !window.confirm('所有玩家已确认本幕。确定进入最终投票吗？进入后将无法返回剧情阶段。')
                  ) {
                    return;
                  }
                  void useGameStore.getState().nextAct();
                }}
                className="rounded-md border border-emerald-700 bg-emerald-900 p-3 font-medium disabled:opacity-50"
              >
                {finalAct ? '确认进入投票' : '下一幕'}
              </button>
            ) : (
              <p className="text-sm text-neutral-400">
                等待所有玩家确认本幕讨论完成（{ready.confirmed}/{ready.total}）
              </p>
            )}
          </div>
        </>
      )}

      {roomStatus === 'voting' && (
        <div className="flex flex-col gap-3">
          <p className="text-sm text-neutral-400">
            指认你心目中的凶手，每人一票，不能投自己（已投 {progress.voted}/{progress.total}）
          </p>
          <VotePanel
            targets={voteTargets(roomState, me.id)}
            myTargetPlayerId={myVotedTargetId}
            counts={voteCountsByPlayer(roomState)}
            canVote={myVotedTargetId === null && !isActing}
            onVote={(targetPlayerId) => void useGameStore.getState().submitVote(targetPlayerId)}
          />
        </div>
      )}

      <div className="flex flex-col gap-2">
        <h2 className="text-sm font-medium text-neutral-300">我的线索（{discoveredClues.length}）</h2>
        <ClueList clues={discoveredClues} />
      </div>

      <AIHintCard
        hint={hint}
        isLoading={isAskingAI}
        error={aiError}
        canAsk={!isAskingAI}
        onAsk={() => void handleAskAI()}
      />

      {showDemoAdvance && (
        <footer className="border-t border-neutral-800 pt-4">
          <DemoAdvanceButton onAdvance={() => void useGameStore.getState().finishRoom()} disabled={isActing} />
        </footer>
      )}
    </section>
  );
}
