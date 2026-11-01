import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { useLenisScroll } from '../../lib/useLenisScroll'
import EscenaInicio from './EscenaInicio'
import './Inicio.css'

gsap.registerPlugin(ScrollTrigger)

type Escena = {
  numero: string
  etiqueta: string
  titulo: string[]
  texto: string
  datos?: { nombre: string; valor: string }[]
  acciones?: boolean
}

const ESCENAS: Escena[] = [
  {
    numero: '01',
    etiqueta: 'Objeto',
    titulo: ['Diseña el dock.', 'Imprime el encaje.'],
    texto:
      'Dock Forge convierte tu Steam Controller en un objeto de escritorio. Base, hueco, puck y texto, medidos en milímetros reales.',
    acciones: true,
  },
  {
    numero: '02',
    etiqueta: 'Superficie',
    titulo: ['Sticks y trackpads', 'a escala real.'],
    texto:
      'La cámara baja hasta los controles que más usas. Cada zona conserva su coordenada para que el hueco del dock encaje donde debe.',
    datos: [
      { nombre: 'Stick', valor: '±12 mm · 360°' },
      { nombre: 'Trackpad', valor: '55 × 40 mm · clic 1 mm' },
    ],
  },
  {
    numero: '03',
    etiqueta: 'Corte',
    titulo: ['Cada milímetro', 'cuenta.'],
    texto:
      'Un plano de recorte atraviesa el mando y muestra el espesor real de la carcasa. La base se calcula con la misma escala.',
    datos: [
      { nombre: 'Escala', valor: '1 unidad = 1 mm' },
      { nombre: 'Holgura', valor: '0–10 mm' },
    ],
  },
  {
    numero: '04',
    etiqueta: 'Estructura',
    titulo: ['La estructura', 'a la vista.'],
    texto:
      'El modo alambre revela la malla completa. Es una sola pieza: el modelo se conserva entero, sin cortes ni uniones artificiales.',
    datos: [
      { nombre: 'Malla', valor: 'Pieza única' },
      { nombre: 'Formato', valor: 'STL · mm' },
    ],
  },
  {
    numero: '05',
    etiqueta: 'Encaje',
    titulo: ['Listo para', 'la impresora.'],
    texto:
      'El mando se asienta en el dock. Ajusta la base en el Taller, revisa las medidas y descarga el STL cuando todo encaje.',
    acciones: true,
  },
]

const estaticoProgreso = { current: 0 }

