export const roles = [
  "partner",
  "business_representative",
  "finance_reviewer",
  "finance_approver",
  "programme_manager",
  "trade_manager",
  "content_editor",
  "publisher",
  "auditor",
  "super_admin",
  "procurement_manager",
  "supplier",
] as const;
export type Role = (typeof roles)[number];
export const statuses = [
  "draft",
  "awaiting_payment",
  "proof_submitted",
  "under_review",
  "confirmed",
  "rejected",
  "needs_information",
  "expired",
  "refunded",
] as const;
export type ContributionStatus = (typeof statuses)[number];
const transitions: Record<ContributionStatus, readonly ContributionStatus[]> = {
  draft: ["awaiting_payment"],
  awaiting_payment: ["proof_submitted", "expired"],
  proof_submitted: ["under_review", "needs_information", "rejected"],
  under_review: ["confirmed", "needs_information", "rejected"],
  confirmed: ["refunded"],
  rejected: [],
  needs_information: ["proof_submitted", "rejected", "expired"],
  expired: [],
  refunded: [],
};
export function canTransition(
  from: ContributionStatus,
  to: ContributionStatus,
) {
  return transitions[from].includes(to);
}
export function parseNaira(value: string): bigint {
  if (!/^\d{1,10}(\.\d{1,2})?$/.test(value))
    throw new Error("Enter a valid amount with at most two decimal places.");
  const [whole, part = ""] = value.split(".");
  const minor = BigInt(whole) * 100n + BigInt(part.padEnd(2, "0"));
  if (minor < 100000n)
    throw new Error("The minimum contribution is NGN 1,000.");
  return minor;
}
export function money(value: string | number | bigint = 0) {
  const n = BigInt(value);
  return `₦${(n / 100n).toLocaleString("en-NG")}.${(n % 100n).toString().padStart(2, "0")}`;
}
export function shown(value: unknown) {
  if (value == null || value === "") return "—";
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return "—";
    const dateOnly =
      value.getHours() === 0 &&
      value.getMinutes() === 0 &&
      value.getSeconds() === 0 &&
      value.getMilliseconds() === 0;
    return dateOnly
      ? value.toLocaleDateString("en-GB")
      : value.toLocaleString("en-GB");
  }
  if (typeof value === "bigint") return value.toString();
  if (typeof value === "object") {
    try {
      return JSON.stringify(value);
    } catch {
      return "—";
    }
  }
  return String(value);
}
export function label(value: string) {
  return value.replaceAll("_", " ").replace(/\b\w/g, (s) => s.toUpperCase());
}
export function assertSeparation(
  owner: string,
  reviewer: string,
  approver: string,
) {
  if (new Set([owner, reviewer, approver]).size !== 3)
    throw new Error(
      "Submitter, reviewer and approver must be different people.",
    );
}
