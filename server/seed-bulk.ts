import 'dotenv/config'
import * as mariadb from 'mariadb'
import * as bcrypt from 'bcryptjs'

// ─── Connection ───────────────────────────────────────────────────────────────

const url = process.env.DATABASE_URL ?? ''
const parsed = new URL(url)

const pool = mariadb.createPool({
  host: parsed.hostname,
  port: parseInt(parsed.port || '3306'),
  user: parsed.username,
  password: parsed.password,
  database: parsed.pathname.replace('/', ''),
  connectionLimit: 3,
  insertIdAsNumber: true,
  bigIntAsNumber: true,
})

// ─── Helpers ──────────────────────────────────────────────────────────────────

const rand = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min
const randF = (min: number, max: number) => parseFloat((Math.random() * (max - min) + min).toFixed(2))
const pick = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)]

function sqlDate(daysOffset: number): string {
  const d = new Date()
  d.setDate(d.getDate() + daysOffset)
  return d.toISOString().slice(0, 19).replace('T', ' ')
}
const past = (min: number, max: number) => sqlDate(-rand(min, max))
const future = (min: number, max: number) => sqlDate(rand(min, max))
const phone = () => `03${rand(0, 4)}${rand(1, 9)}-${rand(1000000, 9999999)}`
const invNo = (prefix: string, n: number) => `${prefix}-${String(n).padStart(7, '0')}`

async function bulkInsert(
  conn: mariadb.Connection,
  table: string,
  cols: string[],
  rows: any[][],
  chunkSize = 300,
) {
  const colList = cols.map(c => `\`${c}\``).join(',')
  for (let i = 0; i < rows.length; i += chunkSize) {
    const chunk = rows.slice(i, i + chunkSize)
    const placeholders = chunk.map(() => `(${cols.map(() => '?').join(',')})`).join(',')
    await conn.query(
      `INSERT INTO \`${table}\` (${colList}) VALUES ${placeholders}`,
      chunk.flat(),
    )
  }
}

function progress(label: string, done: number, total: number) {
  process.stdout.write(`\r   ${label}: ${done.toLocaleString()} / ${total.toLocaleString()}   `)
}

// ─── Reference Datasets ───────────────────────────────────────────────────────

const CATEGORIES = [
  'Antibiotics','Analgesics / Painkillers','Antacids & GI','Antihistamines',
  'Vitamins & Supplements','Antidiabetics','Antihypertensives','Cardiovascular',
  'Antifungals','Antivirals','Corticosteroids','Dermatological','Eye & Ear Drops',
  'Respiratory / Cough','Neurological','Psychiatric','Hormones & Endocrine',
  'Urological','Musculoskeletal','Antiparasitics','Oral Health','Surgical Supplies',
  'Vaccines','Oncology','Pediatric','Gynaecology','Hepatology',
  'Nephrology','Immunology','Miscellaneous',
]

const MANUFACTURERS = [
  'Getz Pharma','Ferozsons Laboratories','AGP Limited','Sami Pharmaceuticals',
  'Searle Pakistan','Highnoon Laboratories','Barrett Hodgson','ICI Pakistan',
  'Reckitt Benckiser','GlaxoSmithKline Pakistan','Pfizer Pakistan','Novartis Pakistan',
  'Abbott Laboratories Pakistan','Bayer Pakistan','Merck Pakistan','Sanofi Pakistan',
  'Wyeth Pakistan','Nabi Qasim Industries','ATCO Laboratories','Martin Dow',
  'PharmEvo','Global Pharmaceuticals','Medisave Pharma','Platinum Pharmaceuticals',
  'Pacific Pharmaceuticals','Efroze Chemical Industries','Indus Pharma',
  'CCL Pharmaceuticals','Herbion Pakistan','Tabros Pharma','Sind Medical',
  'Pak Pharma Labs','Consolidated Chemicals','Rotex Pharma','Bosch Pharmaceuticals',
  'Hamaz Pharmaceuticals','BF Biosciences','Novamed','Veneze','Delta Pharma',
  'Shaigan Pharmaceuticals','Galaxy Pharma','Standard Pharma','Zafa Pharma','Horizon Pharma',
]

