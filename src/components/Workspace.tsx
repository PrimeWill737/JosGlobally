"use client";
import { useEffect, useId, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { Brand } from "./Brand";
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
  ArrowLeft,
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
function NavLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const active =
    href === "/" || href === "/admin" || href === "/dashboard"
      ? pathname === href
      : pathname === href || pathname.startsWith(`${href}/`);
  return (
    <Link
      href={href}
      className={active ? "active" : undefined}
      aria-current={active ? "page" : undefined}
    >
      {children}
    </Link>
  );
}
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
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const menuId = useId();
  const control = Boolean(admin && roles.includes("super_admin"));
  useEffect(() => {
    setOpen(false);
  }, [pathname]);
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [open]);
  return (
    <div
      className={["workspace", open && "nav-open", control && "control"]
        .filter(Boolean)
        .join(" ")}
    >
      <aside id={menuId} className="sidebar">
        <Brand />
        <p className="section-label">
          {control
            ? "CONTROL PANEL"
            : admin
              ? "OPERATIONS WORKSPACE"
              : "PARTNER WORKSPACE"}
        </p>
        <nav aria-label="Workspace navigation" onClick={() => setOpen(false)}>
          {!admin && (
            <>
              <NavLink href="/account/orders">
                <BriefcaseBusiness size={16} />
                Orders & quotations
              </NavLink>
              <NavLink href="/account/recognition">
                <Users size={16} />
                Recognition preferences
              </NavLink>
            </>
          )}
          {control ? (
            <>
              <NavLink href="/admin">
                <LayoutDashboard size={16} />
                Overview
              </NavLink>
              <p className="section-label">People</p>
              <NavLink href="/admin/members">
                <Users size={16} />
                Members
              </NavLink>
              <NavLink href="/admin/permissions">
                <ShieldCheck size={16} />
                Permissions
              </NavLink>
              <NavLink href="/admin/partners">Formal partners</NavLink>
              <NavLink href="/admin/recognition">Recognition</NavLink>
              <p className="section-label">Contributions</p>
              <NavLink href="/admin/donations">
                <Wallet size={16} />
                Verify contributions
              </NavLink>
              <NavLink href="/admin/payments">Order payments</NavLink>
              <NavLink href="/admin/reconciliation">Reconciliation</NavLink>
              <NavLink href="/admin/funds">Restricted funds</NavLink>
              <NavLink href="/admin/audit">
                <FileText size={16} />
                Audit log
              </NavLink>
              <p className="section-label">Platform</p>
              <NavLink href="/admin/settings">
                <Settings size={16} />
                Launch controls
              </NavLink>
              <NavLink href="/admin/commerce">Commerce</NavLink>
              <NavLink href="/admin/orders">Orders</NavLink>
              <NavLink href="/admin/quotes">Quotations</NavLink>
              <NavLink href="/admin/compliance">Compliance</NavLink>
              <NavLink href="/admin/analytics">Analytics</NavLink>
              <p className="section-label">Publish</p>
              {(
                [
                  ["programmes", "Programmes"],
                  ["projects", "Projects"],
                  ["campaigns", "Campaigns"],
                  ["stories", "Stories"],
                  ["reports", "Reports"],
                  ["governance", "Governance"],
                  ["pages", "Pages"],
                  ["destinations", "Destinations"],
                  ["experiences", "Experiences"],
                  ["launch", "Launch readiness"],
                  ["risks", "Risks"],
                ] as const
              ).map(([path, title]) => (
                <NavLink key={path} href={`/admin/${path}`}>
                  {title}
                </NavLink>
              ))}
              <p className="section-label">Review member records</p>
              {(
                [
                  ["applications", "Applications"],
                  ["business", "Business profiles"],
                  ["products", "Products"],
                  ["trade-enquiries", "Trade enquiries"],
                  ["china-desk", "China desk"],
                  ["investor-enquiries", "Investor enquiries"],
                  ["diaspora", "Diaspora"],
                  ["readiness", "Readiness"],
                  ["organisations", "Organisations"],
                  ["support", "Support"],
                  ["consent", "Consent"],
                  ["privacy", "Privacy requests"],
                ] as const
              ).map(([path, title]) => (
                <NavLink key={path} href={`/admin/${path}`}>
                  {title}
                </NavLink>
              ))}
            </>
          ) : admin ? (
            <>
              <NavLink href="/admin">
                <LayoutDashboard size={16} />
                Overview
              </NavLink>
              {roles.some((r) =>
                ["procurement_manager", "super_admin", "auditor"].includes(r),
              ) && (
                <>
                  <NavLink href="/admin/commerce">Commerce & suppliers</NavLink>
                  <NavLink href="/admin/quotes">Quotations</NavLink>
                  <NavLink href="/admin/orders">Orders & fulfilment</NavLink>
                </>
              )}
              {roles.includes("supplier") && (
                <NavLink href="/admin/assigned-orders">Assigned orders</NavLink>
              )}
              {roles.some((r) =>
                [
                  "programme_manager",
                  "finance_approver",
                  "finance_reviewer",
                  "auditor",
                ].includes(r),
              ) && <NavLink href="/admin/funds">Restricted funds & spend</NavLink>}
              {roles.some((r) =>
                ["finance_reviewer", "finance_approver", "auditor"].includes(r),
              ) && (
                <>
                  <NavLink href="/admin/payments">
                    <Wallet size={16} />
                    Order payments
                  </NavLink>
                  <NavLink href="/admin/donations">
                    <Wallet size={16} />
                    Donation verification
                  </NavLink>
                  <NavLink href="/admin/reconciliation">
                    <FileText size={16} />
                    Reconciliation
                  </NavLink>
                </>
              )}
              {Object.entries(modules)
                .filter(([, m]) => roles.includes(m.role))
                .map(([k, m]) => (
                  <NavLink key={k} href={`/admin/${k}`}>
                    <Compass size={15} />
                    {m.title}
                  </NavLink>
                ))}
              {roles.includes("super_admin") && (
                <>
                  <NavLink href="/admin/members">
                    <Users size={16} />
                    Members
                  </NavLink>
                  <NavLink href="/admin/partners">Formal partners</NavLink>
                  <NavLink href="/admin/recognition">Recognition consent</NavLink>
                  <NavLink href="/admin/analytics">Analytics</NavLink>
                  <NavLink href="/admin/compliance">Compliance</NavLink>
                  <NavLink href="/admin/permissions">
                    <ShieldCheck size={16} />
                    Permissions
                  </NavLink>
                  <NavLink href="/admin/settings">
                    <Settings size={16} />
                    Launch controls
                  </NavLink>
                </>
              )}
              {roles.some((r) => ["super_admin", "auditor"].includes(r)) && (
                <NavLink href="/admin/audit">
                  <FileText size={16} />
                  Audit log
                </NavLink>
              )}
            </>
          ) : (
            partnerNav.map(([path, title, Icon]) => (
              <NavLink href={`/dashboard${path ? `/${path}` : ""}`} key={path}>
                <Icon size={16} />
                {title}
              </NavLink>
            ))
          )}
        </nav>
        <div className="sidebar-foot" onClick={() => setOpen(false)}>
          <NavLink href="/">
            <ArrowLeft size={16} aria-hidden="true" /> Back to the movement
          </NavLink>
          {control ? (
            <NavLink href="/dashboard">Member account</NavLink>
          ) : admin ? (
            <NavLink href="/dashboard">Partner workspace</NavLink>
          ) : (
            roles.some(
              (r) => r !== "partner" && r !== "business_representative",
            ) && (
              <NavLink href="/admin">
                {roles.includes("super_admin")
                  ? "Control panel"
                  : "Operations dashboard"}
              </NavLink>
            )
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
      {open && (
        <button
          type="button"
          className="nav-backdrop"
          aria-label="Close menu"
          onClick={() => setOpen(false)}
        />
      )}
      <div className="workspace-main">
        <header className="workspace-top">
          <div className="workspace-title">
            <button
              type="button"
              className="nav-toggle"
              aria-expanded={open}
              aria-controls={menuId}
              onClick={() => setOpen((value) => !value)}
            >
              {open ? (
                <X size={22} strokeWidth={1.6} />
              ) : (
                <Menu size={22} strokeWidth={1.6} />
              )}
              <span className="sr-only">
                {open ? "Close menu" : "Open menu"}
              </span>
            </button>
            <span className="workspace-crumb">
              <span className="crumb-brand">Jos Globally</span>
              <span className="crumb-sep" aria-hidden="true">
                /
              </span>
              <strong>
                {control
                  ? "Control panel"
                  : admin
                    ? "Operations"
                    : "Your partnership"}
              </strong>
            </span>
          </div>
          <p className="workspace-user">
            <span className="workspace-user-name">{name}</span>
            <span className="avatar" aria-hidden="true">
              {name.slice(0, 1).toUpperCase()}
            </span>
          </p>
        </header>
        <main id="main" className="workspace-content">
          {children}
        </main>
      </div>
    </div>
  );
}
