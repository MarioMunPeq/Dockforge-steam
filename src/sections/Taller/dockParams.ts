// Parámetros compartidos del dock. Todas las medidas están en milímetros.
export type PresetId = 'sobremesa' | 'vertical' | 'carga'

export type PuckPosicion = 'izquierda' | 'derecha' | 'detras'

export type VistaTaller = 'materiales' | 'seccion' | 'medidas'

export type DockParams = {
  /** Último preset aplicado. Sirve para nombrar el archivo y encuadrar la vista. */
  preset: PresetId
  ancho: number
  fondo: number
  grosor: number
  /** Radio del redondeo de las aristas de la base. 0 = chaflán recto. */
  redondeo: number
  inclinacion: number
  holgura: number
  profundidad: number
  /** Alojamientos para patas antideslizantes en la cara inferior. */
  patas: boolean
  /** Canal inferior para pasar el cable de carga. */
  canalCable: boolean
  canalAncho: number
  canalAlto: number
  puckActivo: boolean
  puckPosicion: PuckPosicion
  /** Separación entre el borde del mando y el borde del hueco del puck. */
  puckDistancia: number
  puckHolgura: number
  puckProfundidad: number
}

// Texto extruido que se coloca sobre la cara superior de la base.
export type TextParams = {
  texto: string
  textoTamano: number
  textoRelieve: number
  textoX: number
  textoZ: number
  textoRotacion: number
}

export type TallerParams = DockParams & TextParams

export type Preset = {
  id: PresetId
  nombre: string
  descripcion: string
  params: TallerParams
}

// Tres puntos de partida con usos bien distintos.
export const PRESETS: Preset[] = [
  {
    id: 'sobremesa',
    nombre: 'Sobremesa',
    descripcion: 'Inclinación suave para dejar el mando listo en el escritorio.',
    params: {
      preset: 'sobremesa',
      ancho: 240,
      fondo: 190,
      grosor: 12,
      redondeo: 6,
      inclinacion: 15,
      holgura: 2,
      profundidad: 4,
      patas: true,
      canalCable: true,
      canalAncho: 14,
      canalAlto: 3,
      puckActivo: true,
      puckPosicion: 'detras',
      puckDistancia: 7,
      puckHolgura: 1,
      puckProfundidad: 3,
      texto: 'STEAM',
      textoTamano: 12,
      textoRelieve: 1.2,
      textoX: 0,
      textoZ: 76,
      textoRotacion: 0,
    },
  },
  {
    id: 'vertical',
    nombre: 'Vertical',
    descripcion: 'El mando de pie, con la base más gruesa y el puck detrás.',
    params: {
      preset: 'vertical',
      ancho: 200,
      fondo: 190,
      grosor: 18,
      redondeo: 8,
      inclinacion: 82,
      holgura: 2.5,
      profundidad: 6,
      patas: true,
      canalCable: true,
      canalAncho: 12,
      canalAlto: 4,
      puckActivo: true,
      puckPosicion: 'detras',
      puckDistancia: 7,
      puckHolgura: 1,
      puckProfundidad: 4,
      texto: 'STEAM',
      textoTamano: 11,
      textoRelieve: 1.1,
      textoX: 0,
      textoZ: 78,
      textoRotacion: 0,
    },
  },
  {
    id: 'carga',
    nombre: 'Carga',
    descripcion: 'Base alta, inclinación media y canal para el cable de carga.',
    params: {
      preset: 'carga',
      ancho: 290,
      fondo: 175,
      grosor: 20,
      redondeo: 5,
      inclinacion: 34,
      holgura: 2,
      profundidad: 6,
      patas: true,
      canalCable: true,
      canalAncho: 16,
      canalAlto: 4,
      puckActivo: true,
      puckPosicion: 'izquierda',
      puckDistancia: 7,
      puckHolgura: 1,
      puckProfundidad: 3,
      texto: 'STEAM',
      textoTamano: 11,
      textoRelieve: 1,
      textoX: 0,
      textoZ: 76,
      textoRotacion: 0,
    },
  },
]

export const DEFAULT_TALLER_PARAMS: TallerParams = { ...PRESETS[0].params }

export type AjustesHueco = {
  /** Margen real aplicado a la cavidad, limitado para no agujerear la base. */
  margen: number
  /** Cuánto se hunde el mando en la base, limitado por el grosor. */
  profundidad: number
}

/**
 * Calcula la holgura y la profundidad efectivas del hueco del mando.
 * La cavidad se expande por el margen y también hacia abajo, así que se
 * limita para que siempre quede al menos 1 mm de material en el fondo.
 */
export function calcularAjustesHueco(params: DockParams): AjustesHueco {
  const margen = Math.min(
    Math.max(0, params.holgura),
    Math.max(0, params.grosor - 1),
  )
  const profundidad = Math.min(
    Math.max(0, params.profundidad),
    Math.max(0, params.grosor - margen - 1),
  )

  return { margen, profundidad }
}

export type AjustesPuck = {
  holgura: number
  profundidad: number
}

/** Igual que el hueco del mando, pero con su propia holgura y profundidad. */
export function calcularAjustesPuck(params: DockParams): AjustesPuck {
  const holgura = Math.min(Math.max(0, params.puckHolgura), 6)
  const profundidad = Math.min(
    Math.max(0, params.puckProfundidad),
    Math.max(0, params.grosor - 1),
  )

  return { holgura, profundidad }
}

/** Nombre legible del preset, para la ficha y el archivo exportado. */
export function nombrePreset(id: PresetId) {
  return PRESETS.find((preset) => preset.id === id)?.nombre ?? 'Diseño'
}

/** Devuelve una copia de los parámetros con los límites de texto aplicados. */
export function normalizarParams(params: TallerParams): TallerParams {
  const margen = 6
  const minimoX = -params.ancho / 2 + margen
  const maximoX = params.ancho / 2 - margen
  const minimoZ = -params.fondo / 2 + margen
  const maximoZ = params.fondo / 2 - margen

  return {
    ...params,
    textoX: Math.min(maximoX, Math.max(minimoX, params.textoX)),
    textoZ: Math.min(maximoZ, Math.max(minimoZ, params.textoZ)),
  }
}
