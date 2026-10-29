import { NextResponse, type NextRequest } from "next/server";
export function proxy(request: NextRequest) {
  const response = NextResponse.next();
  if (
    /^\/(dashboard|account|checkout|admin|partners\/checkout|partners\/verification|api|auth)/.test(
      request.nextUrl.pathname,
    )
  )
    response.headers.set("Cache-Control", "private, no-store");
  return response;
}
export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|icons|sw.js|offline.html).*)",
  ],
};
