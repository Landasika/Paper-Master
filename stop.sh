#!/bin/bash

# Paper-Master 停止脚本

echo "🛑 停止 Paper-Master 服务..."

# 停止前端开发服务器
if [ -f .dev-server.pid ]; then
    DEV_PID=$(cat .dev-server.pid)
    if ps -p $DEV_PID > /dev/null 2>&1; then
        echo "🌐 停止前端服务器 (PID: $DEV_PID)..."
        kill $DEV_PID 2>/dev/null
        sleep 1
        if ps -p $DEV_PID > /dev/null 2>&1; then
            echo "⚠️  强制停止前端服务器..."
            kill -9 $DEV_PID 2>/dev/null
        fi
    fi
    rm -f .dev-server.pid
fi

# 停止后端服务器
if lsof -Pi :3001 -sTCP:LISTEN -t >/dev/null 2>&1; then
    BACKEND_PID=$(lsof -Pi :3001 -sTCP:LISTEN -t)
    echo "📡 停止后端服务器 (PID: $BACKEND_PID)..."
    kill $BACKEND_PID 2>/dev/null
    sleep 1
    if lsof -Pi :3001 -sTCP:LISTEN -t >/dev/null 2>&1; then
        echo "⚠️  强制停止后端服务器..."
        kill -9 $BACKEND_PID 2>/dev/null
    fi
fi

# 清理临时文件
rm -f .dev-server.pid

echo "✅ 所有服务已停止"
