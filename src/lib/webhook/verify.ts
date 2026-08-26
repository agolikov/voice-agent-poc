import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * ElevenLabs signs post-call webhooks with an `ElevenLabs-Signature` header of
 * the form `t=<unix seconds>,v0=<hex hmac>`, where the HMAC is taken over
 * `<timestamp>.<raw body>`.
 *
 * The timestamp is part of the signed payload, so an attacker cannot replay an
 * old delivery under a fresh timestamp — but they can replay it verbatim, which
 * is why deliveries older than the tolerance are rejected outright.
 */
export const SIGNATURE_TOLERANCE_SECONDS = 30 * 60;

export type VerifyResult =
  | { ok: true; timestamp: number }
  | { ok: false; reason: "malformed" | "mismatch" | "stale" };

export const verifyWebhookSignature = (
  rawBody: string,
  header: string | null,
  secret: string,
  nowSeconds: number,
): VerifyResult => {
  if (!header) return { ok: false, reason: "malformed" };

  const parts = new Map(
    header.split(",").map((part): [string, string] => {
      const index = part.indexOf("=");
      return index === -1
        ? [part.trim(), ""]
        : [part.slice(0, index).trim(), part.slice(index + 1).trim()];
    }),
  );

  const timestampRaw = parts.get("t");
  const provided = parts.get("v0");
  if (!timestampRaw || !provided) return { ok: false, reason: "malformed" };

  const timestamp = Number(timestampRaw);
  if (!Number.isFinite(timestamp)) return { ok: false, reason: "malformed" };

  const expected = createHmac("sha256", secret).update(`${timestamp}.${rawBody}`).digest("hex");

  const providedBuffer = Buffer.from(provided, "hex");
  const expectedBuffer = Buffer.from(expected, "hex");
  if (
    providedBuffer.length !== expectedBuffer.length ||
    !timingSafeEqual(providedBuffer, expectedBuffer)
  ) {
    return { ok: false, reason: "mismatch" };
  }

  // Checked only after the signature, so an unsigned request cannot learn
  // anything from how quickly it was refused.
  if (Math.abs(nowSeconds - timestamp) > SIGNATURE_TOLERANCE_SECONDS) {
    return { ok: false, reason: "stale" };
  }

  return { ok: true, timestamp };
};
