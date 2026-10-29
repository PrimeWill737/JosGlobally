import { metrics } from "@/lib/server/data";
import { money } from "@/lib/domain";
export async function ImpactFinancials() {
  const m = await metrics();
  return (
    <section style={{ margin: "30px 0" }}>
      <h2 className="section-title">Two journeys. Separate reporting.</h2>
      <div className="stat-grid">
        <div className="stat">
          <small>Verified voluntary giving</small>
          <strong>{m ? money(m.confirmed_minor) : "—"}</strong>
          <p>Net of completed reversals</p>
        </div>
        <div className="stat">
          <small>Verified commercial order value</small>
          <strong>{m ? money(m.commerce_minor) : "—"}</strong>
          <p>Not unrestricted donation funds</p>
        </div>
        <div className="stat">
          <small>Approved allocations</small>
          <strong>{m ? money(m.allocated_minor) : "—"}</strong>
          <p>Tracked against donor restrictions</p>
        </div>
        <div className="stat">
          <small>Approved reconciled spend</small>
          <strong>{m ? money(m.spent_minor) : "—"}</strong>
          <p>Published with supporting evidence</p>
        </div>
        <div className="stat">
          <small>Donation reversals</small>
          <strong>{m ? money(m.donation_refunds_minor) : "—"}</strong>
        </div>
        <div className="stat">
          <small>Unallocated verified funds</small>
          <strong>
            {m
              ? money(BigInt(m.confirmed_minor) - BigInt(m.allocated_minor))
              : "—"}
          </strong>
        </div>
        <div className="stat">
          <small>Publicly recognised supporters</small>
          <strong>{m?.recognised ?? "—"}</strong>
          <p>Explicitly opted in</p>
        </div>
      </div>
    </section>
  );
}
