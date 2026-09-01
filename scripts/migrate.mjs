/**
 * Apply the committed SQL migrations in drizzle/ to DATABASE_URL.
 *
 * The container runs this before `next start`, so a fresh database gets its
 * schema without drizzle-kit — which is a dev dependency and needs the
 * TypeScript schema that the production image has no reason to compile.
 */
import { fileURLToPath } from "node:url";

import pg from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";

const pool = new pg.Pool({
  connectionString:
    process.env.DATABASE_URL ?? "postgresql://postgres:postgres@localhost:5432/callmode",
  max: 1,
});

await migrate(drizzle({ client: pool }), {
  // Resolved from this file, not from cwd: the container starts in /app but
  // nothing guarantees a caller does.
  migrationsFolder: fileURLToPath(new URL("../drizzle", import.meta.url)),
});

await pool.end();
