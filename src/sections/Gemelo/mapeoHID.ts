/**
 * MAPEO HID → MODELO 3D
 * ============================================================================
 * El aprendizaje del panel genera un JSON con esta forma:
 *
 * {
 *   "version": 1,
 *   "nombre": "Steam Controller",
 *   "dispositivo": { "vendorId": 10462, "productId": 4418 },
 *   "actualizado": "2026-10-31T12:00:00.000Z",
 *   "botones": {
 *     "boton-a": { "informe": 1, "byte": 3, "bit": 5, "activo": 1 }
 *   },
 *   "ejes": {
 *     "stick-izq-x": { "informe": 1, "byte": 6, "min": 0, "max": 255 }
 *   }
 * }
 *
 * «informe» es el reportId de WebHID, «byte» el índice dentro de `data` y
 * «bit» el bit 0..7 de ese byte. «activo» indica si el control se considera
 * pulsado cuando el bit vale 1 (por defecto) o 0.
 *
 * Los ejes son opcionales y se pueden añadir a mano en el JSON. Las claves
 * siguen el id de cada vista de `VISTAS_EJES` con sufijo `-x` o `-y`.
 */

import { BOTONES, VISTAS_EJES, ZONAS, obtenerZona } from './mapeo'
import type { BotonMando, MandoLectura } from './useGamepad'
import type { EstadoInformesHID, InformeHID } from './hid'

export type { EstadoInformesHID } from './hid'

export type ReferenciaBitHID = {
  informe: number
  byte: number
  bit: number
  activo?: 0 | 1
}

export type ReferenciaEjeHID = {
  informe: number
  byte: number
  min?: number
  max?: number
  centro?: number
  invertir?: boolean
}

export type MapeoHID = {
  version: 1
  nombre?: string
  dispositivo?: {
    vendorId?: number
    productId?: number
    producto?: string
  }
  actualizado?: string
  botones: Record<string, ReferenciaBitHID>
  ejes?: Record<string, ReferenciaEjeHID>
}

export type ControlAprendizaje = {
  id: string
  nombre: string
  boton: number
}

export type BitCambiado = {
  byte: number
  bit: number
  antes: 0 | 1
  ahora: 0 | 1
}

const CLAVE_ALMACEN = 'dockforge.gemelo.mapeoHID'

// Orden pensado para ir de los controles más fáciles a los que están debajo.
const ORDEN_APRENDIZAJE = [
  'boton-a',
  'boton-b',
  'boton-x',
  'boton-y',
  'dpad-arriba',
  'dpad-abajo',
  'dpad-izq',
  'dpad-der',
  'lb',
  'rb',
  'lt',
  'rt',
  'view',
  'menu',
  'steam',
  'stick-izq',
  'stick-der',
  'grip-l1',
  'grip-l2',
  'grip-r1',
  'grip-r2',
]

/** Controles que el asistente pide pulsar, en orden. */
export const CONTROLES_APRENDIZAJE: ControlAprendizaje[] = (() => {
  const zonasConBoton = ZONAS.filter((zona) => zona.botones.length > 0)
  const porId = new Map(zonasConBoton.map((zona) => [zona.id, zona]))
  const ordenadas = ORDEN_APRENDIZAJE.map((id) => porId.get(id)).filter(
    (zona): zona is (typeof ZONAS)[number] => zona !== undefined,
  )
  const resto = zonasConBoton.filter(
    (zona) => !ORDEN_APRENDIZAJE.includes(zona.id),
  )

  return [...ordenadas, ...resto].map((zona) => ({
    id: zona.id,
    nombre: zona.nombre,
    boton: zona.botones[0],
  }))
})()

export function crearMapeoVacio(): MapeoHID {
  return { version: 1, botones: {}, ejes: {} }
}

function esObjeto(valor: unknown): valor is Record<string, unknown> {
  return typeof valor === 'object' && valor !== null && !Array.isArray(valor)
}

function numeroEntero(valor: unknown, nombre: string) {
  if (typeof valor !== 'number' || !Number.isFinite(valor)) {
    throw new Error(`«${nombre}» debe ser un número.`)
  }

  return Math.trunc(valor)
}

function normalizarBit(
  valor: unknown,
  clave: string,
): ReferenciaBitHID {
  if (!esObjeto(valor)) {
    throw new Error(`El botón «${clave}» debe ser un objeto.`)
  }

  const byte = numeroEntero(valor.byte, `${clave}.byte`)
  const bit = numeroEntero(valor.bit, `${clave}.bit`)

  if (byte < 0) throw new Error(`«${clave}.byte» no puede ser negativo.`)
  if (bit < 0 || bit > 7) {
    throw new Error(`«${clave}.bit» debe estar entre 0 y 7.`)
  }

  const activo = valor.activo === 0 ? 0 : 1

  return {
    informe: numeroEntero(valor.informe ?? 0, `${clave}.informe`),
    byte,
    bit,
    activo,
  }
}

