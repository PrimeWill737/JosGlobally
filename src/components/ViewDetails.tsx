"use client";
import { useState } from "react";
export function ViewDetails({
  title,
  badge,
  detail,
  amount,
  children,
}: {
  title: string;
  badge?: React.ReactNode;
  detail?: React.ReactNode;
  amount?: React.ReactNode;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <article className="panel evidence-card">
      <div className="evidence-head">
        <div className="evidence-main">
          <h3>{title}</h3>
          {detail ? <p className="evidence-meta">{detail}</p> : null}
          <button
            type="button"
            className="button small outline"
            aria-expanded={open}
            onClick={() => setOpen((value) => !value)}
          >
            {open ? "Hide details" : "View details"}
          </button>
        </div>
        <div className="evidence-aside">
          {amount ? <p className="evidence-amount">{amount}</p> : null}
          {badge}
        </div>
      </div>
      {open ? <div className="evidence-body">{children}</div> : null}
    </article>
  );
}
