import { database } from "@/lib/server/database";
import { requireStaff } from "@/lib/server/auth";
import { ActionForm } from "./ActionForm";
import { DataTable } from "./DataTable";
import { procurementAction } from "@/lib/server/commerce-actions";
import { costFields, commercialDisclosures } from "@/lib/commerce";
import { label } from "@/lib/domain";
import { QuoteBreakdown } from "./QuoteBreakdown";
const Input = ({
  name,
  type = "text",
  required = true,
}: {
  name: string;
  type?: string;
  required?: boolean;
}) => (
  <label>
    {label(name)}
    <input name={name} type={type} required={required} />
  </label>
);
const Op = ({ value }: { value: string }) => (
  <input name="operation" value={value} type="hidden" />
);
export async function CommerceAdmin({ section }: { section: string }) {
  const s = await requireStaff(
    section === "assigned-orders"
      ? ["supplier"]
      : section === "commerce"
        ? ["procurement_manager", "super_admin", "auditor"]
        : section === "funds"
          ? [
              "programme_manager",
              "finance_reviewer",
              "finance_approver",
              "auditor",
            ]
          : ["procurement_manager", "auditor"],
  );
  const db = await database();
  const manage = s.roles.includes("procurement_manager");
  if (section === "assigned-orders") {
    const { data } = await db.from("supplier_assignments").select("*");
    return (
      <>
        <Heading
          title="Assigned supplier orders"
          text="Only orders assigned to your supplier account appear here. Supporter data and bank evidence are not shared."
        />
        <DataTable
          rows={data ?? []}
          columns={[
            "id",
            "reference",
            "status",
            "source_partner_id",
            "created_at",
          ]}
        />
      </>
    );
  }
  if (section === "commerce") {
    const [
      { data: suppliers },
      { data: products },
      { data: categories },
      { data: gates },
    ] = await Promise.all([
      db.from("suppliers").select("*"),
      db.from("catalog_products").select("*"),
      db.from("product_categories").select("*"),
      db
        .from("platform_settings")
        .select("*")
        .eq("key", "commerce")
        .maybeSingle(),
    ]);
    return (
      <>
        <Heading
          title="Commerce & sourcing"
          text="Verify suppliers, review product compliance, identify the merchant and importer, then publish. No live checkout before launch approval."
        />
        {s.roles.includes("super_admin") && (
          <section className="panel">
            <h2>Commerce launch gates</h2>
            <ActionForm
              action={procurementAction}
              submit="Save commerce controls"
            >
              <Op value="gates" />
              {[
                "consumer_terms_approved",
                "import_compliance_approved",
                "entities_verified",
                "enabled",
              ].map((k) => (
                <label className="checkbox" key={k}>
                  <input
                    name={k}
                    type="checkbox"
                    defaultChecked={gates?.value?.[k] === true}
                  />
                  {label(k)}
                </label>
              ))}
            </ActionForm>
          </section>
        )}
        <h2 className="section-title">Sourcing partners</h2>
        <DataTable
          rows={suppliers ?? []}
          columns={[
            "id",
            "name",
            "legal_entity",
            "country",
            "verification_status",
            "contract_reference",
          ]}
        />
        {manage && (
          <div className="workspace-grid">
            <section className="panel">
              <h2>Onboard a supplier</h2>
              <ActionForm action={procurementAction} submit="Submit supplier">
                <Op value="supplier" />
                {[
                  "name",
                  "legal_entity",
                  "country",
                  "contact",
                  "contract_reference",
                  "quality_notes",
                ].map((k) => (
                  <Input name={k} key={k} />
                ))}
              </ActionForm>
            </section>
            <section className="panel">
              <h2>Independent supplier review</h2>
              <ActionForm action={procurementAction} submit="Save review">
                <Op value="supplier-review" />
                <Input name="supplier_id" />
                <label>
                  Decision
                  <select name="decision">
                    <option value="verified">Verified</option>
                    <option value="suspended">Suspended</option>
                  </select>
                </label>
                <label>
                  Document and quality findings
                  <textarea name="note" required minLength={5} />
                </label>
              </ActionForm>
            </section>
          </div>
        )}
        <h2 className="section-title">Product catalogue</h2>
        <DataTable
          rows={products ?? []}
          columns={[
            "id",
            "sku",
            "title",
            "listing_type",
            "status",
            "seller_of_record",
            "importer_of_record",
          ]}
        />
        {manage && (
          <div className="workspace-grid">
            <section className="panel">
              <h2>Draft a product</h2>
              <ActionForm
                action={procurementAction}
                submit="Save catalogue draft"
              >
                <Op value="product" />
                {["sku", "slug", "title"].map((k) => (
                  <Input key={k} name={k} />
                ))}
                <label>
                  Category
                  <select name="category_id" required>
                    {categories?.map((c) => (
                      <option value={c.id} key={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Verified source partner
                  <select name="partner_id" required>
                    {suppliers
                      ?.filter((s) => s.verification_status === "verified")
                      .map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                        </option>
                      ))}
                  </select>
                </label>
                <label>
                  Listing type
                  <select name="listing_type">
                    <option value="quote_only">Quote-only procurement</option>
                    <option value="fixed_price">
                      Fixed-price product · landed quote required
                    </option>
                    <option value="priced_to_order">Priced to order</option>
                  </select>
                </label>
                <label>
                  Specifications
                  <textarea name="specifications" required />
                </label>
                {[
                  "origin",
                  "condition",
                  "warranty",
                  "voltage",
                  "lead_time",
                  "hs_code",
                  "import_eligibility",
                  "seller_of_record",
                  "importer_of_record",
                  "warranty_party",
                  "partner_roles",
                ].map((k) => (
                  <Input name={k} key={k} />
                ))}
                <Input name="price" required={false} />
                <Input
                  name="price_valid_until"
                  type="datetime-local"
                  required={false}
                />
              </ActionForm>
            </section>
            <section className="panel">
              <h2>Catalogue compliance review</h2>
              <p>
                Review HS classification, current import rules, required
                certification, supplier evidence and truthful availability.
                Vehicles and high-value regulated products should remain
                quote-only.
              </p>
              <ActionForm
                action={procurementAction}
                submit="Record catalogue decision"
              >
                <Op value="product-review" />
                <Input name="product_id" />
                <label>
                  Decision
                  <select name="decision">
                    <option value="published">
                      Publish after independent review
                    </option>
                    <option value="suspended">Suspend</option>
                    <option value="recalled">Recall</option>
                  </select>
                </label>
                <label>
                  Review evidence
                  <textarea name="note" required minLength={5} />
                </label>
              </ActionForm>
            </section>
          </div>
        )}
      </>
    );
  }
  if (section === "quotes") {
    const [{ data: quotes }, { data: suppliers }] = await Promise.all([
      db
        .from("quotes")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100),
      db.from("suppliers").select("*").eq("verification_status", "verified"),
    ]);
    return (
      <>
        <Heading
          title="Quotations & price approval"
          text="Itemize every landed-cost component. A second procurement operator approves pricing before a customer can accept it."
        />
        {quotes?.map((q) => (
          <article className="panel" key={q.id}>
            <div className="row">
              <h3>{q.request_details}</h3>
              <span className="badge">{label(q.status)}</span>
            </div>
            <p className="mono">
              Quote {q.id} · Customer {q.customer_id}
            </p>
            <pre style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>
              {JSON.stringify(q.requested_items, null, 2)}
            </pre>
            {q.status !== "requested" && (
              <details>
                <summary>Review price and disclosures</summary>
                <QuoteBreakdown quote={q} />
              </details>
            )}
            {manage && q.status === "draft" && (
              <ActionForm
                action={procurementAction}
                submit="Approve and send quotation"
              >
                <Op value="quote-approve" />
                <input name="quote_id" value={q.id} type="hidden" />
              </ActionForm>
            )}
          </article>
        ))}
        {manage && (
          <section className="panel">
            <h2>Prepare an itemized quotation</h2>
            <ActionForm
              action={procurementAction}
              submit="Save for independent price approval"
            >
              <Op value="quote" />
              <Input name="quote_id" />
              <label>
                Verified supplier
                <select name="supplier_id" required>
                  {suppliers?.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </label>
              <div className="card-grid">
                {costFields.map((k) => (
                  <label key={k}>
                    {label(k)} (NGN)
                    <input
                      name={k}
                      required
                      defaultValue="0"
                      inputMode="decimal"
                    />
                  </label>
                ))}
              </div>
              <label>
                Item lines (JSON · unit_price_minor in kobo)
                <textarea
                  name="lines"
                  required
                  defaultValue={
                    '[{"description":"Product specification","quantity":1,"unit_price_minor":"100000"}]'
                  }
                />
              </label>
              {commercialDisclosures.map((k) => (
                <Input key={k} name={k} />
              ))}
              <Input name="fx_rate" />
              <Input name="fx_at" type="datetime-local" />
              <Input name="expires_at" type="datetime-local" />
            </ActionForm>
          </section>
        )}
      </>
    );
  }
  if (section === "orders") {
    const [{ data: orders }, { data: disputes }] = await Promise.all([
      db
        .from("orders")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100),
      db
        .from("disputes")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100),
    ]);
    return (
      <>
        <Heading
          title="Orders & fulfilment"
          text="Track procurement, inspection, shipping, customs and domestic delivery. Customer cases remain linked to the original order."
        />
        <DataTable
          rows={orders ?? []}
          columns={[
            "id",
            "reference",
            "buyer_id",
            "status",
            "total_minor",
            "assigned_supplier_user",
          ]}
        />
        {manage && (
          <div className="workspace-grid">
            <section className="panel">
              <h2>Advance fulfilment</h2>
              <ActionForm action={procurementAction} submit="Record milestone">
                <Op value="advance" />
                <Input name="order_id" />
                <label>
                  Next stage
                  <select name="status">
                    {[
                      "procurement_approved",
                      "purchased",
                      "inspection",
                      "in_transit",
                      "clearance",
                      "delivery",
                      "completed",
                      "failed_delivery",
                    ].map((k) => (
                      <option value={k} key={k}>
                        {label(k)}
                      </option>
                    ))}
                  </select>
                </label>
                <Input name="supplier_user" required={false} />
                <label>
                  Evidence / milestone note
                  <textarea name="note" required minLength={5} />
                </label>
              </ActionForm>
            </section>
            <section className="panel">
              <h2>Shipping update</h2>
              <ActionForm
                action={procurementAction}
                submit="Record shipping details"
              >
                <Op value="shipment" />
                {["order_id", "carrier", "tracking", "milestone", "window"].map(
                  (k) => (
                    <Input name={k} key={k} />
                  ),
                )}
              </ActionForm>
            </section>
            <section className="panel">
              <h2>Private order documents</h2>
              <form
                action="/api/order-documents"
                method="post"
                encType="multipart/form-data"
                className="form"
              >
                <Input name="order_id" />
                <Input name="title" />
                <label>
                  Document type
                  <select name="kind">
                    {[
                      "inspection",
                      "shipping",
                      "customs",
                      "invoice",
                      "contract",
                    ].map((k) => (
                      <option key={k}>{k}</option>
                    ))}
                  </select>
                </label>
                <label>
                  Scanned PDF, PNG or JPEG · 5 MB maximum
                  <input
                    type="file"
                    name="file"
                    accept=".pdf,.jpg,.jpeg,.png"
                    required
                  />
                </label>
                <button className="button">Upload private evidence</button>
              </form>
            </section>
            <section className="panel">
              <h2>Resolve an order case</h2>
              <ActionForm
                action={procurementAction}
                submit="Update linked case"
              >
                <Op value="resolve" />
                <Input name="dispute_id" />
                <label>
                  Status
                  <select name="status">
                    {["investigating", "resolved", "rejected"].map((k) => (
                      <option key={k}>{k}</option>
                    ))}
                  </select>
                </label>
                <label>
                  Reasoned response
                  <textarea name="response" required minLength={5} />
                </label>
              </ActionForm>
            </section>
          </div>
        )}
        <h2 className="section-title">Disputes & return requests</h2>
        <DataTable
          rows={disputes ?? []}
          columns={["id", "order_id", "kind", "reason", "status", "response"]}
        />
      </>
    );
  }
  if (section === "funds") {
    const [{ data: donations }, { data: allocations }, { data: spend }] =
      await Promise.all([
        db.from("programme_fund_availability").select("*").limit(200),
        db.from("donation_allocations").select("*").limit(200),
        db.from("expenditures").select("*").limit(200),
      ]);
    return (
      <>
        <Heading
          title="Restricted funds & programme spending"
          text="Allocate verified gifts against donor restrictions. Independent approval is required for allocations and reconciled spending."
        />
        <DataTable
          rows={donations ?? []}
          columns={[
            "id",
            "amount_minor",
            "restricted_project_id",
            "campaign_id",
            "created_at",
          ]}
        />
        <div className="workspace-grid">
          {s.roles.includes("programme_manager") && (
            <>
              <section className="panel">
                <h2>Request an allocation</h2>
                <ActionForm
                  action={procurementAction}
                  submit="Request allocation"
                >
                  <Op value="allocate" />
                  {["donation_id", "project_id", "amount", "reason"].map(
                    (k) => (
                      <Input key={k} name={k} />
                    ),
                  )}
                </ActionForm>
              </section>
              <section className="panel">
                <h2>Record project expenditure</h2>
                <ActionForm
                  action={procurementAction}
                  submit="Submit reconciled spend"
                >
                  <Op value="spend" />
                  {[
                    "allocation_id",
                    "amount",
                    "description",
                    "bank_reference",
                    "evidence",
                  ].map((k) => (
                    <Input key={k} name={k} />
                  ))}
                </ActionForm>
              </section>
            </>
          )}
          {s.roles.includes("finance_approver") && (
            <>
              <section className="panel">
                <h2>Approve allocation</h2>
                <ActionForm
                  action={procurementAction}
                  submit="Approve allocation"
                >
                  <Op value="approve-allocation" />
                  <Input name="allocation_id" />
                </ActionForm>
              </section>
              <section className="panel">
                <h2>Approve reconciled spend</h2>
                <ActionForm
                  action={procurementAction}
                  submit="Approve expenditure"
                >
                  <Op value="approve-spend" />
                  <Input name="expenditure_id" />
                </ActionForm>
              </section>
            </>
          )}
        </div>
        <h2 className="section-title">Allocations</h2>
        <DataTable
          rows={allocations ?? []}
          columns={[
            "id",
            "donation_id",
            "project_id",
            "amount_minor",
            "status",
            "requested_by",
            "approved_by",
          ]}
        />
        <h2 className="section-title">Expenditures</h2>
        <DataTable
          rows={spend ?? []}
          columns={[
            "id",
            "allocation_id",
            "amount_minor",
            "description",
            "bank_reference",
            "status",
          ]}
        />
      </>
    );
  }
  return null;
}
function Heading({ title, text }: { title: string; text: string }) {
  return (
    <div className="page-heading">
      <p className="eyebrow">COMMERCE & MOVEMENT OPERATIONS</p>
      <h1>{title}</h1>
      <p>{text}</p>
    </div>
  );
}
