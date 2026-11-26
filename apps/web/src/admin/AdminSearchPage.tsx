import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Badge, Button, Input } from '@/components/ui'
import { Icon } from '@/components/icons'
import { adminApi, type SearchResult } from '@/admin/api'
import { AdminPageHeader, InlineError } from '@/admin/ui'

const TYPE_ORDER = [
  'Lead',
  'Customer',
  'Invoice',
  'Quotation',
  'Job',
  'Reminder',
  'Ticket',
  'Equipment',
  'Service',
  'Journal',
  'Product',
  'Page',
  'Team',
  'Expense',
  'Notification',
]

/** Grouped, full-page view of the same index the Ctrl+K palette uses. */
export function AdminSearchPage() {
  const [params, setParams] = useSearchParams()
  const initial = params.get('q') ?? ''
  const [input, setInput] = useState(initial)
  const [query, setQuery] = useState(initial)
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const term = query.trim()
    if (term.length < 2) {
      setResults([])
      return
    }
    let active = true
    setLoading(true)
    const timer = window.setTimeout(() => {
      adminApi
        .search(term)
        .then((data) => {
          if (!active) return
          setResults(data)
          setError('')
        })
        .catch((caught) => {
          if (active) setError(caught instanceof Error ? caught.message : 'Search failed.')
        })
        .finally(() => {
          if (active) setLoading(false)
        })
    }, 200)
    return () => {
      active = false
      window.clearTimeout(timer)
    }
  }, [query])

  const groups = useMemo(() => {
    const map = new Map<string, SearchResult[]>()
    for (const result of results) {
      const bucket = map.get(result.type) ?? []
      bucket.push(result)
      map.set(result.type, bucket)
    }
    return [...map.entries()].sort(
      (a, b) =>
        (TYPE_ORDER.indexOf(a[0]) === -1 ? 99 : TYPE_ORDER.indexOf(a[0])) -
        (TYPE_ORDER.indexOf(b[0]) === -1 ? 99 : TYPE_ORDER.indexOf(b[0])),
    )
  }, [results])

  const submit = () => {
    const term = input.trim()
    setQuery(term)
    setParams(term ? { q: term } : {})
  }

  return (
    <div className="flex flex-col gap-5">
      <AdminPageHeader
        eyebrow="Global index"
        title="Search everything."
        description="One index across leads, customers, invoices, quotations, jobs, reminders, tickets, equipment, services, journal, products, pages, team, expenses and notifications."
      />

      <form
        onSubmit={(event) => {
          event.preventDefault()
          submit()
        }}
        className="flex flex-wrap items-end gap-3 border border-line bg-panel/20 p-4"
      >
        <div className="min-w-[240px] flex-1">
          <Input
            autoFocus
            label="Search"
            value={input}
            placeholder="Reference, name, email, phone, serial, service, city…"
            onChange={(event) => setInput(event.target.value)}
          />
        </div>
        <Button type="submit" icon="search">
          Search
        </Button>
      </form>

      {error ? <InlineError message={error} /> : null}

      {query.trim().length < 2 ? (
        <p className="border border-dashed border-line px-4 py-10 text-center text-[12px] text-fg-faint">
          Type at least two characters. Ctrl+K opens the quick palette from any admin page.
        </p>
      ) : loading ? (
        <p className="font-mono text-[9px] uppercase tracking-[0.1em] text-fg-faint">Searching…</p>
      ) : results.length === 0 ? (
        <p className="border border-dashed border-line px-4 py-10 text-center text-[12px] text-fg-faint">
          Nothing matched “{query}”.
        </p>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-[9px] uppercase tracking-[0.1em] text-fg-faint">
              {results.length} results in {groups.length} types
            </span>
            {groups.map(([type, items]) => (
              <a
                key={type}
                href={`#type-${type}`}
                className="border border-line px-2 py-1 font-mono text-[8.5px] uppercase tracking-[0.08em] text-fg-dim hover:text-cold"
              >
                {type} · {items.length}
              </a>
            ))}
          </div>

          <div className="grid gap-4 xl:grid-cols-2">
            {groups.map(([type, items]) => (
              <section key={type} id={`type-${type}`} className="border border-line bg-panel/20">
                <header className="flex items-center justify-between border-b border-line px-3 py-2">
                  <span className="font-mono text-[9px] uppercase tracking-[0.12em] text-fg-dim">
                    {type}
                  </span>
                  <Badge tone="neutral">{items.length}</Badge>
                </header>
                <ul className="divide-y divide-line/60">
                  {items.map((result) => (
                    <li key={`${result.type}-${result.id}`}>
                      <Link
                        to={result.path}
                        className="flex items-start justify-between gap-3 px-3 py-2.5 hover:bg-cold/[0.05]"
                      >
                        <span className="min-w-0">
                          <span className="block truncate text-[12px] text-fg">{result.title}</span>
                          <span className="mt-0.5 block truncate text-[10px] text-fg-faint">
                            {result.subtitle}
                          </span>
                        </span>
                        <Icon name="arrow-up-right" size={12} className="mt-1 shrink-0 text-fg-faint" />
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
