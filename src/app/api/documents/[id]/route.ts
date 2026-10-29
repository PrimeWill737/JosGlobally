import { NextResponse } from "next/server";
import { apiSession, fail } from "@/lib/server/http";
import { z } from "zod";
export async function GET(
  _: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    z.uuid().parse(id);
    const { db, user } = await apiSession();
    const { data: doc } = await db
      .from("document_vault")
      .select("data")
      .eq("id", id)
      .eq("owner_id", user.id)
      .single();
    if (!doc) throw new Error("Document not found.");
    const { data, error } = await db.storage
      .from("documents")
      .createSignedUrl(doc.data.path, 60, { download: true });
    if (error || !data) throw new Error("Document access failed.");
    return NextResponse.redirect(data.signedUrl, {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (e) {
    return fail(e);
  }
}
