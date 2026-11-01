import * as THREE from 'three'
import { STLExporter } from 'three/examples/jsm/exporters/STLExporter.js'
import type { TallerParams } from './dockParams'

/** Nombre de archivo estable y descriptivo, sin acentos ni espacios. */
export function nombreArchivo(params: TallerParams) {
  const ancho = Math.round(params.ancho)
  const fondo = Math.round(params.fondo)
  const grosor = Math.round(params.grosor)
  const puck = params.puckActivo ? `puck-${params.puckPosicion}` : 'sin-puck'

  return `dock-forge-${params.preset}-${ancho}x${fondo}x${grosor}mm-${puck}.stl`
}

/**
 * Exporta la base (ya con huecos, canal y alojamientos) y el texto como un
 * STL binario. La escena está en milímetros, así que conserva esa escala.
 */
export function exportarSTL(
  base: THREE.BufferGeometry,
  texto: THREE.BufferGeometry | null,
  params: TallerParams,
) {
  const escena = new THREE.Scene()

  const baseMesh = new THREE.Mesh(base)
  baseMesh.name = 'base'
  escena.add(baseMesh)

  if (texto) {
    const textoMesh = new THREE.Mesh(texto)
    textoMesh.name = 'texto'
    textoMesh.position.set(
      params.textoX,
      params.grosor - 0.15,
      params.textoZ,
    )
    textoMesh.rotation.y = THREE.MathUtils.degToRad(params.textoRotacion)
    escena.add(textoMesh)
  }

  escena.updateMatrixWorld(true)

  const datos = new STLExporter().parse(escena, { binary: true })
  const blob = new Blob([datos], { type: 'model/stl' })
  const url = URL.createObjectURL(blob)
  const enlace = document.createElement('a')
  const nombre = nombreArchivo(params)

  enlace.href = url
  enlace.download = nombre
  enlace.rel = 'noopener'
  document.body.appendChild(enlace)
  enlace.click()
  enlace.remove()

  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
  return nombre
}
