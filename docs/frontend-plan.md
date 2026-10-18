
---

## 9. Skill 组合与可探索房间（新增）

前端优先使用这三个 Skill：

1. `frontend-app-builder`：从视觉概念到 React 页面实现的主力
2. `frontend-design`：复古悬疑、手绘、非 SaaS 化视觉指导
3. `frontend-testing-debugging`：动画、交互、响应式与视觉回归检查

下一阶段新增「可探索房间」：

```text
进入房间
 → 点击油画 / 书桌 / 壁炉 / 钟楼窗
 → 物件动效 + 线索弹窗
 → 记入我的线索
 → AI DM 对话
 → 解锁下一处场景
```

实现与验收细节见 `docs/interactive-room.md`。
---

## 10. 动态角色画像（新增）

每个角色都使用 `CharacterPortrait` 动态画像：

- 动漫悬疑风格
- 根据身份、年龄和姓名哈希生成不同脸型、发型、服装、瞳色和细节
- 支持呼吸、眨眼、发丝摆动、光晕、提灯闪烁
- 用于选角后的角色出场声明、剧本详情角色卡和角色档案大图

实现细节见 `docs/character-portraits.md`。