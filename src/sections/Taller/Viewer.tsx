import { useEffect, useMemo } from 'react'
import { Html, Line } from '@react-three/drei'
import { useThree } from '@react-three/fiber'
import * as THREE from 'three'
import StudioScene from '../../components/StudioScene'
import Dock from './Dock'
import {
  calcularAjustesPuck,
  type PresetId,
  type TallerParams,
  type VistaTaller,
} from './dockParams'
import {
  PATA_RADIO,
  altoConMando,
  posicionesPatas,
  type ColocacionPuck,
} from './layout'
import type { MandoSource } from './mandoSource'
import type { PuckSource } from './puckSource'

type ViewerProps = {
  params: TallerParams
  /** Parámetros en vivo: el texto responde mientras se escribe. */
  paramsTexto: TallerParams
  base: THREE.BufferGeometry | null
  texto: THREE.BufferGeometry | null
  mando: MandoSource | null
  puck: PuckSource | null
  colocacionPuck: ColocacionPuck | null
  placementY: number
  modo: VistaTaller
}

const ENCUADRES: Record<
  PresetId,
  { camara: [number, number, number]; objetivo: [number, number, number] }
> = {
  sobremesa: { camara: [300, 260, 350], objetivo: [0, 45, 0] },
  vertical: { camara: [340, 310, 390], objetivo: [0, 78, 0] },
  carga: { camara: [310, 270, 350], objetivo: [0, 60, 0] },
}

function ActivarClipping() {
  const gl = useThree((estado) => estado.gl)

  useEffect(() => {
    // gl es el renderer de Three.js: el clipping local se activa a propósito.
    // oxlint-disable-next-line react/immutability
    gl.localClippingEnabled = true
    return () => {
      // oxlint-disable-next-line react/immutability
      gl.localClippingEnabled = false
    }
  }, [gl])

  return null
}

function Encuadre({ preset }: { preset: PresetId }) {
  const camera = useThree((estado) => estado.camera)
  const controls = useThree((estado) => estado.controls) as unknown as {
    target: THREE.Vector3
    update: () => void
  } | null

  useEffect(() => {
    const encuadre = ENCUADRES[preset]
    camera.position.set(...encuadre.camara)
    if (controls) {
      // OrbitControls es un objeto externo de Three.js: su target se modifica
      // a propósito para encuadrar cada preset.
      // oxlint-disable-next-line react/immutability
      controls.target.set(...encuadre.objetivo)
      controls.update()
    }
  }, [preset, camera, controls])

  return null
}

function altoDelConjunto(
  mando: MandoSource | null,
  placementY: number,
  inclinacion: number,
) {
  if (!mando) return placementY
  return altoConMando(mando.geometry.boundingBox, placementY, inclinacion)
}

function Medidas({
  params,
  altoTotal,
}: {
  params: TallerParams
  altoTotal: number
}) {
  const y = 0.8
  const margen = 14
  const zLinea = -params.fondo / 2 - margen
  const xLinea = params.ancho / 2 + margen
  const xEsquina = -params.ancho / 2 - margen
  const zEsquina = params.fondo / 2 + margen
  const ancho = Math.round(params.ancho)
  const fondo = Math.round(params.fondo)
  const alto = Math.round(altoTotal)

  return (
    <group>
      {/* Ancho */}
      <Line
        points={[
          [-params.ancho / 2, y, zLinea],
          [params.ancho / 2, y, zLinea],
        ]}
        color="#8fb4ff"
        lineWidth={1}
      />
      <Line
        points={[
          [-params.ancho / 2, y, zLinea - 3],
          [-params.ancho / 2, y, zLinea + 3],
        ]}
        color="#8fb4ff"
        lineWidth={1}
      />
      <Line
        points={[
          [params.ancho / 2, y, zLinea - 3],
          [params.ancho / 2, y, zLinea + 3],
        ]}
        color="#8fb4ff"
        lineWidth={1}
      />
      <Html
        position={[0, y, zLinea - 7]}
        center
        className="taller__medida"
      >
        {ancho} mm
      </Html>

      {/* Fondo */}
      <Line
        points={[
          [xLinea, y, -params.fondo / 2],
          [xLinea, y, params.fondo / 2],
        ]}
        color="#8fb4ff"
        lineWidth={1}
      />
      <Line
        points={[
          [xLinea - 3, y, -params.fondo / 2],
          [xLinea + 3, y, -params.fondo / 2],
        ]}
        color="#8fb4ff"
        lineWidth={1}
      />
      <Line
        points={[
          [xLinea - 3, y, params.fondo / 2],
          [xLinea + 3, y, params.fondo / 2],
        ]}
        color="#8fb4ff"
        lineWidth={1}
      />
      <Html
        position={[xLinea + 9, y, 0]}
        center
        className="taller__medida"
      >
        {fondo} mm
      </Html>

      {/* Altura total, incluyendo el mando */}
      <Line
        points={[
          [xEsquina, 0, zEsquina],
          [xEsquina, altoTotal, zEsquina],
        ]}
        color="#8fb4ff"
        lineWidth={1}
      />
      <Line
        points={[
          [xEsquina - 3, 0, zEsquina],
          [xEsquina + 3, 0, zEsquina],
        ]}
        color="#8fb4ff"
        lineWidth={1}
      />
      <Line
        points={[
          [xEsquina - 3, altoTotal, zEsquina],
          [xEsquina + 3, altoTotal, zEsquina],
        ]}
        color="#8fb4ff"
        lineWidth={1}
      />
      <Html
        position={[xEsquina - 8, altoTotal / 2, zEsquina]}
        center
        className="taller__medida"
      >
        {alto} mm
      </Html>
    </group>
  )
}

