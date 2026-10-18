/**
 * 游戏进行页（B 维护，路由 /rooms/:roomId/play）。
 *
 * 覆盖 RoomStatus：playing（当前幕 + 线索 + AI 推理）与 voting（投票阶段）。
 * §2.2：投票不单独做路由，就是本页的一个阶段。
 * waiting/selecting 跳回房间页，ended 跳结局页。
 */

import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { isDemoMode } from '../api/client';
import { AmbienceLayer } from '../components/game/AmbienceLayer';
import { AudioToggle } from '../components/game/AudioToggle';
import { CharacterIntro } from '../components/game/CharacterIntro';
import { SceneExplorer } from '../components/game/SceneExplorer';
import { resolveActScene, resolveMemoryFilter } from '../components/game/visuals';
import { StoryReadingPanel } from '../components/game/StoryReadingPanel';
import { DiscussionPanel } from '../components/game/DiscussionPanel';
import { ClueList } from '../components/game/ClueList';
import { DemoAdvanceButton } from '../components/game/DemoAdvanceButton';
import { VoiceBar } from '../components/game/VoiceBar';
import { useTypewriter } from '../components/game/useTypewriter';
import { VotePanel } from '../components/game/VotePanel';
import { gameAudio } from '../game/audio';
import {
  canDemoAdvance,
  canNextAct,
  isFinalAct,
  readyProgress,
  voteCountsByPlayer,
  voteProgress,
  voteTargets,
} from '../game/selectors';
import { loadIdentity, useGameStore } from '../stores/gameStore';

