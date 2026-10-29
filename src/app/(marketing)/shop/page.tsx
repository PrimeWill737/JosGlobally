import Link from "next/link";
import { Package, ArrowUpRight } from "lucide-react";
import { configured, database } from "@/lib/server/database";
import { money, label } from "@/lib/domain";
export const dynamic = "force-dynamic";
export default async function Shop({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; q?: string }>;
}) {
  const { category, q } = await searchParams;
  let products: Record<string, any>[] = [];
  let categories: Record<string, string>[] = [];
  if (configured()) {
    const db = await database();
    let query = db.from("public_catalog_products").select("*");
    if (category) query = query.eq("category_slug", category);
    if (q)
      query = query.ilike(
        "title",
        `%${q.replaceAll("%", "").replaceAll("_", "").slice(0, 100)}%`,
      );
    const [{ data: p }, { data: c }] = await Promise.all([
      query.limit(100),
      db.from("product_categories").select("*"),
    ]);
    products = p ?? [];
    categories = c ?? [];
  }
  return (
    <div className="public-page">
      <div className="page-heading">
        <p className="eyebrow">SHOP GLOBAL · SOURCED WITH CARE</p>
        <h1>
          Global products.
          <br />
          <em>Clearer possibilities.</em>
        </h1>
        <p>
          Explore reviewed products and request an itemized landed-cost quote.
          Know the seller, sourcing partner, import responsibilities and
          delivery assumptions before you pay.
        </p>
      </div>
      <div className="link-list">
        <Link href="/how-orders-work">How ordering works</Link>
        <Link href="/cart">Quote cart</Link>
        <Link href="/account/orders">Track my orders</Link>
      </div>
      <form className="form panel" style={{ marginTop: 25 }}>
        <div className="row">
          <label style={{ flex: 1 }}>
            Find a product
            <input name="q" defaultValue={q} placeholder="Search products" />
          </label>
          <label style={{ flex: 1 }}>
            Category
            <select name="category" defaultValue={category ?? ""}>
              <option value="">All categories</option>
              {categories.map((c) => (
                <option key={c.id} value={c.slug}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
          <button className="button" style={{ alignSelf: "end" }}>
            Search
          </button>
        </div>
      </form>
      {products.length ? (
        <div className="card-grid">
          {products.map((p) => (
            <Link className="panel" key={p.id} href={`/shop/${p.slug}`}>
              <div className="product-art">
                <Package size={55} strokeWidth={1} />
                <span>{p.category}</span>
              </div>
              <span className="badge">{label(p.listing_type)}</span>
              <h3 style={{ marginTop: 15 }}>{p.title}</h3>
              <p>
                {p.source_partner} · {p.origin}
              </p>
              <strong>
                {p.price_minor && new Date(p.price_valid_until) > new Date()
                  ? `${money(p.price_minor)} product price`
                  : "Request a quotation"}
              </strong>
              <p>Full landed costs confirmed in your quotation.</p>
              <span className="text-link">
                View specifications <ArrowUpRight size={16} />
              </span>
            </Link>
          ))}
        </div>
      ) : (
        <div className="empty">
          <Package size={40} strokeWidth={1} />
          <h3>A catalogue built on verified sourcing.</h3>
          <p>
            Products will appear after supplier and import-compliance review. No
            unverified stock or delivery promises.
          </p>
          <Link className="text-link" href="/dashboard/china-desk">
            Request sourcing support →
          </Link>
        </div>
      )}
    </div>
  );
}
