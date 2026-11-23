import { mkdir, readdir, readFile, rename, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { DATA_DIR, encryptText, isEncryptedText, readDataText, writeDataText } from './store.js'

export const DATA_VERSION = 2

async function readJson<T>(file: string): Promise<T | null> {
  const text = await readDataText(file)
  if (text === null) return null
  return JSON.parse(text) as T
}

async function writeJson(file: string, value: unknown): Promise<void> {
  await writeDataText(file, `${JSON.stringify(value, null, 2)}\n`)
}

/**
 * Encrypt every plaintext JSON store on the first production boot with a key.
 * Existing encrypted files are left untouched. Runs before the migrations so
 * later reads use the normal decrypting store.
 */
async function encryptExistingData(): Promise<number> {
  if (!process.env.DATA_ENCRYPTION_KEY) return 0
  const encryptDir = async (directory: string): Promise<number> => {
    await mkdir(directory, { recursive: true })
    let count = 0
    const entries = await readdir(directory, { withFileTypes: true })
    for (const entry of entries) {
      const target = path.join(directory, entry.name)
      if (entry.isDirectory()) {
        count += await encryptDir(target)
        continue
      }
      if (!entry.name.endsWith('.json')) continue
      const raw = await readFile(target, 'utf8')
      if (isEncryptedText(raw)) continue
      const temporary = `${target}.${process.pid}.enc.tmp`
      await writeFile(temporary, encryptText(raw), 'utf8')
      await rename(temporary, target)
      count += 1
    }
    return count
  }
  return encryptDir(DATA_DIR)
}

/**
 * Forward-only data migrations for the JSON stores. Each step is idempotent so
 * a restart (or a half-applied deploy) can run it again safely. When the store
 * becomes a database this file is replaced by real migration scripts.
 */
export async function runMigrations(): Promise<void> {
  const encrypted = await encryptExistingData()
  const changed: string[] = []
  if (encrypted) changed.push(`encrypted:${encrypted}`)

  const customers = await readJson<Array<Record<string, unknown>>>('customers.json')
  if (Array.isArray(customers)) {
    let touched = false
    const next = customers.map((customer) => {
      if (typeof customer.status === 'string') return customer
      touched = true
      return { ...customer, status: 'active' }
    })
    if (touched) {
      await writeJson('customers.json', next)
      changed.push('customers.status')
    }
  }

  const jobState = await readJson<Record<string, unknown>>('job-state.json')
  if (!jobState || jobState.version !== 1) {
    await writeJson('job-state.json', {
      version: 1,
      reminderNotified: {},
      amcNotified: {},
      lastDigestDate: null,
      lastBackupDate: null,
      ...(jobState ?? {}),
    })
    changed.push('job-state')
  }

  const versionFile = await readJson<{ version?: number }>('data-version.json')
  if (!versionFile || versionFile.version !== DATA_VERSION) {
    await writeJson('data-version.json', {
      version: DATA_VERSION,
      migratedAt: new Date().toISOString(),
    })
    changed.push(`data-version:${DATA_VERSION}`)
  }

  if (changed.length) {
    console.log(`[hvac-api] migrations applied: ${changed.join(', ')}`)
  }
}
