/**
 * 房间 / 选角页（B 维护，路由 /rooms/:roomId）。
 *
 * 覆盖 RoomStatus：waiting（玩家列表 + 房主开始）、selecting（选角 + 准备）。
 * playing/voting 跳 /play，ended 跳 /ending（§2.2：投票是 /play 内的阶段）。
 * 规则判定全部走 src/game/selectors，状态与动作全部走 src/stores/gameStore。
 */

import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { isDemoMode } from '../api/client';
import { joinRoom } from '../api/rooms';
import { CharacterGrid } from '../components/game/CharacterGrid';
import { DemoAdvanceButton } from '../components/game/DemoAdvanceButton';
import { PlayerList } from '../components/game/PlayerList';
import {
  canBeReady,
  canDemoAdvance,
  canStart,
  startBlockReason,
} from '../game/selectors';
import { loadIdentity, readApiError, useGameStore } from '../stores/gameStore';

export function RoomPage() {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();

  const roomState = useGameStore((s) => s.roomState);
  const context = useGameStore((s) => s.context);
  const status = useGameStore((s) => s.status);
  const error = useGameStore((s) => s.error);
  const isActing = useGameStore((s) => s.isActing);

  // 加入表单（直接访问 URL 且本地无身份时的兜底；正常入口是 A 的加入弹窗）
  const [code, setCode] = useState('');
  const [nickname, setNickname] = useState('');
  const [isJoining, setIsJoining] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);

  // 进入页面：本地身份能对上房间就恢复并开轮询；卸载时清理定时器（§3.3）
  useEffect(() => {
    const identity = loadIdentity();
    if (!identity || !roomId || identity.roomId !== roomId) return;
    const store = useGameStore.getState();
    store.enterRoom(identity);
    void store.ensureContext();
    store.startPolling();
    return () => useGameStore.getState().stopPolling();
  }, [roomId]);

  // playing / voting / ended 不在本页停留（game-flow.md §2）
  const roomStatus = roomState?.room.status;
  useEffect(() => {
    if (!roomStatus || !roomId) return;
    if (roomStatus === 'playing' || roomStatus === 'voting') {
      navigate(`/rooms/${roomId}/play`, { replace: true });
    } else if (roomStatus === 'ended') {
      navigate(`/rooms/${roomId}/ending`, { replace: true });
    }
  }, [roomStatus, roomId, navigate]);

  async function handleJoin(event: FormEvent) {
    event.preventDefault();
    const trimmedCode = code.trim().toUpperCase();
    const trimmedName = nickname.trim();
    if (!trimmedCode || !trimmedName) {
      setJoinError('请填写房间号和昵称');
      return;
    }
    setIsJoining(true);
    setJoinError(null);
    try {
      const session = await joinRoom({ code: trimmedCode, nickname: trimmedName });
      const store = useGameStore.getState();
      store.enterRoom({ roomId: session.room.id, playerId: session.player.id });
      void store.ensureContext();
      store.startPolling();
      navigate(`/rooms/${session.room.id}`, { replace: true });
    } catch (joinFailure) {
      setJoinError(readApiError(joinFailure).message);
    } finally {
      setIsJoining(false);
    }
  }

  // ---------- 未进房：加载 / 错误 / 加入表单 ----------
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
            去剧本库看看
          </button>
        </section>
      );
    }
    return (
      <section className="mx-auto flex max-w-md flex-col gap-4 p-6">
        <h1 className="text-lg font-medium">{status === 'syncing' ? '正在进入房间…' : '加入房间'}</h1>
        <form className="flex flex-col gap-3" onSubmit={handleJoin}>
          <input
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="6 位房间号"
            maxLength={6}
            className="rounded-md border border-neutral-700 bg-neutral-900 p-3 uppercase tracking-widest"
          />
          <input
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            placeholder="你的昵称"
            maxLength={12}
            className="rounded-md border border-neutral-700 bg-neutral-900 p-3"
          />
          {joinError && <p className="text-sm text-red-400">{joinError}</p>}
          <button
            type="submit"
            disabled={isJoining}
            className="rounded-md border border-neutral-600 bg-neutral-800 p-3 font-medium disabled:opacity-50"
          >
            {isJoining ? '加入中…' : '加入房间'}
          </button>
        </form>
      </section>
    );
  }

  // ---------- 已在房：waiting / selecting ----------
  const me = roomState.me.player;
  const myPublicPlayer = roomState.players.find((p) => p.id === me.id);
  const myCharacterId = myPublicPlayer?.characterId ?? null;
  const myReady = myPublicPlayer?.isReady ?? false;
  const assignments = roomState.players
    .filter((p) => p.characterId !== null)
    .map((p) => ({ characterId: p.characterId as string, nickname: p.nickname }));
  const characters = [...(context?.characters ?? [])].sort((a, b) => a.sortOrder - b.sortOrder);
  const showDemoAdvance = canDemoAdvance(roomState, me.id, isDemoMode());

  return (
    <section className="mx-auto flex max-w-3xl flex-col gap-5 p-6">
      <header className="flex items-end justify-between">
        <h1 className="text-xl font-medium">
          房间号 <span className="tracking-widest text-amber-300">{roomState.room.code}</span>
        </h1>
        <span className="text-sm text-neutral-400">
          {roomState.room.status === 'waiting' ? '等待玩家加入' : '选择你的角色'}
        </span>
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

      <PlayerList
        players={roomState.players}
        currentPlayerId={me.id}
        playerCount={characters.length > 0 ? characters.length : roomState.players.length}
      />

      {roomState.room.status === 'waiting' && (
        <div className="flex flex-col gap-2">
          {canStart(roomState, me.id) ? (
            <button
              type="button"
              disabled={isActing}
              onClick={() => void useGameStore.getState().startRoom()}
              className="rounded-md border border-emerald-700 bg-emerald-900 p-3 font-medium disabled:opacity-50"
            >
              开始选角（{roomState.players.length} 人）
            </button>
          ) : (
            <p className="text-sm text-neutral-400">{startBlockReason(roomState, me.id) ?? '等待房主开始选角'}</p>
          )}
        </div>
      )}

      {roomState.room.status === 'selecting' && (
        <>
          <CharacterGrid
            characters={characters}
            assignments={assignments}
            myCharacterId={myCharacterId}
            canSelect={!myReady}
            onSelect={(characterId) => void useGameStore.getState().selectCharacter(characterId)}
          />
          <div className="flex items-center gap-3">
            <button
              type="button"
              disabled={isActing || (!myReady && !canBeReady(roomState, me.id))}
              onClick={() => void useGameStore.getState().setReady(!myReady)}
              className={[
                'rounded-md border p-3 font-medium disabled:opacity-50',
                myReady
                  ? 'border-neutral-600 bg-neutral-800'
                  : 'border-emerald-700 bg-emerald-900',
              ].join(' ')}
            >
              {myReady ? '取消准备' : '准备'}
            </button>
            <span className="text-sm text-neutral-400">
              {myReady
                ? '等待其他玩家（已就绪 ' + `${roomState.players.filter((p) => p.isReady && p.characterId).length}/${roomState.players.length}` + '）'
                : myCharacterId
                  ? '选好角色后点「准备」'
                  : '先选一个角色'}
            </span>
          </div>
        </>
      )}

      {showDemoAdvance && (
        <footer className="border-t border-neutral-800 pt-4">
          <DemoAdvanceButton onAdvance={() => void useGameStore.getState().finishRoom()} disabled={isActing} />
        </footer>
      )}
    </section>
  );
}
