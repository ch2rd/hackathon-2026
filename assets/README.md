# 素材目录

放演示与文档用到的静态资源，便于评审一次性找到材料。

建议结构：

```text
assets/
├── architecture.png     # 架构图（docs/02 引用）
├── screenshot-*.png     # 界面截图（README 引用）
├── demo-slides.pdf      # 演示 PPT 导出的 PDF（兜底用）
├── demo-video-cover.png # 演示视频封面
└── qrcode-demo.png      # 在线 Demo 二维码
```

规则：

- 图片压缩后再提交，单文件控制在 1 MiB 以内；视频不要提交进仓库，放外部链接。
- 第三方素材必须登记到 [../ATTRIBUTIONS.md](../ATTRIBUTIONS.md)。
- 截图前先清空个人隐私信息（聊天记录、真实姓名、手机号、密钥）。
