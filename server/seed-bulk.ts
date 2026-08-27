import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import { PrismaMariaDb } from '@prisma/adapter-mariadb'

// ─── DB Connection ────────────────────────────────────────────────────────────
const url = process.env.DATABASE_URL ?? ''
const parsed = new URL(url)
const adapter = new PrismaMariaDb({
  host: parsed.hostname,
  port: parseInt(parsed.port || '3306'),
  user: parsed.username,
  password: parsed.password,
  database: parsed.pathname.replace('/', ''),
  connectionLimit: 10,
})
const prisma = new PrismaClient({ adapter })

// ─── Reference Data ───────────────────────────────────────────────────────────

const CATEGORIES = [
  'Antibiotics', 'Analgesics / Painkillers', 'Antacids & GI', 'Antihistamines',
  'Vitamins & Supplements', 'Antidiabetics', 'Antihypertensives', 'Cardiovascular',
  'Antifungals', 'Antivirals', 'Corticosteroids', 'Dermatological', 'Eye & Ear Drops',
  'Respiratory / Cough', 'Neurological', 'Psychiatric', 'Hormones & Endocrine',
  'Urological', 'Musculoskeletal', 'Antiparasitics', 'Oral Health', 'Surgical',
  'Vaccines & Biologics', 'Oncology', 'Pediatric', 'Gynaecology', 'Hepatology',
  'Nephrology', 'Immunology', 'Miscellaneous',
]

const MANUFACTURERS = [
  'Getz Pharma', 'Ferozsons Laboratories', 'AGP Limited', 'Sami Pharmaceuticals',
  'Searle Pakistan', 'Highnoon Laboratories', 'Barrett Hodgson', 'ICI Pakistan',
  'Reckitt Benckiser', 'GlaxoSmithKline Pakistan', 'Pfizer Pakistan', 'Novartis Pakistan',
  'Abbott Laboratories Pakistan', 'Bayer Pakistan', 'Merck Pakistan', 'Sanofi Pakistan',
  'Wyeth Pakistan', 'Nabi Qasim Industries', 'ATCO Laboratories', 'Martin Dow',
  'PharmEvo', 'Global Pharmaceuticals', 'Medisave Pharma', 'Platinum Pharmaceuticals',
  'Pacific Pharmaceuticals', 'Efroze Chemical Industries', 'Indus Pharma',
  'CCL Pharmaceuticals', 'Herbion Pakistan', 'Tabros Pharma',
]

const DOSAGE_FORMS = [
  'Tablet', 'Capsule', 'Syrup', 'Injection', 'Cream', 'Ointment', 'Drops',
  'Suspension', 'Gel', 'Suppository', 'Inhaler', 'Patch', 'Sachet', 'Powder',
]

const STRENGTHS = [
  '125mg', '250mg', '500mg', '1000mg', '50mg', '100mg', '200mg', '400mg',
  '25mg', '75mg', '150mg', '300mg', '600mg', '5mg', '10mg', '20mg', '40mg',
  '80mg', '1mg', '2mg', '5ml', '10ml', '2.5mg/5ml', '125mg/5ml', '250mg/5ml',
  '500mg/5ml', '0.5%', '1%', '2%', '5%', '10%', '0.1%', '0.025%',
]

const PACK_SIZES = [
  '1 Strip of 10', '1 Strip of 14', '2 Strips of 10', 'Box of 100',
  'Bottle 60ml', 'Bottle 120ml', 'Bottle 200ml', 'Tube 15g', 'Tube 30g',
  '1 Vial', '5 Vials', 'Box of 30', 'Sachet x10', '1 Inhaler',
]

