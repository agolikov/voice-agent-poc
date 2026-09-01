import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";

import * as schema from "~/lib/db/schema";

/**
 * The default points at a local Postgres so a fresh checkout and `next build`
 * — which evaluates every route module, and therefore this one — work without
 * an environment. Deployments set DATABASE_URL to the real cluster.
 */
export const databaseUrl =
  process.env.DATABASE_URL ?? "postgresql://postgres:postgres@localhost:5432/callmode";

/**
 * `next dev` re-evaluates this module on every hot reload. A pool held only in
 * module scope would be replaced without being drained, and each generation
 * would keep its sockets open until the server's connection limit refused the
 * next one — so the pool is parked on globalThis and reused.
 */
const globalForDb = globalThis as typeof globalThis & { callmodePool?: Pool };

const pool =
  globalForDb.callmodePool ??
  new Pool({
    connectionString: databaseUrl,
    // Small on purpose: several Next.js server instances may share one
    // database, and pooled providers count every socket against the plan.
    max: Number(process.env.DATABASE_POOL_MAX ?? 5),
  });

if (process.env.NODE_ENV !== "production") globalForDb.callmodePool = pool;

export const db = drizzle({ client: pool, schema, casing: "snake_case" });

export { schema };
