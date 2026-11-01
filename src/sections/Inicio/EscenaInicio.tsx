import {
  Suspense,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  type RefObject,
} from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import {
  ContactShadows,
  Environment,
  Lightformer,
  RoundedBox,
  useGLTF,
} from '@react-three/drei'
import * as THREE from 'three'
import { LUCES, PALETA } from '../../lib/palette'

const MANDO_URL = '/models/mando.glb'

/** Radio del dock de la escena final. */
const DOCK_ALTO = 22

type Vista = {
  camara: [number, number, number]
  objetivo: [number, number, number]
}

/** Planos de cámara: objeto, detalle, corte, estructura y encaje. */
const VISTAS: Vista[] = [
  { camara: [235, 155, 305], objetivo: [-30, 42, 0] },
  { camara: [120, 70, 185], objetivo: [28, 33, -8] },
  { camara: [268, 48, 8], objetivo: [-22, 30, 0] },
  { camara: [-228, 132, 258], objetivo: [24, 36, 0] },
  { camara: [0, 112, 372], objetivo: [-34, 42, 0] },
]

function limitar(valor: number, minimo = 0, maximo = 1) {
  return Math.min(maximo, Math.max(minimo, valor))
}

function suavizar(valor: number) {
  const t = limitar(valor)
  return t * t * (3 - 2 * t)
}

function useModeloMando() {
  const { scene } = useGLTF(MANDO_URL)

  return useMemo(() => {
    const modelo = scene.clone(true)

    modelo.traverse((hijo) => {
      if (!(hijo instanceof THREE.Mesh)) return
      // El GLB no trae normales: se calculan para iluminar la superficie mate.
      hijo.geometry.computeVertexNormals()
      hijo.castShadow = true
      hijo.receiveShadow = true
    })

    modelo.updateMatrixWorld(true)
    const caja = new THREE.Box3().setFromObject(modelo)
    const centro = caja.getCenter(new THREE.Vector3())
    modelo.position.set(-centro.x, -centro.y, -centro.z)
    modelo.updateMatrixWorld(true)

    const centrada = new THREE.Box3().setFromObject(modelo)

    return {
      modelo,
      minY: centrada.min.y,
      maxY: centrada.max.y,
    }
  }, [scene])
}

function Iluminacion() {
  return (
    <>
      <ambientLight intensity={0.32} />
      <directionalLight
        position={[300, 450, 320]}
        intensity={2}
        color={LUCES.clave}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-360}
        shadow-camera-right={360}
        shadow-camera-top={360}
        shadow-camera-bottom={-360}
        shadow-camera-near={1}
        shadow-camera-far={1800}
        shadow-bias={-0.0005}
      />
      <directionalLight
        position={[-340, 200, -140]}
        intensity={0.55}
        color={LUCES.relleno}
      />
      <directionalLight
        position={[0, 240, -460]}
        intensity={1.5}
        color={LUCES.contorno}
      />
      <Environment resolution={256} environmentIntensity={0.24}>
        <Lightformer
          form="rect"
          intensity={3}
          position={[0, 4, -6]}
          scale={[10, 6, 1]}
          target={[0, 0, 0]}
        />
        <Lightformer
          form="rect"
          intensity={1.4}
          position={[-5, 2, 2]}
          scale={[3, 5, 1]}
          rotation-y={Math.PI / 2}
          target={[0, 0, 0]}
        />
        <Lightformer
          form="rect"
          intensity={1}
          position={[5, 1, 2]}
          scale={[3, 5, 1]}
          rotation-y={-Math.PI / 2}
          target={[0, 0, 0]}
        />
        <Lightformer
          form="ring"
          intensity={1.6}
          position={[0, 6, 1]}
          scale={4}
          rotation-x={Math.PI / 2}
          target={[0, 0, 0]}
        />
      </Environment>
    </>
  )
}

function RecorteActivo() {
  const gl = useThree((estado) => estado.gl)

  useEffect(() => {
    // El renderer de Three.js necesita el recorte local para el plano de corte.
    // oxlint-disable-next-line react/immutability
    gl.localClippingEnabled = true
    return () => {
      // oxlint-disable-next-line react/immutability
      gl.localClippingEnabled = false
    }
  }, [gl])

  return null
}

type EscenaProps = {
  progreso: RefObject<number>
  /** Portada estática: sin giro ni pulsos cuando el usuario pide menos movimiento. */
  estatico?: boolean
}

