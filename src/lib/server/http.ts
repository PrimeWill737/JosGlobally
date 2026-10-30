import "server-only";
import { NextResponse } from "next/server";
import { appUrl } from "@/lib/server/app-url";
import { database, service } from "@/lib/server/database";
import { createHash } from "node:crypto";
const allowedSites = [
  "http://localhost:3000",
  "http://127.0.0.1:3000",
  "https://josglobally.com",
  "https://www.josglobally.com",
];
function trustedOrigins(request: Request) {
  const allowed = new Set<string>(allowedSites);
  try {
    allowed.add(new URL(request.url).origin);
  } catch {
    /* The request URL is still checked below. */
  }
  try {
    allowed.add(new URL(appUrl()).origin);
  } catch {
    /* A bad public URL must not widen the allow-list. */
  }
  return allowed;
}
export async function apiSession(request?: Request) {
  if (request && request.method !== "GET") {
    const origin = request.headers.get("origin");
    let allowed = false;
    if (origin) {
      try {
        allowed = trustedOrigins(request).has(new URL(origin).origin);
      } catch {
        allowed = false;
      }
    }
    if (!allowed) throw new Error("Invalid request origin.");
  }
  const db = await database();
  const {
    data: { user },
  } = await db.auth.getUser();
  if (!user) throw new Error("Sign in required.");
  return { db, user };
}
function formReturn(request: Request, message: string) {
  const dest = request.headers.get("sec-fetch-dest");
  if (dest !== "document" && dest !== "iframe") return null;
  const referer = request.headers.get("referer");
  if (!referer) return null;
  try {
    const back = new URL(referer);
    const here = new URL(request.url);
    if (back.origin !== here.origin || back.pathname.startsWith("/api/"))
      return null;
    back.searchParams.set("notice", message.slice(0, 300));
    return NextResponse.redirect(back, {
      status: 303,
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch {
    return null;
  }
}
export function fail(e: unknown, request?: Request) {
  const message =
    e instanceof Error ? e.message : "The request could not be completed.";
  return (
    (request && formReturn(request, message)) ||
    NextResponse.json(
      { error: message },
      { status: 400, headers: { "Cache-Control": "private, no-store" } },
    )
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
