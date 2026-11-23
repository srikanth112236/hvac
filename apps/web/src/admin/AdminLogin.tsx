import { useEffect, useState, type FormEvent } from 'react'
import { Icon } from '@/components/icons'
import { Button, Input } from '@/components/ui'
import { adminApi, type AdminUser } from '@/admin/api'

export function AdminLogin({ onSuccess }: { onSuccess: (user: AdminUser) => void }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [pending, setPending] = useState(false)

  useEffect(() => {
    let active = true
    adminApi
      .hint()
      .then((hint) => {
        if (active && hint?.email) setEmail((current) => current || hint.email)
      })
      .catch(() => {})
    return () => {
      active = false
    }
  }, [])

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError('')
    setPending(true)
    try {
      const user = await adminApi.login(email, password)
      onSuccess(user)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Sign in failed.')
    } finally {
      setPending(false)
    }
  }

  return (
    <div className="grid min-h-[100svh] bg-base lg:grid-cols-[1fr_480px]">
      <div className="relative hidden flex-col justify-between overflow-hidden border-r border-line p-12 lg:flex">
        <div
          aria-hidden
          className="absolute inset-0 opacity-[0.55]"
          style={{
            backgroundImage:
              'repeating-linear-gradient(0deg, rgb(var(--line)/0.45) 0 1px, transparent 1px 48px), repeating-linear-gradient(90deg, rgb(var(--line)/0.45) 0 1px, transparent 1px 48px)',
          }}
        />
        <div className="relative">
          <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-fg-faint">
            Coolvane · Control room
          </span>
          <h1 className="t-display mt-10 max-w-[11ch] text-fg">The works, end to end.</h1>
          <p className="mt-8 max-w-[42ch] text-sm leading-relaxed text-fg-dim">
            Leads, follow-ups, maintenance cover and every public word on the site — one secured
            desk. Published changes reach open browsers inside ten seconds.
          </p>
        </div>

        <dl className="relative grid max-w-lg grid-cols-3 gap-px border border-line bg-line">
          {[
            ['Dispatch', '24 × 7'],
            ['Content', '≤ 10 s'],
            ['Settlement', 'On site'],
          ].map(([label, value]) => (
            <div key={label} className="bg-base p-4">
              <dt className="font-mono text-[9px] uppercase tracking-[0.12em] text-fg-faint">
                {label}
              </dt>
              <dd className="t-num mt-2 text-[15px] text-fg">{value}</dd>
            </div>
          ))}
        </dl>
      </div>

      <div className="flex items-center justify-center p-6">
        <div className="w-full max-w-sm">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center border border-line-strong font-mono text-[11px] text-cold">
              CV
            </span>
            <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-fg-dim">
              Admin access
            </span>
          </div>

          <h2 className="t-h3 mt-10 text-fg">Sign in.</h2>
          <p className="mt-2 text-[13px] leading-relaxed text-fg-dim">
            Owner access only. Sessions are HttpOnly and expire after twelve hours.
          </p>

          <form onSubmit={onSubmit} noValidate className="mt-8 flex flex-col gap-4">
            <Input
              label="Email"
              name="email"
              type="email"
              autoComplete="username"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
            <Input
              label="Password"
              name="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />

            {error ? (
              <p
                role="alert"
                className="flex items-start gap-2 border border-danger/40 bg-danger/[0.06] px-3 py-2.5 text-[12px] leading-snug text-fg-dim"
              >
                <Icon name="alert" size={14} className="mt-0.5 shrink-0 text-danger" />
                {error}
              </p>
            ) : null}

            <Button type="submit" full disabled={pending} icon={pending ? 'clock' : 'arrow-right'}>
              {pending ? 'Signing in…' : 'Open control room'}
            </Button>
          </form>

          {import.meta.env.DEV ? (
            <details className="mt-8 border border-line bg-panel/40 p-4">
              <summary className="cursor-pointer font-mono text-[9px] uppercase tracking-[0.12em] text-fg-faint">
                Local development credentials
              </summary>
              <p className="mt-3 font-mono text-[11px] leading-relaxed text-fg-dim">
                admin@coolvane.example
                <br />
                Coolvane!2026
              </p>
              <p className="mt-3 text-[10px] leading-relaxed text-fg-faint">
                Change ADMIN_EMAIL and ADMIN_PASSWORD in the API environment before deployment.
              </p>
            </details>
          ) : null}

          <p className="mt-8 font-mono text-[9px] uppercase leading-relaxed tracking-[0.1em] text-fg-faint">
            Protected by session auth, login rate limiting and same-origin mutation checks.
          </p>
        </div>
      </div>
    </div>
  )
}
