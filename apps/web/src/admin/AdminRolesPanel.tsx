import { useCallback, useEffect, useState } from 'react'
import {
  ADMIN_PERMISSIONS,
  adminRoleLabel,
  type AdminPermission,
  type AdminRole,
  type RoleMatrix,
} from '@hvac/shared'
import { Badge, Button, useToast } from '@/components/ui'
import { adminApi, ApiError } from '@/admin/api'
import { InlineError, formatDateTime } from '@/admin/ui'

/**
 * Editable RBAC matrix. Every built-in role keeps its name; what it may write is
 * decided here, versioned, and enforced by the API's requirePermission guard.
 */
export function AdminRolesPanel() {
  const { toast } = useToast()
  const [matrix, setMatrix] = useState<RoleMatrix | null>(null)
  const [isOwner, setIsOwner] = useState(false)
  const [dirty, setDirty] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    try {
      const [next, me] = await Promise.all([adminApi.roleMatrix(), adminApi.me()])
      setMatrix(next)
      setIsOwner(me.role === 'owner')
      setDirty(false)
      setError('')
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not load the role matrix.')
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const toggle = (role: AdminRole, permission: AdminPermission) => {
    if (!matrix || !isOwner || role === 'owner') return
    setMatrix({
      ...matrix,
      roles: matrix.roles.map((entry) =>
        entry.id === role
          ? {
              ...entry,
              permissions: entry.permissions.includes(permission)
                ? entry.permissions.filter((key) => key !== permission)
                : [...entry.permissions, permission],
            }
          : entry,
      ),
    })
    setDirty(true)
  }

  const save = async () => {
    if (!matrix) return
    setBusy(true)
    setError('')
    try {
      const saved = await adminApi.saveRoleMatrix({
        expectedVersion: matrix.version,
        roles: matrix.roles,
      })
      setMatrix(saved)
      setDirty(false)
      toast({
        title: 'Role matrix saved',
        description: `Version ${saved.version} is enforced on the next admin request.`,
        tone: 'success',
      })
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not save the matrix.')
      if (caught instanceof ApiError && caught.status === 409) void load()
    } finally {
      setBusy(false)
    }
  }

  if (!matrix) {
    return error ? <InlineError message={error} /> : <p className="text-[11px] text-fg-faint">Loading roles…</p>
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3 border border-line bg-panel/20 px-4 py-3">
        <div>
          <p className="font-mono text-[9px] uppercase tracking-[0.12em] text-fg-dim">
            Role matrix · v{matrix.version}
          </p>
          <p className="mt-1 text-[11px] leading-relaxed text-fg-faint">
            Reads stay open to every signed-in role; writes follow this matrix. The owner always
            keeps every permission. Last saved {formatDateTime(matrix.updatedAt)}
            {matrix.updatedBy ? ` by ${matrix.updatedBy}` : ''}.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {dirty ? <Badge tone="warn">Unsaved changes</Badge> : <Badge tone="success">In sync</Badge>}
          <Button
            size="sm"
            variant="secondary"
            icon="refresh"
            onClick={() => void load()}
            disabled={busy}
          >
            Reload
          </Button>
          <Button size="sm" icon="check" onClick={() => void save()} disabled={!dirty || busy || !isOwner}>
            {busy ? 'Saving…' : 'Save matrix'}
          </Button>
        </div>
      </div>

      {!isOwner ? (
        <p className="border border-warn/40 bg-warn/[0.05] px-3 py-2 text-[11px] text-warn">
          Only the owner can change the matrix. You can read it, and your own permissions are
          enforced on every write.
        </p>
      ) : null}
      {error ? <InlineError message={error} /> : null}

      <div className="overflow-x-auto border border-line">
        <table className="w-full min-w-[760px] border-collapse text-left">
          <thead>
            <tr className="border-b border-line bg-panel/40">
              <th className="px-3 py-2 font-mono text-[8.5px] uppercase tracking-[0.1em] text-fg-faint">
                Permission
              </th>
              {matrix.roles.map((role) => (
                <th
                  key={role.id}
                  className="px-3 py-2 text-center font-mono text-[8.5px] uppercase tracking-[0.1em] text-fg-dim"
                  title={role.description}
                >
                  {role.label || adminRoleLabel[role.id]}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ADMIN_PERMISSIONS.map((permission) => (
              <tr key={permission.key} className="border-b border-line/60 last:border-b-0">
                <td className="px-3 py-2">
                  <p className="text-[11.5px] text-fg">{permission.label}</p>
                  <p className="mt-0.5 text-[10px] leading-snug text-fg-faint">
                    {permission.description}
                  </p>
                </td>
                {matrix.roles.map((role) => {
                  const allowed = role.permissions.includes(permission.key)
                  const locked = role.id === 'owner' || !isOwner
                  return (
                    <td key={role.id} className="px-3 py-2 text-center">
                      <button
                        type="button"
                        role="switch"
                        aria-checked={allowed}
                        aria-label={`${permission.label} for ${role.label}`}
                        disabled={locked}
                        onClick={() => toggle(role.id, permission.key)}
                        className={`inline-flex h-6 w-6 items-center justify-center border font-mono text-[10px] transition-colors ${
                          allowed
                            ? 'border-cold/60 bg-cold/15 text-cold'
                            : 'border-line text-fg-faint'
                        } ${locked ? 'cursor-not-allowed opacity-70' : 'hover:border-cold/50'}`}
                      >
                        {allowed ? '✓' : '—'}
                      </button>
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-5">
        {matrix.roles.map((role) => (
          <div key={role.id} className="border border-line bg-panel/20 p-3">
            <p className="text-[11.5px] text-fg">{role.label || adminRoleLabel[role.id]}</p>
            <p className="mt-1 text-[10px] leading-relaxed text-fg-faint">{role.description}</p>
            <p className="mt-2 font-mono text-[9px] uppercase tracking-[0.08em] text-cold">
              {role.permissions.length} of {ADMIN_PERMISSIONS.length} permissions
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}
