import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { Button, Modal } from '@/components/ui'
import { Icon } from '@/components/icons'

interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>
}

const DISMISS_KEY = 'coolvane-install-dismissed-at'
const DISMISS_DAYS = 14

function isStandalone(): boolean {
  if (typeof window === 'undefined') return false
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    window.matchMedia('(display-mode: window-controls-overlay)').matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  )
}

function dismissedRecently(): boolean {
  try {
    const value = Number(window.localStorage.getItem(DISMISS_KEY) ?? 0)
    return Number.isFinite(value) && Date.now() - value < DISMISS_DAYS * 24 * 60 * 60 * 1000
  } catch {
    return false
  }
}

function rememberDismissal(): void {
  try {
    window.localStorage.setItem(DISMISS_KEY, String(Date.now()))
  } catch {
    // Private mode: the prompt may return next visit, which is acceptable.
  }
}

/**
 * Installable-app invitation, shown once on the public home page.
 * Android/desktop use the native install prompt; iOS gets Add to Home Screen
 * instructions because Safari does not expose beforeinstallprompt.
 */
export function PwaInstallPrompt() {
  const { pathname } = useLocation()
  const [open, setOpen] = useState(false)
  const [prompt, setPrompt] = useState<InstallPromptEvent | null>(null)
  const [ios, setIos] = useState(false)
  const [installing, setInstalling] = useState(false)

  useEffect(() => {
    if (pathname !== '/' || isStandalone()) return
    const userAgent = window.navigator.userAgent
    const iosDevice = /iphone|ipad|ipod/i.test(userAgent)
    setIos(iosDevice)

    const target = window as Window & { __coolvaneInstallPrompt?: InstallPromptEvent | null }
    if (target.__coolvaneInstallPrompt) setPrompt(target.__coolvaneInstallPrompt)

    const onBeforeInstall = (event: Event) => {
      event.preventDefault()
      setPrompt(event as InstallPromptEvent)
      target.__coolvaneInstallPrompt = event as InstallPromptEvent
    }
    const onInstallAvailable = () => {
      if (target.__coolvaneInstallPrompt) setPrompt(target.__coolvaneInstallPrompt)
    }
    const onInstalled = () => {
      setOpen(false)
      setPrompt(null)
    }

    window.addEventListener('beforeinstallprompt', onBeforeInstall)
    window.addEventListener('coolvane-install-available', onInstallAvailable)
    window.addEventListener('appinstalled', onInstalled)
    // Give the browser time to emit its install event before offering.
    const timer = window.setTimeout(() => {
      if (!dismissedRecently() && (iosDevice || prompt)) setOpen(true)
    }, 3200)

    return () => {
      window.clearTimeout(timer)
      window.removeEventListener('beforeinstallprompt', onBeforeInstall)
      window.removeEventListener('coolvane-install-available', onInstallAvailable)
      window.removeEventListener('appinstalled', onInstalled)
    }
  }, [pathname, prompt])

  if (!open) return null

  const dismiss = () => {
    rememberDismissal()
    setOpen(false)
  }

  const install = async () => {
    if (!prompt) {
      dismiss()
      return
    }
    setInstalling(true)
    try {
      await prompt.prompt()
      const choice = await prompt.userChoice
      if (choice.outcome === 'accepted') {
        setOpen(false)
      } else {
        rememberDismissal()
        setOpen(false)
      }
    } finally {
      setInstalling(false)
      setPrompt(null)
    }
  }

  return (
    <Modal
      open={open}
      onClose={dismiss}
      title="Install Coolvane"
      description={
        ios
          ? 'Add the works to your home screen for full-screen access, faster launch and your saved shortcuts.'
          : 'Keep the works one tap away. Install the app for a full-screen, faster experience without opening a browser tab.'
      }
      size="sm"
    >
      <div className="flex flex-col gap-5">
        <div className="flex items-center gap-4 border border-line bg-panel/40 p-4">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center border border-cold/40 bg-cold/[0.07] font-mono text-[13px] font-semibold tracking-[0.08em] text-cold">
            CV
          </span>
          <div className="min-w-0">
            <p className="text-[13px] text-fg">Coolvane HVAC</p>
            <p className="mt-1 font-mono text-[8px] uppercase tracking-[0.12em] text-fg-faint">
              Works on this device · no app store
            </p>
          </div>
        </div>

        <ul className="flex flex-col gap-2.5">
          {[
            'Launches full screen, like a native app',
            'Fast access from your home screen or desktop',
            'Works offline with a friendly connection notice',
          ].map((benefit) => (
            <li key={benefit} className="flex items-start gap-2.5 text-[12px] text-fg-dim">
              <Icon name="check" size={13} className="mt-0.5 shrink-0 text-cold" />
              {benefit}
            </li>
          ))}
        </ul>

        {ios ? (
          <div className="border border-line bg-panel/40 p-3">
            <p className="font-mono text-[8px] uppercase tracking-[0.12em] text-fg-faint">
              On iPhone or iPad
            </p>
            <ol className="mt-2 flex list-decimal flex-col gap-1.5 pl-4 text-[11px] leading-relaxed text-fg-dim">
              <li>Tap the Share button in Safari.</li>
              <li>Choose “Add to Home Screen”.</li>
              <li>Tap Add — Coolvane appears with your other apps.</li>
            </ol>
          </div>
        ) : null}

        <div className="flex flex-col-reverse gap-2 border-t border-line pt-4 sm:flex-row sm:justify-end">
          <Button variant="secondary" onClick={dismiss}>
            Not now
          </Button>
          {ios ? (
            <Button onClick={dismiss} icon="check">
              Got it
            </Button>
          ) : (
            <Button onClick={() => void install()} icon="download" loading={installing}>
              Install app
            </Button>
          )}
        </div>
      </div>
    </Modal>
  )
}
