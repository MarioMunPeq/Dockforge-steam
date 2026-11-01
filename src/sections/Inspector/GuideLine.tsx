import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

export type PuntoPantalla = {
  x: number
  y: number
}

type GuideLineProps = {
  /** Posición local del hotspot activo, en coordenadas del modelo. */
  posicion: [number, number, number] | null
  /** Solo proyecta cuando hay una zona seleccionada. */
  activa: boolean
  onProyectar: (punto: PuntoPantalla | null) => void
}

/**
 * Proyecta el hotspot seleccionado a coordenadas de pantalla cada frame.
 * El Inspector usa esas coordenadas para dibujar la línea guía en SVG y para
 * colocar el foco que atenúa el resto del mando.
 */
export default function GuideLine({
  posicion,
  activa,
  onProyectar,
}: GuideLineProps) {
  const grupo = useRef<THREE.Group>(null)
  const mundo = useRef(new THREE.Vector3())
  const vista = useRef(new THREE.Vector3())
  const visible = useRef(false)

  useFrame((estado) => {
    if (!activa || !posicion || !grupo.current) {
      if (visible.current) {
        visible.current = false
        onProyectar(null)
      }
      return
    }

    grupo.current.getWorldPosition(mundo.current)

    // Descartamos los puntos que quedan detrás de la cámara: la proyección
    // en perspectiva los enviaría al lado opuesto de la pantalla.
    vista.current
      .copy(mundo.current)
      .applyMatrix4(estado.camera.matrixWorldInverse)
    if (vista.current.z > -1) {
      if (visible.current) {
        visible.current = false
        onProyectar(null)
      }
      return
    }

    mundo.current.project(estado.camera)

    const punto: PuntoPantalla = {
      x: (mundo.current.x * 0.5 + 0.5) * estado.size.width,
      y: (-mundo.current.y * 0.5 + 0.5) * estado.size.height,
    }

    visible.current = true
    onProyectar(punto)
  })

  return <group ref={grupo} position={posicion ?? [0, 0, 0]} />
}