/** Visor del taller: base rebajada, mando, puck, patas y texto. */
export default function Viewer({
  params,
  paramsTexto,
  base,
  texto,
  mando,
  puck,
  colocacionPuck,
  placementY,
  modo,
}: ViewerProps) {
  const inclinacion = THREE.MathUtils.degToRad(params.inclinacion)
  const rotacionTexto = THREE.MathUtils.degToRad(paramsTexto.textoRotacion)
  const planoSeccion = useMemo(
    () => new THREE.Plane(new THREE.Vector3(0, 0, -1), 0),
    [],
  )
  const recorte = modo === 'seccion' ? [planoSeccion] : []
  const ajustesPuck = calcularAjustesPuck(params)
  const altoTotal = altoDelConjunto(mando, placementY, params.inclinacion)

  return (
    <>
      <StudioScene
        cameraPosition={[300, 260, 350]}
        target={[0, 45, 0]}
        grid={modo === 'medidas'}
        contactShadowScale={760}
      >
        <ActivarClipping />
        <Encuadre preset={params.preset} />

        <Dock
          params={params}
          geometry={base}
          modo={modo}
          planoSeccion={planoSeccion}
        />

        {mando && (
          <mesh
            geometry={mando.geometry}
            position={[0, placementY, 0]}
            rotation={[inclinacion, 0, 0]}
            castShadow
            receiveShadow
          >
            <meshPhysicalMaterial
              color="#d6dae2"
              roughness={0.55}
              metalness={0.05}
              clearcoat={0.25}
              clearcoatRoughness={0.65}
              envMapIntensity={0.9}
              clippingPlanes={recorte}
              clipShadows={modo === 'seccion'}
              side={modo === 'seccion' ? THREE.DoubleSide : THREE.FrontSide}
            />
          </mesh>
        )}

        {params.puckActivo && puck && colocacionPuck && (
          <mesh
            geometry={puck.geometry}
            position={[
              colocacionPuck.x,
              params.grosor - ajustesPuck.profundidad,
              colocacionPuck.z,
            ]}
            castShadow
            receiveShadow
          >
            <meshPhysicalMaterial
              color="#a8794d"
              roughness={0.42}
              metalness={0.3}
              clearcoat={0.3}
              clearcoatRoughness={0.5}
              clippingPlanes={recorte}
              clipShadows={modo === 'seccion'}
              side={modo === 'seccion' ? THREE.DoubleSide : THREE.FrontSide}
            />
          </mesh>
        )}

        {params.patas &&
          posicionesPatas(params.ancho, params.fondo).map(([x, z]) => (
            <mesh
              key={`${x}-${z}`}
              position={[x, 0.8, z]}
              castShadow
              receiveShadow
            >
              <cylinderGeometry args={[PATA_RADIO - 0.3, PATA_RADIO - 0.3, 1.6, 24]} />
              <meshStandardMaterial
                color="#0d1017"
                roughness={0.95}
                metalness={0}
                clippingPlanes={recorte}
                side={modo === 'seccion' ? THREE.DoubleSide : THREE.FrontSide}
              />
            </mesh>
          ))}

        {texto && (
          <mesh
            geometry={texto}
            position={[
              paramsTexto.textoX,
              params.grosor - 0.15,
              paramsTexto.textoZ,
            ]}
            rotation={[0, rotacionTexto, 0]}
            castShadow
            receiveShadow
          >
            <meshStandardMaterial
              color="#8fb4ff"
              roughness={0.32}
              metalness={0.45}
              clippingPlanes={recorte}
              side={modo === 'seccion' ? THREE.DoubleSide : THREE.FrontSide}
            />
          </mesh>
        )}

        {modo === 'medidas' && (
          <Medidas params={params} altoTotal={altoTotal} />
        )}
      </StudioScene>

      {modo === 'medidas' && (
        <div className="taller__measure-legend" aria-hidden="true">
          <span className="taller__measure-swatch" />
          Rejilla de 10 mm · trazo grueso cada 50 mm
        </div>
      )}
    </>
  )
}
