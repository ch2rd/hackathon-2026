# GitHub Pages 预览

## 目标

让队友在 GitHub 上直接打开一个可点击的前端预览，不需要本地 clone。

## 已添加

- `.github/workflows/deploy-pages.yml`
- Vite 支持 `GITHUB_PAGES_BASE` 和 `VITE_ROUTER_MODE=hash`
- Pages 构建固定使用：
  - `VITE_USE_MOCK=true`
  - `VITE_DEMO_MODE=true`
  - `VITE_ROUTER_MODE=hash`

## 需要仓库 owner 操作一次

GitHub Pages 需要 owner/admin 开启：

1. 打开仓库 `Settings`
2. 左侧 `Pages`
3. `Build and deployment` → `Source` 选择 **GitHub Actions**
4. 等待 `Deploy frontend preview to GitHub Pages` workflow 运行

部署地址通常是：

```text
https://ch2rd.github.io/hackathon-2026/
```

## 注意

- Pages 是 **Mock 静态预览**，数据保存在浏览器 localStorage
- 同一个浏览器开多个标签页可以模拟多名玩家
- 真正的跨设备联机仍然需要运行 Express 后端，或使用 Cloudflare Tunnel / 部署后端
- 私有仓库开启 Pages 可能需要 GitHub Pro / Team / Enterprise；如果 owner 的套餐不支持，改用 Vercel / Netlify + Render/Railway