const GENERIC_PREFIXES = [
  'Amoxicillin', 'Ampicillin', 'Azithromycin', 'Ciprofloxacin', 'Doxycycline',
  'Metronidazole', 'Clarithromycin', 'Cefixime', 'Ceftriaxone', 'Levofloxacin',
  'Paracetamol', 'Ibuprofen', 'Diclofenac', 'Aspirin', 'Naproxen', 'Tramadol',
  'Mefenamic Acid', 'Ketorolac', 'Piroxicam', 'Celecoxib',
  'Omeprazole', 'Pantoprazole', 'Ranitidine', 'Esomeprazole', 'Lansoprazole',
  'Domperidone', 'Metoclopramide', 'Ondansetron', 'Bismuth', 'Antacid',
  'Cetirizine', 'Loratadine', 'Chlorpheniramine', 'Fexofenadine', 'Diphenhydramine',
  'Metformin', 'Glibenclamide', 'Glimepiride', 'Sitagliptin', 'Insulin',
  'Amlodipine', 'Atenolol', 'Lisinopril', 'Losartan', 'Valsartan', 'Enalapril',
  'Atorvastatin', 'Simvastatin', 'Rosuvastatin', 'Clopidogrel', 'Digoxin',
  'Fluconazole', 'Clotrimazole', 'Terbinafine', 'Griseofulvin', 'Nystatin',
  'Acyclovir', 'Oseltamivir', 'Ribavirin', 'Lamivudine', 'Tenofovir',
  'Prednisolone', 'Dexamethasone', 'Betamethasone', 'Hydrocortisone', 'Triamcinolone',
  'Vitamin C', 'Vitamin D3', 'Vitamin B12', 'Folic Acid', 'Iron Sulfate',
  'Calcium Carbonate', 'Zinc Sulfate', 'Multivitamin', 'Fish Oil', 'Biotin',
  'Salbutamol', 'Theophylline', 'Montelukast', 'Budesonide', 'Ipratropium',
  'Alprazolam', 'Diazepam', 'Sertraline', 'Fluoxetine', 'Amitriptyline',
  'Levothyroxine', 'Propylthiouracil', 'Methimazole', 'Testosterone', 'Estrogen',
  'Tamsulosin', 'Finasteride', 'Sildenafil', 'Tadalafil', 'Oxybutynin',
  'Chloroquine', 'Albendazole', 'Mebendazole', 'Praziquantel', 'Ivermectin',
  'Adrenaline', 'Atropine', 'Morphine', 'Codeine', 'Fentanyl',
  'Warfarin', 'Enoxaparin', 'Heparin', 'Rivaroxaban', 'Dabigatran',
  'Gabapentin', 'Pregabalin', 'Carbamazepine', 'Phenytoin', 'Valproic Acid',
  'Methotrexate', 'Cyclosporine', 'Azathioprine', 'Hydroxychloroquine', 'Colchicine',
  'Furosemide', 'Spironolactone', 'Hydrochlorothiazide', 'Mannitol', 'Acetazolamide',
  'Methyldopa', 'Hydralazine', 'Nifedipine', 'Diltiazem', 'Verapamil',
]

const BRAND_PREFIXES = [
  'Amox', 'Cipro', 'Azith', 'Cef', 'Metro', 'Levo', 'Clari', 'Doxi',
  'Para', 'Ibu', 'Diclo', 'Napro', 'Tram', 'Mefe', 'Cele',
  'Ome', 'Panto', 'Rani', 'Esome', 'Lanso', 'Dom', 'Ondan',
  'Ceti', 'Lora', 'Fexo', 'Chlor', 'Diphen',
  'Metf', 'Glib', 'Glim', 'Sita',
  'Amlo', 'Aten', 'Lisin', 'Losar', 'Valsar', 'Enal',
  'Ator', 'Simva', 'Rosuva', 'Clopi',
  'Fluco', 'Clotri', 'Terbi',
  'Acyclo', 'Oselta',
  'Pred', 'Dexa', 'Beta', 'Hydro',
  'VitC', 'VitD', 'CalC', 'Zinc', 'Multi',
  'Salbu', 'Theo', 'Monte', 'Bude',
  'Alpra', 'Diaze', 'Sertra', 'Fluoxe', 'Amitri',
  'Thyro', 'Tamsu', 'Finas', 'Silde', 'Tadal',
  'Chloro', 'Alben', 'Meben', 'Iverm',
  'Warf', 'Enoxa', 'Riva', 'Dabi',
  'Gaba', 'Preg', 'Carba', 'Pheny', 'Valp',
  'Furo', 'Spiro', 'Hydro', 'Manni',
  'Methyl', 'Hydral', 'Nifed', 'Diltia', 'Verap',
]

const BRAND_SUFFIXES = [
  'tab', 'cap', 'forte', 'plus', 'max', 'pro', 'dsr', 'xr', 'sr', 'er',
  'od', 'ls', 'junior', 'pediatric', 'adult', '500', '250', 'mg',
  '-D', 'Extra', 'Ultra', 'Neo', 'Nova', 'Star', 'Care', 'Heal',
]

const CUSTOMER_NAMES = [
  'Ahmed Ali', 'Muhammad Hassan', 'Fatima Zahra', 'Ayesha Siddiqui', 'Usman Khan',
  'Sara Malik', 'Bilal Ahmed', 'Zainab Hussain', 'Imran Sheikh', 'Nadia Akhtar',
  'Tariq Mahmood', 'Rabia Qureshi', 'Asif Raza', 'Hina Javed', 'Shahid Iqbal',
  'Amna Farooq', 'Kamran Baig', 'Sobia Nawaz', 'Faisal Mirza', 'Saima Aslam',
  'Rizwan Chaudhry', 'Mehwish Arshad', 'Adnan Siddiqui', 'Lubna Zahid', 'Waseem Akram',
  'Naila Rashid', 'Hamid Butt', 'Kiran Afzal', 'Salman Ashraf', 'Rukhsana Ghani',
  'Tahir Mehmood', 'Shazia Malik', 'Nasir Hussain', 'Farah Khan', 'Aqeel Ahmad',
  'Bushra Noor', 'Zahid Latif', 'Sadaf Pervaiz', 'Javed Iqbal', 'Maryam Shahid',
  'Irfan Haider', 'Sana Gillani', 'Naveed Ahmed', 'Uzma Tariq', 'Sajjad Ali',
  'Nimra Baig', 'Khalid Rehman', 'Anam Waheed', 'Shoaib Akhtar', 'Razia Sultana',
]

