# 剧本数据格式（C 负责）

> 一句话：**新增剧本 = 往 `data/scripts/` 丢一个 JSON 文件，不需要改任何代码。**
>
> 后端 seed 和前端 Mock 读的是同一批文件。改完跑一次 `npm run check:scripts`，
> 校验器会把不合规的数据当场拦下来（文件名、字段、凶手自洽、私密线索归属……）。

---

## 一、放在哪、叫什么

```text
data/scripts/
├── script_wuye.json        # 《雾夜庄园》
├── script_shenhai.json     # 《深海回音》
└── ...
```

- **一个剧本一个文件**，文件名必须是 `<scriptId>.json`；
- 文件名必须和文件里的 `script.id` **完全一致**（写错了校验器会报）；
- id 统一用 `script_` 前缀 + 小写英文短名，别用中文、空格、大写。

---

## 二、文件骨架

```json
{
  "script": { ...剧本元信息... },
  "characters": [ ...角色... ],
  "acts": [ ...幕... ],
  "clues": [ ...线索... ]
}
```

`characters` / `acts` / `clues` 为**空数组** `[]` 时，这个剧本就是「**即将开放**」：
能出现在剧本库、能看详情，但**不能开局**（`createRoom` 会返回 `INVALID_STATE`）。

---

## 三、字段说明

### 3.1 `script`（剧本元信息）

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `id` | string | ✅ | 必须等于文件名，如 `script_wuye` |
| `title` | string | ✅ | 剧本名 |
| `subtitle` | string | ✅ | 副标题 |
| `coverUrl` | string | ✅ | 封面路径，如 `/covers/wuye-manor.svg` |
| `genre` | string | ✅ | 只能是 `推理` / `情感` / `恐怖` / `欢乐` / `硬核` |
| `playerCount` | number | ✅ | 建议人数，**整数且 ≥ 2** |
| `durationMinutes` | number | ✅ | 时长（分钟），正数 |
| `difficulty` | number | ✅ | 难度，只能是 `1`~`5` |
| `summary` | string | ✅ | 一句话简介（列表卡片用） |
| `description` | string | ✅ | 详细介绍（详情页用） |
| `tags` | string[] | ✅ | 标签，可为空数组 |
| `murdererCharacterId` | string \| null | ✅ | 凶手角色 id；**没录入角色时写 `null`** |
| `createdAt` | string | ✅ | ISO 时间字符串 |

> `murdererCharacterId` 是**敏感字段**：前端只在 Mock 模式用它结算结局，
> 真实模式由服务端计算、结局前绝不下发。

### 3.2 `characters[]`（角色）

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `id` | string | ✅ | 建议 `char_` 前缀，如 `char_linmo` |
| `scriptId` | string | ✅ | 必须等于 `script.id` |
| `name` | string | ✅ | 角色名 |
| `identity` | string | ✅ | 身份，如「庄园管家」 |
| `age` | number | ✅ | 年龄 |
| `avatarUrl` | string | ✅ | 头像路径 |
| `publicIntro` | string | ✅ | 公开介绍，**别在这里泄露秘密** |
| `secret` | string | ✅ | 本人的秘密，**只有他/她自己能看到** |
| `goals` | string[] | ✅ | 个人任务，至少 1 条 |
| `sortOrder` | number | ✅ | 展示排序 |

### 3.3 `acts[]`（幕）

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `id` | string | ✅ | 如 `act_1` |
| `scriptId` | string | ✅ | 必须等于 `script.id` |
| `actNumber` | number | ✅ | **从 1 开始且连续**，不能跳号 |
| `title` | string | ✅ | 幕标题 |
| `narration` | string | ✅ | 旁白 / 剧情文本 |

> 幕数不写死在代码里：写 2 幕就推 2 幕，写 5 幕就推 5 幕。

### 3.4 `clues[]`（线索）

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `id` | string | ✅ | 如 `clue_01` |
| `scriptId` | string | ✅ | 必须等于 `script.id` |
| `actNumber` | number | ✅ | 第几幕出现，**必须存在于 `acts` 里** |
| `title` | string | ✅ | 线索标题 |
| `content` | string | ✅ | 线索内容 |
| `visibility` | string | ✅ | `public`（所有人可见）或 `private`（只有归属者可见） |
| `ownerCharacterId` | string \| null | ✅ | `private` 必须填**本剧本的角色 id**；`public` 必须写 `null` |

---

## 四、校验器会拦下这些错误

`npm run check:scripts` 覆盖全部剧本，命中任意一条就**退出码 1**：

