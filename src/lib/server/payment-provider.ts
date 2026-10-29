import "server-only";
import { createHmac, timingSafeEqual, createHash } from "node:crypto";
/** Provider-neutral boundary. A concrete provider must normalize and verify settlement server-side. */
export interface VerifiedBankEvent {
  provider: string;
  eventId: string;
  reference: string;
  amountMinor: bigint;
  currency: "NGN";
  destinationAccountId: string;
  settledAt: string;
}
export interface PaymentProvider {
  verifyAndNormalize(
    rawBody: Buffer,
    headers: Headers,
  ): Promise<VerifiedBankEvent>;
}
export function verifyHmac(
  rawBody: Buffer,
  signature: string,
  secret: string,
  timestamp: number,
  now = Date.now(),
) {
  if (!Number.isSafeInteger(timestamp) || Math.abs(now - timestamp) > 300000)
    throw new Error("Stale webhook");
  if (!/^[a-f0-9]{64}$/i.test(signature)) throw new Error("Invalid signature");
  const expected = createHmac("sha256", secret)
    .update(String(timestamp))
    .update(".")
    .update(rawBody)
    .digest();
  if (!timingSafeEqual(expected, Buffer.from(signature, "hex")))
    throw new Error("Invalid signature");
  return createHash("sha256").update(rawBody).digest("hex");
}
// No generic callback endpoint: each provider requires its real signature format, event retrieval,
// beneficiary validation and idempotent persistence in webhook_events before it can be enabled.
