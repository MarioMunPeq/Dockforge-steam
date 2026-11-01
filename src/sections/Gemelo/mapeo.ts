/**
 * MAPEO MANDO → MODELO 3D
 * ============================================================================
 * Este es el único archivo que hay que tocar para adaptar el gemelo a otro
 * mando o recolocar los brillos sobre el modelo.
 *
 * Los índices siguen el "standard gamepad mapping" del W3C:
 * https://w3c.github.io/gamepad/#remapping
 *
 * Si tu navegador expone el mando con `mapping: ""`, los índices pueden ser
 * distintos. Abre el panel de depuración del Gemelo, pulsa cada control y
 * cambia aquí el número que corresponda.
 *
 * Coordenadas del modelo (milímetros, modelo ya centrado):
 *   +X → derecha del mando
 *   +Y → arriba (cara superior)
 *   +Z → parte delantera (zona de los trackpads)
 * El origen está en el centro de la caja del modelo.
 */

/** Índices estándar de los botones. */
export const BOTONES = {
  A: 0,
  B: 1,
  X: 2,
  Y: 3,
  LB: 4,
  RB: 5,
  LT: 6,
  RT: 7,
  VIEW: 8,
  MENU: 9,
  L3: 10,
  R3: 11,
  DPAD_UP: 12,
  DPAD_DOWN: 13,
  DPAD_LEFT: 14,
  DPAD_RIGHT: 15,
  STEAM: 16,
  // Botones traseros / paletas. No todos los mandos ni navegadores los
  // exponen; si tu mando usa otros índices, ajústalos aquí.
  GRIP_L1: 17,
  GRIP_L2: 18,
  GRIP_R1: 19,
  GRIP_R2: 20,
} as const

export type ZonaMando = {
  id: string
  /** Nombre visible en el panel de depuración. */
  nombre: string
  /** Botones que encienden esta zona (puede haber varios). */
  botones: number[]
  /** Centro del brillo, en mm, en coordenadas del modelo. */
  posicion: [number, number, number]
  /** Radio del halo en mm. */
  radio: number
  /** Color del brillo. Si se omite se usa el azul de la interfaz. */
  color?: string
}

/**
 * Zonas del mando.
 * Las posiciones están medidas sobre `public/models/mando.glb`.
 * Para recolocar un brillo solo hay que cambiar su `posicion`.
 */
export const ZONAS: ZonaMando[] = [
  // ── Sticks ────────────────────────────────────────────────────────────────
  {
    id: 'stick-izq',
    nombre: 'Stick izq. (L3)',
    botones: [BOTONES.L3],
    posicion: [-23, 33.5, -18],
    radio: 11,
    color: '#7ee7ff',
  },
  {
    id: 'stick-der',
    nombre: 'Stick der. (R3)',
    botones: [BOTONES.R3],
    posicion: [23, 33.5, -18],
    radio: 11,
    color: '#7ee7ff',
  },

  // ── Cruceta ───────────────────────────────────────────────────────────────
  {
    id: 'dpad-arriba',
    nombre: 'Cruceta arriba',
    botones: [BOTONES.DPAD_UP],
    posicion: [-48.3, 27.5, -39.2],
    radio: 6.5,
  },
  {
    id: 'dpad-abajo',
    nombre: 'Cruceta abajo',
    botones: [BOTONES.DPAD_DOWN],
    posicion: [-48.3, 27.5, -20.2],
    radio: 6.5,
  },
  {
    id: 'dpad-izq',
    nombre: 'Cruceta izquierda',
    botones: [BOTONES.DPAD_LEFT],
    posicion: [-58, 27.5, -29.6],
    radio: 6.5,
  },
  {
    id: 'dpad-der',
    nombre: 'Cruceta derecha',
    botones: [BOTONES.DPAD_RIGHT],
    posicion: [-38.8, 27.5, -29.6],
    radio: 6.5,
  },

  // ── Botones ABXY ──────────────────────────────────────────────────────────
  {
    id: 'boton-a',
    nombre: 'Botón A',
    botones: [BOTONES.A],
    posicion: [48.9, 27.5, -20.4],
    radio: 6.5,
  },
  {
    id: 'boton-b',
    nombre: 'Botón B',
    botones: [BOTONES.B],
    posicion: [56.5, 27.5, -29.4],
    radio: 6.5,
  },
  {
    id: 'boton-x',
    nombre: 'Botón X',
    botones: [BOTONES.X],
    posicion: [38.6, 27.5, -29.6],
    radio: 6.5,
  },
  {
    id: 'boton-y',
    nombre: 'Botón Y',
    botones: [BOTONES.Y],
    posicion: [48.9, 27.5, -38.8],
    radio: 6.5,
  },

  // ── Botones pequeños / centrales ──────────────────────────────────────────
  {
    id: 'view',
    nombre: 'Ver (View)',
    botones: [BOTONES.VIEW],
    posicion: [-28.2, 26.5, -41],
    radio: 5,
  },
  {
    id: 'menu',
    nombre: 'Menú (Menu)',
    botones: [BOTONES.MENU],
    posicion: [28.2, 26.5, -41],
    radio: 5,
  },
  {
    id: 'steam',
    nombre: 'Botón Steam / Guide',
    botones: [BOTONES.STEAM],
    posicion: [0, 25.5, 11],
    radio: 6,
  },

  // ── Hombros y gatillos ────────────────────────────────────────────────────
  {
    id: 'lb',
    nombre: 'Bumper izquierdo (LB)',
    botones: [BOTONES.LB],
    posicion: [-52, 27.5, -48.5],
    radio: 9,
  },
  {
    id: 'rb',
    nombre: 'Bumper derecho (RB)',
    botones: [BOTONES.RB],
    posicion: [52, 27.5, -48.5],
    radio: 9,
  },
  {
    id: 'lt',
    nombre: 'Gatillo izquierdo (LT)',
    botones: [BOTONES.LT],
    posicion: [-52, 23, -53.5],
    radio: 9,
  },
  {
    id: 'rt',
    nombre: 'Gatillo derecho (RT)',
    botones: [BOTONES.RT],
    posicion: [52, 23, -53.5],
    radio: 9,
  },

  // ── Paletas traseras (solo se ven al girar el modelo) ─────────────────────
  {
    id: 'grip-l1',
    nombre: 'Paleta izq. 1',
    botones: [BOTONES.GRIP_L1],
    posicion: [-45, -10, -8],
    radio: 8,
  },
  {
    id: 'grip-l2',
    nombre: 'Paleta izq. 2',
    botones: [BOTONES.GRIP_L2],
    posicion: [-55, -10, 12],
    radio: 8,
  },
  {
    id: 'grip-r1',
    nombre: 'Paleta der. 1',
    botones: [BOTONES.GRIP_R1],
    posicion: [45, -10, -8],
    radio: 8,
  },
  {
    id: 'grip-r2',
    nombre: 'Paleta der. 2',
    botones: [BOTONES.GRIP_R2],
    posicion: [55, -10, 12],
    radio: 8,
  },

  // ── Zonas sin botón: sirven de anclaje para los ejes ──────────────────────
  {
    id: 'trackpad-izq',
    nombre: 'Trackpad izquierdo',
    botones: [],
    posicion: [-31, 25, 14],
    radio: 16,
    color: '#b794ff',
  },
  {
    id: 'trackpad-der',
    nombre: 'Trackpad derecho',
    botones: [],
    posicion: [31, 25, 14],
    radio: 16,
    color: '#b794ff',
  },
]

