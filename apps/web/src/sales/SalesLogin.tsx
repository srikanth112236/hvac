import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { Icon } from '@/components/icons'
import { Button, Input } from '@/components/ui'
import {
  adminApi,
  isTwoFactorChallenge,
  type AdminUser,
  type TwoFactorChallenge,
} from '@/admin/api'

export function SalesLogin({
  onSuccess,
  notice,
}: {
  onSuccess: (user: AdminUser) => void
  notice?: string
}) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [challenge, setChallenge] = useState<TwoFactorChallenge | null>(null)
  const [code, setCode] = useState('')
  const [error, setError] = useState(notice ?? '')
  const [pending, setPending] = useState(false)

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError('')
    setPending(true)
    try {
      if (challenge) {
        onSuccess(await adminApi.verifyTwoFactorLogin(challenge.challengeId, code))
        return
      }
      const result = await adminApi.login(email, password)
      if (isTwoFactorChallenge(result)) {
        setChallenge(result)
        setCode('')
        return
      }
      onSuccess(result)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Sign in failed.')
    } finally {
      setPending(false)
    }
  }

  const resend = async () => {
    if (!challenge) return
    setPending(true)
    setError('')
    try {
      setChallenge(await adminApi.resendTwoFactorCode(challenge.challengeId))
      setCode('')
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'A new code could not be sent.')
    } finally {
      setPending(false)
    }
  }

  return (
    <div className="grid min-h-[100svh] bg-base lg:grid-cols-[minmax(0,1fr)_460px]">
      <div className="relative hidden overflow-hidden border-r border-line p-12 lg:flex lg:flex-col lg:justify-between">
        <div
          aria-hidden
          className="absolute inset-0 opacity-60"
          style={{
            backgroundImage:
              'radial-gradient(circle at 18% 22%, rgb(var(--cold)/0.16), transparent 32%), repeating-linear-gradient(0deg, rgb(var(--line)/0.42) 0 1px, transparent 1px 56px), repeating-linear-gradient(90deg, rgb(var(--line)/0.42) 0 1px, transparent 1px 56px)',
          }}
        />
        <div className="relative">
          <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-fg-faint">
            Coolvane · Sales desk
          </span>
          <h1 className="t-display mt-10 max-w-[12ch] text-fg">
            Own the pipeline.
          </h1>
          <p className="mt-8 max-w-[44ch] text-sm leading-relaxed text-fg-dim">
            Your assigned leads, follow-ups, quotes, targets and commission — in one focused
            workspace. Managers see the whole floor; you see exactly your book.
          </p>
        </div>
        <dl className="relative grid max-w-xl grid-cols-3 gap-px border border-line bg-line">
          {[
            ['Leads', 'Assigned'],
            ['Follow-ups', 'Synced'],
            ['Quotes', 'Tracked'],
          ].map(([label, value]) => (
            <div key={label} className="bg-base p-4">
              <dt className="font-mono text-[9px] uppercase tracking-[0.12em] text-fg-faint">
                {label}
              </dt>
              <dd className="mt-2 text-[13px] text-cold">{value}</dd>
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
              Sales access
            </span>
          </div>

          <h2 className="t-h3 mt-10 text-fg">{challenge ? 'Verify it’s you.' : 'Sign in.'}</h2>
          <p className="mt-2 text-[13px] leading-relaxed text-fg-dim">
            {challenge
              ? `We emailed a six-digit code to ${challenge.maskedEmail}. It expires in ten minutes.`
              : 'Use the sales account your manager created for you. This portal contains only your assigned book.'}
          </p>

          <form onSubmit={submit} noValidate className="mt-8 flex flex-col gap-4">
            {error ? (
              <p role="alert" className="border border-danger/40 bg-danger/[0.06] px-3 py-2 text-[12px] text-fg-dim">
                {error}
              </p>
            ) : null}
            {challenge ? (
              <Input
                label="Six-digit code"
                inputMode="numeric"
                autoComplete="one-time-code"
                pattern="[0-9]{6}"
                value={code}
                onChange={(event) => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))}
                required
              />
            ) : (
              <>
                <Input
                  label="Work email"
                  type="email"
                  autoComplete="username"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  required
                />
                <Input
                  label="Password"
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                />
              </>
            )}
            <Button type="submit" full icon="shield" disabled={pending}>
              {pending ? 'Checking…' : challenge ? 'Verify and enter' : 'Enter sales desk'}
            </Button>
            {challenge ? (
              <div className="flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setChallenge(null)
                    setCode('')
                    setError('')
                  }}
                  className="font-mono text-[9px] uppercase tracking-[0.1em] text-fg-faint hover:text-fg"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={() => void resend()}
                  disabled={pending}
                  className="font-mono text-[9px] uppercase tracking-[0.1em] text-cold hover:underline"
                >
                  Resend code
                </button>
              </div>
            ) : null}
          </form>

          <p className="mt-8 border-t border-line pt-5 text-[11px] text-fg-faint">
            Manager or owner?{' '}
            <Link to="/admin" className="inline-flex items-center gap-1 text-cold hover:underline">
              Open the control room <Icon name="external" size={11} />
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
