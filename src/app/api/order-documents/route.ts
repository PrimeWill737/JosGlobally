import { NextResponse } from "next/server";
import { z } from "zod";
import { apiSession, apiLimit, scannedFile, fail } from "@/lib/server/http";
import { service } from "@/lib/server/database";
export async function POST(request: Request) {
  try {
    const { db, user } = await apiSession(request);
    const { data: allowed } = await db.rpc("has_role", {
      wanted: ["procurement_manager"],
    });
    if (!allowed) throw new Error("Procurement role and MFA required.");
    await apiLimit(user.id);
    const f = await request.formData();
    const order = z.uuid().parse(f.get("order_id"));
    const title = z.string().min(2).max(200).parse(f.get("title"));
    const kind = z
      .enum(["inspection", "shipping", "customs", "invoice", "contract"])
      .parse(f.get("kind"));
    const file = await scannedFile(f);
    const path = `orders/${order}/${crypto.randomUUID()}.${file.ext}`;
    const admin = service();
    const { error: upload } = await admin.storage
      .from("documents")
      .upload(path, file.bytes, { contentType: file.mime });
    if (upload) throw upload;
    const { error } = await admin.from("customs_docs").insert({
      order_id: order,
      title,
      kind,
      private_storage_path: path,
      created_by: user.id,
    });
    if (error) {
      await admin.storage.from("documents").remove([path]);
      throw error;
    }
    await admin.from("audit_events").insert({
      actor_id: user.id,
      action: "order_document_uploaded",
      entity: "orders",
      entity_id: order,
      details: { sha256: file.hash },
    });
    return NextResponse.redirect(new URL("/admin/orders", request.url), 303);
  } catch (e) {
    return fail(e, request);
  }
}
