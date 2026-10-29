import "dotenv/config";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { databaseClient } from "../src/lib/server/db-client";
import { pool } from "../src/lib/server/postgres";
import { passwordMatches } from "../src/lib/server/local-auth";
const { rows } = await pool.query(
  "select u.id,u.email,u.password_hash from app_auth.users u join public.role_assignments r on r.user_id=u.id where r.role='super_admin' limit 1",
);
assert.equal(rows.length, 1);
const admin = rows[0];
const anon = databaseClient(null);
const hidden = await anon.from("profiles").select("*");
assert.equal(hidden.error, null);
assert.deepEqual(hidden.data, []);
const client = databaseClient({
  id: admin.id,
  email: admin.email,
  aal: "aal1",
  sessionId: "test-read-only",
});
const profile = await client
  .from("profiles")
  .select("*")
  .eq("id", admin.id)
  .single();
assert.equal(profile.error, null);
assert.equal(profile.data?.id, admin.id);
const roles = await client
  .from("role_assignments")
  .select("role,expires_at")
  .eq("user_id", admin.id);
assert.equal(roles.error, null);
assert.ok(roles.data?.some((r) => r.role === "super_admin"));
const noMfa = await client.rpc("has_role", { wanted: ["super_admin"] });
assert.equal(noMfa.data, false);
const verified = databaseClient({
  id: admin.id,
  email: admin.email,
  aal: "aal2",
  sessionId: "test-read-only",
});
assert.equal(
  (await verified.rpc("has_role", { wanted: ["super_admin"] })).data,
  true,
);
const count = await verified
  .from("profiles")
  .select("*", { count: "exact", head: true });
assert.equal(count.error, null);
assert.equal(count.count, 1);
const joins = await verified
  .from("contribution_intents")
  .select("*,bank_accounts(*)")
  .limit(5);
assert.equal(joins.error, null);
const filters = await verified
  .from("payment_evidence")
  .select("*,contribution_intents!inner(purpose)")
  .in("contribution_intents.purpose", ["order"])
  .limit(5);
assert.equal(filters.error, null);
const publicRows = await anon
  .from("public_catalog_products")
  .select("*")
  .ilike("title", "%test%")
  .limit(5);
assert.equal(publicRows.error, null);
const metrics = await anon.rpc("public_metrics");
assert.equal(metrics.error, null);
assert.equal(metrics.data.confirmed_minor, 0);
const credentials = await readFile("output/admin-credentials.txt", "utf8");
const password = credentials.match(/^Temporary password: (.+)$/m)?.[1];
assert.ok(password);
assert.equal(await passwordMatches(password, admin.password_hash), true);
assert.equal(
  await passwordMatches("not-the-admin-password", admin.password_hash),
  false,
);
console.log(
  "PASS: live direct PostgreSQL adapter, row filtering, joins, array parameters, count results, anonymous isolation, MFA-gated roles, public metrics and generated admin password validation.",
);
await pool.end();
