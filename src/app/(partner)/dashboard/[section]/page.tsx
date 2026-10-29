import { notFound } from "next/navigation";
import Link from "next/link";
import { requireSession } from "@/lib/server/auth";
import { database } from "@/lib/server/database";
import { modules, partnerModules } from "@/lib/modules";
import { ModuleView } from "@/components/ModuleView";
import { ActionForm } from "@/components/ActionForm";
import {
  intentAction,
  profileAction,
  refundAction,
} from "@/lib/server/actions";
import { Security } from "@/components/Security";
import { PushSettings } from "@/components/PushSettings";
import { money, label } from "@/lib/domain";
import { pool } from "@/lib/server/postgres";
export default async function PartnerSection({
  params,
}: {
  params: Promise<{ section: string }>;
}) {
  const { section } = await params;
  const s = await requireSession();
  const db = await database();
  if (modules[section] && partnerModules.includes(section))
    return <ModuleView moduleKey={section} />;
  if (section === "security") {
    const { rows } = await pool.query(
      "select password_hash is not null as has_password from app_auth.users where id=$1",
      [s.user.id],
    );
    return (
      <>
        <div className="page-heading">
          <h1>Account security</h1>
          <p>Protect your account and manage active sessions.</p>
        </div>
        <Security hasPassword={rows[0]?.has_password === true} />
      </>
    );
  }
  if (section === "settings")
    return (
      <>
        <div className="page-heading">
          <h1>Account settings</h1>
          <p>Keep your profile current and choose how you appear publicly.</p>
        </div>
        <section className="panel" style={{ maxWidth: 650 }}>
          <ActionForm action={profileAction}>
            <label>
              Full name
              <input
                name="full_name"
                required
                minLength={2}
                defaultValue={s.profile?.full_name}
              />
            </label>
            <label>
              Participation category
              <select name="category" defaultValue={s.profile?.category}>
                {["individual", "business", "organisation", "institution"].map(
                  (v) => (
                    <option key={v} value={v}>
                      {label(v)}
                    </option>
                  ),
                )}
              </select>
            </label>
            <label>
              Country
              <input
                name="country"
                required
                defaultValue={s.profile?.country ?? "Nigeria"}
              />
            </label>
            <label>
              City
              <input name="city" defaultValue={s.profile?.city ?? ""} />
            </label>
            <label className="checkbox">
              <input
                name="public_identity"
                type="checkbox"
                defaultChecked={s.profile?.public_identity}
              />
              I opt in to public identity recognition.
            </label>
          </ActionForm>
          <div className="link-list" style={{ marginTop: 25 }}>
            <Link href="/dashboard/consent">Consent preferences</Link>
            <Link href="/dashboard/privacy">Privacy requests</Link>
            <Link href="/dashboard/security">Security & MFA</Link>
          </div>
        </section>
      </>
    );
  if (section === "notifications") {
    const { data } = await db
      .from("notifications")
      .select("*")
      .eq("owner_id", s.user.id)
      .order("created_at", { ascending: false })
      .limit(100);
    return (
      <>
        <div className="page-heading">
          <h1>Notifications</h1>
          <p>Receipt reviews, programme updates and support messages.</p>
          <PushSettings />
        </div>
        {data?.length ? (
          data.map((n) => (
            <article key={n.id} className="panel">
              <h3>{n.title}</h3>
              <p>{n.body}</p>
              <small>
                {new Date(n.created_at).toLocaleDateString("en-GB")}
              </small>
            </article>
          ))
        ) : (
          <div className="empty">
            <h3>You’re all caught up.</h3>
            <p>Your updates will appear here.</p>
          </div>
        )}
      </>
    );
  }
  if (section === "receipts") {
    const { data } = await db
      .from("payment_evidence")
      .select("*")
      .eq("owner_id", s.user.id)
      .order("created_at", { ascending: false });
    return (
      <>
        <div className="page-heading">
          <h1>Receipts & document vault</h1>
          <p>
            Receipt evidence is private. Access links expire after 60 seconds.
          </p>
        </div>
        {data?.length ? (
          data.map((e) => (
            <article className="panel" key={e.id}>
              <h3>{e.transfer_reference}</h3>
              <p>
                {money(e.amount_minor)} · {e.transfer_date} · Scanned and stored
                privately
              </p>
              <a
                className="text-link"
                href={`/api/evidence/${e.id}`}
                target="_blank"
                rel="noreferrer"
              >
                Open private receipt ↗
              </a>
              <p className="mono">SHA-256 {e.sha256}</p>
            </article>
          ))
        ) : (
          <div className="empty">
            <h3>No receipts yet.</h3>
            <p>Submit proof from your contribution checkout.</p>
          </div>
        )}
        <section className="panel">
          <h2>Private documents</h2>
          <p>
            Store identity, enterprise or project evidence in your private
            vault.
          </p>
          <form
            className="form"
            action="/api/documents"
            method="post"
            encType="multipart/form-data"
          >
            <label>
              Document title
              <input name="title" required maxLength={200} />
            </label>
            <label>
              PDF, JPEG or PNG · Maximum 5 MB
              <input
                type="file"
                name="file"
                accept=".pdf,.jpg,.jpeg,.png"
                required
              />
            </label>
            <button className="button">Upload document</button>
          </form>
        </section>
        <Vault owner={s.user.id} />
      </>
    );
  }
  if (section === "contributions") {
    const [{ data: intents }, { data: confirmed }] = await Promise.all([
      db
        .from("contribution_intents")
        .select("*")
        .eq("owner_id", s.user.id)
        .eq("purpose", "donation")
        .order("created_at", { ascending: false }),
      db
        .from("contributions")
        .select("*")
        .eq("owner_id", s.user.id)
        .eq("purpose", "donation")
        .order("created_at", { ascending: false }),
    ]);
    return (
      <>
        <div className="page-heading">
          <p className="eyebrow">PARTICIPATION WITH PURPOSE</p>
          <h1>Your contributions</h1>
          <p>A clear record of every intent, review and confirmed transfer.</p>
        </div>
        <div className="workspace-grid">
          <section className="panel">
            <h2>Support the movement</h2>
            <Link className="text-link" href="/checkout/donate">
              Choose a project, dedication & recognition →
            </Link>
            <p>
              Voluntary participation starts at NGN 1,000. Contributions do not
              confer ownership or financial returns.
            </p>
            <ActionForm
              action={intentAction}
              submit="Create contribution intent"
            >
              <label>
                Amount (NGN)
                <input
                  name="amount"
                  inputMode="decimal"
                  placeholder="1,000 minimum"
                  required
                  pattern="[0-9]+(\.[0-9]{1,2})?"
                />
              </label>
              <label className="checkbox">
                <input name="terms" type="checkbox" required />
                <span>
                  I accept the <Link href="/terms">terms</Link> and{" "}
                  <Link href="/contribution-policy">contribution policy</Link>.
                  This is not an investment or a purchase of shares.
                </span>
              </label>
            </ActionForm>
          </section>
          <section>
            <h2 className="section-title">Contribution history</h2>
            {intents?.length ? (
              intents.map((i) => (
                <article className="panel" key={i.id}>
                  <div className="row">
                    <h3>{money(i.amount_minor)}</h3>
                    <span className={`badge ${i.status}`}>
                      {label(i.status)}
                    </span>
                  </div>
                  <p className="mono">{i.reference}</p>
                  <Link
                    className="text-link"
                    href={`/partners/checkout?id=${i.id}`}
                  >
                    Details & evidence →
                  </Link>
                </article>
              ))
            ) : (
              <div className="empty">
                <h3>No contributions yet.</h3>
                <p>Create an intent when the approved programme opens.</p>
              </div>
            )}
          </section>
        </div>
        {confirmed?.map((c) => (
          <article className="panel" key={c.id}>
            <h3>{c.acknowledgement_id}</h3>
            <p>
              {money(c.amount_minor)} confirmed on{" "}
              {new Date(c.created_at).toLocaleDateString("en-GB")}
            </p>
            <a className="text-link" href={`/api/acknowledgements/${c.id}`}>
              Download acknowledgement PDF ↗
            </a>
            <details>
              <summary>Request a refund or correction</summary>
              <ActionForm action={refundAction} submit="Request refund">
                <input type="hidden" name="contribution_id" value={c.id} />
                <label>
                  Reason
                  <textarea name="reason" required minLength={5} />
                </label>
              </ActionForm>
            </details>
          </article>
        ))}
      </>
    );
  }
  notFound();
}
async function Vault({ owner }: { owner: string }) {
  const db = await database();
  const { data } = await db
    .from("document_vault")
    .select("*")
    .eq("owner_id", owner)
    .order("created_at", { ascending: false });
  return (
    <>
      {data?.map((d) => (
        <article className="panel" key={d.id}>
          <h3>{d.title}</h3>
          <a
            href={`/api/documents/${d.id}`}
            className="text-link"
            target="_blank"
            rel="noreferrer"
          >
            Open private document ↗
          </a>
        </article>
      ))}
    </>
  );
}
