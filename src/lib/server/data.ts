import "server-only";
import { configured, database } from "@/lib/server/database";
export async function metrics() {
  if (!configured()) return null;
  const db = await database();
  const { data, error } = await db.rpc("public_metrics");
  return error
    ? null
    : (data as {
        confirmed_minor: number;
        partners: number;
        businesses: number;
        opportunities: number;
        commerce_minor: number;
        donation_refunds_minor: number;
        allocated_minor: number;
        spent_minor: number;
        recognised: number;
        supporters: number;
      });
}
export async function published(table: string) {
  if (!configured()) return [];
  const db = await database();
  const { data } = await db
    .from(`public_${table}`)
    .select("id,title,summary,data,published_at")
    .order("published_at", { ascending: false })
    .limit(50);
  return data ?? [];
}
