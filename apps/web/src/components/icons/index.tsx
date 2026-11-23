import type { ReactNode, SVGProps } from 'react'
import { cn } from '@/lib/cn'

/**
 * Coolvane icon set — drawn for this project only.
 * 24×24 grid, 1.5px stroke, round caps/joins, no mixed icon packs.
 * HVAC glyphs (compressor, coil, duct, chiller, VRF branch, ...) are the
 * vocabulary the service pages and callouts are built from.
 */
const glyphs = {
  'arrow-right': (
    <>
      <path d="M4 12h15" />
      <path d="m13 6 6 6-6 6" />
    </>
  ),
  'arrow-up-right': (
    <>
      <path d="M7 17 17 7" />
      <path d="M8.5 7H17v8.5" />
    </>
  ),
  'chevron-down': <path d="m6 9.5 6 6 6-6" />,
  'chevron-right': <path d="m9.5 6 6 6-6 6" />,
  'chevron-left': <path d="m14.5 6-6 6 6 6" />,
  plus: (
    <>
      <path d="M12 5v14" />
      <path d="M5 12h14" />
    </>
  ),
  minus: <path d="M5 12h14" />,
  close: (
    <>
      <path d="m6 6 12 12" />
      <path d="M18 6 6 18" />
    </>
  ),
  menu: (
    <>
      <path d="M4 8h16" />
      <path d="M4 16h16" />
    </>
  ),
  search: (
    <>
      <circle cx="10.5" cy="10.5" r="6.5" />
      <path d="M15.5 15.5 21 21" />
    </>
  ),
  check: <path d="m4.5 12.5 4.6 4.6L19.5 6.7" />,
  external: (
    <>
      <path d="M14 4h6v6" />
      <path d="M20 4 11 13" />
      <path d="M18 14.5V19a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h4.5" />
    </>
  ),
  download: (
    <>
      <path d="M12 3.5v11" />
      <path d="m7.5 10 4.5 4.5L16.5 10" />
      <path d="M4.5 20.5h15" />
    </>
  ),
  upload: (
    <>
      <path d="M12 20.5v-11" />
      <path d="m7.5 14 4.5-4.5 4.5 4.5" />
      <path d="M4.5 3.5h15" />
    </>
  ),
  image: (
    <>
      <rect x="3.5" y="4.5" width="17" height="15" rx="1.5" />
      <circle cx="8.5" cy="9.5" r="1.5" />
      <path d="m4.5 17 4.5-4.5 3.5 3.5 3-3 4.5 4.5" />
    </>
  ),
  refresh: (
    <>
      <path d="M20 11a8 8 0 1 0-2.3 6.1" />
      <path d="M20 4.5V11h-6.5" />
    </>
  ),
  calendar: (
    <>
      <rect x="3.5" y="5.5" width="17" height="15" rx="1.5" />
      <path d="M3.5 10.5h17" />
      <path d="M8 3.5v4M16 3.5v4" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7v5.2l3.4 2" />
    </>
  ),
  phone: (
    <path d="M5.2 3.5H7.8l1.4 4-1.9 1.3a12.8 12.8 0 0 0 7.4 7.4l1.3-1.9 4 1.4v2.6a2.2 2.2 0 0 1-2.4 2.2A15.5 15.5 0 0 1 3 5.9 2.2 2.2 0 0 1 5.2 3.5Z" />
  ),
  mail: (
    <>
      <rect x="2.5" y="5.5" width="19" height="13" rx="1.5" />
      <path d="m3.5 7 8.5 6 8.5-6" />
    </>
  ),
  pin: (
    <>
      <path d="M12 21.5s6.5-5.6 6.5-10.7a6.5 6.5 0 1 0-13 0C5.5 15.9 12 21.5 12 21.5Z" />
      <circle cx="12" cy="10.5" r="2.4" />
    </>
  ),
  shield: (
    <>
      <path d="M12 2.8 19 5.4v5.4c0 4.6-3 7.8-7 10.4-4-2.6-7-5.8-7-10.4V5.4z" />
      <path d="m8.9 11.9 2.1 2.1 4.2-4.3" />
    </>
  ),
  alert: (
    <>
      <path d="M12 3.5 21 20H3z" />
      <path d="M12 9.5v4.5" />
      <path d="M12 17h.01" />
    </>
  ),

  /* --- thermal ------------------------------------------------------------ */
  snowflake: (
    <>
      <path d="M12 2.5v19" />
      <path d="M4.2 7.2l15.6 9.6" />
      <path d="M19.8 7.2 4.2 16.8" />
      <path d="m9.6 4.6 2.4 1.6 2.4-1.6" />
      <path d="m9.6 19.4 2.4-1.6 2.4 1.6" />
    </>
  ),
  flame: (
    <>
      <path d="M12 21.2a6.2 6.2 0 0 0 6.2-6.4c0-4-2.9-6.5-4.1-9.6-.3-.9-.5-1.7-.6-2.4-1.6 1.6-2.6 3.4-3 5.2-1.4-1-2-2.4-2.2-3.9-1.6 1.7-2.5 4.2-2.5 6.6A6.2 6.2 0 0 0 12 21.2Z" />
      <path d="M12 17.8a2.6 2.6 0 0 0 2.6-2.7c0-1.6-1.4-2.2-2.6-3.8-1.2 1.6-2.6 2.2-2.6 3.8A2.6 2.6 0 0 0 12 17.8Z" />
    </>
  ),
  gauge: (
    <>
      <path d="M3.8 17.5a8.2 8.2 0 1 1 16.4 0" />
      <path d="M12 17.5l4.4-5.6" />
      <circle cx="12" cy="17.5" r="1.1" />
      <path d="M12 6.2v1.6M6.2 9.6l1.2 1M17.8 9.6l-1.2 1" />
    </>
  ),
  airflow: (
    <>
      <path d="M3 8h9.5a2.6 2.6 0 1 0-2.6-2.6" />
      <path d="M3 12.5h14a2.6 2.6 0 1 1-2.6 2.6" />
      <path d="M3 17h6.5" />
    </>
  ),

  /* --- HVAC equipment ----------------------------------------------------- */
  compressor: (
    <>
      <rect x="4.5" y="6" width="15" height="11.5" rx="2" />
      <path d="M7.5 17.5V20M16.5 17.5V20" />
      <path d="M15 6V3.5h3.5" />
      <path d="M9.2 9.6h5.4a1.8 1.8 0 0 1 0 3.6h-4.2a1.8 1.8 0 0 0 0 3.6h4.6" />
    </>
  ),
  coil: <path d="M3.5 6.5h11a2.8 2.8 0 0 1 0 5.6H8a2.8 2.8 0 0 0 0 5.6h12.5" />,
  duct: (
    <>
      <path d="M3 8.5h10.5v7H3z" />
      <path d="M13.5 8.5 18 6v12l-4.5-2.5" />
      <path d="M5.8 12h5.4" />
      <path d="m9.4 10.4 1.6 1.6-1.6 1.6" />
    </>
  ),
  chiller: (
    <>
      <rect x="3.5" y="6" width="17" height="12" rx="1.5" />
      <circle cx="8" cy="12" r="2.9" />
      <path d="M5.8 12h4.4M8 9.8v4.4" />
      <path d="M14 9.5v5M16.5 9.5v5M19 9.5v5" />
    </>
  ),
  vrf: (
    <>
      <path d="M12 3v5.5" />
      <path d="M12 8.5 6 13v3.4" />
      <path d="M12 8.5v7.9" />
      <path d="M12 8.5l6 4.5v3.4" />
      <rect x="3.9" y="16.6" width="4.2" height="4.2" rx="0.6" />
      <rect x="9.9" y="16.6" width="4.2" height="4.2" rx="0.6" />
      <rect x="15.9" y="16.6" width="4.2" height="4.2" rx="0.6" />
    </>
  ),
  'cold-room': (
    <>
      <rect x="4" y="4.5" width="16" height="15" rx="0.6" />
      <path d="M13.5 4.5v15" />
      <path d="M11.6 12h1.1" />
      <path d="M8.5 9.5v5M6.7 11l3.6 2M10.3 11l-3.6 2" />
    </>
  ),
  damper: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M6.4 15.7 17.6 8.3" />
      <circle cx="12" cy="12" r="0.9" />
    </>
  ),
  thermostat: (
    <>
      <path d="M7 3.5h10a2 2 0 0 1 2 2v13a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-13a2 2 0 0 1 2-2Z" />
      <circle cx="12" cy="12.5" r="3.2" />
      <path d="M12 9.3v1.2" />
      <path d="M9.7 12.5h1M13.3 12.5h1M12 14.5v1" />
    </>
  ),
  filter: (
    <>
      <path d="M4 5h16v14H4z" />
      <path d="M4 5l4 14M8 5l4 14M12 5l4 14M16 5l4 14" />
    </>
  ),
  'heat-pump': (
    <>
      <rect x="3.5" y="7.5" width="17" height="11" rx="1.5" />
      <circle cx="12" cy="13" r="3.6" />
      <path d="M12 9.4V13M15.6 13H12" />
      <path d="M6.5 18.5V21M17.5 18.5V21" />
      <path d="M5.5 9.8h3" />
    </>
  ),
  condenser: (
    <>
      <rect x="3" y="6.5" width="18" height="11" rx="1" />
      <circle cx="7.5" cy="12" r="2.6" />
      <path d="M7.5 9.9v4.2M5.4 12h4.2" />
      <path d="M12.5 9v6M15 9v6M17.5 9v6" />
    </>
  ),
  ahu: (
    <>
      <rect x="2.5" y="6" width="19" height="12" rx="1" />
      <path d="M8.5 6v12M15.5 6v12" />
      <circle cx="5.4" cy="12" r="1.9" />
      <path d="M9.5 8l2.4 8M11.9 8l2.4 8" />
      <path d="M17 9v6M19 9v6" />
    </>
  ),
  'cooling-tower': (
    <>
      <path d="M5 5h14l-2.2 15H7.2z" />
      <path d="M8.5 5V3h7v2" />
      <path d="M8 9.5h8M8.6 13h6.8M9.3 16.5h5.4" />
    </>
  ),
  refrigerant: (
    <>
      <rect x="6" y="3.5" width="12" height="17" rx="2.5" />
      <path d="M6 8h12M6 16.5h12" />
      <path d="M9.2 12h5.6" />
    </>
  ),
  wrench: (
    <>
      <path d="M4.5 19.5 13.8 10.2" />
      <path d="M13.2 3.6a4.6 4.6 0 0 1 6.9 5.1l-2.6-1.1-1.9 1.9 1.1 2.6a4.6 4.6 0 0 1-5.1-6.9z" />
    </>
  ),
  bolt: <path d="M13.5 2.5 5 13.5h5L9.5 21.5 19.5 10h-5.5z" />,
  tag: (
    <>
      <path d="M3.5 4.5h7.9l9 9-7.9 7.9-9-9z" />
      <circle cx="8.1" cy="9.1" r="1.4" />
    </>
  ),
  send: (
    <>
      <path d="M21 3.5 3 10.8l6.4 2.6L12 20z" />
      <path d="M9.4 13.4 21 3.5" />
    </>
  ),
} satisfies Record<string, ReactNode>

export type IconName = keyof typeof glyphs
export const iconNames = Object.keys(glyphs) as IconName[]
export const iconCount = iconNames.length

interface IconProps extends Omit<SVGProps<SVGSVGElement>, 'name'> {
  name: IconName
  size?: number
  strokeWidth?: number
  /** Supply only when the icon is the sole carrier of meaning. */
  title?: string
}

export function Icon({
  name,
  size = 20,
  strokeWidth = 1.5,
  title,
  className,
  ...rest
}: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      role={title ? 'img' : undefined}
      aria-hidden={title ? undefined : true}
      focusable="false"
      className={cn('shrink-0', className)}
      {...rest}
    >
      {title ? <title>{title}</title> : null}
      {glyphs[name]}
    </svg>
  )
}
