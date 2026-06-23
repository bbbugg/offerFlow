# OfferFlow 开发规则

## 项目概述
OfferFlow 是一款面向求职者的全流程求职管理工具，Next.js 16 + Tailwind CSS 4 + Prisma (Neon PostgreSQL/SQLite) + 自定义 JWT 认证。

## 重要约定

### 部署
- Vercel Hobby 计划部署，函数超时上限 10s
- 生产数据库：Neon PostgreSQL，开发：SQLite（通过 `npm run db:pg` / `db:sqlite` 切换 schema）
- 出现构建缓存问题时用 `vercel --force --prod` 清除缓存

### LLM 集成
- 默认使用 DeepSeek API（可通过环境变量切换为小米 MiMo 等 OpenAI-compatible API）
- LLM 客户端 `src/lib/llm/client.js` 默认 60s 超时 + 单次重试
- 已知问题：Hobby 计划 10s 超时与 LLM 长响应时间冲突，详见产品文档 §16

### 代码风格
- React Server Components 优先，客户端组件使用 `'use client'`
- Tailwind CSS 优先，避免内联样式
- 不添加不必要的注释，代码自文档化
- 不创建不必要的抽象，三个类似行优于一个过早抽象

## 待解决问题

### Pixel Pig 加载动画（2026-05-25）
- **素材**：`C:\Users\73207\Downloads\飞书20260523-001411.mp4` (3.9MB)，黑底橙猪
- **旋转**：CSS `transform: rotate(-90deg)`，无需重新编码
- **浅色模式方案**：深色圆角容器（`bg-#111` + `border-radius: 20px` + 紫色 shadow）包裹视频
- **托管**：外置 CDN 优先，避免 Vercel 缓存问题
- **实施位置**：`ReviewModal.jsx` AI 分析加载、`TrendReportModal.jsx` loading 状态
- **详情**：见产品文档 §16 第二个子章节
