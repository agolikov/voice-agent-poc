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
# evaluates src/lib/db/client.ts and opens DATABASE_URL. The default is a file
# under data/, which .dockerignore keeps out of the context. The throwaway
# database this creates stays in this stage; the runtime stage makes its own.
RUN mkdir -p data && pnpm build

FROM base AS runtime
ENV NODE_ENV=production PORT=3000 HOSTNAME=0.0.0.0
# The volume mount point. Overridable, but the image is useless without a
# writable default.
ENV DATABASE_URL=file:/app/data/practice.db
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/.next ./.next
COPY --from=build /app/public ./public
COPY --from=build /app/src ./src
COPY --from=build /app/drizzle ./drizzle
COPY --from=build /app/scripts ./scripts
COPY --from=build /app/package.json /app/next.config.ts ./
RUN mkdir -p /app/data
EXPOSE 3000
# `next` directly rather than through pnpm: corepack would otherwise fetch
# pnpm from the registry on every container start, making a restart depend on
# npm being reachable.
CMD ["sh", "-c", "node scripts/migrate.mjs && exec node_modules/.bin/next start"]
