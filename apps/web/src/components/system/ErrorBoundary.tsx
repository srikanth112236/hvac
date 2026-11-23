import { Component, type ErrorInfo, type ReactNode } from 'react'
import { brandConfig } from '@/brand/brand.config'

interface ErrorBoundaryState {
  error: Error | null
}

/**
 * Last line of defence for render-time failures. Without this, one thrown
 * component leaves the visitor with a blank page. The fallback keeps the
 * phone number and a reload path visible.
 */
export class ErrorBoundary extends Component<{ children: ReactNode }, ErrorBoundaryState> {
  override state: ErrorBoundaryState = { error: null }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error }
  }

  override componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('[web] render error', error, info.componentStack)
  }

  override render() {
    if (!this.state.error) return this.props.children

    return (
      <div className="flex min-h-[100svh] items-center justify-center bg-base px-6 py-16">
        <div className="w-full max-w-xl border border-line bg-panel/40 p-6 sm:p-8">
          <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-heat">
            System notice · CV-ERR
          </span>
          <h1 className="mt-4 font-display text-3xl leading-tight text-fg">
            This page could not be drawn.
          </h1>
          <p className="mt-3 text-[13px] leading-relaxed text-fg-dim">
            The rest of the works desk is unaffected. Reload the page, or call dispatch if you were
            part-way through a booking or enquiry.
          </p>
          <div className="mt-6 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="inline-flex h-10 items-center border border-cold bg-cold px-4 font-mono text-[10px] uppercase tracking-[0.1em] text-base"
            >
              Reload page
            </button>
            <a
              href="/"
              className="inline-flex h-10 items-center border border-line px-4 font-mono text-[10px] uppercase tracking-[0.1em] text-fg-dim hover:border-cold/50 hover:text-cold"
            >
              Back to home
            </a>
            <a
              href={`tel:${brandConfig.contact.phone}`}
              className="inline-flex h-10 items-center border border-line px-4 font-mono text-[10px] uppercase tracking-[0.1em] text-fg-dim hover:border-cold/50 hover:text-cold"
            >
              Call {brandConfig.contact.phoneDisplay}
            </a>
          </div>
          {import.meta.env.DEV ? (
            <pre className="mt-6 max-h-40 overflow-auto border border-line bg-base p-3 font-mono text-[10px] leading-relaxed text-fg-faint">
              {this.state.error.stack ?? this.state.error.message}
            </pre>
          ) : null}
        </div>
      </div>
    )
  }
}
