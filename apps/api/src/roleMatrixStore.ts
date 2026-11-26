import {
  ADMIN_PERMISSIONS,
  defaultRoleMatrix,
  type AdminPermission,
  type AdminRole,
  type RoleMatrix,
  type RoleMatrixRole,
} from '@hvac/shared'
import { createStore } from './store.js'

const roleMatrixStore = createStore<RoleMatrix>('role-matrix.json', defaultRoleMatrix)

const CACHE_MS = 5_000
let cache: { matrix: RoleMatrix; at: number } | null = null

/** Missing roles or permissions fall back to the shipped matrix. */
function normalize(stored: RoleMatrix): RoleMatrix {
  const defaults = defaultRoleMatrix()
  const known = new Map((stored.roles ?? []).map((role) => [role.id, role]))
  const roles: RoleMatrixRole[] = defaults.roles.map((fallback) => {
    const saved = known.get(fallback.id)
    if (!saved) return fallback
    const permissions = Array.isArray(saved.permissions) ? saved.permissions : fallback.permissions
    return {
      ...fallback,
      ...saved,
      permissions: fallback.id === 'owner' ? ADMIN_PERMISSIONS.map((entry) => entry.key) : permissions,
    }
  })
  return {
    version: Number.isFinite(stored.version) ? stored.version : defaults.version,
    updatedAt: stored.updatedAt ?? defaults.updatedAt,
    updatedBy: stored.updatedBy,
    roles,
  }
}

export function invalidateRoleMatrix(): void {
  cache = null
}

export async function readRoleMatrix(): Promise<RoleMatrix> {
  if (cache && Date.now() - cache.at < CACHE_MS) return cache.matrix
  const matrix = normalize(await roleMatrixStore.read())
  cache = { matrix, at: Date.now() }
  return matrix
}

export async function permissionsForRole(role: AdminRole): Promise<AdminPermission[]> {
  const matrix = await readRoleMatrix()
  return matrix.roles.find((entry) => entry.id === role)?.permissions ?? []
}

export async function writeRoleMatrix(
  roles: RoleMatrixRole[],
  expectedVersion: number,
  updatedBy: string,
): Promise<{ matrix: RoleMatrix; conflict?: boolean }> {
  const current = await readRoleMatrix()
  if (current.version !== expectedVersion) return { matrix: current, conflict: true }
  const next: RoleMatrix = {
    version: current.version + 1,
    updatedAt: new Date().toISOString(),
    updatedBy,
    roles: roles.map((role) => ({
      ...role,
      permissions:
        role.id === 'owner' ? ADMIN_PERMISSIONS.map((entry) => entry.key) : role.permissions,
    })),
  }
  await roleMatrixStore.write(next)
  const saved = normalize(await roleMatrixStore.read())
  cache = { matrix: saved, at: Date.now() }
  return { matrix: saved }
}
