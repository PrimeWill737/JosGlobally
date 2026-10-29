import { notFound } from "next/navigation";
import { configured, database } from "@/lib/server/database";
import { AddToCart } from "@/components/Cart";
import { money, label } from "@/lib/domain";
import { Package } from "lucide-react";
export default async function Product({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  if (!configured()) notFound();
  const { slug } = await params;
  const db = await database();
  const { data: p } = await db
    .from("public_catalog_products")
    .select("*")
    .eq("slug", slug)
    .single();
  if (!p) notFound();
  return (
    <div className="public-page">
      <div className="page-heading">
        <p className="eyebrow">SHOP GLOBAL / {p.category}</p>
        <h1>{p.title}</h1>
        <p>
          {p.sku} · {label(p.listing_type)}
        </p>
      </div>
      <div className="workspace-grid">
        <section>
          <div className="product-art large">
            <Package size={100} strokeWidth={0.8} />
            <span>Product photography pending verified media</span>
          </div>
          <p>{p.specs.description}</p>
          <div className="notice">
            Availability, import eligibility and delivery windows are
            reconfirmed in your quotation. Machinery, vehicles and regulated
            products require product-specific review.
          </div>
        </section>
        <section className="panel record">
          <h2>
            {p.price_minor && new Date(p.price_valid_until) > new Date()
              ? money(p.price_minor)
              : "Quote-only procurement"}
          </h2>
          <p>
            NGN product price where shown. Freight, duties, taxes and other
            landed costs are itemized before acceptance. Price validity:{" "}
            {p.price_valid_until ?? "Confirmed by quotation"}.
          </p>
          <dl>
            {[
              "source_partner",
              "seller_of_record",
              "importer_of_record",
              "warranty_party",
              "partner_roles",
              "origin",
              "condition",
              "warranty",
              "voltage",
              "lead_time",
              "hs_code",
              "import_eligibility",
            ].map((k) => (
              <div key={k}>
                <dt>{label(k)}</dt>
                <dd>{p[k]}</dd>
              </div>
            ))}
          </dl>
          <AddToCart id={p.id} title={p.title} />
        </section>
      </div>
    </div>
  );
}
