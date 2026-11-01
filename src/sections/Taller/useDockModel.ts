import { useEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import { FontLoader, type Font } from 'three/examples/jsm/loaders/FontLoader.js'
import fontUrl from './fonts/helvetiker_regular.typeface.json?url'
import {
  calcularAjustesHueco,
  type DockParams,
  type TallerParams,
} from './dockParams'
import type { Diagnostico } from './diagnostico'
import { calcularColocacionPuck, type ColocacionPuck } from './layout'
import {
  calcularAlturaApoyo,
  cargarMandoSource,
  type MandoSource,
} from './mandoSource'
import {
  cargarPuckSource,
  type PuckSource,
} from './puckSource'
import { crearTextoExtruido } from './texto'

type ResultadoWorker = {
  type: 'resultado'
  id: number
  positions: Float32Array
  normals: Float32Array
  indices: Uint32Array | null
  diagnostico: Diagnostico
  aviso?: string
}

type MensajeWorker =
  | { type: 'listo' }
  | ResultadoWorker
  | { type: 'error'; id?: number; message: string }

export type DockModel = {
  base: THREE.BufferGeometry | null
  texto: THREE.BufferGeometry | null
  mando: MandoSource | null
  puck: PuckSource | null
  colocacionPuck: ColocacionPuck | null
  placementY: number
  calculando: boolean
  cargando: boolean
  aviso: string | null
  diagnostico: Diagnostico | null
}

function geometriaDesdeWorker(resultado: ResultadoWorker) {
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute(
    'position',
    new THREE.BufferAttribute(resultado.positions, 3),
  )
  geometry.setAttribute(
    'normal',
    new THREE.BufferAttribute(resultado.normals, 3),
  )

  if (resultado.indices) {
    geometry.setIndex(new THREE.BufferAttribute(resultado.indices, 1))
  }

  geometry.computeBoundingBox()
  geometry.computeBoundingSphere()
  return geometry
}

function enviarFuente(
  worker: Worker,
  tipo: 'mando' | 'puck',
  fuente: MandoSource | PuckSource,
) {
  const positions = fuente.positions.slice()
  const normals = fuente.normals.slice()
  const indices = fuente.indices.slice()

  worker.postMessage(
    {
      type: tipo === 'mando' ? 'fuente-mando' : 'fuente-puck',
      positions,
      normals,
      indices,
    },
    [positions.buffer, normals.buffer, indices.buffer],
  )
}

function usarCaja(geometry: THREE.BufferGeometry) {
  if (!geometry.boundingBox) geometry.computeBoundingBox()
  return geometry.boundingBox
}

/**
 * Carga mando y puck, y recalcula el CSG solo cuando cambian los parámetros
 * confirmados. Los sliders actualizan `paramsTexto` en vivo, pero el trabajo
 * pesado se lanza al soltar.
 */
export function useDockModel(
  params: TallerParams,
  paramsTexto: TallerParams,
): DockModel {
  const [mando, setMando] = useState<MandoSource | null>(null)
  const [puck, setPuck] = useState<PuckSource | null>(null)
  const [fuenteError, setFuenteError] = useState<string | null>(null)
  const [fuenteAviso, setFuenteAviso] = useState<string | null>(null)
  const [font, setFont] = useState<Font | null>(null)
  const [base, setBase] = useState<THREE.BufferGeometry | null>(null)
  const [calculando, setCalculando] = useState(true)
  const [avisoCalculo, setAvisoCalculo] = useState<string | null>(null)
  const [diagnostico, setDiagnostico] = useState<Diagnostico | null>(null)
  const [workerListo, setWorkerListo] = useState(false)

  const workerRef = useRef<Worker | null>(null)
  const solicitudRef = useRef(0)
  const baseRef = useRef<THREE.BufferGeometry | null>(null)
  const textoRef = useRef<THREE.BufferGeometry | null>(null)
  const mandoRef = useRef<MandoSource | null>(null)
  const puckRef = useRef<PuckSource | null>(null)

  const ajustes = useMemo(() => calcularAjustesHueco(params), [params])
  const inclinacionRad = THREE.MathUtils.degToRad(params.inclinacion)

  const alturaApoyo = useMemo(
    () =>
      mando ? calcularAlturaApoyo(mando.geometry, inclinacionRad) : 0,
    [mando, inclinacionRad],
  )

  const placementY = alturaApoyo + params.grosor - ajustes.profundidad

  const colocacionPuck = useMemo(() => {
    if (!mando || !puck) return null
    const cajaMando = usarCaja(mando.geometry)
    const cajaPuck = usarCaja(puck.geometry)
    if (!cajaMando || !cajaPuck) return null
    return calcularColocacionPuck(params, cajaMando, cajaPuck)
  }, [mando, puck, params])

  // Carga de mando y puck (una sola vez).
  useEffect(() => {
    let cancelado = false

    Promise.all([cargarMandoSource(), cargarPuckSource()])
      .then(([mandoCargado, puckCargado]) => {
        if (cancelado) {
          mandoCargado.geometry.dispose()
          puckCargado.geometry.dispose()
          return
        }

        mandoRef.current = mandoCargado
        puckRef.current = puckCargado
        setMando(mandoCargado)
        setPuck(puckCargado)
      })
      .catch((error: unknown) => {
        if (cancelado) return
        setCalculando(false)
        setFuenteError(
          error instanceof Error
            ? error.message
            : 'No se pudieron cargar los modelos del mando o del puck.',
        )
      })

    return () => {
      cancelado = true
    }
  }, [])

  // Carga de la tipografía para el texto extruido.
  useEffect(() => {
    let cancelado = false

    new FontLoader().load(
      fontUrl,
      (cargada) => {
        if (!cancelado) setFont(cargada)
      },
      undefined,
      () => {
        if (!cancelado) {
          setFuenteAviso('No se pudo cargar la tipografía del texto.')
        }
      },
    )

    return () => {
      cancelado = true
    }
  }, [])

  // Worker de CSG. Se crea cuando ya están las dos fuentes.
  useEffect(() => {
    if (!mando || !puck) return

    const worker = new Worker(
      new URL('./csgWorker.ts', import.meta.url),
      { type: 'module' },
    )
    workerRef.current = worker

    let listos = 0

    worker.onmessage = (event: MessageEvent<MensajeWorker>) => {
      const mensaje = event.data

      if (mensaje.type === 'listo') {
        listos += 1
        if (listos >= 2) setWorkerListo(true)
        return
      }

      if (mensaje.type === 'resultado') {
        if (mensaje.id !== solicitudRef.current) return

        const geometry = geometriaDesdeWorker(mensaje)
        const anterior = baseRef.current

        baseRef.current = geometry
        setBase(geometry)
        setCalculando(false)
        setAvisoCalculo(mensaje.aviso ?? null)
        setDiagnostico(mensaje.diagnostico)

        if (anterior) {
          window.setTimeout(() => anterior.dispose(), 0)
        }
        return
      }

      if (mensaje.id !== undefined && mensaje.id !== solicitudRef.current) {
        return
      }

      setCalculando(false)
      setFuenteError(mensaje.message)
    }

    worker.onerror = (event) => {
      setCalculando(false)
      setFuenteError(event.message || 'Error en el worker de cálculo.')
    }

    enviarFuente(worker, 'mando', mando)
    enviarFuente(worker, 'puck', puck)

    return () => {
      worker.terminate()
      workerRef.current = null
      setWorkerListo(false)
    }
  }, [mando, puck])

  // Solo los parámetros geométricos alimentan el CSG. El texto se mantiene
  // fuera para que escribir o moverlo no relance el cálculo.
  const paramsDock = useMemo<DockParams>(
    () => ({
      preset: params.preset,
      ancho: params.ancho,
      fondo: params.fondo,
      grosor: params.grosor,
      redondeo: params.redondeo,
      inclinacion: params.inclinacion,
      holgura: params.holgura,
      profundidad: params.profundidad,
      patas: params.patas,
      canalCable: params.canalCable,
      canalAncho: params.canalAncho,
      canalAlto: params.canalAlto,
      puckActivo: params.puckActivo,
      puckPosicion: params.puckPosicion,
      puckDistancia: params.puckDistancia,
      puckHolgura: params.puckHolgura,
      puckProfundidad: params.puckProfundidad,
    }),
    [
      params.preset,
      params.ancho,
      params.fondo,
      params.grosor,
      params.redondeo,
      params.inclinacion,
      params.holgura,
      params.profundidad,
      params.patas,
      params.canalCable,
      params.canalAncho,
      params.canalAlto,
      params.puckActivo,
      params.puckPosicion,
      params.puckDistancia,
      params.puckHolgura,
      params.puckProfundidad,
    ],
  )

  // El CSG se lanza únicamente al confirmar un cambio (fin del arrastre).
  useEffect(() => {
    const worker = workerRef.current
    if (!worker || !workerListo) return

    setCalculando(true)
    setAvisoCalculo(null)
    setDiagnostico(null)

    const id = ++solicitudRef.current
    worker.postMessage({
      type: 'calcular',
      id,
      placementY,
      params: paramsDock,
    })
  }, [workerListo, placementY, paramsDock])

  const texto = useMemo(() => {
    if (!font) return null
    return crearTextoExtruido(font, {
      texto: paramsTexto.texto,
      textoTamano: paramsTexto.textoTamano,
      textoRelieve: paramsTexto.textoRelieve,
    })
  }, [font, paramsTexto.texto, paramsTexto.textoTamano, paramsTexto.textoRelieve])

  // Liberamos la geometría de texto anterior cuando cambia.
  useEffect(() => {
    const anterior = textoRef.current
    textoRef.current = texto

    if (anterior && anterior !== texto) {
      window.setTimeout(() => anterior.dispose(), 0)
    }
  }, [texto])

  // Limpieza al desmontar la sección.
  useEffect(() => {
    return () => {
      textoRef.current?.dispose()
      baseRef.current?.dispose()
      mandoRef.current?.geometry.dispose()
      puckRef.current?.geometry.dispose()
    }
  }, [])

  const cargando = !fuenteError && (!mando || !puck || !workerListo)
  const aviso = fuenteError ?? avisoCalculo ?? fuenteAviso

  return {
    base,
    texto,
    mando,
    puck,
    colocacionPuck,
    placementY,
    calculando,
    cargando,
    aviso,
    diagnostico,
  }
}
