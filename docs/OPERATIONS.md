# Operations runbook

## Payment review

1. Open the correct inbox: `/admin/payments` for orders; `/admin/donations` for gifts.
2. Inspect private proof. Receipt upload alone is never settlement. Check amount, transfer date, reference and sender against an independently obtained bank statement.
3. Import the unique bank credit against the correct account. SQL prevents order payments from routing to the donation account and vice versa.
4. Match the credit and evidence. A reviewer cannot review their own payment. Mismatches go through a reasoned rejection or information request, never an editable total.
5. A distinct finance approver confirms. Confirmation is idempotent and atomically records transaction, purpose-specific ledger, audit and notification.
6. Export and reconcile ledgers against the bank. Bank entries without matches are not reported as gifts or sales.

## Refunds and restricted funds

Refunds require a request, a different approver and an actual settled bank reversal reference. Reversal entries preserve the original evidence and reduce the correct public metric. A requested/approved allocation blocks a donation refund until an appropriately reviewed deallocation process is completed; no automatic silent diversion of restricted gifts is implemented. Approved expenditure is immutable.

## Procurement

Verify legal sourcing identity, contract, quality history and import eligibility. Product author and reviewer must differ. Price authors cannot approve their own quotation; supplier line totals must equal the product subtotal. The customer accepts a current issued quote and the exact terms version. Do not alter issued pricing; a differential needs a new disclosed and accepted agreement. Follow permitted fulfilment stages and attach scanned inspection/customs/shipping evidence. Record disputes without automatically denying consumer rights.

## Access and account recovery

The first administrator is bootstrapped through the controlled CLI. MFA is mandatory before operations access. Grant only necessary roles; an administrative title alone cannot confirm finances. Auditors require an expiry within 90 days. Role revocation is effective on the next database policy check. Users can revoke all sessions, change a password and use single-use MFA recovery codes. Emergency operator recovery requires a documented owner-controlled database procedure with an audit event, not a public bypass endpoint.

## Jobs and incidents

`POST /api/jobs` requires the worker secret. Jobs are claimed with `SKIP LOCKED`, have retry backoff, recover stale locks and dead-letter after five attempts. Investigate dead jobs before requeueing; preserve the original failure evidence. A missing push configuration does not remove in-app notifications.

For a payment incident, close the applicable launch gate, preserve evidence/audit logs, revoke compromised roles/sessions, reconcile bank facts and involve the accountable finance/compliance owner. Never erase a settled record to make a report balance.

## Backups and rollback

Use provider-managed encrypted backups and point-in-time recovery. Rehearse restore into an isolated database, verify row counts and balanced ledgers, and test role isolation before cutover. Migrations are checksummed and applied one transaction per file; never edit an already applied file. Application rollback must remain schema-compatible. To repair service-worker caching, bump its cache version and deploy an offline-safe update. Do not cache private routes while troubleshooting.

## Content and reports

Publish only independently reviewed evidence. Confirm ownership, source permissions and correction notes. Publicly visible tables are projections that omit owner IDs and internal review notes. Reports must distinguish donations, gross commercial order value, refunds, allocations and actual spend. Financial history is not a redeemable supporter balance.
