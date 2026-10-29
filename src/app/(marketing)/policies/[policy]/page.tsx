import { notFound } from "next/navigation";
import { ArrowRight } from "lucide-react";
const policies = {
  returns: {
    title: "Commercial returns & consumer support",
    text: "Product purchases create commercial rights under the accepted merchant terms, independently of the movement contribution programme. Each quote must identify the seller, importer, warranty provider, faulty-goods process, cancellation rules, replacement arrangements, complaint route and refund timing. Final approved merchant terms must be published before commerce checkout opens. Open a linked case from your order to request a return, report damaged or faulty goods, dispute a charge or ask about cancellation. No blanket waiver of applicable consumer rights is intended.",
  },
  donations: {
    title: "Voluntary donation policy",
    text: "A donation is a voluntary gift to declared movement activities. It does not grant product rights, shareholder status, repayment, investment returns, a formal business partnership or preferential programme access. Giving is private by default; public recognition is optional and can be withdrawn. General and approved restricted-project gifts are accounted for separately. A cancelled restricted project requires a documented donor resolution before any reassignment. Refund requests are reviewed under the effective policy and completed reversals remain in the historical ledger. Acknowledgements are not tax-deductible donation receipts. Final operator, purpose and refund terms require approval before donations open.",
  },
};
export default async function Policy({
  params,
}: {
  params: Promise<{ policy: string }>;
}) {
  const { policy } = await params;
  const p = policies[policy as keyof typeof policies];
  if (!p) notFound();
  return (
    <div className="public-page">
      <p className="eyebrow">POLICY · DRAFT PENDING OPERATOR APPROVAL</p>
      <h1>{p.title}</h1>
      <div className="prose">
        <p>{p.text}</p>
        <a className="text-link" href="/account/support">
          Open a support request <ArrowRight size={16} aria-hidden="true" />
        </a>
      </div>
    </div>
  );
}
