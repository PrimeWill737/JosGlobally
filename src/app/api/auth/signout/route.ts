import { NextResponse } from "next/server";
import { apiSession, fail } from "@/lib/server/http";
import { signOut } from "@/lib/server/local-auth";
export async function POST(request: Request) {
  try {
    await apiSession(request);
    await signOut(true);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return fail(e);
  }
}
