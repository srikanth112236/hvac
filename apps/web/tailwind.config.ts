import type { Config } from 'tailwindcss'

/**
 * Tailwind reads every value from CSS custom properties.
 * No literal colours, radii, spacing or font stacks live in this file —
 * that is what makes Foundry/Atelier a token swap rather than a component fork.
 */
const config: Config = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      screens: {
        xs: '480px',
      },
      colors: {
        base: 'rgb(var(--base) / <alpha-value>)',
        panel: 'rgb(var(--panel) / <alpha-value>)',
        'panel-2': 'rgb(var(--panel-2) / <alpha-value>)',
        'panel-3': 'rgb(var(--panel-3) / <alpha-value>)',
        line: 'rgb(var(--line) / <alpha-value>)',
        'line-strong': 'rgb(var(--line-strong) / <alpha-value>)',
        fg: 'rgb(var(--fg) / <alpha-value>)',
        'fg-dim': 'rgb(var(--fg-dim) / <alpha-value>)',
        'fg-faint': 'rgb(var(--fg-faint) / <alpha-value>)',
        cold: 'rgb(var(--cold) / <alpha-value>)',
        'cold-ink': 'rgb(var(--cold-ink) / <alpha-value>)',
        heat: 'rgb(var(--heat) / <alpha-value>)',
        success: 'rgb(var(--success) / <alpha-value>)',
        warn: 'rgb(var(--warn) / <alpha-value>)',
        danger: 'rgb(var(--danger) / <alpha-value>)',
        focus: 'rgb(var(--focus) / <alpha-value>)',
        ink: 'rgb(var(--ink-block) / <alpha-value>)',
        'ink-block': 'rgb(var(--ink-block) / <alpha-value>)',
        'on-ink': 'rgb(var(--on-ink) / <alpha-value>)',
      },
      fontFamily: {
        display: 'var(--font-display)',
        sans: 'var(--font-body)',
        mono: 'var(--font-mono)',
      },
      fontSize: {
        display: ['var(--text-display)', { lineHeight: 'var(--lh-display)', letterSpacing: 'var(--ls-display)' }],
        h1: ['var(--text-h1)', { lineHeight: 'var(--lh-h1)', letterSpacing: 'var(--ls-h1)' }],
        h2: ['var(--text-h2)', { lineHeight: 'var(--lh-h2)', letterSpacing: 'var(--ls-h2)' }],
        h3: ['var(--text-h3)', { lineHeight: 'var(--lh-h3)', letterSpacing: 'var(--ls-h3)' }],
        h4: ['var(--text-h4)', { lineHeight: 'var(--lh-h4)', letterSpacing: 'var(--ls-h4)' }],
        lead: ['var(--text-lead)', { lineHeight: 'var(--lh-lead)' }],
        body: ['var(--text-body)', { lineHeight: 'var(--lh-body)' }],
        sm: ['var(--text-sm)', { lineHeight: 'var(--lh-sm)' }],
        xs: ['var(--text-xs)', { lineHeight: 'var(--lh-sm)' }],
        label: ['var(--text-label)', { lineHeight: 'var(--lh-label)' }],
        micro: ['var(--text-micro)', { lineHeight: 'var(--lh-label)' }],
      },
      spacing: {
        px: '1px',
        0: '0px',
        0.5: 'var(--space-0-5)',
        1: 'var(--space-1)',
        1.5: 'var(--space-1-5)',
        2: 'var(--space-2)',
        2.5: 'var(--space-2-5)',
        3: 'var(--space-3)',
        4: 'var(--space-4)',
        5: 'var(--space-5)',
        6: 'var(--space-6)',
        7: 'var(--space-7)',
        8: 'var(--space-8)',
        10: 'var(--space-10)',
        12: 'var(--space-12)',
        14: 'var(--space-14)',
        16: 'var(--space-16)',
        20: 'var(--space-20)',
        24: 'var(--space-24)',
        32: 'var(--space-32)',
        40: 'var(--space-40)',
        48: 'var(--space-48)',
      },
      borderRadius: {
        xs: 'var(--radius-xs)',
        sm: 'var(--radius-sm)',
        md: 'var(--radius-md)',
        lg: 'var(--radius-lg)',
        xl: 'var(--radius-xl)',
        full: 'var(--radius-full)',
      },
      maxWidth: {
        shell: '1320px',
        prose: '62ch',
      },
      boxShadow: {
        panel: 'var(--shadow-panel)',
        pop: 'var(--shadow-pop)',
      },
      keyframes: {
        marquee: {
          from: { transform: 'translateX(0)' },
          to: { transform: 'translateX(-50%)' },
        },
        'rise-in': {
          from: { opacity: '0', transform: 'translateY(12px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        marquee: 'marquee 32s linear infinite',
        'rise-in': 'rise-in 600ms cubic-bezier(0.16, 1, 0.3, 1) both',
      },
      transitionTimingFunction: {
        mech: 'var(--ease-mech)',
        mechanical: 'var(--ease-mech)',
        soft: 'var(--ease-soft)',
      },
      transitionDuration: {
        1: 'var(--dur-1)',
        2: 'var(--dur-2)',
        3: 'var(--dur-3)',
        4: 'var(--dur-4)',
        5: 'var(--dur-5)',
      },
      zIndex: {
        raised: 'var(--z-raised)',
        sticky: 'var(--z-sticky)',
        overlay: 'var(--z-overlay)',
        modal: 'var(--z-modal)',
        toast: 'var(--z-toast)',
      },
    },
  },
  plugins: [],
}

export default config
