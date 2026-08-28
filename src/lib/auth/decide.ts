import { accessKeyParam, isAccessTokenValid, isPasscodeCorrect } from "~/lib/auth/gate";

/**
 * Paths that have to answer before the gate does.
 *
 * `/api/health` is the container platform's liveness probe, which carries no
 * cookie and would restart a perfectly healthy server on a 401.
 * `/api/elevenlabs/webhook` is called by ElevenLabs, which has no cookie
 * either; it authenticates every delivery by HMAC instead, so putting the
 * passcode in front of it would add nothing and break post-call analysis.
 */
const publicPaths = new Set(["/api/health", "/api/elevenlabs/webhook", "/unlock", "/api/unlock"]);

export type GateDecision =
  /** Let the request through untouched. */
  | { action: "allow" }
  /** Correct `?key=`: issue the cookie and bounce to the same URL without it. */
  | { action: "unlock"; redirectTo: string }
  /** A page request with no valid cookie: send the visitor to the gate. */
  | { action: "challenge"; redirectTo: string }
  /** An API request with no valid cookie: 401, no redirect to follow. */
  | { action: "refuse" };

export const decideAccess = (input: {
  pathname: string;
  searchParams: URLSearchParams;
  cookie: string | undefined;
  passcode: string | null;
  nowSeconds: number;
}): GateDecision => {
  const { pathname, searchParams, cookie, passcode, nowSeconds } = input;

  if (!passcode) return { action: "allow" };
  if (publicPaths.has(pathname)) return { action: "allow" };

  // Dropped whether or not it was right, so neither a working passcode nor a
  // near-miss survives into the address bar, the browser history, the Referer
  // header of everything the page then loads, or the `next` round-trip below.
  // A correct one still passed through this server's access log once, which is
  // what a link you can hand out costs.
  const rest = new URLSearchParams(searchParams);
  rest.delete(accessKeyParam);
  const query = rest.toString();
  const target = query ? `${pathname}?${query}` : pathname;

  const key = searchParams.get(accessKeyParam);
  if (key !== null && isPasscodeCorrect(key, passcode)) {
    return { action: "unlock", redirectTo: target };
  }

  if (isAccessTokenValid(cookie, passcode, nowSeconds)) return { action: "allow" };

  if (pathname.startsWith("/api/")) return { action: "refuse" };

  return { action: "challenge", redirectTo: `/unlock?next=${encodeURIComponent(target)}` };
};

/**
 * Where to land after unlocking. Anything that is not a path on this site is
 * discarded, so `?next=` cannot be used to turn the gate into an open
 * redirect — including the `//host` form, which browsers read as absolute.
 */
export const safeNextPath = (value: string | null | undefined): string =>
  typeof value === "string" && value.startsWith("/") && !value.startsWith("//") ? value : "/";

/**
 * The origin the visitor actually typed, which is not always the one this
 * server was reached on.
 *
 * A redirect has to be absolute — Next rejects a relative `Location` — and the
 * app is served on more than one hostname: the LAN route through Traefik and
 * whatever public tunnel fronts it. Building the URL from the request's own
 * origin would bounce a public visitor to an internal hostname they cannot
 * resolve, so a proxy's forwarded headers win when it set them.
 */
export const visitorOrigin = (input: {
  forwardedHost: string | null;
  host: string | null;
  forwardedProto: string | null;
  fallbackProtocol: string;
}): string | null => {
  const host = input.forwardedHost ?? input.host;
  if (!host) return null;
  // A request that crossed several proxies carries a list; the first entry is
  // the one the visitor spoke.
  const proto = input.forwardedProto?.split(",")[0]?.trim();
  return `${proto || input.fallbackProtocol.replace(":", "")}://${host}`;
};
