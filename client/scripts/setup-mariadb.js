// Downloads and extracts minimal MariaDB portable binaries for bundling.
// Runs once during build; subsequent builds skip if binaries already exist.
import https from 'https'
import http from 'http'
import fs from 'fs'
import path from 'path'
import { execSync } from 'child_process'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const MARIADB_VERSION = '10.6.21'
const ZIP_URL = `https://archive.mariadb.org/mariadb-${MARIADB_VERSION}/winx64-packages/mariadb-${MARIADB_VERSION}-winx64.zip`
const OUT_DIR = path.join(__dirname, '../mariadb-bin')
const ZIP_PATH = path.join(__dirname, '../mariadb-portable.zip')

if (fs.existsSync(path.join(OUT_DIR, 'bin', 'mysqld.exe'))) {
  console.log('✓ MariaDB binaries already present — skipping download')
  process.exit(0)
}

console.log(`Downloading MariaDB ${MARIADB_VERSION} portable (~85MB)…`)
console.log('This happens only once.')

function download(url, dest) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest)

    function follow(u) {
      const mod = u.startsWith('https') ? https : http
      mod.get(u, (res) => {
        if (res.statusCode === 301 || res.statusCode === 302) {
          follow(res.headers.location)
          return
        }
        if (res.statusCode !== 200) {
          reject(new Error(`HTTP ${res.statusCode} for ${u}`))
          return
        }
        const total = parseInt(res.headers['content-length'] || '0')
        let received = 0
        res.on('data', (chunk) => {
          received += chunk.length
          if (total) process.stdout.write(`\r  ${Math.round(received / total * 100)}%`)
        })
        res.pipe(file)
        file.on('finish', () => { file.close(); console.log('\n✓ Download complete'); resolve() })
      }).on('error', reject)
    }

    follow(url)
  })
}

async function main() {
  await download(ZIP_URL, ZIP_PATH)

  console.log('Extracting MariaDB binaries…')
  const extractedRoot = path.join(__dirname, '../mariadb-extracted')
  fs.mkdirSync(OUT_DIR, { recursive: true })

  const extractCmd = `powershell -Command "Expand-Archive -Path '${ZIP_PATH}' -DestinationPath '${extractedRoot}' -Force"`
  execSync(extractCmd, { stdio: 'inherit' })

  // Zip contains mariadb-VERSION-winx64/ folder — move contents up
  const innerDir = fs.readdirSync(extractedRoot)[0]
  const innerPath = path.join(extractedRoot, innerDir)

  const copyCmd = `powershell -Command "Copy-Item -Path '${innerPath}\\*' -Destination '${OUT_DIR}' -Recurse -Force"`
  execSync(copyCmd, { stdio: 'inherit' })

  // Cleanup
  fs.rmSync(ZIP_PATH, { force: true })
  fs.rmSync(extractedRoot, { recursive: true, force: true })

  console.log('✓ MariaDB binaries ready at client/mariadb-bin/')
}

main().catch(e => { console.error('MariaDB setup failed:', e.message); process.exit(1) })
