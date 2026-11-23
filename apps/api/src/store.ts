import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto'
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { Pool, type PoolClient } from 'pg'

/**
 * Storage is single-file JSON by default, with an optional PostgreSQL adapter
 * for multi-instance deployments. Set DATABASE_URL and every store (sessions,
 * rate counters, business records, jobs state) reads and mutates through the
 * shared `hvac_json_store` table under a row lock.
 *
 * When DATA_ENCRYPTION_KEY is set, the payload is AES-256-GCM encrypted before
 * it reaches disk or PostgreSQL. A missing key on encrypted data is a hard
 * error — never a silent reset to seed data.
 */
const ENC_PREFIX = 'ENC1:'
const KEY = process.env.DATA_ENCRYPTION_KEY
  ? createHash('sha256').update(process.env.DATA_ENCRYPTION_KEY, 'utf8').digest()
  : null
const POOL = process.env.DATABASE_URL
  ? new Pool({
      connectionString: process.env.DATABASE_URL,
      max: Number.parseInt(process.env.DATABASE_POOL_SIZE ?? '10', 10),
    })
  : null
let schemaReady: Promise<void> | null = null

function ensureSchema(client: Pool | PoolClient): Promise<void> {
  if (!schemaReady) {
    schemaReady = client
      .query(
        `CREATE TABLE IF NOT EXISTS hvac_json_store (
           name text PRIMARY KEY,
           payload text NOT NULL,
           updated_at timestamptz NOT NULL DEFAULT now()
         )`,
      )
      .then(() => undefined)
  }
  return schemaReady
}


export function isEncryptedText(value: string): boolean {
  return value.startsWith(ENC_PREFIX)
}

export function encryptText(value: string): string {
  if (!KEY) return value
  const iv = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', KEY, iv)
  const body = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return `${ENC_PREFIX}${Buffer.concat([iv, tag, body]).toString('base64')}`
}

export function decryptText(value: string): string {
  if (!isEncryptedText(value)) return value
  if (!KEY) {
    throw new Error('Encrypted data found but DATA_ENCRYPTION_KEY is not set.')
  }
  const raw = Buffer.from(value.slice(ENC_PREFIX.length), 'base64')
  const iv = raw.subarray(0, 12)
  const tag = raw.subarray(12, 28)
  const body = raw.subarray(28)
  const decipher = createDecipheriv('aes-256-gcm', KEY, iv)
  decipher.setAuthTag(tag)
  return Buffer.concat([decipher.update(body), decipher.final()]).toString('utf8')
}

const DATA_DIR = process.env.HVAC_DATA_DIR
  ? path.resolve(process.env.HVAC_DATA_DIR)
  : path.resolve(process.cwd(), 'data')

export { DATA_DIR }

export async function readDataText(fileName: string): Promise<string | null> {
  try {
    return decryptText(await readFile(path.join(DATA_DIR, fileName), 'utf8'))
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null
    throw error
  }
}

export async function writeDataText(fileName: string, text: string): Promise<void> {
  await mkdir(DATA_DIR, { recursive: true })
  const target = path.join(DATA_DIR, fileName)
  const temporary = `${target}.${process.pid}.${Date.now()}.tmp`
  await writeFile(temporary, encryptText(text), 'utf8')
  await rename(temporary, target)
}

export interface JsonStore<T> {
  read: () => Promise<T>
  write: (next: T) => Promise<void>
  mutate: (recipe: (current: T) => T | Promise<T>) => Promise<T>
}

function createPostgresStore<T>(fileName: string, fallback: () => T): JsonStore<T> {
  const pool = POOL as Pool
  async function read(): Promise<T> {
    await ensureSchema(pool)
    const result = await pool.query<{ payload: string }>(
      'SELECT payload FROM hvac_json_store WHERE name = $1',
      [fileName],
    )
    if (!result.rows[0]) return fallback()
    return JSON.parse(decryptText(result.rows[0].payload)) as T
  }

  async function write(next: T): Promise<void> {
    await ensureSchema(pool)
    await pool.query(
      `INSERT INTO hvac_json_store (name, payload, updated_at)
       VALUES ($1, $2, now())
       ON CONFLICT (name) DO UPDATE SET payload = EXCLUDED.payload, updated_at = now()`,
      [fileName, encryptText(JSON.stringify(next))],
    )
  }

  async function mutate(recipe: (current: T) => T | Promise<T>): Promise<T> {
    const client = await pool.connect()
    try {
      await ensureSchema(client)
      await client.query('BEGIN')
      const result = await client.query<{ payload: string }>(
        'SELECT payload FROM hvac_json_store WHERE name = $1 FOR UPDATE',
        [fileName],
      )
      const current = result.rows[0]
        ? (JSON.parse(decryptText(result.rows[0].payload)) as T)
        : fallback()
      const next = await recipe(current)
      await client.query(
        `INSERT INTO hvac_json_store (name, payload, updated_at)
         VALUES ($1, $2, now())
         ON CONFLICT (name) DO UPDATE SET payload = EXCLUDED.payload, updated_at = now()`,
        [fileName, encryptText(JSON.stringify(next))],
      )
      await client.query('COMMIT')
      return next
    } catch (error) {
      await client.query('ROLLBACK').catch(() => undefined)
      throw error
    } finally {
      client.release()
    }
  }

  return { read, write, mutate }
}

export function createStore<T>(fileName: string, fallback: () => T): JsonStore<T> {
  if (POOL) return createPostgresStore(fileName, fallback)
  const file = path.resolve(DATA_DIR, fileName)
  let cache: T | null = null
  let chain: Promise<void> = Promise.resolve()

  async function load(): Promise<T> {
    if (cache !== null) return cache
    let raw: string
    try {
      raw = await readFile(file, 'utf8')
    } catch {
      cache = fallback()
      return cache
    }
    const text = decryptText(raw)
    cache = JSON.parse(text) as T
    return cache
  }

  async function writeAtomic(next: T): Promise<void> {
    await mkdir(path.dirname(file), { recursive: true })
    const temporary = `${file}.${process.pid}.${Date.now()}.tmp`
    await writeFile(temporary, encryptText(`${JSON.stringify(next, null, 2)}\n`), 'utf8')
    await rename(temporary, file)
  }

  function enqueue(write: () => Promise<void>): Promise<void> {
    const run = chain.then(write, write)
    chain = run.then(
      () => undefined,
      () => undefined,
    )
    return run
  }

  return {
    async read() {
      return load()
    },
    write(next) {
      cache = next
      return enqueue(() => writeAtomic(next))
    },
    mutate(recipe) {
      let result: T | undefined
      const run = enqueue(async () => {
        const current = await load()
        const next = await recipe(current)
        cache = next
        result = next
        await writeAtomic(next)
      })
      return run.then(() => {
        if (result === undefined) {
          throw new Error(`Store ${fileName} produced no value.`)
        }
        return result
      })
    },
  }
}
