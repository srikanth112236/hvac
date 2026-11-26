import type { SiteTheme } from '@hvac/shared'

const tokenMap: [string, keyof SiteTheme['palette']][] = [
  ['--base', 'base'],
  ['--panel', 'panel'],
  ['--panel-2', 'panel2'],
  ['--fg', 'text'],
  ['--fg-dim', 'muted'],
  ['--fg-faint', 'faint'],
  ['--line', 'line'],
  ['--line-strong', 'lineStrong'],
  ['--cold', 'cold'],
  ['--cold-ink', 'coldInk'],
  ['--heat', 'heat'],
  ['--success', 'success'],
  ['--warn', 'warn'],
  ['--danger', 'danger'],
  ['--focus', 'accent'],
]

/**
 * Writes the saved (or draft) palette onto :root so every surface — public
 * site, portal and control room — reads the same tokens. Passing null removes
 * the overrides and lets the CSS variant palettes show through again.
 */
export function applySiteTheme(theme: SiteTheme | null | undefined): void {
  if (typeof document === 'undefined') return
  const root = document.documentElement
  if (!theme) {
    for (const [token] of tokenMap) root.style.removeProperty(token)
    root.style.removeProperty('--radius-control')
    return
  }
  for (const [token, key] of tokenMap) root.style.setProperty(token, theme.palette[key])
  root.style.setProperty('--cold', theme.buttons.primaryBg)
  root.style.setProperty('--cold-ink', theme.buttons.primaryText)
  root.style.setProperty('--line-strong', theme.buttons.secondaryBorder)
  root.style.setProperty('--radius-control', theme.buttons.radius)
}