- 文件名与 `script.id` 不一致；
- 缺字段、类型不对、`genre` / `difficulty` 超出枚举；
- `playerCount < 2`；
- 角色 / 线索 id 重复；
- `characters[].scriptId`、`acts[].scriptId`、`clues[].scriptId` 与 `script.id` 不一致；
- 幕号不从 1 开始、跳号、重复；
- 私密线索没填 `ownerCharacterId`，或填的不是本剧本角色；
- 公开线索的 `ownerCharacterId` 不是 `null`；
- 线索的 `actNumber` 找不到对应的幕；
- **有角色却没写 `murdererCharacterId`**，或凶手不是本剧本角色；
- 有角色却缺幕或缺线索（这种剧本既不能开局，也不该放出来）；
- 还没录入角色，却写了幕 / 线索 / 凶手。

前端加载时跑的是**同一套校验**（`src/utils/scriptSchema.ts`），
所以这里过了，前端就不会因为数据问题白屏。

---

## 五、最小可用模板

```json
{
  "script": {
    "id": "script_demo",
    "title": "示例剧本",
    "subtitle": "副标题",
    "coverUrl": "/covers/demo.svg",
    "genre": "推理",
    "playerCount": 3,
    "durationMinutes": 60,
    "difficulty": 2,
    "summary": "一句话简介。",
    "description": "详细介绍。",
    "tags": ["推理"],
    "murdererCharacterId": "char_a",
    "createdAt": "2026-10-18T00:00:00.000Z"
  },
  "characters": [
    {
      "id": "char_a",
      "scriptId": "script_demo",
      "name": "甲",
      "identity": "身份",
      "age": 30,
      "avatarUrl": "/avatars/a.svg",
      "publicIntro": "公开介绍。",
      "secret": "只有甲知道的秘密。",
      "goals": ["目标一"],
      "sortOrder": 1
    },
    {
      "id": "char_b",
      "scriptId": "script_demo",
      "name": "乙",
      "identity": "身份",
      "age": 31,
      "avatarUrl": "/avatars/b.svg",
      "publicIntro": "公开介绍。",
      "secret": "只有乙知道的秘密。",
      "goals": ["目标一"],
      "sortOrder": 2
    },
    {
      "id": "char_c",
      "scriptId": "script_demo",
      "name": "丙",
      "identity": "身份",
      "age": 32,
      "avatarUrl": "/avatars/c.svg",
      "publicIntro": "公开介绍。",
      "secret": "只有丙知道的秘密。",
      "goals": ["目标一"],
      "sortOrder": 3
    }
  ],
  "acts": [
    {
      "id": "act_1",
      "scriptId": "script_demo",
      "actNumber": 1,
      "title": "第一幕",
      "narration": "旁白文本。"
    }
  ],
  "clues": [
    {
      "id": "clue_01",
      "scriptId": "script_demo",
      "actNumber": 1,
      "title": "公开线索",
      "content": "所有人都能看到。",
      "visibility": "public",
      "ownerCharacterId": null
    },
    {
      "id": "clue_02",
      "scriptId": "script_demo",
      "actNumber": 1,
      "title": "甲的私密线索",
      "content": "只有甲能看到。",
      "visibility": "private",
      "ownerCharacterId": "char_a"
    }
  ]
}
```

（`playerCount` 是**建议人数**；测试用的最小剧本写 3 个角色就够了。）

---

## 六、写完怎么验

```bash
npm run check:scripts     # 只验剧本数据
npm run typecheck         # 类型检查
```

`npm run build` 已经把 `check:scripts` 串进去了，坏数据进不了构建。

---

## 七、内容质量要求（校验器管不了的）

- 全中文，语气统一，不要出现 `Lorem ipsum` / `TODO` / 英文占位符；
- 创始人 / 凶手要和线索**自洽**，别自相矛盾；
- 每个角色的 `secret` 要有信息量（它是玩家的底牌，别写成「暂无」）；
- 建议每个角色至少有一条自己的私密线索，否则他在游戏里会没事可做；
- 引用线索文案时用「仅 XXX 可见」开头，方便玩家一眼分清公私。

---

## 八、当前剧本清单

| 文件 | 剧本 | 角色 | 幕 | 线索（公开 / 私密） | 状态 |
| --- | --- | --- | --- | --- | --- |
| `script_wuye.json` | 雾夜庄园 | 6 | 2 | 7 / 6 | 可玩 |
| `script_shenhai.json` | 深海回音 | 5 | 3 | 10 / 5 | 可玩 |
| `script_shilou.json` | 石楼童谣 | 6 | 3 | 8 / 6 | 可玩 |
| `script_huoche.json` | 末班列车 | 5 | 3 | 10 / 5 | 可玩 |

四本都满足「每个角色至少一条自己的私密线索」，`npm test` 会逐本跑完整一局。

> **凶手是谁不写在这里。** 别在 UI 文案、演示脚本、聊天记录里提前泄露 ——
> 真要核对，去看对应 JSON 的 `murdererCharacterId`。

## 九、变更记录

| 日期 | 修改人 | 内容 |
| --- | --- | --- |
| 2026-10-18 | C | 初版：确立 `data/scripts/*.json` 为唯一剧本数据源，定义字段与校验规则 |
