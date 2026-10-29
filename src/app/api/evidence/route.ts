import { NextResponse } from "next/server";
import { z } from "zod";
import { apiSession, apiLimit, scannedFile, fail } from "@/lib/server/http";
import { service } from "@/lib/server/database";
import { parseNaira } from "@/lib/domain";
export const runtime = "nodejs";
export async function POST(request: Request) {
  try {
    const { db, user } = await apiSession(request);
    await apiLimit(user.id);
    const f = await request.formData();
    const id = z.uuid().parse(f.get("intent_id"));
    const ref = z.string().min(2).max(200).parse(f.get("transfer_reference"));
    const paid = parseNaira(String(f.get("amount"))).toString();
    const date = z.iso.date().parse(f.get("transfer_date"));
    const { data: i } = await db
      .from("contribution_intents")
      .select("*")
      .eq("id", id)
      .eq("owner_id", user.id)
      .single();
    if (
      !i ||
      !["awaiting_payment", "needs_information"].includes(i.status) ||
      new Date(i.expires_at) < new Date()
    )
      throw new Error("This contribution cannot accept evidence.");
    const file = await scannedFile(f);
    if (!["image/jpeg", "image/png"].includes(file.mime))
      throw new Error("Transaction proof must be a JPEG or PNG image.");
    const path = `${user.id}/${id}/${crypto.randomUUID()}.${file.ext}`;
    const admin = service();
    const { error: upload } = await admin.storage
      .from("receipts")
      .upload(path, file.bytes, { contentType: file.mime, upsert: false });
    if (upload) throw upload;
    const { error: e } = await admin.rpc("submit_evidence", {
      actor: user.id,
      iid: id,
      object_key: path,
      file_hash: file.hash,
      mime: file.mime,
      bytes: file.bytes.length,
      transfer_ref: ref,
      paid,
      paid_date: date,
    });
    if (e) {
      await admin.storage.from("receipts").remove([path]);
      throw new Error(e.message);
    }
    return NextResponse.redirect(
      new URL(
        i.purpose === "order"
          ? `/account/orders/${i.order_id}`
          : "/dashboard/contributions",
        request.url,
      ),
      303,
    );
  } catch (e) {
    return fail(e);
  }
}
