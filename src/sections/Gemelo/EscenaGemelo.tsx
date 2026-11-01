import { useMemo, useRef } from 'react'
import { Billboard } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import Mando3D from '../../components/Mando3D'
import StudioScene from '../../components/StudioScene'
import { PALETA } from '../../lib/palette'
import {
  ZONAS,
  obtenerZona,
  vistasDisponibles,
  type VistaEje,
  type ZonaMando,
} from './mapeo'
import type { MandoLectura } from './useGamepad'

type EscenaGemeloProps = {
  mando: MandoLectura | null
}

const ACCENT = PALETA.accent

type ControlBrilloProps = {
  zona: ZonaMando
  fuerza: number
}

/** Marca técnica sobre un control: aro naranja y disco tenue. Sin brillos. */
function ControlBrillo({ zona, fuerza }: ControlBrilloProps) {
  const grupo = useRef<THREE.Group>(null)
  const disco = useRef<THREE.MeshBasicMaterial>(null)
  const anillo = useRef<THREE.MeshBasicMaterial>(null)
  const suave = useRef(0)

  useFrame((estado, delta) => {
    const suavizado = 1 - Math.exp(-delta * 12)
    suave.current += (fuerza - suave.current) * suavizado

    const intensidad = suave.current
    const pulso = 0.5 + 0.5 * Math.sin(estado.clock.elapsedTime * 4 + zona.posicion[0])

    if (grupo.current) {
      const escala = 1 + intensidad * 0.16 * pulso
      grupo.current.scale.setScalar(escala)
    }

    if (disco.current) {
      disco.current.opacity = intensidad * 0.18
    }

    if (anillo.current) {
      anillo.current.opacity = intensidad * 0.9
    }
  })

  return (
    <group
      ref={grupo}
      position={[zona.posicion[0], zona.posicion[1] + 2.4, zona.posicion[2]]}
    >
      <Billboard>
        <mesh raycast={() => null} renderOrder={10}>
          <circleGeometry args={[zona.radio * 1.5, 40]} />
          <meshBasicMaterial
            ref={disco}
            color={ACCENT}
            transparent
            opacity={0.05}
            depthTest={false}
            depthWrite={false}
            toneMapped={false}
          />
        </mesh>

        <mesh raycast={() => null} renderOrder={11}>
          <ringGeometry args={[zona.radio * 1.04, zona.radio * 1.16, 48]} />
          <meshBasicMaterial
            ref={anillo}
            color={ACCENT}
            transparent
            opacity={0.2}
            side={THREE.DoubleSide}
            depthTest={false}
            depthWrite={false}
            toneMapped={false}
          />
        </mesh>
      </Billboard>
    </group>
  )
}

type ControlEjesProps = {
  vista: VistaEje
  zona: ZonaMando
  ejes: number[]
}

/** Stick o cursor de trackpad que sigue los ejes del mando. */
function ControlEjes({ vista, zona, ejes }: ControlEjesProps) {
  const grupo = useRef<THREE.Group>(null)
  const anillo = useRef<THREE.MeshBasicMaterial>(null)
  const suave = useRef({ x: 0, y: 0 })

  const valorX = ejes[vista.ejes[0]] ?? 0
  const valorY = ejes[vista.ejes[1]] ?? 0
  const signoY = vista.invertirY ? -1 : 1

  useFrame((_, delta) => {
    const suavizado = 1 - Math.exp(-delta * 15)

    suave.current.x += (valorX - suave.current.x) * suavizado
    suave.current.y += (valorY - suave.current.y) * suavizado

    if (grupo.current) {
      grupo.current.position.x =
        zona.posicion[0] + suave.current.x * vista.recorrido
      grupo.current.position.z =
        zona.posicion[2] + suave.current.y * signoY * vista.recorrido
    }

    if (anillo.current) {
      const desvio = Math.min(1, Math.hypot(suave.current.x, suave.current.y))
      anillo.current.opacity = 0.2 + desvio * 0.4
    }
  })

  return (
    <>
      {/* Aro fijo: marca el recorrido máximo del control. */}
      <mesh
        position={zona.posicion}
        rotation={[-Math.PI / 2, 0, 0]}
        raycast={() => null}
      >
        <ringGeometry args={[zona.radio * 0.9, zona.radio, 48]} />
        <meshBasicMaterial
          ref={anillo}
          color={ACCENT}
          transparent
          opacity={0.24}
          depthWrite={false}
          side={THREE.DoubleSide}
          toneMapped={false}
        />
      </mesh>

      {/* Grupo móvil: tapa del stick o cursor del trackpad. */}
      <group ref={grupo} position={zona.posicion}>
        {vista.tipo === 'stick' ? (
          <mesh position={[0, 1.5, 0]} raycast={() => null}>
            <cylinderGeometry
              args={[vista.radioVisual, vista.radioVisual * 0.94, 2, 36]}
            />
            <meshStandardMaterial
              color={PALETA.controller}
              roughness={0.62}
              metalness={0.04}
            />
          </mesh>
        ) : (
          <mesh
            position={[0, 1.2, 0]}
            rotation={[-Math.PI / 2, 0, 0]}
            raycast={() => null}
          >
            <circleGeometry args={[vista.radioVisual, 32]} />
            <meshBasicMaterial
              color={ACCENT}
              transparent
              opacity={0.9}
              depthWrite={false}
              toneMapped={false}
            />
          </mesh>
        )}

        {vista.tipo === 'stick' && (
          <mesh
            position={[0, 2.6, 0]}
            rotation={[-Math.PI / 2, 0, 0]}
            raycast={() => null}
          >
            <ringGeometry
              args={[vista.radioVisual * 0.62, vista.radioVisual * 0.74, 32]}
            />
            <meshBasicMaterial
              color={ACCENT}
              transparent
              opacity={0.9}
              side={THREE.DoubleSide}
              depthWrite={false}
              toneMapped={false}
            />
          </mesh>
        )}
      </group>
    </>
  )
}

/** Escena 3D del gemelo: mando, marcas de botones y sticks animados. */
export default function EscenaGemelo({ mando }: EscenaGemeloProps) {
  const fuerzas = useMemo(() => {
    const mapa = new Map<string, number>()

    for (const zona of ZONAS) {
      let fuerza = 0

      if (mando) {
        for (const indice of zona.botones) {
          const boton = mando.buttons[indice]
          if (!boton) continue

          const valor = boton.pressed
            ? Math.max(0.7, boton.value)
            : boton.value

          if (valor > fuerza) fuerza = valor
        }
      }

      mapa.set(zona.id, Math.min(1, fuerza))
    }

    return mapa
  }, [mando])

  const totalEjes = mando?.axes.length ?? 4
  const vistas = useMemo(() => vistasDisponibles(totalEjes), [totalEjes])

  return (
    <StudioScene
      cameraPosition={[240, 180, 280]}
      target={[0, 35, 0]}
      grid={false}
      contactShadowScale={480}
    >
      <Mando3D color={PALETA.controller} rotacion={[0.18, -0.6, 0]}>
        {ZONAS.map((zona) => (
          <ControlBrillo
            key={zona.id}
            zona={zona}
            fuerza={fuerzas.get(zona.id) ?? 0}
          />
        ))}

        {mando &&
          vistas.map((vista) => {
            const zona = obtenerZona(vista.zonaId)
            if (!zona) return null

            return (
              <ControlEjes
                key={vista.id}
                vista={vista}
                zona={zona}
                ejes={mando.axes}
              />
            )
          })}
      </Mando3D>
    </StudioScene>
  )
}
