import { describe, expect, it } from "vitest";

import {
  accessMaxAgeSeconds,
  isAccessTokenValid,
  isPasscodeCorrect,
  mintAccessToken,
  readPasscode,
} from "~/lib/auth/gate";

const passcode = "let-me-in-please";
const now = 1_770_000_000;

describe("site passcode", () => {
  it("is off when SITE_PASSCODE is unset or blank", () => {
    expect(readPasscode({})).toBeNull();
    expect(readPasscode({ SITE_PASSCODE: "   " })).toBeNull();
  });

  it("trims the configured value", () => {
    expect(readPasscode({ SITE_PASSCODE: " hunter2 \n" })).toBe("hunter2");
  });

  it("accepts the right code and rejects a wrong one of any length", () => {
    expect(isPasscodeCorrect(passcode, passcode)).toBe(true);
    expect(isPasscodeCorrect("nope", passcode)).toBe(false);
    expect(isPasscodeCorrect(`${passcode} `, passcode)).toBe(false);
    expect(isPasscodeCorrect("", passcode)).toBe(false);
  });
});

describe("access tokens", () => {
  it("accepts a token it just minted", () => {
    expect(isAccessTokenValid(mintAccessToken(passcode, now), passcode, now)).toBe(true);
  });

  it("rejects a missing or malformed token", () => {
    expect(isAccessTokenValid(undefined, passcode, now)).toBe(false);
    expect(isAccessTokenValid("", passcode, now)).toBe(false);
    expect(isAccessTokenValid("no-separator", passcode, now)).toBe(false);
    expect(isAccessTokenValid("abc.def", passcode, now)).toBe(false);
  });

  it("rejects a token signed with a different passcode, so rotating locks everyone out", () => {
    const token = mintAccessToken(passcode, now);
    expect(isAccessTokenValid(token, "a-new-code", now)).toBe(false);
  });

  it("rejects a token past its embedded expiry even if the cookie survived", () => {
    const token = mintAccessToken(passcode, now);
    expect(isAccessTokenValid(token, passcode, now + accessMaxAgeSeconds - 1)).toBe(true);
    expect(isAccessTokenValid(token, passcode, now + accessMaxAgeSeconds + 1)).toBe(false);
  });

  it("rejects an expiry moved forward without a matching signature", () => {
    const token = mintAccessToken(passcode, now);
    const forged = `${now + accessMaxAgeSeconds * 10}.${token.split(".")[1]}`;
    expect(isAccessTokenValid(forged, passcode, now)).toBe(false);
  });
});
