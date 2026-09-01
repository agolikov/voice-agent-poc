import { NextResponse, type NextRequest } from "next/server";

import { decideAccess, visitorOrigin } from "~/lib/auth/decide";
import { accessCookie, accessCookieName, readPasscode } from "~/lib/auth/gate";

const redirectTo = (location: string, request: NextRequest): NextResponse => {
  const origin =
    visitorOrigin({
      forwardedHost: request.headers.get("x-forwarded-host"),
      host: request.headers.get("host"),
      forwardedProto: request.headers.get("x-forwarded-proto"),
      fallbackProtocol: request.nextUrl.protocol,
    }) ?? request.nextUrl.origin;
  return NextResponse.redirect(new URL(location, origin));
};

/**
 * The site-wide access gate. See src/lib/auth/gate.ts for what it is and is
 * not; the decision itself lives in src/lib/auth/decide.ts so it can be tested
 * without a request.
 */
export const proxy = (request: NextRequest): NextResponse => {
  const passcode = readPasscode();
  if (!passcode) return NextResponse.next();

  const nowSeconds = Math.floor(Date.now() / 1000);
  const decision = decideAccess({
    pathname: request.nextUrl.pathname,
    searchParams: request.nextUrl.searchParams,
    cookie: request.cookies.get(accessCookieName)?.value,
    passcode,
    nowSeconds,
  });

  switch (decision.action) {
    case "unlock": {
      const response = redirectTo(decision.redirectTo, request);
      response.cookies.set(accessCookie(passcode, nowSeconds));
      return response;
    }
    case "challenge":
      return redirectTo(decision.redirectTo, request);
    case "refuse":
      return NextResponse.json({ error: "locked" }, { status: 401 });
    case "allow":
      return NextResponse.next();
  }
};

export const config = {
  // Without a matcher the gate would also run on every stylesheet, script and
  // image, so a locked-out visitor would be redirected instead of being served
  // the assets the gate page itself needs. `_vercel` is where Vercel Web
  // Analytics fetches its script and posts its page views: gating those would
  // silently drop the traffic of anyone still looking at the unlock page.
  matcher: [
    "/((?!_next/static|_next/image|_vercel|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff|woff2|ttf)$).*)",
  ],
};
