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

1. 打开仓库 [Settings → Pages](https://github.com/ch2rd/hackathon-2026/settings/pages)
2. 左侧 `Pages`
3. `Build and deployment` → `Source` 选择 **GitHub Actions**
4. 将功能 PR 合入 `main` 后，会自动运行发布；如果此前已经失败，在 [Actions 发布流程](https://github.com/ch2rd/hackathon-2026/actions/workflows/deploy-pages.yml) 点击 **Run workflow**，分支选择 `main`
5. 确认 `build` 和 `deploy` 两个任务均为绿色，再从任务中的 `github-pages` 链接打开网站

部署成功后地址通常是：

```text
https://ch2rd.github.io/hackathon-2026/
```

剧本库使用 `#/scripts` 路由，可刷新或直接分享深层链接。封面和 AI 头像使用站点子路径；四张动图的预览入口为 `covers/preview.html`。

## 线上看不到更新时

- PR 分支已上传不代表网站已更新：发布流程只监听 `main`，先确认 PR 已合并。
- 若失败步骤是 `actions/configure-pages` 且提示 `Get Pages site failed / Not Found`，由 owner 按上方步骤开启 Pages，再重新运行发布。该错误与前端是否编译成功无关。
- 若最新 `main` 的 `deploy` 已成功，打开实际部署地址后强制刷新；GitHub 的代码页、PR 页以及开发机的内网 IP 均不是 Pages 网站。

## 注意

- Pages 是 **Mock 静态预览**，数据保存在浏览器 localStorage
- 同一个浏览器开多个标签页可以模拟多名玩家
- 真正的跨设备联机仍然需要运行 Express 后端，或使用 Cloudflare Tunnel / 部署后端
- 私有仓库开启 Pages 可能需要 GitHub Pro / Team / Enterprise；如果 owner 的套餐不支持，改用 Vercel / Netlify + Render/Railway
