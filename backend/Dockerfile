FROM --platform=linux/amd64 node:20.18.3

RUN apt-get install -y \
    curl \
    && rm -rf /var/lib/apt/lists/*

RUN curl -fsSL https://ollama.com/install.sh | sh
RUN apt-get update && apt-get install -y supervisor

COPY supervisord.conf /etc/supervisor/conf.d/supervisord.conf

EXPOSE 8716

WORKDIR /dist/packages/
COPY ./dist/packages/ . 

WORKDIR /dist/packages/apps/api-server

RUN npm cache clean --force
RUN npm i
RUN ollama serve & \
    sleep 5 && \
    ollama pull deepseek-r1:7b


CMD ["/usr/bin/supervisord", "-c", "/etc/supervisor/conf.d/supervisord.conf"]




