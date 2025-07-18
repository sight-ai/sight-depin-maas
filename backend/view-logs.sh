#!/bin/bash

# SightAI Desktop 日志查看脚本
LOG_DIR="/Users/hej/Library/Application Support/@saito-miner/sightai/logs"
TODAY=$(date +%Y-%m-%d)
LOG_FILE="$LOG_DIR/sightai-$TODAY.log"

echo "=== SightAI Desktop 日志查看器 ==="
echo "日志目录: $LOG_DIR"
echo "当前日志文件: $LOG_FILE"
echo ""

if [ ! -f "$LOG_FILE" ]; then
    echo "❌ 今天的日志文件不存在: $LOG_FILE"
    echo "可用的日志文件:"
    ls -la "$LOG_DIR"
    exit 1
fi

echo "📊 日志文件信息:"
ls -lh "$LOG_FILE"
echo ""

echo "📋 最新的20条日志:"
echo "----------------------------------------"
tail -20 "$LOG_FILE"
echo "----------------------------------------"
echo ""

echo "🔄 实时监控日志 (按 Ctrl+C 退出):"
echo "----------------------------------------"
tail -f "$LOG_FILE"
