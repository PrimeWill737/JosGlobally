import { AdminGovernance } from "@/components/AdminGovernance";
import { CommerceAdmin } from "@/components/CommerceAdmin";
import { notFound } from "next/navigation";
import { requireStaff } from "@/lib/server/auth";
import { database } from "@/lib/server/database";
import { modules, contentModules } from "@/lib/modules";
import { ModuleView } from "@/components/ModuleView";
import { ActionForm } from "@/components/ActionForm";
import { DataTable } from "@/components/DataTable";
import { financeAction, roleAction, launchAction } from "@/lib/server/actions";
import { roles, label, money } from "@/lib/domain";
import { ArrowRight, ArrowUpRight } from "lucide-react";
export default async function AdminSection({
  params,
}: {
  params: Promise<{ section: string }>;
}) {
  const { section } = await params;
  if (["partners", "recognition", "compliance", "analytics"].includes(section))
    return <AdminGovernance section={section} />;
  if (section === "allocations") return <CommerceAdmin section="funds" />;
  if (
    ["commerce", "quotes", "orders", "funds", "assigned-orders"].includes(
      section,
    )
  )
    return <CommerceAdmin section={section} />;
  const s = await requireStaff();
  const db = await database();
  if (modules[section]) {
    await requireStaff([
      modules[section].role,
      "super_admin",
      ...(contentModules.includes(section) ? ["content_editor"] : []),
    ]);
    return <ModuleView moduleKey={section} staff />;
  }
  if (section === "permissions") {
    await requireStaff(["super_admin"]);
    const [{ data: members }, { data: assignments }] = await Promise.all([
      db
        .from("profiles")
        .select("id,full_name")
        .order("created_at", { ascending: false })
        .limit(200),
      db.from("role_assignments").select("*"),
    ]);
    return (
      <>
        <Heading
          title="Permissions & operator access"
          description="Provision least-privilege roles. Every staff role requires MFA. Auditor access is time-bound; you cannot change your own roles."
        />
        <div className="workspace-grid">
          <section className="panel">
            <h2>Grant or revoke access</h2>
            <ActionForm action={roleAction} submit="Update access">
              <label>
                Member
                <select name="user_id" required>
                  {members
                    ?.filter((m) => m.id !== s.user.id)
                    .map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.full_name || m.id}
                      </option>
                    ))}
                </select>
              </label>
              <label>
                Role
                <select name="role">
                  {roles.map((r) => (
                    <option key={r} value={r}>
                      {label(r)}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Access expiry
                <input type="datetime-local" name="expires" />
              </label>
              <label className="checkbox">
                <input type="checkbox" name="revoke" />
                Revoke this role
              </label>
            </ActionForm>
          </section>
          <section>
            <h2 className="section-title">Current assignments</h2>
            <DataTable
              rows={assignments ?? []}
              columns={["user_id", "role", "expires_at", "granted_by"]}
            />
          </section>
        </div>
      </>
    );
  }
  if (section === "settings") {
    await requireStaff(["super_admin"]);
    const [{ data: settings }, { data: accounts }] = await Promise.all([
      db.from("platform_settings").select("*").eq("key", "launch").single(),
      db.from("bank_accounts").select("*"),
    ]);
    return (
      <>
        <Heading
          title="Launch controls"
          description="Contributions remain closed until legal classification, public governance and an approved corporate account are in place."
        />
        <div className="workspace-grid">
          <section className="panel">
            <h2>Programme gates</h2>
            <ActionForm action={launchAction} submit="Save launch controls">
              {[
                [
                  "legal_approved",
                  "Signed legal and contribution terms approval is recorded",
                ],
                [
                  "governance_published",
                  "Owning entity, custody and governance disclosures are published",
                ],
                ["contributions_enabled", "Open contribution intents"],
              ].map(([key, text]) => (
                <label className="checkbox" key={key}>
                  <input
                    type="checkbox"
                    name={key}
                    defaultChecked={settings?.value?.[key] === true}
                  />
                  {text}
                </label>
              ))}
            </ActionForm>
          </section>
          <section className="panel">
            <h2>Approved bank accounts</h2>
            <p>
              Corporate beneficiary approval is a controlled database
              deployment. Use the documented bank approval script after
              confirming legal ownership and signatories.
            </p>
            <DataTable
              rows={accounts ?? []}
              columns={[
                "id",
                "legal_name",
                "bank_name",
                "account_number",
                "approved",
              ]}
            />
          </section>
        </div>
        <section className="panel">
          <h2>Release evidence</h2>
          <p>
            Track signed decisions, policy approval, operational coverage,
            security testing and recovery drills in Launch Readiness. Enabling
            this switch does not replace those approvals.
          </p>
          <a className="text-link" href="/admin/launch">
            Open launch checklist <ArrowRight size={16} aria-hidden="true" />
          </a>
        </section>
      </>
    );
  }
  if (section === "members") {
    await requireStaff(["super_admin"]);
    const { data } = await db
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200);
    return (
      <>
        <Heading
          title="Members"
          description="Profile categories and geographic participation. Private financial evidence requires a separate finance role."
        />
        <DataTable
          rows={data ?? []}
          columns={[
            "id",
            "full_name",
            "category",
            "country",
            "city",
            "created_at",
          ]}
        />
      </>
    );
  }
  if (section === "audit") {
    await requireStaff(["super_admin", "auditor"]);
    const { data } = await db
      .from("audit_events")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200);
    return (
      <>
        <Heading
          title="Immutable audit log"
          description="Database-recorded decisions and changes. Events cannot be edited or erased."
        />
        <a className="text-link" href="/api/reports?kind=audit">
          Export audit CSV <ArrowUpRight size={16} aria-hidden="true" />
        </a>
        <DataTable
          rows={data ?? []}
          columns={[
            "created_at",
            "actor_id",
            "action",
            "entity",
            "entity_id",
            "details",
          ]}
        />
      </>
    );
  }
  if (
    ["finance", "payments", "donations", "reconciliation"].includes(section)
  ) {
    await requireStaff(["finance_reviewer", "finance_approver", "auditor"]);
    const [
      { data: intents },
      { data: entries },
      { data: evidence },
      { data: matches },
      { data: refunds },
      { data: ledger },
      { data: accounts },
    ] = await Promise.all([
      db
        .from("contribution_intents")
        .select("*")
        .in(
          "purpose",
          section === "payments"
            ? ["order"]
            : section === "donations"
              ? ["donation"]
              : ["order", "donation"],
        )
        .order("created_at", { ascending: false })
        .limit(200),
      db
        .from("bank_statement_entries")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200),
      db
        .from("payment_evidence")
        .select("*,contribution_intents!inner(purpose)")
        .in(
          "contribution_intents.purpose",
          section === "payments"
            ? ["order"]
            : section === "donations"
              ? ["donation"]
              : ["order", "donation"],
        )
        .order("created_at", { ascending: false })
        .limit(200),
      db.from("bank_matches").select("*").limit(200),
      db
        .from("refunds")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200),
      db
        .from("ledger_entries")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(1000),
      db.from("bank_accounts").select("*").eq("approved", true),
    ]);
    const matched = new Set(matches?.map((m) => m.bank_entry_id));
    const unmatched = entries?.filter((e) => !matched.has(e.id)) ?? [];
    const overdue =
      intents?.filter(
        (i) =>
          ["proof_submitted", "under_review"].includes(i.status) &&
          Date.now() - new Date(i.created_at).getTime() > 172800000,
      ) ?? [];
    return (
      <>
        <Heading
          title={
            section === "payments"
              ? "Order payment verification"
              : section === "donations"
                ? "Donation verification"
                : section === "finance"
                  ? "Payment verification"
                  : "Finance & reconciliation"
          }
          description="Match settled bank evidence, document exceptions and obtain independent approval. No operator can review or approve their own contribution."
        />
        <div className="stat-grid">
          <div className="stat">
            <small>Submitted proofs</small>
            <strong>
              {intents?.filter((i) => i.status === "proof_submitted").length ??
                0}
            </strong>
          </div>
          <div className="stat">
            <small>Awaiting second approval</small>
            <strong>
              {intents?.filter((i) => i.status === "under_review").length ?? 0}
            </strong>
          </div>
          <div className="stat">
            <small>Unmatched bank entries</small>
            <strong>{unmatched.length}</strong>
            <p>
              {money(
                unmatched.reduce((n, e) => n + BigInt(e.amount_minor), 0n),
              )}
            </p>
          </div>
          <div className="stat">
            <small>Older than 48 hours</small>
            <strong>{overdue.length}</strong>
            <p>Calendar-age indicator; review business-day SLA</p>
          </div>
        </div>
        <div className="link-list">
          <a href="/api/reports?kind=ledger">
            Export ledger CSV <ArrowUpRight size={16} aria-hidden="true" />
          </a>
          <a href="/api/reports?kind=reconciliation">
            Export bank reconciliation CSV{" "}
            <ArrowUpRight size={16} aria-hidden="true" />
          </a>
        </div>
        <h2 className="section-title" style={{ marginTop: 30 }}>
          Contribution queue
        </h2>
        <DataTable
          rows={intents ?? []}
          columns={[
            "id",
            "reference",
            "purpose",
            "owner_id",
            "amount_minor",
            "status",
            "created_at",
          ]}
        />
        <h2 className="section-title">Receipt evidence</h2>
        {evidence?.map((e) => (
          <div className="panel" key={e.id}>
            <div className="row">
              <span>
                {e.transfer_reference} · {money(e.amount_minor)} ·{" "}
                {e.transfer_date}
              </span>
              <a
                className="text-link"
                href={`/api/evidence/${e.id}`}
                target="_blank"
                rel="noreferrer"
              >
                Open private evidence <ArrowUpRight size={16} aria-hidden="true" />
              </a>
            </div>
            <p className="mono">
              Evidence {e.id}
              <br />
              Intent {e.intent_id}
            </p>
          </div>
        ))}
        <div className="workspace-grid">
          {s.roles.includes("finance_reviewer") && (
            <>
              <section className="panel">
                <h2>Import a settled bank entry</h2>
                <p>
                  Copy from an independently obtained bank statement. Do not use
                  a receipt as the bank ledger.
                </p>
                <ActionForm action={financeAction} submit="Record bank entry">
                  <input type="hidden" name="operation" value="import" />
                  <label>
                    Bank transaction ID
                    <input name="transaction_id" required />
                  </label>
                  <label>
                    Contribution reference
                    <input name="reference" required />
                  </label>
                  <label>
                    Amount (NGN)
                    <input name="amount" required inputMode="decimal" />
                  </label>
                  <label>
                    Destination account
                    <select name="account_id" required>
                      {accounts?.map((a) => (
                        <option value={a.id} key={a.id}>
                          {a.legal_name} · {a.bank_name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Booking date
                    <input name="booked_at" type="date" required />
                  </label>
                  <label>
                    Sender name
                    <input name="sender" required />
                  </label>
                </ActionForm>
              </section>
              <section className="panel">
                <h2>Match and review</h2>
                <ActionForm
                  action={financeAction}
                  submit="Match for independent approval"
                >
                  <input type="hidden" name="operation" value="match" />
                  <label>
                    Contribution intent ID
                    <input name="intent_id" required />
                  </label>
                  <label>
                    Bank entry ID
                    <input name="bank_entry_id" required />
                  </label>
                  <label>
                    Evidence ID
                    <input name="evidence_id" required />
                  </label>
                  <label>
                    Review note · include sender checks
                    <textarea name="note" required minLength={5} />
                  </label>
                </ActionForm>
              </section>
              <section className="panel">
                <h2>Exception review</h2>
                <ActionForm action={financeAction} submit="Record decision">
                  <input name="operation" value="decision" type="hidden" />
                  <label>
                    Intent ID
                    <input name="intent_id" required />
                  </label>
                  <label>
                    Decision
                    <select name="decision">
                      <option value="needs_information">
                        Request more information
                      </option>
                      <option value="rejected">Reject</option>
                    </select>
                  </label>
                  <label>
                    Reason
                    <textarea name="note" required minLength={5} />
                  </label>
                </ActionForm>
              </section>
            </>
          )}
          {s.roles.includes("finance_approver") && (
            <>
              <section className="panel">
                <h2>Independent settlement approval</h2>
                <p>
                  Inspect the bank match and evidence before confirming. The
                  database blocks self-approval and duplicate settlement.
                </p>
                <ActionForm
                  action={financeAction}
                  submit="Confirm settled contribution"
                >
                  <input name="operation" value="confirm" type="hidden" />
                  <label>
                    Reviewed intent
                    <select name="intent_id" required>
                      {intents
                        ?.filter((i) => i.status === "under_review")
                        .map((i) => (
                          <option value={i.id} key={i.id}>
                            {i.reference} · {money(i.amount_minor)}
                          </option>
                        ))}
                    </select>
                  </label>
                </ActionForm>
              </section>
              <section className="panel">
                <h2>Record a completed refund</h2>
                <ActionForm
                  action={financeAction}
                  submit="Post refund reversal"
                >
                  <input name="operation" value="refund-paid" type="hidden" />
                  <label>
                    Refund request
                    <select name="refund_id" required>
                      {refunds
                        ?.filter((r) => r.status === "requested")
                        .map((r) => (
                          <option key={r.id} value={r.id}>
                            {r.id} · {money(r.amount_minor)}
                          </option>
                        ))}
                    </select>
                  </label>
                  <label>
                    Settled bank reversal reference
                    <input name="bank_reference" required minLength={5} />
                  </label>
                </ActionForm>
              </section>
            </>
          )}
        </div>
        <h2 className="section-title">Bank statement entries</h2>
        <DataTable
          rows={entries ?? []}
          columns={[
            "id",
            "transaction_id",
            "reference",
            "amount_minor",
            "sender",
            "booked_at",
          ]}
        />
        <h2 className="section-title">Bank matches</h2>
        <DataTable
          rows={matches ?? []}
          columns={[
            "intent_id",
            "bank_entry_id",
            "evidence_id",
            "reviewer_id",
            "note",
          ]}
        />
        <h2 className="section-title">Refunds</h2>
        <DataTable
          rows={refunds ?? []}
          columns={[
            "id",
            "contribution_id",
            "amount_minor",
            "reason",
            "status",
            "requested_by",
            "approved_by",
          ]}
        />
        <h2 className="section-title">Append-only ledger (minor units)</h2>
        <DataTable
          rows={ledger ?? []}
          columns={[
            "contribution_id",
            "refund_id",
            "account",
            "debit_minor",
            "credit_minor",
            "created_at",
          ]}
        />
      </>
    );
  }
  notFound();
}
function Heading({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="page-heading">
      <p className="eyebrow">OPERATIONS</p>
      <h1>{title}</h1>
      <p>{description}</p>
    </div>
  );
}
