import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'

const MANDO_URL = '/models/mando.glb'

export type MandoSource = {
  /** Geometría fusionada, centrada en el origen y con normales. */
  geometry: THREE.BufferGeometry
  /** Copias planas listas para enviar al worker de CSG. */
  positions: Float32Array
  normals: Float32Array
  indices: Uint32Array
}

/**
 * Carga el mando y devuelve una única geometría centrada en el origen.
 * Se conserva la escala del GLB: 1 unidad = 1 mm.
 */
export async function cargarMandoSource(): Promise<MandoSource> {
  const gltf = await new GLTFLoader().loadAsync(MANDO_URL)

  // Clonamos para no tocar la escena que Three.js pueda tener cacheada.
  const modelo = gltf.scene.clone(true)
  modelo.updateMatrixWorld(true)

  // Mismo centrado que Mando3D: el mando gira alrededor de su propio centro.
  const caja = new THREE.Box3().setFromObject(modelo)
  const centro = caja.getCenter(new THREE.Vector3())
  modelo.position.sub(centro)
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
      for (let i = 0; i < posicion.count; i++) {
        indices.push(base + i)
      }
    }

    base += posicion.count
    geometria.dispose()
  })

  if (base === 0) {
    throw new Error('El modelo del mando no contiene geometría.')
  }

  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute(
    'position',
    new THREE.Float32BufferAttribute(posiciones, 3),
  )
  geometry.setIndex(indices)
  geometry.computeVertexNormals()
  geometry.computeBoundingBox()
  geometry.computeBoundingSphere()

  const posicion = geometry.getAttribute('position')
  const normal = geometry.getAttribute('normal')
  const index = geometry.getIndex()

  return {
    geometry,
    positions: new Float32Array(posicion.array as ArrayLike<number>),
    normals: new Float32Array(normal.array as ArrayLike<number>),
    indices: new Uint32Array(index?.array as ArrayLike<number>),
  }
}

/**
 * Altura a la que hay que subir el mando para que su punto más bajo quede
 * en y = 0.05 tras girarlo alrededor del eje X.
 */
export function calcularAlturaApoyo(
  geometry: THREE.BufferGeometry,
  inclinacionRad: number,
) {
  const posicion = geometry.getAttribute('position')
  const coseno = Math.cos(inclinacionRad)
  const seno = Math.sin(inclinacionRad)
  let minimo = Infinity

  for (let i = 0; i < posicion.count; i++) {
    // Rotación alrededor de X: y' = y * cos - z * sen.
    const y = posicion.getY(i) * coseno - posicion.getZ(i) * seno
    if (y < minimo) minimo = y
  }

  return Number.isFinite(minimo) ? -minimo + 0.05 : 0
}
