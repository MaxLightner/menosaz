# Packages 5–8 — QR, sessions, orders and notifications

## Implemented

- Package 5: normalized service points and stable 128-bit QR tokens identify business + point. Point/menu assignments and independent menu time windows live on the server; overnight ranges use the starting weekday. Previously printed business/table URLs resolve without relying on their old menu parameter. QR output is local, larger, and has a four-module quiet zone. The customer gets allowed menu tabs and keeps the cart between them.
- Package 6: canonical sessions, guest grants, orders, immutable item/option price snapshots, transaction counters, payment entries, events, command keys and service requests. Workspace JSON no longer stores points/orders/calls. Legacy order IDs, totals, notes and guest hashes are retained; fresh guests cannot inherit older guests' history.
- Package 7: waiter payment/send, kitchen confirmation and waiter delivery use the same atomic command core in migration 006, with server role checks, expected versions and idempotency keys. UI confirmations and role controls are connected to that core. Unpaid removal/notes are allowed; ordinary changes after receiving money are rejected. Paid-order revision/refund workflows are not provided by this release. There is no independent state writer in the three active production views.
- Package 8: own-order tracking and scoped polling, no public event channel. Notifications cover new waiter orders/calls, kitchen arrivals, customer readiness/delivery and guest reminders. Sound requires a user gesture; browser notifications require permission and an active browser context. Closed-app/background Web Push is not implemented.
- Added request: waiter records point clearance after open orders/calls are settled. The closed time and actor remain on the session. Managers see session durations; 60-minute sessions are marked. Staff can confirm a repeat-order suggestion to the current session's guests; repeated suggestions within ten minutes reuse the prior notice. No SMS is sent.

## Release evidence

- 111 database checks: 27 catalog, 34 access, 14 point/schedule, 36 session/order/ledger/privacy checks.
- 14 notification-transition checks, including ready+delivery occurring between polls and suppression of repeated alerts.
- TypeScript and production build pass. CI now runs all of these on main before Pages deployment.
- Live-data restore rehearsal: four accounts, 37 products, 31 points, one historical order; amounts and item snapshots match. Protected backups remain encrypted outside the repository. The stdin readers explicitly decode UTF-8 across chunks, and function fingerprint comparisons normalize CRLF, preserving Persian text.
- Production API reports catalog/access/point/order version 1. Public QR and legacy-link resolution passed; anonymous workspace and invalid QR were denied. No new OTP was requested and no test order was inserted in production.

## Limits and next packages

The active deployed menu/order flows use Supabase. Remaining local-preview/Firebase/SQLite source removal belongs to package 10; billing/content normalization belongs to package 9. Paid revisions/refunds, guaranteed closed-app push and physical-phone audio/QR testing remain separate work and must not be described as completed here.

Final guard migration 007 is active: an open session cannot be cleared by toggling its occupied flag. QR opening starts/resumes the guest session; ordinary website previews do not. Notification history survives menu-tab changes and is cleared with private workspace state on logout/ban.
