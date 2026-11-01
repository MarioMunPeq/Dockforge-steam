import { useLayoutEffect, useRef } from 'react'
import { useLocation } from 'react-router'
import gsap from 'gsap'
import './TransicionSeccion.css'

const NUMERO: Record<string, string> = {
  '/': '01',
  '/inspector': '02',
  '/gemelo': '03',
  '/taller': '04',
}

/**
 * Barrido entre secciones: una cortina con filo naranja cubre el cambio de
 * ruta y se retira hacia arriba. No hay cortes secos.
 */
export default function TransicionSeccion() {
  const { pathname } = useLocation()
  const raiz = useRef<HTMLDivElement>(null)
  const primera = useRef(true)

  useLayoutEffect(() => {
    const elemento = raiz.current
    if (!elemento) return

    if (primera.current) {
      primera.current = false
      return
    }

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      gsap.set(elemento, { display: 'none' })
      return
    }

    gsap.killTweensOf(elemento)
    gsap.set(elemento, { display: 'block', yPercent: 0 })

    const timeline = gsap.timeline({
      onComplete: () => gsap.set(elemento, { display: 'none' }),
    })

    timeline
      .fromTo(
        '.transicion__sello',
        { opacity: 0, y: 10 },
        { opacity: 1, y: 0, duration: 0.22, ease: 'power2.out' },
        0,
      )
      .to('.transicion__sello', { opacity: 0, duration: 0.16 }, 0.34)
      .to(elemento, {
        yPercent: -100,
        duration: 0.85,
        ease: 'power4.inOut',
      }, 0.1)

    return () => {
      timeline.kill()
    }
  }, [pathname])

  return (
    <div ref={raiz} className="transicion" aria-hidden="true">
      <span className="transicion__sello">
        <span className="transicion__numero">{NUMERO[pathname] ?? '00'}</span>
        Dock Forge
      </span>
      <span className="transicion__filo" />
    </div>
  )
}
