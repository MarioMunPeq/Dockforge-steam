import { useEffect, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'

export type VueloCamara = {
  id: number
  camara: [number, number, number]
  objetivo: [number, number, number]
  /** Duración del vuelo en segundos. */
  duracion?: number
  /** Altura del arco que describe la cámara, en mm. */
  arco?: number
  /** Desplazamiento lateral del arco, en mm. Da el giro cinematográfico. */
  giro?: number
}

type OrbitControlsLike = {
  target: THREE.Vector3
  enabled: boolean
  update: () => void
}

type Animacion = {
  inicioCamara: THREE.Vector3
  finCamara: THREE.Vector3
  controlCamara: THREE.Vector3
  inicioObjetivo: THREE.Vector3
  finObjetivo: THREE.Vector3
  duracion: number
  progreso: number
}

const DURACION = 0.9

function suavizar(progreso: number) {
  return progreso < 0.5
    ? 4 * progreso * progreso * progreso
    : 1 - Math.pow(-2 * progreso + 2, 3) / 2
}

/**
 * Punto de control de la curva de la cámara. Se separa del eje recto entre el
 * origen y el destino para que el vuelo describa un arco en lugar de una línea.
 */
function calcularControl(
  inicio: THREE.Vector3,
  fin: THREE.Vector3,
  arco: number,
  giro: number,
) {
  const control = inicio.clone().add(fin).multiplyScalar(0.5)

  // Aleja el arco del centro del modelo para no atravesarlo.
  const radial = control.clone()
  if (radial.lengthSq() > 0.001) {
    radial.normalize().multiplyScalar(arco)
    control.add(radial)
  } else {
    control.y += arco
  }

  if (giro !== 0) {
    const direccion = new THREE.Vector3().subVectors(fin, inicio)
    const lateral = new THREE.Vector3(-direccion.z, 0, direccion.x)
    if (lateral.lengthSq() > 0.001) {
      lateral.normalize().multiplyScalar(giro)
      control.add(lateral)
    }
  }

  return control
}

/**
 * Lleva la cámara y el objetivo de OrbitControls hasta la zona seleccionada.
 * Mantiene los controles bloqueados durante el vuelo para que el usuario no
 * luche contra la animación.
 *
 * Con `arco` y `giro` el trayecto se convierte en una curva bezier, que es lo
 * que usa la visita guiada para encadenar planos con sensación de travelling.
 */
export default function CameraFlight({
  vuelo,
}: {
  vuelo: VueloCamara | null
}) {
  const camera = useThree((estado) => estado.camera)
  const controls = useThree(
    (estado) => estado.controls,
  ) as unknown as OrbitControlsLike | null
  const animacion = useRef<Animacion | null>(null)

  useEffect(() => {
    if (!vuelo || !controls) return

    const inicioCamara = camera.position.clone()
    const finCamara = new THREE.Vector3(...vuelo.camara)

    animacion.current = {
      inicioCamara,
      finCamara,
      controlCamara: calcularControl(
        inicioCamara,
        finCamara,
        vuelo.arco ?? 0,
        vuelo.giro ?? 0,
      ),
      inicioObjetivo: controls.target.clone(),
      finObjetivo: new THREE.Vector3(...vuelo.objetivo),
      duracion: Math.max(0.2, vuelo.duracion ?? DURACION),
      progreso: 0,
    }

    // OrbitControls es un objeto externo de Three.js: bloquearlo durante el
    // vuelo es precisamente el objetivo de este efecto.
    // oxlint-disable-next-line react/immutability
    controls.enabled = false
  }, [vuelo, controls, camera])

  // Si la escena se desmonta a mitad de vuelo, devolvemos el control al usuario.
  useEffect(() => {
    return () => {
      if (controls) controls.enabled = true
    }
  }, [controls])

  useFrame((_, delta) => {
    const actual = animacion.current
    if (!actual || !controls) return

    actual.progreso = Math.min(1, actual.progreso + delta / actual.duracion)
    const avance = suavizar(actual.progreso)
    const inverso = 1 - avance

    // Bezier cuadrática: la cámara barre el mando en lugar de cortar en recta.
    camera.position.set(
      inverso * inverso * actual.inicioCamara.x +
        2 * inverso * avance * actual.controlCamara.x +
        avance * avance * actual.finCamara.x,
      inverso * inverso * actual.inicioCamara.y +
        2 * inverso * avance * actual.controlCamara.y +
        avance * avance * actual.finCamara.y,
      inverso * inverso * actual.inicioCamara.z +
        2 * inverso * avance * actual.controlCamara.z +
        avance * avance * actual.finCamara.z,
    )
    controls.target.lerpVectors(
      actual.inicioObjetivo,
      actual.finObjetivo,
      avance,
    )
    controls.update()

    if (actual.progreso >= 1) {
      animacion.current = null
      // oxlint-disable-next-line react/immutability
      controls.enabled = true
    }
  })

  return null
}
