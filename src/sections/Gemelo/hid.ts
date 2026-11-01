/**
 * Utilidades y tipos mínimos de WebHID.
 *
 * La API todavía no está en todos los lib.dom de TypeScript, así que
 * describimos solo la parte que usa el Gemelo. En tiempo de ejecución los
 * objetos son los HIDDevice nativos del navegador.
 */

export const VALVE_VENDOR_ID = 0x28de

/** IDs de producto de Valve que suelen corresponder a mandos. */
const NOMBRES_VALVE: Record<number, string> = {
  0x1102: 'Steam Controller',
  0x1142: 'Steam Controller (receptor inalámbrico)',
  0x1205: 'Steam Controller',
  0x1302: 'Steam Deck',
}

export type FiltroHID = {
  vendorId?: number
  productId?: number
  usagePage?: number
  usage?: number
}

export type ColeccionHID = {
  usagePage?: number
  usage?: number
  type?: number
  children?: ColeccionHID[]
}

export type InformeHIDEvento = Event & {
  reportId: number
  data: DataView
}

export type DispositivoHID = {
  vendorId: number
  productId: number
  productName: string
  manufacturerName?: string
  serialNumber?: string
  opened: boolean
  collections: ColeccionHID[]
  addEventListener: (
    tipo: 'inputreport',
    escucha: (evento: InformeHIDEvento) => void,
  ) => void
  removeEventListener: (
    tipo: 'inputreport',
    escucha: (evento: InformeHIDEvento) => void,
  ) => void
  open: () => Promise<void>
  close: () => Promise<void>
}

export type EventoDispositivoHID = Event & {
  device: DispositivoHID
}

/** Un informe de entrada ya copiado, listo para guardar en el historial. */
export type InformeHID = {
  secuencia: number
  reportId: number
  bytes: Uint8Array
  recibidoEn: number
}

/** Último informe recibido de cada reportId. */
export type EstadoInformesHID = Record<number, Uint8Array>

export type HIDNavegador = {
  getDevices: () => Promise<DispositivoHID[]>
  requestDevice: (opciones: {
    filters: FiltroHID[]
  }) => Promise<DispositivoHID[]>
  addEventListener: (
    tipo: 'connect' | 'disconnect',
    escucha: (evento: EventoDispositivoHID) => void,
  ) => void
  removeEventListener: (
    tipo: 'connect' | 'disconnect',
    escucha: (evento: EventoDispositivoHID) => void,
  ) => void
}

/** Devuelve `navigator.hid` si existe, sin lanzar en navegadores antiguos. */
export function obtenerHID(): HIDNavegador | null {
  if (typeof navigator === 'undefined') return null

  const navegador = navigator as Navigator & { hid?: HIDNavegador }
  return navegador.hid ?? null
}

export function esWebHIDSoportado() {
  return obtenerHID() !== null
}

/** Formatea un ID USB como `0x28DE`. */
export function idHex(valor: number) {
  return `0x${valor.toString(16).toUpperCase().padStart(4, '0')}`
}

/** Clave estable para comparar dispositivos sin depender de la identidad. */
export function claveDispositivo(dispositivo: DispositivoHID) {
  return [
    dispositivo.vendorId,
    dispositivo.productId,
    dispositivo.serialNumber ?? '',
    dispositivo.productName ?? '',
  ].join(':')
}

export function nombreDispositivo(dispositivo: DispositivoHID) {
  return (
    dispositivo.productName?.trim() ||
    NOMBRES_VALVE[dispositivo.productId] ||
    'Dispositivo Valve'
  )
}

export function esCancelacionHID(error: unknown) {
  if (!(error instanceof DOMException)) return false
  if (error.name === 'AbortError') return true

  if (error.name === 'NotFoundError') {
    const texto = error.message.toLowerCase()
    return (
      /cancel|seleccion|selected|selection|dismiss/.test(texto) &&
      !/matching|found|encontr/.test(texto)
    )
  }

  return false
}

/**
 * Traduce los errores de WebHID a instrucciones que se puedan seguir.
 * El caso más habitual con un Steam Controller es que Steam Input tenga el
 * dispositivo abierto en exclusiva.
 */
export function describirErrorHID(error: unknown) {
  const texto = error instanceof Error ? error.message : String(error)
  const ocupado = /already (?:open|in use)|failed to open|\bbusy\b|exclusive|claim|in use/i.test(
    texto,
  )

  if (ocupado) {
    return 'No se pudo abrir el dispositivo; puede que Steam lo esté usando. Cierra Steam y Steam Input, reconecta el puck y vuelve a intentarlo.'
  }

  if (error instanceof DOMException) {
    switch (error.name) {
      case 'SecurityError':
        return 'El navegador ha bloqueado el acceso HID. Abre la página en HTTPS o en localhost y vuelve a intentarlo.'
      case 'NotAllowedError':
        return 'No se concedió permiso para el dispositivo. Vuelve a pulsar «Conectar por HID» y acepta el aviso del navegador.'
      case 'NotSupportedError':
        return 'Este dispositivo no expone los informes HID necesarios. Prueba a conectarlo por USB o comprueba que no está en modo receptor.'
      case 'NetworkError':
      case 'InvalidStateError':
        return 'No se pudo abrir el dispositivo. Es probable que Steam lo tenga ocupado: cierra Steam, desactiva Steam Input, desconecta y vuelve a conectar el puck, y reinténtalo.'
      case 'NotFoundError':
        return 'No se encontró ningún dispositivo Valve o se canceló el diálogo. Comprueba que el puck esté conectado y el mando encendido, y vuelve a intentarlo.'
      case 'AbortError':
        return 'Se canceló la selección del dispositivo.'
      default:
        break
    }
  }

  return texto || 'No se pudo acceder al dispositivo HID.'
}
