import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'

export type Theme = 'foundry' | 'atelier'

const STORAGE_KEY = 'hvac-theme'
const ENV_THEME: Theme = import.meta.env.VITE_THEME === 'atelier' ? 'atelier' : 'foundry'

interface ThemeContextValue {
  theme: Theme
  setTheme: (theme: Theme) => void
  toggle: () => void
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

function readInitialTheme(): Theme {
  if (typeof window === 'undefined') return ENV_THEME
  const fromUrl = new URLSearchParams(window.location.search).get('theme')
  if (fromUrl === 'foundry' || fromUrl === 'atelier') return fromUrl
  const stored = window.localStorage.getItem(STORAGE_KEY)
  if (stored === 'foundry' || stored === 'atelier') return stored
  return ENV_THEME
}

function applyTheme(theme: Theme) {
  const root = document.documentElement
  root.setAttribute('data-theme', theme)
  root.classList.toggle('theme-foundry', theme === 'foundry')
  root.classList.toggle('theme-atelier', theme === 'atelier')

  const canvas = getComputedStyle(root).getPropertyValue('--base').trim()
  const meta = document.querySelector('meta[name="theme-color"]')
  if (meta && canvas) meta.setAttribute('content', `rgb(${canvas})`)
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(readInitialTheme)

  useEffect(() => {
    applyTheme(theme)
    try {
      window.localStorage.setItem(STORAGE_KEY, theme)
    } catch {
      /* storage can be unavailable in private contexts — cosmetic only */
    }
  }, [theme])

  const setTheme = useCallback((next: Theme) => setThemeState(next), [])
  const toggle = useCallback(
    () => setThemeState((current) => (current === 'foundry' ? 'atelier' : 'foundry')),
    [],
  )

  const value = useMemo(() => ({ theme, setTheme, toggle }), [theme, setTheme, toggle])

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext)
  if (!context) throw new Error('useTheme must be used inside <ThemeProvider>')
  return context
}
