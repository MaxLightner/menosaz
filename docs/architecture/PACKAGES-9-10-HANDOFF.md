# Packages 9–10 — platform domains and runtime cleanup

## Delivered scope

- A single canonical platform model: plans, entitlements, business subscriptions, platform payments/events, messages/recipient receipts, presence, site content and platform media. Existing table rows were renamed/migrated rather than recreated with new identifiers.
- Subscription prices are 200,000 / 500,000 toman. Gateway amounts remain exact rial values; legacy amounts are checked for divisibility by ten. Payment ownership includes the active business and verified buyer; reused request IDs cannot silently change plan/business. Callback verification activates once. Events are append-only. The gateway remains **Zarinpal sandbox**, not real collection or payout.
- Published capabilities use one entitlement reader. Voice AI and table AR remain explicitly disabled/future features; this release does not implement them.
- Site images and sample-card content have their own public read route and admin-only versioned update route. New platform images use the platform Storage namespace and platform media records, not a restaurant's media ownership. Images retain square/1 MiB validation.
- Messages snapshot the managers/owners present at send time and record each recipient's read state separately. Existing read times were retained for existing manager/owner recipients; no historical read time is invented for newly added staff.
- Reports now read canonical order tables. Registration creates the business/menu/appearance/points directly, without a workspace JSON import or a second user model.
- Firebase clients/configuration/rules, SQLite/Express server, competing old screens, local data writers and unused test reset screens were removed. Samples are explicit UI previews and cannot create fictitious operational orders.
- Old facade/view/import triggers/functions were removed from runtime. The residual JSON rows are retained in `migration_workspace_archive`, with no runtime references or service-role access. This is a locked migration archive, not a second application database. Historical migration files and private restore tooling remain for reproducibility.
- Both development and production use Supabase. Browser storage contains session/guest credentials and presentation preferences only; it is not an alternative operational data store.

## Evidence

- 155 database checks: prior 111 plus 44 platform migration/ownership/payment/content/receipt/registration/archive checks.
- 14 notification-transition checks; sandbox adapter checks for callback host, forged authority, idempotence and cancellation.
- TypeScript and production build pass. CI runs domain, notification and billing checks before Pages deployment.
- A fresh encrypted private backup was restored in isolated PGlite. Four businesses, 37 products, 31 service points, one order and one platform payment were preserved; account IDs, money and existing references matched. No new OTP, production test order, or bank charge was generated.
- Production cutover returned `platform-runtime-v2-active`. Public API reports `platformVersion=1`, `runtimeVersion=2`; public content, anonymous QR and old printed links passed; private workspace/admin content and invalid QR were denied.
- Public deployment remains GitHub Pages at https://maxlightner.github.io/menosaz/. The main client bundle is approximately 498 kB, down from roughly 1.1 MB before old dependencies were removed.

## Operational notes

Backups are encrypted with Windows CurrentUser DPAPI outside the repository. Keep access to that Windows account for decryption. Restore rehearsals consume decrypted input through stdin and do not log private rows. Guarded release SQL/manifests are ignored, private temporary artifacts and must not be committed.

After new data is accepted, do not restore an old dump over production. Use a reviewed forward fix; the migration archive is not a rollback of subsequent orders/payments. Browser sound still requires a gesture; closed-app Web Push, real payments, AR/voice AI, printing and marketplace sales remain outside these ten packages. Physical-phone scanning and a fresh end-to-end OTP login were not repeated in this release.
