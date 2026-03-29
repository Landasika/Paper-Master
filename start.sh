#!/bin/bash

# Paper-Master 启动脚本

echo "🚀 启动 Paper-Master 项目..."

# 检查是否有正在运行的服务
if [ -f .dev-server.pid ]; then
    OLD_PID=$(cat .dev-server.pid)
    if ps -p $OLD_PID > /dev/null 2>&1; then
        echo "⚠️  检测到正在运行的开发服务器 (PID: $OLD_PID)"
        echo "🛑 停止旧服务..."
        kill $OLD_PID 2>/dev/null
        sleep 1
    fi
    rm -f .dev-server.pid
fi

# 检查后端服务器是否在运行
if lsof -Pi :3001 -sTCP:LISTEN -t >/dev/null 2>&1; then
    echo "⚠️  检测到后端服务器正在运行 (端口 3001)"
    BACKEND_PID=$(lsof -Pi :3001 -sTCP:LISTEN -t)
    echo "🛑 停止后端服务..."
    kill $BACKEND_PID 2>/dev/null
    sleep 1
fi

# 清空日志文件
> .dev-server.log
> .backend-server.log

# 启动后端服务器
echo "📡 启动后端服务器 (端口 3001)..."
node simple-server.cjs > .backend-server.log 2>&1 &
BACKEND_PID=$!
echo "✅ 后端服务器已启动 (PID: $BACKEND_PID)"

# 等待后端启动
sleep 2

# 检查后端是否成功启动
if ! ps -p $BACKEND_PID > /dev/null; then
    echo "❌ 后端服务器启动失败！"
    echo "查看日志: tail -f .backend-server.log"
    exit 1
fi

# 启动前端开发服务器
echo "🌐 启动前端开发服务器 (端口 8000)..."
npm run dev > .dev-server.log 2>&1 &
DEV_PID=$!
echo $DEV_PID > .dev-server.pid
echo "✅ 前端服务器已启动 (PID: $DEV_PID)"

# 等待前端启动
sleep 3

# 检查前端是否成功启动
if ! ps -p $DEV_PID > /dev/null; then
    echo "❌ 前端服务器启动失败！"
    echo "查看日志: tail -f .dev-server.log"
    exit 1
fi

echo ""
echo "╔════════════════════════════════════════════════════════════╗"
echo "║          🎉 Paper-Master 启动成功！                        ║"
echo "╠══════════════════════════════════════════════════════════════╣"
echo "║  📱 前端地址:  http://localhost:8000                        ║"
echo "║  🔌 后端API:  http://localhost:3001/api                     ║"
echo "║  💚 健康检查:  http://localhost:3001/api/health             ║"
echo "║                                                            ║"
echo "║  📋 前端日志:  tail -f .dev-server.log                     ║"
echo "║  📋 后端日志:  tail -f .backend-server.log                 ║"
echo "║                                                            ║"
echo "║  🛑 停止服务:  ./stop.sh                                    ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""