const SUPPLIER_NAMES = [
  'Al-Shifa Medical Distributors', 'Pak Pharma Traders', 'National Medicine Depot',
  'Karachi Medical Suppliers', 'Lahore Drug House', 'Islamabad Pharma Distributors',
  'Faisalabad Medical Traders', 'Rainbow Medical Distributors', 'City Pharma Suppliers',
  'Medico Distributors', 'Supreme Medical Traders', 'Royal Drug Distributors',
  'Star Medical Suppliers', 'Allied Pharma Traders', 'Premier Drug House',
  'United Medical Distributors', 'Crown Pharma Suppliers', 'Excel Medical Traders',
  'Evergreen Drug House', 'Diamond Medical Distributors',
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

function rand(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function randFloat(min: number, max: number) {
  return parseFloat((Math.random() * (max - min) + min).toFixed(2))
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

function futureDate(minDays: number, maxDays: number): Date {
  const d = new Date()
  d.setDate(d.getDate() + rand(minDays, maxDays))
  return d
}

function pastDate(minDays: number, maxDays: number): Date {
  const d = new Date()
  d.setDate(d.getDate() - rand(minDays, maxDays))
  return d
}

function phone() {
  return `03${rand(0, 4)}${rand(0, 9)}-${rand(1000000, 9999999)}`
}

function batchNo() {
  return `BT-${rand(100, 999)}-${new Date().getFullYear()}`
}

// Chunk array into smaller pieces for batch inserts
function chunk<T>(arr: T[], size: number): T[][] {
  const chunks: T[][] = []
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size))
  }
  return chunks
}

// ─── Main Seed ────────────────────────────────────────────────────────────────

