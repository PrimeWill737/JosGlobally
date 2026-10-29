import Link from "next/link";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import { requireSession } from "@/lib/server/auth";
import { database } from "@/lib/server/database";
import { money, label } from "@/lib/domain";
import { partnerModules, modules } from "@/lib/modules";
export default async function Dashboard() {
  const s = await requireSession();
  const db = await database();
  const [
    { data: intents },
    { data: membership },
    { count: applications },
    { data: contributions },
    { data: refunds },
  ] = await Promise.all([
    db
      .from("contribution_intents")
      .select("*")
      .eq("owner_id", s.user.id)
      .eq("purpose", "donation")
      .order("created_at", { ascending: false })
      .limit(5),
    db.from("memberships").select("*").eq("owner_id", s.user.id).maybeSingle(),
    db
      .from("applications")
      .select("*", { count: "exact", head: true })
      .eq("owner_id", s.user.id),
    db
      .from("contributions")
      .select("amount_minor")
      .eq("owner_id", s.user.id)
      .eq("purpose", "donation"),
    db
      .from("refunds")
      .select("amount_minor,contributions!inner(purpose)")
      .eq("status", "paid")
      .eq("contributions.purpose", "donation"),
  ]);
  const total =
    (contributions ?? []).reduce((n, c) => n + BigInt(c.amount_minor), 0n) -
    (refunds ?? []).reduce((n, r) => n + BigInt(r.amount_minor), 0n);
  return (
    <>
      <div className="page-heading">
        <p className="eyebrow">YOUR PARTNER OVERVIEW</p>
        <h1>
          Welcome
          {s.profile?.full_name
            ? `, ${s.profile.full_name.split(" ")[0]}`
            : " to the movement"}
          .
        </h1>
        <p>
          Your participation, progress and next opportunities, all in one place.
        </p>
      </div>
      <section className="dashboard-welcome">
        <div>
          <p className="eyebrow">ROOTED HERE. CONNECTED EVERYWHERE.</p>
          <h2>Your journey starts with possibility.</h2>
          <p>
            Complete your profile, discover the movement and find a meaningful
            way to take part.
          </p>
        </div>
        <Link className="button ivory" href="/dashboard/settings">
          Complete your profile <ArrowUpRight size={18} aria-hidden="true" />
        </Link>
      </section>
      <div className="stat-grid">
        <div className="stat">
          <small>Confirmed contribution</small>
          <strong>{money(total)}</strong>
          <p>Historical gifts, not a redeemable balance</p>
        </div>
        <div className="stat">
          <small>Partnership status</small>
          <strong style={{ fontSize: "1.4375rem" }}>
            {label(membership?.status ?? "pending")}
          </strong>
          <p>Requires a separate approved agreement</p>
        </div>
        <div className="stat">
          <small>Applications</small>
          <strong>{applications ?? 0}</strong>
          <p>Programme participation</p>
        </div>
        <div className="stat">
          <small>Your next step</small>
          <strong>Connect</strong>
          <Link href="/programmes">
            Explore programmes <ArrowUpRight size={16} aria-hidden="true" />
          </Link>
        </div>
      </div>
      <div className="row">
        <h2 className="section-title">Recent contributions</h2>
        <Link href="/dashboard/contributions" className="text-link">
          View all <ArrowRight size={16} aria-hidden="true" />
        </Link>
      </div>
      {intents?.length ? (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Reference</th>
                <th>Amount</th>
                <th>Status</th>
                <th>Next step</th>
              </tr>
            </thead>
            <tbody>
              {intents.map((i) => (
                <tr key={i.id}>
                  <td>{i.reference}</td>
                  <td>{money(i.amount_minor)}</td>
                  <td>
                    <span className={`badge ${i.status}`}>
                      {label(i.status)}
                    </span>
                  </td>
                  <td>
                    <Link href={`/partners/checkout?id=${i.id}`}>
                      View details <ArrowUpRight size={16} aria-hidden="true" />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="empty">
          <h3>Your contribution journey is ahead.</h3>
          <p>
            Start with the programme terms and contribute when the approved
            programme opens.
          </p>
          <Link className="text-link" href="/dashboard/contributions">
            Explore contributions <ArrowRight size={16} aria-hidden="true" />
          </Link>
        </div>
      )}
      <h2 className="section-title" style={{ marginTop: 32 }}>
        Make your connection
      </h2>
      <div className="link-list">
        {partnerModules
          .filter((k) => !["consent", "privacy"].includes(k))
          .map((k) => (
            <Link key={k} href={`/dashboard/${k}`}>
              {modules[k].title} <ArrowUpRight size={16} aria-hidden="true" />
            </Link>
          ))}
      </div>
    </>
  );
}
