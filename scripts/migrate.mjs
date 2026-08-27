/**
 * Apply the committed SQL migrations in drizzle/ to DATABASE_URL.
 *
 * The container runs this before `next start`, so a fresh volume gets its
 * schema without drizzle-kit — which is a dev dependency and needs the
 * TypeScript schema that the production image has no reason to compile.
 */
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { migrate } from "drizzle-orm/libsql/migrator";

const url = process.env.DATABASE_URL ?? "file:./data/practice.db";

// A `file:` URL points somewhere the volume owns in production and at an
// untracked directory on a fresh checkout. Only the local form has a parent
// this process is responsible for.
if (url.startsWith("file:")) {
  mkdirSync(dirname(url.slice("file:".length)), { recursive: true });
}

const client = createClient({ url });
await migrate(drizzle({ client }), {
  // Resolved from this file, not from cwd: the container starts in /app but
  // nothing guarantees a caller does.
  migrationsFolder: fileURLToPath(new URL("../drizzle", import.meta.url)),
});
client.close();
