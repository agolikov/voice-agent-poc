#!/usr/bin/env node
/**
 * Copy an existing SQLite practice database into DATABASE_URL (Postgres).
 *
 * A one-way import for the move off the file database: run the migrations
 * first, then this. It is idempotent — every row is inserted with
 * `on conflict do nothing` — so a partial run can simply be repeated.
 *
 *   node scripts/import-sqlite.mjs path/to/practice.db
 *
 * The path is required: the file database has no home in this repository any
 * more. The last committed copy can be recovered with
 * `git show 6569ddd:data/practice.db > practice.db`.
 *
 * Reading uses node:sqlite so nothing has to be installed for a migration
 * that is only performed once.
 */
import { DatabaseSync } from "node:sqlite";

import pg from "pg";

const source = process.argv[2];
if (!source) {
  console.error("Usage: node scripts/import-sqlite.mjs path/to/practice.db");
  process.exit(1);
}

const sqlite = new DatabaseSync(source, { readOnly: true });
const pool = new pg.Pool({
  connectionString:
    process.env.DATABASE_URL ?? "postgresql://postgres:postgres@localhost:5432/callmode",
  max: 1,
});

/** SQLite stored these as JSON text and Postgres wants a jsonb value. */
const json = (value) => (value === null || value === undefined ? null : String(value));

/** SQLite stored these as unix seconds and Postgres wants a timestamptz. */
const instant = (value) => (value === null || value === undefined ? null : new Date(value * 1000));

const tables = [
  {
    name: "scenario",
    columns: [
      "id",
      "realization_key",
      "template_slug",
      "source",
      "target_language",
      "cefr_level",
      "title",
      "payload",
      "created_at",
    ],
    conflict: "id",
    map: (row) => [
      row.id,
      row.realization_key,
      row.template_slug,
      row.source,
      row.target_language,
      row.cefr_level,
      row.title,
      json(row.payload),
      instant(row.created_at),
    ],
  },
  {
    name: "template",
    columns: ["slug", "title", "payload", "created_at"],
    conflict: "slug",
    map: (row) => [row.slug, row.title, json(row.payload), instant(row.created_at)],
  },
  {
    name: "session",
    columns: [
      "id",
      "scenario_id",
      "settings",
      "conversation_id",
      "started_at",
      "ended_at",
      "outcome",
      "summary",
      "analysis",
      "transcript",
    ],
    conflict: "id",
    map: (row) => [
      row.id,
      row.scenario_id,
      json(row.settings),
      row.conversation_id,
      instant(row.started_at),
      instant(row.ended_at),
      row.outcome,
      row.summary,
      json(row.analysis),
      json(row.transcript),
    ],
  },
  {
    name: "attempt",
    columns: [
      "id",
      "session_id",
      "beat_id",
      "kind",
      "heard",
      "expected",
      "verdict",
      "correction",
      "category",
      "score",
      "created_at",
    ],
    conflict: "id",
    map: (row) => [
      row.id,
      row.session_id,
      row.beat_id,
      row.kind,
      row.heard,
      row.expected,
      row.verdict,
      row.correction,
      row.category,
      row.score,
      instant(row.created_at),
    ],
  },
  {
    name: "message",
    columns: [
      "id",
      "session_id",
      "event_id",
      "role",
      "body",
      "recommended_terms",
      "agent_response_ms",
      "model_response_ms",
      "model_name",
      "created_at",
    ],
    conflict: "id",
    map: (row) => [
      row.id,
      row.session_id,
      row.event_id,
      row.role,
      row.body,
      json(row.recommended_terms) ?? "[]",
      row.agent_response_ms,
      row.model_response_ms,
      row.model_name,
      instant(row.created_at),
    ],
  },
];

const client = await pool.connect();
try {
  await client.query("begin");

  for (const table of tables) {
    // Ordered by insertion so a foreign-key-free copy still reads naturally.
    const rows = sqlite.prepare(`select * from ${table.name}`).all();
    const placeholders = table.columns.map((_, index) => `$${index + 1}`).join(", ");
    const statement = `insert into "${table.name}" (${table.columns.map((c) => `"${c}"`).join(", ")})
                       values (${placeholders})
                       on conflict ("${table.conflict}") do nothing`;

    let copied = 0;
    for (const row of rows) {
      const result = await client.query(statement, table.map(row));
      copied += result.rowCount;
    }
    console.log(
      `${table.name}: ${copied} copied` +
        (copied === rows.length ? "" : `, ${rows.length - copied} already present`),
    );
  }

  await client.query("commit");
} catch (error) {
  await client.query("rollback");
  throw error;
} finally {
  client.release();
  await pool.end();
  sqlite.close();
}

console.log(`Imported ${source}.`);
