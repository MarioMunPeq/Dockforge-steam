import * as THREE from 'three'
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js'
import { SUBTRACTION, Brush, Evaluator } from 'three-bvh-csg'
import {
  calcularAjustesHueco,
  calcularAjustesPuck,
  type DockParams,
} from './dockParams'
import type { Diagnostico } from './diagnostico'
import {
  PATA_PROFUNDIDAD,
  PATA_RADIO,
  calcularColocacionPuck,
  posicionesPatas,
} from './layout'

type FuenteMessage = {
  type: 'fuente-mando' | 'fuente-puck'
  positions: Float32Array
  normals: Float32Array
  indices: Uint32Array
}

type CalcularMessage = {
  type: 'calcular'
  id: number
  params: DockParams
  /** Altura del mando ya centrado y girado, con su punto bajo en y = 0. */
  placementY: number
}

type Mensaje = FuenteMessage | CalcularMessage

// Tipado mínimo del contexto de un module worker (el proyecto usa lib DOM).
const ctx = self as unknown as {
  onmessage: ((event: MessageEvent<Mensaje>) => void) | null
  postMessage: (message: unknown, transfer?: Transferable[]) => void
}

let fuenteMando: THREE.BufferGeometry | null = null
let fuentePuck: THREE.BufferGeometry | null = null
let evaluador: Evaluator | null = null

function crearEvaluador() {
  if (evaluador) return evaluador
  evaluador = new Evaluator()
  // Solo posición y normal: los modelos no traen UV.
  evaluador.attributes = ['position', 'normal']
  evaluador.useGroups = false
  return evaluador
}

function crearBase(params: DockParams): THREE.BufferGeometry {
  const radio = Math.min(
    Math.max(0, params.redondeo),
    params.grosor / 2 - 0.02,
    params.ancho / 2 - 0.02,
    params.fondo / 2 - 0.02,
  )

  const geometry =
    radio > 0.05
      ? new RoundedBoxGeometry(
          params.ancho,
          params.grosor,
          params.fondo,
          4,
          radio,
        )
      : new THREE.BoxGeometry(params.ancho, params.grosor, params.fondo)

  geometry.translate(0, params.grosor / 2, 0)
  geometry.deleteAttribute('uv')
  return geometry
}

function expandirPorNormales(geometry: THREE.BufferGeometry, margen: number) {
  if (margen <= 0) return

  const posicion = geometry.getAttribute('position') as THREE.BufferAttribute
  const normal = geometry.getAttribute('normal') as THREE.BufferAttribute

  for (let i = 0; i < posicion.count; i++) {
    posicion.setXYZ(
      i,
      posicion.getX(i) + normal.getX(i) * margen,
      posicion.getY(i) + normal.getY(i) * margen,
      posicion.getZ(i) + normal.getZ(i) * margen,
    )
  }

  posicion.needsUpdate = true
  geometry.computeVertexNormals()
}

function crearCavidadMando(params: DockParams, placementY: number) {
  if (!fuenteMando) return null

  const { margen } = calcularAjustesHueco(params)
  const cavidad = fuenteMando.clone()
  expandirPorNormales(cavidad, margen)

  cavidad.applyMatrix4(
    new THREE.Matrix4().makeRotationX(
      THREE.MathUtils.degToRad(params.inclinacion),
    ),
  )
  cavidad.translate(0, placementY, 0)
  cavidad.computeBoundingBox()

  // La expansión hacia abajo no debe atravesar el fondo de la base.
  const suelo = 1
  if (cavidad.boundingBox && cavidad.boundingBox.min.y < suelo) {
    cavidad.translate(0, suelo - cavidad.boundingBox.min.y, 0)
    cavidad.computeBoundingBox()
  }

  return cavidad
}

function crearCavidadPuck(
  params: DockParams,
  colocacion: { x: number; z: number } | null,
) {
  if (!fuentePuck || !colocacion) return null

  const { holgura, profundidad } = calcularAjustesPuck(params)
  const cavidad = fuentePuck.clone()
  expandirPorNormales(cavidad, holgura)

  // El puck está normalizado con su base en y = 0. Al expandir la cavidad
  // hacia abajo, subimos la misma holgura para que el fondo quede exacto.
  cavidad.translate(
    colocacion.x,
    params.grosor - profundidad + holgura,
    colocacion.z,
  )
  cavidad.computeBoundingBox()
  return cavidad
}

function crearCanal(params: DockParams) {
  if (!params.canalCable) return null

  const largo = params.fondo / 2 + 12
  const radio = Math.min(
    1.4,
    params.canalAlto / 2 - 0.01,
    params.canalAncho / 2 - 0.01,
  )

  const canal =
    radio > 0.05
      ? new RoundedBoxGeometry(
          params.canalAncho,
          params.canalAlto,
          largo,
          2,
          radio,
        )
      : new THREE.BoxGeometry(params.canalAncho, params.canalAlto, largo)

  // Entra desde el centro y sale por la cara trasera (-Z), por debajo de la base.
  canal.translate(0, params.canalAlto / 2, -largo / 2)
  canal.deleteAttribute('uv')
  return canal
}

