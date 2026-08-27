/**
 * Unauthenticated liveness probe for the container platform.
 *
 * Deliberately does not touch the database: a health check that fails on a
 * slow query restarts a server that was answering requests perfectly well.
 */
export const dynamic = "force-dynamic";

export const GET = () => Response.json({ status: "ok" });
