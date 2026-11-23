/**
 * Drawn coverage plate rather than a third-party map iframe: it keeps the
 * Foundry drafting language in both variants, needs no API key, and does not
 * load a light-themed widget into a dark page. "Open in Maps" hands off to
 * OpenStreetMap for routing.
 */
const gridBackground = {
  backgroundImage:
    'repeating-linear-gradient(0deg, rgb(var(--line) / 0.7) 0 1px, transparent 1px 40px), repeating-linear-gradient(90deg, rgb(var(--line) / 0.7) 0 1px, transparent 1px 40px)',
}

const roads = [
  'M0 118 L640 96',
  'M0 246 L640 224',
  'M96 0 L132 360',
  'M470 0 L438 360',
  'M0 190 L640 178',
  'M250 0 L286 360',
]

export function CoveragePlate() {
  return (
    <figure>
      <div className="relative h-[300px] overflow-hidden border border-line bg-panel/40 md:h-[360px]">
        <div aria-hidden className="absolute inset-0 opacity-60" style={gridBackground} />

        <svg
          viewBox="0 0 640 360"
          className="absolute inset-0 h-full w-full"
          role="img"
          aria-label="Schematic of the Dallas works and its service radius"
        >
          <g
            fill="none"
            strokeWidth="1"
            style={{ stroke: 'rgb(var(--line-strong) / 0.9)' }}
          >
            {roads.map((road) => (
              <path key={road} d={road} />
            ))}
          </g>

          <g
            fill="none"
            strokeWidth="1"
            strokeDasharray="3 5"
            style={{ stroke: 'rgb(var(--cold) / 0.65)' }}
          >
            <circle cx="320" cy="190" r="64" />
            <circle cx="320" cy="190" r="108" />
            <circle cx="320" cy="190" r="152" />
          </g>

          <g style={{ stroke: 'rgb(var(--heat) / 0.8)' }} strokeWidth="1">
            <path d="M320 154v18M320 208v18M284 190h18M338 190h18" />
          </g>
          <circle
            cx="320"
            cy="190"
            r="6"
            style={{ fill: 'rgb(var(--heat))' }}
          />

          <g
            fontFamily="var(--font-mono)"
            fontSize="9"
            letterSpacing="1.4"
            style={{ fill: 'rgb(var(--fg-faint))' }}
          >
            <text x="334" y="176">WORKS · DOWNTOWN DALLAS</text>
            <text x="334" y="258">72 KM RADIUS</text>
            <text x="28" y="42">FORT WORTH</text>
            <text x="512" y="340">PLANO</text>
            <text x="28" y="340">DALLAS · 72 KM</text>
          </g>

          <g style={{ stroke: 'rgb(var(--heat) / 0.7)' }} strokeWidth="1">
            <path d="M320 190 L132 120" />
          </g>
        </svg>

        <span className="annot absolute left-4 top-4">32.7767° N · 96.7970° W</span>
        <span className="absolute bottom-4 right-4 font-mono text-[9px] uppercase tracking-[0.12em] text-fg-faint">
          Schematic · not to scale
        </span>
      </div>

      <figcaption className="mt-3 flex items-start gap-3 font-mono text-[9px] uppercase leading-relaxed tracking-[0.1em] text-fg-faint">
        <span className="mt-1.5 h-px w-5 shrink-0 bg-line-strong" />
        Service radius from the Dallas works. Fort Worth and Plano are attended on scheduled
        routes, not sold as same-hour coverage.
      </figcaption>
    </figure>
  )
}
