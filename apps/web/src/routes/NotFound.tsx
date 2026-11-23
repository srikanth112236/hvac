import { ButtonLink } from '@/components/ui'
import { PageTransition } from '@/motion'
import { useSeo } from '@/lib/seo'

export function NotFound() {
  useSeo({
    path: '/404',
    title: 'Page not found',
    description: 'This route is not connected. Return to the service index or contact the works.',
    noindex: true,
  })

  return (
    <PageTransition>
      <div className="flex min-h-[100svh] flex-col">
        <div className="shell flex flex-1 items-center py-24">
          <div className="grid w-full gap-12 md:grid-cols-12">
            <div className="md:col-span-7">
              <p className="annot mb-6">Route fault</p>
              <h1 className="t-display text-fg">404</h1>
              <p className="t-lead mt-6">
                This line is not connected to anything. The page may have been relocated, or the
                link was drawn by hand and never commissioned.
              </p>
              <div className="mt-9">
                <ButtonLink to="/" icon="arrow-right">
                  Return to the plate
                </ButtonLink>
              </div>
            </div>
            <div className="md:col-span-4 md:col-start-9">
              <div className="marks border border-line bg-panel/60 p-6">
                <span className="t-label">Diagnostic</span>
                <div className="mt-4 flex flex-col gap-2 font-mono text-[11px] text-fg-dim">
                  <span className="flex justify-between border-t border-line/70 pt-2">
                    <span className="text-fg-faint">STATUS</span> 404
                  </span>
                  <span className="flex justify-between border-t border-line/70 pt-2">
                    <span className="text-fg-faint">SYSTEM</span> cold-side
                  </span>
                  <span className="flex justify-between border-t border-line/70 pt-2">
                    <span className="text-fg-faint">ACTION</span> re-route
                  </span>
                </div>
                <div className="thread mt-5" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </PageTransition>
  )
}
