import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import Mando3D from '../../components/Mando3D'
import StudioScene from '../../components/StudioScene'
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

/** Genera una textura de halo suave con núcleo brillante y degradado. */
function crearTexturaBrillo() {
  const tamano = 128
  const lienzo = document.createElement('canvas')
  lienzo.width = tamano
  lienzo.height = tamano
  const contexto = lienzo.getContext('2d')

  if (!contexto) throw new Error('No se pudo crear el lienzo del brillo')

  const centro = tamano / 2
  const degradado = contexto.createRadialGradient(
    centro,
    centro,
    0,
    centro,
    centro,
    centro,
  )

  degradado.addColorStop(0, 'rgba(255, 255, 255, 0.8)')
  degradado.addColorStop(0.18, 'rgba(225, 238, 255, 0.48)')
  degradado.addColorStop(0.44, 'rgba(160, 195, 255, 0.16)')
  degradado.addColorStop(0.75, 'rgba(120, 160, 255, 0.04)')
  degradado.addColorStop(1, 'rgba(120, 160, 255, 0)')

  contexto.fillStyle = degradado
  contexto.fillRect(0, 0, tamano, tamano)

  const textura = new THREE.CanvasTexture(lienzo)
  textura.colorSpace = THREE.SRGBColorSpace
  return textura
}

function useTexturaBrillo() {
  const textura = useMemo(() => crearTexturaBrillo(), [])

  useEffect(() => {
    return () => textura.dispose()
  }, [textura])

  return textura
}

type ControlBrilloProps = {
  zona: ZonaMando
  fuerza: number
  textura: THREE.Texture
}

/** Halo que late sobre un control. `fuerza` va de 0 a 1. */
function ControlBrillo({ zona, fuerza, textura }: ControlBrilloProps) {
  const sprite = useRef<THREE.Sprite>(null)
  const material = useRef<THREE.SpriteMaterial>(null)
  const suave = useRef(0)

  useFrame((estado, delta) => {
    if (!sprite.current) return

    const suavizado = 1 - Math.exp(-delta * 12)
    suave.current += (fuerza - suave.current) * suavizado

    const pulso = 0.5 + 0.5 * Math.sin(estado.clock.elapsedTime * 4.5 + zona.posicion[0])
    const intensidad = suave.current
    const escala = zona.radio * (1.5 + intensidad * (0.9 + pulso * 0.12))

    sprite.current.scale.set(escala, escala, 1)

    if (material.current) {
      material.current.opacity = 0.06 + intensidad * 0.68
    }
  })

  return (
    <sprite
      ref={sprite}
      position={[zona.posicion[0], zona.posicion[1] + 1.6, zona.posicion[2]]}
      renderOrder={10}
    >
      <spriteMaterial
        ref={material}
        map={textura}
        color={zona.color ?? '#7da5ff'}
        transparent
        opacity={0.11}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        toneMapped={false}
      />
    </sprite>
  )
}

type ControlEjesProps = {
  vista: VistaEje
  zona: ZonaMando
  ejes: number[]
  textura: THREE.Texture
}

/** Stick o cursor de trackpad que sigue los ejes del mando. */
function ControlEjes({ vista, zona, ejes, textura }: ControlEjesProps) {
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
      const desvio = Math.min(
        1,
        Math.hypot(suave.current.x, suave.current.y),
      )
      anillo.current.opacity = 0.22 + desvio * 0.28
    }
  })

  return (
    <>
      {/* Aro fijo: marca el recorrido máximo del control. */}
      <mesh position={zona.posicion} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[zona.radio * 0.9, zona.radio, 48]} />
        <meshBasicMaterial
          ref={anillo}
          color={zona.color ?? '#7da5ff'}
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
          <mesh position={[0, 1.5, 0]}>
            <cylinderGeometry
              args={[vista.radioVisual, vista.radioVisual * 0.94, 2, 36]}
            />
            <meshStandardMaterial
              color="#7fa9e8"
              emissive="#2f5fd6"
              emissiveIntensity={0.55}
              transparent
              opacity={0.5}
              roughness={0.25}
              metalness={0.15}
              depthWrite={false}
            />
          </mesh>
        ) : (
          <mesh position={[0, 1.2, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <circleGeometry args={[vista.radioVisual, 32]} />
            <meshBasicMaterial
              color={zona.color ?? '#b794ff'}
              transparent
              opacity={0.8}
              depthWrite={false}
              toneMapped={false}
            />
          </mesh>
        )}

        <sprite
          position={[0, 3.2, 0]}
          scale={[vista.radioVisual * 2.2, vista.radioVisual * 2.2, 1]}
          renderOrder={11}
        >
          <spriteMaterial
            map={textura}
            color={zona.color ?? '#7da5ff'}
            transparent
            opacity={0.22}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
            toneMapped={false}
          />
        </sprite>
      </group>
    </>
  )
}

/** Escena 3D del gemelo: mando, brillos de botones y sticks animados. */
export default function EscenaGemelo({ mando }: EscenaGemeloProps) {
  const textura = useTexturaBrillo()

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
      contactShadowScale={480}
    >
      <Mando3D color="#c4cfdf" rotacion={[0.18, -0.6, 0]}>
        {ZONAS.map((zona) => (
          <ControlBrillo
            key={zona.id}
            zona={zona}
            fuerza={fuerzas.get(zona.id) ?? 0}
            textura={textura}
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
                textura={textura}
              />
            )
          })}
      </Mando3D>
    </StudioScene>
  )
}
