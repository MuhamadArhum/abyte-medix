// Ledger print — opens new window with clean A4 printable ledger

export interface LedgerEntry {
  date: string
  type: string
  reference?: string
  debit?: number | string
  credit?: number | string
  balance?: number | string
}

export interface LedgerPrintData {
  partyType: 'Customer' | 'Supplier'
  partyName: string
  partyPhone?: string
  dateFrom?: string
  dateTo?: string
  openingBalance: number
  closingBalance: number
  totalDebit: number
  totalCredit: number
  entries: LedgerEntry[]
  storeName: string
  storePhone?: string
  printedAt: Date
}

function typeLabel(type: string, partyType: 'Customer' | 'Supplier'): string {
  if (partyType === 'Customer') {
    if (type === 'SALE') return 'Sale Invoice'
    if (type === 'PAYMENT') return 'Payment Received'
    if (type === 'SALE_RETURN') return 'Sale Return'
  } else {
    if (type === 'PURCHASE') return 'Purchase Invoice'
    if (type === 'PAYMENT') return 'Payment Made'
    if (type === 'PURCHASE_RETURN') return 'Purchase Return'
  }
  return type
}

const Rs = (n: number | string | undefined) =>
  n != null && n !== '' ? `Rs. ${Number(n).toFixed(2)}` : '—'

