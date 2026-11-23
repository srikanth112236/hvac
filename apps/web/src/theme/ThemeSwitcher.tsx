import { Link } from 'react-router-dom'
import { useTheme, type Theme } from './ThemeProvider'
import { cn } from '@/lib/cn'

const options: { id: Theme; label: string }[] = [
  { id: 'foundry', label: 'Foundry' },
  { id: 'atelier', label: 'Atelier' },
]

/** Dev-only variant switcher. Removed from production builds by the DEV guard. */
export function ThemeSwitcher() {
  const { theme, setTheme } = useTheme()

  if (!import.meta.env.DEV) return null

  return (
    <div className="fixed bottom-5 left-5 z-[var(--z-nav)] flex items-center gap-1 border border-line bg-panel/90 p-1 shadow-pop backdrop-blur-md">
      <span className="px-2 font-mono text-[9px] uppercase tracking-[0.16em] text-fg-faint">
        Variant
      </span>
      {options.map((option) => (
        <button
          key={option.id}
          type="button"
          onClick={() => setTheme(option.id)}
          aria-pressed={theme === option.id}
          className={cn(
            'h-7 px-3 font-mono text-[10px] uppercase tracking-[0.12em] transition-colors duration-2',
            theme === option.id ? 'bg-cold text-cold-ink' : 'text-fg-dim hover:text-fg',
          )}
        >
          {option.label}
        </button>
      ))}
      <Link
        to="/__styleguide"
        className="h-7 px-3 font-mono text-[10px] uppercase leading-7 tracking-[0.12em] text-fg-dim transition-colors duration-2 hover:text-cold"
      >
        DS
      </Link>
    </div>
  )
}
