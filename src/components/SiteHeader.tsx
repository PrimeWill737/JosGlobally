"use client";
import { useEffect, useId, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowUpRight, Menu, X } from "lucide-react";
import { Brand } from "./Brand";
const links = [
  ["/shop", "Shop Global"],
  ["/how-orders-work", "How ordering works"],
  ["/contribute", "Contribute"],
  ["/impact", "Our impact"],
] as const;
export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const menuId = useId();
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
    <header className={open ? "site-header nav-open" : "site-header"}>
      <Brand tagline={false} />
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
        <span className="sr-only">{open ? "Close menu" : "Open menu"}</span>
      </button>
      {open && (
        <button
          type="button"
          className="nav-backdrop"
          aria-label="Close menu"
          onClick={() => setOpen(false)}
        />
      )}
      <div id={menuId} className="site-nav">
        <nav aria-label="Main navigation">
          {links.map(([href, label]) => (
            <Link key={href} href={href}>
              {label}
            </Link>
          ))}
        </nav>
        <div className="header-actions">
          <Link href="/login" className="login-link">
            Sign in
          </Link>
          <Link href="/contribute" className="button small">
            Support the movement <ArrowUpRight size={16} />
          </Link>
        </div>
      </div>
    </header>
  );
}
