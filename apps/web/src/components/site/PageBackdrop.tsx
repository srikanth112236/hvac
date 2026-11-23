import { cn } from '@/lib/cn'

/** Optional CMS photograph used as a page-hero backdrop on wide screens. */
export function PageBackdrop({
  src,
  alt,
  className,
}: {
  src?: string | null
  alt?: string | null
  className?: string
}) {
  if (!src) return null
  return (
    <div
      className={cn(
        'pointer-events-none absolute inset-y-0 right-0 hidden w-[42%] overflow-hidden lg:block',
        className,
      )}
    >
      <img src={src} alt={alt || ''} className="h-full w-full object-cover opacity-25" />
      <div
        aria-hidden
        className="absolute inset-0 bg-gradient-to-r from-base via-base/80 to-base/10"
      />
      <div
        aria-hidden
        className="absolute inset-0 bg-gradient-to-t from-base via-transparent to-base/40"
      />
    </div>
  )
}