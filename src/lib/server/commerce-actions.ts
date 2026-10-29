"use server";
import { revalidatePath } from "next/cache";
import { redirect, unstable_rethrow } from "next/navigation";
import { z } from "zod";
import { database } from "@/lib/server/database";
import { requireSession, requireStaff } from "./auth";
import type { ActionState } from "./actions";
import { minorAmount, costFields, commercialDisclosures } from "@/lib/commerce";
const str = (f: FormData, k: string) => String(f.get(k) ?? "").trim();
const uuid = (f: FormData, k: string) => z.uuid().parse(str(f, k));
const fail = (e: unknown): ActionState => {
  unstable_rethrow(e);
  return {
    ok: false,
    message:
      e instanceof Error
        ? e.message
        : typeof e === "object" && e && "message" in e
          ? String(e.message)
          : "Unable to complete request.",
  };
};
export async function recognitionAction(
  _: ActionState,
  f: FormData,
): Promise<ActionState> {
  try {
    const s = await requireSession();
    const db = await database();
    const visibility = z
      .enum(["private", "anonymous", "public"])
      .parse(str(f, "visibility"));
    const alias = z.string().max(100).parse(str(f, "public_alias"));
    if (visibility === "public" && (!alias || f.get("consent") !== "on"))
      throw new Error(
        "Public recognition needs a display name and explicit consent.",
      );
    const { error } = await db.from("recognition_preferences").upsert({
      user_id: s.user.id,
      visibility,
      public_alias: alias,
      city: str(f, "city").slice(0, 100),
      message: str(f, "message").slice(0, 500),
      consent_at: visibility === "public" ? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    });
    if (error) throw error;
    revalidatePath("/account/recognition");
    revalidatePath("/legacy");
    return {
      ok: true,
      message:
        "Recognition preferences saved. Public visibility can be withdrawn at any time.",
    };
  } catch (e) {
    return fail(e);
  }
}
export async function quoteRequestAction(
  _: ActionState,
  f: FormData,
): Promise<ActionState> {
  try {
    await requireSession();
    const db = await database();
    const items = z
      .array(
        z.object({
          product_id: z.uuid(),
          quantity: z.number().int().min(1).max(10000),
        }),
      )
      .max(30)
      .parse(JSON.parse(str(f, "items") || "[]"));
    const { error } = await db.rpc("request_quote", {
      items,
      details: z.string().min(5).max(5000).parse(str(f, "details")),
    });
    if (error) throw error;
    revalidatePath("/account/orders");
    return {
      ok: true,
      message:
        "Quotation requested. Track its progress in My Orders. No payment has been made.",
    };
  } catch (e) {
    return fail(e);
  }
}
export async function acceptQuoteAction(
  _: ActionState,
  f: FormData,
): Promise<ActionState> {
  let id: string;
  try {
    await requireSession();
    if (f.get("terms") !== "on")
      throw new Error(
        "Please accept the merchant terms and landed-cost assumptions.",
      );
    const db = await database();
    const { data, error } = await db.rpc("accept_quote", {
      qid: uuid(f, "quote_id"),
      delivery_details: {
        name: z.string().min(2).max(150).parse(str(f, "name")),
        phone: z.string().min(7).max(40).parse(str(f, "phone")),
        address: z.string().min(5).max(1000).parse(str(f, "address")),
      },
      terms: str(f, "terms_version"),
    });
    if (error) throw error;
    id = data;
  } catch (e) {
    return fail(e);
  }
  redirect(`/account/orders/${id}`);
}
export async function disputeAction(
  _: ActionState,
  f: FormData,
): Promise<ActionState> {
  try {
    await requireSession();
    const db = await database();
    const { error } = await db.rpc("open_dispute", {
      oid: uuid(f, "order_id"),
      kind_text: z
        .enum(["dispute", "return", "cancellation", "failed_delivery"])
        .parse(str(f, "kind")),
      reason_text: z.string().min(5).max(5000).parse(str(f, "reason")),
    });
    if (error) throw error;
    revalidatePath("/account/orders");
    return {
      ok: true,
      message:
        "Case opened. Your request is linked to the order and will be independently reviewed.",
    };
  } catch (e) {
    return fail(e);
  }
}
export async function procurementAction(
  _: ActionState,
  f: FormData,
): Promise<ActionState> {
  try {
    const op = str(f, "operation");
    await requireStaff(
      op === "gates"
        ? ["super_admin"]
        : op === "allocate" || op === "spend"
          ? ["programme_manager"]
          : op === "approve-allocation" || op === "approve-spend"
            ? ["finance_approver"]
            : ["procurement_manager"],
    );
    const db = await database();
    let result;
    if (op === "supplier") {
      const details = Object.fromEntries(
        [
          "name",
          "legal_entity",
          "country",
          "contact",
          "contract_reference",
          "quality_notes",
        ].map((k) => [k, z.string().min(2).max(4000).parse(str(f, k))]),
      );
      result = await db.rpc("save_supplier", { details });
    } else if (op === "supplier-review")
      result = await db.rpc("review_supplier", {
        sid: uuid(f, "supplier_id"),
        decision: z.enum(["verified", "suspended"]).parse(str(f, "decision")),
        note_text: z.string().min(5).parse(str(f, "note")),
      });
    else if (op === "product") {
      const details: Record<string, unknown> = {};
      for (const key of [
        "sku",
        "slug",
        "title",
        "origin",
        "condition",
        "warranty",
        "voltage",
        "lead_time",
        "hs_code",
        "import_eligibility",
        "seller_of_record",
        "importer_of_record",
        "warranty_party",
        "partner_roles",
      ])
        details[key] = z.string().min(2).max(4000).parse(str(f, key));
      details.slug = z
        .string()
        .regex(/^[a-z0-9-]+$/)
        .parse(details.slug);
      details.category_id = uuid(f, "category_id");
      details.partner_id = uuid(f, "partner_id");
      details.listing_type = z
        .enum(["fixed_price", "priced_to_order", "quote_only"])
        .parse(str(f, "listing_type"));
      details.price_minor = str(f, "price")
        ? minorAmount(str(f, "price"))
        : null;
      details.price_valid_until = str(f, "price_valid_until")
        ? new Date(str(f, "price_valid_until")).toISOString()
        : null;
      details.specs = { description: str(f, "specifications") };
      result = await db.rpc("save_catalog_product", { details });
    } else if (op === "product-review")
      result = await db.rpc("review_catalog_product", {
        pid: uuid(f, "product_id"),
        decision: z
          .enum(["published", "suspended", "recalled"])
          .parse(str(f, "decision")),
        note_text: z.string().min(5).parse(str(f, "note")),
      });
    else if (op === "quote") {
      const details: Record<string, unknown> = {
        supplier_id: uuid(f, "supplier_id"),
      };
      for (const c of costFields) details[c] = minorAmount(str(f, c) || "0");
      for (const c of commercialDisclosures)
        details[c] = z.string().min(2).max(4000).parse(str(f, c));
      details.fx_rate = z
        .string()
        .regex(/^\d+(\.\d{1,8})?$/)
        .parse(str(f, "fx_rate"));
      details.fx_at = new Date(str(f, "fx_at")).toISOString();
      details.expires_at = new Date(str(f, "expires_at")).toISOString();
      const lines = z
        .array(
          z.object({
            product_id: z.string().optional(),
            description: z.string().min(2),
            quantity: z.number().int().min(1),
            unit_price_minor: z.string().regex(/^\d+$/),
          }),
        )
        .min(1)
        .parse(JSON.parse(str(f, "lines")));
      result = await db.rpc("issue_quote", {
        qid: uuid(f, "quote_id"),
        details,
        lines,
      });
    } else if (op === "quote-approve")
      result = await db.rpc("approve_quote", { qid: uuid(f, "quote_id") });
    else if (op === "advance")
      result = await db.rpc("advance_order", {
        oid: uuid(f, "order_id"),
        next_status: str(f, "status"),
        note_text: z.string().min(5).parse(str(f, "note")),
        supplier_user: str(f, "supplier_user")
          ? uuid(f, "supplier_user")
          : null,
      });
    else if (op === "shipment")
      result = await db.rpc("record_shipment", {
        oid: uuid(f, "order_id"),
        carrier_text: z.string().min(2).parse(str(f, "carrier")),
        tracking_text: z.string().min(2).parse(str(f, "tracking")),
        milestone_text: z.string().min(3).parse(str(f, "milestone")),
        window_text: str(f, "window"),
      });
    else if (op === "resolve")
      result = await db.rpc("resolve_dispute", {
        did: uuid(f, "dispute_id"),
        decision: str(f, "status"),
        response_text: z.string().min(5).parse(str(f, "response")),
      });
    else if (op === "allocate")
      result = await db.rpc("allocate_donation", {
        did: uuid(f, "donation_id"),
        pid: uuid(f, "project_id"),
        amount: minorAmount(str(f, "amount")),
        reason_text: z.string().min(5).parse(str(f, "reason")),
      });
    else if (op === "approve-allocation")
      result = await db.rpc("approve_allocation", {
        aid: uuid(f, "allocation_id"),
      });
    else if (op === "spend")
      result = await db.rpc("request_expenditure", {
        aid: uuid(f, "allocation_id"),
        amount: minorAmount(str(f, "amount")),
        description_text: z.string().min(5).parse(str(f, "description")),
        bank_ref: z.string().min(5).parse(str(f, "bank_reference")),
        evidence_text: z.string().min(5).parse(str(f, "evidence")),
      });
    else if (op === "approve-spend")
      result = await db.rpc("approve_expenditure", {
        eid: uuid(f, "expenditure_id"),
      });
    else if (op === "gates")
      result = await db.rpc("commerce_settings", {
        settings: Object.fromEntries(
          [
            "enabled",
            "consumer_terms_approved",
            "import_compliance_approved",
            "entities_verified",
          ].map((k) => [k, f.get(k) === "on"]),
        ),
      });
    else throw new Error("Unknown operation");
    if (result.error) throw result.error;
    revalidatePath("/admin");
    revalidatePath("/shop");
    revalidatePath("/account/orders");
    return { ok: true, message: "Saved with an audit trail." };
  } catch (e) {
    return fail(e);
  }
}
