# 可探索房间 · 视觉与交互方案

> 目标：把《真相局》的房间页从「普通网页卡片」变成一个有悬疑氛围、可以点击探索的场景。

## 1. Skill 组合

| Skill | 角色 | 负责 |
| --- | --- | --- |
| `frontend-app-builder` | 主力 | 从视觉概念到 React 页面实现，优先保证浏览器里的实际效果 |
| `frontend-design` | 美术指导 | 字体、构图、色彩、背景纹理和 Motion，避免千篇一律的 SaaS UI |
| `frontend-testing-debugging` | 验收 | 动画、交互、响应式和视觉回归检查 |

推荐 Prompt：

```text
使用 frontend-app-builder 和 frontend-design，
为《真相局》设计一个具有复古悬疑手绘风格的可探索房间。
不要套用常见 SaaS UI。先确定视觉概念，再实现一个可交互的房间。
保持现有 React + Vite + Tailwind 技术栈，不引入新依赖。
```

## 2. 视觉方向

- 深色木纹、旧墙纸、羊皮纸、黄铜与暗红点缀
- 标题使用衬线字体，正文保持清晰易读
- 背景有轻雾、暗角、纸纹和烛光，不用大面积纯黑
- 物件有明确的点击区域、悬停光晕和轻微动效
- 不使用通用 SaaS 卡片；场景本身承担主要视觉

## 3. 交互流程

```text
进入房间
 → 点击油画 / 书桌 / 壁炉 / 钟楼窗
 → 物件动效 + 发现线索弹窗
 → 记入我的线索
 → AI DM 对话
 → 解锁下一处场景
```

## 4. 当前实现

- 组件：`src/components/game/SceneExplorer.tsx`
- 入口：`src/pages/GamePage.tsx` 的 `playing` 阶段
- 线索来源：`RoomState.me.visibleClues`
- 前端用本地 `Set` 记录「已发现」，用于演示；正式版应改为服务端记录
- 已发现线索才进入「我的线索」列表
- 发现 2 条线索后显示「钟楼暗门已解锁」

## 5. 后续扩展

1. 服务端增加 `discoveredClueIds` / 每幕探索状态
2. 油画点击后先播放 1～2 秒动效，再显示线索
3. AI DM 对当前场景做上下文问答，而不是只给嫌疑排序
4. 解锁后的钟楼暗门进入下一处场景
5. 使用 `frontend-testing-debugging` 做 390px / 1440px 和动画回归检查