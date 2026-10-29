import Link from "next/link";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import { requireSession } from "@/lib/server/auth";
import { database } from "@/lib/server/database";
import { money, label } from "@/lib/domain";
import { QuoteBreakdown } from "@/components/QuoteBreakdown";
export default async function Orders() {
  const s = await requireSession();
  const db = await database();
  const [{ data: orders }, { data: quotes }] = await Promise.all([
    db
      .from("orders")
      .select("*")
      .eq("buyer_id", s.user.id)
      .order("created_at", { ascending: false }),
    db
      .from("quotes")
      .select("*")
      .eq("customer_id", s.user.id)
      .order("created_at", { ascending: false }),
  ]);
  return (
    <>
      <div className="page-heading">
        <p className="eyebrow">YOUR COMMERCIAL JOURNEY</p>
        <h1>Orders & quotations</h1>
        <p>
          Commercial purchases are separate from voluntary contributions. Follow
          pricing, verification, fulfilment and support.
        </p>
      </div>
      <Link className="button" href="/shop">
        Explore Shop Global <ArrowUpRight size={18} aria-hidden="true" />
      </Link>
      <h2 className="section-title" style={{ marginTop: 30 }}>
        Your orders
      </h2>
      {orders?.length ? (
        orders.map((o) => (
          <Link
            className="panel"
            style={{ display: "block" }}
            key={o.id}
            href={`/account/orders/${o.id}`}
          >
            <div className="row">
              <h3>{o.reference}</h3>
              <span className="badge">{label(o.status)}</span>
            </div>
            <p>
              {money(o.total_minor)} · View order, invoice and timeline{" "}
              <ArrowRight size={16} aria-hidden="true" />
            </p>
          </Link>
        ))
      ) : (
        <div className="empty">
          <h3>No orders yet.</h3>
          <p>Start with a product or sourcing quotation.</p>
        </div>
      )}
      <h2 className="section-title" style={{ marginTop: 30 }}>
        Your quotations
      </h2>
      {quotes?.map((q) => (
        <article className="panel" key={q.id}>
          <div className="row">
            <h3>{q.request_details}</h3>
            <span className="badge">{label(q.status)}</span>
          </div>
          <p className="mono">{q.id}</p>
          {["sent", "accepted"].includes(q.status) && (
            <>
              <details>
                <summary>View full price breakdown & disclosures</summary>
                <QuoteBreakdown quote={q} />
              </details>
              {q.status === "sent" && (
                <Link className="button" href={`/checkout/order?quote=${q.id}`}>
                  Review and accept quotation{" "}
                  <ArrowUpRight size={16} aria-hidden="true" />
                </Link>
              )}
            </>
          )}
        </article>
      ))}
    </>
  );
}
