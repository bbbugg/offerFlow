# OfferFlow — 求职全流程管理平台

一站式求职管理工具，帮助你系统化追踪求职进度、复盘面试表现、用 AI 洞察改进方向。

**技术栈**: Next.js 16 + React 19 + Tailwind CSS v4 + Prisma + SQLite/PostgreSQL

---

## 核心功能

### 看板管理（Board）
- 10 列 Kanban 看板，覆盖求职全流程：收藏 → 已投递 → 笔试 → 一面 → 二面 → ... → 已offer → 已入职
- HTML5 原生拖拽，拖拽即可变更岗位状态
- 每个岗位卡片展示公司、职位、优先级、近期动态

### 岗位库（Positions）
- 表格视图管理所有投递记录，支持按状态/公司/城市筛选
- 快速编辑岗位信息：JD 链接、薪资范围、工作模式、联系人
- 内嵌时间线，记录每个岗位的关键节点

### 简历管理（Resumes）
- 多版本简历管理，标记默认简历
- 本地上传文件（IndexedDB 持久化），刷新不会丢失
- 简历预览、版本备注、投递关联

### 日程待办（Schedule）
- 任务按类型分组：面试、笔试、投递、推进、会议、其他
- 标记完成、设置优先级、关联岗位

### 面试复盘（Interview）
- 8 维度评分系统（表达、岗位理解、项目熟悉度、业务思考、技术能力、临场状态、反问质量、整体表现）
- **AI 智能分析**（核心功能）：
  - 上传面试录音整理（.docx），AI 自动评分 + 分析优势不足
  - 逐题分析面试表现 + 给出改进建议
  - 标签正负分类（positiveTags / negativeTags）
  - 跨面试趋势报告：高频薄弱点、评分趋势、改进建议
  - 支持 DeepSeek / OpenAI / 硅基流动 / 通义千问 等任意 OpenAI 兼容 API

### 数据洞察（Insights）
- 投递漏斗图、面试评分趋势、岗位状态分布
- 薄弱项统计、拒绝原因分析
- 按时间范围筛选，跟踪求职进展

---

## 快速开始

### 前置条件

