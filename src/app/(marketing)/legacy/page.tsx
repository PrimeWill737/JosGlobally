import { configured, database } from "@/lib/server/database";
import Link from "next/link";
export const dynamic = "force-dynamic";
export default async function Legacy() {
  const rows = configured()
    ? ((
        await (
          await database()
        )
          .from("public_legacy_wall")
          .select("*")
          .limit(200)
      ).data ?? [])
    : [];
  return (
    <div className="public-page">
      <div className="page-heading">
        <p className="eyebrow">OUR LEGACY WALL · OPT-IN RECOGNITION</p>
        <h1>
          A shared story.
          <br />
          <em>A lasting thank you.</em>
        </h1>
        <p>
          Recognising verified supporters who have chosen to be named. Giving is
          voluntary. Recognition is not equity, a redeemable balance or a
          promise of privileges.
        </p>
      </div>
      {rows.length ? (
        <div className="card-grid">
          {rows.map((r, i) => (
            <article className="panel" key={i}>
              <span className="badge">{r.recognition_type}</span>
              <h3 style={{ marginTop: 15 }}>{r.public_alias}</h3>
              <p>{r.city}</p>
              <p>{r.message}</p>
            </article>
          ))}
        </div>
      ) : (
        <div className="empty">
          <h3>Recognition begins with your choice.</h3>
          <p>No private or anonymous supporter is named here.</p>
        </div>
      )}
      <Link className="text-link" href="/account/recognition">
        Manage my recognition →
      </Link>
    </div>
  );
}
