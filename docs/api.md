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

## 六、变更流程（AGENTS.md §3.6）

冻结后确需变更：C 群里发说明 → A/B 确认 → 更新本文件 + `src/types` → 再改代码。

## 七、待办

- [ ] T+30 冻结：把本表 P0 字段/路径最终确认
- [ ] `src/types/models.ts`、`src/types/api.ts` 落地
- [ ] Mock 与真实接口签名对齐
