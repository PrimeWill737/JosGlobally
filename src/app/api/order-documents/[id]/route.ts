import { NextResponse } from "next/server";
import { apiSession, fail } from "@/lib/server/http";
import { service } from "@/lib/server/database";
export async function GET(
  _: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const { db, user } = await apiSession();
    const { data: d } = await db
      .from("customs_docs")
      .select("*")
      .eq("id", id)
      .single();
    if (!d) throw new Error("Document access denied.");
    const { data, error } = await service()
      .storage.from("documents")
      .createSignedUrl(d.private_storage_path, 60, { download: true });
    if (error || !data) throw new Error("Document unavailable.");
    await service().from("audit_events").insert({
      actor_id: user.id,
      action: "order_document_accessed",
      entity: "customs_docs",
      entity_id: id,
    });
    return NextResponse.redirect(data.signedUrl, {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (e) {
    return fail(e);
  }
}
