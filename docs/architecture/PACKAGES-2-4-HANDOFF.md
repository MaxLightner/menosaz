# Packages 2–4 — 2026-10-15

Catalog and access SQL have been applied on production Supabase. Four businesses, four Auth UIDs, 37 products and the existing order were preserved. Access migration produced four profiles, four owner memberships and one existing platform admin; no phone-based admin assignment remains in runtime functions.

menu_accounts is now a read-only view over canonical access tables, not a second account store. The order/point JSON domains remain pending packages 5–6. The private encrypted before-access backup and restore rehearsal preserved all account/business relationships. Backups are outside Git.

The deployed Edge Function registers uploaded media and enforces access before protected routes. Staff roles are enforced server-side, kitchen DTOs exclude money and guest secrets, and changing account status does not suspend all staff of a business. Only owners manage membership; the last owner cannot be removed. Existing confirmed users can be added by phone; no automated SMS invitations are sent.

61 automated checks (27 catalog + 34 access) and TypeScript/production build passed. Live access cutover returned access-v1-active / 4 accounts / 4 memberships / 1 admin. OTP was not resent to the user. A full real-device QR test remains outside these package checks.

Registration terms now open in-place; closing profile setup keeps the verified session. Explicit logout clears private workspace state and persisted legacy workspace caches. Payment callback uses GitHub Pages.
