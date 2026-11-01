import * as THREE from 'three'
import { TextGeometry } from 'three/examples/jsm/geometries/TextGeometry.js'
import type { Font } from 'three/examples/jsm/loaders/FontLoader.js'
import type { TextParams } from './dockParams'

export type TextoExtruidoParams = Pick<
  TextParams,
  'texto' | 'textoTamano' | 'textoRelieve'
>

/**
 * Crea el texto extruido tumbado sobre el plano XZ.
 * La geometría queda centrada en X/Z y con su cara inferior en y = 0.
 */
export function crearTextoExtruido(
  font: Font,
  params: TextoExtruidoParams,
): THREE.BufferGeometry | null {
  const texto = params.texto.replace(/\s+/g, ' ').trim()
  if (!texto) return null

  const geometry = new TextGeometry(texto, {
    font,
    size: params.textoTamano,
    depth: params.textoRelieve,
    curveSegments: 6,
    bevelEnabled: true,
    bevelThickness: Math.min(0.16, params.textoRelieve * 0.25),
    bevelSize: Math.min(0.14, params.textoTamano * 0.018),
    bevelSegments: 2,
  })

  // El texto nace en XY y se extruye hacia +Z. Lo tumbamos sobre XZ.
  geometry.rotateX(-Math.PI / 2)
  geometry.computeBoundingBox()

  const caja = geometry.boundingBox
  if (caja) {
    geometry.translate(
      -(caja.min.x + caja.max.x) / 2,
      -caja.min.y,
      -(caja.min.z + caja.max.z) / 2,
    )
  }

  geometry.computeBoundingBox()
  geometry.computeBoundingSphere()
  return geometry
}
