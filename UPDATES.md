# AbyteMedix — Update Log

---

## v1.2.1 — 2026-08-30

### ✅ Completed

| # | Task | Status |
|---|------|--------|
| 1 | **Login Error Fix** — Login page now shows the actual error message instead of always showing "Invalid username or password". Network errors, server-down errors, and real credential errors are now distinguished properly. | ✅ Done |
| 2 | **GitHub Release v1.2.1** — Built fresh installer (`AbyteMedix Setup 1.2.1.exe`, 171 MB) and published as latest release on GitHub. | ✅ Done |

---

## v1.2.0 — 2026-08-30

### ✅ Completed

| # | Task | Status |
|---|------|--------|
| 1 | **Sale Return UI** — "Return" button added to every sale's detail modal. Opens item-level return form: select qty per medicine, enter reason, choose refund method (Cash/Bank/Credit). Backend was already complete; frontend was missing entirely. | ✅ Done |
| 2 | **Purchase Return UI (improved)** — Return flow replaced with a proper modal: item-level qty selection per medicine, reason field. Previously was a blind full-return button with no user input. | ✅ Done |
| 3 | **Expense Categories (smart dropdown)** — Expense and Income category inputs now auto-suggest previously used categories via browser datalist. Backend `GET /accounts/expense-categories` and `GET /accounts/income-categories` endpoints added. No schema change — reuses existing free-text field. | ✅ Done |
| 4 | **Report Export — CSV** — "Export CSV" button added to 4 report tables: Top Selling Products, Sales by Customer, Purchases by Supplier, Stock Valuation. Client-side CSV generation with proper escaping, instant download. | ✅ Done |
| 5 | **Auto-update (Electron)** — `electron-updater` wired to GitHub releases. App checks for updates 10 seconds after launch. Settings page now has "App Updates" section: Check / Download / Install with a live progress bar. | ✅ Done |
| 6 | **Setup Screen — First Launch Only** — Fixed: setup selector (Server/Client mode) now shows only on first install. Browser-mode guard added: if config already in localStorage, redirects to login. Production Electron behavior was already correct via `config.json` check in `main.ts`. | ✅ Done |
| 7 | **GitHub Release v1.2.0** — Built fresh installer (`AbyteMedix Setup 1.2.0.exe`, 171 MB) and published as latest release on GitHub. | ✅ Done |

### Already Done (Verified this session)

| # | Task | Notes |
|---|------|-------|
| 6 | **Quotation → Sale conversion** | Fully implemented (backend + frontend) |
| 7 | **Low Stock Alerts** | Dashboard shows low-stock and near-expiry lists |
| 8 | **Batch Expiry Alerts** | Dashboard shows expiring batches with days-left badge |
| 9 | **Backup & Restore UI** | BackupPage fully functional |
| 10 | **A4 Invoice Print** | Wired in both Sales and Purchases detail modals |
| 11 | **User Activity Log UI** | AuditPage fully functional with filters |

---

## Pending / Planned

| # | Task | Status | Notes |
|---|------|--------|-------|
| 1 | **Multi-branch / Multi-store Support** — Separate inventory and accounts per branch | 🔲 Future | Major architectural feature |
| 2 | **SMS / WhatsApp Reminders** — Send payment reminders to customers with outstanding balance | 🔲 Future | Needs third-party API keys (Twilio / etc.) |

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
