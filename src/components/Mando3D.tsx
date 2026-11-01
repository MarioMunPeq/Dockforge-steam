import { useLayoutEffect, useMemo, type ReactNode } from 'react'
import { useGLTF } from '@react-three/drei'
import * as THREE from 'three'

const MANDO_URL = '/models/mando.glb'

// Ajustes del material del mando.
export type MandoMaterial = {
  roughness?: number
  metalness?: number
  clearcoat?: number
  clearcoatRoughness?: number
}

export type Mando3DProps = {
  /** Rotación en radianes, igual que en Three.js. */
  rotacion?: [number, number, number]
  color?: string
  material?: MandoMaterial
  /** Elementos extra que siguen al mando (marcadores, etiquetas 3D...). */
  children?: ReactNode
}

type ParteMando = {
  posiciones: THREE.BufferAttribute | THREE.InterleavedBufferAttribute
  matriz: THREE.Matrix4
}

/**
 * Carga el mando y lo centra en el origen.
 * El GLB ya está en milímetros, así que conservamos 1 unidad = 1 mm.
 */
function useMando() {
  const { scene } = useGLTF(MANDO_URL)

  return useMemo(() => {
    // Clonamos la escena para no modificar el modelo cacheado por useGLTF.
    const modelo = scene.clone(true)

    modelo.traverse((hijo) => {
      if (!(hijo instanceof THREE.Mesh)) return

      // El GLB no incluye normales: las calculamos para iluminar bien.
      hijo.geometry.computeVertexNormals()
      hijo.castShadow = true
      hijo.receiveShadow = true
    })

    // Centramos el modelo para poder girarlo alrededor de su propio centro.
    modelo.updateMatrixWorld(true)
    const caja = new THREE.Box3().setFromObject(modelo)
    const centro = caja.getCenter(new THREE.Vector3())
    modelo.position.set(-centro.x, -centro.y, -centro.z)
    modelo.updateMatrixWorld(true)

    // Guardamos la transformación de cada parte ya centrada. Así podemos
    // calcular la altura de apoyo para cualquier rotación sin depender del grupo.
    const partes: ParteMando[] = []
    modelo.traverse((hijo) => {
      if (!(hijo instanceof THREE.Mesh)) return
      partes.push({
        posiciones: hijo.geometry.getAttribute('position'),
        matriz: hijo.matrixWorld.clone(),
      })
    })

    return { modelo, partes }
  }, [scene])
}

/** Devuelve la altura mínima del mando para una rotación dada. */
function calcularAlturaMinima(
  partes: ParteMando[],
  rotacion: [number, number, number],
) {
  const matrizRotacion = new THREE.Matrix4().makeRotationFromEuler(
    new THREE.Euler(rotacion[0], rotacion[1], rotacion[2], 'XYZ'),
  )
  const matriz = new THREE.Matrix4()
  const vertice = new THREE.Vector3()
  let minimo = Infinity

  for (const parte of partes) {
    matriz.multiplyMatrices(matrizRotacion, parte.matriz)

    for (let i = 0; i < parte.posiciones.count; i++) {
      vertice.fromBufferAttribute(parte.posiciones, i).applyMatrix4(matriz)
      if (vertice.y < minimo) minimo = vertice.y
    }
  }

  return Number.isFinite(minimo) ? minimo : 0
}

/**
 * Mando 3D reutilizable.
 * Deja el punto más bajo del modelo en y = 0, así se puede colocar
 * directamente sobre el suelo, un dock o cualquier otra superficie.
 */
export default function Mando3D({
  rotacion = [0, 0, 0],
  color = '#d6dae2',
  material,
  children,
}: Mando3DProps) {
  const { modelo, partes } = useMando()
  const [rx, ry, rz] = rotacion

  const altura = useMemo(
    () => -calcularAlturaMinima(partes, [rx, ry, rz]) + 0.05,
    [partes, rx, ry, rz],
  )

  // Plástico mate con un pequeño clearcoat para reflejar el entorno.
  useLayoutEffect(() => {
    const mat = new THREE.MeshPhysicalMaterial({
      color,
      roughness: material?.roughness ?? 0.55,
      metalness: material?.metalness ?? 0.05,
      clearcoat: material?.clearcoat ?? 0.25,
      clearcoatRoughness: material?.clearcoatRoughness ?? 0.65,
      envMapIntensity: 0.9,
    })

    modelo.traverse((hijo) => {
      if (hijo instanceof THREE.Mesh) hijo.material = mat
    })

    return () => mat.dispose()
  }, [
    modelo,
    color,
    material?.roughness,
    material?.metalness,
    material?.clearcoat,
    material?.clearcoatRoughness,
  ])

  return (
    <group position={[0, altura, 0]}>
      <group rotation={[rx, ry, rz]}>
        <primitive object={modelo} />
        {children}
      </group>
    </group>
  )
}

// Precargamos el modelo para que aparezca lo antes posible.
useGLTF.preload(MANDO_URL)