- **Node.js 18+**（[下载 LTS 版本](https://nodejs.org/)）
- 一个 **LLM API Key**（可选，用于 AI 面试分析，如 [DeepSeek](https://platform.deepseek.com/)）

### Windows 一键部署

```
1. 解压下载的 zip 文件
2. 双击项目根目录的 setup.bat
   脚本自动完成：安装依赖 → 切换 SQLite → 生成数据库 → 初始化配置
3. 在目录中打开终端（或在 VS Code 中点 + 号新开终端，cd 到解压后文件夹的位置）
4. 运行 npm run dev
5. 浏览器打开 http://localhost:3000
6. 注册账号 → 进入「设置」→ 配置 LLM API Key → 开始使用
```

### 手动部署（Windows / macOS / Linux）

```bash
# 1. 克隆
git clone https://github.com/xuuuu-cpu/offerFlow-llm-feature.git
cd offerFlow-llm-feature

# 2. 安装依赖
npm install

# 3. 切换到 SQLite 模式
npm run db:sqlite

# 4. 配置环境变量
cp .env.example .env          # macOS/Linux
copy .env.example .env         # Windows

# 5. 编辑 .env，修改 JWT_SECRET，并设置允许注册的用户名 REGISTER_ALLOWED_USERNAMES

# 6. 启动
npm run dev
```

浏览器打开 http://localhost:3000 即可使用。

### Docker 部署

Docker 部署默认使用 SQLite，适合个人服务器、NAS 或单机长期运行。

```bash
# 构建并启动
docker compose up -d --build

# 查看日志
docker compose logs -f app
```

启动后访问 http://localhost:3000。`docker-compose.yml` 会创建两个持久化卷：

- `offerflow-data`：SQLite 数据库，默认文件为 `/app/data/dev.db`
- `offerflow-uploads`：面试复盘上传文件

环境变量在运行时注入即可。最少建议设置 `JWT_SECRET` 和允许注册的用户名：

```bash
JWT_SECRET=your-random-secret REGISTER_ALLOWED_USERNAMES=alice,bob docker compose up -d
```

如果不用 compose，也可以直接运行镜像：

```bash
docker run -d \
  --name offerflow \
  -p 3000:3000 \
  -e JWT_SECRET=your-random-secret \
  -e REGISTER_ALLOWED_USERNAMES=alice,bob \
  -v offerflow-data:/app/data \
  -v offerflow-uploads:/app/public/uploads \
  ghcr.io/<owner>/<repo>:latest
```

默认 `PRISMA_DB_PUSH=true`，容器启动时会执行 `prisma db push` 初始化/同步表结构。

使用已发布镜像时，将 compose 中 `app` 服务的 `build` 段删除，并保留：

```yaml
app:
  image: ghcr.io/<owner>/<repo>:latest
  restart: unless-stopped
```

### Docker 镜像自动打包

仓库已添加 `.github/workflows/docker-publish.yml`，逻辑与 `gemini-balance` 的 Docker workflow 保持一致：

- `push`：构建并推送镜像到 GitHub Container Registry
- `pull_request` 到 `main`：只构建验证，不推送
- `workflow_dispatch`：支持手动触发
- 多架构：`linux/amd64`、`linux/arm64`
- 标签：分支名、语义化版本 tag、默认分支的 `latest`

镜像地址格式：

```text
ghcr.io/<GitHub 用户或组织>/<仓库名>:latest
```

### AI 面试分析配置

在「设置 → AI 模型配置」中填入你的 LLM API Key：

| 提供商 | Base URL | 默认模型 |
|--------|----------|----------|
| DeepSeek | `https://api.deepseek.com` | `deepseek-chat` |
| OpenAI | `https://api.openai.com/v1` | `gpt-4o` |
| 硅基流动 | `https://api.siliconflow.cn/v1` | `Qwen/Qwen2.5-7B-Instruct` |
| 通义千问 | `https://dashscope.aliyuncs.com/compatible-mode/v1` | `qwen-plus` |

> 配置保存在浏览器本地存储（localStorage），不会上传到任何服务器。设置页面的配置优先级高于环境变量。

---

## 工作流

### 推荐使用流程

```
1. 收集岗位 → 在 Board 看板「收藏」列添加目标公司
2. 投递简历 → 拖拽到「已投递」，关联简历版本
3. 跟进进度 → 更新状态列，在时间线记录关键节点
4. 面试记录 → 面试后在「面试复盘」记录面经
5. AI 分析 → 上传 .docx 录音整理，AI 自动生成评分和改进建议
6. 查看洞察 → 定期查看数据洞察，了解薄弱项和趋势
```

### 数据流架构

```
用户操作 → React 组件 → AppContext (状态管理)
                            ├── API Routes → Prisma → SQLite/PostgreSQL
                            └── localStorage (缓存/回退)
```

---

## 常见问题

### 启动后页面空白或无法访问？
确认 `npm run dev` 正常启动，访问 http://localhost:3000。如果端口被占用，Next.js 会自动尝试下一个可用端口。

### 注册失败或登录不了？
确保 `.env` 文件中的 `JWT_SECRET` 已设置（任意随机字符串均可），且已执行 `npm run db:sqlite` 创建数据库。

### AI 分析报错 "LLM_API_KEY 未配置"？
进入「设置 → AI 模型配置」，填入你的 API Key 后保存，然后重新尝试分析。

### AI 分析超时或返回格式异常？
- 检查 API Key 是否有效，点击「测试连接」验证
- 某些免费模型的上下文窗口较小，长文档可能被截断
- 确认 Base URL 结尾没有多余的 `/`

### 数据存在哪里？
本地运行时数据存储在项目根目录的 `prisma/dev.db`（SQLite 文件），完全由你掌控。API Key 存储在浏览器 localStorage 中。

### 如何切换数据库？
- 本地开发（推荐）：`npm run db:sqlite` → SQLite 零配置
- 生产部署：`npm run db:pg` → PostgreSQL（需自行搭建或使用 Neon）

### 可以在手机上用吗？
目前未针对移动端做完整适配，但核心功能在手机浏览器上基本可用。

### 多人如何共享数据？
本项目为单用户设计，数据按用户 ID 隔离。如需多人共享，可自行搭建 PostgreSQL 部署到服务器。

---

## 隐私与安全说明

### API Key 安全
- **你的 API Key 不会被上传到任何第三方服务器**
- 通过设置页面配置时：Key 保存在浏览器 localStorage，仅在你自己的浏览器中可用
- 调用 AI 分析时：Key 从 localStorage 读取，经由你的本地网络直接发送到 LLM 提供商
- 通过环境变量配置时：Key 仅在服务端内存中，不会被返回给前端
- 所有 AI 分析 API 路由已做 JWT 认证保护

### 数据安全
- **本地运行模式下，所有数据存储在你自己电脑的 SQLite 数据库中**
- 数据库文件 `prisma/dev.db` 不出现在任何网络请求中
- 用户密码使用 bcrypt 哈希存储，不存明文
- JWT Token 使用 httpOnly Cookie，前端 JavaScript 无法读取
- 退出登录时自动清除本地缓存的业务数据

### 建议
- 定期备份 `prisma/dev.db` 文件
- 不要将 `.env` 文件提交到 Git 仓库（已通过 `.gitignore` 保护）
- 使用强密码注册账号

---

## 反馈与贡献

### 反馈问题

如果你遇到 Bug 或有功能建议，欢迎提交 Issue：

- **GitHub Issues**: [https://github.com/xuuuu-cpu/offerFlow-llm-feature/issues](https://github.com/xuuuu-cpu/offerFlow-llm-feature/issues)
- 提交时请附上：
  - 操作步骤和预期行为
  - 错误截图或日志（如有）
  - 浏览器版本和操作系统

### 贡献代码

1. Fork 本仓库
2. 创建你的特性分支：`git checkout -b feat/your-feature`
3. 提交你的修改：`git commit -m 'feat: add some feature'`
4. 推送到分支：`git push origin feat/your-feature`
5. 提交 Pull Request

### 开发建议

提交信息格式参考 [Conventional Commits](https://www.conventionalcommits.org/)：
- `feat:` 新功能
- `fix:` Bug 修复
- `docs:` 文档更新
- `refactor:` 重构
- `style:` 样式调整

---

## 项目结构

```
offerFlow-LLM/
├── prisma/              # 数据库模型（SQLite / PostgreSQL 双 schema）
├── docker/              # Docker 启动脚本
├── src/
│   ├── app/             # Next.js App Router
│   │   ├── api/         # 后端 API（认证、CRUD、AI 分析）
│   │   ├── auth/        # 登录/注册页
│   │   └── (main)/      # 主应用页面（8 个功能页面）
│   ├── components/      # 可复用 UI 组件
│   ├── views/           # 页面视图组件
│   ├── lib/             # 工具库（Prisma、JWT、LLM、AI 解析）
│   ├── store/           # 全局状态管理（Context）
│   └── utils/           # 工具函数（IndexedDB 存储）
├── setup.bat            # Windows 快速部署脚本
├── Dockerfile           # Docker 生产镜像
├── docker-compose.yml   # Docker Compose 部署
└── .env.example         # 环境变量模板
```

---

## License

MIT © 2026 xuuuu-cpu
