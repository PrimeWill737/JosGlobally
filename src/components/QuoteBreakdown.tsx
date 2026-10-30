import { costFields, commercialDisclosures } from "@/lib/commerce";
import { money, label, shown } from "@/lib/domain";
export function QuoteBreakdown({ quote: q }: { quote: Record<string, any> }) {
  return (
    <div className="record">
      <dl>
        {costFields.map((k) => (
          <div className="row" key={k}>
            <dt>{label(k)}</dt>
            <dd>{money(q[k] ?? 0)}</dd>
          </div>
        ))}
        <div className="row">
          <dt>Total landed quotation · NGN</dt>
          <dd>
            <strong>{money(q.total_minor ?? 0)}</strong>
          </dd>
        </div>
        {commercialDisclosures.map((k) => (
          <div key={k}>
            <dt>{label(k)}</dt>
            <dd>{q[k] || "Awaiting quotation"}</dd>
          </div>
        ))}
        <div>
          <dt>Exchange rate and validity</dt>
          <dd>
            {q.fx_rate ?? "—"} · {q.fx_source ?? "—"} · {shown(q.fx_at)}
          </dd>
        </div>
        <div>
          <dt>Quote expires</dt>
          <dd>
            {q.expires_at
              ? new Date(q.expires_at).toLocaleString("en-GB")
              : "Not issued"}
          </dd>
        </div>
      </dl>
    </div>
  );
}
