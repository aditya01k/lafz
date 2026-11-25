# Self-host lafz in one container. From the repo root:
#   docker build -f docker/Dockerfile -t lafz .
#   docker run -p 3000:3000 --env-file .env.local lafz
# (Kept out of the repo root so the hosted Railway build isn't affected.)
FROM node:24-slim AS build
RUN corepack enable
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile
COPY . .
RUN pnpm build

FROM node:24-slim
RUN corepack enable
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app ./
EXPOSE 3000
CMD ["sh", "-c", "pnpm start -p ${PORT:-3000}"]
