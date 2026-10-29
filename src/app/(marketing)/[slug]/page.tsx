import { ImpactFinancials } from "@/components/ImpactFinancials";
import { notFound } from "next/navigation";
import Link from "next/link";
import { publicPages } from "@/lib/content";
import { published, metrics } from "@/lib/server/data";
import { money, label } from "@/lib/domain";
export const dynamic = "force-dynamic";
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return { title: publicPages[slug]?.title ?? "Page not found" };
}
export default async function Page({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const p = publicPages[slug];
  if (!p) notFound();
  const rows = p.table ? await published(p.table) : [];
  const m = slug === "impact" ? await metrics() : null;
  return (
    <div className="public-page">
      <div className="page-heading">
        <p className="eyebrow">{p.eyebrow}</p>
        <h1>{p.title}</h1>
        <p>{p.intro}</p>
      </div>
      {slug === "impact" && (
        <div className="stat-grid">
          <div className="stat">
            <small>Net confirmed contributions</small>
            <strong>{money(m?.confirmed_minor ?? 0)}</strong>
            <p>Pending transfers excluded</p>
          </div>
          <div className="stat">
            <small>Active partners</small>
            <strong>{m?.partners ?? 0}</strong>
          </div>
          <div className="stat">
            <small>Verified enterprises</small>
            <strong>{m?.businesses ?? 0}</strong>
          </div>
          <div className="stat">
            <small>Published opportunities</small>
            <strong>{m?.opportunities ?? 0}</strong>
          </div>
        </div>
      )}
      {slug === "impact" && <ImpactFinancials />}
      <div className="prose">
        {p.sections.map((s) => (
          <section key={s.title}>
            <h2>{s.title}</h2>
            <p>{s.body}</p>
          </section>
        ))}
      </div>
      {p.table && (
        <section style={{ marginTop: 40 }}>
          <h2 className="section-title">
            Published {label(p.table).toLowerCase()}
          </h2>
          {rows.length ? (
            <div className="card-grid">
              {rows.map((r) => (
                <article className="panel record" id={r.id} key={r.id}>
                  <span className="badge published">Reviewed & published</span>
                  <h3 style={{ marginTop: 16 }}>{r.title}</h3>
                  <p>{r.summary}</p>
                  <dl>
                    {Object.entries(r.data ?? {})
                      .filter(([k]) => !["review_note", "consent"].includes(k))
                      .map(([k, v]) => (
                        <div key={k}>
                          <dt>{label(k)}</dt>
                          <dd>{String(v)}</dd>
                        </div>
                      ))}
                  </dl>
                  <small className="mono">Reference: {r.id}</small>
                  {slug === "opportunities" && (
                    <Link
                      className="button small"
                      href="/dashboard/investor-enquiries"
                    >
                      Enquire about this project
                    </Link>
                  )}
                </article>
              ))}
            </div>
          ) : (
            <div className="empty">
              <h3>Good things begin with verified information.</h3>
              <p>
                Reviewed records will appear here when they are ready for
                publication.
              </p>
            </div>
          )}
        </section>
      )}
      {p.cta && (
        <Link className="button" style={{ marginTop: 30 }} href={p.cta.href}>
          {p.cta.text} ↗
        </Link>
      )}
      {["trade", "discover", "opportunities"].includes(slug) && (
        <div className="link-list" style={{ marginTop: 30 }}>
          <Link href="/directory">Business directory</Link>
          <Link href="/programmes">Programmes</Link>
          <Link href="/experiences">Experiences & events</Link>
          <Link href="/dashboard/diaspora">Diaspora connections</Link>
        </div>
      )}
    </div>
  );
}
