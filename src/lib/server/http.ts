import "server-only";
import { NextResponse } from "next/server";
import { appUrl } from "@/lib/server/app-url";
import { database, service } from "@/lib/server/database";
import { createHash } from "node:crypto";
export async function apiSession(request?: Request) {
  if (request && request.method !== "GET") {
    const origin = request.headers.get("origin");
    if (
      !origin ||
      origin !== new URL(appUrl()).origin
    )
      throw new Error("Invalid request origin.");
  }
  const db = await database();
  const {
    data: { user },
  } = await db.auth.getUser();
  if (!user) throw new Error("Sign in required.");
  return { db, user };
}
export function fail(e: unknown) {
  return NextResponse.json(
    {
      error:
        e instanceof Error ? e.message : "The request could not be completed.",
    },
    { status: 400, headers: { "Cache-Control": "private, no-store" } },
  );
}
export async function scannedFile(form: FormData) {
  const file = form.get("file");
  if (
    !(file instanceof File) ||
    file.size < 1 ||
    file.size >
      Math.min(
        5 * 1024 * 1024,
        Number(process.env.MEDIA_MAX_BYTES) || 5 * 1024 * 1024,
      )
  )
    throw new Error("Upload a file between 1 byte and 5 MB.");
  const bytes = Buffer.from(await file.arrayBuffer());
  const ext = file.name.split(".").pop()?.toLowerCase();
  const isPdf = bytes.subarray(0, 5).toString() === "%PDF-";
  const isPng = bytes
    .subarray(0, 8)
    .equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  const isJpg = bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255;
  const mime = isPdf
    ? "application/pdf"
    : isPng
      ? "image/png"
      : isJpg
        ? "image/jpeg"
        : null;
  if (
    !mime ||
    file.type !== mime ||
    !(isPdf
      ? ext === "pdf"
      : isPng
        ? ext === "png"
        : ["jpg", "jpeg"].includes(ext ?? ""))
  )
    throw new Error(
      "The file contents, extension and MIME type must match PDF, JPEG or PNG.",
    );
  if (!process.env.MALWARE_SCAN_URL || !process.env.MALWARE_SCAN_TOKEN)
    throw new Error(
      "Secure upload scanning is not configured yet. Please contact support; no file was stored.",
    );
  const response = await fetch(process.env.MALWARE_SCAN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/octet-stream",
      Authorization: `Bearer ${process.env.MALWARE_SCAN_TOKEN}`,
    },
    body: bytes,
    signal: AbortSignal.timeout(30000),
  });
  if (!response.ok || (await response.json()).clean !== true)
    throw new Error("The file did not pass the security scan.");
  return {
    bytes,
    mime,
    ext: isPdf ? "pdf" : isPng ? "png" : "jpg",
    hash: createHash("sha256").update(bytes).digest("hex"),
  };
}
export async function apiLimit(user: string) {
  const { data, error } = await service().rpc("consume_rate_limit", {
    bucket: `upload:${user}`,
    max_hits: 10,
    seconds: 300,
  });
  if (error || !data)
    throw new Error("Upload limit reached. Try again in five minutes.");
}