const GENERICS = [
  'Amoxicillin','Ampicillin','Azithromycin','Ciprofloxacin','Doxycycline',
  'Metronidazole','Clarithromycin','Cefixime','Ceftriaxone','Levofloxacin',
  'Paracetamol','Ibuprofen','Diclofenac','Aspirin','Naproxen','Tramadol',
  'Mefenamic Acid','Ketorolac','Piroxicam','Celecoxib','Etoricoxib',
  'Omeprazole','Pantoprazole','Ranitidine','Esomeprazole','Lansoprazole',
  'Domperidone','Metoclopramide','Ondansetron','Hyoscine','Simethicone',
  'Cetirizine','Loratadine','Chlorpheniramine','Fexofenadine','Diphenhydramine',
  'Metformin','Glibenclamide','Glimepiride','Sitagliptin','Empagliflozin',
  'Amlodipine','Atenolol','Lisinopril','Losartan','Valsartan','Enalapril',
  'Atorvastatin','Simvastatin','Rosuvastatin','Clopidogrel','Digoxin',
  'Fluconazole','Clotrimazole','Terbinafine','Griseofulvin','Nystatin',
  'Acyclovir','Oseltamivir','Lamivudine','Tenofovir','Sofosbuvir',
  'Prednisolone','Dexamethasone','Betamethasone','Hydrocortisone','Triamcinolone',
  'Vitamin C','Vitamin D3','Vitamin B12','Folic Acid','Iron Sulfate',
  'Calcium Carbonate','Zinc Sulfate','Multivitamin','Omega 3','Biotin',
  'Salbutamol','Theophylline','Montelukast','Budesonide','Ipratropium',
  'Alprazolam','Diazepam','Sertraline','Fluoxetine','Amitriptyline',
  'Levothyroxine','Propylthiouracil','Testosterone','Estrogen','Progesterone',
  'Tamsulosin','Finasteride','Sildenafil','Tadalafil','Oxybutynin',
  'Chloroquine','Albendazole','Mebendazole','Praziquantel','Ivermectin',
  'Warfarin','Enoxaparin','Heparin','Rivaroxaban','Dabigatran',
  'Gabapentin','Pregabalin','Carbamazepine','Phenytoin','Valproic Acid',
  'Furosemide','Spironolactone','Hydrochlorothiazide','Mannitol','Torsemide',
  'Methotrexate','Cyclosporine','Azathioprine','Hydroxychloroquine','Colchicine',
]

const BRAND_PFXS = [
  'Amox','Cipro','Azith','Cef','Metro','Levo','Clari','Doxi','Ampho',
  'Para','Ibu','Diclo','Napro','Tram','Mefe','Cele','Keto','Piro',
  'Ome','Panto','Rani','Esome','Dom','Ondan','Hyo','Sime',
  'Ceti','Lora','Fexo','Diphen','Chlor',
  'Metf','Glib','Glim','Sita','Empa',
  'Amlo','Aten','Lisin','Losar','Valsar','Enal',
  'Ator','Simva','Rosuva','Clopi','Digo',
  'Fluco','Clotri','Terbi','Griso',
  'Acyclo','Oselta','Lami','Teno','Sofo',
  'Pred','Dexa','Beta','Hydro','Triam',
  'VitC','VitD','CalC','Zinc','Multi','Omega','Bio',
  'Salbu','Theo','Monte','Bude','Ipra',
  'Alpra','Diaze','Sertra','Fluoxe','Amitri',
  'Thyro','Testo','Estro','Prog',
  'Tamsu','Finas','Silde','Tadal','Oxybu',
  'Chloro','Alben','Meben','Iverm',
  'Warf','Enoxa','Hepa','Riva','Dabi',
  'Gaba','Preg','Carba','Pheny','Valp',
  'Furo','Spiro','Hydrochlor','Manni','Torsi',
]

const BRAND_SUFXS = [
  '','','','tab','cap','forte','plus','max','pro','dsr','xr','sr','er',
  'od','ls','junior','500','250','100','50','-D','Extra','Ultra','Neo','Star','Care',
]

const STRENGTHS = [
  '125mg','250mg','500mg','1000mg','50mg','100mg','200mg','400mg','800mg',
  '25mg','75mg','150mg','300mg','600mg','5mg','10mg','20mg','40mg','80mg',
  '1mg','2mg','2.5mg','5ml','10ml','2.5mg/5ml','125mg/5ml','250mg/5ml',
  '500mg/5ml','0.5%','1%','2%','5%','0.1%','0.025%','1000IU','50000IU',
]

const DOSAGE_FORMS = [
  'Tablet','Tablet','Tablet','Capsule','Capsule','Syrup','Injection','Cream',
  'Ointment','Drops','Suspension','Gel','Suppository','Inhaler','Sachet','Powder',
]

const PACK_SIZES = [
  '1x10 Tablets','2x10 Tablets','3x10 Tablets','1x14 Tablets',
  '1x7 Capsules','1x10 Capsules','2x7 Capsules',
  'Bottle 60ml','Bottle 120ml','Bottle 200ml',
  'Tube 15g','Tube 30g','1 Vial','5 Vials','Box of 30','Sachet x10','1 Inhaler',
]

const FIRST_NAMES = [
  'Ahmed','Muhammad','Ali','Hassan','Usman','Bilal','Imran','Tariq','Asif','Shahid',
  'Kamran','Faisal','Rizwan','Adnan','Waseem','Hamid','Salman','Tahir','Nasir','Aqeel',
  'Zahid','Javed','Irfan','Naveed','Sajjad','Khalid','Shoaib','Fatima','Ayesha','Sara',
  'Zainab','Nadia','Rabia','Hina','Amna','Sobia','Saima','Mehwish','Lubna','Naila',
  'Kiran','Rukhsana','Shazia','Farah','Bushra','Sadaf','Maryam','Sana','Uzma','Nimra',
  'Anam','Razia','Tahira','Saira','Asma','Zarqa','Madiha','Sumaira','Raheela','Fozia',
]