export function printLedger(data: LedgerPrintData) {
  const {
    partyType, partyName, partyPhone,
    dateFrom, dateTo,
    openingBalance, closingBalance, totalDebit, totalCredit,
    entries, storeName, storePhone, printedAt,
  } = data

  const dateRange = dateFrom || dateTo
    ? `${dateFrom ? new Date(dateFrom).toLocaleDateString('en-PK', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Beginning'} — ${dateTo ? new Date(dateTo).toLocaleDateString('en-PK', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Today'}`
    : 'All Time'

  const debitLabel  = partyType === 'Customer' ? 'Debit (Billed)' : 'Debit (Paid)'
  const creditLabel = partyType === 'Customer' ? 'Credit (Received)' : 'Credit (Purchased)'
  const balLabel    = partyType === 'Customer' ? 'Outstanding' : 'Payable'

  const rows = entries.map((e, i) => {
    const bg = i % 2 === 0 ? '#fff' : '#f9f9f9'
    return `
      <tr style="background:${bg}">
        <td>${new Date(e.date).toLocaleDateString('en-PK', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
        <td>${typeLabel(e.type, partyType)}</td>
        <td>${e.reference || '—'}</td>
        <td style="text-align:right;color:#c23b2e">${e.debit ? Rs(e.debit) : '—'}</td>
        <td style="text-align:right;color:#3e8e5a">${e.credit ? Rs(e.credit) : '—'}</td>
        <td style="text-align:right;font-weight:700;color:${Number(e.balance ?? 0) > 0 ? '#c23b2e' : '#17181a'}">${Rs(e.balance)}</td>
      </tr>`
  }).join('')

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8"/>
  <title>${partyType} Ledger — ${partyName}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 11pt; color: #17181a; background: #fff; }
    @page { size: A4; margin: 12mm 14mm; }

    /* Header */
    .hdr { border-bottom: 3px solid #2B2F33; padding-bottom: 10px; margin-bottom: 14px; display: flex; justify-content: space-between; align-items: flex-end; }
    .hdr-left .store { font-size: 17pt; font-weight: 800; color: #2B2F33; text-transform: uppercase; letter-spacing: 0.5px; }
    .hdr-left .sub   { font-size: 9pt; color: #75797D; margin-top: 2px; }
    .hdr-right       { text-align: right; font-size: 9pt; color: #75797D; }

    /* Title strip */
    .title-strip { background: #2B2F33; color: #fff; padding: 7px 12px; border-radius: 4px; margin-bottom: 12px; display: flex; justify-content: space-between; align-items: center; }
    .title-strip .t { font-size: 13pt; font-weight: 700; }
    .title-strip .period { font-size: 9pt; opacity: 0.8; }

    /* Party info */
    .party-box { border: 1px solid #d9d4c6; border-radius: 4px; padding: 8px 12px; margin-bottom: 12px; display: flex; gap: 30px; }
    .party-box .lbl { font-size: 8pt; color: #75797D; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 2px; }
    .party-box .val { font-size: 11pt; font-weight: 700; color: #17181a; }

    /* Summary cards */
    .summary { display: flex; gap: 8px; margin-bottom: 14px; }
    .card { flex: 1; border: 1px solid #d9d4c6; border-radius: 4px; padding: 8px 10px; text-align: center; }
    .card .lbl { font-size: 8pt; color: #75797D; text-transform: uppercase; letter-spacing: 0.04em; margin-bottom: 3px; }
    .card .val { font-size: 12pt; font-weight: 800; }
    .card.danger { border-color: #f4c2b8; background: #fef2f0; }
    .card.success { border-color: #dcefe6; background: #edfdf4; }

    /* Table */
    table { width: 100%; border-collapse: collapse; font-size: 10pt; }
    thead tr { background: #2B2F33; color: #fff; }
    thead th { padding: 7px 8px; text-align: left; font-weight: 600; font-size: 9pt; text-transform: uppercase; letter-spacing: 0.04em; }
    thead th:nth-child(4), thead th:nth-child(5), thead th:nth-child(6) { text-align: right; }
    tbody td { padding: 6px 8px; border-bottom: 1px solid #eeebe3; font-size: 10pt; vertical-align: middle; }
    tbody tr:last-child td { border-bottom: none; }

    /* Footer */
    .footer { margin-top: 16px; border-top: 2px solid #2B2F33; padding-top: 8px; display: flex; justify-content: space-between; font-size: 8.5pt; color: #75797D; }
    .closing { background: #2B2F33; color: #fff; padding: 8px 14px; border-radius: 4px; display: flex; justify-content: space-between; align-items: center; margin-top: 10px; }
    .closing .lbl { font-size: 10pt; }
    .closing .val { font-size: 14pt; font-weight: 800; }

    @media print { button { display: none !important; } }
  </style>
</head>
<body>

  <!-- Print button (screen only) -->
  <div style="text-align:right;padding:8px;background:#f5f3ee">
    <button onclick="window.print()" style="background:#2B2F33;color:#fff;border:none;padding:8px 18px;border-radius:4px;font-size:12px;cursor:pointer;font-weight:700">
      🖨 Print Ledger
    </button>
  </div>

  <div style="padding: 0 4px;">

    <!-- Header -->
    <div class="hdr">
      <div class="hdr-left">
        <div class="store">${storeName}</div>
        ${storePhone ? `<div class="sub">Tel: ${storePhone}</div>` : ''}
      </div>
      <div class="hdr-right">
        <div><strong>${partyType} Ledger</strong></div>
        <div>Printed: ${printedAt.toLocaleString('en-PK', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</div>
      </div>
    </div>

    <!-- Title strip -->
    <div class="title-strip">
      <div class="t">${partyType} Ledger Statement</div>
      <div class="period">Period: ${dateRange}</div>
    </div>

    <!-- Party info -->
    <div class="party-box">
      <div>
        <div class="lbl">${partyType} Name</div>
        <div class="val">${partyName}</div>
      </div>
      ${partyPhone ? `<div><div class="lbl">Phone</div><div class="val">${partyPhone}</div></div>` : ''}
      <div>
        <div class="lbl">Period</div>
        <div class="val" style="font-size:10pt">${dateRange}</div>
      </div>
      <div>
        <div class="lbl">Total Transactions</div>
        <div class="val">${entries.length}</div>
      </div>
    </div>

    <!-- Summary -->
    <div class="summary">
      <div class="card">
        <div class="lbl">${debitLabel}</div>
        <div class="val" style="color:#c23b2e">Rs. ${totalDebit.toFixed(2)}</div>
      </div>
      <div class="card success">
        <div class="lbl">${creditLabel}</div>
        <div class="val" style="color:#3e8e5a">Rs. ${totalCredit.toFixed(2)}</div>
      </div>
      <div class="card ${closingBalance > 0 ? 'danger' : 'success'}">
        <div class="lbl">${balLabel} Balance</div>
        <div class="val" style="color:${closingBalance > 0 ? '#c23b2e' : '#3e8e5a'}">Rs. ${Number(closingBalance).toFixed(2)}</div>
      </div>
    </div>

    <!-- Ledger table -->
    <table>
      <thead>
        <tr>
          <th style="width:100px">Date</th>
          <th>Type</th>
          <th>Reference</th>
          <th style="width:110px">Debit</th>
          <th style="width:110px">Credit</th>
          <th style="width:110px">Balance</th>
        </tr>
      </thead>
      <tbody>
        ${entries.length === 0
          ? '<tr><td colspan="6" style="text-align:center;padding:20px;color:#75797D">No transactions in this period</td></tr>'
          : rows}
      </tbody>
    </table>

    <!-- Closing balance bar -->
    <div class="closing">
      <div class="lbl">Closing Balance (${dateRange})</div>
      <div class="val">Rs. ${Number(closingBalance).toFixed(2)}</div>
    </div>

    <!-- Footer -->
    <div class="footer">
      <div>${storeName} · ${storePhone || ''}</div>
      <div>This is a system-generated statement</div>
    </div>

  </div>
</body>
</html>`

  const win = window.open('', '_blank', 'width=900,height=700')
  if (!win) return
  win.document.write(html)
  win.document.close()
}
