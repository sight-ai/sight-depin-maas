FROM --platform=linux/amd64 node:20.18.3

# 安装必要的系统依赖
RUN apt-get update && apt-get install -y \
    curl \
    sqlite3 \
    && rm -rf /var/lib/apt/lists/*

# 设置工作目录
WORKDIR /app

# 复制环境配置文件
COPY .env /app/

# 复制构建后的应用程序
COPY ./dist/packages/ /app/dist/packages/

# 安装 Node.js 依赖
WORKDIR /app/dist/packages/
RUN npm i --legacy-peer-deps

# 复制并设置 CLI 包装脚本
COPY sight-cli.sh /usr/local/bin/sight
RUN chmod +x /usr/local/bin/sight

# 创建启动脚本
COPY docker-entrypoint.sh /app/
RUN chmod +x /app/docker-entrypoint.sh

# 设置环境变量
ENV OLLAMA_API_URL="http://host.docker.internal:11434/"
ENV NODE_PATH="/app/dist/packages"
ENV SIGHTAI_DATA_DIR="/data"

# 创建数据目录
RUN mkdir -p /data

# 暴露端口
EXPOSE 8716

# 设置数据卷
VOLUME ["/data"]

# 使用自定义入口点
ENTRYPOINT ["/app/docker-entrypoint.sh"]

# 默认启动后端服务
CMD ["start"]



