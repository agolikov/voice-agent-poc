# CallMode production image.
#
# Not a standalone build. src/lib/scenario/library.ts reads the curated
# templates from `process.cwd()/src/data/templates` at request time, so the
# image keeps the source tree and runs `next start`.

FROM node:24-alpine AS base
ENV PNPM_HOME=/pnpm PATH=/pnpm:$PATH NEXT_TELEMETRY_DISABLED=1
RUN corepack enable
WORKDIR /app

FROM base AS deps
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

FROM base AS build
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# `next build` imports every route module to collect page data, which
# evaluates src/lib/db/client.ts. That only constructs a connection pool —
# node-postgres connects lazily — so no database has to be reachable here.
RUN pnpm build

FROM base AS runtime
ENV NODE_ENV=production PORT=3000 HOSTNAME=0.0.0.0
# DATABASE_URL has no useful default any more: state lives in Postgres, so the
# deployment must point this at a reachable cluster. The container applies the
# migrations to it on every start.
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/.next ./.next
COPY --from=build /app/public ./public
COPY --from=build /app/src ./src
COPY --from=build /app/drizzle ./drizzle
COPY --from=build /app/scripts ./scripts
COPY --from=build /app/package.json /app/next.config.ts ./
EXPOSE 3000
# `next` directly rather than through pnpm: corepack would otherwise fetch
# pnpm from the registry on every container start, making a restart depend on
# npm being reachable.
CMD ["sh", "-c", "node scripts/migrate.mjs && exec node_modules/.bin/next start"]
