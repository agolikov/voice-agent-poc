import { createHmac } from "node:crypto";

import { describe, expect, it } from "vitest";

import { SIGNATURE_TOLERANCE_SECONDS, verifyWebhookSignature } from "~/lib/webhook/verify";

const secret = "wsec_a_secret_long_enough_to_be_real";
const body = JSON.stringify({ type: "post_call_transcription", data: { conversation_id: "c1" } });
const now = 1_770_000_000;

const sign = (timestamp: number, payload = body, key = secret) =>
  `t=${timestamp},v0=${createHmac("sha256", key).update(`${timestamp}.${payload}`).digest("hex")}`;

describe("post-call webhook signatures", () => {
  it("accepts a delivery signed with the right secret", () => {
    expect(verifyWebhookSignature(body, sign(now), secret, now)).toEqual({
      ok: true,
      timestamp: now,
    });
  });

  it("rejects a body that was tampered with after signing", () => {
    const header = sign(now);
    const tampered = body.replace("c1", "c2");
    expect(verifyWebhookSignature(tampered, header, secret, now)).toEqual({
      ok: false,
      reason: "mismatch",
    });
  });

  it("rejects a signature made with a different secret", () => {
    const header = sign(now, body, "wsec_someone_elses_secret_value");
    expect(verifyWebhookSignature(body, header, secret, now)).toEqual({
      ok: false,
      reason: "mismatch",
    });
  });

  it("rejects a verbatim replay of an old delivery", () => {
    const old = now - SIGNATURE_TOLERANCE_SECONDS - 1;
    expect(verifyWebhookSignature(body, sign(old), secret, now)).toEqual({
      ok: false,
      reason: "stale",
    });
  });

  it("accepts a delivery that is merely slow", () => {
    const late = now - SIGNATURE_TOLERANCE_SECONDS + 60;
    expect(verifyWebhookSignature(body, sign(late), secret, now).ok).toBe(true);
  });

  it("rejects a missing or malformed header rather than throwing", () => {
    for (const header of [null, "", "v0=abc", "t=notanumber,v0=abc", "garbage"]) {
      expect(verifyWebhookSignature(body, header, secret, now)).toEqual({
        ok: false,
        reason: "malformed",
      });
    }
  });

  it("rejects a hex signature of the wrong length without throwing", () => {
    expect(verifyWebhookSignature(body, `t=${now},v0=ab`, secret, now)).toEqual({
      ok: false,
      reason: "mismatch",
    });
  });
});
