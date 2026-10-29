# Jos Globally

Next.js App Router application implementing the Master Development Roadmap and the Commerce & Contributions Addendum found in this workspace. The addendum takes precedence for financial journeys: **commercial orders and voluntary donations are separate**, and neither grants automatic partnership status.

## Run locally

```powershell
npm.cmd install
npm.cmd run dev
```

Open `http://localhost:3000`. Bun 1.3.3 is pinned in `package.json`; `bun.lock` is committed for `bun install --frozen-lockfile`. Node/npm is also supported for Windows development.

The supplied PostgreSQL session-pooler connection is used directly. Cloudinary stores private documents. No Supabase API key, Auth service or Storage SDK is required. There are no fabricated sales, donors, products, government endorsements, offices or verified partner claims.

## Configure PostgreSQL and Cloudinary

1. Set `DATABASE_URL` to the PostgreSQL direct/session-pooler URI. Run `node scripts/migrate.mjs` against your approved database. It checks migration hashes and existing tables, uses an advisory lock, and applies one transaction per file. SQL remains under `supabase/migrations` as inherited from the roadmap; it runs directly without Supabase tooling.
2. Set the variables in `.env.example` in `.env.local` or your deployment secret manager. Never commit secrets. Existing `.env` credentials in the workspace are left intact.
3. Run `node scripts/init-secrets.mjs` to generate local authentication and worker secrets. Set `SMTP_URL` and `EMAIL_FROM` for email verification links. Authentication uses `app_auth` tables, hashed opaque sessions, scrypt passwords, encrypted TOTP and one-time recovery codes. Existing provider auth schemas are untouched.
4. For a fresh database, run `node scripts/create-admin.mjs your-admin@example.com`. It creates only the first super admin, generates a strong password and saves it to ignored `output/admin-credentials.txt`. Sign in, change the password and enrol MFA before `/admin`. The supplied database has already been migrated and the requested admin has been created; do not bootstrap it again.
5. Configure a malware-scanning service. Uploads fail closed without it. The endpoint receives raw bytes with bearer authentication and must return HTTP 200 with `{"clean":true}` only after a successful scan.
6. The owner-specified beneficiaries are configured by migration: orders use **JOSCITY DOT COM LTD / GT BANK / 3003882502**; donations use **JETHRO MARK DA'AR FOUNDATION / TajBank / 0016801926**. SQL requires the correct purpose-specific account. Record legal approval and publish governance before opening contributions; commerce has separate consumer/import/entity gates.
7. Configure VAPID keys for push. Schedule authenticated `POST /api/jobs` every minute with `Authorization: Bearer <CRON_SECRET>`. Jobs retry with backoff and move to a dead queue after five attempts; in-app notifications work independently of push.

The owner's explicit direct-PostgreSQL/Cloudinary instruction overrides the PDFs' Supabase Auth/Storage baseline. Set `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY` and `CLOUDINARY_API_SECRET` only on the server. Transaction proof is JPEG/PNG only, stored with authenticated delivery; other private documents may be PDF. See `docs/DEPLOYMENT.md` for remaining launch requirements.

## Main routes

| Audience | Routes |
| --- | --- |
| Public | `/`, `/shop`, `/shop/[slug]`, `/cart`, `/how-orders-work`, `/contribute`, `/legacy`, `/impact`, `/trade`, `/directory`, `/discover`, `/opportunities`, `/china-desk`, `/stories`, `/about`, `/partners` |
| Financial checkout | `/checkout/order?quote=...`, `/checkout/order?order=...`, `/checkout/donate` |
| Account | `/dashboard`, `/account/orders`, `/account/orders/[id]`, `/account/contributions`, `/account/recognition`, `/account/support`, `/dashboard/receipts`, `/dashboard/security` |
| Operations | `/admin`, `/admin/commerce`, `/admin/quotes`, `/admin/orders`, `/admin/payments`, `/admin/donations`, `/admin/reconciliation`, `/admin/funds`, `/admin/permissions`, `/admin/settings`, `/admin/audit` |

Trade, programmes, project diligence, CMS, translations, governance, campaigns, support, risk and launch-readiness modules are linked from the operations dashboard. Access is enforced by server guards and database policies, not by navigation visibility.

## Financial guarantees enforced in code

- Integer minor units, unique references, approved beneficiary, expiry and server-only financial transitions.
- Uploaded evidence never confirms a payment. File signatures, extensions, MIME, size, scan result and SHA-256 are checked.
- Bank matching validates amount, currency, destination, reference and transfer date. Bank transaction IDs and bank matches are globally unique across orders and donations.
- Submitter, reviewer and approver must differ. Super admin does not imply finance privileges.
- Confirmation atomically writes settlement, transaction registry, purpose-specific balanced ledger, acknowledgement, notification and audit event.
- Order receipts never inflate donation totals; refunds append reversals and reduce the correct reporting category.
- Issued quotes cannot be silently repriced. Separate price approval, expiry and terms acceptance are enforced.
- Donor recognition is private by default, independently opt-in, and immediately withdrawable. Donating never creates formal membership.
- Supplier accounts receive a restricted assignment projection, not customer banking or supporter records.

## Verification

```powershell
npm.cmd run typecheck
npm.cmd test
npm.cmd run test:db
npm.cmd run build
```

Database tests use PGlite (PostgreSQL compiled to WebAssembly). They apply the actual application-owned auth and business migrations and exercise role boundaries, exact beneficiary routing, confirmation, reversal, quote acceptance, separate ledgers and recognition consent. They do not certify SMTP, scanner, push or device behavior.

See `docs/REQUIREMENTS.md` for section-by-section implementation coverage, `docs/OPERATIONS.md` for finance and recovery procedures, and `docs/UAT.md` for remaining live-service and device checks.
