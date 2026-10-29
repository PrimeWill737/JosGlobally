import { PGlite } from "@electric-sql/pglite";
import { readFile, readdir } from "node:fs/promises";
import assert from "node:assert/strict";
const db = new PGlite();
await db.exec(
  `create role anon;create role authenticated;create role service_role bypassrls;create schema auth;create schema storage;create table auth.users(id uuid primary key,raw_user_meta_data jsonb default '{}');create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;create function auth.jwt() returns jsonb language sql stable as $$ select coalesce(nullif(current_setting('request.jwt.claims',true),''),'{}')::jsonb $$;create table storage.buckets(id text primary key,name text,public boolean,file_size_limit int,allowed_mime_types text[]);create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text,name text);alter table storage.objects enable row level security;create function storage.foldername(text) returns text[] language sql as $$ select string_to_array($1,'/') $$;grant usage on schema auth,storage to anon,authenticated,service_role;grant execute on all functions in schema auth to anon,authenticated,service_role;grant select on storage.objects to authenticated;`,
);
for (const file of (await readdir("supabase/migrations")).sort()) {
  await db.exec(
    (await readFile(`supabase/migrations/${file}`, "utf8")).replace(
      "create extension if not exists pgcrypto;",
      "",
    ),
  );
  console.log("Migration applied:", file);
}
const ids = Array.from({ length: 5 }, () => crypto.randomUUID());
const [owner, reviewer, approver, superadmin, outsider] = ids;
for (const id of ids)
  await db.query(`insert into app_auth.users(id) values($1)`, [id]);
await db.query(
  `insert into role_assignments(user_id,role) values($1,'finance_reviewer'),($2,'finance_approver'),($3,'super_admin')`,
  [reviewer, approver, superadmin],
);
await db.query(
  `insert into bank_accounts(legal_name,bank_name,account_number,approved) values('Test corporate','Test bank','1234567890',true)`,
);
await db.exec(
  `update platform_settings set value='{"contributions_enabled":true,"legal_approved":true,"governance_published":true}' where key='launch'`,
);
const asUser = async (id: string, aal = "aal2") => {
  await db.exec("reset role");
  await db.query(
    `select set_config('request.jwt.claim.sub',$1,false),set_config('request.jwt.claims',$2,false)`,
    [id, JSON.stringify({ aal })],
  );
  await db.exec("set role authenticated");
};
const scalar = async (sql: string, params: unknown[] = []) =>
  Object.values((await db.query(sql, params)).rows[0] as object)[0] as string;
const rejects = async (sql: string, params: unknown[] = []) =>
  assert.rejects(() => db.query(sql, params));
