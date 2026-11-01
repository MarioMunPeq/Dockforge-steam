import type { Box3 } from 'three'
import type { DockParams } from './dockParams'
export type ColocacionPuck = {
  /** Centro del hueco del puck en coordenadas de la base. */
  x: number
  z: number
  radioX: number
  radioZ: number
}

/** Radios de las patas y separación desde las esquinas de la base. */
export const PATA_RADIO = 6.5
export const PATA_PROFUNDIDAD = 1.8
export const PATA_MARGEN = 18

/**
 * Distribuye el puck alrededor del mando. La distancia se mide entre el borde
 * del mando y el borde del hueco, no entre centros.
 */
export function calcularColocacionPuck(
  params: DockParams,
  cajaMando: Box3,
  cajaPuck: Box3,
): ColocacionPuck | null {
  if (!params.puckActivo) return null

  const mitadMandoX = (cajaMando.max.x - cajaMando.min.x) / 2
  const mitadMandoZ = (cajaMando.max.z - cajaMando.min.z) / 2
  const radioX = (cajaPuck.max.x - cajaPuck.min.x) / 2
  const radioZ = (cajaPuck.max.z - cajaPuck.min.z) / 2
  const distancia = Math.max(0, params.puckDistancia)

  if (params.puckPosicion === 'izquierda') {
    return {
      x: -(mitadMandoX + distancia + radioX),
      z: 0,
      radioX,
      radioZ,
    }
  }

  if (params.puckPosicion === 'derecha') {
    return {
      x: mitadMandoX + distancia + radioX,
      z: 0,
      radioX,
      radioZ,
    }
  }

  return {
    x: 0,
    z: -(mitadMandoZ + distancia + radioZ),
    radioX,
    radioZ,
  }
}

/** Centros de las cuatro patas, en coordenadas de la base. */
export function posicionesPatas(
  ancho: number,
  fondo: number,
): [number, number][] {
  const x = Math.max(0, ancho / 2 - PATA_MARGEN)
  const z = Math.max(0, fondo / 2 - PATA_MARGEN)
  return [
    [-x, -z],
    [x, -z],
    [-x, z],
    [x, z],
  ]
}

/**
 * Altura total del conjunto: base + mando girado. Se calcula con las ocho
 * esquinas de la caja del mando para no depender de la malla completa.
 */
export function altoConMando(
  cajaMando: Box3 | null,
  placementY: number,
  inclinacion: number,
): number {
  if (!cajaMando) return placementY

  const coseno = Math.cos((inclinacion * Math.PI) / 180)
  const seno = Math.sin((inclinacion * Math.PI) / 180)
  let maximo = -Infinity

  for (const y of [cajaMando.min.y, cajaMando.max.y]) {
    for (const z of [cajaMando.min.z, cajaMando.max.z]) {
      const yRotada = y * coseno - z * seno
      if (yRotada > maximo) maximo = yRotada
    }
  }

  return Number.isFinite(maximo) ? placementY + maximo : placementY
}
