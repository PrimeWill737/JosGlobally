import Link from "next/link";
import { Brand } from "./PublicShell";
import {
  LayoutDashboard,
  Wallet,
  FileText,
  BriefcaseBusiness,
  Compass,
  Settings,
  ShieldCheck,
  Users,
  Bell,
  LifeBuoy,
  Globe2,
  LogOut,
} from "lucide-react";
import { logout } from "@/lib/server/actions";
import { modules } from "@/lib/modules";
const partnerNav = [
  ["", "Overview", LayoutDashboard],
  ["contributions", "Contributions", Wallet],
  ["receipts", "Receipts & vault", FileText],
  ["applications", "Applications", Compass],
  ["business", "My business", BriefcaseBusiness],
  ["trade-enquiries", "Trade enquiries", Globe2],
  ["notifications", "Notifications", Bell],
  ["support", "Support", LifeBuoy],
  ["settings", "Account settings", Settings],
  ["security", "Security", ShieldCheck],
] as const;
export function Workspace({
  children,
  admin = false,
  name,
  roles = [],
}: {
  children: React.ReactNode;
  admin?: boolean;
  name: string;
  roles?: string[];
}) {
  return (
    <div className="workspace">
      <aside className="sidebar">
        <Brand />
        <p className="section-label">
          {admin ? "OPERATIONS WORKSPACE" : "PARTNER WORKSPACE"}
        </p>
        <nav aria-label="Workspace navigation">
          {!admin && (
            <>
              <Link href="/account/orders">
                <BriefcaseBusiness size={16} />
                Orders & quotations
              </Link>
              <Link href="/account/recognition">
                <Users size={16} />
                Recognition preferences
              </Link>
            </>
          )}
          {admin ? (
            <>
              <Link href="/admin">
                <LayoutDashboard size={16} />
                Overview
              </Link>
              {roles.some((r) =>
                ["procurement_manager", "super_admin", "auditor"].includes(r),
              ) && (
                <>
                  <Link href="/admin/commerce">Commerce & suppliers</Link>
                  <Link href="/admin/quotes">Quotations</Link>
                  <Link href="/admin/orders">Orders & fulfilment</Link>
                </>
              )}
              {roles.includes("supplier") && (
                <Link href="/admin/assigned-orders">Assigned orders</Link>
              )}
              {roles.some((r) =>
                [
                  "programme_manager",
                  "finance_approver",
                  "finance_reviewer",
                  "auditor",
                ].includes(r),
              ) && <Link href="/admin/funds">Restricted funds & spend</Link>}
              {roles.some((r) =>
                ["finance_reviewer", "finance_approver", "auditor"].includes(r),
              ) && (
                <>
                  <Link href="/admin/payments">
                    <Wallet size={16} />
                    Order payments
                  </Link>
                  <Link href="/admin/donations">
                    <Wallet size={16} />
                    Donation verification
                  </Link>
                  <Link href="/admin/reconciliation">
                    <FileText size={16} />
                    Reconciliation
                  </Link>
                </>
              )}
              {Object.entries(modules)
                .filter(
                  ([, m]) =>
                    roles.includes("super_admin") || roles.includes(m.role),
                )
                .map(([k, m]) => (
                  <Link key={k} href={`/admin/${k}`}>
                    <Compass size={15} />
                    {m.title}
                  </Link>
                ))}
              {roles.includes("super_admin") && (
                <>
                  <Link href="/admin/members">
                    <Users size={16} />
                    Members
                  </Link>
                  <Link href="/admin/partners">Formal partners</Link>
                  <Link href="/admin/recognition">Recognition consent</Link>
                  <Link href="/admin/analytics">Analytics</Link>
                  <Link href="/admin/compliance">Compliance</Link>
                  <Link href="/admin/permissions">
                    <ShieldCheck size={16} />
                    Permissions
                  </Link>
                  <Link href="/admin/settings">
                    <Settings size={16} />
                    Launch controls
                  </Link>
                </>
              )}
              {roles.some((r) => ["super_admin", "auditor"].includes(r)) && (
                <Link href="/admin/audit">
                  <FileText size={16} />
                  Audit log
                </Link>
              )}
            </>
          ) : (
            partnerNav.map(([path, title, Icon]) => (
              <Link href={`/dashboard${path ? `/${path}` : ""}`} key={path}>
                <Icon size={16} />
                {title}
              </Link>
            ))
          )}
        </nav>
        <div className="sidebar-foot">
          <Link href="/">↗ Back to the movement</Link>
          {admin ? (
            <Link href="/dashboard">Partner workspace</Link>
          ) : (
            roles.some(
              (r) => r !== "partner" && r !== "business_representative",
            ) && <Link href="/admin">Operations dashboard</Link>
          )}
          <form action={logout}>
            <button
              className="text-link"
              style={{ background: "none", color: "inherit", padding: 0 }}
            >
              <LogOut size={14} /> Sign out
            </button>
          </form>
        </div>
      </aside>
      <div className="workspace-main">
        <header className="workspace-top">
          <span>
            Jos Globally &nbsp; / &nbsp;{" "}
            <strong>{admin ? "Operations" : "Your partnership"}</strong>
          </span>
          <div className="row">
            <span>{name}</span>
            <span className="avatar">{name.slice(0, 1).toUpperCase()}</span>
          </div>
        </header>
        <main id="main" className="workspace-content">
          {children}
        </main>
      </div>
    </div>
  );
}
