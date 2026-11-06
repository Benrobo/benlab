FROM oven/bun:1.3

WORKDIR /app

COPY package.json bun.lock ./
RUN bun install --production --frozen-lockfile

COPY config.ts ./
COPY engine ./engine

EXPOSE 5200

CMD ["bun", "engine/main.ts"]
