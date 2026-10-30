import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import webpush from "web-push";
import { service } from "@/lib/server/database";
export async function POST(request: Request) {
  const expected = `Bearer ${process.env.CRON_SECRET ?? ""}`;
  const received = request.headers.get("authorization") ?? "";
  if (
    !process.env.CRON_SECRET ||
    expected.length !== received.length ||
    !timingSafeEqual(Buffer.from(expected), Buffer.from(received))
  )
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  const db = service();
  await db.rpc("expire_intents");
  const { data: jobs, error } = await db.rpc("claim_jobs");
  if (error)
    return NextResponse.json({ error: "Queue unavailable" }, { status: 503 });
  let done = 0;
  for (const job of jobs ?? []) {
    try {
      if (job.kind !== "push") throw new Error("Unsupported job type");
      const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      const privateKey = process.env.VAPID_PRIVATE_KEY;
      const subject = process.env.VAPID_SUBJECT;
      if (publicKey && privateKey && subject) {
        webpush.setVapidDetails(subject, publicKey, privateKey);
        const { data: subs, error: e } = await db
          .from("push_subscriptions")
          .select("*")
          .eq("owner_id", job.payload.owner_id);
        if (e) throw e;
        for (const sub of subs ?? []) {
          try {
            await webpush.sendNotification(
              { endpoint: sub.endpoint, keys: sub.keys },
              JSON.stringify({
                title: job.payload.title,
                body: job.payload.body,
              }),
            );
          } catch (e) {
            const status = (e as { statusCode?: number }).statusCode;
            if (status === 410 || status === 404)
              await db.from("push_subscriptions").delete().eq("id", sub.id);
            else throw e;
          }
        }
      }
      await db
        .from("jobs")
        .update({ status: "done", locked_at: null })
        .eq("id", job.id);
      done++;
    } catch (e) {
      await db
        .from("jobs")
        .update({
          status: job.attempts >= 5 ? "dead" : "queued",
          available_at: new Date(
            Date.now() + 2 ** job.attempts * 60000,
          ).toISOString(),
          locked_at: null,
          last_error: e instanceof Error ? e.message : "Delivery failed",
        })
        .eq("id", job.id);
    }
  }
  return NextResponse.json({ processed: done });
}