function Escena({ progreso, estatico = false }: EscenaProps) {
  const { modelo, minY, maxY } = useModeloMando()
  const camara = useThree((estado) => estado.camera)

  const grupoMando = useRef<THREE.Group>(null)
  const grupoGiro = useRef<THREE.Group>(null)
  const grupoDock = useRef<THREE.Group>(null)
  const giro = useRef(-0.35)
  const objetivoActual = useRef(new THREE.Vector3(...VISTAS[0].objetivo))
  const camaraDeseada = useRef(new THREE.Vector3())
  const objetivoDeseado = useRef(new THREE.Vector3())

  const plano = useMemo(
    () => new THREE.Plane(new THREE.Vector3(0, -1, 0), 100000),
    [],
  )

  const material = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: PALETA.controller,
        roughness: 0.66,
        metalness: 0.02,
        side: THREE.DoubleSide,
        clippingPlanes: [plano],
        clipShadows: true,
      }),
    [plano],
  )

  useLayoutEffect(() => {
    modelo.traverse((hijo) => {
      if (hijo instanceof THREE.Mesh) hijo.material = material
    })
  }, [modelo, material])

  useEffect(() => {
    return () => material.dispose()
  }, [material])

  useFrame((estado, delta) => {
    const p = limitar(progreso.current)
    const tiempo = estado.clock.elapsedTime

    // La cámara se posa en cinco planos y se desplaza entre ellos con la
    // misma curva que el relato de scroll.
    const fase = limitar(p * 5 - 0.5, 0, 4)
    const indice = Math.min(VISTAS.length - 2, Math.floor(fase))
    const mezcla = suavizar(limitar((fase - indice - 0.28) / 0.72))
    const desde = VISTAS[indice]
    const hasta = VISTAS[indice + 1]

    camaraDeseada.current.set(
      THREE.MathUtils.lerp(desde.camara[0], hasta.camara[0], mezcla),
      THREE.MathUtils.lerp(desde.camara[1], hasta.camara[1], mezcla),
      THREE.MathUtils.lerp(desde.camara[2], hasta.camara[2], mezcla),
    )
    objetivoDeseado.current.set(
      THREE.MathUtils.lerp(desde.objetivo[0], hasta.objetivo[0], mezcla),
      THREE.MathUtils.lerp(desde.objetivo[1], hasta.objetivo[1], mezcla),
      THREE.MathUtils.lerp(desde.objetivo[2], hasta.objetivo[2], mezcla),
    )

    const amortiguacion = 1 - Math.exp(-delta * 3.2)
    camara.position.lerp(camaraDeseada.current, amortiguacion)
    objetivoActual.current.lerp(objetivoDeseado.current, amortiguacion)
    camara.lookAt(objetivoActual.current)

    if (grupoGiro.current) {
      if (estatico) {
        grupoGiro.current.rotation.y = -0.35
      } else {
        // Cinco velocidades: contemplación, detalle, corte, alambre y encaje.
        if (p > 0.8) {
          giro.current += (0 - giro.current) * (1 - Math.exp(-delta * 2.6))
        } else {
          const velocidad =
            p < 0.2 ? 0.16 : p < 0.4 ? 0.1 : p < 0.6 ? 0.04 : 0.22
          giro.current += delta * velocidad
        }

        grupoGiro.current.rotation.y =
          giro.current + Math.sin(tiempo * 0.22) * 0.015
      }
    }

    // Recorte: el plano atraviesa el mando de arriba abajo durante la escena 3.
    const enCorte = p >= 0.4 && p < 0.6
    if (enCorte) {
      const avance = suavizar((p - 0.4) / 0.2)
      // El plano de recorte es un objeto mutable de Three.js por diseño.
      // oxlint-disable-next-line react/immutability
      plano.constant = THREE.MathUtils.lerp(maxY + 2, minY - 2, avance)
    } else {
      // oxlint-disable-next-line react/immutability
      plano.constant = 100000
    }

    // Alambre: la estructura sustituye al material durante la escena 4.
    const alambre = p >= 0.6 && p < 0.82
    if (material.wireframe !== alambre) {
      // El material se reutiliza entre frames; mutarlo evita recrear la escena.
      // oxlint-disable-next-line react/immutability
      material.wireframe = alambre
      material.color.set(alambre ? PALETA.text : PALETA.controller)
      material.roughness = alambre ? 1 : 0.66
    }

    // El dock entra desde abajo y el mando se asienta sobre él.
    const encaje = suavizar(limitar((p - 0.79) / 0.15))

    if (grupoDock.current) {
      grupoDock.current.visible = encaje > 0.002
      grupoDock.current.position.y = -DOCK_ALTO * (1 - encaje)
      grupoDock.current.scale.setScalar(0.94 + encaje * 0.06)
    }

    if (grupoMando.current) {
      grupoMando.current.position.y = DOCK_ALTO * encaje
    }
  })

  return (
    <>
      <Iluminacion />
      <RecorteActivo />

      <group ref={grupoDock} visible={false}>
        <RoundedBox
          args={[272, DOCK_ALTO, 192]}
          radius={2}
          smoothness={3}
          position={[0, DOCK_ALTO / 2, 0]}
          castShadow
          receiveShadow
        >
          <meshStandardMaterial
            color={PALETA.graphite}
            roughness={0.64}
            metalness={0.02}
          />
        </RoundedBox>

        <mesh
          position={[0, DOCK_ALTO - 0.4, 0]}
          rotation={[-Math.PI / 2, 0, 0]}
          receiveShadow
        >
          <planeGeometry args={[226, 148]} />
          <meshStandardMaterial color={PALETA.puck} roughness={0.95} />
        </mesh>
      </group>

      <group ref={grupoMando}>
        <group ref={grupoGiro}>
          <primitive object={modelo} position={[0, -minY, 0]} />
        </group>
      </group>

      <ContactShadows
        position={[0, -0.2, 0]}
        opacity={0.55}
        scale={720}
        blur={3}
        far={320}
        resolution={512}
        smooth
        color={PALETA.sombra}
      />
    </>
  )
}

type EscenaInicioProps = {
  progreso: RefObject<number>
  estatico?: boolean
}

/**
 * Escena de portada: mando único sobre papel, cámara de estudio y cinco
 * estados que acompañan al scroll. Sin órbitas: el relato manda la cámara.
 */
export default function EscenaInicio({
  progreso,
  estatico = false,
}: EscenaInicioProps) {
  return (
    <div className="inicio__canvas" aria-hidden="true">
      <Canvas
        shadows="soft"
        dpr={[1, 2]}
        camera={{
          position: VISTAS[0].camara,
          fov: 38,
          near: 1,
          far: 5000,
        }}
      >
        <color attach="background" args={[PALETA.bg]} />
        <Suspense fallback={null}>
          <Escena progreso={progreso} estatico={estatico} />
        </Suspense>
      </Canvas>
    </div>
  )
}

useGLTF.preload(MANDO_URL)