function normalizarEje(valor: unknown, clave: string): ReferenciaEjeHID {
  if (!esObjeto(valor)) {
    throw new Error(`El eje «${clave}» debe ser un objeto.`)
  }

  const byte = numeroEntero(valor.byte, `${clave}.byte`)
  if (byte < 0) throw new Error(`«${clave}.byte» no puede ser negativo.`)

  const referencia: ReferenciaEjeHID = {
    informe: numeroEntero(valor.informe ?? 0, `${clave}.informe`),
    byte,
  }

  if (valor.min !== undefined) {
    referencia.min = numeroEntero(valor.min, `${clave}.min`)
  }
  if (valor.max !== undefined) {
    referencia.max = numeroEntero(valor.max, `${clave}.max`)
  }
  if (valor.centro !== undefined) {
    referencia.centro = numeroEntero(valor.centro, `${clave}.centro`)
  }
  if (valor.invertir === true) referencia.invertir = true

  return referencia
}

/** Valida y normaliza un JSON leído de un archivo, del editor o de localStorage. */
export function normalizarMapeo(valor: unknown): MapeoHID {
  if (!esObjeto(valor)) {
    throw new Error('El mapeo debe ser un objeto JSON.')
  }

  if (valor.botones !== undefined && !esObjeto(valor.botones)) {
    throw new Error('«botones» debe ser un objeto.')
  }
  if (valor.ejes !== undefined && !esObjeto(valor.ejes)) {
    throw new Error('«ejes» debe ser un objeto.')
  }

  const botones: Record<string, ReferenciaBitHID> = {}

  for (const [clave, referencia] of Object.entries(valor.botones ?? {})) {
    if (!clave.trim()) throw new Error('Hay un botón sin nombre.')
    botones[clave] = normalizarBit(referencia, clave)
  }

  const ejes: Record<string, ReferenciaEjeHID> = {}

  for (const [clave, referencia] of Object.entries(valor.ejes ?? {})) {
    if (!clave.trim()) throw new Error('Hay un eje sin nombre.')
    ejes[clave] = normalizarEje(referencia, clave)
  }

  const mapeo: MapeoHID = {
    version: 1,
    botones,
    ejes,
  }

  if (typeof valor.nombre === 'string') mapeo.nombre = valor.nombre
  if (typeof valor.actualizado === 'string') {
    mapeo.actualizado = valor.actualizado
  }

  if (esObjeto(valor.dispositivo)) {
    mapeo.dispositivo = {}
    const { vendorId, productId, producto } = valor.dispositivo

    if (typeof vendorId === 'number') mapeo.dispositivo.vendorId = vendorId
    if (typeof productId === 'number') mapeo.dispositivo.productId = productId
    if (typeof producto === 'string') mapeo.dispositivo.producto = producto
  }

  return mapeo
}

export function serializarMapeo(mapeo: MapeoHID) {
  return JSON.stringify(mapeo, null, 2)
}

export function cargarMapeoLocal(): MapeoHID {
  try {
    const guardado = window.localStorage.getItem(CLAVE_ALMACEN)
    if (!guardado) return crearMapeoVacio()

    return normalizarMapeo(JSON.parse(guardado))
  } catch {
    return crearMapeoVacio()
  }
}

export function guardarMapeoLocal(mapeo: MapeoHID) {
  try {
    window.localStorage.setItem(CLAVE_ALMACEN, serializarMapeo(mapeo))
  } catch {
    // localStorage puede estar lleno o bloqueado; el mapeo sigue en memoria.
  }
}

