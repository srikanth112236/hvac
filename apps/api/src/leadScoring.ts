import { Router } from 'express'
import { LEAD_SCORING_SAVE_SCHEMA, defaultLeadScoring, type LeadScoringConfig } from '@hvac/shared'
import { requireAdmin, requireAdminMutation, requirePermission } from './auth.js'
import { createStore } from './store.js'

const scoringStore = createStore<LeadScoringConfig>('lead-scoring.json', defaultLeadScoring)

export async function readLeadScoring(): Promise<LeadScoringConfig> {
  const stored = await scoringStore.read()
  const defaults = defaultLeadScoring()
  return {
    ...defaults,
    ...stored,
    rules: Array.isArray(stored.rules) ? stored.rules : defaults.rules,
  }
}

/**
 * Scoring rules live in settings so a sales manager can tune what "hot" means
 * without a deploy. The same pure evaluator runs in the admin UI.
 */
export const leadScoringRouter = Router()

leadScoringRouter.get('/lead-scoring', requireAdmin, async (_req, res) => {
  res.set('Cache-Control', 'private, no-store')
  res.json({ data: await readLeadScoring() })
})

leadScoringRouter.put(
  '/lead-scoring',
  requireAdmin,
  requireAdminMutation,
  requirePermission('leads.write'),
  async (req, res) => {
    const parsed = LEAD_SCORING_SAVE_SCHEMA.safeParse(req.body)
    if (!parsed.success) {
      res.status(400).json({
        error: {
          code: 'validation_error',
          message: parsed.error.issues[0]?.message ?? 'Check the scoring rules.',
        },
      })
      return
    }
    const current = await readLeadScoring()
    if (current.version !== parsed.data.expectedVersion) {
      res.status(409).json({
        error: {
          code: 'scoring_conflict',
          message: `Someone saved newer rules (v${current.version}). Reload before saving.`,
        },
        data: current,
      })
      return
    }
    const next: LeadScoringConfig = {
      version: current.version + 1,
      updatedAt: new Date().toISOString(),
      hotAt: Math.max(parsed.data.hotAt, parsed.data.warmAt + 1),
      warmAt: Math.min(parsed.data.warmAt, parsed.data.hotAt - 1),
      rules: parsed.data.rules,
    }
    await scoringStore.write(next)
    res.json({ data: await readLeadScoring() })
  },
)
