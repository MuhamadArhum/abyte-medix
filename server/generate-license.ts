import * as crypto from 'crypto'
import * as readline from 'readline'

const SECRET = process.env.LICENSE_SECRET || 'abyte-medix-license-secret-@2025#do-not-share'

const PLAN_CODES: Record<string, string> = { BASIC: 'B', STANDARD: 'S', PREMIUM: 'P' }
const PLANS = Object.keys(PLAN_CODES)

interface LicensePayload {
  n: string  // storeName
  p: string  // plan code (B/S/P)
  m: number  // maxPos
  e: string  // expiry YYYY-MM-DD or '' for perpetual
}

function generateKey(payload: LicensePayload): string {
  const json = JSON.stringify(payload)
  const hmac = crypto.createHmac('sha256', SECRET).update(json).digest('hex').slice(0, 16)
  const combined = `${json}.${hmac}`
  const encoded = Buffer.from(combined).toString('base64url')
  return `MEDIX-${encoded}`
}

function ask(rl: readline.Interface, question: string): Promise<string> {
  return new Promise(resolve => rl.question(question, resolve))
}

async function main() {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout })

  console.log('\n╔══════════════════════════════════════════╗')
  console.log('║   AbyteMedix — License Key Generator    ║')
  console.log('╚══════════════════════════════════════════╝\n')

  const storeName = (await ask(rl, '  Store Name        : ')).trim()
  if (!storeName) { console.error('\n  ✗ Store name required.'); rl.close(); process.exit(1) }

  console.log(`\n  Plans: ${PLANS.join(' / ')}`)
  let plan = (await ask(rl, '  Plan               : ')).toUpperCase().trim()
  if (!PLANS.includes(plan)) { console.log('  ⚠ Invalid plan, defaulting to BASIC.'); plan = 'BASIC' }

  const maxPosStr = (await ask(rl, '  Max POS Terminals  : ')).trim()
  const maxPos = Math.max(1, parseInt(maxPosStr, 10) || 1)

  console.log('\n  Leave blank for perpetual (no expiry)')
  const expiryInput = (await ask(rl, '  Expiry (YYYY-MM-DD): ')).trim()
  let expiry = ''
  if (expiryInput) {
    const d = new Date(expiryInput)
    if (isNaN(d.getTime())) { console.log('  ⚠ Invalid date, setting perpetual.') }
    else expiry = expiryInput
  }

  rl.close()

  const payload: LicensePayload = {
    n: storeName,
    p: PLAN_CODES[plan],
    m: maxPos,
    e: expiry,
  }

  const key = generateKey(payload)

  const planLabel = plan
  const expiryLabel = expiry || 'Perpetual (No Expiry)'

  console.log('\n╔══════════════════════════════════════════════════════════════╗')
  console.log('║                    LICENSE GENERATED                        ║')
  console.log('╠══════════════════════════════════════════════════════════════╣')
  console.log(`║  Store : ${storeName.padEnd(53)}║`)
  console.log(`║  Plan  : ${planLabel.padEnd(53)}║`)
  console.log(`║  POS   : ${String(maxPos).padEnd(53)}║`)
  console.log(`║  Expiry: ${expiryLabel.padEnd(53)}║`)
  console.log('╠══════════════════════════════════════════════════════════════╣')
  console.log('║  LICENSE KEY:                                                ║')
  console.log(`║  ${key.slice(0, 60).padEnd(61)}║`)
  if (key.length > 60) {
    console.log(`║  ${key.slice(60).padEnd(61)}║`)
  }
  console.log('╚══════════════════════════════════════════════════════════════╝')
  console.log('\n  ✓ Customer sirf ye key paste kare — baki sab auto-fill hoga.')
  console.log(`\n  KEY: ${key}\n`)
}

main().catch(err => { console.error('Error:', err.message); process.exit(1) })
