import Link from "next/link";
import {
  ArrowUpRight,
  FileText,
  Settings,
  ShieldCheck,
  Users,
  Wallet,
} from "lucide-react";
import { requireStaff } from "@/lib/server/auth";
import { database } from "@/lib/server/database";
import { metrics } from "@/lib/server/data";
import { money } from "@/lib/domain";
import { modules, contentModules } from "@/lib/modules";
import { Security } from "@/components/Security";
export default async function Admin() {
  const s = await requireStaff();
  const db = await database();
  const m = await metrics();
  const control = s.roles.includes("super_admin");
  const finance =
    control ||
    s.roles.some((r) =>
      ["finance_reviewer", "finance_approver", "auditor"].includes(r),
    );
  const [{ count: queue }, { count: members }] = await Promise.all([
    finance
      ? db
          .from("contribution_intents")
          .select("*", { count: "exact", head: true })
          .in("status", ["proof_submitted", "under_review"])
      : Promise.resolve({ count: null }),
    control
      ? db.from("profiles").select("*", { count: "exact", head: true })
      : Promise.resolve({ count: null }),
  ]);
  if (control) {
    return (
      <>
        <div className="page-heading">
          <p className="eyebrow">CONTROL PANEL</p>
          <h1>Run the platform.</h1>
          <p>
            Members create contributions and submissions from their own
            accounts. This panel reviews those records, publishes the programme,
            and controls who can operate it.
          </p>
        </div>
        <div className="stat-grid">
          <div className="stat">
            <small>Confirmed contributions</small>
            <strong>{money(m?.confirmed_minor ?? 0)}</strong>
            <p>Settled member contributions, less reversals</p>
          </div>
          <div className="stat">
            <small>Awaiting verification</small>
            <strong>{queue ?? 0}</strong>
            <p>Contribution evidence still in review</p>
          </div>
          <div className="stat">
            <small>Member accounts</small>
            <strong>{members ?? 0}</strong>
            <p>People with a profile on the platform</p>
          </div>
          <div className="stat">
            <small>Published enterprises</small>
            <strong>{m?.businesses ?? 0}</strong>
            <p>Business profiles you have published</p>
          </div>
        </div>
        <div className="control-board">
          <section className="control-group">
            <h2>Contributions</h2>
            <div className="control-links">
              <Link href="/admin/donations">
                <strong>
                  <Wallet size={18} aria-hidden="true" /> Verify contributions
                </strong>
                <span>
                  Review evidence members submitted. Confirm or return a
                  contribution. This does not create one for your account.
                </span>
              </Link>
              <Link href="/admin/reconciliation">
                <strong>
                  <FileText size={18} aria-hidden="true" /> Reconciliation
                </strong>
                <span>Match settled transfers to the ledger.</span>
              </Link>
              <Link href="/admin/funds">
                <strong>
                  <Wallet size={18} aria-hidden="true" /> Restricted funds
                </strong>
                <span>See how confirmed contributions are allocated.</span>
              </Link>
              <Link href="/admin/payments">
                <strong>
                  <Wallet size={18} aria-hidden="true" /> Order payments
                </strong>
                <span>Review commerce payments separately from donations.</span>
              </Link>
            </div>
          </section>
          <section className="control-group">
            <h2>People and access</h2>
            <div className="control-links">
              <Link href="/admin/members">
                <strong>
                  <Users size={18} aria-hidden="true" /> Members
                </strong>
                <span>Directory of accounts. Members submit their own records.</span>
              </Link>
              <Link href="/admin/permissions">
                <strong>
                  <ShieldCheck size={18} aria-hidden="true" /> Permissions
                </strong>
                <span>Grant and revoke operator roles. Your own role stays fixed.</span>
              </Link>
              <Link href="/admin/partners">
                <strong>
                  <Users size={18} aria-hidden="true" /> Formal partners
                </strong>
                <span>Organisations recognised as formal partners.</span>
              </Link>
              <Link href="/admin/audit">
                <strong>
                  <FileText size={18} aria-hidden="true" /> Audit log
                </strong>
                <span>Trace operator decisions.</span>
              </Link>
            </div>
          </section>
          <section className="control-group">
            <h2>Platform</h2>
            <div className="control-links">
              <Link href="/admin/settings">
                <strong>
                  <Settings size={18} aria-hidden="true" /> Launch controls
                </strong>
                <span>Open or hold public programmes and contribution intake.</span>
              </Link>
              <Link href="/admin/launch">
                <strong>
                  <Settings size={18} aria-hidden="true" /> Launch readiness
                </strong>
                <span>Checklist before the movement goes live.</span>
              </Link>
              <Link href="/admin/compliance">
                <strong>
                  <ShieldCheck size={18} aria-hidden="true" /> Compliance
                </strong>
                <span>Policies, consent, and operator obligations.</span>
              </Link>
              <Link href="/admin/commerce">
                <strong>
                  <FileText size={18} aria-hidden="true" /> Commerce
                </strong>
                <span>Suppliers, quotations, and fulfilment.</span>
              </Link>
            </div>
          </section>
          <section className="control-group">
            <h2>Review what members submitted</h2>
            <div className="control-links">
              {(
                [
                  ["applications", "Applications", "Programme applications from members."],
                  ["business", "Business profiles", "Enterprises waiting for a decision."],
                  ["trade-enquiries", "Trade enquiries", "Trade requests members opened."],
                  ["support", "Support", "Requests members sent to the desk."],
                ] as const
              ).map(([path, title, copy]) => (
                <Link key={path} href={`/admin/${path}`}>
                  <strong>
                    {title} <ArrowUpRight size={16} aria-hidden="true" />
                  </strong>
                  <span>{copy}</span>
                </Link>
              ))}
            </div>
          </section>
        </div>
        {s.aal !== "aal2" && (
          <section className="panel" style={{ marginTop: 28 }}>
            <h2>Verify this session</h2>
            <Security gate />
          </section>
        )}
      </>
    );
  }
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
          <ArrowUpRight size={18} aria-hidden="true" />
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
              s.roles.includes(m.role) ||
              (s.roles.includes("content_editor") &&
                contentModules.includes(k)),
          )
          .map(([k, m]) => (
            <Link className="panel" key={k} href={`/admin/${k}`}>
              <h3>
                {m.title} <ArrowUpRight size={16} aria-hidden="true" />
              </h3>
              <p>{m.description}</p>
            </Link>
          ))}
      </div>
    </>
  );
}
