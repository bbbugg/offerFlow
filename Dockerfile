# syntax=docker/dockerfile:1.7

FROM node:22-slim AS base

WORKDIR /app

ENV NEXT_TELEMETRY_DISABLED=1

RUN apt-get update \
  && apt-get install -y --no-install-recommends ca-certificates openssl \
  && rm -rf /var/lib/apt/lists/*

FROM base AS deps

COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts

FROM base AS prisma-cli

COPY package-lock.json ./
RUN PRISMA_VERSION="$(node -p "require('./package-lock.json').packages['node_modules/prisma'].version")" \
  && mkdir -p /opt/prisma \
  && printf '{"private":true}\n' > /opt/prisma/package.json \
  && npm install --prefix /opt/prisma --no-package-lock --no-audit --no-fund "prisma@${PRISMA_VERSION}"

FROM base AS builder

COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV NODE_ENV=production
ENV DATABASE_URL=file:/app/data/dev.db
ENV JWT_SECRET=docker-build-placeholder

RUN mkdir -p /app/data \
  && cp prisma/schema.sqlite.prisma prisma/schema.prisma \
  && npx prisma generate \
  && npm run build \
  && cp -r public .next/standalone/ \
  && cp -r .next/static .next/standalone/.next/

FROM base AS runner

ENV NODE_ENV=production
ENV HOSTNAME=0.0.0.0
ENV PORT=3000
ENV DATABASE_URL=file:/app/data/dev.db
ENV PRISMA_DB_PUSH=true

COPY --from=prisma-cli /opt/prisma /opt/prisma
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/prisma/schema.prisma ./prisma/schema.prisma
COPY docker/entrypoint.sh /usr/local/bin/docker-entrypoint.sh

RUN mkdir -p /app/data /app/public/uploads \
  && chmod +x /usr/local/bin/docker-entrypoint.sh

EXPOSE 3000

ENTRYPOINT ["docker-entrypoint.sh"]
CMD ["node", "server.js"]
