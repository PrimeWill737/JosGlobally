import Link from "next/link";
import { requireStaff } from "@/lib/server/auth";
import { database } from "@/lib/server/database";
import { metrics } from "@/lib/server/data";
import { money } from "@/lib/domain";
import { modules, contentModules } from "@/lib/modules";
export default async function Admin() {
  const s = await requireStaff();
  const db = await database();
  const m = await metrics();
  const finance = s.roles.some((r) =>
    ["finance_reviewer", "finance_approver", "auditor"].includes(r),
  );
  const { count: queue } = finance
    ? await db
        .from("contribution_intents")
        .select("*", { count: "exact", head: true })
        .in("status", ["proof_submitted", "under_review"])
    : { count: null };
  return (
    <>
      <div className="page-heading">
        <p className="eyebrow">
          {s.roles.includes("super_admin") ? "SUPER ADMIN" : "OPERATIONS"}{" "}
          WORKSPACE
        </p>
        <h1>A clear view of the movement.</h1>
        <p>
          Manage your assigned work, review evidence and keep the platform
          accountable.
        </p>
      </div>
      <div className="stat-grid">
        <div className="stat">
          <small>Net confirmed contributions</small>
          <strong>{money(m?.confirmed_minor ?? 0)}</strong>
          <p>Confirmed settlement less reversals</p>
        </div>
        <div className="stat">
          <small>Active partners</small>
          <strong>{m?.partners ?? 0}</strong>
        </div>
        <div className="stat">
          <small>Published enterprises</small>
          <strong>{m?.businesses ?? 0}</strong>
        </div>
        <div className="stat">
          <small>{finance ? "Payment review queue" : "Your access"}</small>
          <strong>{finance ? queue : "MFA"}</strong>
          <p>
            {finance ? "Awaiting review or approval" : "Verified staff session"}
          </p>
        </div>
      </div>
      <section className="dashboard-welcome">
        <div>
          <p className="eyebrow">ACCOUNTABILITY BY DESIGN</p>
          <h2>The right access. A traceable decision.</h2>
          <p>
            Finance review and approval stay separate. Super admin access
            manages operators and policies; it does not automatically grant
            access to financial evidence or settlement.
          </p>
        </div>
        <Link
          className="button ivory"
          href={
            s.roles.includes("super_admin")
              ? "/admin/launch"
              : "/dashboard/security"
          }
        >
          {s.roles.includes("super_admin")
            ? "Review launch readiness"
            : "Account security"}{" "}
          ↗
        </Link>
      </section>
      <div className="link-list" style={{ marginBottom: 25 }}>
        {s.roles.some((r) =>
          ["procurement_manager", "super_admin", "auditor"].includes(r),
        ) && (
          <>
            <Link href="/admin/commerce">Commerce & suppliers</Link>
            <Link href="/admin/quotes">Quotations</Link>
            <Link href="/admin/orders">Orders & fulfilment</Link>
          </>
        )}
        {s.roles.some((r) =>
          ["programme_manager", "finance_approver", "auditor"].includes(r),
        ) && <Link href="/admin/funds">Restricted funds & expenditure</Link>}
        {s.roles.includes("supplier") && (
          <Link href="/admin/assigned-orders">Assigned orders</Link>
        )}
      </div>
      <div className="card-grid">
        {Object.entries(modules)
          .filter(
            ([k, m]) =>
              s.roles.includes("super_admin") ||
              s.roles.includes(m.role) ||
              (s.roles.includes("content_editor") &&
                contentModules.includes(k)),
          )
          .map(([k, m]) => (
            <Link className="panel" key={k} href={`/admin/${k}`}>
              <h3>{m.title} ↗</h3>
              <p>{m.description}</p>
            </Link>
          ))}
      </div>
      {s.roles.includes("super_admin") && (
        <div className="link-list">
          <Link href="/admin/permissions">Provision operators</Link>
          <Link href="/admin/members">Member directory</Link>
          <Link href="/admin/settings">Launch controls</Link>
          <Link href="/admin/audit">Audit log</Link>
        </div>
      )}
    </>
  );
}
