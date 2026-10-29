import { NextResponse } from "next/server";
import { configured } from "@/lib/server/database";
export function GET() {
  return NextResponse.json(
    { status: "ok", databaseConfigured: configured() },
    { headers: { "Cache-Control": "no-store" } },
  );
}