async function main() {
  console.log('🌱 Starting bulk seed...\n')

  // 1. Categories
  console.log('📦 Seeding categories...')
  await prisma.category.createMany({
    data: CATEGORIES.map(name => ({ name })),
    skipDuplicates: true,
  })
  const categories = await prisma.category.findMany()
  console.log(`   ✅ ${categories.length} categories`)

  // 2. Manufacturers
  console.log('🏭 Seeding manufacturers...')
  await prisma.manufacturer.createMany({
    data: MANUFACTURERS.map(name => ({ name })),
    skipDuplicates: true,
  })
  const manufacturers = await prisma.manufacturer.findMany()
  console.log(`   ✅ ${manufacturers.length} manufacturers`)

  // 3. Suppliers (20)
  console.log('🚚 Seeding suppliers...')
  await prisma.supplier.createMany({
    data: SUPPLIER_NAMES.map(name => ({
      name,
      contactPerson: pick(CUSTOMER_NAMES),
      phone: phone(),
      address: `${rand(1, 999)} ${pick(['Main Road', 'Commercial Area', 'Industrial Zone', 'Market Street', 'Plaza'])}, ${pick(['Karachi', 'Lahore', 'Islamabad', 'Faisalabad', 'Multan'])}`,
    })),
    skipDuplicates: true,
  })
  const suppliers = await prisma.supplier.findMany()
  console.log(`   ✅ ${suppliers.length} suppliers`)

  // 4. Customers (500)
  console.log('👥 Seeding customers...')
  const customerData: any[] = []
  for (let i = 0; i < 500; i++) {
    const base = pick(CUSTOMER_NAMES)
    customerData.push({
      name: `${base} ${i > 49 ? rand(100, 999) : ''}`.trim(),
      phone: phone(),
      address: `House #${rand(1, 999)}, Block ${rand(1, 20)}, ${pick(['DHA', 'Gulshan', 'Johar Town', 'Model Town', 'Bahria Town', 'Clifton', 'F-7', 'G-11'])}, ${pick(['Karachi', 'Lahore', 'Islamabad', 'Faisalabad'])}`,
      creditLimit: pick([0, 0, 0, 5000, 10000, 15000, 20000, 50000]),
      outstandingBalance: 0,
    })
  }
  const customerChunks = chunk(customerData, 100)
  for (const ch of customerChunks) {
    await prisma.customer.createMany({ data: ch, skipDuplicates: true })
  }
  const customers = await prisma.customer.findMany()
  console.log(`   ✅ ${customers.length} customers`)

  // 5. Medicines (10,000) + Batches
  console.log('💊 Seeding 10,000 medicines + batches...')
  let medicineCount = 0
  let batchCount = 0

  const BATCH_SIZE = 200
  const TOTAL_MEDICINES = 10000

  for (let i = 0; i < TOTAL_MEDICINES; i += BATCH_SIZE) {
    const medBatch: any[] = []

    for (let j = 0; j < BATCH_SIZE && (i + j) < TOTAL_MEDICINES; j++) {
      const idx = i + j
      const generic = pick(GENERIC_PREFIXES)
      const brandPrefix = pick(BRAND_PREFIXES)
      const brandSuffix = Math.random() > 0.5 ? ` ${pick(BRAND_SUFFIXES)}` : ''
      const brandName = `${brandPrefix}${brandSuffix}${idx > 500 ? ` ${rand(100, 999)}` : ''}`
      const strength = pick(STRENGTHS)
      const dosageForm = pick(DOSAGE_FORMS)
      const purchaseRate = randFloat(50, 1500)
      const saleRate = parseFloat((purchaseRate * randFloat(1.1, 1.4)).toFixed(2))

      medBatch.push({
        productCode: `MED-${String(idx + 1).padStart(5, '0')}`,
        barcode: `${rand(1000000000000, 9999999999999)}`,
        brandName,
        genericName: `${generic} ${strength}`,
        strength,
        dosageForm,
        packSize: pick(PACK_SIZES),
        unit: dosageForm === 'Tablet' || dosageForm === 'Capsule' ? 'Tablet' : dosageForm === 'Syrup' || dosageForm === 'Suspension' ? 'Bottle' : 'Unit',
        taxRate: pick([0, 0, 0, 0, 5, 10, 17]),
        reorderLevel: pick([10, 20, 30, 50, 5, 0]),
        prescriptionRequired: Math.random() > 0.7,
        isActive: Math.random() > 0.05,
        categoryId: pick(categories).id,
        manufacturerId: pick(manufacturers).id,
      })
    }

    // Insert medicines
    await prisma.medicine.createMany({ data: medBatch, skipDuplicates: true })
    medicineCount += medBatch.length

    // Get the inserted medicines for this batch to create batches
    const insertedMeds = await prisma.medicine.findMany({
      where: { productCode: { in: medBatch.map(m => m.productCode) } },
      select: { id: true },
    })

    // Create 1-3 batches per medicine
    const batchData: any[] = []
    for (const med of insertedMeds) {
      const numBatches = rand(1, 3)
      for (let b = 0; b < numBatches; b++) {
        const purchaseRate = randFloat(50, 1500)
        const saleRate = parseFloat((purchaseRate * randFloat(1.1, 1.4)).toFixed(2))
        const qty = rand(0, 500)
        const isExpired = Math.random() > 0.92

        batchData.push({
          medicineId: med.id,
          batchNumber: batchNo(),
          mfgDate: pastDate(180, 720),
          expiryDate: isExpired ? pastDate(1, 90) : futureDate(30, 730),
          purchaseRate,
          saleRate,
          quantity: qty,
          freeQuantity: 0,
          supplierId: pick(suppliers).id,
        })
      }
    }

    await prisma.batch.createMany({ data: batchData, skipDuplicates: true })
    batchCount += batchData.length

    if ((i + BATCH_SIZE) % 1000 === 0 || i + BATCH_SIZE >= TOTAL_MEDICINES) {
      console.log(`   💊 ${Math.min(i + BATCH_SIZE, TOTAL_MEDICINES).toLocaleString()} / ${TOTAL_MEDICINES.toLocaleString()} medicines done...`)
    }
  }

  console.log(`   ✅ ${medicineCount.toLocaleString()} medicines + ${batchCount.toLocaleString()} batches`)

  // 6. Summary
  const [totalMeds, totalBatches, totalCustomers, totalSuppliers] = await Promise.all([
    prisma.medicine.count(),
    prisma.batch.count(),
    prisma.customer.count(),
    prisma.supplier.count(),
  ])

  console.log('\n═══════════════════════════════════')
  console.log('✅ BULK SEED COMPLETE!')
  console.log('═══════════════════════════════════')
  console.log(`💊 Medicines:   ${totalMeds.toLocaleString()}`)
  console.log(`📦 Batches:     ${totalBatches.toLocaleString()}`)
  console.log(`👥 Customers:   ${totalCustomers.toLocaleString()}`)
  console.log(`🚚 Suppliers:   ${totalSuppliers.toLocaleString()}`)
  console.log(`📂 Categories:  ${categories.length}`)
  console.log(`🏭 Manufacturers: ${manufacturers.length}`)
  console.log('═══════════════════════════════════')

  await prisma.$disconnect()
}

main().catch((e) => {
  console.error('❌ Seed failed:', e)
  process.exit(1)
})
