import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { cn } from '@/lib/cn'
import { Icon, type IconName } from '@/components/icons'

export type ToastTone = 'info' | 'success' | 'warn' | 'danger'

interface ToastRecord {
  id: number
  title: string
  description?: string
  tone: ToastTone
}

interface ToastContextValue {
  toast: (input: { title: string; description?: string; tone?: ToastTone }) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

const toneMeta: Record<ToastTone, { icon: IconName; color: string; rule: string }> = {
  info: { icon: 'airflow', color: 'text-cold', rule: 'bg-cold' },
  success: { icon: 'check', color: 'text-success', rule: 'bg-success' },
  warn: { icon: 'alert', color: 'text-warn', rule: 'bg-warn' },
  danger: { icon: 'alert', color: 'text-danger', rule: 'bg-danger' },
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastRecord[]>([])
  const [mounted, setMounted] = useState(false)
  const counter = useRef(0)

  useEffect(() => {
    setMounted(true)
  }, [])

  const dismiss = useCallback((id: number) => {
    setItems((current) => current.filter((item) => item.id !== id))
  }, [])

  const toast = useCallback<ToastContextValue['toast']>(
    ({ title, description, tone = 'info' }) => {
      counter.current += 1
      const id = counter.current
      setItems((current) => [...current.slice(-3), { id, title, description, tone }])
      window.setTimeout(() => dismiss(id), 5200)
    },
    [dismiss],
  )

  const value = useMemo(() => ({ toast }), [toast])

  return (
    <ToastContext.Provider value={value}>
      {children}
      {mounted
        ? createPortal(
            <div
              aria-live="polite"
              aria-atomic="false"
              className="pointer-events-none fixed bottom-4 right-4 z-[var(--z-toast)] flex w-[min(360px,calc(100vw-2rem))] flex-col gap-2"
            >
              <AnimatePresence initial={false}>
                {items.map((item) => {
                  const meta = toneMeta[item.tone]
                  return (
                    <motion.div
                      key={item.id}
                      layout
                      initial={{ opacity: 0, y: 12, scale: 0.98 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, x: 16 }}
                      transition={{ duration: 0.26, ease: [0.16, 1, 0.3, 1] }}
                      className="pointer-events-auto relative overflow-hidden border border-line bg-panel shadow-pop"
                    >
                      <span className={cn('absolute inset-y-0 left-0 w-0.5', meta.rule)} />
                      <div className="flex items-start gap-3 px-4 py-3.5">
                        <Icon name={meta.icon} size={16} className={cn('mt-0.5', meta.color)} />
                        <div className="flex-1">
                          <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-fg">
                            {item.title}
                          </p>
                          {item.description ? (
                            <p className="mt-1 text-[12px] leading-snug text-fg-dim">
                              {item.description}
                            </p>
                          ) : null}
                        </div>
                        <button
                          type="button"
                          onClick={() => dismiss(item.id)}
                          aria-label="Dismiss notification"
                          className="text-fg-faint transition-colors duration-2 hover:text-fg"
                        >
                          <Icon name="close" size={13} />
                        </button>
                      </div>
                    </motion.div>
                  )
                })}
              </AnimatePresence>
            </div>,
            document.body,
          )
        : null}
    </ToastContext.Provider>
  )
}

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext)
  if (!context) throw new Error('useToast must be used inside <ToastProvider>')
  return context
}
