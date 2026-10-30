import { NextResponse } from "next/server";
import { apiSession, apiLimit, scannedFile, fail } from "@/lib/server/http";
import { service } from "@/lib/server/database";
import { z } from "zod";
export async function POST(request: Request) {
  try {
    const { db, user } = await apiSession(request);
    await apiLimit(user.id);
    const f = await request.formData();
    const title = z.string().min(2).max(200).parse(f.get("title"));
    const file = await scannedFile(f);
    const path = `${user.id}/${crypto.randomUUID()}.${file.ext}`;
    const admin = service();
    const { error: upload } = await admin.storage
      .from("documents")
      .upload(path, file.bytes, { contentType: file.mime, upsert: false });
    if (upload) throw upload;
    const { error: e } = await db.from("document_vault").insert({
      owner_id: user.id,
      title,
      status: "submitted",
      data: { path, sha256: file.hash, mime: file.mime },
    });
    if (e) {
      await admin.storage.from("documents").remove([path]);
      throw e;
    }
    return NextResponse.redirect(
      new URL("/dashboard/receipts", request.url),
      303,
    );
  } catch (e) {
    return fail(e, request);
  }
}
