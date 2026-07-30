# OfferFlow — 求职全流程管理平台

二改自 [xuuuu-cpu/offerFlow-llm-feature](https://github.com/xuuuu-cpu/offerFlow-llm-feature)。

一站式求职管理工具，帮助你系统化追踪岗位、投递进度、面试轮次与待办事项。

**技术栈**: Next.js 16 + React 19 + Tailwind CSS v4 + Prisma + SQLite/PostgreSQL

---

## 核心功能

### 看板管理（Board）
- 9 列 Kanban 看板，覆盖求职全流程：感兴趣 → 已投递 → 笔试 → 一面 → 二面 → ... → Offer → 已结束
- HTML5 原生拖拽，拖拽即可变更岗位状态
- 每个岗位卡片展示公司、职位、优先级、近期动态

### 岗位库（Positions）
- 表格视图管理所有投递记录，支持按状态/公司/城市筛选
- 快速编辑岗位信息：JD 链接、薪资范围、工作模式、联系人
- 内嵌时间线，记录每个岗位的关键节点

### 日程待办（Schedule）
- 任务按类型分组：面试、笔试、投递、推进、会议、其他
- 标记完成、设置优先级、关联岗位

### 数据洞察（Insights）
- 投递漏斗图、面试轮次统计、岗位状态分布
- 渠道效果、城市分布与拒绝原因分析
- 按时间范围筛选，跟踪求职进展

### 公开分享（Share）
- 一键生成永久分享链接，通过链接分享整个求职空间给他人
- 访客无需注册，直接查看仪表盘、投递看板、岗位库、日程待办、数据洞察全部五个视图
- 分享页支持深色 / 浅色模式切换，界面与主系统完全一致
- **严格只读**：访客无法拖拽看板、新建/编辑/删除任何数据；所有写操作入口在前端已隐藏，后端接口层（JWT 中间件）亦拦截未授权请求
- 可随时在「系统设置」中关闭并销毁分享链接

---

## 快速开始

### 前置条件

- **Node.js 18+**（[下载 LTS 版本](https://nodejs.org/)）

### Windows 一键部署

```
1. 解压下载的 zip 文件
2. 双击项目根目录的 setup.bat
   脚本自动完成：安装依赖 → 切换 SQLite → 生成数据库 → 初始化配置
3. 在目录中打开终端（或在 VS Code 中点 + 号新开终端，cd 到解压后文件夹的位置）
4. 运行 npm run dev
5. 浏览器打开 http://localhost:3000
6. 注册账号并开始使用
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

Docker 部署默认使用 SQLite，适合个人服务器、NAS 或单机长期运行。官方镜像支持
`linux/amd64` 和 `linux/arm64`：

```text
ghcr.io/bbbugg/offerflow:latest
```

新建 `compose.yml`：

```yaml
services:
  app:
    image: ghcr.io/bbbugg/offerflow:latest
    restart: unless-stopped
    ports:
      - "8543:3000"
    environment:
      JWT_SECRET: ${JWT_SECRET:?请在 .env 中设置 JWT_SECRET}
      REGISTER_ALLOWED_USERNAMES: ${REGISTER_ALLOWED_USERNAMES:?请在 .env 中设置 REGISTER_ALLOWED_USERNAMES}
    volumes:
      - offerflow-data:/app/data

volumes:
  offerflow-data:
```

在同一目录新建 `.env`，填写 JWT 密钥和允许注册的用户名：

```dotenv
JWT_SECRET=请替换为足够长的随机字符串
REGISTER_ALLOWED_USERNAMES=alice,bob
```

多个用户名使用英文逗号分隔。未列入 `REGISTER_ALLOWED_USERNAMES` 的用户名无法注册。

启动服务：

```bash
docker compose up -d
```

启动后访问 `http://服务器地址:8543`。常用维护命令：

```bash
# 查看日志
docker compose logs -f app

# 更新镜像并重建容器
docker compose pull
docker compose up -d
```

`offerflow-data` 卷保存 SQLite 数据库 `/app/data/dev.db`。删除或重建容器不会丢失数据，
但执行 `docker compose down -v` 会删除数据卷，请谨慎使用。建议定期备份该数据卷。

容器默认设置 `PRISMA_DB_PUSH=true`，首次启动时会自动创建数据库并同步表结构。

如果不用 Compose，也可以直接运行：

```bash
docker run -d \
  --name offerflow \
  --restart unless-stopped \
  -p 8543:3000 \
  -e JWT_SECRET=your-random-secret \
  -e REGISTER_ALLOWED_USERNAMES=alice,bob \
  -v offerflow-data:/app/data \
  ghcr.io/bbbugg/offerflow:latest
```

---

## 工作流

### 推荐使用流程

```
1. 收集岗位 → 在 Board 看板「感兴趣」列添加目标公司
2. 完成投递 → 拖拽到「已投递」
3. 跟进进度 → 更新状态列，在时间线记录关键节点
4. 面试推进 → 记录每一轮面试状态与结果
5. 查看洞察 → 定期查看数据洞察，了解渠道效果和转化趋势
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

### 数据存在哪里？
本地运行时数据存储在项目根目录的 `prisma/dev.db`（SQLite 文件），该文件由 Prisma 按需创建且已被 Git 忽略。

### 如何切换数据库？
- 本地开发（推荐）：`npm run db:sqlite` → SQLite 零配置
- 生产部署：`npm run db:pg` → PostgreSQL（需自行搭建或使用 Neon，并会同步数据库表结构）

### 可以在手机上用吗？
目前未针对移动端做完整适配，但核心功能在手机浏览器上基本可用。

### 多人如何共享数据？
本项目为单用户设计，数据按用户 ID 隔离。如需多人共享，可自行搭建 PostgreSQL 部署到服务器。

---

## 隐私与安全说明

### 数据安全
- **本地运行模式下，所有数据存储在你自己电脑的 SQLite 数据库中**
- 数据库文件 `prisma/dev.db` 不出现在任何网络请求中
- 用户密码使用 bcrypt 哈希存储，不存明文
- JWT Token 使用 httpOnly Cookie，前端 JavaScript 无法读取
- 退出登录时自动清除本地缓存的业务数据

### 公开分享的安全机制
- 分享链接基于随机生成的 UUID Token，无法枚举猜测
- 分享页访客**没有 Cookie / JWT**，后端中间件对所有写接口（`/api/jobs`、`/api/tasks` 等）统一返回 `401 Unauthorized`，即使绕过前端直接调用接口也无法修改任何数据
- 仅 `/api/share/board`（只读数据查询）对分享访客开放
- 关闭分享后，对应 Token 立即从数据库删除，原链接永久失效

### 建议
- 定期备份 `prisma/dev.db` 文件
- 不要将 `.env` 文件提交到 Git 仓库（已通过 `.gitignore` 保护）
- 使用强密码注册账号
- 仅在信任的场合分享求职空间链接，因为分享链接公开可访问，不设访问密码

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
offerFlow/
├── prisma/              # 数据库模型（SQLite / PostgreSQL 双 schema）
├── docker/              # Docker 启动脚本
├── src/
│   ├── app/             # Next.js App Router
│   │   ├── api/         # 后端 API（认证、岗位与任务 CRUD）
│   │   ├── auth/        # 登录/注册页
│   │   └── (main)/      # 主应用页面
│   ├── components/      # 可复用 UI 组件
│   ├── views/           # 页面视图组件
│   ├── lib/             # 工具库（Prisma、JWT 等）
│   ├── store/           # 全局状态管理（Context）
├── setup.bat            # Windows 快速部署脚本
├── Dockerfile           # Docker 生产镜像
├── docker-compose.yml   # Docker Compose 部署
└── .env.example         # 环境变量模板
```

---

## License

原项目在 README 中标注为 MIT License。

- 原始项目 © 2026 [xuuuu-cpu](https://github.com/xuuuu-cpu)
- 二次修改 © 2026 bbbugg
