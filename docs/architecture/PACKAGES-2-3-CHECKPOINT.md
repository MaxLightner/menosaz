# Packages 2 and 3 deployment checkpoint — 2026-10-15

Production Supabase catalog cutover completed successfully: 4 businesses, 37 products. Existing order data preserved. Private backup encrypted with Windows DPAPI at Documents/Codex/private-backups/menosaz/before-catalog-20261015.csv.dpapi (not committed).

Validation: 27 catalog regression checks passed; real-data restore rehearsal matched counts, amounts, and original SQL function fingerprints. TypeScript and production Vite build passed.

Pending: deploy updated menu-api Edge Function (media registration/background upload), then publish frontend to GitHub Pages. Do not report frontend publication as completed. Current live DB supports existing deployed API through canonical catalog bridge.

Source migrations require backup gate and must not be blindly rerun. Test scripts use PGLITE_MODULE to resolve @electric-sql/pglite 0.5.9; temporary test dependency is excluded from repository.
