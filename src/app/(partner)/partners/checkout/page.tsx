import { requireSession } from "@/lib/server/auth";
import { database } from "@/lib/server/database";
import { Workspace } from "@/components/Workspace";
import { notFound } from "next/navigation";
import { money, label } from "@/lib/domain";
import Link from "next/link";
export const dynamic = "force-dynamic";
export default async function Checkout({
  searchParams,
}: {
  searchParams: Promise<{ id?: string }>;
}) {
  const s = await requireSession();
  const { id } = await searchParams;
  const db = await database();
  if (!id || !/^[a-f0-9-]{36}$/i.test(id)) notFound();
  const { data: i } = await db
    .from("contribution_intents")
    .select("*,bank_accounts(*)")
    .eq("id", id)
    .eq("owner_id", s.user.id)
    .single();
  if (!i) notFound();
  const bank = i.bank_accounts;
  const open =
    ["awaiting_payment", "needs_information"].includes(i.status) &&
    new Date(i.expires_at) > new Date();
  return (
    <Workspace name={s.profile?.full_name || "Partner"} roles={s.roles}>
      <div className="page-heading">
        <p className="eyebrow">SECURE CONTRIBUTION</p>
        <h1>
          {i.purpose === "order"
            ? "Your order payment"
            : "Your voluntary contribution"}
        </h1>
        <p>
          {i.purpose === "order"
            ? "Commercial order payment · not a donation."
            : "A voluntary gift · no automatic partnership, equity or financial entitlement."}
        </p>
        <p>
          Verify recipient details before transfer. Proof is evidence, not
          settlement.
        </p>
      </div>
      <div className="workspace-grid">
        <section className="panel record">
          <div className="row">
            <h2>{money(i.amount_minor)}</h2>
            <span className={`badge ${i.status}`}>{label(i.status)}</span>
          </div>
          <p className="mono">{i.reference}</p>
          {open && bank?.approved ? (
            <dl>
              <div>
                <dt>Corporate beneficiary</dt>
                <dd>{bank.legal_name}</dd>
              </div>
              <div>
                <dt>Bank</dt>
                <dd>{bank.bank_name}</dd>
              </div>
              <div>
                <dt>Account number</dt>
                <dd>{bank.account_number}</dd>
              </div>
              <div>
                <dt>Currency</dt>
                <dd>NGN</dd>
              </div>
              <div>
                <dt>Transfer reference</dt>
                <dd>{i.reference}</dd>
              </div>
              <div>
                <dt>Expires</dt>
                <dd>
                  {new Date(i.expires_at).toLocaleString("en-GB", {
                    timeZone: "Africa/Lagos",
                  })}{" "}
                  WAT
                </dd>
              </div>
            </dl>
          ) : (
            <p className="notice">
              This intent is no longer accepting transfers. Check its status or
              contact support.
            </p>
          )}
          <Link href="/dashboard/support" className="text-link">
            Need help? →
          </Link>
        </section>
        <section className="panel">
          <h2>Submit transfer evidence</h2>
          {open ? (
            <form
              className="form"
              action="/api/evidence"
              method="post"
              encType="multipart/form-data"
            >
              <input name="intent_id" type="hidden" value={i.id} />
              <label>
                Bank transfer reference
                <input name="transfer_reference" required maxLength={200} />
              </label>
              <label>
                Amount transferred (NGN)
                <input name="amount" inputMode="decimal" required />
              </label>
              <label>
                Transfer date
                <input name="transfer_date" type="date" required />
              </label>
              <label>
                Receipt · PDF, JPEG or PNG, up to 5 MB
                <input
                  name="file"
                  type="file"
                  accept=".jpg,.jpeg,.png"
                  required
                />
              </label>
              <p>
                Files are scanned, hashed and stored privately. The review
                target is 1–2 business days after sufficient bank evidence is
                available.
              </p>
              <button className="button">Submit for review ↗</button>
            </form>
          ) : (
            <p>
              Your current status is {label(i.status).toLowerCase()}.{" "}
              <Link href="/dashboard/contributions">Return to history →</Link>
            </p>
          )}
        </section>
      </div>
    </Workspace>
  );
}
