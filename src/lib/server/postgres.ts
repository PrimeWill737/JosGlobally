import "server-only";
import pg from "pg";
import { databaseUrl } from "@/lib/database-url";
const globalDb = globalThis as unknown as { josPool?: pg.Pool };
export const pool =
  globalDb.josPool ??
  new pg.Pool({
    connectionString: process.env.DATABASE_URL
      ? databaseUrl(process.env.DATABASE_URL)
      : undefined,
    max: 8,
    connectionTimeoutMillis: 10000,
    idleTimeoutMillis: 30000,
  });
if (process.env.NODE_ENV !== "production") globalDb.josPool = pool;
export type Identity = {
  id: string;
  email: string;
  aal: "aal1" | "aal2";
  sessionId: string;
};
export async function scoped<T>(
  identity: Identity | null,
  service: boolean,
  run: (client: pg.PoolClient) => Promise<T>,
) {
  const c = await pool.connect();
  try {
    await c.query("begin");
    if (!service) {
      await c.query(`set local role ${identity ? "authenticated" : "anon"}`);
      await c.query(
        "select set_config('request.jwt.claim.sub',$1,true),set_config('request.jwt.claims',$2,true)",
        [identity?.id ?? "", JSON.stringify({ aal: identity?.aal ?? "aal1" })],
      );
    }
    const value = await run(c);
    await c.query("commit");
    return value;
  } catch (e) {
    await c.query("rollback");
    throw e;
  } finally {
    c.release();
  }
}
