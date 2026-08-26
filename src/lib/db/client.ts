import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";

import * as schema from "~/lib/db/schema";

const url = process.env.DATABASE_URL ?? "file:./data/practice.db";

export const db = drizzle({
  client: createClient({ url }),
  schema,
  casing: "snake_case",
});

export { schema };
