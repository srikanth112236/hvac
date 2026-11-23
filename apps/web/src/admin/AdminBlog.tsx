import { AdminContent } from '@/admin/AdminContent'

/** Dedicated journal route: articles only, with the same live-publish pipeline. */
export function AdminBlog() {
  return <AdminContent initialTab="blog" journalWorkspace />
}
