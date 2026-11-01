import { useCallback, useEffect, useRef, useState } from 'react'
import { Billboard } from '@react-three/drei'
import type { ThreeEvent } from '@react-three/fiber'
import * as THREE from 'three'
import Mando3D from '../../components/Mando3D'
import StudioScene from '../../components/StudioScene'
import { zonas, type ZonaMando } from '../../data/zones'
import CameraFlight, { type VueloCamara } from './CameraFlight'
import GuideLine, { type PuntoPantalla } from './GuideLine'
import Hotspot from './Hotspot'
import SidePanel, { type PuntoCalibracion } from './SidePanel'
import './Inspector.css'

const CAMARA_INICIAL: [number, number, number] = [150, 175, -175]
const OBJETIVO_INICIAL: [number, number, number] = [0, 32, 0]
const ROTACION_MANDO: [number, number, number] = [-0.18, -0.42, 0]
const VISTA_POR_DEFECTO: [number, number, number] = [0, 100, -155]

/** Tiempo que cada zona permanece en pantalla durante la visita guiada. */
const DURACION_TOUR = 3200

/** Vuelo amplio: la cámara rodea el mando antes de posarse en cada control. */
const VUELO_TOUR = { duracion: 1.55, arco: 80, giro: 95 }

function redondear(valor: number) {
  return Math.round(valor * 10) / 10
}

function formatearValor(valor: number) {
  return Number.isInteger(valor) ? String(valor) : valor.toFixed(1)
}

function PuntoCalibracion3D({ punto }: { punto: PuntoCalibracion }) {
  return (
    <Billboard position={punto}>
      <mesh raycast={() => null}>
        <sphereGeometry args={[2.6, 16, 16]} />
        <meshBasicMaterial
          color="#ffd166"
          depthTest={false}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>

      <mesh raycast={() => null}>
        <ringGeometry args={[5, 6.2, 32]} />
        <meshBasicMaterial
          color="#ffd166"
          transparent
          opacity={0.65}
          side={THREE.DoubleSide}
          depthTest={false}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>
    </Billboard>
  )
}

