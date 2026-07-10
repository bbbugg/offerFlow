# OfferFlow 开发规则

## 项目概述
OfferFlow 是一款面向求职者的全流程求职管理工具，Next.js 16 + Tailwind CSS 4 + Prisma (Neon PostgreSQL/SQLite) + 自定义 JWT 认证。

## 重要约定

### 部署
- Vercel Hobby 计划部署，函数超时上限 10s
- 生产数据库：Neon PostgreSQL，开发：SQLite（通过 `npm run db:pg` / `db:sqlite` 切换 schema）
- 出现构建缓存问题时用 `vercel --force --prod` 清除缓存

### 代码风格
- React Server Components 优先，客户端组件使用 `'use client'`
- Tailwind CSS 优先，避免内联样式
- 不添加不必要的注释，代码自文档化
- 不创建不必要的抽象，三个类似行优于一个过早抽象
