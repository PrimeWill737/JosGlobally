import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { requireSession } from "@/lib/server/auth";
import { database } from "@/lib/server/database";
import { money, label } from "@/lib/domain";
import { QuoteBreakdown } from "@/components/QuoteBreakdown";
import { ActionForm } from "@/components/ActionForm";
import { disputeAction } from "@/lib/server/commerce-actions";
import { refundAction } from "@/lib/server/actions";
export default async function Order({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const s = await requireSession();
  const db = await database();
  const { data: o } = await db
    .from("orders")
    .select("*,quotes(*)")
    .eq("id", id)
    .eq("buyer_id", s.user.id)
    .single();
  if (!o) notFound();
  const [
    { data: items },
    { data: events },
    { data: shipments },
    { data: payment },
    { data: cases },
    { data: docs },
  ] = await Promise.all([
    db.from("order_items").select("*").eq("order_id", id),
    db.from("order_events").select("*").eq("order_id", id).order("created_at"),
    db.from("shipments").select("*").eq("order_id", id),
    db.from("contribution_intents").select("*").eq("order_id", id).single(),
    db.from("disputes").select("*").eq("order_id", id),
    db.from("customs_docs").select("*").eq("order_id", id),
  ]);
  const { data: settlement } = payment
    ? await db
        .from("contributions")
        .select("id")
        .eq("intent_id", payment.id)
        .maybeSingle()
    : { data: null };
  return (
    <>
      <div className="page-heading">
        <p className="eyebrow">ORDER TRACKING</p>
        <h1>{o.reference}</h1>
        <span className="badge">{label(o.status)}</span>
        <p>{money(o.total_minor)} · Commercial purchase, not a donation.</p>
      </div>
      <div className="workspace-grid">
        <section>
          <article className="panel">
            <h2>Order items</h2>
            {items?.map((i) => (
              <p key={i.id}>
                {i.quantity} × {i.description} · {money(i.unit_price_minor)}{" "}
                each
              </p>
            ))}
            <QuoteBreakdown quote={o.quotes} />
            <a className="text-link" href={`/api/orders/${o.id}/invoice`}>
              Download order invoice PDF{" "}
              <ArrowUpRight size={16} aria-hidden="true" />
            </a>
            {payment &&
              ["awaiting_payment", "needs_information"].includes(
                payment.status,
              ) && (
                <Link href={`/checkout/order?order=${o.id}`} className="button">
                  Payment instructions & proof{" "}
                  <ArrowUpRight size={16} aria-hidden="true" />
                </Link>
              )}
          </article>
          <article className="panel">
            <h2>Delivery details</h2>
            <p>
              {o.delivery.name}
              <br />
              {o.delivery.phone}
              <br />
              {o.delivery.address}
            </p>
          </article>
        </section>
        <section>
          <article className="panel">
            <h2>Your order timeline</h2>
            <div className="steps">
              {events?.map((e) => (
                <div key={e.id} className="step">
                  <div>
                    <h3>{label(e.status)}</h3>
                    <p>{e.note}</p>
                    <small>
                      {new Date(e.created_at).toLocaleString("en-GB")}
                    </small>
                  </div>
                </div>
              ))}
            </div>
          </article>
          {shipments?.map((sh) => (
            <article className="panel" key={sh.id}>
              <h3>
                {sh.carrier} · {sh.tracking}
              </h3>
              <p>{sh.milestone}</p>
              <p>Estimated window: {sh.estimated_window}</p>
            </article>
          ))}
          {docs?.map((d) => (
            <article className="panel" key={d.id}>
              <h3>{d.title}</h3>
              <a className="text-link" href={`/api/order-documents/${d.id}`}>
                Open private {d.kind} evidence{" "}
                <ArrowUpRight size={16} aria-hidden="true" />
              </a>
            </article>
          ))}
          <article className="panel">
            <h2>Returns, disputes & help</h2>
            <ActionForm
              action={disputeAction}
              submit="Open linked support case"
            >
              <input type="hidden" name="order_id" value={o.id} />
              <label>
                Request
                <select name="kind">
                  {["dispute", "return", "cancellation", "failed_delivery"].map(
                    (k) => (
                      <option key={k} value={k}>
                        {label(k)}
                      </option>
                    ),
                  )}
                </select>
              </label>
              <label>
                What happened?
                <textarea name="reason" required minLength={5} />
              </label>
            </ActionForm>
            {settlement && (
              <details>
                <summary>Request payment refund</summary>
                <ActionForm
                  action={refundAction}
                  submit="Submit refund request"
                >
                  <input
                    type="hidden"
                    name="contribution_id"
                    value={settlement.id}
                  />
                  <label>
                    Reason
                    <textarea name="reason" required minLength={5} />
                  </label>
                </ActionForm>
              </details>
            )}
          </article>
          {cases?.map((c) => (
            <article className="panel" key={c.id}>
              <span className="badge">{label(c.status)}</span>
              <p className="mono">Case {c.id}</p>
              <p>{c.reason}</p>
              <p>{c.response}</p>
            </article>
          ))}
        </section>
      </div>
    </>
  );
}
