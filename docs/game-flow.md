# 游戏流程与状态机（B 负责）

> 本文档是 B 的交付物，与 [AGENTS.md](../AGENTS.md) §4.10 / §4.11 保持一致；
> 冲突时以 AGENTS.md 为准。

## 一、房间状态机

```text
waiting（等人）
  │  房主开始，且玩家数 >= 2
  ▼
selecting（选角）
  │  所有玩家都选了角色并准备
  ▼
playing（剧情/线索）
  │  最后一幕结束
  ▼
voting（投票）
  │  所有玩家都投完
  ▼
ended（结局）
```

规则（详见 AGENTS.md §4.10）：

- `waiting`：可加入；房主可开始；不足 2 人不能开始。
- `selecting`：每个玩家只能选一个未被选的角色；全部准备后自动进入 `playing`。
- `playing`：只有房主能点「下一幕」；最后一幕结束后进入 `voting`。
- `voting`：每人只能投一次，不能投自己；全部投完自动进入 `ended`。
- `ended`：只读；「再来一局」创建新房间，不复用旧状态。
- **演示兜底**：房主「演示推进」强制下一幕/结束，需二次确认，仅 `VITE_DEMO_MODE=true` 显示。

## 二、主数据源 RoomState

```ts
export interface PublicPlayer {
  id: string;
  nickname: string;
  characterId: string | null;
  characterName: string | null;
  isHost: boolean;
  isReady: boolean;
}

export interface RoomState {
  room: Room;
  players: PublicPlayer[];
  currentAct: ScriptAct | null;
  me: {
    player: Player;
    character: Character | null;
    visibleClues: Clue[];
  };
  votes: Array<{ voterPlayerId: string; targetPlayerId: string }>;
  result: {
    murdererCharacterId: string;
    topVotedCharacterId: string | null;
    isCorrect: boolean;
  } | null;
}
```

> `result` 只在 `status === 'ended'` 时非空。
> `me.character.secret` 与 `me.visibleClues` 只含当前玩家有权看到的内容。

## 三、每个状态的 UI 映射

| 状态 | 页面/组件 | 关键交互 | 异常分支 |
| --- | --- | --- | --- |
| waiting | `RoomPage` | 玩家列表实时刷新、房主「开始」 | 人数不足时开始按钮禁用 |
| selecting | `RoomPage` | 选角、准备/取消 | 角色被抢 → 提示并刷新 |
| playing | `GamePage` | 当前幕、线索、AI 推理 | AI 失败 → 降级提示，不阻塞 |
| voting | `GamePage`（投票阶段） | 投票、票数 | 重复投票/投自己 → 拒绝 |
| ended | `EndingPage` | 结果、真相、再来一局 | - |

## 四、轮询与恢复

- 每 2 秒轮询 `getRoomState(roomId, playerId)`，组件卸载时清理定时器。
- `playerId` 持久化到 `localStorage`，刷新页面后据此恢复身份。

## 五、验收标准（B）

- 3 个浏览器标签页在 Mock 模式完成一整局。
- 刷新后根据 `localStorage.playerId` 恢复房间。
- 每个 `RoomStatus` 都有对应 UI，无白屏/死路。
- 角色被选走后其他玩家不能再选。
- 投票每人一次、不能投自己。
- AI 失败显示降级提示，不阻塞投票和结局。
- 页面不直接 `fetch`，全部走 `src/api`。
- 复用 A 的 UI 组件，不新增颜色/字体。

## 六、测试（Vitest）

- 状态机纯函数（`src/game/stateMachine.ts`），不依赖 React。
- 至少覆盖：正常推进 + 3 个异常分支。

## 七、待办

- [ ] `docs/game-flow.md` 状态机每个迁移的精确条件核对
- [ ] 状态机单元测试编写
- [ ] 投票/结局的 UI 细节