/** Inspector interactivo del mando. */
export default function Inspector() {
  const [seleccionadaId, setSeleccionadaId] = useState<string | null>(null)
  const [vuelo, setVuelo] = useState<VueloCamara | null>(null)
  const [calibrando, setCalibrando] = useState(false)
  const [puntos, setPuntos] = useState<PuntoCalibracion[]>([])
  const [puntoActivo, setPuntoActivo] = useState<PuntoCalibracion | null>(null)
  const [hoverId, setHoverId] = useState<string | null>(null)
  const [tourActivo, setTourActivo] = useState(false)
  const [tourIndice, setTourIndice] = useState(0)

  const marcadores = useRef(new Map<string, THREE.Object3D>())
  const vueloId = useRef(0)

  const escenario = useRef<HTMLDivElement>(null)
  const guia = useRef<SVGSVGElement>(null)
  const guiaBrillo = useRef<SVGPathElement>(null)
  const guiaLinea = useRef<SVGPathElement>(null)
  const guiaInicio = useRef<SVGCircleElement>(null)
  const guiaFin = useRef<SVGCircleElement>(null)
  const foco = useRef<HTMLDivElement>(null)
  const destinoGuia = useRef({ x: 0, y: 0 })
  const destinoListo = useRef(false)
  const guiaVisible = useRef(false)

  const seleccionada =
    zonas.find((zona) => zona.id === seleccionadaId) ?? null
  const hover =
    hoverId === null ? null : (zonas.find((zona) => zona.id === hoverId) ?? null)

  const indiceSeleccionado = zonas.findIndex(
    (zona) => zona.id === seleccionadaId,
  )
  const siguiente =
    zonas.length > 0
      ? zonas[(indiceSeleccionado + 1 + zonas.length) % zonas.length]
      : null

  const registrarMarcador = useCallback(
    (id: string, objeto: THREE.Object3D | null) => {
      if (objeto) marcadores.current.set(id, objeto)
      else marcadores.current.delete(id)
    },
    [],
  )

  const volarA = useCallback(
    (
      zona: ZonaMando,
      opciones?: { duracion?: number; arco?: number; giro?: number },
    ) => {
      const marcador = marcadores.current.get(zona.id)
      if (!marcador) return

      const objetivo = marcador.getWorldPosition(new THREE.Vector3())
      const camara = marcador.localToWorld(
        new THREE.Vector3(...(zona.vista ?? VISTA_POR_DEFECTO)),
      )

      vueloId.current += 1
      setVuelo({
        id: vueloId.current,
        camara: [camara.x, camara.y, camara.z],
        objetivo: [objetivo.x, objetivo.y, objetivo.z],
        ...opciones,
      })
    },
    [],
  )

  const enfocarZona = useCallback(
    (zona: ZonaMando, cinematografico = false) => {
      setSeleccionadaId(zona.id)
      volarA(zona, cinematografico ? VUELO_TOUR : undefined)
    },
    [volarA],
  )

  // Selección manual: cualquier clic del usuario detiene la visita guiada.
  const seleccionar = useCallback(
    (zona: ZonaMando) => {
      setTourActivo(false)
      enfocarZona(zona)
    },
    [enfocarZona],
  )

  const resaltar = useCallback((zona: ZonaMando | null) => {
    setHoverId(zona?.id ?? null)
  }, [])

  const volverVistaGeneral = useCallback(() => {
    setTourActivo(false)
    setSeleccionadaId(null)
    vueloId.current += 1
    setVuelo({
      id: vueloId.current,
      camara: CAMARA_INICIAL,
      objetivo: OBJETIVO_INICIAL,
      duracion: 1.1,
      arco: 55,
      giro: -45,
    })
  }, [])

  const cerrarFicha = useCallback(() => {
    setTourActivo(false)
    setSeleccionadaId(null)
  }, [])

  const avanzarZona = useCallback(() => {
    if (zonas.length === 0) return

    // Durante la visita guiada, N salta al siguiente plano sin detenerla.
    if (tourActivo) {
      if (tourIndice >= zonas.length - 1) {
        setTourActivo(false)
        volverVistaGeneral()
      } else {
        setTourIndice((indice) => indice + 1)
      }
      return
    }

    const indice = zonas.findIndex((zona) => zona.id === seleccionadaId)
    const proxima = zonas[(indice + 1 + zonas.length) % zonas.length]
    if (proxima) enfocarZona(proxima)
  }, [
    tourActivo,
    tourIndice,
    seleccionadaId,
    enfocarZona,
    volverVistaGeneral,
  ])

  const alternarTour = useCallback(() => {
    if (tourActivo) {
      setTourActivo(false)
      return
    }

    setCalibrando(false)
    setPuntoActivo(null)
    setTourIndice(0)
    setTourActivo(true)
  }, [tourActivo])

  const alternarCalibracion = useCallback(() => {
    setCalibrando((actual) => !actual)
    setSeleccionadaId(null)
    setHoverId(null)
    setTourActivo(false)
  }, [])

  // Cada zona del tour se enfoca con un vuelo curvo y se mantiene en pantalla
  // el tiempo suficiente para leer la ficha. Al terminar, se vuelve al plano
  // general y se desactiva la visita.
  useEffect(() => {
    if (!tourActivo) return

    const zona = zonas[tourIndice]
    if (!zona) return

    // La visita avanza por zonas y necesita sincronizar la selección con el
    // vuelo de cámara al cambiar de plano; no hay evento de usuario que lo
    // dispare.
    // oxlint-disable-next-line react/set-state-in-effect
    enfocarZona(zona, true)

    const temporizador = window.setTimeout(() => {
      if (tourIndice >= zonas.length - 1) {
        setTourActivo(false)
        volverVistaGeneral()
      } else {
        setTourIndice((indice) => indice + 1)
      }
    }, DURACION_TOUR)

    return () => window.clearTimeout(temporizador)
  }, [tourActivo, tourIndice, enfocarZona, volverVistaGeneral])

  // Mantiene actualizado el punto de llegada de la línea guía: el borde del
  // escenario más cercano a la ficha del panel lateral.
  useEffect(() => {
    if (!seleccionada) return

    destinoListo.current = false

    const actualizarDestino = () => {
      const escena = escenario.current
      const ficha = document.querySelector<HTMLElement>(
        '[data-inspector-anchor]',
      )
      if (!escena || !ficha) return

      const cajaEscena = escena.getBoundingClientRect()
      const cajaFicha = ficha.getBoundingClientRect()

      destinoGuia.current = {
        x: THREE.MathUtils.clamp(
          cajaFicha.left + cajaFicha.width / 2 - cajaEscena.left,
          0,
          cajaEscena.width,
        ),
        y: THREE.MathUtils.clamp(
          cajaFicha.top + Math.min(cajaFicha.height / 2, 72) - cajaEscena.top,
          0,
          cajaEscena.height,
        ),
      }
      destinoListo.current = true
    }

    actualizarDestino()

    const observador = new ResizeObserver(actualizarDestino)
    if (escenario.current) observador.observe(escenario.current)
    const ficha = document.querySelector<HTMLElement>('[data-inspector-anchor]')
    if (ficha) observador.observe(ficha)

    window.addEventListener('resize', actualizarDestino)
    document.addEventListener('scroll', actualizarDestino, true)
    const retardo = window.setTimeout(actualizarDestino, 280)

    return () => {
      observador.disconnect()
      window.removeEventListener('resize', actualizarDestino)
      document.removeEventListener('scroll', actualizarDestino, true)
      window.clearTimeout(retardo)
    }
  }, [seleccionada])

  // La línea guía se dibuja en SVG y se actualiza de forma imperativa para no
  // provocar un render de React en cada frame.
  const actualizarGuia = useCallback((punto: PuntoPantalla | null) => {
    const svg = guia.current

    if (!punto) {
      if (guiaVisible.current) {
        guiaVisible.current = false
        if (svg) svg.style.opacity = '0'
        if (foco.current) foco.current.style.opacity = '0'
      }
      return
    }

    if (!svg) return

    if (!guiaVisible.current) {
      guiaVisible.current = true
      svg.style.opacity = '1'
      if (foco.current) foco.current.style.opacity = '1'
    }

    if (!destinoListo.current && escenario.current) {
      destinoGuia.current = {
        x: escenario.current.clientWidth,
        y: escenario.current.clientHeight * 0.5,
      }
    }

    const destino = destinoGuia.current
    const dx = destino.x - punto.x
    const signo = dx >= 0 ? 1 : -1
    const curva = Math.max(48, Math.min(190, Math.abs(dx) * 0.42))
    const control1x = punto.x + signo * curva
    const control2x =
      destino.x - signo * Math.max(40, Math.min(120, curva * 0.55))

    const trazado =
      `M ${punto.x.toFixed(1)} ${punto.y.toFixed(1)} ` +
      `C ${control1x.toFixed(1)} ${punto.y.toFixed(1)}, ` +
      `${control2x.toFixed(1)} ${destino.y.toFixed(1)}, ` +
      `${destino.x.toFixed(1)} ${destino.y.toFixed(1)}`

    guiaLinea.current?.setAttribute('d', trazado)
    guiaBrillo.current?.setAttribute('d', trazado)

    guiaInicio.current?.setAttribute('cx', punto.x.toFixed(1))
    guiaInicio.current?.setAttribute('cy', punto.y.toFixed(1))
    guiaFin.current?.setAttribute('cx', destino.x.toFixed(1))
    guiaFin.current?.setAttribute('cy', destino.y.toFixed(1))

    const mancha = foco.current
    if (mancha) {
      mancha.style.setProperty('--spot-x', `${punto.x.toFixed(1)}px`)
      mancha.style.setProperty('--spot-y', `${punto.y.toFixed(1)}px`)
    }
  }, [])

  // Al cerrar la ficha o entrar en calibración, GuideLine deja de emitir
  // frames: apagamos aquí la línea y el foco para que no queden congelados.
  useEffect(() => {
    if (calibrando || !seleccionada) actualizarGuia(null)
  }, [calibrando, seleccionada, actualizarGuia])

  useEffect(() => {
    const alPulsar = (evento: KeyboardEvent) => {
      if (
        evento.repeat ||
        evento.ctrlKey ||
        evento.metaKey ||
        evento.altKey
      ) {
        return
      }

      const objetivo = evento.target
      if (
        objetivo instanceof HTMLElement &&
        objetivo.closest('input, textarea, select, [contenteditable="true"]')
      ) {
        return
      }

      if (evento.key === 'c' || evento.key === 'C') {
        evento.preventDefault()
        alternarCalibracion()
      } else if (evento.key === 't' || evento.key === 'T') {
        evento.preventDefault()
        alternarTour()
      } else if (evento.key === 'n' || evento.key === 'N') {
        if (seleccionadaId) {
          evento.preventDefault()
          avanzarZona()
        }
      } else if (evento.key === 'Escape') {
        setTourActivo(false)
        setSeleccionadaId(null)
      }
    }

    window.addEventListener('keydown', alPulsar)
    return () => window.removeEventListener('keydown', alPulsar)
  }, [
    alternarCalibracion,
    alternarTour,
    avanzarZona,
    seleccionadaId,
  ])

  const capturarPunto = (evento: ThreeEvent<MouseEvent>) => {
    if (!calibrando) return

    const objeto = evento.object
    if (!(objeto instanceof THREE.Mesh)) return

    const geometria = objeto.geometry as THREE.BufferGeometry
    if (!geometria.boundingBox) geometria.computeBoundingBox()

    const caja = geometria.boundingBox
    if (!caja) return

    // El GLB guarda el modelo sin centrar. Mando3D lo desplaza para centrarlo,
    // así que restamos el centro de la geometría para obtener coordenadas del
    // mismo sistema que usa zones.ts.
    const centro = caja.getCenter(new THREE.Vector3())
    const local = objeto.worldToLocal(evento.point.clone()).sub(centro)
    const punto: PuntoCalibracion = [
      redondear(local.x),
      redondear(local.y),
      redondear(local.z),
    ]

    setPuntos((actuales) => [...actuales.slice(-11), punto])
    setPuntoActivo(punto)

    console.log('[Inspector] posición 3D (mm):', punto)
    console.log(`  posicion: [${punto.map(formatearValor).join(', ')}],`)
  }

  const limpiarPuntos = () => {
    setPuntos([])
    setPuntoActivo(null)
  }

  return (
    <section className="inspector">
      <div
        ref={escenario}
        className={`inspector__stage${
          calibrando ? ' inspector__stage--calibrando' : ''
        }`}
      >
        <StudioScene
          cameraPosition={CAMARA_INICIAL}
          target={OBJETIVO_INICIAL}
          contactShadowScale={480}
        >
          <group onClick={capturarPunto}>
            <Mando3D color="#cfd7e6" rotacion={ROTACION_MANDO}>
              {!calibrando &&
                zonas.map((zona) => (
                  <Hotspot
                    key={zona.id}
                    zona={zona}
                    activa={zona.id === seleccionadaId}
                    atenuado={
                      seleccionadaId !== null && zona.id !== seleccionadaId
                    }
                    onSelect={seleccionar}
                    onHover={resaltar}
                    onReady={registrarMarcador}
                  />
                ))}

              {!calibrando && (
                <GuideLine
                  posicion={seleccionada?.posicion ?? null}
                  activa={seleccionada !== null}
                  onProyectar={actualizarGuia}
                />
              )}

              {calibrando && puntoActivo && (
                <PuntoCalibracion3D punto={puntoActivo} />
              )}
            </Mando3D>
          </group>

          <CameraFlight vuelo={vuelo} />
        </StudioScene>

        {/* Foco suave: oscurece el resto del mando al inspeccionar una zona. */}
        <div
          ref={foco}
          className="inspector__spotlight"
          aria-hidden="true"
        />

        {/* Línea guía animada entre el hotspot y la ficha lateral. */}
        <svg
          ref={guia}
          className="inspector__guide"
          aria-hidden="true"
        >
          <path ref={guiaBrillo} className="inspector__guide-glow" />
          <path ref={guiaLinea} className="inspector__guide-line" />
          <circle ref={guiaInicio} className="inspector__guide-start" r={3.5} />
          <circle ref={guiaFin} className="inspector__guide-end" r={2.5} />
        </svg>

        <header className="inspector__header">
          <p className="inspector__eyebrow">Inspector</p>
          <h1 className="inspector__title">Cada control, en su sitio.</h1>
          <p className="inspector__subtitle">
            Haz clic en un punto del mando para ver su ficha.
          </p>
        </header>

        <div className="inspector__controls">
          <button
            type="button"
            className={`inspector__tour${tourActivo ? ' is-active' : ''}`}
            aria-pressed={tourActivo}
            title="Recorrido automático por todas las zonas"
            onClick={alternarTour}
          >
            <span className="inspector__tour-icon" aria-hidden="true">
              {tourActivo ? '■' : '▶'}
            </span>
            {tourActivo ? 'Detener' : 'Tour'}
          </button>

          <button
            type="button"
            className="inspector__reset"
            onClick={volverVistaGeneral}
          >
            Vista general
          </button>
        </div>

        {tourActivo && seleccionada && (
          <div className="inspector__tour-status" role="status">
            <span className="inspector__tour-pulse" />
            <span className="inspector__tour-label">Tour guiado</span>
            <span className="inspector__tour-count">
              {String(tourIndice + 1).padStart(2, '0')}/{zonas.length}
            </span>
            <strong className="inspector__tour-zone">
              {seleccionada.nombre}
            </strong>
            <span className="inspector__tour-hint">
              <kbd>N</kbd> siguiente
            </span>
          </div>
        )}

        {hover && !calibrando && !seleccionada && (
          <div className="inspector__hover" role="status">
            <span className="inspector__hover-dot" />
            {hover.nombre}
          </div>
        )}

        {calibrando && (
          <div className="inspector__calib-banner" role="status">
            <span className="inspector__calib-dot" />
            Modo calibración
            <span className="inspector__calib-sep">·</span>
            pulsa <kbd>C</kbd> para salir
          </div>
        )}

        {calibrando && puntoActivo && (
          <div className="inspector__readout" role="status" aria-live="polite">
            <p className="inspector__readout-eyebrow">Último punto</p>

            <div className="inspector__readout-values">
              {(['X', 'Y', 'Z'] as const).map((eje, indice) => (
                <span key={eje}>
                  <small>{eje}</small>
                  {formatearValor(puntoActivo[indice])}
                </span>
              ))}
              <span className="inspector__readout-unit">mm</span>
            </div>

            <code className="inspector__readout-snippet">
              posicion: [{puntoActivo.map(formatearValor).join(', ')}],
            </code>
          </div>
        )}

        <footer className="inspector__footer">
          <span>
            Arrastra para orbitar · Rueda para hacer zoom ·{' '}
            <kbd>T</kbd> tour
          </span>
          <span className="inspector__credit">
            Modelo: Valve Corporation · CC BY-NC-SA 4.0
          </span>
        </footer>
      </div>

      <SidePanel
        zonas={zonas}
        seleccionada={seleccionada}
        siguiente={siguiente}
        calibrando={calibrando}
        puntos={puntos}
        onSeleccionar={seleccionar}
        onCerrar={cerrarFicha}
        onSiguiente={avanzarZona}
        onAlternarCalibracion={alternarCalibracion}
        onLimpiarPuntos={limpiarPuntos}
      />
    </section>
  )
}
