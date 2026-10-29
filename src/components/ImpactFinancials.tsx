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
          <strong>{money(m?.confirmed_minor ?? 0)}</strong>
          <p>Net of completed reversals</p>
        </div>
        <div className="stat">
          <small>Verified commercial order value</small>
          <strong>{money(m?.commerce_minor ?? 0)}</strong>
          <p>Not unrestricted donation funds</p>
        </div>
        <div className="stat">
          <small>Approved allocations</small>
          <strong>{money(m?.allocated_minor ?? 0)}</strong>
          <p>Tracked against donor restrictions</p>
        </div>
        <div className="stat">
          <small>Approved reconciled spend</small>
          <strong>{money(m?.spent_minor ?? 0)}</strong>
          <p>Published with supporting evidence</p>
        </div>
        <div className="stat">
          <small>Donation reversals</small>
          <strong>{money(m?.donation_refunds_minor ?? 0)}</strong>
        </div>
        <div className="stat">
          <small>Unallocated verified funds</small>
          <strong>
            {money(
              BigInt(m?.confirmed_minor ?? 0) - BigInt(m?.allocated_minor ?? 0),
            )}
          </strong>
        </div>
        <div className="stat">
          <small>Publicly recognised supporters</small>
          <strong>{m?.recognised ?? 0}</strong>
          <p>Explicitly opted in</p>
        </div>
      </div>
    </section>
  );
}