await asUser(owner);
await db.query(
  `insert into consent_records(owner_id,title,status,data) values($1,'Terms','submitted','{"policy":"contribution-terms-v1"}')`,
  [owner],
);
await rejects(`select create_intent(99999)`);
const iid = await scalar("select create_intent(100000)");
assert.match(iid, /[a-f0-9-]{36}/);
await rejects(
  `insert into contributions(intent_id,owner_id,amount_minor,currency,match_id,confirmed_by) values($1,$2,100000,'NGN',$1,$2)`,
  [iid, owner],
);
await rejects(
  `update contribution_intents set status='confirmed' where id=$1 returning id`,
  [iid],
).catch(() => {});
assert.equal(
  await scalar(`select status from contribution_intents where id=$1`, [iid]),
  "awaiting_payment",
);
await asUser(outsider);
assert.equal(
  (await db.query("select * from contribution_intents where id=$1", [iid])).rows
    .length,
  0,
);
await rejects(
  `select submit_evidence($1,$2,$3,$4,'image/png',500,'ref',100000,current_date)`,
  [owner, iid, `${owner}/${iid}/x.png`, "a".repeat(64)],
);
await db.exec("reset role");
const eid = await scalar(
  `select submit_evidence($1,$2,$3,$4,'image/png',500,'ref',100000,current_date)`,
  [owner, iid, `${owner}/${iid}/x.png`, "a".repeat(64)],
);
const ref = await scalar(
  "select reference from contribution_intents where id=$1",
  [iid],
);
const account = await scalar(
  "select account_id from contribution_intents where id=$1",
  [iid],
);
await asUser(superadmin);
await rejects("select confirm_contribution($1)", [iid]);
assert.equal((await db.query("select * from payment_evidence")).rows.length, 0);
await asUser(reviewer, "aal1");
await rejects(
  `select import_bank_entry('tx', $1,100000,$2,current_date,'Sender')`,
  [ref, account],
);
await asUser(reviewer);
const bid = await scalar(
  `select import_bank_entry('tx', $1,100000,$2,current_date,'Sender')`,
  [ref, account],
);
await rejects(
  `select import_bank_entry('tx', $1,100000,$2,current_date,'Sender')`,
  [ref, account],
);
await scalar(
  `select review_contribution($1,$2,$3,'Sender checked against statement')`,
  [iid, bid, eid],
);
await db.exec("reset role");
await db.query(
  `insert into role_assignments(user_id,role) values($1,'finance_approver'),($2,'finance_approver')`,
  [reviewer, owner],
);
await asUser(reviewer);
await rejects("select confirm_contribution($1)", [iid]);
await asUser(owner);
await rejects("select confirm_contribution($1)", [iid]);
await asUser(approver);
const cid = await scalar("select confirm_contribution($1)", [iid]);
assert.equal(await scalar("select confirm_contribution($1)", [iid]), cid);
assert.equal(await scalar("select count(*)::text from contributions"), "1");
assert.equal(
  await scalar(
    "select (sum(debit_minor)-sum(credit_minor))::text from ledger_entries",
  ),
  "0",
);
await db.exec("reset role");
await rejects(`update contributions set amount_minor=200000 where id=$1`, [
  cid,
]);
await rejects(`delete from audit_events`);
await asUser(owner);
const rid = await scalar(`select request_refund($1,'Test requested refund')`, [
  cid,
]);
await rejects(`select complete_refund($1,'reverse-tx')`, [rid]);
await asUser(approver);
await db.query(`select complete_refund($1,'reverse-tx')`, [rid]);
await db.query(`select complete_refund($1,'reverse-tx')`, [rid]);
assert.equal(await scalar(`select count(*)::text from ledger_entries`), "4");
assert.equal(
  await scalar(`select (public_metrics()->>'confirmed_minor')`),
  "0",
);
await asUser(outsider);
await rejects(
  `insert into role_assignments(user_id,role) values($1,'super_admin')`,
  [outsider],
);
await asUser(superadmin);
await rejects(`select manage_role($1,'finance_approver',false,null)`, [
  superadmin,
]);
await rejects(`select manage_role($1,'auditor',false,null)`, [outsider]);
await db.exec("reset role");
const rls = await db.query<{ relname: string }>(
  `select relname from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relkind='r' and not c.relrowsecurity`,
);
assert.deepEqual(rls.rows, []);
console.log(
  "PASS: minimum amount, RLS isolation, service-only scanned ingestion, MFA, duplicate bank IDs, super-admin finance isolation, independent approval, idempotent confirmation/refund, balanced ledger, immutable records, role escalation and all-table RLS.",
);
assert.equal(
  await scalar(`select count(*)::text from memberships where owner_id=$1`, [
    owner,
  ]),
  "0",
  "Donation must not grant membership",
);
assert.equal(
  await scalar(`select count(*)::text from public_legacy_wall`),
  "0",
  "Private gifts must stay off the wall",
);
assert.equal(
  await scalar(`select public_metrics()->>'commerce_minor'`),
  "0",
  "Donations never count as commerce",
);
await db.query(
  `insert into role_assignments(user_id,role) values($1,'procurement_manager'),($2,'procurement_manager'),($3,'supplier')`,
  [reviewer, approver, outsider],
);
await asUser(reviewer);
const sid = await scalar(`select save_supplier($1::jsonb)`, [
  JSON.stringify({
    name: "Test source",
    legal_entity: "Test supplier Ltd",
    country: "China",
    contact: "Test coordinator",
    contract_reference: "TEST-CONTRACT",
    quality_notes: "Pending independent document review",
  }),
]);
await rejects(`select review_supplier($1,'verified','Documents reviewed')`, [
  sid,
]);
await asUser(approver);
await db.query(
  `select review_supplier($1,'verified','Documents independently reviewed')`,
  [sid],
);
await asUser(owner);
const qid = await scalar(
  `select request_quote('[]','Machine sourcing for Jos test delivery')`,
);
await asUser(reviewer);
const quoteDetails = {
  supplier_id: sid,
  supplier_price: "200000",
  service_margin: "10000",
  export_handling: "1000",
  freight: "5000",
  insurance: "1000",
  duties_taxes: "5000",
  clearing: "1000",
  domestic_transport: "2000",
  inspection: "0",
  fx_rate: "1500.00000000",
  fx_source: "Test FX source",
  fx_at: new Date().toISOString(),
  fx_risk_party: "Merchant until quote expiry",
  assumptions:
    "Final itemized landed amount; no differential without acceptance",
  seller_of_record: "Test merchant Ltd",
  importer_of_record: "Test importer Ltd",
  warranty_party: "Test warranty provider",
  partner_roles: "Platform liaison; supplier procures",
  estimated_window: "Test estimate: 4 weeks",
  terms_version: "merchant-v1",
  expires_at: new Date(Date.now() + 86400000).toISOString(),
};
await rejects(`select issue_quote($1,$2::jsonb,$3::jsonb)`, [
  qid,
  JSON.stringify(quoteDetails),
  JSON.stringify([
    { description: "Machine", quantity: 1, unit_price_minor: "100000" },
  ]),
]);
await db.query(`select issue_quote($1,$2::jsonb,$3::jsonb)`, [
  qid,
  JSON.stringify(quoteDetails),
  JSON.stringify([
    { description: "Machine", quantity: 1, unit_price_minor: "200000" },
  ]),
]);
await rejects("select approve_quote($1)", [qid]);
await asUser(approver);
await db.query("select approve_quote($1)", [qid]);
await asUser(owner);
const delivery = JSON.stringify({
  name: "Test Customer",
  phone: "08000000000",
  address: "Test delivery address, Jos",
});
await rejects(`select accept_quote($1,$2::jsonb,'merchant-v1')`, [
  qid,
  delivery,
]);
await asUser(superadmin);
await rejects(`select commerce_settings('{"enabled":true}')`);
await db.query(
  `select commerce_settings('{"enabled":true,"consumer_terms_approved":true,"import_compliance_approved":true,"entities_verified":true}')`,
);
await asUser(owner);
await rejects(`select accept_quote($1,$2::jsonb,'wrong-terms')`, [
  qid,
  delivery,
]);
const oid = await scalar(`select accept_quote($1,$2::jsonb,'merchant-v1')`, [
  qid,
  delivery,
]);
assert.equal(
  await scalar(`select accept_quote($1,$2::jsonb,'merchant-v1')`, [
    qid,
    delivery,
  ]),
  oid,
);
const oi = await scalar(
  "select id from contribution_intents where order_id=$1",
  [oid],
);
const orderAmount = await scalar(
  "select total_minor::text from orders where id=$1",
  [oid],
);
assert.equal(orderAmount, "225000");
await db.exec("reset role");
assert.equal(
  await scalar(
    "select b.account_number from contribution_intents i join bank_accounts b on b.id=i.account_id where i.id=$1",
    [oi],
  ),
  "3003882502",
);
assert.equal(
  await scalar(
    "select b.account_number from contribution_intents i join bank_accounts b on b.id=i.account_id where i.id=$1",
    [iid],
  ),
  "0016801926",
);
await asUser(owner);
await asUser(outsider);
assert.equal(
  (await db.query("select * from orders where id=$1", [oid])).rows.length,
  0,
);
assert.equal((await db.query("select * from payment_evidence")).rows.length, 0);
await db.exec("reset role");
await rejects("update quotes set freight=999999 where id=$1", [qid]);
const oe = await scalar(
  `select submit_evidence($1,$2,$3,$4,'image/png',500,'order transfer',$5,current_date)`,
  [owner, oi, `${owner}/${oi}/order.png`, "b".repeat(64), orderAmount],
);
const orderRef = await scalar(
  "select reference from contribution_intents where id=$1",
  [oi],
);
await asUser(reviewer);
await rejects(
  `select review_contribution($1,$2,$3,'Cannot reuse donation bank entry')`,
  [oi, bid, oe],
);
await db.exec("reset role");
const orderAccount = await scalar(
  "select account_id from contribution_intents where id=$1",
  [oi],
);
await asUser(reviewer);
const ob = await scalar(
  `select import_bank_entry('order-tx',$1,$2,$3,current_date,'Customer')`,
  [orderRef, orderAmount, orderAccount],
);
await db.query(
  `select review_contribution($1,$2,$3,'Order amount destination date and sender checked')`,
  [oi, ob, oe],
);
await asUser(approver);
const oc = await scalar("select confirm_contribution($1)", [oi]);
assert.equal(
  await scalar(`select public_metrics()->>'commerce_minor'`),
  orderAmount,
);
assert.equal(await scalar(`select public_metrics()->>'confirmed_minor'`), "0");
assert.equal(
  await scalar(`select count(*)::text from donations`),
  "1",
  "Order must never create a donation",
);
assert.equal(
  await scalar(`select count(*)::text from order_ledger_entries`),
  "2",
);
assert.equal(
  await scalar(`select status from orders where id=$1`, [oid]),
  "payment_verified",
);
await asUser(reviewer);
await rejects(
  `select advance_order($1,'completed','Cannot skip procurement',null)`,
  [oid],
);
await db.query(
  `select advance_order($1,'procurement_approved','Verified payment and sourcing approval',$2)`,
  [oid, outsider],
);
await asUser(outsider);
assert.equal(
  (await db.query("select * from supplier_assignments")).rows.length,
  1,
);
assert.equal((await db.query("select * from orders")).rows.length, 0);
assert.equal((await db.query("select * from transactions")).rows.length, 0);
await asUser(owner);
const dispute = await scalar(
  `select open_dispute($1,'return','Test return request with reason')`,
  [oid],
);
assert.ok(dispute);
const or = await scalar(
  `select request_refund($1,'Order cancellation requested')`,
  [oc],
);
await asUser(approver);
await db.query(`select complete_refund($1,'order-reversal')`, [or]);
assert.equal(await scalar(`select public_metrics()->>'commerce_minor'`), "0");
await db.exec("reset role");
assert.equal(
  await scalar(
    `select (sum(debit_minor)-sum(credit_minor))::text from order_ledger_entries`,
  ),
  "0",
);
await asUser(owner);
await db.query(
  `insert into recognition_preferences(user_id,visibility,public_alias,consent_at) values($1,'public','Test Supporter',now())`,
  [owner],
);
assert.equal(
  (await db.query("select * from public_legacy_wall")).rows.length,
  0,
  "Private and reversed donations stay hidden even after profile opt-in",
);
const publicIntent = await scalar(
  `select create_donation(100000,'public','Test public gift',null)`,
);
await db.exec("reset role");
const pe = await scalar(
  `select submit_evidence($1,$2,$3,$4,'image/png',500,'public ref',100000,current_date)`,
  [owner, publicIntent, `${owner}/${publicIntent}/public.png`, "c".repeat(64)],
);
const pr = await scalar(
  `select reference from contribution_intents where id=$1`,
  [publicIntent],
);
await asUser(reviewer);
const pb = await scalar(
  `select import_bank_entry('public-tx',$1,100000,$2,current_date,'Donor')`,
  [pr, account],
);
await db.query(
  `select review_contribution($1,$2,$3,'Public donor proof bank matched')`,
  [publicIntent, pb, pe],
);
await asUser(approver);
await db.query(`select confirm_contribution($1)`, [publicIntent]);
assert.equal(
  (await db.query("select * from public_legacy_wall")).rows.length,
  1,
);
await asUser(owner);
await db.query(
  `update recognition_preferences set visibility='private',consent_at=null where user_id=$1`,
  [owner],
);
assert.equal(
  (await db.query("select * from public_legacy_wall")).rows.length,
  0,
  "Withdrawal removes public visibility immediately",
);
console.log(
  "PASS: independent supplier and price reviews, quote sum validation, commerce launch gates, idempotent quote acceptance, separate ledgers, no automatic membership, strict fulfilment transitions, assigned-supplier isolation, refund reporting and opt-in/withdrawable recognition.",
);
await db.close();
