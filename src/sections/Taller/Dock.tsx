import { RoundedBox } from '@react-three/drei'
import * as THREE from 'three'
import type { BufferGeometry } from 'three'
import { PALETA } from '../../lib/palette'
import type { DockParams, VistaTaller } from './dockParams'

type DockProps = {
  params: DockParams
  /** Geometría ya rebajada por CSG. Si falta, se muestra la caja base. */
  geometry?: BufferGeometry | null
  modo: VistaTaller
  planoSeccion: THREE.Plane
}

/**
 * Base del dock: una caja con aristas redondeadas apoyada en el suelo
 * (y = 0). La cara superior queda en y = grosor.
 */
export default function Dock({
  params,
  geometry,
  modo,
  planoSeccion,
}: DockProps) {
  const { ancho, fondo, grosor, redondeo } = params

  const radio = Math.min(
    Math.max(0, redondeo),
    grosor / 2 - 0.02,
    ancho / 2 - 0.02,
    fondo / 2 - 0.02,
  )
  const recorte = modo === 'seccion' ? [planoSeccion] : []

  const material = (
    <meshPhysicalMaterial
      color={modo === 'medidas' ? PALETA.graphiteLight : PALETA.graphite}
      roughness={0.66}
      metalness={0.02}
      clearcoat={0.05}
      clearcoatRoughness={0.85}
      transparent={false}
      opacity={1}
      depthWrite
      depthTest
      clippingPlanes={recorte}
      clipShadows={modo === 'seccion'}
      side={THREE.DoubleSide}
    />
  )

  if (geometry) {
    return (
      <mesh geometry={geometry} castShadow receiveShadow>
        {material}
      </mesh>
    )
  }

  return (
    <group>
      {radio > 0.05 ? (
        <RoundedBox
          args={[ancho, grosor, fondo]}
          radius={radio}
          smoothness={4}
          position={[0, grosor / 2, 0]}
          castShadow
          receiveShadow
        >
          {material}
        </RoundedBox>
      ) : (
        <mesh position={[0, grosor / 2, 0]} castShadow receiveShadow>
          <boxGeometry args={[ancho, grosor, fondo]} />
          {material}
        </mesh>
      )}
    </group>
  )
}
