import { randomBytes, randomUUID, scryptSync, timingSafeEqual } from 'node:crypto'
import type { AdminRole } from '@hvac/shared'
import { createStore } from './store.js'

export interface StoredAdminUser {
  id: string
  name: string
  email: string
  role: AdminRole
  status: 'active' | 'disabled'
  passwordSalt: string
  passwordHash: string
  createdAt: string
  updatedAt: string
}

export interface PublicAdminUser {
  id: string
  name: string
  email: string
  role: AdminRole
  status: 'active' | 'disabled'
  createdAt: string
  updatedAt: string
}

export const adminUserStore = createStore<StoredAdminUser[]>('admin-users.json', () => [])

export function publicAdminUser(user: StoredAdminUser): PublicAdminUser {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    status: user.status,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  }
}

export function encodeAdminPassword(password: string): {
  passwordSalt: string
  passwordHash: string
} {
  const passwordSalt = randomBytes(16).toString('hex')
  return {
    passwordSalt,
    passwordHash: scryptSync(password, passwordSalt, 64).toString('hex'),
  }
}

export function adminPasswordMatches(password: string, user: StoredAdminUser): boolean {
  try {
    return timingSafeEqual(
      scryptSync(password, user.passwordSalt, 64),
      Buffer.from(user.passwordHash, 'hex'),
    )
  } catch {
    return false
  }
}

export async function findAdminUserByEmail(email: string): Promise<StoredAdminUser | null> {
  const normalized = email.trim().toLowerCase()
  const users = await adminUserStore.read()
  return users.find((user) => user.email === normalized) ?? null
}

export async function readPublicAdminUsers(): Promise<PublicAdminUser[]> {
  const users = await adminUserStore.read()
  return users
    .map(publicAdminUser)
    .sort((a, b) => a.name.localeCompare(b.name))
}

export async function createAdminUser(input: {
  name: string
  email: string
  password: string
  role: AdminRole
}): Promise<PublicAdminUser> {
  const email = input.email.trim().toLowerCase()
  const now = new Date().toISOString()
  const record: StoredAdminUser = {
    id: randomUUID(),
    name: input.name,
    email,
    role: input.role,
    status: 'active',
    createdAt: now,
    updatedAt: now,
    ...encodeAdminPassword(input.password),
  }
  const users = await adminUserStore.mutate((current) => [record, ...current])
  return publicAdminUser(users.find((user) => user.id === record.id) ?? record)
}
