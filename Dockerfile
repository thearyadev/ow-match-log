FROM node:22-alpine AS builder

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable


WORKDIR /build
COPY . .

RUN pnpm install
RUN pnpm run build

FROM node:22-slim AS runner
COPY --from=ghcr.io/astral-sh/uv:0.6.9 /uv /uvx /bin/
WORKDIR /app

COPY ./ocr ./ocr
RUN cd ocr && uv sync
RUN apt update && apt install -y libgomp1 libglib2.0-0 libgl1
RUN cd ocr && uv run main.py none init

RUN mkdir /data

COPY --from=builder /build/drizzle ./drizzle
COPY --from=builder /build/.output ./.output
expose 3000


ENTRYPOINT ["node", ".output/server/index.mjs"]

