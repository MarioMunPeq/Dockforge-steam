import { useEffect, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { PALETA } from '../../lib/palette'
import type { GrupoZona, ZonaMando } from '../../data/zones'

type HotspotProps = {
  zona: ZonaMando
  activa: boolean
  /** Otra zona está seleccionada: este punto pasa a segundo plano. */
  atenuado: boolean
  onSelect: (zona: ZonaMando) => void
  onHover: (zona: ZonaMando | null) => void
  onReady: (id: string, objeto: THREE.Object3D | null) => void
}

// Normal aproximada de la superficie donde vive cada familia de controles.
// Sirve para atenuar los puntos de la cara opuesta y evitar que se pueda
// pulsar un botón trasero a través del cuerpo del mando.
const NORMALES: Record<GrupoZona, [number, number, number]> = {
  sticks: [0, 1, 0],
  trackpads: [0, 1, 0],
  frontales: [0, 1, 0],
  bumpers: [0, 0.5, -1],
  gatillos: [0, 0.1, -1],
  traseros: [0, -0.85, 0.55],
}

/** Umbral por debajo del cual el punto deja de capturar el puntero. */
const UMBRAL_INTERACCION = 0.25

/**
 * Punto interactivo sobre el modelo. El halo es el área de clic y el punto
 * interior late cuando la zona está seleccionada.
 *
 * En lugar de ocultarse de golpe, el punto se desvanece según el ángulo entre
 * su normal y la cámara: si queda detrás del mando se ve tenue y deja de
 * responder al ratón, pero sigue sirviendo de referencia espacial.
 */
export default function Hotspot({
  zona,
  activa,
  atenuado,
  onSelect,
  onHover,
  onReady,
}: HotspotProps) {
  const grupo = useRef<THREE.Group>(null)
  const visual = useRef<THREE.Group>(null)
  const haloMaterial = useRef<THREE.MeshBasicMaterial>(null)
  const puntoMaterial = useRef<THREE.MeshBasicMaterial>(null)
  const escala = useRef(1)
  const presencia = useRef(1)
  const interactiva = useRef(true)
  const posicionMundo = useRef(new THREE.Vector3())
  const rotacionMundo = useRef(new THREE.Quaternion())
  const normal = useRef(
    new THREE.Vector3(...NORMALES[zona.grupo]).normalize(),
  )
  const normalMundo = useRef(new THREE.Vector3())
  const haciaCamara = useRef(new THREE.Vector3())
  const [hover, setHover] = useState(false)

  // El Inspector guarda una referencia para poder volar a la zona desde la
  // lista lateral, no solo al hacer clic sobre el punto 3D.
  useEffect(() => {
    onReady(zona.id, grupo.current)
    return () => onReady(zona.id, null)
  }, [onReady, zona.id])

  useEffect(() => {
    document.body.style.cursor = hover ? 'pointer' : ''
    return () => {
      document.body.style.cursor = ''
    }
  }, [hover])

  useFrame((estado, delta) => {
    if (!visual.current || !grupo.current) return

    grupo.current.getWorldPosition(posicionMundo.current)
    grupo.current.getWorldQuaternion(rotacionMundo.current)
    haciaCamara.current
      .copy(estado.camera.position)
      .sub(posicionMundo.current)
      .normalize()

    const encarado = normalMundo.current
      .copy(normal.current)
      .applyQuaternion(rotacionMundo.current)
      .dot(haciaCamara.current)

    // 0 = totalmente detrás del mando, 1 = mirando a la cámara.
    const visibilidad = THREE.MathUtils.smoothstep(encarado, -0.15, 0.4)
    presencia.current +=
      (visibilidad - presencia.current) * (1 - Math.exp(-delta * 10))

    const factorAtenuado = atenuado ? 0.42 : 1

    if (haloMaterial.current) {
      const base = activa ? 0.26 : hover ? 0.2 : 0.12
      haloMaterial.current.opacity =
        base * (0.1 + presencia.current * 0.9) * factorAtenuado
    }

    if (puntoMaterial.current) {
      puntoMaterial.current.opacity =
        (0.16 + presencia.current * 0.84) * (atenuado ? 0.55 : 1)
    }

    const pulso = activa
      ? 1.18 + Math.sin(estado.clock.elapsedTime * 4) * 0.07
      : 1
    const cerca = hover ? Math.max(pulso, 1.14) : pulso
    const objetivo =
      cerca *
      (0.82 + presencia.current * 0.18) *
      (atenuado ? 0.88 : 1)

    escala.current += (objetivo - escala.current) * (1 - Math.exp(-delta * 14))
    visual.current.scale.setScalar(escala.current)

    const puedeSenalar = presencia.current > UMBRAL_INTERACCION
    if (puedeSenalar !== interactiva.current) {
      interactiva.current = puedeSenalar
      if (!puedeSenalar) {
        setHover(false)
        onHover(null)
      }
    }
  })

  return (
    <group
      ref={grupo}
      position={zona.posicion}
      onPointerOver={(evento) => {
        if (!interactiva.current) return
        evento.stopPropagation()
        setHover(true)
        onHover(zona)
      }}
      onPointerOut={(evento) => {
        evento.stopPropagation()
        setHover(false)
        onHover(null)
      }}
      onClick={(evento) => {
        if (!interactiva.current) return
        evento.stopPropagation()
        onSelect(zona)
      }}
    >
      <group ref={visual}>
        {/* Halo: también recoge el clic y da una superficie cómoda de pulsar. */}
        <mesh renderOrder={20}>
          <sphereGeometry args={[4, 16, 16]} />
          <meshBasicMaterial
            ref={haloMaterial}
            color={PALETA.accent}
            transparent
            opacity={activa ? 0.22 : 0.12}
            depthTest={false}
            depthWrite={false}
            toneMapped={false}
          />
        </mesh>

        {/* Punto central sólido. */}
        <mesh renderOrder={21}>
          <sphereGeometry args={[1.8, 16, 16]} />
          <meshBasicMaterial
            ref={puntoMaterial}
            color={activa ? PALETA.text : hover ? PALETA.text : PALETA.accent}
            transparent
            opacity={1}
            depthTest={false}
            depthWrite={false}
            toneMapped={false}
          />
        </mesh>
      </group>
    </group>
  )
}
