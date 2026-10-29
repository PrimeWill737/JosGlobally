# Requirements coverage

The master roadmap has 23 sections; the addendum has 18. The addendum overrides the original payment-to-partnership assumption. The owner's later instructions override Supabase SDK/Auth/Storage usage: runtime access is PostgreSQL through the supplied session-pooler URI, application-owned authentication, and authenticated Cloudinary media.

## Master roadmap

| Section | Implementation / operational dependency |
| --- | --- |
| 01 Executive definition | Public movement narrative, four pillars, no equity or guaranteed-return claims. |
| 02 Audiences | Individual/business/organisation/institution profiles; account, enterprise, diaspora, trade and project enquiry workflows. |
| 03 Design | Forest/gold/ivory/sage SCSS, Manrope and DM Serif Display, responsive layouts, labels, focus styles, reduced motion and empty states. Visual/device and screen-reader UAT still required. |
| 04 Sitemap | Public, account and role-aware operations routes; shared layouts. |
| 05 Onboarding | Email verification links, password sign-in, profiles, exact-money donation intents, expiry, terms, image proof, bank review and independent approval. No automatic partner status after the addendum. SMTP configuration required for public registration. |
| 06 Finance | Purpose-specific beneficiary routing, private scanned image evidence, hashes, unique bank IDs, exact matching, append-only double-entry ledgers, reversals, acknowledgement PDFs and CSV exports. Manual bank statement entry; provider adapter boundary only, no fictitious live bank feed. |
| 07 Reporting | Verified public aggregates, published CMS reports, allocations, history, notifications and operations queues. Entity, custody, board and actual impact evidence must be supplied. |
| 08 Trade / China | Enterprise review, product profiles, readiness, enquiries, introductions, meetings, missions and China requests. Physical office and regulatory claims remain unverified. |
| 09 Projects | Developer/ownership/risk/permission disclosures, project review, due diligence and enquiry records; no securities checkout. |
| 10 Destination / diaspora | Reviewed destinations, experiences, stories, provenance fields, diaspora participation and multilingual drafts. Real licensed media and operators must be supplied. |
| 11 Architecture | Next.js strict TypeScript, SCSS, pinned Bun lock, direct PostgreSQL connection pool, RLS/RPC domain services, application sessions, MFA, Cloudinary, worker queue and CI. Hosting/WAF/monitoring credentials remain external. |
| 12 Database | Normalized finance, identity, commerce and recognition tables; shared typed workflow envelopes for editorial/operations domains; FKs, UUIDs, indexes and RLS. |
| 13 PWA | Manifest, 192/512/maskable icons, install prompt, offline shell, explicit public-only cache, update prompt, online status and opt-in push. No private financial caching or offline settlement. Actual iOS/Android installation tests outstanding. |
| 14 Security / privacy | Parameterized queries, transaction-local RLS identities, opaque hashed sessions, scrypt passwords, encrypted TOTP, replay-resistant codes, recovery codes, MFA staff checks, CSRF origin checks, rate limits, private media, input validation, headers, consent and privacy requests. Independent penetration testing, legal retention policy and incident drills remain launch gates. |
| 15 Roles | Partner, business representative, finance reviewer/approver, programme/trade managers, editor/publisher, auditor, super admin, procurement and supplier. Super admin does not imply finance permission. |
| 16 Delivery roadmap | Implementation and deployment/UAT/runbook documentation; real legal, staff, staging and pilot sign-offs cannot be manufactured in code. |
| 17 QA | Domain tests and PostgreSQL integration tests cover financial and access controls. Live media/scanner/SMTP/push and browser/device coverage remain external acceptance work. |
| 18 Metrics | Verified funds, commerce GMV, partners, SMEs and opportunity aggregates; SQL operations metrics for quotes, orders, cases, suppliers, trade and dead jobs. No fabricated targets or attribution. |
| 19 Team / budget | Preserved as planning dependencies; no staff appointments, vendor quotes or budget commitments are invented. |
| 20 Risks | Role-gated risk register and operational runbooks. |
| 21 Business rules | Account-purpose guard, independent settlement, immutable history, disclosure rules, privacy, no automatic entitlement. |
| 22 Launch | Separate contribution and commerce gates, readiness tracker, bootstrap and migration scripts. Approved accounts are configured from the owner's exact instruction; legal/commerce activation remains off. |
| 23 References | PDF references remain source material, not a claim of fresh legal validation. Technical implementation references are linked in deployment documentation. |

## Commerce and contribution addendum

| Section | Implementation / boundary |
| --- | --- |
| 01 Changes | Order and donation purposes under one immutable registry, separate ledgers, distinct account labels. |
| 02 Navigation | Shop, ordering guide, contribute, impact, partners, account orders, recognition and support. |
| 03 Checkout | Quote cart → request → independent pricing → accepted quote → delivery → order payment; separate donation amount/purpose/dedication/recognition checkout. |
| 04 Catalogue | Categories, suppliers, three listing types, specs, warranty, voltage, origin, lead time, HS/import fields, review/suspension/recall. Variant/inventory relations provided; automated inventory reservation and supplier APIs are not enabled. |
| 05 Pricing | Nine landed-cost components, FX details, validity, seller/importer/warranty roles, terms acceptance, immutable issued pricing. All imported-product checkouts use an approved final landed quote, including fixed supplier-price listings. |
| 06 Payments | Unique cross-purpose references and bank transaction IDs; image-only proof; no screenshot-only verification; two-person review. |
| 07 Giving / legacy | Private/anonymous/public attribution, restricted projects, consent history, immediate visibility withdrawal, acknowledgements and no financial entitlement. Guest giving remains disabled pending risk approval. |
| 08 Public reporting | Donations and commerce calculated separately from verified/reversed events; approved allocation/spend projections. |
| 09 Dashboards | Orders, invoices, timeline, shipping details, private order documents, disputes/returns; supporter history and recognition; procurement, finance and movement workspaces. |
| 10 Relational model | Catalogue, variants, inventory, quotes/lines, orders/items, transactions/events, shipments/docs, donations/allocations, recognition, spend/disputes and audit. |
| 11 Technical | Server-authoritative money, RLS, secure media, replay-resistant MFA, worker retries, PWA and form validation. Real supplier/shipping integrations require separate provider configuration. |
| 12 Routes | Dedicated shop/product/category/cart/checkout/account/operations routes plus policy aliases. |
| 13 Wording | Commercial rights and voluntary gifts clearly distinguished in checkout, guides and policies. |
| 14 Legal gates | Consumer terms, import compliance and verified entities gate commercial checkout. No legal or licence approval is inferred. |
| 15 Migration | Ordered checksummed migrations; V1 settled history is retained and explicitly classified. |
| 16 Acceptance | Tested separate ledgers, wrong account rejection, duplicate-credit prevention, no implicit membership, supplier isolation, reversals, quote approval and recognition privacy. |
| 17 KPIs | Verified operational aggregates; actual impact/jobs need published evidence. |
| 18 References | Regulatory references are retained as a professional review checklist, not automated compliance certification. |

## Explicit owner overrides

- Order beneficiary: **JOSCITY DOT COM LTD / GT BANK / 3003882502**.
- Contribution beneficiary: **JETHRO MARK DA'AR FOUNDATION / TajBank / 0016801926**.
- Transaction proof: JPEG or PNG image, private authenticated Cloudinary storage. PDF remains permitted for non-payment documents.
- Database: supplied PostgreSQL session-pooler connection only; no Supabase API keys or Auth/Storage SDK required.
