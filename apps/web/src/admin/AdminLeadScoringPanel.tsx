import { useCallback, useEffect, useState } from 'react'
import {
  LEAD_SCORE_FIELDS,
  LEAD_SCORE_OPERATORS,
  defaultLeadScoring,
  type LeadScoreField,
  type LeadScoreOperator,
  type LeadScoringConfig,
  type LeadScoringRule,
} from '@hvac/shared'
import { Badge, Button, Input, Select, Toggle, useToast } from '@/components/ui'
import { Icon } from '@/components/icons'
import { adminApi, ApiError } from '@/admin/api'
import { InlineError, formatDateTime } from '@/admin/ui'

function newRule(index: number): LeadScoringRule {
  return {
    id: `rule-${Date.now().toString(36)}-${index}`,
    label: 'New rule',
    field: 'source',
    operator: 'contains',
    value: '',
    points: 10,
    enabled: true,
  }
}

/**
 * Lead scoring lives in settings so the definition of a hot lead is a business
 * decision, not a deploy. The kanban reads the same rules and shows the score.
 */
export function AdminLeadScoringPanel() {
  const { toast } = useToast()
  const [config, setConfig] = useState<LeadScoringConfig | null>(null)
  const [dirty, setDirty] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    try {
      setConfig(await adminApi.leadScoring())
      setDirty(false)
      setError('')
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not load scoring rules.')
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const patch = (change: Partial<LeadScoringConfig>) => {
    setConfig((current) => (current ? { ...current, ...change } : current))
    setDirty(true)
    setError('')
  }

  const patchRule = (index: number, change: Partial<LeadScoringRule>) => {
    setConfig((current) =>
      current
        ? {
            ...current,
            rules: current.rules.map((rule, position) =>
              position === index ? { ...rule, ...change } : rule,
            ),
          }
        : current,
    )
    setDirty(true)
  }

  const save = async () => {
    if (!config) return
    if (config.warmAt >= config.hotAt) {
      setError('The hot threshold has to be higher than the warm threshold.')
      return
    }
    setBusy(true)
    setError('')
    try {
      const saved = await adminApi.saveLeadScoring({
        expectedVersion: config.version,
        hotAt: config.hotAt,
        warmAt: config.warmAt,
        rules: config.rules,
      })
      setConfig(saved)
      setDirty(false)
      toast({
        title: 'Scoring rules saved',
        description: `Version ${saved.version}. The kanban re-scores on the next refresh.`,
        tone: 'success',
      })
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not save the rules.')
      if (caught instanceof ApiError && caught.status === 409) void load()
    } finally {
      setBusy(false)
    }
  }

  if (!config) {
    return error ? <InlineError message={error} /> : <p className="text-[11px] text-fg-faint">Loading scoring…</p>
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <Badge tone={dirty ? 'warn' : 'success'}>{dirty ? 'Unsaved' : `v${config.version}`}</Badge>
          <span className="font-mono text-[9px] uppercase tracking-[0.08em] text-fg-faint">
            Updated {formatDateTime(config.updatedAt)}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="secondary"
            icon="plus"
            onClick={() =>
              patch({
                rules: [...config.rules, newRule(config.rules.length)],
              })
            }
            disabled={config.rules.length >= 24}
          >
            Add rule
          </Button>
          <Button size="sm" variant="secondary" icon="refresh" onClick={() => void load()}>
            Reload
          </Button>
          <Button size="sm" icon="check" onClick={() => void save()} disabled={!dirty || busy}>
            {busy ? 'Saving…' : 'Save rules'}
          </Button>
        </div>
      </div>

      {error ? <InlineError message={error} /> : null}

      <div className="grid gap-3 sm:grid-cols-2">
        <Input
          label="Hot lead at"
          type="number"
          min={1}
          max={200}
          value={String(config.hotAt)}
          hint="Score at or above this is shown as hot."
          onChange={(event) => patch({ hotAt: Number(event.target.value) })}
        />
        <Input
          label="Warm lead at"
          type="number"
          min={0}
          max={199}
          value={String(config.warmAt)}
          hint="Score at or above this is warm; below it is cold."
          onChange={(event) => patch({ warmAt: Number(event.target.value) })}
        />
      </div>

      <div className="flex flex-col gap-2">
        {config.rules.map((rule, index) => (
          <div
            key={rule.id}
            className={`border p-3 ${rule.enabled ? 'border-line bg-base/40' : 'border-line/50 bg-base/20 opacity-70'}`}
          >
            <div className="flex flex-wrap items-end gap-3">
              <div className="min-w-[180px] flex-1">
                <Input
                  label="Rule name"
                  value={rule.label}
                  onChange={(event) => patchRule(index, { label: event.target.value })}
                />
              </div>
              <div className="w-40">
                <Select
                  label="Field"
                  value={rule.field}
                  options={LEAD_SCORE_FIELDS.map((field) => ({
                    value: field.key,
                    label: field.label,
                  }))}
                  onChange={(event) =>
                    patchRule(index, { field: event.target.value as LeadScoreField })
                  }
                />
              </div>
              <div className="w-36">
                <Select
                  label="Condition"
                  value={rule.operator}
                  options={LEAD_SCORE_OPERATORS.map((operator) => ({
                    value: operator.key,
                    label: operator.label,
                  }))}
                  onChange={(event) =>
                    patchRule(index, { operator: event.target.value as LeadScoreOperator })
                  }
                />
              </div>
              <div className="w-40">
                <Input
                  label="Value"
                  value={rule.value}
                  placeholder={rule.operator === 'is-set' || rule.operator === 'is-empty' ? '—' : 'e.g. emergency'}
                  disabled={rule.operator === 'is-set' || rule.operator === 'is-empty'}
                  onChange={(event) => patchRule(index, { value: event.target.value })}
                />
              </div>
              <div className="w-24">
                <Input
                  label="Points"
                  type="number"
                  min={-50}
                  max={50}
                  value={String(rule.points)}
                  onChange={(event) => patchRule(index, { points: Number(event.target.value) })}
                />
              </div>
              <div className="w-32 pb-1">
                <Toggle
                  label="Enabled"
                  checked={rule.enabled}
                  onChange={(enabled) => patchRule(index, { enabled })}
                />
              </div>
              <button
                type="button"
                aria-label={`Remove ${rule.label}`}
                onClick={() =>
                  patch({ rules: config.rules.filter((_, position) => position !== index) })
                }
                className="mb-1 flex h-9 w-9 items-center justify-center border border-line text-fg-faint hover:text-danger"
              >
                <Icon name="close" size={12} />
              </button>
            </div>
            <p className="mt-2 font-mono text-[8.5px] uppercase tracking-[0.08em] text-fg-faint">
              {rule.points > 0 ? '+' : ''}
              {rule.points} points when {rule.field} {rule.operator.replace('-', ' ')}{' '}
              {rule.value ? `“${rule.value}”` : ''}
            </p>
          </div>
        ))}
        {config.rules.length === 0 ? (
          <p className="border border-dashed border-line px-3 py-6 text-center text-[11px] text-fg-faint">
            No rules yet — every lead scores zero. Add a rule or start from the shipped set.
          </p>
        ) : null}
      </div>

      <div className="flex items-center justify-between gap-3 border-t border-line pt-3">
        <Button
          size="sm"
          variant="quiet"
          icon="refresh"
          onClick={() => {
            setConfig({ ...defaultLeadScoring(), version: config.version })
            setDirty(true)
          }}
        >
          Restore shipped rules
        </Button>
        <span className="font-mono text-[9px] uppercase tracking-[0.08em] text-fg-faint">
          Scores are capped at 0–100
        </span>
      </div>
    </div>
  )
}
