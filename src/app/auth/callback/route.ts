import { NextResponse, type NextRequest } from "next/server";
import { redeemMagicLink } from "@/lib/server/local-auth";
export async function GET(request: NextRequest) {
  try {
    await redeemMagicLink(request.nextUrl.searchParams.get("token") ?? "");
    return NextResponse.redirect(new URL("/dashboard", request.url));
  } catch {
    return NextResponse.redirect(new URL("/login?error=expired", request.url));
  }
}
