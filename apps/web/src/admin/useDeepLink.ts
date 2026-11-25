import { useEffect, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'

/**
 * Open a drawer for a notification deep link once the page data is ready.
 * Keeping the query string intact means a refresh reopens the same record,
 * which is exactly what someone following a notification expects.
 */
export function useRecordDeepLink<T>({
  param,
  records,
  resolve,
  onOpen,
}: {
  param: string
  records: T[]
  resolve: (value: string) => T | undefined
  onOpen: (record: T) => void
}) {
  const [searchParams] = useSearchParams()
  const value = searchParams.get(param)
  const handled = useRef<string | null>(null)

  useEffect(() => {
    if (!value || handled.current === value) return
    const record = resolve(value)
    if (!record) return
    handled.current = value
    onOpen(record)
  }, [onOpen, records, resolve, value])
}
