import { notFound } from "next/navigation";
import { requireSession } from "@/lib/server/auth";
import { database } from "@/lib/server/database";
import { Workspace } from "@/components/Workspace";
import { QuoteBreakdown } from "@/components/QuoteBreakdown";
import { ActionForm } from "@/components/ActionForm";
import { acceptQuoteAction } from "@/lib/server/commerce-actions";
import Payment from "../../partners/checkout/page";
export default async function Checkout({
  searchParams,
}: {
  searchParams: Promise<{ quote?: string; order?: string }>;
}) {
  const { quote, order } = await searchParams;
  const s = await requireSession();
  const db = await database();
  if (order) {
    const { data: i } = await db
      .from("contribution_intents")
      .select("id")
      .eq("order_id", order)
      .eq("owner_id", s.user.id)
      .single();
    if (!i) notFound();
    return <Payment searchParams={Promise.resolve({ id: i.id })} />;
  }
  if (!quote) notFound();
  const { data: q } = await db
    .from("quotes")
    .select("*")
    .eq("id", quote)
    .eq("customer_id", s.user.id)
    .single();
  if (!q || !["sent", "accepted"].includes(q.status)) notFound();
  return (
    <Workspace name={s.profile?.full_name || "Customer"} roles={s.roles}>
      <div className="page-heading">
        <p className="eyebrow">COMMERCIAL CHECKOUT</p>
        <h1>Review your landed-cost quotation.</h1>
        <p>
          This is a product purchase. It is separate from voluntary
          contributions and conveys only the rights set out in your merchant
          terms.
        </p>
      </div>
      <div className="workspace-grid">
        <section className="panel">
          <h2>Approved quotation</h2>
          <QuoteBreakdown quote={q} />
        </section>
        <section className="panel">
          <h2>Contact & delivery</h2>
          <ActionForm
            action={acceptQuoteAction}
            submit="Accept quote & create order"
          >
            <input type="hidden" name="quote_id" value={q.id} />
            <input type="hidden" name="terms_version" value={q.terms_version} />
            <label>
              Recipient name
              <input
                name="name"
                required
                defaultValue={s.profile?.full_name ?? ""}
              />
            </label>
            <label>
              Phone
              <input name="phone" type="tel" required />
            </label>
            <label>
              Delivery address
              <textarea name="address" required minLength={5} />
            </label>
            <label className="checkbox">
              <input type="checkbox" name="terms" required />
              <span>
                I accept merchant terms version {q.terms_version}, the quoted
                landed costs, FX responsibilities and delivery assumptions. Any
                additional charge requires my separate acceptance. I have read
                the <a href="/policies/returns">returns policy</a>.
              </span>
            </label>
          </ActionForm>
          <p className="notice">
            Your order request is subject to payment and availability
            verification. No payment is confirmed by accepting a quotation.
          </p>
        </section>
      </div>
    </Workspace>
  );
}
