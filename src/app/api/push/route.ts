import { NextResponse } from "next/server";
import { z } from "zod";
import { apiSession, fail } from "@/lib/server/http";
export async function POST(request: Request) {
  try {
    const { db, user } = await apiSession(request);
    const sub = z
      .object({
        endpoint: z.url().max(2000),
        keys: z.object({
          p256dh: z.string().max(500),
          auth: z.string().max(500),
        }),
      })
      .parse(await request.json());
    const url = new URL(sub.endpoint);
    if (
      url.protocol !== "https:" ||
      ![
        "fcm.googleapis.com",
        "updates.push.services.mozilla.com",
        "web.push.apple.com",
        "wns2-par02p.notify.windows.com",
      ].some(
        (host) => url.hostname === host || url.hostname.endsWith("." + host),
      )
    )
      throw new Error("Unsupported push endpoint.");
    const { error } = await db
      .from("push_subscriptions")
      .upsert(
        { owner_id: user.id, endpoint: sub.endpoint, keys: sub.keys },
        { onConflict: "endpoint" },
      );
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (e) {
    return fail(e);
  }
}
