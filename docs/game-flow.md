# docs/game-flow.md — 房间状态机与 UI 流程（B 维护）

> 规则唯一来源：`AGENTS.md` §4.10 / §4.11 / §5。本文档只描述实现与边界约定，
> 不新增规则；本文档写到的「保守约定」需群里确认后回填 AGENTS.md。

## 1. 状态机总览

实现位置：`src/game/stateMachine.ts`（纯函数，不依赖 React/网络）。

```text
waiting（等人）
  │ start：仅房主 + 玩家数 >= 2            [demoAdvance：房主可绕过人数]
  ▼
selecting（选角）
  │ 全员 characterId != null 且 isReady    （selectCharacter / setReady 后自动检查）
  ▼
playing（剧情/线索，currentAct: 1..N）
  │ nextAct：仅房主；最后一幕后再点         [demoAdvance：可直接跳]
  ▼
voting（投票）
  │ submitVote：一人一票、禁投自己；全员投完 [demoAdvance：按已投结算]
  ▼
ended（只读，result 非空；「再来一局」= 新建房间）
```

事件与接口一一对应（`applyEvent`）：

| 事件 | 对应接口（§5.3） | 允许状态 | 权限 |
| --- | --- | --- | --- |
| `start` | POST `/start` | waiting | 仅房主，人数 ≥ 2 |
| `selectCharacter` | POST `/select-character` | selecting | 本人；角色未被抢 |
| `setReady` | POST `/ready` | selecting | 本人；先选角才能准备 |
| `nextAct` | POST `/next-act` | playing | 仅房主 |
| `submitVote` | POST `/votes` | voting | 本人；未投过；不投自己 |
| `demoAdvance` | POST `/finish`（或连点 next） | waiting/playing/voting | 仅房主 + `VITE_DEMO_MODE=true` |

错误码复用 §5.2：`VALIDATION_ERROR` / `NOT_FOUND` / `INVALID_STATE` / `FORBIDDEN`。

## 2. 每个状态的 UI（页面 ↔ 状态映射）

| RoomStatus | 路由 | UI 要点 | 当前玩家能做什么 |
| --- | --- | --- | --- |
| `waiting` | `/rooms/:roomId` | 房间号大字展示、玩家列表 + 「虚位以待」空位、房主标记 | 所有人可被邀请加入；房主看「开始选角」（置灰原因用 `startBlockReason`），非房主看「等待房主开始」 |
| `selecting` | `/rooms/:roomId` | 角色卡片列表（`availableCharacters`：已被选的置灰并显示被谁选走）、准备按钮（未选角时禁用） | 选角色 → 准备；全员就绪后自动跳转 `/rooms/:roomId/character` |
| `playing` | `/rooms/:roomId/character` → `/rooms/:roomId/play` | 角色档案（自己的 secret/goals）；游戏页显示 `currentAct` 旁白、线索卡片（公开 + 仅自己的私密）、AI 推理入口 | 阅读、AI 推理；房主额外有「下一幕」（`canNextAct`，最后一幕文案变「进入投票」） |
| `voting` | `/rooms/:roomId/play`（投票是阶段，不是独立路由） | 候选人列表 = `voteTargets`（除自己），显示投票进度 `voteProgress`，已投后置灰 | 投一票；已投的人看「等待其他玩家（x/y）」 |
| `ended` | `/rooms/:roomId/ending` | 投票统计、凶手揭晓、`result.isCorrect` 两种文案（推理成功/真相逃脱）、「再来一局」 | 只读；「再来一局」= 回剧本详情创建新房间，不复用旧状态 |

每个状态都有兜底 UI：未知状态渲染 ErrorState +「刷新重试」，不会白屏（§3.3 验收）。

## 2.1 每幕确认（专业剧本杀节奏）

进入 `playing` 后，`Player.isReady` 的含义从「选角准备」切换为「本幕讨论完成」：

1. 进入第 1 幕时，全员 `isReady` 重置为 `false`。
2. 每个玩家阅读本幕剧情与线索后，点击「本幕讨论完成」，对应 `POST /ready`。
3. 房主只有在 `players.every(p => p.isReady)` 时才能点「下一幕」。
4. 推进到下一幕时，全员 `isReady` 再次重置为 `false`。
5. 最后一幕全员确认后，房主看到「确认进入投票」，二次确认后进入 `voting`。
6. 进入 `voting` 后不再允许回到 `playing`。

这样避免房主连续点击「下一幕」跳过讨论，也避免第一幕直接进入投票。

## 3. gameStore（Zustand）职责划分'

`src/stores/gameStore.ts`：

- 持有：`playerId`（localStorage 持久化）、当前 `RoomState`、`GameContext`（剧本公开数据）、轮询定时器、错误状态。
- Mock 模式（`VITE_USE_MOCK=true`）：本地用状态机推进 → 写 localStorage → 广播 `storage` 事件。
- 真实模式：调 `src/api/rooms.ts`，服务端返回的 `RoomState` **直接覆盖**本地状态；
  状态机仅用于提前置灰按钮/乐观更新，冲突时以服务端为准。
- 不存放：别人的 `secret`、别人的私密线索、结局前的 `murdererCharacterId`（§3.3 红线）。

轮询：进入房间后每 2 秒 `getRoomState`；`ended` 或组件卸载时停止；请求失败进入
`isOffline` 提示态，不崩溃、不清空已有状态。

## 4. 异常分支

