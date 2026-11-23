import { useEffect } from 'react'

/** Sets the document title for the current public page. Phase 8 replaces this
 *  with react-helmet-async once SSR and per-route metadata land. */
export function useDocumentTitle(title: string): void {
  useEffect(() => {
    document.title = title
  }, [title])
}
