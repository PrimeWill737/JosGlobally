# Deployment and integration

## Supported architecture

Browser/PWA → Next.js server components/actions/route handlers → direct PostgreSQL connection pool → RLS and transactional functions. Each user query begins a transaction, sets a local restricted role and identity/assurance context, executes parameterized SQL, then commits or rolls back before releasing the connection. The service path is server-only. No database or Cloudinary secret enters the browser bundle.

The migration set supports a fresh or controlled PostgreSQL database, including the supplied hosted session pooler. It creates `app_auth` and business tables while leaving existing provider `auth` and `storage` schemas untouched. The migration runner checks conflicts and hashes. Numbered migrations are authoritative and must not be modified after deployment.

The supplied `.env` is preserved. Its labelled database URI is normalized in memory. Application-managed authentication provides email verification links, password sign-in, expiring opaque sessions, session revocation, TOTP and recovery codes. Cloudinary receives authenticated raw assets, and the server issues expiring private download links only after database authorization.

## Required secrets and service configuration

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | Direct PostgreSQL/session-pooler URI; server only |
| `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` | Private authenticated media storage |
| `AUTH_SECRET` | Encryption key material for TOTP secrets |
| `SMTP_URL`, `EMAIL_FROM` | Verified email sign-up and magic links |
| `APP_URL` | Exact canonical origin and auth redirect base |
| `MALWARE_SCAN_URL`, `MALWARE_SCAN_TOKEN` | Fail-closed private upload scan adapter |
| `CRON_SECRET` | Authenticated job worker invocation |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` | Optional web push delivery |

Use an HTTPS scanner endpoint in production. The scanner service must enforce its own request limit, safe parsing, current malware signatures and isolation; `{clean:true}` is a contract, not a local malware detector.

## Promotion checklist

1. Apply migrations to the approved staging PostgreSQL database and run live RLS tests with transaction-local identities.
2. Configure SMTP, allowed redirect origins, TOTP and session limits. Bootstrap only the first admin; provision distinct finance reviewer/approver and distinct procurement author/approver accounts.
3. Configure authenticated Cloudinary delivery, scanner, VAPID and scheduled jobs. Verify private URL expiry and scanner outage behavior.
4. Record corporate account verification, operator identity, legal terms, consumer rights, sourcing contracts and import requirements. Financial gates start off.
5. Run the UAT checklist, security review and restore drill. Assign support and incident coverage.
6. Deploy to a supported Next.js host with TLS, appropriate regional latency, secrets management and a WAF. Set `APP_URL` to the deployed origin. Never expose the local preview server publicly as production.
7. Validate CSP with the chosen host, monitor errors and dead jobs, and promote using a protected branch and an approved migration plan.

## Deliberately unconfigured integrations

No fictitious bank feed, automatic payment provider, live stock, shipping API, tax calculation, licence approval or verified China office is claimed. The manual statement workflow is implemented. `payment-provider.ts` defines the adapter boundary and timestamped HMAC helper; a real provider requires its documented signature scheme, verified settlement lookup, beneficiary checks and replay-event persistence before exposing a callback endpoint.

Commerce currently confirms all landed costs through a quotation, including products with fixed supplier pricing. This is conservative for imported goods: the visible product price is not represented as a guaranteed all-in instant checkout amount.

Guest giving is not enabled: the addendum permits it only where risk controls allow. The implemented flow verifies an account first while still allowing anonymous public attribution.

## External acceptance

SMTP/email links, MFA recovery, scanner, push, delivery, backups, DNS and production authorization require live acceptance checks. The database connection and Cloudinary API credentials have been checked; migrations and initial admin creation were explicitly approved and executed. A local build and isolated PostgreSQL tests do not certify the remaining external systems.
