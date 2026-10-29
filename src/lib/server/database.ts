import "server-only";
import { databaseClient } from "@/lib/server/db-client";
import { identity } from "@/lib/server/local-auth";
// Direct PostgreSQL clients; identity and assurance are scoped to each database transaction.
export const configured = () => Boolean(process.env.DATABASE_URL);
export async function database() {
  if (!configured())
    throw new Error("Configure PostgreSQL to enable saved workflows.");
  return databaseClient(await identity());
}
export function service() {
  if (!configured()) throw new Error("PostgreSQL is not configured.");
  return databaseClient(null, true);
}
