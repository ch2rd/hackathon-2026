# API 契约（C 负责）

> 本文档是 C 的交付物，与 [AGENTS.md](../AGENTS.md) 第 5 节保持一致；
> 冲突时以 AGENTS.md 为准。**T+30 分钟冻结 P0 接口和字段。**

## 一、统一返回格式

| 场景 | 返回 |
| --- | --- |
| 列表 | `{ "data": [], "total": 0 }` |
| 单个对象 | `{ "data": {} }` |
| 错误 | `{ "error": { "code": "...", "message": "..." } }` |

## 二、错误码

| code | HTTP | 场景 |
| --- | --- | --- |
| VALIDATION_ERROR | 400 | 参数缺失/格式错误 |
| NOT_FOUND | 404 | 剧本/房间/玩家不存在 |
| ROOM_FULL | 409 | 房间人数已满 |
| INVALID_STATE | 409 | 当前状态不允许该操作 |
| FORBIDDEN | 403 | 不是房主/不是本人 |
| RATE_LIMITED | 429 | 请求过频 |
| AI_UNAVAILABLE | 503 | AI 不可用 |
| INTERNAL_ERROR | 500 | 未预期错误 |

## 三、P0 接口（冻结后不改名）

| Method | Path | 请求 | 返回 | 说明 |
| --- | --- | --- | --- | --- |
| GET | `/api/health` | - | `{ data: { ok: true } }` | 健康检查 |
| GET | `/api/scripts` | `?genre=&keyword=` | `{ data: ScriptSummary[], total }` | 剧本列表 |
| GET | `/api/scripts/:scriptId` | - | `{ data: ScriptDetail }` | 详情，不含凶手和秘密 |
| POST | `/api/rooms` | `{ scriptId, nickname }` | `{ data: { room, player } }` | 创建房间 |
| POST | `/api/rooms/join` | `{ code, nickname }` | `{ data: { room, player } }` | 加入房间 |
| GET | `/api/rooms/:roomId/state` | `?playerId=` | `{ data: RoomState }` | 轮询房间状态 |
| POST | `/api/rooms/:roomId/select-character` | `{ playerId, characterId }` | `{ data: RoomState }` | 选角 |
| POST | `/api/rooms/:roomId/ready` | `{ playerId, isReady }` | `{ data: RoomState }` | 准备/取消 |
| POST | `/api/rooms/:roomId/start` | `{ playerId }` | `{ data: RoomState }` | 房主开始 |
| POST | `/api/rooms/:roomId/next-act` | `{ playerId }` | `{ data: RoomState }` | 房主下一幕 |
| POST | `/api/rooms/:roomId/votes` | `{ voterPlayerId, targetPlayerId }` | `{ data: RoomState }` | 投票 |
| POST | `/api/rooms/:roomId/finish` | `{ playerId }` | `{ data: RoomState }` | 演示兜底/强制结束 |
| POST | `/api/ai/hint` | `{ roomId, playerId }` | `{ data: AIHint }` | AI 推理提示 |

## 四、前端 API 函数（A/B 只 import 这些）

```ts
// src/api/scripts.ts
getScripts(params?: { genre?: Genre; keyword?: string }): Promise<ListResult<ScriptSummary>>;
getScriptDetail(scriptId: string): Promise<ScriptDetail>;

// src/api/rooms.ts
createRoom(input: { scriptId: string; nickname: string }): Promise<{ room: Room; player: Player }>;
joinRoom(input: { code: string; nickname: string }): Promise<{ room: Room; player: Player }>;
getRoomState(roomId: string, playerId: string): Promise<RoomState>;
selectCharacter(roomId: string, playerId: string, characterId: string): Promise<RoomState>;
setReady(roomId: string, playerId: string, isReady: boolean): Promise<RoomState>;
startRoom(roomId: string, playerId: string): Promise<RoomState>;
nextAct(roomId: string, playerId: string): Promise<RoomState>;
submitVote(roomId: string, voterPlayerId: string, targetPlayerId: string): Promise<RoomState>;
finishRoom(roomId: string, playerId: string): Promise<RoomState>;

// src/api/ai.ts
getAIHint(roomId: string, playerId: string): Promise<AIHint>;
```

`ListResult<T>`：

```ts
export interface ListResult<T> {
  items: T[];
  total: number;
}
```

`src/api/client.ts` 负责把 HTTP 的 `{ data, total }` 转成 `ListResult`，把 `{ data }` 转成对象，把 `{ error }` 转成 `ApiError`。

## 五、AI 推理接口

```json
{
  "data": {
    "summary": "根据目前线索，庄园管家和医生都存在动机……",
    "suspects": [{ "playerId": "...", "name": "林墨", "confidence": 72, "reason": "..." }],
    "disclaimer": "AI 仅根据你已获得的线索推测，不代表真相。",
    "source": "llm"
  }
}
```

硬性要求（详见 AGENTS.md §5.5）：

- 只用当前玩家可见的公开线索 + 自己的私密线索。
- 绝不返回 `murdererCharacterId`，不直接说「凶手就是 X」。
- 8 秒超时；失败/无 Key 时返回 `source: "mock"` 的确定性结果。
- 服务端用 Zod 校验模型输出；解析失败也走 Mock。

## 六、房间剧本上下文（本次新增，待 A/B 确认）

```text
GET /api/rooms/:roomId/context?playerId=
```

**为什么新增**：§5.3 冻结的接口表里，`GET /api/scripts/:scriptId` 不含幕与线索，
`GET /api/rooms/:roomId/state` 只给「当前幕 + 当前玩家可见线索」。
而 B 的 `src/game/stateMachine.ts` 里 `GameContext` 需要**全部幕 / 全部线索**
才能算可见性与结局（其注释写明「由 src/api 提供」）。所以补了这个口子。