/** Portada: relato de cinco escenas fijas sobre el mando 3D. */
export default function Inicio() {
  const [reducido, setReducido] = useState(
    () =>
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  )
  const [activa, setActiva] = useState(0)

  const contenedor = useRef<HTMLElement>(null)
  const barra = useRef<HTMLSpanElement>(null)
  const contador = useRef<HTMLSpanElement>(null)
  const progreso = useRef(0)
  const lenis = useLenisScroll(contenedor, !reducido)

  useEffect(() => {
    const consulta = window.matchMedia('(prefers-reduced-motion: reduce)')
    const alCambiar = (evento: MediaQueryListEvent) => {
      setReducido(evento.matches)
    }

    consulta.addEventListener('change', alCambiar)
    return () => consulta.removeEventListener('change', alCambiar)
  }, [])

  useEffect(() => {
    if (reducido) return

    const lienzo = contenedor.current
    if (!lienzo) return

    const contenido = lienzo.querySelector<HTMLElement>('.inicio__scroll')
    if (!contenido) return

    const contexto = gsap.context(() => {
      ScrollTrigger.create({
        trigger: contenido,
        scroller: lienzo,
        start: 'top top',
        end: 'bottom bottom',
        invalidateOnRefresh: true,
        onUpdate: (self) => {
          progreso.current = self.progress

          const indice = Math.min(
            ESCENAS.length - 1,
            Math.floor(self.progress * ESCENAS.length + 0.0001),
          )
          setActiva((actual) => (actual === indice ? actual : indice))

          if (barra.current) {
            barra.current.style.transform = `scaleX(${self.progress})`
          }
          if (contador.current) {
            contador.current.textContent = String(indice + 1).padStart(2, '0')
          }
        },
      })
    }, lienzo)

    return () => contexto.revert()
  }, [reducido])

  const irAEscena = (indice: number) => {
    const lienzo = contenedor.current
    if (!lienzo) return

    const destino = lienzo.clientHeight * indice

    if (lenis.current) {
      lenis.current.scrollTo(destino, {
        duration: reducido ? 0 : 1.15,
        easing: (t) => 1 - Math.pow(1 - t, 3),
      })
      return
    }

    lienzo.scrollTo({
      top: destino,
      behavior: reducido ? 'auto' : 'smooth',
    })
  }

  const acciones = (
    <div className="inicio__actions">
      <Link to="/taller" className="button button--primary">
        Abrir Taller
      </Link>
      <Link to="/inspector" className="button">
        Explorar Inspector
      </Link>
    </div>
  )

  if (reducido) {
    return (
      <section className="inicio inicio--estatico">
        <div className="inicio__estatico-hero">
          <EscenaInicio progreso={estaticoProgreso} estatico />

          <div className="inicio__estatico-copy">
            <p className="inicio__label">
              <span>01</span> Configurador 3D
            </p>
            <h1 className="inicio__title">
              <span>Diseña el dock.</span>
              <span>Imprime el encaje.</span>
            </h1>
            <p className="inicio__text">{ESCENAS[0].texto}</p>
            {acciones}
          </div>
        </div>

        <div className="inicio__estatico-lista">
          {ESCENAS.slice(1).map((escena) => (
            <article className="inicio__estatico-paso" key={escena.numero}>
              <span className="inicio__estatico-numero">{escena.numero}</span>
              <div>
                <h2 className="inicio__estatico-titulo">
                  {escena.titulo.join(' ')}
                </h2>
                <p className="inicio__texto">{escena.texto}</p>
              </div>
            </article>
          ))}
        </div>
      </section>
    )
  }

  return (
    <section
      className="inicio"
      ref={contenedor}
      aria-label="Presentación de Dock Forge"
    >
      <div className="inicio__scroll">
      <div className="inicio__viewport">
        <EscenaInicio progreso={progreso} />

        <div className="inicio__hud" aria-hidden="true">
          <span className="inicio__hud-index" ref={contador}>
            01
          </span>
          <span className="inicio__hud-sep">/</span>
          <span className="inicio__hud-total">05</span>
        </div>

        <ol className="inicio__rail" aria-label="Escenas de la portada">
          {ESCENAS.map((escena, indice) => (
            <li key={escena.numero}>
              <button
                type="button"
                className={`inicio__rail-boton${
                  activa === indice ? ' is-activa' : ''
                }`}
                aria-current={activa === indice ? 'step' : undefined}
                onClick={() => irAEscena(indice)}
              >
                <span className="inicio__rail-index">{escena.numero}</span>
                <span className="inicio__rail-name">{escena.etiqueta}</span>
              </button>
            </li>
          ))}
        </ol>

        {ESCENAS.map((escena, indice) => (
          <article
            className={`inicio__copy inicio__copy--${indice + 1}${
              activa === indice ? ' is-activa' : ''
            }`}
            key={escena.numero}
            aria-hidden={activa !== indice}
            inert={activa !== indice}
          >
            <div className="inicio__copy-inner">
              <p className="inicio__label">
                <span>{escena.numero}</span>
                {escena.etiqueta}
              </p>

              {indice === 0 ? (
                <h1 className="inicio__title">
                  {escena.titulo.map((linea) => (
                    <span key={linea}>{linea}</span>
                  ))}
                </h1>
              ) : (
                <h2 className="inicio__heading">
                  {escena.titulo.map((linea) => (
                    <span key={linea}>{linea}</span>
                  ))}
                </h2>
              )}

              <p className="inicio__text">{escena.texto}</p>

              {escena.datos && (
                <dl className="inicio__datos">
                  {escena.datos.map((dato) => (
                    <div key={dato.nombre}>
                      <dt>{dato.nombre}</dt>
                      <dd>{dato.valor}</dd>
                    </div>
                  ))}
                </dl>
              )}

              {escena.acciones && acciones}
            </div>
          </article>
        ))}

        <div className="inicio__progress" aria-hidden="true">
          <span ref={barra} />
        </div>
      </div>

      <div className="inicio__pasos" aria-hidden="true">
        {ESCENAS.map((escena) => (
          <div className="inicio__paso" key={escena.numero} />
        ))}
      </div>
      </div>
    </section>
  )
}