export function descargarMapeoJSON(mapeo: MapeoHID) {
  const contenido = serializarMapeo(mapeo)
  const blob = new Blob([contenido], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const enlace = document.createElement('a')

  enlace.href = url
  enlace.download = 'mapeo-hid-steam-controller.json'
  document.body.append(enlace)
  enlace.click()
  enlace.remove()

  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export async function leerMapeoDeArchivo(archivo: File): Promise<MapeoHID> {
  const texto = await archivo.text()
  let datos: unknown

  try {
    datos = JSON.parse(texto)
  } catch {
    throw new Error('El archivo no contiene JSON válido.')
  }

  return normalizarMapeo(datos)
}

/** Bits que difieren entre dos informes. */
export function bitsCambiados(
  base: Uint8Array | null,
  actual: Uint8Array,
): BitCambiado[] {
  const cambios: BitCambiado[] = []
  const longitud = Math.max(base?.length ?? 0, actual.length)

  for (let byte = 0; byte < longitud; byte++) {
    const antes = base?.[byte] ?? 0
    const ahora = actual[byte] ?? 0
    let diferencia = antes ^ ahora

    while (diferencia !== 0) {
      const bit = 31 - Math.clz32(diferencia & -diferencia)
      cambios.push({
        byte,
        bit,
        antes: ((antes >> bit) & 1) as 0 | 1,
        ahora: ((ahora >> bit) & 1) as 0 | 1,
      })
      diferencia &= diferencia - 1
    }
  }

  return cambios
}

/** Índices de byte que difieren entre dos informes. */
export function bytesCambiados(
  base: Uint8Array | null,
  actual: Uint8Array,
) {
  const indices = new Set<number>()
  const longitud = Math.max(base?.length ?? 0, actual.length)

  for (let byte = 0; byte < longitud; byte++) {
    if ((base?.[byte] ?? 0) !== (actual[byte] ?? 0)) indices.add(byte)
  }

  return indices
}

export function formatearBytes(bytes: Uint8Array) {
  return Array.from(bytes, (byte) =>
    byte.toString(16).toUpperCase().padStart(2, '0'),
  ).join(' ')
}

function leerBit(
  informes: EstadoInformesHID,
  referencia: ReferenciaBitHID,
) {
  const datos = informes[referencia.informe]
  if (!datos || referencia.byte >= datos.length) return null

  return (datos[referencia.byte] >> referencia.bit) & 1
}

function leerEje(
  informes: EstadoInformesHID,
  referencia: ReferenciaEjeHID,
) {
  const datos = informes[referencia.informe]
  if (!datos || referencia.byte >= datos.length) return null

  const valor = datos[referencia.byte]
  let normalizado: number

  if (referencia.min !== undefined && referencia.max !== undefined) {
    const rango = referencia.max - referencia.min
    normalizado = rango === 0 ? 0 : ((valor - referencia.min) / rango) * 2 - 1
  } else {
    const centro = referencia.centro ?? 128
    normalizado = (valor - centro) / (centro || 1)
  }

  if (referencia.invertir) normalizado *= -1
  return Math.min(1, Math.max(-1, normalizado))
}

/**
 * Convierte el último informe HID de cada reportId en una lectura compatible
 * con la escena 3D. Solo aparecen los controles que estén en el mapeo.
 */
export function crearMandoDesdeHID(
  mapeo: MapeoHID,
  informes: EstadoInformesHID,
): MandoLectura | null {
  const claves = Object.keys(mapeo.botones)
  const clavesEje = Object.keys(mapeo.ejes ?? {})

  if (claves.length === 0 && clavesEje.length === 0) return null
  if (Object.keys(informes).length === 0) return null

  const totalBotones = Math.max(...Object.values(BOTONES)) + 1
  const buttons: BotonMando[] = Array.from(
    { length: totalBotones },
    () => ({ pressed: false, touched: false, value: 0 }),
  )

  for (const clave of claves) {
    const zona = obtenerZona(clave)
    const referencia = mapeo.botones[clave]
    if (!zona || !referencia) continue

    const bit = leerBit(informes, referencia)
    if (bit === null) continue

    const pulsado = bit === (referencia.activo ?? 1)
    if (!pulsado) continue

    for (const indice of zona.botones) {
      if (buttons[indice]) {
        buttons[indice] = { pressed: true, touched: true, value: 1 }
      }
    }
  }

  const maxEje = Math.max(
    3,
    ...VISTAS_EJES.map((vista) => Math.max(...vista.ejes)),
  )
  const axes = Array.from({ length: maxEje + 1 }, () => 0)

  for (const vista of VISTAS_EJES) {
    const x = mapeo.ejes?.[`${vista.id}-x`]
    const y = mapeo.ejes?.[`${vista.id}-y`]

    if (x) {
      const valor = leerEje(informes, x)
      if (valor !== null) axes[vista.ejes[0]] = valor
    }
    if (y) {
      const valor = leerEje(informes, y)
      if (valor !== null) axes[vista.ejes[1]] = valor
    }
  }

  return {
    index: 0,
    id: mapeo.nombre
      ? `${mapeo.nombre} · WebHID`
      : 'Steam Controller · WebHID',
    mapping: 'hid',
    connected: true,
    timestamp: Date.now(),
    buttons,
    axes,
  }
}

/** Número de controles de botón que ya tiene el mapeo. */
export function contarBotonesMapeados(mapeo: MapeoHID) {
  return Object.keys(mapeo.botones).length
}

/** Número de ejes configurados a mano en el JSON. */
export function contarEjesMapeados(mapeo: MapeoHID) {
  return Object.keys(mapeo.ejes ?? {}).length
}

/** Últimos informes de cada reportId, para pasarlos a la escena. */
export function ultimosPorInforme(informes: InformeHID[]) {
  const ultimos: EstadoInformesHID = {}

  for (const informe of informes) {
    ultimos[informe.reportId] = informe.bytes
  }

  return ultimos
}
