import { Router } from 'express'
import { roleMatrixSaveSchema } from '@hvac/shared'
import { requireAdmin, requireAdminMutation, requireRole, type AdminSession } from './auth.js'
import { readRoleMatrix, writeRoleMatrix } from './roleMatrixStore.js'

/**
 * The role matrix is editable by the owner and versioned, so two owners
 * editing at once get a 409 instead of silently overwriting each other.
 */
export const rolesRouter = Router()

rolesRouter.get('/roles/matrix', requireAdmin, async (_req, res) => {
  res.set('Cache-Control', 'private, no-store')
  res.json({ data: await readRoleMatrix() })
})

rolesRouter.put(
  '/roles/matrix',
  requireAdmin,
  requireAdminMutation,
  requireRole('owner'),
  async (req, res) => {
    const parsed = roleMatrixSaveSchema.safeParse(req.body)
    if (!parsed.success) {
      res.status(400).json({
        error: {
          code: 'validation_error',
          message: parsed.error.issues[0]?.message ?? 'Check the role matrix.',
        },
      })
      return
    }
    const admin = res.locals.admin as AdminSession
    const result = await writeRoleMatrix(
      parsed.data.roles,
      parsed.data.expectedVersion,
      admin.email,
    )
    if (result.conflict) {
      res.status(409).json({
        error: {
          code: 'matrix_conflict',
          message: `Someone saved a newer matrix (v${result.matrix.version}). Reload before saving.`,
        },
        data: result.matrix,
      })
      return
    }
    res.json({ data: result.matrix })
  },
)