| 场景 | 行为 |
| --- | --- |
| 刷新/误关页面 | 用 localStorage 的 `playerId` + 最后已知 `roomId` 调 `getRoomState` 恢复，落到正确路由（按 `room.status` 重定向） |
| 两个标签页同时抢同一角色 | 后到者收到 `INVALID_STATE`：toast「角色已被选走」，立即 `getRoomState` 同步 |
| 非房主收到房主操作并发（如两人各开标签页同为…不存在；指房主标签页连点） | 以返回的最新 `RoomState` 覆盖本地，按钮由 selector 重新计算 |
| 投票时重复提交（双击） | 前端 `hasVoted` 置灰 + 服务端 `INVALID_STATE` 双保险 |
| 轮询失败/后端挂掉 | 显示离线提示 + 重试按钮；Mock 模式不受影响（§10.3 兜底） |
| AI 接口失败/无 Key | 游戏页 AI 卡片显示降级提示（`source: 'mock'`），不阻塞投票和结局 |
| 房间号错误/玩家被踢类不存在 | `NOT_FOUND` → 引导回首页 |

## 5. 平票与结算规则（已按本文档实现，待群内确认）

- 每人一人一票，全员投完自动 `ended`。
- 票数最高者唯一 → `topVotedCharacterId` = 该玩家角色；**平票 → `topVotedCharacterId = null`**，
  结局页显示「无人被推出，真凶混在人群里」，`isCorrect = false`。
- 真实模式该结算由服务端完成；Mock 模式由 `buildEnding` 完成，同一套 `tallyVotes` 逻辑。

## 6. 本文档登记的「保守约定」（AGENTS.md 未明说，实现时取的默认值）

1. 已准备的玩家想换角色：必须先「取消准备」（§4.10 只说选了不能让别人选，没说能否换）。
2. 平票 = 无人被推出、判定不中（§4.10 未定义平票）。
3. `demoAdvance` 不允许跳过选角阶段（跳过选角会破坏「秘密只对自己可见」的演示效果）。
4. 「再来一局」创建新房间（§4.10 已写明，这里只是流程确认：结束页按钮 → 剧本详情页）。

> 以上 4 条若群内有不同意见，改 `stateMachine.ts` + 本文档 + 测试，不动接口。

## 7. 测试

`src/game/stateMachine.test.ts`（Vitest）：
正常全流程（开局→选角→自动进 playing→两幕→投票→ended 结算）+
异常分支（人数不足、非房主 FORBIDDEN、抢角色、未选角不能准备、换角色需取消准备、
错误状态操作、投自己 VALIDATION_ERROR、重复投票、投错凶手、平票 null、NOT_FOUND、
demoAdvance 三个分支、ended 只读、选择器与状态机判定一致性）。

运行：`npm test`（含 `npm run typecheck`）。


## 2026-10-18 公聊与私聊（用户授权 B/C 联动）

保持 RoomStatus 不变；Room 新增可选 gameplayPhase：introduction / search / discussion。
选角准备完毕 → 第一幕出场公聊（介绍身份、相互认识）→ 搜证 → 讨论（公聊 / 双人私聊）→ 下一幕搜证 → 讨论 → 最后一幕讨论结束进入投票。
房主通过 next-act 逐环节推进；非房主不能推进；旧房间无 gameplayPhase 时按搜证处理。
POST /api/rooms/:roomId/messages：{ playerId, channel: 'public' | 'direct', receiverPlayerId?, content, clueId? } → { data: RoomState }。
content 为 1～1000 字；分享 clueId 时由引擎读取本人已获得的线索原文。出场只允许公聊；搜证阶段不能发言；讨论可公聊、私聊。
RoomState.messages 随原有 2 秒轮询同步，服务端只返回公聊与本人收发的私聊。Mock localStorage 和服务端运行时存储均保留消息，旧存档缺失消息按空数组处理。
私密线索分享前二次确认；公开介绍只使用角色 publicIntro，绝不自动填入 secret。


## 2026-10-18 个人故事阅读（用户需求修正）

开局流程调整为：选角准备完成 → reading（个人故事、秘密、任务）→ 全员确认已读 → introduction（公聊自我介绍）→ 搜证 → 讨论。
GameplayPhase 新增 reading；Room.storyReadPlayerIds 为可选 string[]，用于轮询和刷新恢复进度。
POST /api/rooms/:roomId/confirm-story-read，{ playerId } → { data: RoomState }；必须是本房成员，确认去重且可重试。最后一人确认后全员进入 introduction。
阅读期间禁止聊天、next-act 和演示结束；玩家不能被房主提前带离阅读。
Character.backgroundStory 为可选的私密故事，仅随 me.character 返回；CharacterPublic 不包含。四个现有剧本都补齐了个人故事。
游戏页在介绍和后续搜证/讨论中提供「回看我的故事与个人任务」，旧剧本无 backgroundStory 时使用公开介绍作为回退。
旧房间保留当前环节；新建一局体验完整的阅读 → 自我介绍流程。


## 共享分支集成说明

与 main 的每幕确认逻辑合并：introduction → search、search → discussion 由房主推进；仅 discussion → 下一幕/投票要求全员确认 isReady。
进入游戏、进入讨论、切幕和进入投票时清空讨论确认；reading 使用独立的 storyReadPlayerIds。
场景探索保留在 search 阶段；角色画像、出场动画、回忆滤镜、音效均保留。联网多人模式启动方法见 README 3.8。
