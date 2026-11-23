import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto'
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import path from 'node:path'

/**
 * Small JSON-backed store for the demo. Reads are cached in memory; writes are
 * serialised so two admin saves cannot interleave. Writes go to a temporary
 * file and are renamed into place so a crash cannot leave truncated JSON.
 *
 * When DATA_ENCRYPTION_KEY is set, every file is AES-256-GCM encrypted and the
 * on-disk content starts with `ENC1:`. A missing key on an encrypted file is a
 * hard error — never a silent reset to seed data.
 */
const ENC_PREFIX = 'ENC1:'
const KEY = process.env.DATA_ENCRYPTION_KEY
  ? createHash('sha256').update(process.env.DATA_ENCRYPTION_KEY, 'utf8').digest()
  : null

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

export function createStore<T>(fileName: string, fallback: () => T): JsonStore<T> {
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
