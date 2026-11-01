import { useEffect, useRef, type RefObject } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import Lenis from 'lenis'

gsap.registerPlugin(ScrollTrigger)

/**
 * Scroll suave con Lenis sobre un contenedor propio y sincronización con
 * ScrollTrigger. Se desactiva con `prefers-reduced-motion` o en táctil.
 */
export function useLenisScroll(
  contenedor: RefObject<HTMLElement | null>,
  activo: boolean,
) {
  const instancia = useRef<Lenis | null>(null)

  useEffect(() => {
    if (!activo) return

    const envoltorio = contenedor.current
    const contenido = envoltorio?.firstElementChild
    if (!envoltorio || !(contenido instanceof HTMLElement)) return

    const lenis = new Lenis({
      wrapper: envoltorio,
      content: contenido,
      lerp: 0.09,
      wheelMultiplier: 0.9,
      touchMultiplier: 1.4,
      smoothWheel: true,
      syncTouch: false,
      autoResize: true,
    })

    instancia.current = lenis

    const alDesplazar = () => ScrollTrigger.update()
    lenis.on('scroll', alDesplazar)

    const tick = (tiempo: number) => lenis.raf(tiempo * 1000)
    gsap.ticker.add(tick)
    gsap.ticker.lagSmoothing(0)

    return () => {
      lenis.off('scroll', alDesplazar)
      gsap.ticker.remove(tick)
      lenis.destroy()
      instancia.current = null
    }
  }, [activo, contenedor])

  return instancia
}
