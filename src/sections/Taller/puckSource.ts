import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'

const PUCK_URL = '/models/puck.glb'

export type PuckSource = {
  /** Geometría del puck centrada en X/Z y con su base en y = 0. */
  geometry: THREE.BufferGeometry
  positions: Float32Array
  normals: Float32Array
  indices: Uint32Array
  /** Medidas reales del puck, en milímetros. */
  ancho: number
  fondo: number
  alto: number
}

/**
 * Carga el puck y lo normaliza para poder sentarlo en su hueco: centro en el
 * origen de X/Z y cara inferior en y = 0.
 */
export async function cargarPuckSource(): Promise<PuckSource> {
  const gltf = await new GLTFLoader().loadAsync(PUCK_URL)
  const modelo = gltf.scene.clone(true)
  modelo.updateMatrixWorld(true)

  const posiciones: number[] = []
  const indices: number[] = []
  let base = 0

  modelo.traverse((hijo) => {
    if (!(hijo instanceof THREE.Mesh)) return

    const geometria = hijo.geometry.clone()
    geometria.applyMatrix4(hijo.matrixWorld)

    const posicion = geometria.getAttribute('position')
    const index = geometria.getIndex()

    for (let i = 0; i < posicion.count; i++) {
      posiciones.push(posicion.getX(i), posicion.getY(i), posicion.getZ(i))
    }

    if (index) {
      for (let i = 0; i < index.count; i++) {
        indices.push(base + index.getX(i))
      }
    } else {
      for (let i = 0; i < posicion.count; i++) indices.push(base + i)
    }

    base += posicion.count
    geometria.dispose()
  })

  if (base === 0) {
    throw new Error('El modelo del puck no contiene geometría.')
  }

  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute(
    'position',
    new THREE.Float32BufferAttribute(posiciones, 3),
  )
  geometry.setIndex(indices)
  geometry.computeVertexNormals()
  geometry.computeBoundingBox()

  const caja = geometry.boundingBox
  if (!caja) {
    throw new Error('No se pudieron medir las dimensiones del puck.')
  }

  const centro = caja.getCenter(new THREE.Vector3())
  geometry.translate(-centro.x, -caja.min.y, -centro.z)
  geometry.computeBoundingBox()
  geometry.computeBoundingSphere()

  const cajaFinal = geometry.boundingBox
  if (!cajaFinal) {
    throw new Error('No se pudieron medir las dimensiones del puck.')
  }

  const posicion = geometry.getAttribute('position')
  const normal = geometry.getAttribute('normal')
  const index = geometry.getIndex()

  return {
    geometry,
    positions: new Float32Array(posicion.array as ArrayLike<number>),
    normals: new Float32Array(normal.array as ArrayLike<number>),
    indices: new Uint32Array(index?.array as ArrayLike<number>),
    ancho: cajaFinal.max.x - cajaFinal.min.x,
    fondo: cajaFinal.max.z - cajaFinal.min.z,
    alto: cajaFinal.max.y - cajaFinal.min.y,
  }
}