export type TipoVistaEje = 'stick' | 'trackpad'

export type VistaEje = {
  id: string
  nombre: string
  /** Zona del modelo sobre la que se dibuja el control. */
  zonaId: string
  /** Par de índices dentro de `gamepad.axes`. */
  ejes: [number, number]
  tipo: TipoVistaEje
  /** Desplazamiento máximo del control visual, en mm. */
  recorrido: number
  /** Radio del cursor o de la tapa del stick, en mm. */
  radioVisual: number
  /** Invierte el eje vertical si tu mando lo entrega al revés. */
  invertirY?: boolean
}

/**
 * Ejes que se visualizan como sticks o cursores sobre el modelo.
 * Si tu mando expone los trackpads en otros índices, cámbialos aquí.
 * Las vistas cuyo número de eje no exista simplemente no se dibujan.
 */
export const VISTAS_EJES: VistaEje[] = [
  {
    id: 'stick-izq',
    nombre: 'Stick izquierdo',
    zonaId: 'stick-izq',
    ejes: [0, 1],
    tipo: 'stick',
    recorrido: 7,
    radioVisual: 8.4,
  },
  {
    id: 'stick-der',
    nombre: 'Stick derecho',
    zonaId: 'stick-der',
    ejes: [2, 3],
    tipo: 'stick',
    recorrido: 7,
    radioVisual: 8.4,
  },
  {
    id: 'trackpad-izq',
    nombre: 'Trackpad izquierdo',
    zonaId: 'trackpad-izq',
    ejes: [4, 5],
    tipo: 'trackpad',
    recorrido: 11,
    radioVisual: 3.4,
  },
  {
    id: 'trackpad-der',
    nombre: 'Trackpad derecho',
    zonaId: 'trackpad-der',
    ejes: [6, 7],
    tipo: 'trackpad',
    recorrido: 11,
    radioVisual: 3.4,
  },
]

// ── Utilidades de consulta ─────────────────────────────────────────────────

const zonasPorId = new Map(ZONAS.map((zona) => [zona.id, zona]))
const zonaPorBoton = new Map<number, ZonaMando>()

for (const zona of ZONAS) {
  for (const boton of zona.botones) zonaPorBoton.set(boton, zona)
}

const etiquetasEje = new Map<number, string>()

for (const vista of VISTAS_EJES) {
  etiquetasEje.set(vista.ejes[0], `${vista.nombre} · X`)
  etiquetasEje.set(vista.ejes[1], `${vista.nombre} · Y`)
}

/** Devuelve la zona asociada a un botón, si existe. */
export function zonaDeBoton(indice: number) {
  return zonaPorBoton.get(indice)
}

/** Devuelve una zona por su id. */
export function obtenerZona(id: string) {
  return zonasPorId.get(id)
}

/** Nombre legible para cualquier índice de botón. */
export function etiquetaBoton(indice: number) {
  return zonaDeBoton(indice)?.nombre ?? `Botón ${indice}`
}

/** Nombre legible para cualquier índice de eje. */
export function etiquetaEje(indice: number) {
  return etiquetasEje.get(indice) ?? `Eje ${indice}`
}

/** Vistas de ejes que existen para un mando con `totalEjes` ejes. */
export function vistasDisponibles(totalEjes: number) {
  return VISTAS_EJES.filter((vista) => Math.max(...vista.ejes) < totalEjes)
}