function crearAlojamientosPatas(params: DockParams) {
  if (!params.patas) return []

  return posicionesPatas(params.ancho, params.fondo).map(([x, z]) => {
    const geometry = new THREE.CylinderGeometry(
      PATA_RADIO,
      PATA_RADIO,
      PATA_PROFUNDIDAD + 0.2,
      24,
    )
    geometry.translate(x, PATA_PROFUNDIDAD / 2, z)
    geometry.deleteAttribute('uv')
    return geometry
  })
}

/** Superficie del hueco que mira hacia abajo y puede necesitar soportes. */
function medirVoladizo(
  cavity: THREE.BufferGeometry | null,
  params: DockParams,
) {
  if (!cavity) return { area: 0, porcentaje: 0 }

  const posicion = cavity.getAttribute('position') as THREE.BufferAttribute
  const index = cavity.getIndex()
  const total = index ? index.count : posicion.count
  const a = new THREE.Vector3()
  const b = new THREE.Vector3()
  const c = new THREE.Vector3()
  const ab = new THREE.Vector3()
  const ac = new THREE.Vector3()
  const normal = new THREE.Vector3()

  let areaTotal = 0
  let areaColgante = 0

  for (let indice = 0; indice < total; indice += 3) {
    const ia = index ? index.getX(indice) : indice
    const ib = index ? index.getX(indice + 1) : indice + 1
    const ic = index ? index.getX(indice + 2) : indice + 2

    a.fromBufferAttribute(posicion, ia)
    b.fromBufferAttribute(posicion, ib)
    c.fromBufferAttribute(posicion, ic)
    ab.subVectors(b, a)
    ac.subVectors(c, a)
    normal.crossVectors(ab, ac)

    const longitud = normal.length()
    if (longitud < 1e-8) continue

    const area = longitud / 2
    areaTotal += area

    const centroY = (a.y + b.y + c.y) / 3
    const centroX = (a.x + b.x + c.x) / 3
    const centroZ = (a.z + b.z + c.z) / 3
    const dentro =
      Math.abs(centroX) <= params.ancho / 2 &&
      Math.abs(centroZ) <= params.fondo / 2

    if (
      dentro &&
      normal.y / longitud < -0.45 &&
      centroY > 0.8 &&
      centroY < params.grosor - 0.4
    ) {
      areaColgante += area
    }
  }

  return {
    area: areaColgante,
    porcentaje: areaTotal > 0 ? (areaColgante / areaTotal) * 100 : 0,
  }
}

function paredCaja(
  caja: THREE.Box3,
  ancho: number,
  fondo: number,
): number {
  return Math.min(
    caja.min.x + ancho / 2,
    ancho / 2 - caja.max.x,
    caja.min.z + fondo / 2,
    fondo / 2 - caja.max.z,
  )
}

function crearDiagnostico(
  params: DockParams,
  cajaMando: THREE.Box3 | null,
  cajaPuck: THREE.Box3 | null,
  voladizo: { area: number; porcentaje: number },
): Diagnostico {
  const cajas = [cajaMando, cajaPuck].filter(
    (caja): caja is THREE.Box3 => caja !== null,
  )

  let paredLateral = Infinity
  let dentroBase = true

  for (const caja of cajas) {
    paredLateral = Math.min(
      paredLateral,
      paredCaja(caja, params.ancho, params.fondo),
    )

    if (
      caja.min.x < -params.ancho / 2 - 0.01 ||
      caja.max.x > params.ancho / 2 + 0.01 ||
      caja.min.z < -params.fondo / 2 - 0.01 ||
      caja.max.z > params.fondo / 2 + 0.01
    ) {
      dentroBase = false
    }
  }

  let separacionHuecos: number | null = null
  if (cajaMando && cajaPuck) {
    const dx = Math.max(
      0,
      Math.max(
        cajaMando.min.x - cajaPuck.max.x,
        cajaPuck.min.x - cajaMando.max.x,
      ),
    )
    const dz = Math.max(
      0,
      Math.max(
        cajaMando.min.z - cajaPuck.max.z,
        cajaPuck.min.z - cajaMando.max.z,
      ),
    )
    separacionHuecos = Math.hypot(dx, dz)
  }

  return {
    paredLateral: Number.isFinite(paredLateral) ? paredLateral : 0,
    paredFondoMando: cajaMando ? cajaMando.min.y : 0,
    paredFondoPuck: cajaPuck ? cajaPuck.min.y : null,
    separacionHuecos,
    voladizoArea: voladizo.area,
    voladizoPorcentaje: voladizo.porcentaje,
    dentroBase,
  }
}