export function GamePage() {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();

  const roomState = useGameStore((s) => s.roomState);
  const context = useGameStore((s) => s.context);
  const status = useGameStore((s) => s.status);
  const error = useGameStore((s) => s.error);
  const isActing = useGameStore((s) => s.isActing);

  const [discoveredClueIds, setDiscoveredClueIds] = useState<Set<string>>(new Set());
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
    gameAudio.setStage(roomStatus === 'voting' ? 'voting' : 'playing');
  }, [roomStatus]);

  // 换幕黑幕：currentAct 变化瞬间拉一次幕布 + 雷鸣（首次挂载不放幕）
  const [curtainActId, setCurtainActId] = useState<string | null>(null);
  const seenActId = useRef<string | null | undefined>(undefined);
  useEffect(() => {
    const actId = roomState?.currentAct?.id ?? null;
    if (seenActId.current === undefined) {
      seenActId.current = actId;
      return;
    }
    if (actId !== seenActId.current) {
      seenActId.current = actId;
      if (actId) {
        setCurtainActId(actId);
        gameAudio.sfx('thunder');
      }
    }
  }, [roomState?.currentAct?.id]);

  // 旁白打字机（文本变化即重新逐字浮现）
  const typedNarration = useTypewriter(roomState?.currentAct?.narration ?? '');

  useEffect(() => {
    if (!roomStatus || !roomId) return;
    if (roomStatus === 'waiting' || roomStatus === 'selecting') {
      navigate(`/rooms/${roomId}`, { replace: true });
    } else if (roomStatus === 'ended') {
      navigate(`/rooms/${roomId}/ending`, { replace: true });
    }
  }, [roomStatus, roomId, navigate]);

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

  const phase = roomState.room.gameplayPhase ?? 'search';
  const me = roomState.me.player;
  const myVotedTargetId = roomState.votes.find((v) => v.voterPlayerId === me.id)?.targetPlayerId ?? null;
  const progress = voteProgress(roomState);
  const ready = readyProgress(roomState);
  const meReady = me.isReady;
  const finalAct = context ? isFinalAct(roomState, context) : false;
  const discoveredClues = roomState.me.visibleClues.filter((clue) => discoveredClueIds.has(clue.id));
  const myCharacter = roomState.me.character;
  const memory = myCharacter ? resolveMemoryFilter(myCharacter.identity).filter : undefined;
  const showIntro = roomStatus === 'playing' && phase === 'reading' && !introDone && myCharacter !== null;
  const showDemoAdvance = canDemoAdvance(roomState, me.id, isDemoMode());

  return (
    <>
      <AmbienceLayer stage={roomStatus === 'voting' ? 'voting' : 'playing'} />
      {curtainActId && (
        <div key={curtainActId} className="fx-curtain" onAnimationEnd={() => setCurtainActId(null)} />
      )}
      <AudioToggle />
      <section className="relative z-10 mx-auto flex max-w-3xl flex-col gap-5 p-6">
      <header className="flex items-end justify-between">
        <h1 className="text-xl font-medium">
          {roomStatus === 'voting' ? '投票阶段' : phase === 'reading' ? '序章 · 个人故事' : `第 ${roomState.room.currentAct}${context ? ` / ${context.acts.length}` : ''} 幕`}
          {roomState.currentAct && roomStatus === 'playing' && phase !== 'reading' && (
            <span className="fx-fade ml-2 text-base font-normal text-neutral-400">{roomState.currentAct.title}</span>
          )}
        </h1>
        <div className="flex items-center gap-3">
          <Link to={`/rooms/${roomId}/character`} className="text-sm text-neutral-400 underline">
            我的角色档案
          </Link>
        </div>
      </header>

      <VoiceBar />

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

      {showIntro && myCharacter && <CharacterIntro character={myCharacter} scene={resolveActScene(roomState.room.currentAct)}
        enterLabel="阅读我的故事" onEnter={() => setIntroDone(true)} />}

      {roomStatus === 'playing' && (
        <>
          <nav aria-label="游戏环节" className="flex flex-wrap gap-2 text-sm text-muted">
            {(roomState.room.currentAct === 1 ? ['reading', 'introduction', 'search', 'discussion'] : ['search', 'discussion']).map((step) =>
              <span key={step} aria-current={phase === step ? 'step' : undefined} className={phase === step ? 'rounded border border-gold/50 px-3 py-2 text-gold' : 'px-3 py-2'}>
                {step === 'reading' ? '① 个人故事' : step === 'introduction' ? '② 出场公聊' : step === 'search' ? '③ 阅读与搜证' : '④ 公聊 / 私聊'}
              </span>)}
          </nav>
          {phase === 'reading' && <StoryReadingPanel key={`${roomState.room.id}-${me.id}`} state={roomState} />}
          {phase !== 'reading' && <details className="rounded-lg border border-gold/20 p-4">
            <summary className="cursor-pointer text-sm text-gold">回看我的故事与个人任务（仅自己可见）</summary>
            <div className="mt-4"><StoryReadingPanel state={roomState} /></div>
          </details>}
          {(phase === 'introduction' || phase === 'discussion') && <DiscussionPanel key={`${roomState.room.id}-${phase}`} state={roomState} />}
          {phase === 'discussion' && (<div className="rounded-md border border-neutral-800 bg-neutral-900 p-4">
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
                  onClick={() => {
                    gameAudio.sfx('click');
                    void useGameStore.getState().setReady(true);
                  }}
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
          </div>)}
          {phase === 'search' && <p className="text-sm text-muted">阅读本幕剧情并查看自己的线索。完成搜证后，房主点击「进入讨论」，全员一起交流。</p>}
          {phase === 'search' && (<SceneExplorer
            clues={roomState.me.visibleClues}
            discoveredIds={discoveredClueIds}
            memory={memory}
            onDiscover={(clue) => {
              gameAudio.sfx('pageTurn');
              setDiscoveredClueIds((current) => {
                const next = new Set(current);
                next.add(clue.id);
                return next;
              });
            }}
          />)}
          {phase === 'search' && roomState.currentAct && (
            <article className="fx-fade rounded-md border border-neutral-800 bg-neutral-950/80 p-4">
              <p className="fx-caret whitespace-pre-line text-sm leading-7 text-neutral-200">{typedNarration}</p>
            </article>
          )}
          {phase !== 'reading' && <div className="flex items-center gap-3">
            {canNextAct(roomState, me.id) ? (
              <button
                type="button"
                disabled={isActing}
                onClick={() => {
                  if (phase === 'discussion' && finalAct && !window.confirm('所有玩家已确认本幕。确定进入最终投票吗？进入后将无法返回剧情阶段。')) return;
                  gameAudio.sfx('pageTurn');
                  void useGameStore.getState().nextAct();
                }}
                className="rounded-md border border-emerald-700 bg-emerald-900 p-3 font-medium transition hover:brightness-125 disabled:opacity-50"
              >
                {phase === 'introduction' ? '介绍结束，开始搜证' : phase === 'search' ? '搜证结束，进入讨论' : context && isFinalAct(roomState, context) ? '讨论结束，进入投票' : '讨论结束，进入下一幕'}
              </button>
            ) : (
              <p className="text-sm text-neutral-400">{phase === 'discussion' ? `等待所有玩家确认本幕讨论完成（${ready.confirmed}/${ready.total}）` : '等待房主推进剧情…'}</p>
            )}
          </div>}
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
            onVote={(targetPlayerId) => {
              gameAudio.sfx('vote');
              void useGameStore.getState().submitVote(targetPlayerId);
            }}
          />
        </div>
      )}

      {(roomStatus === 'voting' || phase === 'search' || phase === 'discussion') && <div className="flex flex-col gap-2">
        <h2 className="text-sm font-medium text-neutral-300">我的线索（{discoveredClues.length}）</h2>
        <ClueList clues={discoveredClues} />
      </div>}

      {showDemoAdvance && phase !== 'reading' && (
        <footer className="border-t border-neutral-800 pt-4">
          <DemoAdvanceButton onAdvance={() => void useGameStore.getState().finishRoom()} disabled={isActing} />
        </footer>
      )}
      </section>
    </>
  );
}
