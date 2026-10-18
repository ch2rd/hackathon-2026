import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { AIHint, CharacterPublic, Clue, PublicPlayer } from '../../types/models';
import { AIHintCard } from './AIHintCard';
import { CharacterGrid } from './CharacterGrid';
import { ClueList } from './ClueList';
import { DemoAdvanceButton } from './DemoAdvanceButton';
import { PlayerList } from './PlayerList';
import { VotePanel } from './VotePanel';

const players: PublicPlayer[] = [
  { id: 'p1', nickname: '小A', characterId: 'c1', characterName: '管家', isHost: true, isReady: false },
  { id: 'p2', nickname: '小B', characterId: null, characterName: null, isHost: false, isReady: true },
];

const characters: CharacterPublic[] = [
  { id: 'c1', scriptId: 's1', name: '管家', identity: '庄园管家', age: 45, avatarUrl: '', publicIntro: '老成持重', sortOrder: 1 },
  { id: 'c2', scriptId: 's1', name: '医生', identity: '私人医生', age: 38, avatarUrl: '', publicIntro: '神情疲惫', sortOrder: 2 },
];

const publicClue: Clue = { id: 'k1', scriptId: 's1', actNumber: 1, title: '烛台', content: '书房烛台倒在地上。', visibility: 'public', ownerCharacterId: null };
const privateClue: Clue = { id: 'k2', scriptId: 's1', actNumber: 1, title: '账本', content: '账目有亏空。', visibility: 'private', ownerCharacterId: 'c1' };

describe('PlayerList', () => {
  it('渲染昵称、房主/我/已准备标记与空位', () => {
    render(<PlayerList players={players} currentPlayerId="p1" playerCount={6} />);
    expect(screen.getByText('小A')).toBeInTheDocument();
    expect(screen.getByText('房主')).toBeInTheDocument();
    expect(screen.getByText('我')).toBeInTheDocument();
    expect(screen.getByText('已准备')).toBeInTheDocument();
    expect(screen.getByText('虚位以待')).toBeInTheDocument();
    // 6 人本，2 人在场 → 4 个空位
    expect(screen.getAllByText('等待玩家加入…')).toHaveLength(4);
  });
});

describe('CharacterGrid', () => {
  it('被选走的角色禁用并显示归属，空闲角色可点选', () => {
    const onSelect = vi.fn();
    render(
      <CharacterGrid
        characters={characters}
        assignments={[{ characterId: 'c1', nickname: '小A' }]}
        myCharacterId={null}
        canSelect
        onSelect={onSelect}
      />
    );
    const takenButton = screen.getByRole('button', { name: /管家/ });
    expect(takenButton).toBeDisabled();
    expect(screen.getByText('已被 小A 选走')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /医生/ }));
    expect(onSelect).toHaveBeenCalledWith('c2');
  });

  it('不可选状态下空闲角色也禁用', () => {
    render(
      <CharacterGrid characters={characters} assignments={[]} myCharacterId={null} canSelect={false} onSelect={vi.fn()} />
    );
    expect(screen.getByRole('button', { name: /医生/ })).toBeDisabled();
  });
});

describe('ClueList', () => {
  it('空列表显示占位文案', () => {
    render(<ClueList clues={[]} />);
    expect(screen.getByText(/暂时还没有线索/)).toBeInTheDocument();
  });

  it('区分公开/私密标记', () => {
    render(<ClueList clues={[publicClue, privateClue]} />);
    expect(screen.getByText(/公开/)).toBeInTheDocument();
    expect(screen.getByText(/私密/)).toBeInTheDocument();
  });
});

describe('VotePanel', () => {
  it('已投票后按钮全部禁用并提示等待', () => {
    render(
      <VotePanel
        targets={players.filter((p) => p.id !== 'p1')}
        myTargetPlayerId="p2"
        counts={{ p2: 1 }}
        canVote={false}
        onVote={vi.fn()}
      />
    );
    expect(screen.getByText(/你已投出选票/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /小B/ })).toBeDisabled();
  });

  it('可投票时点击回调目标 id', () => {
    const onVote = vi.fn();
    render(
      <VotePanel targets={players.filter((p) => p.id !== 'p1')} myTargetPlayerId={null} counts={{}} canVote onVote={onVote} />
    );
    fireEvent.click(screen.getByRole('button', { name: /小B/ }));
    expect(onVote).toHaveBeenCalledWith('p2');
  });
});

describe('DemoAdvanceButton', () => {
  it('第一次点击只进入确认态，第二次才回调', () => {
    const onAdvance = vi.fn();
    render(<DemoAdvanceButton onAdvance={onAdvance} />);
    const button = screen.getByRole('button', { name: '演示推进' });
    fireEvent.click(button);
    expect(onAdvance).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: '再点一次确认强制推进' }));
    expect(onAdvance).toHaveBeenCalledTimes(1);
  });

  it('失焦取消确认态', () => {
    render(<DemoAdvanceButton onAdvance={vi.fn()} />);
    const button = screen.getByRole('button', { name: '演示推进' });
    fireEvent.click(button);
    fireEvent.blur(button);
    expect(screen.getByRole('button', { name: '演示推进' })).toBeInTheDocument();
  });
});

describe('AIHintCard', () => {
  const hint: AIHint = {
    summary: '管家与医生都存在动机。',
    suspects: [
      { playerId: 'p2', name: '医生', confidence: 72, reason: '停电前后说法矛盾' },
      { playerId: 'p1', name: '管家', confidence: 41, reason: '账目亏空构成动机' },
    ],
    disclaimer: 'AI 仅根据你已获得的线索推测，不代表真相。',
    source: 'mock',
  };

  it('加载中按钮禁用并显示思考态', () => {
    render(<AIHintCard hint={null} isLoading error={null} canAsk onAsk={vi.fn()} />);
    const button = screen.getByRole('button', { name: '正在思考…' });
    expect(button).toBeDisabled();
  });

  it('渲染嫌疑排序与理由，mock 来源显示降级标注', () => {
    render(<AIHintCard hint={hint} isLoading={false} error={null} canAsk onAsk={vi.fn()} />);
    expect(screen.getByText('医生')).toBeInTheDocument();
    expect(screen.getByText('停电前后说法矛盾')).toBeInTheDocument();
    expect(screen.getByText('降级模式（无 AI Key）')).toBeInTheDocument();
    expect(screen.getByText(/不代表真相/)).toBeInTheDocument();
  });

  it('请求失败显示降级提示且不阻塞（无凶信息泄露）', () => {
    render(<AIHintCard hint={null} isLoading={false} error="AI 服务超时" canAsk onAsk={vi.fn()} />);
    expect(screen.getByText(/AI 服务超时.*不影响你继续投票/)).toBeInTheDocument();
  });
});
