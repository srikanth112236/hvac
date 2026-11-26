import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Icon } from '@/components/icons'
import { Badge, Input, Modal } from '@/components/ui'
import { adminApi, type SearchResult } from '@/admin/api'

/** Global search across leads, customers, invoices, quotations, tickets and equipment. */
export function AdminSearch() {
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        setOpen(true)
      }
      if (
        event.key === '/' &&
        !open &&
        !(event.target instanceof HTMLInputElement) &&
        !(event.target instanceof HTMLTextAreaElement) &&
        !(event.target instanceof HTMLSelectElement)
      ) {
        event.preventDefault()
        setOpen(true)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  useEffect(() => {
    const term = query.trim()
    if (term.length < 2) {
      setResults([])
      setLoading(false)
      return
    }
    let active = true
    setLoading(true)
    const timer = window.setTimeout(() => {
      adminApi
        .search(term)
        .then((data) => {
          if (active) setResults(data)
        })
        .catch(() => {
          if (active) setResults([])
        })
        .finally(() => {
          if (active) setLoading(false)
        })
    }, 220)
    return () => {
      active = false
      window.clearTimeout(timer)
    }
  }, [query])

  const select = (result: SearchResult) => {
    setOpen(false)
    setQuery('')
    setResults([])
    navigate(result.path)
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex w-full items-center gap-2 border border-line px-3 py-2 font-mono text-[9px] uppercase tracking-[0.1em] text-fg-faint hover:border-cold/40 hover:text-cold"
      >
        <Icon name="search" size={13} />
        Search
        <span className="ml-auto border border-line px-1.5 py-0.5 text-[8px] tracking-[0.06em]">
          Ctrl K
        </span>
      </button>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Search the works"
        description="Leads, customers, invoices, quotations, jobs, reminders, tickets, equipment, services, journal, products, pages, team, expenses and notifications."
      >
        <Input
          autoFocus
          label="Search"
          placeholder="Name, reference, email, phone, model…"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
        <div className="mt-4 max-h-[50vh] overflow-auto border border-line">
          {query.trim().length < 2 ? (
            <p className="p-4 text-[11px] text-fg-faint">Type at least two characters.</p>
          ) : loading ? (
            <p className="p-4 font-mono text-[9px] uppercase tracking-[0.1em] text-fg-faint">
              Searching
            </p>
          ) : results.length === 0 ? (
            <p className="p-4 text-[11px] text-fg-faint">No record matched.</p>
          ) : (
            <ul className="divide-y divide-line">
              {results.map((result) => (
                <li key={`${result.type}-${result.id}`}>
                  <button
                    type="button"
                    onClick={() => select(result)}
                    className="flex w-full items-start justify-between gap-3 p-3 text-left hover:bg-panel/40"
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-[12px] text-fg">{result.title}</span>
                      <span className="mt-0.5 block truncate text-[10px] text-fg-faint">
                        {result.subtitle}
                      </span>
                    </span>
                    <Badge tone="neutral">{result.type}</Badge>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
        {results.length ? (
          <div className="mt-3 flex items-center justify-between gap-3">
            <span className="font-mono text-[9px] uppercase tracking-[0.08em] text-fg-faint">
              {results.length} results ·{' '}
              {new Set(results.map((result) => result.type)).size} types
            </span>
            <button
              type="button"
              onClick={() => {
                const term = query.trim()
                setOpen(false)
                navigate(`/admin/search?q=${encodeURIComponent(term)}`)
              }}
              className="flex items-center gap-1.5 border border-line px-2.5 py-1.5 font-mono text-[9px] uppercase tracking-[0.1em] text-fg-dim hover:border-cold/50 hover:text-cold"
            >
              Full search <Icon name="arrow-right" size={11} />
            </button>
          </div>
        ) : null}
      </Modal>
    </>
  )
}
