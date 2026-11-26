import { readdir, rm } from 'node:fs/promises'
import path from 'node:path'
import { DATA_DIR } from './store.js'

/**
 * Destructive demo reset: wipe the local JSON stores (keeping backups) and
 * reseed the documented demo dataset. Refuses to run outside a folder literally
 * named `data`, so a mistyped HVAC_DATA_DIR cannot delete anything else.
 */
async function wipe(): Promise<number> {
  if (path.basename(path.resolve(DATA_DIR)) !== 'data') {
    throw new Error(
      `Refusing to wipe ${DATA_DIR}: seed:reset only runs against a directory named "data".`,
    )
  }
  let removed = 0
  const entries = await readdir(DATA_DIR, { withFileTypes: true }).catch(() => [])
  for (const entry of entries) {
    if (entry.name === 'backups') continue
    await rm(path.join(DATA_DIR, entry.name), { recursive: true, force: true })
    removed += 1
  }
  return removed
}

const removed = await wipe()
console.log(`[hvac-api] seed:reset cleared ${removed} store file(s) in ${DATA_DIR}`)
await import('./seedDemo.js')
