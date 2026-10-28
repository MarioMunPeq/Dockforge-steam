import { Suspense, useMemo } from 'react'
import { Canvas } from '@react-three/fiber'
import { Center, Html, OrbitControls, useGLTF } from '@react-three/drei'
import * as THREE from 'three'

// El modelo vive en public/models, así que se sirve desde la raíz del sitio.
const MANDO_URL = '/models/mando.glb'

/**
 * Carga el mando, lo escala a un tamaño cómodo y lo centra en el origen.
 * El GLB no trae materiales ni normales, así que los generamos aquí.
 */
function Mando() {
  const { scene } = useGLTF(MANDO_URL)

  const modelo = useMemo(() => {
    // Clonamos la escena para no modificar el modelo cacheado por useGLTF.
    const clon = scene.clone(true)

    // Calculamos su caja envolvente y lo escalamos (el original está en mm).
    const caja = new THREE.Box3().setFromObject(clon)
    const tamano = caja.getSize(new THREE.Vector3())
    const ladoMayor = Math.max(tamano.x, tamano.y, tamano.z)
    clon.scale.setScalar(ladoMayor > 0 ? 4 / ladoMayor : 1)

    clon.traverse((hijo) => {
      if (!(hijo instanceof THREE.Mesh)) return

      // Calculamos normales para que la iluminación funcione.
      hijo.geometry.computeVertexNormals()

      // Material gris suave inspirado en el acabado del mando.
      hijo.material = new THREE.MeshStandardMaterial({
        color: '#b9c0cc',
        roughness: 0.45,
        metalness: 0.25,
      })
    })

    return clon
  }, [scene])

  return (
    <Center>
      <primitive object={modelo} />
    </Center>
  )
}

/** Mensaje mostrado mientras se descarga el modelo. */
function Cargando() {
  return (
    <Html center>
      <p className="viewer__loading">Cargando mando…</p>
    </Html>
  )
}

/** Visor 3D principal: canvas a pantalla completa con órbita y luces suaves. */
export default function Viewer() {
  return (
    <div className="viewer">
      <Canvas
        dpr={[1, 2]}
        camera={{ position: [3.6, 2.4, 4.4], fov: 40, near: 0.1, far: 100 }}
      >
        {/* Fondo oscuro con una niebla sutil para dar profundidad */}
        <color attach="background" args={['#0b0e14']} />
        <fog attach="fog" args={['#0b0e14', 12, 24]} />

        {/* Iluminación suave: ambiente, hemisférica y dos luces direccionales */}
        <ambientLight intensity={0.7} />
        <hemisphereLight args={['#e3ebff', '#1a1f2b', 1.2]} />
        <directionalLight position={[6, 8, 6]} intensity={1.8} />
        <directionalLight
          position={[-6, 2, -4]}
          intensity={0.7}
          color="#8da4ff"
        />

        <Suspense fallback={<Cargando />}>
          <Mando />
        </Suspense>

        {/* Rotación con el ratón y zoom con la rueda */}
        <OrbitControls
          makeDefault
          enableDamping
          dampingFactor={0.08}
          target={[0, 0, 0]}
          minDistance={3}
          maxDistance={16}
        />
      </Canvas>
    </div>
  )
}

// Precargamos el modelo para que aparezca lo antes posible.
useGLTF.preload(MANDO_URL)
