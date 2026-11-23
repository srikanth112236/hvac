import { useEffect, useRef, type CSSProperties, type ReactNode } from 'react'
import { cn } from '@/lib/cn'
import { ScrollTrigger, prefersReducedMotion } from './core'

interface DepthSceneProps {
  children: ReactNode
  className?: string
  /** How far the deepest layer travels on scroll, in pixels. */
  travel?: number
}

/**
 * A lightweight 3D scene: pointer position feeds --mx/--my and scroll progress
 * feeds --sy. Layers opt into depth with <DepthLayer depth={n} />. No per-layer
 * JS runs on scroll — one CSS variable update moves the whole stack, and the
 * component is inert for reduced-motion users.
 */
export function DepthScene({ children, className, travel = 56 }: DepthSceneProps) {
  const sceneRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const scene = sceneRef.current
    if (!scene || prefersReducedMotion()) return

    scene.style.setProperty('--travel', `${travel}px`)
    scene.style.setProperty('--sy', '0.5')

    const trigger = ScrollTrigger.create({
      trigger: scene,
      start: 'top bottom',
      end: 'bottom top',
      onUpdate: (self) => scene.style.setProperty('--sy', self.progress.toFixed(4)),
    })

    const finePointer = window.matchMedia('(pointer: fine)').matches
    const onPointerMove = (event: PointerEvent) => {
      const rect = scene.getBoundingClientRect()
      const mx = ((event.clientX - rect.left) / rect.width - 0.5) * 2
      const my = ((event.clientY - rect.top) / rect.height - 0.5) * 2
      scene.style.setProperty('--mx', mx.toFixed(3))
      scene.style.setProperty('--my', my.toFixed(3))
    }
    const reset = () => {
      scene.style.setProperty('--mx', '0')
      scene.style.setProperty('--my', '0')
    }

    if (finePointer) {
      scene.addEventListener('pointermove', onPointerMove)
      scene.addEventListener('pointerleave', reset)
    }

    return () => {
      trigger.kill()
      scene.removeEventListener('pointermove', onPointerMove)
      scene.removeEventListener('pointerleave', reset)
    }
  }, [travel])

  return (
    <div ref={sceneRef} className={cn('depth-scene', className)}>
      {children}
    </div>
  )
}

interface DepthLayerProps {
  children: ReactNode
  className?: string
  /** 0 is the background plane; 4 sits closest to the viewer. */
  depth?: number
}

export function DepthLayer({ children, className, depth = 1 }: DepthLayerProps) {
  return (
    <div
      className={cn('depth-layer', className)}
      style={{ '--depth': depth } as CSSProperties}
    >
      {children}
    </div>
  )
}
