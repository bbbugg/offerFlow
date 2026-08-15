@echo off
chcp 65001 >nul
title OfferFlow 本地部署

echo ============================================
echo   OfferFlow - 求职全流程管理工具
echo   本地部署脚本
echo ============================================
echo.

:: 1. 检查 Node.js
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [错误] 未检测到 Node.js！
    echo 请先下载安装 Node.js LTS：https://nodejs.org/
    pause
    exit /b 1
)

echo [1/5] Node.js 版本：
node -v
echo.

:: 2. 安装依赖
echo [2/5] 安装项目依赖...
call npm install
if %ERRORLEVEL% NEQ 0 (
    echo [提示] npm install 失败。如果网络超时，可尝试设置镜像源：
    echo        npm config set registry https://registry.npmmirror.com
    pause
    exit /b 1
)
echo.

:: 3. 切换到 SQLite 模式
echo [3/5] 切换到 SQLite 本地数据库...
copy /Y prisma\schema.sqlite.prisma prisma\schema.prisma >nul

echo 初始化 SQLite 数据库并生成 Prisma 客户端...
if not exist prisma\dev.db type nul > prisma\dev.db
set DATABASE_URL=file:./dev.db
call npx prisma db push
if %ERRORLEVEL% NEQ 0 (
    echo [错误] Prisma 数据库初始化失败
    pause
    exit /b 1
)
echo 本地数据库位置：%CD%\prisma\dev.db
echo.

:: 4. 初始化 .env（如不存在）
echo [4/5] 检查环境配置文件...
if not exist .env (
    if exist .env.example (
        copy .env.example .env >nul
        echo 已从 .env.example 生成 .env 文件。
    ) else (
        echo [警告] 未找到 .env.example，请手动创建 .env 文件。
    )
) else (
    echo .env 已存在，跳过。
)
echo.
echo(请打开 .env 文件，确认以下配置：
echo(  1. 将 JWT_SECRET 修改为足够长的随机字符串
echo(  2. REGISTER_ENABLED 是注册总开关，默认为 true；设为 false 时完全关闭注册
echo(  3. REGISTER_ALLOWED_USERNAMES 仅在注册开启时生效
echo(     多个用户名使用英文逗号分隔，例如 alice,bob，留空则不限制

echo.
echo [5/5] 构建生产版本...
call npm run build
if %ERRORLEVEL% NEQ 0 (
    echo [错误] 生产版本构建失败
    pause
    exit /b 1
)

echo.
echo ============================================
echo   部署完成！
echo ============================================
echo.
echo   启动命令：npm start
echo   访问地址：http://localhost:3000
echo.
echo   首次使用：
echo     1. 浏览器打开 http://localhost:3000
echo     2. 注册一个账号
echo     3. 开始管理岗位与投递进度
echo.
pause