const LAST_NAMES = [
  'Khan','Ali','Ahmed','Hussain','Sheikh','Malik','Baig','Qureshi','Mirza','Aslam',
  'Chaudhry','Arshad','Siddiqui','Zahid','Akram','Rashid','Butt','Afzal','Ashraf','Ghani',
  'Mehmood','Iqbal','Haider','Gillani','Tariq','Noor','Latif','Pervaiz','Shahid','Waheed',
  'Rehman','Wahab','Aziz','Raza','Anwar','Javed','Riaz','Saeed','Jamil','Asghar',
]

const CITIES = ['Karachi','Lahore','Islamabad','Rawalpindi','Faisalabad','Multan','Peshawar','Quetta','Hyderabad','Sialkot']
const AREAS  = ['DHA','Gulshan','Johar Town','Model Town','Bahria Town','Clifton','F-7','G-11','Gulberg','Defence']

const SUPPLIER_NAMES = [
  'Al-Shifa Medical Distributors','Pak Pharma Traders','National Medicine Depot',
  'Karachi Medical Suppliers','Lahore Drug House','Islamabad Pharma Distributors',
  'Faisalabad Medical Traders','Rainbow Medical Distributors','City Pharma Suppliers',
  'Medico Distributors','Supreme Medical Traders','Royal Drug Distributors',
  'Star Medical Suppliers','Allied Pharma Traders','Premier Drug House',
  'United Medical Distributors','Crown Pharma Suppliers','Excel Medical Traders',
  'Evergreen Drug House','Diamond Medical Distributors','Crescent Pharma',
  'Atlas Drug Distributors','Falcon Medical Traders','Vision Pharma Suppliers',
  'Horizon Drug House','Sunrise Medical Distributors','Galaxy Pharma Traders',
  'Prime Medical Suppliers','Century Drug Distributors','Alpha Pharma Trading',
]

