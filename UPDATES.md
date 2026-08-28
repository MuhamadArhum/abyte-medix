# AbyteMedix — Update Log

---

## v1.1.0 — 2026-08-29

### ✅ Completed

| # | Task | Status |
|---|------|--------|
| 1 | **Thermal Print Fix** — Rewritten with monospace `row()` character-padding. No more misaligned columns on thermal printers. Uses `white-space: pre` + `<pre>` layout instead of flexbox. | ✅ Done |
| 2 | **Ledger Print — Customer** — Print button added to Customer Ledger. Opens A4 printable window with store header, party info, summary cards (Total Billed / Total Paid / Outstanding), full transaction table, and closing balance bar. | ✅ Done |
| 3 | **Ledger Print — Supplier** — Same as Customer Ledger print but for Supplier (Payable balance, Purchase/Payment labels). | ✅ Done |
| 4 | **Ledger Date Filter — Default Today** — Both Customer and Supplier ledgers now default start and end date to today's date on open. User can clear or change the range. | ✅ Done |
| 5 | **Startup Error Dialog** — If MariaDB or server fails to start, app now shows a proper error dialog with options: Retry / Download VC++ Runtime / Exit. Previously the app would silently fail or show blank screen. | ✅ Done |
| 6 | **Production Bundle Fix (class-transformer)** — Fixed silent server crash in installed app. `class-transformer/storage` subpath was missing from webpack bundle, causing NestJS to crash on launch in production. | ✅ Done |
| 7 | **Dev Server (ts-node)** — Replaced broken `nest start --webpack` with `ts-node` for local development. Faster startup, no dist/ confusion. | ✅ Done |
| 8 | **Performance Seed (100k Records)** — Seeded all tables with ~100,000 records each (3 years of fake data) to test real-world performance. App tested and confirmed smooth. | ✅ Done (seed file not pushed) |
| 9 | **GitHub Release v1.1.0** — Built fresh installer (`AbyteMedix Setup 1.1.0.exe`) and published as latest release on GitHub with full release notes. | ✅ Done |

---

## Pending / Planned

| # | Task | Status | Notes |
|---|------|--------|-------|
| 1 | **Quotation → Sale conversion** — One-click convert a saved quotation into a sale invoice | 🔲 Pending | — |
| 2 | **Purchase Return flow** — Full UI for returning purchased items back to supplier with ledger entry | 🔲 Pending | Backend model exists |
| 3 | **Sale Return flow** — Full UI for customer returns with inventory restock and ledger entry | 🔲 Pending | Backend model exists |
| 4 | **Expense Categories** — Let user define custom expense categories instead of free text | 🔲 Pending | — |
| 5 | **Low Stock Alerts** — Dashboard notification / badge when any medicine stock falls below reorder level | 🔲 Pending | Reorder level field exists |
| 6 | **Batch Expiry Alerts** — Warn when batches are expiring within 30/60/90 days | 🔲 Pending | Expiry date stored in batch |
| 7 | **Backup & Restore UI** — In-app button to take DB backup and restore from file (currently manual) | 🔲 Pending | — |
| 8 | **Multi-branch / Multi-store Support** — Separate inventory and accounts per branch | 🔲 Pending | Major feature, future scope |
| 9 | **SMS / WhatsApp Reminders** — Send payment reminders to customers with outstanding balance | 🔲 Pending | Needs third-party API |
| 10 | **Report Export (Excel/PDF)** — Export sales, purchase, and ledger reports as Excel or PDF files | 🔲 Pending | — |
| 11 | **A4 Invoice Print** — Full A4 sale invoice layout (currently only thermal receipt available) | 🔲 Pending | — |
| 12 | **User Activity Log UI** — View audit log entries in-app (who did what, when) | 🔲 Pending | Audit log table exists in DB |
| 13 | **Auto-update (Electron)** — App checks for new GitHub releases and prompts user to update | 🔲 Pending | electron-updater ready to wire |

---

## Previous Releases

### v1.0.0 — 2026-08-27
- Bundled MariaDB — fully automated installer, zero manual setup
- Auto-create DB tables and admin user on first run
- Self-contained installer with embedded server

### v1.0.4 — 2026-08-23
- Secure HMAC-SHA256 license system
- Full RBAC (role-based access control)
- Steel & Amber UI theme applied across all modules
- Daily shift / cash register system
- API validation, Swagger docs, unit tests
- Bug fixes across all 11 modules
