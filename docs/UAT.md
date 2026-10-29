# Acceptance checklist

Automated tests run in isolated PostgreSQL/PGlite. Live-service checks below require the deployed environment and consenting test accounts.

- [ ] Public registration email arrives, expires after 15 minutes and cannot be replayed.
- [ ] Password login rejects unverified/disabled users and rate-limits guesses.
- [ ] TOTP enrolment, repeated-code rejection, recovery-code single use and session revocation work.
- [ ] Two different finance operators confirm a test payment only after real sandbox bank evidence.
- [ ] Order checkout shows GT BANK / JOSCITY DOT COM LTD / 3003882502.
- [ ] Donation checkout shows TajBank / JETHRO MARK DA'AR FOUNDATION / 0016801926.
- [ ] JPEG/PNG proof passes the configured scanner and is uploaded as an authenticated Cloudinary asset.
- [ ] Wrong MIME, extension, oversized files, duplicate hashes, missing scanner and scanner timeout fail safely.
- [ ] A private Cloudinary download expires and cannot be requested by another user or unassigned supplier.
- [ ] Quote total, expiry, merchant/importer/warranty disclosures and terms are accurate.
- [ ] Order and donation bank credits cannot be reused; refunds reduce the corresponding report only.
- [ ] Private or anonymous gifts remain absent from the Legacy Wall; withdrawal removes visibility.
- [ ] Public content has no private profile IDs, bank evidence or internal review notes.
- [ ] Install and standalone navigation work on Chrome Android and Safari iOS.
- [ ] Offline public pages display safely; bank, account and receipt pages are never cached.
- [ ] Service-worker update/rollback and deep links work.
- [ ] Keyboard, screen reader, zoom, contrast and mobile touch-target checks pass.
- [ ] Push permission follows user intent; delivery, invalid endpoint cleanup and retry work.
- [ ] Restore, incident, support coverage and reconciliation drills are signed off.
- [ ] Independent security review covers IDOR, privilege escalation, SQL injection, CSRF/XSS, malware and provider replay.

Windows browser automation was stopped by its safety mechanism because it could not determine the active URL reliably. No visual browser QA result is claimed from that attempt.


## Responsive layout acceptance checks

The responsive pass uses fluid grids, content-width container queries, safe-area insets, and optional viewport-segment detection. Mobile secondary labels are 13px, reading paragraphs 15px, and form inputs 16px at default browser settings; desktop sizing is preserved. Dual-screen layouts use one unobstructed pane when the browser exposes a physical hinge.

Manual device verification remains outstanding; a successful build does not establish visual compatibility. Check public home/shop, checkout, login/MFA, account and admin with long names, validation messages, populated tables, and the software keyboard at:

- 320, 360, 375, 390, 430px phone widths; portrait and landscape.
- 540 and 720px narrow tablets/foldable panes; 768, 820, 1024px tablets.
- 1280, 1440, 1920px desktop windows and resized split-screen windows.
- 200% and 400% zoom; enlarged browser text; keyboard navigation.
- Two horizontal and two vertical viewport segments, including hinge spacing.

Confirm no page-wide horizontal scroll, no clipped labels or unreachable buttons, and that only data tables scroll horizontally. Check safe areas, PWA notices, focus rings and open virtual keyboards. Browsers without segment APIs use the ordinary fluid layout; physical hinge avoidance cannot be guaranteed there.

Reference: [MDN viewport segments](https://developer.mozilla.org/en-US/docs/Web/API/Viewport_segments_API/Using).
