export const costFields = [
  "supplier_price",
  "service_margin",
  "export_handling",
  "freight",
  "insurance",
  "duties_taxes",
  "clearing",
  "domestic_transport",
  "inspection",
] as const;
export const commercialDisclosures = [
  "seller_of_record",
  "importer_of_record",
  "warranty_party",
  "partner_roles",
  "assumptions",
  "fx_source",
  "fx_risk_party",
  "estimated_window",
  "terms_version",
] as const;
export function minorAmount(value: string) {
  if (!/^\d{1,10}(\.\d{1,2})?$/.test(value))
    throw new Error(
      "Enter a valid NGN amount, with at most two decimal places.",
    );
  const [a, b = ""] = value.split(".");
  return (BigInt(a) * 100n + BigInt(b.padEnd(2, "0"))).toString();
}
