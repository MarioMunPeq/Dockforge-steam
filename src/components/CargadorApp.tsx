import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react'
import { useProgress } from '@react-three/drei'
import gsap from 'gsap'
import './CargadorApp.css'

type CargadorAppProps = {
  /** Se llama cuando la cortina empieza a retirarse. */
  onDone: () => void
}

function limitar(valor: number, maximo: number) {
  return Math.min(maximo, Math.max(0, valor))
}

function nombreArchivo(item: string) {
  if (!item) return 'mando.glb'
  const limpio = item.split('?')[0].split('/').filter(Boolean)
  return limpio[limpio.length - 1] ?? 'mando.glb'
}

/**
 * Pantalla de carga: el porcentaje sale del progreso real del modelo 3D.
 * La cortina se retira cuando termina la descarga y se ha visto un mínimo.
 */
export default function CargadorApp({ onDone }: CargadorAppProps) {
  const { progress, active, item } = useProgress()
  const [minimo, setMinimo] = useState(false)
  const [forzado, setForzado] = useState(false)
  const [oculto, setOculto] = useState(false)

  const raiz = useRef<HTMLDivElement>(null)
  const numero = useRef<HTMLSpanElement>(null)
  const barra = useRef<HTMLSpanElement>(null)
  const mostrado = useRef(0)
  const onDoneRef = useRef(onDone)
  const reducido = useRef(
    typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  )

  useEffect(() => {
    onDoneRef.current = onDone
  }, [onDone])

  const iniciado = active || progress > 0

  useEffect(() => {
    const minimo = window.setTimeout(() => setMinimo(true), 2200)
    const rescate = window.setTimeout(() => setForzado(true), 9000)
    return () => {
      window.clearTimeout(minimo)
      window.clearTimeout(rescate)
    }
  }, [])

  const completado = iniciado && progress >= 99.5 && !active
  const saliendo = forzado || (minimo && completado)

  // Contador y barra suavizados; el dato de fondo es el progreso real.
  useEffect(() => {
    const objetivo = limitar(progress, 100)

    if (reducido.current) {
      mostrado.current = objetivo
      if (numero.current) {
        numero.current.textContent = String(Math.round(objetivo)).padStart(
          3,
          '0',
        )
      }
      if (barra.current) {
        barra.current.style.transform = `scaleX(${objetivo / 100})`
      }
      return
    }

    const proxy = { valor: mostrado.current }
    const tween = gsap.to(proxy, {
      valor: objetivo,
      duration: 0.55,
      ease: 'power2.out',
      onUpdate: () => {
        mostrado.current = proxy.valor
        if (numero.current) {
          numero.current.textContent = String(
            Math.round(proxy.valor),
          ).padStart(3, '0')
        }
        if (barra.current) {
          barra.current.style.transform = `scaleX(${proxy.valor / 100})`
        }
      },
    })

    return () => {
      tween.kill()
    }
  }, [progress])

  // Entrada: la marca se revela por líneas y el resto aparece escalonado.
  useLayoutEffect(() => {
    const raizActual = raiz.current
    if (!raizActual) return

    const contexto = gsap.context(() => {
      if (reducido.current) {
        gsap.set(
          [
            '.cargador__marca-linea > span',
            '.cargador__cabecera > *',
            '.cargador__pie',
          ],
          { clearProps: 'all' },
        )
        return
      }

      gsap
        .timeline()
        .from('.cargador__marca-linea > span', {
          yPercent: 112,
          duration: 1.1,
          ease: 'expo.out',
          stagger: 0.1,
        })
        .from(
          '.cargador__cabecera > *',
          { opacity: 0, y: 10, duration: 0.6, stagger: 0.08 },
          '-=0.75',
        )
        .from(
          ['.cargador__estado', '.cargador__cifra'],
          { opacity: 0, y: 14, duration: 0.6, stagger: 0.08 },
          '-=0.45',
        )
        .from(
          '.cargador__barra',
          { opacity: 0, duration: 0.5 },
          '-=0.4',
        )
    }, raizActual)

    return () => contexto.revert()
  }, [])

  // Salida: la cortina sube y deja ver la aplicación ya compuesta.
  useEffect(() => {
    if (!saliendo || oculto) return
    const raizActual = raiz.current
    if (!raizActual) return

    const duracion = reducido.current ? 0 : 1
    const timeline = gsap.timeline({
      onComplete: () => setOculto(true),
    })

    timeline.to('.cargador__contenido', {
      yPercent: -8,
      opacity: 0,
      duration: duracion * 0.45,
      ease: 'power2.in',
    })

    timeline.call(() => onDoneRef.current())

    timeline.to(
      raizActual,
      {
        yPercent: -100,
        duration: duracion * 0.95,
        ease: 'power4.inOut',
      },
      reducido.current ? 0 : '-=0.05',
    )

    return () => {
      timeline.kill()
    }
  }, [saliendo, oculto])

  if (oculto) return null

  const archivo = nombreArchivo(item)

  const estado = !iniciado
    ? 'Preparando la escena'
    : progress < 30
      ? 'Leyendo geometría'
      : progress < 75
        ? 'Cargando el mando'
        : progress < 99.5
          ? 'Compilando materiales'
          : 'Encajando las piezas'

  return (
    <div ref={raiz} className="cargador">
      <div className="cargador__contenido">
        <header className="cargador__cabecera">
          <span className="cargador__firma">
            <span className="cargador__punto" aria-hidden="true" />
            Dock Forge
          </span>
          <span className="cargador__meta">Configurador 3D · STL 1:1 mm</span>
        </header>

        <div className="cargador__centro">
          <p className="cargador__indice" aria-hidden="true">
            01 / 05
          </p>
          <h1 className="cargador__marca" aria-label="Dock Forge">
            <span className="cargador__marca-linea">
              <span>Dock</span>
            </span>
            <span className="cargador__marca-linea">
              <span>Forge</span>
            </span>
          </h1>
        </div>

        <footer className="cargador__pie">
          <div
            className="cargador__estado"
            role="status"
            aria-live="polite"
          >
            <span className="cargador__senal" aria-hidden="true" />
            <span>{estado}</span>
            <span className="cargador__archivo">{archivo}</span>
          </div>

          <span className="cargador__cifra" aria-hidden="true">
            <span ref={numero}>000</span>
            <span className="cargador__unidad">%</span>
          </span>
        </footer>
      </div>

      <div className="cargador__barra" aria-hidden="true">
        <span ref={barra} />
      </div>
    </div>
  )
}
