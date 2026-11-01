import type { DockParams } from './dockParams'

/**
 * Medidas de fabricación que calcula el worker de CSG. Se envían junto con la
 * geometría para poder avisar de paredes finas y voladizos sin bloquear la UI.
 */
export type Diagnostico = {
  /** Espacio mínimo entre cualquier hueco y el borde exterior de la base. */
  paredLateral: number
  /** Material que queda bajo el hueco del mando. */
  paredFondoMando: number
  /** Material que queda bajo el hueco del puck. */
  paredFondoPuck: number | null
  /** Separación entre los huecos del mando y del puck (0 si se tocan). */
  separacionHuecos: number | null
  /** Superficie del hueco que mira hacia abajo, en mm². */
  voladizoArea: number
  /** Porcentaje de esa superficie respecto al total del hueco. */
  voladizoPorcentaje: number
  /** False si algún hueco se sale de la base. */
  dentroBase: boolean
}

export type NivelAviso = 'ok' | 'aviso' | 'error'

export type AvisoImpresion = {
  nivel: NivelAviso
  texto: string
}

function numero(valor: number) {
  return Math.round(valor * 10) / 10
}

/**
 * Convierte las medidas del worker en mensajes accionables. Un error indica
 * que el STL no es imprimible tal cual; un aviso, que conviene revisarlo.
 */
export function construirAvisos(
  params: DockParams,
  diagnostico: Diagnostico | null,
): AvisoImpresion[] {
  if (!diagnostico) return []

  const avisos: AvisoImpresion[] = []

  if (!diagnostico.dentroBase) {
    avisos.push({
      nivel: 'error',
      texto:
        'Un hueco sobresale de la base. Aumenta el ancho o el fondo, reduce la distancia del puck o baja la inclinación.',
    })
  }

  if (diagnostico.paredLateral < 2) {
    avisos.push({
      nivel: 'error',
      texto: `Pared lateral de ${numero(
        Math.max(0, diagnostico.paredLateral),
      )} mm: por debajo del mínimo de 2 mm.`,
    })
  } else if (diagnostico.paredLateral < 3) {
    avisos.push({
      nivel: 'aviso',
      texto: `Pared lateral de ${numero(
        diagnostico.paredLateral,
      )} mm: justa para imprimir sin problemas.`,
    })
  }

  if (diagnostico.paredFondoMando < 2) {
    avisos.push({
      nivel: 'error',
      texto: `Quedan ${numero(
        diagnostico.paredFondoMando,
      )} mm bajo el mando; deja al menos 2 mm de fondo.`,
    })
  }

  if (
    diagnostico.paredFondoPuck !== null &&
    diagnostico.paredFondoPuck < 2
  ) {
    avisos.push({
      nivel: 'error',
      texto: `Quedan ${numero(
        diagnostico.paredFondoPuck,
      )} mm bajo el puck; reduce su profundidad.`,
    })
  }

  if (
    diagnostico.separacionHuecos !== null &&
    diagnostico.separacionHuecos < 2
  ) {
    avisos.push({
      nivel: 'error',
      texto:
        'Los huecos del mando y del puck están a menos de 2 mm: se unirán al imprimir. Aumenta la distancia del puck.',
    })
  } else if (
    diagnostico.separacionHuecos !== null &&
    diagnostico.separacionHuecos < 4
  ) {
    avisos.push({
      nivel: 'aviso',
      texto: `Solo hay ${numero(
        diagnostico.separacionHuecos,
      )} mm entre los dos huecos.`,
    })
  }

  if (
    diagnostico.voladizoPorcentaje > 22 ||
    diagnostico.voladizoArea > 3000
  ) {
    avisos.push({
      nivel: 'error',
      texto: `Voladizos grandes: el ${Math.round(
        diagnostico.voladizoPorcentaje,
      )} % del hueco mira hacia abajo. Imprime con soportes o cambia la inclinación.`,
    })
  } else if (
    diagnostico.voladizoPorcentaje > 12 ||
    diagnostico.voladizoArea > 1500
  ) {
    avisos.push({
      nivel: 'aviso',
      texto: `Posibles voladizos (${Math.round(
        diagnostico.voladizoPorcentaje,
      )} % de la cavidad). Revisa el preview de sección o usa soportes.`,
    })
  }

  if (params.canalCable && params.canalAlto > params.grosor - 2) {
    avisos.push({
      nivel: 'aviso',
      texto: `El canal deja menos de 2 mm de material hasta la cara superior.`,
    })
  }

  if (avisos.length === 0) {
    avisos.push({
      nivel: 'ok',
      texto:
        'Diseño imprimible: paredes de 2 mm o más y sin voladizos críticos.',
    })
  }

  return avisos
}
