import { createHash, createHmac, timingSafeEqual } from "node:crypto";

/**
 * One shared passcode in front of the whole site.
 *
 * This is deliberately not an account system. The demo is shown to people who
 * should not have to sign up, and every visitor is the same anonymous user.
 * What the gate buys is that a crawler, a scanner, or someone who guessed the
 * hostname cannot reach the app — nor, more expensively, spend the ElevenLabs
 * voice minutes and model tokens it holds credentials for.
 *
 * Leaving SITE_PASSCODE unset leaves the site open, which is what local
 * development wants: the gate is switched on by configuring it, not off by
 * remembering to.
 */
export const accessCookieName = "callmode-access";

/** Query parameter that unlocks in one click, for a link you can hand out. */
export const accessKeyParam = "key";

export const accessMaxAgeSeconds = 30 * 24 * 60 * 60;

const tokenVersion = "v1";

export const readPasscode = (
  env: Record<string, string | undefined> = process.env,
): string | null => {
  const value = env.SITE_PASSCODE?.trim();
  return value ? value : null;
};

const sign = (passcode: string, expiresAt: number): string =>
  createHmac("sha256", passcode).update(`${tokenVersion}.${expiresAt}`).digest("hex");

/**
 * The token carries its own expiry inside the signed payload. The cookie's
 * Max-Age already stops a well-behaved browser, but a value copied out of one
 * would otherwise stay valid forever.
 *
 * Keying the HMAC on the passcode itself means changing SITE_PASSCODE
 * invalidates every token already issued — rotating the code really does lock
 * everyone out, rather than only stopping new arrivals.
 */
export const mintAccessToken = (passcode: string, nowSeconds: number): string => {
  const expiresAt = nowSeconds + accessMaxAgeSeconds;
  return `${expiresAt}.${sign(passcode, expiresAt)}`;
};

export const isAccessTokenValid = (
  token: string | undefined,
  passcode: string,
  nowSeconds: number,
): boolean => {
  if (!token) return false;

  const separator = token.indexOf(".");
  if (separator === -1) return false;

  const expiresAt = Number(token.slice(0, separator));
  const provided = token.slice(separator + 1);
  if (!Number.isSafeInteger(expiresAt) || expiresAt <= nowSeconds) return false;

  const expected = sign(passcode, expiresAt);
  const providedBuffer = Buffer.from(provided, "hex");
  const expectedBuffer = Buffer.from(expected, "hex");
  return (
    providedBuffer.length === expectedBuffer.length && timingSafeEqual(providedBuffer, expectedBuffer)
  );
};

/**
 * Hashed before comparison so `timingSafeEqual` always gets equal-length
 * buffers, whatever was typed, and so the time taken cannot leak how long the
 * real passcode is.
 */
export const isPasscodeCorrect = (candidate: string, passcode: string): boolean =>
  timingSafeEqual(
    createHash("sha256").update(candidate).digest(),
    createHash("sha256").update(passcode).digest(),
  );

/** Shaped for `NextResponse.cookies.set`. */
export const accessCookie = (passcode: string, nowSeconds: number) => ({
  name: accessCookieName,
  value: mintAccessToken(passcode, nowSeconds),
  httpOnly: true,
  sameSite: "lax" as const,
  path: "/",
  maxAge: accessMaxAgeSeconds,
  // Browsers treat localhost as a secure origin, so this stays correct for a
  // production build run locally over http.
  secure: process.env.NODE_ENV === "production",
});