function enviarResultado(
  id: number,
  geometry: THREE.BufferGeometry,
  diagnostico: Diagnostico,
  aviso?: string,
) {
  const posicion = geometry.getAttribute('position') as THREE.BufferAttribute
  let normal = geometry.getAttribute('normal') as
    | THREE.BufferAttribute
    | undefined

  if (!normal) {
    geometry.computeVertexNormals()
    normal = geometry.getAttribute('normal') as THREE.BufferAttribute
  }

  const index = geometry.getIndex()
  const positions = new Float32Array(posicion.array as ArrayLike<number>)
  const normals = new Float32Array(normal.array as ArrayLike<number>)
  const indices = index ? new Uint32Array(index.count) : null

  if (index && indices) {
    for (let i = 0; i < index.count; i++) indices[i] = index.getX(i)
  }

  const transferibles: Transferable[] = [
    positions.buffer as ArrayBuffer,
    normals.buffer as ArrayBuffer,
  ]
  if (indices) transferibles.push(indices.buffer as ArrayBuffer)

  ctx.postMessage(
    {
      type: 'resultado',
      id,
      positions,
      normals,
      indices,
      diagnostico,
      aviso,
    },
    transferibles,
  )
}

function calcular(
  id: number,
  params: DockParams,
  placementY: number,
) {
  const baseGeometry = crearBase(params)
  const cavidadMando = crearCavidadMando(params, placementY)

  let colocacionPuck: { x: number; z: number } | null = null
  if (params.puckActivo && fuentePuck && fuenteMando) {
    // La posición se recalcula con el tamaño real del puck y del mando.
    const cajaMando = new THREE.Box3().setFromBufferAttribute(
      fuenteMando.getAttribute('position') as THREE.BufferAttribute,
    )
    const cajaPuck = new THREE.Box3().setFromBufferAttribute(
      fuentePuck.getAttribute('position') as THREE.BufferAttribute,
    )
    colocacionPuck = calcularColocacionPuck(params, cajaMando, cajaPuck)
  }

  const cavidadPuck = crearCavidadPuck(params, colocacionPuck)
  const canal = crearCanal(params)
  const patas = crearAlojamientosPatas(params)

  const cavidades = [cavidadPuck, canal, ...patas].filter(
    (geometria): geometria is THREE.BufferGeometry => geometria !== null,
  )

  const voladizo = medirVoladizo(cavidadMando, params)
  const diagnostico = crearDiagnostico(
    params,
    cavidadMando?.boundingBox ?? null,
    cavidadPuck?.boundingBox ?? null,
    voladizo,
  )

  let resultado = baseGeometry
  let aviso: string | undefined

  if (evaluador && cavidadMando) {
    cavidades.unshift(cavidadMando)
  }

  if (evaluador && cavidades.length > 0) {
    let actual = new Brush(baseGeometry)
    actual.updateMatrixWorld(true)

    try {
      for (const cavidad of cavidades) {
        const brush = new Brush(cavidad)
        brush.updateMatrixWorld(true)
        const siguiente = evaluador.evaluate(actual, brush, SUBTRACTION)

        // Liberamos los resultados intermedios; la base inicial se libera al
        // final para no dejar geometría huérfana.
        if (actual.geometry !== baseGeometry) actual.geometry.dispose()
        actual = siguiente
      }

      resultado = actual.geometry
    } catch {
      aviso =
        'No se pudo calcular el rebaje con esta geometría; se muestra la base sin huecos.'
    }
  }

  try {
    enviarResultado(id, resultado, diagnostico, aviso)
  } finally {
    if (resultado !== baseGeometry) resultado.dispose()
    baseGeometry.dispose()
    cavidadMando?.dispose()
    cavidadPuck?.dispose()
    canal?.dispose()
    patas.forEach((geometria) => geometria.dispose())
  }
}

ctx.onmessage = (event) => {
  const mensaje = event.data

  if (mensaje.type === 'fuente-mando' || mensaje.type === 'fuente-puck') {
    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute(
      'position',
      new THREE.BufferAttribute(mensaje.positions, 3),
    )
    geometry.setAttribute(
      'normal',
      new THREE.BufferAttribute(mensaje.normals, 3),
    )
    geometry.setIndex(new THREE.BufferAttribute(mensaje.indices, 1))
    geometry.computeBoundingBox()
    geometry.computeBoundingSphere()

    if (mensaje.type === 'fuente-mando') {
      fuenteMando?.dispose()
      fuenteMando = geometry
    } else {
      fuentePuck?.dispose()
      fuentePuck = geometry
    }

    crearEvaluador()
    ctx.postMessage({ type: 'listo' })
    return
  }

  const solicitud = mensaje as CalcularMessage

  try {
    calcular(solicitud.id, solicitud.params, solicitud.placementY)
  } catch (error) {
    ctx.postMessage({
      type: 'error',
      id: solicitud.id,
      message:
        error instanceof Error
          ? error.message
          : 'Error desconocido al calcular el hueco.',
    })
  }
}
