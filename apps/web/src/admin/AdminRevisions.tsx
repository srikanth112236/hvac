import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Icon } from '@/components/icons'
import { adminApi } from '@/admin/api'
import { AdminPageHeader } from '@/admin/ui'
import { ContentHistory } from '@/admin/ContentHistory'

/**
 * Standalone revision ledger.
 *
 * Kept out of the content studio so publishing and auditing stay separate
 * jobs: one page to edit copy, one page to review and restore history.
 */
export function AdminRevisions() {
  const [currentVersion, setCurrentVersion] = useState(0)

  useEffect(() => {
    let active = true
    adminApi
      .content()
      .then((content) => {
        if (active) setCurrentVersion(content.version)
      })
      .catch(() => {})
    return () => {
      active = false
    }
  }, [])

  return (
    <div className="flex flex-col gap-6 pb-16">
      <AdminPageHeader
        eyebrow="Content · CV-HISTORY"
        title="Revisions"
        description="Every publish is a complete restore point with its timestamp, author and field-level diff. Preview a version, compare what changed, then restore it — restoring publishes a new version and keeps the old snapshot."
        actions={
          <div className="flex flex-wrap gap-2">
            <Link
              to="/admin/content"
              className="flex h-9 items-center gap-2 border border-line px-3 font-mono text-[9px] uppercase tracking-[0.1em] text-fg-dim hover:border-cold/50 hover:text-cold"
            >
              <Icon name="arrow-right" size={12} className="rotate-180" />
              All pages
            </Link>
            <Link
              to="/"
              target="_blank"
              className="flex h-9 items-center gap-2 border border-line px-3 font-mono text-[9px] uppercase tracking-[0.1em] text-fg-dim hover:border-cold/50 hover:text-cold"
            >
              <Icon name="external" size={12} />
              View site
            </Link>
          </div>
        }
      />

      <ContentHistory currentVersion={currentVersion} dirty={false} onRestored={() => {}} />
    </div>
  )
}
