import { NextResponse } from "next/server";
import { apiSession, fail } from "@/lib/server/http";
import { service } from "@/lib/server/database";
import { z } from "zod";
export async function GET(
  _: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    z.uuid().parse(id);
    const { db, user } = await apiSession();
    const { data: e } = await db
      .from("payment_evidence")
      .select("object_path")
      .eq("id", id)
      .single();
    if (!e) throw new Error("Receipt not found or access denied.");
    const { data, error } = await db.storage
      .from("receipts")
      .createSignedUrl(e.object_path, 60, { download: true });
    if (error || !data) throw new Error("Could not open private receipt.");
    await service().from("audit_events").insert({
      actor_id: user.id,
      action: "evidence_accessed",
      entity: "payment_evidence",
      entity_id: id,
    });
    return NextResponse.redirect(data.signedUrl, {
      headers: {
        "Cache-Control": "private, no-store",
        "Referrer-Policy": "no-referrer",
      },
    });
  } catch (e) {
    return fail(e);
  }
}