响应：

```json
{
  "data": {
    "acts": [],
    "characters": [],
    "clues": [],
    "murdererCharacterId": null
  }
}
```

硬性要求：

- `clues` 只返回「公开线索 + 当前玩家自己的私密线索」，**别人的私密线索一律不下发**；
- `murdererCharacterId` **真实模式恒为 `null`**，结局揭晓前绝不下发；Mock 模式才给值；
- 结构与 `GameContext` 兼容，B 可以直接赋值使用。

对应前端函数：`getRoomContext(roomId, playerId)`（`src/api/rooms.ts`）。

## 七、变更流程（AGENTS.md §3.6）

冻结后确需变更：C 群里发说明 → A/B 确认 → 更新本文件 + `src/types` → 再改代码。

## 八、待办

- [x] T+30 冻结：P0 字段 / 路径确认（见第三节）
- [x] `src/types/models.ts`、`src/types/api.ts` 落地
- [x] Mock 与真实接口签名对齐（同一份 `ApiAdapter`，由 typecheck 强制）
- [x] `GET /api/rooms/:roomId/context` 登记（见第六节）
- [x] 剧本数据源统一为 `data/scripts/*.json`（见 [script-format.md](script-format.md)）
- [x] Express 路由 + 服务层（真实模式）—— 全部 P0 端点已实现并通过全流程冒烟
- [x] `POST /api/ai/hint` 接 OpenAI，8 秒超时降级 Mock
- [x] `POST/GET /api/voice/signals` —— 玩家语音信令（见第十节）
- [ ] `prisma/schema.prisma` 迁移：运行时状态目前落在 `.data/rooms.json`
      （`src/server/store/roomStore.ts`，零依赖实现）；schema 已按 §4 建好，
      换 Prisma 时只需替换该文件，路由与服务层不动

## 九、实现说明（真实模式）

| 层 | 位置 | 说明 |
| --- | --- | --- |
| 路由 | `src/server/routes/` | 只校验入参、套 `{ data }` / `{ data, total }` 壳 |
| 服务 | `src/server/services/` | 业务逻辑；**状态机规则复用 `src/mocks/mockEngine.ts`**，与 Mock 完全同源 |
| 存储 | `src/server/store/roomStore.ts` | 房间/玩家/投票；读-改-写串行，失败不落盘 |
| 剧本 | `data/scripts/*.json` | 静态内容，前后端读同一批文件；新增剧本不需要 seed |

安全红线（每次改动都要复验）：

- 剧本列表 / 详情**不含** `murdererCharacterId` 与 `secret`；
- `GET /rooms/:roomId/context` 在真实模式下 `murdererCharacterId` **恒为 `null`**；
- 凶手指向只在 `status === 'ended'` 的 `room.state.result` 里出现。


## 十、玩家语音信令（WebRTC）

> 音频**不经过服务器**：说话声由浏览器之间 P2P 直连（WebRTC），
> 服务端只负责在两边之间转发 SDP / ICE candidate 这些「小纸条」。
> 因为 AGENTS.md §0.1 把 WebSocket 实时同步列为非目标，信令走**轮询**：
> 真实模式用进程内队列（`src/server/services/voiceSignalService.ts`），
> Mock 模式用 localStorage 队列（`src/api/mockAdapter.ts`）。

### POST /api/voice/signals

盲转发一条信令 —— 服务端**不解析** `payload`，只按收件人排队投递。

```json
{
  "roomId": "room_xxx",
  "fromPlayerId": "player_a",
  "toPlayerId": "player_b",
  "kind": "offer",
  "payload": "{\"type\":\"offer\",\"sdp\":\"v=0\\r\\no=- ...\"}"
}
```

→ `{ "data": { "ok": true } }`

`kind` 取值：

| kind | 用途 |
| --- | --- |
| `hello` | 我刚进语音频道，广播给房间里其他人 —— 用来发现谁真的开了麦，避免对没加入的人白建连接 |
| `offer` / `answer` | SDP 交换，由 `playerId` 字典序小的一方发起（确定性规则，天然无 glare） |
| `ice` | ICE candidate，逐个转发，用于打通 NAT |

`payload` 上限 20000 字符（SDP 一般 2～8KB），`express.json` 全局上限 100kb。

### GET /api/voice/signals?roomId=&playerId=

取走**投递给 `playerId`** 的全部信令，**取走即删除**。

→ `{ "data": VoiceSignal[] }`

已由单测钉死的不变量（`voiceSignalService.test.ts`）：

- 同一条信令**绝不重复投递**（重复 `addIceCandidate` 会让握手乱掉）；
- 只投给收件人，别人的信令不会被顺手取走；
- 超过 60 秒的过期信令直接丢弃；
- 队列纯内存、按房间隔离、上限 200 条；进程重启后重新握手即可。

对应前端函数：`sendVoiceSignal(input)` / `pollVoiceSignals(roomId, playerId)`（`src/api/voice.ts`）。

### 演示前提（重要）

`getUserMedia` 只在 **https 或 localhost** 存在。用 `http://局域网IP:5173` 访问时
`navigator.mediaDevices` 直接是 `undefined`，浏览器会禁掉麦克风。
需改用 https，或在 Chrome 打开
`chrome://flags/#unsafely-treat-insecure-origin-as-secure` 把本站加进白名单后重启浏览器。
前端会检测到这个状态并如实提示，不会假装能用。


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

