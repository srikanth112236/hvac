import { Router } from 'express'
import {
  adminUserInputSchema,
  adminUserPatchSchema,
  type AdminRole,
} from '@hvac/shared'
import { requireAdmin, requireRole, revokeAdminSessionsForUser } from './auth.js'
import {
  adminUserStore,
  createAdminUser,
  encodeAdminPassword,
  publicAdminUser,
  readPublicAdminUsers,
} from './adminUsers.js'

function nowIso(): string {
  return new Date().toISOString()
}

export const adminUsersRouter = Router()
adminUsersRouter.use('/users', requireAdmin, requireRole('owner'))

adminUsersRouter.get('/users', async (_req, res) => {
  res.json({ data: await readPublicAdminUsers() })
})

adminUsersRouter.post('/users', async (req, res) => {
  const parsed = adminUserInputSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({
      error: { code: 'validation_error', message: parsed.error.issues[0]?.message ?? 'Check the user.' },
    })
    return
  }
  const email = parsed.data.email.trim().toLowerCase()
  const existing = await adminUserStore.read()
  if (existing.some((user) => user.email === email)) {
    res.status(409).json({ error: { code: 'email_in_use', message: 'That email already has an admin account.' } })
    return
  }
  const created = await createAdminUser({
    name: parsed.data.name,
    email,
    password: parsed.data.password,
    role: parsed.data.role,
  })
  res.status(201).json({ data: created })
})

adminUsersRouter.patch('/users/:id', async (req, res) => {
  const parsed = adminUserPatchSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({
      error: { code: 'validation_error', message: parsed.error.issues[0]?.message ?? 'Check the user.' },
    })
    return
  }
  let updated: ReturnType<typeof publicAdminUser> | undefined
  let revoke = false
  await adminUserStore.mutate((users) =>
    users.map((user) => {
      if (user.id !== req.params.id) return user
      const { password, ...rest } = parsed.data
      const encoded = password ? encodeAdminPassword(password) : {}
      const record = {
        ...user,
        ...rest,
        ...encoded,
        role: (rest.role ?? user.role) as AdminRole,
        updatedAt: nowIso(),
      }
      updated = publicAdminUser(record)
      if (rest.status === 'disabled' || password) revoke = true
      return record
    }),
  )
  if (!updated) {
    res.status(404).json({ error: { code: 'not_found', message: 'User not found.' } })
    return
  }
  if (revoke) await revokeAdminSessionsForUser(req.params.id)
  res.json({ data: updated })
})
