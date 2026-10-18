# src/ 源码目录

目录与文件 Owner 以 [AGENTS.md](../AGENTS.md) §3、§6 为准，这里只做速查。

```text
src/
├── main.tsx / App.tsx / router.tsx      # A（router 第一天建好全部路由）
├── pages/                               # A/B 分页
│   ├── HomePage.tsx                     # A
│   ├── ScriptLibraryPage.tsx            # A
│   ├── ScriptDetailPage.tsx             # A
│   ├── CharacterPage.tsx                # A（UI）
│   ├── RoomPage.tsx                     # B
│   ├── GamePage.tsx                     # B
│   └── EndingPage.tsx                   # B
├── components/
│   ├── ui/                              # A（设计系统）
│   ├── layout/                          # A
│   └── game/                            # B
├── stores/gameStore.ts                  # B（Zustand）
├── game/stateMachine.ts, selectors.ts   # B（纯函数状态机）
├── api/                                 # C（fetch 封装 + 适配器）
├── mocks/                               # C（Mock 数据）
├── types/                               # C（唯一类型来源）
├── utils/                               # C（公共工具）
└── styles/                              # A（theme.css 设计 token）
```

铁律：

- 所有 `fetch` 只写 `src/api`，页面里禁止直接 `fetch`。
- 共享类型只写 `src/types`，数据模型以 AGENTS.md §4 为唯一版本。
- 组件里不写死剧本/角色数据，一律走 API/Mock。
- 跨区修改先问 owner，只做最小改动。
