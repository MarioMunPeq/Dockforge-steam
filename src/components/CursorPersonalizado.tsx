import { useEffect, useRef } from 'react'
import './CursorPersonalizado.css'

const SELECTOR_INTERACTIVO =
  'a, button, input, select, textarea, label, summary, [role="button"], [data-cursor]'

function punteroFino() {
  return (
    typeof window !== 'undefined' &&
    window.matchMedia('(hover: hover) and (pointer: fine)').matches
  )
}

/**
 * Cursor de precisión: punto inmediato y anillo con inercia.
 * Solo se activa con ratón o trackpad; en táctil no existe.
 */
export default function CursorPersonalizado() {
  const raiz = useRef<HTMLDivElement>(null)
  const anillo = useRef<HTMLSpanElement>(null)
  const punto = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    if (!punteroFino()) return
    const elemento = raiz.current
    const anilloActual = anillo.current
    const puntoActual = punto.current
    if (!elemento || !anilloActual || !puntoActual) return

    const html = document.documentElement
    const reducido = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches

    html.classList.add('cursor-personalizado')

    let x = window.innerWidth / 2
    let y = window.innerHeight / 2
    let suaveX = x
    let suaveY = y
    let escala = 1
    let sobreInteractivo = false
    let pulsando = false
    let visible = false
    let frame = 0

    const esInteractivo = (objetivo: EventTarget | null) =>
      objetivo instanceof Element && Boolean(objetivo.closest(SELECTOR_INTERACTIVO))

    const mostrar = () => {
      if (visible) return
      visible = true
      elemento.classList.add('is-visible')
    }

    const ocultar = () => {
      visible = false
      elemento.classList.remove('is-visible')
    }

    const mover = (evento: PointerEvent) => {
      x = evento.clientX
      y = evento.clientY
      mostrar()
    }

    const entrar = (evento: PointerEvent) => {
      sobreInteractivo = esInteractivo(evento.target)
      elemento.classList.toggle('is-activo', sobreInteractivo)
    }

    const salir = (evento: PointerEvent) => {
      if (esInteractivo(evento.relatedTarget)) return
      sobreInteractivo = false
      elemento.classList.remove('is-activo')
    }

    const pulsar = () => {
      pulsando = true
      elemento.classList.add('is-pulsando')
    }

    const soltar = () => {
      pulsando = false
      elemento.classList.remove('is-pulsando')
    }

    const bucle = () => {
      const inercia = reducido ? 1 : 0.16
      suaveX += (x - suaveX) * inercia
      suaveY += (y - suaveY) * inercia

      const escalaObjetivo = pulsando ? 0.68 : sobreInteractivo ? 1.45 : 1
      escala += (escalaObjetivo - escala) * (reducido ? 1 : 0.22)

      puntoActual.style.transform = `translate3d(${x}px, ${y}px, 0) translate(-50%, -50%)`
      anilloActual.style.transform = `translate3d(${suaveX}px, ${suaveY}px, 0) translate(-50%, -50%) scale(${escala})`

      frame = window.requestAnimationFrame(bucle)
    }

    window.addEventListener('pointermove', mover, { passive: true })
    window.addEventListener('pointerdown', pulsar, { passive: true })
    window.addEventListener('pointerup', soltar, { passive: true })
    document.addEventListener('pointerover', entrar, { passive: true })
    document.addEventListener('pointerout', salir, { passive: true })
    document.addEventListener('pointerleave', ocultar)
    window.addEventListener('blur', ocultar)

    frame = window.requestAnimationFrame(bucle)

    return () => {
      window.cancelAnimationFrame(frame)
      window.removeEventListener('pointermove', mover)
      window.removeEventListener('pointerdown', pulsar)
      window.removeEventListener('pointerup', soltar)
      document.removeEventListener('pointerover', entrar)
      document.removeEventListener('pointerout', salir)
      document.removeEventListener('pointerleave', ocultar)
      window.removeEventListener('blur', ocultar)
      html.classList.remove('cursor-personalizado')
    }
  }, [])

  if (!punteroFino()) return null

  return (
    <div ref={raiz} className="cursor" aria-hidden="true">
      <span ref={anillo} className="cursor__anillo" />
      <span ref={punto} className="cursor__punto" />
    </div>
  )
}
