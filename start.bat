@echo off
chcp 65001 >nul
echo ============================================
echo   AI 小说创作平台 - 一键启动脚本
echo ============================================
echo.

:: Check Java
echo [1/3] 检查 Java 环境...
java -version 2>nul
if %errorlevel% neq 0 (
    echo [错误] 未找到 Java，请安装 JDK 17 或更高版本
    pause
    exit /b 1
)
for /f "tokens=3" %%i in ('java -version 2^>^&1 ^| findstr /i "version"') do set JAVA_VER=%%i
echo Java 版本: %JAVA_VER%

:: Check Maven
echo.
echo [2/3] 检查 Maven 环境...
mvn -version 2>nul
if %errorlevel% neq 0 (
    echo [警告] 未找到 Maven，将尝试使用 Maven Wrapper
)

:: Check MySQL
echo.
echo [3/3] 检查数据库...
echo 请确保 MySQL 已启动，数据库 ai_novel_writer 已创建
echo 如未创建，请执行: mysql -u root -p123456 ^< db\init.sql
echo.

:: Start Backend
echo ============================================
echo   启动后端服务 (Spring Boot)...
echo ============================================
start "AI-Novel-Backend" cmd /c "cd /d backend && mvn spring-boot:run -q"
echo 后端启动中，请等待... (端口 8080)

:: Wait a bit
timeout /t 8 /nobreak >nul

:: Install frontend deps if needed
echo.
echo ============================================
echo   启动前端服务 (Vue.js)...
echo ============================================
cd /d frontend
if not exist "node_modules" (
    echo 正在安装前端依赖...
    call npm install --legacy-peer-deps
)

start "AI-Novel-Frontend" cmd /c "cd /d frontend && npm run dev"

echo.
echo ============================================
echo   启动完成！
echo   后端: http://localhost:8080
echo   前端: http://localhost:5173
echo ============================================
echo.
echo 请访问 http://localhost:5173 开始使用
pause
