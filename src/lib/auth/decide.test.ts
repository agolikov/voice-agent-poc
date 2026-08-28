import { describe, expect, it } from "vitest";

import { decideAccess, safeNextPath, visitorOrigin } from "~/lib/auth/decide";
import { mintAccessToken } from "~/lib/auth/gate";

const passcode = "let-me-in-please";
const now = 1_770_000_000;
const token = mintAccessToken(passcode, now);

const decide = (
  pathname: string,
  options: { search?: string; cookie?: string; passcode?: string | null } = {},
) =>
  decideAccess({
    pathname,
    searchParams: new URLSearchParams(options.search ?? ""),
    cookie: options.cookie,
    passcode: options.passcode === undefined ? passcode : options.passcode,
    nowSeconds: now,
  });

describe("the gate when no passcode is configured", () => {
  it("lets everything through", () => {
    expect(decide("/", { passcode: null })).toEqual({ action: "allow" });
    expect(decide("/api/sessions", { passcode: null })).toEqual({ action: "allow" });
  });
});

describe("the gate when a passcode is configured", () => {
  it("challenges a page request with no cookie and remembers where it was headed", () => {
    expect(decide("/practice/abc", { search: "step=2" })).toEqual({
      action: "challenge",
      redirectTo: `/unlock?next=${encodeURIComponent("/practice/abc?step=2")}`,
    });
  });

  it("refuses an API request outright rather than redirecting it", () => {
    expect(decide("/api/sessions")).toEqual({ action: "refuse" });
  });

  it("allows a request carrying a valid cookie", () => {
    expect(decide("/history", { cookie: token })).toEqual({ action: "allow" });
  });

  it("challenges a request whose cookie is expired or forged", () => {
    expect(decide("/history", { cookie: `${now - 1}.deadbeef` }).action).toBe("challenge");
    expect(decide("/history", { cookie: mintAccessToken("other", now) }).action).toBe("challenge");
  });

  it("keeps the liveness probe and the HMAC-verified webhook public", () => {
    expect(decide("/api/health")).toEqual({ action: "allow" });
    expect(decide("/api/elevenlabs/webhook")).toEqual({ action: "allow" });
  });

  it("keeps the gate itself reachable", () => {
    expect(decide("/unlock")).toEqual({ action: "allow" });
    expect(decide("/api/unlock")).toEqual({ action: "allow" });
  });

  it("unlocks on a correct ?key= and strips it from the URL", () => {
    expect(decide("/practice/abc", { search: `key=${passcode}&step=2` })).toEqual({
      action: "unlock",
      redirectTo: "/practice/abc?step=2",
    });
    expect(decide("/", { search: `key=${passcode}` })).toEqual({
      action: "unlock",
      redirectTo: "/",
    });
  });

  it("does not unlock on a wrong ?key=, and does not echo it back", () => {
    expect(decide("/", { search: "key=guess" })).toEqual({
      action: "challenge",
      redirectTo: `/unlock?next=${encodeURIComponent("/")}`,
    });
  });
});

describe("the post-unlock destination", () => {
  it("keeps a path on this site", () => {
    expect(safeNextPath("/history")).toBe("/history");
    expect(safeNextPath("/practice/abc?step=2")).toBe("/practice/abc?step=2");
  });

  it("discards anything that could leave the site", () => {
    expect(safeNextPath("//evil.example.com")).toBe("/");
    expect(safeNextPath("https://evil.example.com")).toBe("/");
    expect(safeNextPath("javascript:alert(1)")).toBe("/");
    expect(safeNextPath(null)).toBe("/");
    expect(safeNextPath(undefined)).toBe("/");
  });
});

describe("the origin a redirect should point at", () => {
  const origin = (
    forwardedHost: string | null,
    host: string | null,
    forwardedProto: string | null = null,
  ) => visitorOrigin({ forwardedHost, host, forwardedProto, fallbackProtocol: "http:" });

  it("uses the host the visitor reached, when no proxy spoke", () => {
    expect(origin(null, "callmode.192.168.1.105.sslip.io")).toBe(
      "http://callmode.192.168.1.105.sslip.io",
    );
  });

  it("prefers the forwarded host, so a tunnelled visitor is not sent to the LAN name", () => {
    expect(origin("demo.trycloudflare.com", "internal.lan", "https")).toBe(
      "https://demo.trycloudflare.com",
    );
  });

  it("takes the first hop when a request crossed several proxies", () => {
    expect(origin("demo.trycloudflare.com", "internal.lan", "https, http")).toBe(
      "https://demo.trycloudflare.com",
    );
  });

  it("falls back to the request's own protocol when none was forwarded", () => {
    expect(origin("demo.trycloudflare.com", "internal.lan", null)).toBe(
      "http://demo.trycloudflare.com",
    );
  });

  it("gives up rather than guessing when there is no host at all", () => {
    expect(origin(null, null)).toBeNull();
  });
});
