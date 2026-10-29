"use server";
import { revalidatePath } from "next/cache";
import { redirect, unstable_rethrow } from "next/navigation";
import { z } from "zod";
import { appUrl } from "@/lib/server/app-url";
import { database, service } from "@/lib/server/database";
import { requireSession, requireStaff } from "./auth";
import { modules, partnerModules, contentModules } from "@/lib/modules";
import { parseNaira, roles } from "@/lib/domain";
export type ActionState = { ok?: boolean; message: string };
const str = (f: FormData, k: string) => String(f.get(k) ?? "").trim();
const uuid = (f: FormData, k: string) => z.uuid().parse(str(f, k));
const error = (e: unknown): ActionState => {
  unstable_rethrow(e);
  return {
    ok: false,
    message:
      e instanceof Error ? e.message : "The operation could not be completed.",
  };
};
async function limit(key: string) {
  const { data, error: e } = await service().rpc("consume_rate_limit", {
    bucket: key,
    max_hits: 20,
    seconds: 300,
  });
  if (e || !data)
    throw new Error("Too many requests. Please try again in a few minutes.");
}
export async function loginAction(
  _: ActionState,
  f: FormData,
): Promise<ActionState> {
  try {
    const email = z.email().parse(str(f, "email"));
    await limit(`login:${email.toLowerCase()}`);
    const db = await database();
    const { error: e } = await db.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${appUrl()}/auth/callback` },
    });
    if (e) throw e;
    return {
      ok: true,
      message: "Check your email for your secure sign-in link.",
    };
  } catch (e) {
    return error(e);
  }
}
export async function logout() {
  const db = await database();
  await db.auth.signOut();
  redirect("/");
}
export async function profileAction(
  _: ActionState,
  f: FormData,
): Promise<ActionState> {
  try {
    const s = await requireSession();
    const db = await database();
    const { error: e } = await db
      .from("profiles")
      .update({
        full_name: z.string().min(2).max(150).parse(str(f, "full_name")),
        category: z
          .enum(["individual", "business", "organisation", "institution"])
          .parse(str(f, "category")),
        country: z.string().min(2).max(100).parse(str(f, "country")),
        city: str(f, "city").slice(0, 100),
        public_identity: f.get("public_identity") === "on",
      })
      .eq("id", s.user.id);
    if (e) throw e;
    revalidatePath("/dashboard");
    return { ok: true, message: "Profile saved." };
  } catch (e) {
    return error(e);
  }
}
export async function intentAction(
  _: ActionState,
  f: FormData,
): Promise<ActionState> {
  let id: string;
  try {
    const s = await requireSession();
    await limit(`intent:${s.user.id}`);
    if (f.get("terms") !== "on")
      throw new Error("Please accept the contribution terms.");
    const amount = parseNaira(str(f, "amount"));
    const db = await database();
    const { error: ce } = await db.from("consent_records").insert({
      owner_id: s.user.id,
      title: "Contribution terms accepted",
      status: "submitted",
      data: {
        policy: "contribution-terms-v1",
        accepted_at: new Date().toISOString(),
      },
    });
    if (ce) throw ce;
    const { data, error: e } = await db.rpc("create_donation", {
      amount: amount.toString(),
      visibility: z
        .enum(["private", "anonymous", "public"])
        .parse(str(f, "visibility") || "private"),
      dedication_text: str(f, "dedication").slice(0, 500),
      project: str(f, "project_id") ? uuid(f, "project_id") : null,
    });
    if (e) throw e;
    id = data;
  } catch (e) {
    return error(e);
  }
  redirect(`/partners/checkout?id=${id}`);
}
export async function recordAction(
  _: ActionState,
  f: FormData,
): Promise<ActionState> {
  try {
    const s = await requireSession();
    const key = str(f, "module");
    const m = modules[key];
    if (!m) throw new Error("Unknown module");
    const staff = f.get("staff") === "yes";
    if (staff) {
      await requireStaff([
        m.role,
        "super_admin",
        ...(contentModules.includes(key) ? ["content_editor"] : []),
      ]);
    } else if (!partnerModules.includes(key))
      throw new Error("This module requires staff access.");
    await limit(`record:${s.user.id}`);
    const data: Record<string, string> = {};
    for (const field of m.fields) {
      const v = str(f, field.name);
      if (field.required && !v) throw new Error(`${field.label} is required.`);
      if (v.length > 12000) throw new Error("Field is too long.");
      if (field.type === "select" && !field.options?.includes(v))
        throw new Error("Invalid selection.");
      data[field.name] = v;
    }
    const row: Record<string, unknown> = {
      owner_id: s.user.id,
      title: z.string().min(2).max(200).parse(str(f, "title")),
      summary: z.string().max(4000).parse(str(f, "summary")),
      status: staff ? "draft" : "submitted",
      data,
    };
    for (const field of m.fields.filter(
      (x) =>
        x.name.endsWith("_id") &&
        [
          "programme_id",
          "business_id",
          "project_id",
          "application_id",
          "enquiry_id",
        ].includes(x.name),
    )) {
      if (data[field.name]) row[field.name] = z.uuid().parse(data[field.name]);
    }
    if (key === "allocations")
      row.amount_minor = parseNaira(data.amount).toString();
    const db = await database();
    const { error: e } = await db.from(m.table).insert(row);
    if (e) throw e;
    revalidatePath(staff ? `/admin/${key}` : `/dashboard/${key}`);
    return {
      ok: true,
      message: staff
        ? "Draft saved. Review it before publishing."
        : "Submitted. You can follow its status below.",
    };
  } catch (e) {
    return error(e);
  }
}
export async function reviewRecordAction(
  _: ActionState,
  f: FormData,
): Promise<ActionState> {
  try {
    const key = str(f, "module");
    const m = modules[key];
    if (!m) throw new Error("Unknown module");
    const s = await requireStaff([m.role, "super_admin"]);
    const id = uuid(f, "id");
    const status = z
      .enum([
        "screened",
        "documentation_requested",
        "due_diligence",
        "approved",
        "published",
        "introductions",
        "negotiation",
        "closed",
        "withdrawn",
        "rejected",
        "needs_information",
        "resolved",
      ])
      .parse(str(f, "status"));
    if (status === "published" && !m.public)
      throw new Error("This record is private.");
    const note = z.string().min(5).max(4000).parse(str(f, "note"));
    const db = await database();
    const { data: row, error: readError } = await db
      .from(m.table)
      .select("*")
      .eq("id", id)
      .single();
    if (readError || !row) throw new Error("Record not found.");
    if (row.owner_id === s.user.id && status === "published")
      throw new Error(
        "A different operator must review and publish this draft.",
      );
    if (
      key === "projects" &&
      status === "published" &&
      row.status !== "due_diligence"
    )
      throw new Error("Complete due diligence before publication.");
    if (
      status === "published" &&
      ["projects", "business"].includes(key) &&
      !row.data
    )
      throw new Error("Review evidence first.");
    const date = str(f, "published_at");
    const { error: e } = await db
      .from(m.table)
      .update({
        status,
        reviewed_by: s.user.id,
        published_at:
          status === "published"
            ? date
              ? new Date(date).toISOString()
              : new Date().toISOString()
            : null,
        data: { ...row.data, review_note: note },
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);
    if (e) throw e;
    revalidatePath(`/admin/${key}`);
    return { ok: true, message: "Review saved." };
  } catch (e) {
    return error(e);
  }
}
export async function financeAction(
  _: ActionState,
  f: FormData,
): Promise<ActionState> {
  try {
    const op = str(f, "operation");
    await requireStaff(
      op === "confirm" || op === "refund-paid"
        ? ["finance_approver"]
        : ["finance_reviewer"],
    );
    const db = await database();
    let result;
    switch (op) {
      case "import":
        result = await db.rpc("import_bank_entry", {
          tx: z.string().min(3).parse(str(f, "transaction_id")),
          ref: str(f, "reference"),
          amount: parseNaira(str(f, "amount")).toString(),
          account: uuid(f, "account_id"),
          booked: z.iso.date().parse(str(f, "booked_at")),
          sender_name: z.string().min(2).parse(str(f, "sender")),
        });
        break;
      case "match":
        result = await db.rpc("review_contribution", {
          iid: uuid(f, "intent_id"),
          bid: uuid(f, "bank_entry_id"),
          eid: uuid(f, "evidence_id"),
          review_note: z.string().min(5).parse(str(f, "note")),
        });
        break;
      case "confirm":
        result = await db.rpc("confirm_contribution", {
          iid: uuid(f, "intent_id"),
        });
        break;
      case "decision":
        result = await db.rpc("decide_contribution", {
          iid: uuid(f, "intent_id"),
          decision: z
            .enum(["needs_information", "rejected"])
            .parse(str(f, "decision")),
          reason: z.string().min(5).parse(str(f, "note")),
        });
        break;
      case "refund-paid":
        result = await db.rpc("complete_refund", {
          rid: uuid(f, "refund_id"),
          bank_ref: str(f, "bank_reference"),
        });
        break;
      default:
        throw new Error("Unknown operation");
    }
    if (result.error) throw result.error;
    revalidatePath("/admin");
    revalidatePath("/dashboard");
    return { ok: true, message: "Operation recorded with an audit trail." };
  } catch (e) {
    return error(e);
  }
}
export async function refundAction(
  _: ActionState,
  f: FormData,
): Promise<ActionState> {
  try {
    await requireSession();
    const db = await database();
    const { error: e } = await db.rpc("request_refund", {
      cid: uuid(f, "contribution_id"),
      reason_text: z.string().min(5).max(2000).parse(str(f, "reason")),
    });
    if (e) throw e;
    revalidatePath("/dashboard/contributions");
    return {
      ok: true,
      message: "Refund request submitted for independent review.",
    };
  } catch (e) {
    return error(e);
  }
}
export async function roleAction(
  _: ActionState,
  f: FormData,
): Promise<ActionState> {
  try {
    await requireStaff(["super_admin"]);
    const db = await database();
    const expires = str(f, "expires");
    const { error: e } = await db.rpc("manage_role", {
      target: uuid(f, "user_id"),
      role_name: z.enum(roles).parse(str(f, "role")),
      revoke_access: f.get("revoke") === "on",
      expiry: expires ? new Date(expires).toISOString() : null,
    });
    if (e) throw e;
    revalidatePath("/admin/permissions");
    return { ok: true, message: "Access updated and audited." };
  } catch (e) {
    return error(e);
  }
}
export async function launchAction(
  _: ActionState,
  f: FormData,
): Promise<ActionState> {
  try {
    await requireStaff(["super_admin"]);
    const db = await database();
    const { error: e } = await db.rpc("update_launch", {
      settings: {
        contributions_enabled: f.get("contributions_enabled") === "on",
        legal_approved: f.get("legal_approved") === "on",
        governance_published: f.get("governance_published") === "on",
      },
    });
    if (e) throw e;
    revalidatePath("/admin/settings");
    return { ok: true, message: "Launch controls updated." };
  } catch (e) {
    return error(e);
  }
}
