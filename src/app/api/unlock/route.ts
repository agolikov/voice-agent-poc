import { NextResponse } from "next/server";

import { safeNextPath } from "~/lib/auth/decide";
import { accessCookie, isPasscodeCorrect, readPasscode } from "~/lib/auth/gate";

export const dynamic = "force-dynamic";

const maxAttempts = 10;
const windowMs = 10 * 60 * 1000;

/**
 * A shared passcode is only as strong as the number of guesses allowed against
 * it, so attempts are throttled per client. In memory and per instance, which
 * is enough for a single-container demo and would need shared state if this
 * were ever run behind more than one.
 */
const attempts = new Map<string, { count: number; resetAt: number }>();

const clientKey = (request: Request): string =>
  request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
  request.headers.get("x-real-ip") ||
  "unknown";

const withinLimit = (key: string, now: number): boolean => {
  const record = attempts.get(key);
  if (!record || record.resetAt <= now) {
    attempts.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  record.count += 1;
  return record.count <= maxAttempts;
};

export const POST = async (request: Request): Promise<NextResponse> => {
  const passcode = readPasscode();
  const body = (await request.json().catch(() => null)) as {
    passcode?: unknown;
    next?: unknown;
  } | null;
  const redirectTo = safeNextPath(typeof body?.next === "string" ? body.next : null);

  // No passcode configured means the gate is off and nothing here is locked.
  if (!passcode) return NextResponse.json({ redirectTo });

  const now = Date.now();
  if (!withinLimit(clientKey(request), now)) {
    return NextResponse.json({ error: "throttled" }, { status: 429 });
  }

  const candidate = typeof body?.passcode === "string" ? body.passcode.trim() : "";
  if (!candidate || !isPasscodeCorrect(candidate, passcode)) {
    return NextResponse.json({ error: "invalid" }, { status: 401 });
  }

  const response = NextResponse.json({ redirectTo });
  response.cookies.set(accessCookie(passcode, Math.floor(now / 1000)));
  return response;
};