const EXPENSE_CATS = ['Rent','Electricity','Salaries','Maintenance','Packaging','Transport','Miscellaneous','Utilities','Office Supplies','Marketing']
const INCOME_CATS  = ['Subscription Fee','Commission','Rental Income','Late Fee','Service Charge','Miscellaneous']
const PAYMENT_METHODS = ['CASH','CARD','BANK_TRANSFER','CHEQUE']
const MODULES = ['sales','purchases','inventory','customers','suppliers','users','reports','settings']
const AUDIT_ACTIONS = ['CREATE','UPDATE','DELETE','VIEW','LOGIN','LOGOUT','EXPORT']

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const conn = await pool.getConnection()
  console.log('🔗 Connected to MariaDB\n')

  try {
    await conn.query('SET foreign_key_checks = 0')
    await conn.query('SET unique_checks = 0')
    await conn.query('SET autocommit = 0')

    // ── 1. Users ──────────────────────────────────────────────────────────────
    console.log('👤 Seeding users...')
    const pwHash = await bcrypt.hash('admin123', 10)
    const roles = ['ADMIN','MANAGER','CASHIER','CASHIER','INVENTORY_STAFF','INVENTORY_STAFF']
    const userRows: any[][] = []
    for (let i = 0; i < 50; i++) {
      const fn = pick(FIRST_NAMES)
      const ln = pick(LAST_NAMES)
      userRows.push([
        `user_${i + 1}`,
        pwHash,
        `${fn} ${ln}`,
        pick(roles),
        1,
        null,
        sqlDate(0), sqlDate(0),
      ])
    }
    // Make sure admin exists
    userRows[0] = ['admin', pwHash, 'Administrator', 'ADMIN', 1, null, sqlDate(0), sqlDate(0)]
    await conn.query('DELETE FROM `User` WHERE username LIKE "user_%"')
    await conn.query(`INSERT IGNORE INTO \`User\` (username,passwordHash,fullName,role,isActive,allowedTerminals,createdAt,updatedAt) VALUES ${userRows.map(() => '(?,?,?,?,?,?,?,?)').join(',')}`, userRows.flat())
    await conn.query('COMMIT')
    const userIds: number[] = (await conn.query('SELECT id FROM `User`')).map((r: any) => r.id)
    console.log(`   ✅ ${userIds.length} users`)

    // ── 2. Categories ─────────────────────────────────────────────────────────
    console.log('📂 Seeding categories...')
    for (const name of CATEGORIES) {
      await conn.query('INSERT IGNORE INTO `Category` (name,createdAt) VALUES (?,?)', [name, sqlDate(0)])
    }
    await conn.query('COMMIT')
    const catIds: number[] = (await conn.query('SELECT id FROM `Category`')).map((r: any) => r.id)
    console.log(`   ✅ ${catIds.length} categories`)

    // ── 3. Manufacturers ──────────────────────────────────────────────────────
    console.log('🏭 Seeding manufacturers...')
    for (const name of MANUFACTURERS) {
      await conn.query('INSERT IGNORE INTO `Manufacturer` (name,createdAt) VALUES (?,?)', [name, sqlDate(0)])
    }
    await conn.query('COMMIT')
    const mfrIds: number[] = (await conn.query('SELECT id FROM `Manufacturer`')).map((r: any) => r.id)
    console.log(`   ✅ ${mfrIds.length} manufacturers`)

    // ── 4. Suppliers ──────────────────────────────────────────────────────────
    console.log('🚚 Seeding suppliers...')
    const supRows: any[][] = []
    SUPPLIER_NAMES.forEach((name, i) => {
      supRows.push([name, pick(FIRST_NAMES)+' '+pick(LAST_NAMES), phone(),
        `${rand(1,999)} ${pick(AREAS)}, ${pick(CITIES)}`, 0, 1, sqlDate(-rand(0,365)), sqlDate(0)])
    })
    // Extra suppliers to reach 200
    for (let i = SUPPLIER_NAMES.length; i < 200; i++) {
      supRows.push([
        `${pick(['Al','Pak','National','City','Royal','Star','United','Excel','Diamond','Falcon'])} ${pick(['Medical','Pharma','Drug','Medicine','Health'])} ${pick(['Suppliers','Traders','Distributors','House','Depot'])} ${i}`,
        pick(FIRST_NAMES)+' '+pick(LAST_NAMES), phone(),
        `${rand(1,999)} ${pick(AREAS)}, ${pick(CITIES)}`, 0, 1, sqlDate(-rand(0,365)), sqlDate(0),
      ])
    }
    await bulkInsert(conn, 'Supplier',
      ['name','contactPerson','phone','address','payableBalance','isActive','createdAt','updatedAt'],
      supRows, 100)
    await conn.query('COMMIT')
    const supIds: number[] = (await conn.query('SELECT id FROM `Supplier`')).map((r: any) => r.id)
    console.log(`   ✅ ${supIds.length} suppliers`)

    // ── 5. Customers (100,000) ────────────────────────────────────────────────
    console.log('👥 Seeding 100,000 customers...')
    const TOTAL_CUSTOMERS = 100000
    const CREDIT_LIMITS = [0,0,0,0,5000,10000,15000,20000,50000]
    for (let i = 0; i < TOTAL_CUSTOMERS; i += 500) {
      const chunk: any[][] = []
      for (let j = 0; j < 500 && i + j < TOTAL_CUSTOMERS; j++) {
        chunk.push([
          `${pick(FIRST_NAMES)} ${pick(LAST_NAMES)}`,
          Math.random() > 0.15 ? phone() : null,
          Math.random() > 0.4 ? `House #${rand(1,999)}, Block ${rand(1,20)}, ${pick(AREAS)}, ${pick(CITIES)}` : null,
          pick(CREDIT_LIMITS),
          0,
          1,
          past(0, 1095),
          sqlDate(0),
        ])
      }
      await bulkInsert(conn, 'Customer',
        ['name','phone','address','creditLimit','outstandingBalance','isActive','createdAt','updatedAt'],
        chunk, 500)
      if ((i + 500) % 10000 === 0) {
        await conn.query('COMMIT')
        progress('Customers', Math.min(i + 500, TOTAL_CUSTOMERS), TOTAL_CUSTOMERS)
      }
    }
    await conn.query('COMMIT')
    const custIds: number[] = (await conn.query('SELECT id FROM `Customer`')).map((r: any) => r.id)
    console.log(`\n   ✅ ${custIds.length.toLocaleString()} customers`)

    // ── 6. Medicines (50,000) + Batches (100,000) ─────────────────────────────
    console.log('💊 Seeding 50,000 medicines...')
    const TOTAL_MEDS = 50000
    let barcodeBase = 4000000000000

    for (let i = 0; i < TOTAL_MEDS; i += 500) {
      const chunk: any[][] = []
      for (let j = 0; j < 500 && i + j < TOTAL_MEDS; j++) {
        const idx = i + j
        const generic = pick(GENERICS)
        const strength = pick(STRENGTHS)
        const form = pick(DOSAGE_FORMS)
        const brandName = `${pick(BRAND_PFXS)}${pick(BRAND_SUFXS)} ${idx > 1000 ? rand(100,999) : (idx + 1)}`
        const pr = randF(30, 2000)
        chunk.push([
          `MED-${String(idx + 1).padStart(6, '0')}`,
          String(barcodeBase + idx),
          brandName.trim(),
          `${generic} ${strength}`,
          strength,
          form,
          pick(PACK_SIZES),
          form === 'Tablet' || form === 'Capsule' ? 'Tablet' : 'Unit',
          pick([0,0,0,0,5,10,17]),
          pick([5,10,20,30,50]),
          Math.random() > 0.7 ? 1 : 0,
          Math.random() > 0.03 ? 1 : 0,
          pick(catIds),
          pick(mfrIds),
          past(0, 1095),
          sqlDate(0),
        ])
      }
      await bulkInsert(conn, 'Medicine', [
        'productCode','barcode','brandName','genericName','strength','dosageForm',
        'packSize','unit','taxRate','reorderLevel','prescriptionRequired','isActive',
        'categoryId','manufacturerId','createdAt','updatedAt',
      ], chunk, 500)
      if ((i + 500) % 10000 === 0) {
        await conn.query('COMMIT')
        progress('Medicines', Math.min(i + 500, TOTAL_MEDS), TOTAL_MEDS)
      }
    }
    await conn.query('COMMIT')
    const medIds: number[] = (await conn.query('SELECT id FROM `Medicine`')).map((r: any) => r.id)
    console.log(`\n   ✅ ${medIds.length.toLocaleString()} medicines`)

    // Batches: 2 per medicine = 100,000
    console.log('📦 Seeding ~100,000 batches...')
    const BATCH_PER_MED = 2
    let batchCount = 0
    for (let i = 0; i < medIds.length; i += 500) {
      const chunk: any[][] = []
      const slice = medIds.slice(i, i + 500)
      for (const mid of slice) {
        for (let b = 0; b < BATCH_PER_MED; b++) {
          const pr = randF(30, 2000)
          const sr = parseFloat((pr * randF(1.1, 1.45)).toFixed(2))
          const expired = Math.random() > 0.9
          chunk.push([
            mid,
            `BT${rand(100,999)}-${rand(2020,2025)}`,
            past(180, 900),
            expired ? past(1, 180) : future(30, 900),
            pr, sr,
            rand(0, 600),
            0,
            pick(supIds),
            past(0, 730),
            sqlDate(0),
          ])
        }
      }
      await bulkInsert(conn, 'Batch', [
        'medicineId','batchNumber','mfgDate','expiryDate','purchaseRate','saleRate',
        'quantity','freeQuantity','supplierId','createdAt','updatedAt',
      ], chunk, 500)
      batchCount += chunk.length
      if ((i + 500) % 10000 === 0) {
        await conn.query('COMMIT')
        progress('Batches', batchCount, medIds.length * BATCH_PER_MED)
      }
    }
    await conn.query('COMMIT')
    const batchIds: number[] = (await conn.query('SELECT id FROM `Batch`')).map((r: any) => r.id)
    console.log(`\n   ✅ ${batchIds.length.toLocaleString()} batches`)

    // ── 7. Shifts (5,000) ─────────────────────────────────────────────────────
    console.log('🕐 Seeding 5,000 shifts...')
    const shiftRows: any[][] = []
    for (let i = 0; i < 5000; i++) {
      const openedAt = past(0, 1095)
      const closed = Math.random() > 0.02
      const opening = randF(1000, 50000)
      shiftRows.push([
        openedAt,
        closed ? sqlDate(-rand(0, 3)) : null,
        opening,
        closed ? randF(opening * 0.8, opening * 1.5) : null,
        closed ? 'CLOSED' : 'OPEN',
        null,
        pick(userIds),
        closed ? pick(userIds) : null,
      ])
    }
    await bulkInsert(conn, 'Shift',
      ['openedAt','closedAt','openingBalance','closingBalance','status','notes','openedById','closedById'],
      shiftRows, 300)
    await conn.query('COMMIT')
    const shiftIds: number[] = (await conn.query('SELECT id FROM `Shift`')).map((r: any) => r.id)
    console.log(`   ✅ ${shiftIds.length.toLocaleString()} shifts`)

    // ── 8. Sales (100,000) + SaleItems ───────────────────────────────────────
    console.log('🧾 Seeding 100,000 sales + sale items...')
    const PAY_METHODS: any[] = ['CASH','CASH','CASH','CARD','CREDIT','SPLIT']
    const SALE_STATUSES: any[] = ['COMPLETED','COMPLETED','COMPLETED','COMPLETED','CANCELLED']
    const TOTAL_SALES = 100000
    const CHUNK_SALES = 200
    let saleItemCount = 0

    for (let i = 0; i < TOTAL_SALES; i += CHUNK_SALES) {
      const saleRows: any[][] = []
      const actual = Math.min(CHUNK_SALES, TOTAL_SALES - i)

      for (let j = 0; j < actual; j++) {
        const sub = randF(200, 15000)
        const disc = Math.random() > 0.7 ? randF(0, sub * 0.15) : 0
        const tax = parseFloat((sub * (Math.random() > 0.6 ? randF(0.01, 0.17) : 0)).toFixed(2))
        const total = parseFloat((sub - disc + tax).toFixed(2))
        const paid = Math.random() > 0.1 ? total : randF(total * 0.5, total)
        saleRows.push([
          invNo('INV', i + j + 1),
          Math.random() > 0.3 ? pick(custIds) : null,
          pick(userIds),
          pick(shiftIds),
          null,
          pick(SALE_STATUSES),
          sub.toFixed(2),
          disc.toFixed(2),
          tax.toFixed(2),
          total.toFixed(2),
          paid.toFixed(2),
          Math.max(0, paid - total).toFixed(2),
          pick(PAY_METHODS),
          null,
          past(0, 1095),
        ])
      }

      await bulkInsert(conn, 'Sale', [
        'invoiceNumber','customerId','userId','shiftId','terminalId','status',
        'subtotal','discountAmount','taxAmount','total','amountPaid','changeAmount',
        'paymentMethod','notes','createdAt',
      ], saleRows, CHUNK_SALES)

      // Fetch inserted IDs
      const from = i + 1, to = i + actual
      const inserted: any[] = await conn.query(
        `SELECT id FROM \`Sale\` WHERE invoiceNumber BETWEEN ? AND ? ORDER BY id`,
        [invNo('INV', from), invNo('INV', to)],
      )

      // SaleItems: 1-4 items per sale
      const itemRows: any[][] = []
      for (const row of inserted) {
        const numItems = rand(1, 4)
        for (let k = 0; k < numItems; k++) {
          const bid = pick(batchIds)
          const qty = rand(1, 20)
          const sr = randF(50, 2000)
          const disc2 = Math.random() > 0.8 ? randF(0, 20) : 0
          const total2 = parseFloat((qty * sr * (1 - disc2 / 100)).toFixed(2))
          itemRows.push([row.id, bid, qty, sr.toFixed(2), disc2.toFixed(2), 0, total2.toFixed(2)])
        }
      }
      await bulkInsert(conn, 'SaleItem',
        ['saleId','batchId','quantity','saleRate','discount','taxRate','total'],
        itemRows, 500)
      saleItemCount += itemRows.length

      if ((i + CHUNK_SALES) % 10000 === 0) {
        await conn.query('COMMIT')
        progress('Sales', Math.min(i + CHUNK_SALES, TOTAL_SALES), TOTAL_SALES)
      }
    }
    await conn.query('COMMIT')
    const saleIds: number[] = (await conn.query('SELECT id FROM `Sale` LIMIT 200000')).map((r: any) => r.id)
    console.log(`\n   ✅ ${saleIds.length.toLocaleString()} sales + ${saleItemCount.toLocaleString()} sale items`)

    // ── 9. Purchases (50,000) + PurchaseItems ────────────────────────────────
    console.log('🛒 Seeding 50,000 purchases + purchase items...')
    const TOTAL_PURCHASES = 50000
    const CHUNK_PURCH = 200
    let purchItemCount = 0

    for (let i = 0; i < TOTAL_PURCHASES; i += CHUNK_PURCH) {
      const rows: any[][] = []
      const actual = Math.min(CHUNK_PURCH, TOTAL_PURCHASES - i)

      for (let j = 0; j < actual; j++) {
        const sub = randF(5000, 500000)
        const disc = Math.random() > 0.6 ? randF(0, sub * 0.1) : 0
        const tax = parseFloat((sub * (Math.random() > 0.5 ? randF(0, 0.17) : 0)).toFixed(2))
        const total = parseFloat((sub - disc + tax).toFixed(2))
        const paid = Math.random() > 0.15 ? total : randF(total * 0.4, total)
        const pdate = past(0, 1095)
        rows.push([
          invNo('PUR', i + j + 1),
          pick(supIds),
          pick(['RECEIVED','RECEIVED','RECEIVED','PARTIAL','DRAFT']),
          sub.toFixed(2), disc.toFixed(2), tax.toFixed(2), total.toFixed(2),
          paid.toFixed(2), null, pdate, pdate, sqlDate(0),
        ])
      }

      await bulkInsert(conn, 'Purchase', [
        'invoiceNumber','supplierId','status','subtotal','discountAmount','taxAmount',
        'total','amountPaid','notes','purchaseDate','createdAt','updatedAt',
      ], rows, CHUNK_PURCH)

      const from = i + 1, to = i + actual
      const inserted: any[] = await conn.query(
        `SELECT id FROM \`Purchase\` WHERE invoiceNumber BETWEEN ? AND ? ORDER BY id`,
        [invNo('PUR', from), invNo('PUR', to)],
      )

      const itemRows: any[][] = []
      for (const row of inserted) {
        const numItems = rand(2, 6)
        for (let k = 0; k < numItems; k++) {
          const bid = pick(batchIds)
          const qty = rand(10, 200)
          const pr = randF(30, 2000)
          const sr = parseFloat((pr * randF(1.1, 1.45)).toFixed(2))
          const disc2 = Math.random() > 0.7 ? randF(0, 15) : 0
          const total2 = parseFloat((qty * pr * (1 - disc2 / 100)).toFixed(2))
          itemRows.push([row.id, bid, qty, 0, pr.toFixed(2), sr.toFixed(2), disc2.toFixed(2), 0, total2.toFixed(2)])
        }
      }
      await bulkInsert(conn, 'PurchaseItem',
        ['purchaseId','batchId','quantity','freeQuantity','purchaseRate','saleRate','discount','taxRate','total'],
        itemRows, 500)
      purchItemCount += itemRows.length

      if ((i + CHUNK_PURCH) % 10000 === 0) {
        await conn.query('COMMIT')
        progress('Purchases', Math.min(i + CHUNK_PURCH, TOTAL_PURCHASES), TOTAL_PURCHASES)
      }
    }
    await conn.query('COMMIT')
    const purchIds: number[] = (await conn.query('SELECT id FROM `Purchase` LIMIT 100000')).map((r: any) => r.id)
    console.log(`\n   ✅ ${purchIds.length.toLocaleString()} purchases + ${purchItemCount.toLocaleString()} purchase items`)

    // ── 10. Payments (100,000) ────────────────────────────────────────────────
    console.log('💳 Seeding 100,000 payments...')
    const PAY_TYPES: any[] = ['CUSTOMER_RECEIPT','CUSTOMER_RECEIPT','SUPPLIER_PAYMENT','SUPPLIER_PAYMENT','EXPENSE','INCOME']
    for (let i = 0; i < 100000; i += 500) {
      const chunk: any[][] = []
      for (let j = 0; j < 500 && i + j < 100000; j++) {
        const type = pick(PAY_TYPES)
        const isCust = type === 'CUSTOMER_RECEIPT'
        const isSup  = type === 'SUPPLIER_PAYMENT'
        chunk.push([
          type,
          randF(500, 100000).toFixed(2),
          pick(PAYMENT_METHODS),
          Math.random() > 0.5 ? `REF-${rand(10000, 99999)}` : null,
          null,
          isCust ? pick(custIds) : null,
          isSup  ? pick(supIds)  : null,
          isCust && saleIds.length ? pick(saleIds) : null,
          isSup  && purchIds.length ? pick(purchIds) : null,
          past(0, 1095),
        ])
      }
      await bulkInsert(conn, 'Payment',
        ['type','amount','method','reference','notes','customerId','supplierId','saleId','purchaseId','createdAt'],
        chunk, 500)
      if ((i + 500) % 20000 === 0) {
        await conn.query('COMMIT')
        progress('Payments', Math.min(i + 500, 100000), 100000)
      }
    }
    await conn.query('COMMIT')
    console.log(`\n   ✅ 100,000 payments`)

    // ── 11. Expenses (50,000) ─────────────────────────────────────────────────
    console.log('💸 Seeding 50,000 expenses...')
    for (let i = 0; i < 50000; i += 500) {
      const chunk: any[][] = []
      for (let j = 0; j < 500 && i + j < 50000; j++) {
        const d = past(0, 1095)
        chunk.push([pick(EXPENSE_CATS), Math.random() > 0.5 ? `${pick(EXPENSE_CATS)} expense #${i+j+1}` : null, randF(500, 100000).toFixed(2), d, d])
      }
      await bulkInsert(conn, 'Expense', ['category','description','amount','date','createdAt'], chunk, 500)
      if ((i + 500) % 20000 === 0) await conn.query('COMMIT')
    }
    await conn.query('COMMIT')
    console.log(`   ✅ 50,000 expenses`)

    // ── 12. Income (30,000) ───────────────────────────────────────────────────
    console.log('💰 Seeding 30,000 income records...')
    for (let i = 0; i < 30000; i += 500) {
      const chunk: any[][] = []
      for (let j = 0; j < 500 && i + j < 30000; j++) {
        const d = past(0, 1095)
        chunk.push([pick(INCOME_CATS), null, randF(1000, 50000).toFixed(2), d, d])
      }
      await bulkInsert(conn, 'Income', ['category','description','amount','date','createdAt'], chunk, 500)
      if ((i + 500) % 10000 === 0) await conn.query('COMMIT')
    }
    await conn.query('COMMIT')
    console.log(`   ✅ 30,000 income records`)

    // ── 13. StockMovements (100,000) ──────────────────────────────────────────
    console.log('📊 Seeding 100,000 stock movements...')
    const MOV_TYPES: any[] = ['SALE','SALE','SALE','PURCHASE','PURCHASE','SALE_RETURN','ADJUSTMENT_IN','ADJUSTMENT_OUT','DAMAGE','EXPIRY_WRITEOFF']
    for (let i = 0; i < 100000; i += 500) {
      const chunk: any[][] = []
      for (let j = 0; j < 500 && i + j < 100000; j++) {
        chunk.push([pick(batchIds), pick(MOV_TYPES), rand(1, 100), null, null, past(0, 1095)])
      }
      await bulkInsert(conn, 'StockMovement', ['batchId','type','quantity','reason','referenceId','createdAt'], chunk, 500)
      if ((i + 500) % 20000 === 0) await conn.query('COMMIT')
    }
    await conn.query('COMMIT')
    console.log(`   ✅ 100,000 stock movements`)

    // ── 14. AuditLogs (100,000) ───────────────────────────────────────────────
    console.log('📋 Seeding 100,000 audit logs...')
    for (let i = 0; i < 100000; i += 500) {
      const chunk: any[][] = []
      for (let j = 0; j < 500 && i + j < 100000; j++) {
        chunk.push([
          pick(userIds), pick(MODULES), pick(AUDIT_ACTIONS),
          rand(1, 99999), null, null, null, past(0, 1095),
        ])
      }
      await bulkInsert(conn, 'AuditLog', ['userId','module','action','recordId','oldValue','newValue','terminalId','createdAt'], chunk, 500)
      if ((i + 500) % 20000 === 0) await conn.query('COMMIT')
    }
    await conn.query('COMMIT')
    console.log(`   ✅ 100,000 audit logs`)

    // ── 15. Sale Returns (5,000) ──────────────────────────────────────────────
    console.log('↩️  Seeding 5,000 sale returns...')
    const returnReasons = ['Damaged product','Wrong medicine','Patient refused','Expired','Quality issue','Doctor changed prescription']
    const saleReturnRows: any[][] = []
    const sampleSaleIds = saleIds.slice(0, 5000)
    for (let i = 0; i < 5000; i++) {
      const sid = sampleSaleIds[i] ?? pick(saleIds)
      saleReturnRows.push([sid, Math.random() > 0.4 ? pick(custIds) : null, pick(returnReasons), randF(200, 5000).toFixed(2), pick(['CASH','CARD',null]), past(0, 365)])
    }
    await bulkInsert(conn, 'SaleReturn', ['saleId','customerId','reason','refundAmount','refundMethod','createdAt'], saleReturnRows, 300)
    await conn.query('COMMIT')
    const saleReturnIds: number[] = (await conn.query('SELECT id FROM `SaleReturn` LIMIT 5000')).map((r: any) => r.id)

    const srItemRows: any[][] = []
    for (const rid of saleReturnIds) {
      const n = rand(1, 3)
      for (let k = 0; k < n; k++) {
        srItemRows.push([rid, pick(batchIds), rand(1, 5), Math.random() > 0.7 ? 1 : 0, randF(100, 2000).toFixed(2)])
      }
    }
    await bulkInsert(conn, 'SaleReturnItem', ['saleReturnId','batchId','quantity','isDamaged','refundAmount'], srItemRows, 500)
    await conn.query('COMMIT')
    console.log(`   ✅ ${saleReturnIds.length.toLocaleString()} sale returns + ${srItemRows.length.toLocaleString()} items`)

    // ── 16. Purchase Returns (5,000) ──────────────────────────────────────────
    console.log('↩️  Seeding 5,000 purchase returns...')
    const purchReturnRows: any[][] = []
    const samplePurchIds = purchIds.slice(0, 5000)
    for (let i = 0; i < 5000; i++) {
      const pid = samplePurchIds[i] ?? pick(purchIds)
      const purch: any = await conn.query('SELECT supplierId FROM `Purchase` WHERE id=? LIMIT 1', [pid])
      const sid2 = purch[0]?.supplierId ?? pick(supIds)
      purchReturnRows.push([pid, sid2, pick(['Damaged goods','Wrong item','Overstock','Quality issue']), randF(1000, 50000).toFixed(2), past(0, 365)])
    }
    await bulkInsert(conn, 'PurchaseReturn', ['purchaseId','supplierId','reason','totalAmount','createdAt'], purchReturnRows, 300)
    await conn.query('COMMIT')
    const purchReturnIds: number[] = (await conn.query('SELECT id FROM `PurchaseReturn` LIMIT 5000')).map((r: any) => r.id)

    const prItemRows: any[][] = []
    for (const rid of purchReturnIds) {
      const n = rand(1, 4)
      for (let k = 0; k < n; k++) {
        prItemRows.push([rid, pick(batchIds), rand(1, 50), randF(500, 5000).toFixed(2)])
      }
    }
    await bulkInsert(conn, 'PurchaseReturnItem', ['purchaseReturnId','batchId','quantity','amount'], prItemRows, 500)
    await conn.query('COMMIT')
    console.log(`   ✅ ${purchReturnIds.length.toLocaleString()} purchase returns + ${prItemRows.length.toLocaleString()} items`)

    // ── Final ─────────────────────────────────────────────────────────────────
    await conn.query('SET foreign_key_checks = 1')
    await conn.query('SET unique_checks = 1')
    await conn.query('COMMIT')

    console.log('\n' + '═'.repeat(50))
    console.log('✅  BULK SEED COMPLETE!')
    console.log('═'.repeat(50))

    const counts: any[] = await conn.query(`
      SELECT 'User' t, COUNT(*) n FROM \`User\`
      UNION ALL SELECT 'Customer', COUNT(*) FROM Customer
      UNION ALL SELECT 'Supplier', COUNT(*) FROM Supplier
      UNION ALL SELECT 'Medicine', COUNT(*) FROM Medicine
      UNION ALL SELECT 'Batch', COUNT(*) FROM Batch
      UNION ALL SELECT 'Shift', COUNT(*) FROM Shift
      UNION ALL SELECT 'Sale', COUNT(*) FROM Sale
      UNION ALL SELECT 'SaleItem', COUNT(*) FROM SaleItem
      UNION ALL SELECT 'SaleReturn', COUNT(*) FROM SaleReturn
      UNION ALL SELECT 'Purchase', COUNT(*) FROM Purchase
      UNION ALL SELECT 'PurchaseItem', COUNT(*) FROM PurchaseItem
      UNION ALL SELECT 'PurchaseReturn', COUNT(*) FROM PurchaseReturn
      UNION ALL SELECT 'Payment', COUNT(*) FROM Payment
      UNION ALL SELECT 'Expense', COUNT(*) FROM Expense
      UNION ALL SELECT 'Income', COUNT(*) FROM Income
      UNION ALL SELECT 'StockMovement', COUNT(*) FROM StockMovement
      UNION ALL SELECT 'AuditLog', COUNT(*) FROM AuditLog
    `)
    for (const row of counts) {
      console.log(`   ${row.t.padEnd(20)} ${Number(row.n).toLocaleString()} records`)
    }
    console.log('═'.repeat(50))

  } finally {
    conn.release()
    await pool.end()
  }
}

main().catch((e) => {
  console.error('❌ Seed failed:', e.message)
  process.exit(1)
})
