import { useEffect, useMemo, useRef, useState } from 'react'

/** Lectura inmutable de un botón en un instante. */
export type BotonMando = {
  pressed: boolean
  touched: boolean
  value: number
}

/** Lectura inmutable de un mando en un instante. */
export type MandoLectura = {
  index: number
  id: string
  mapping: string
  connected: boolean
  timestamp: number
  buttons: BotonMando[]
  axes: number[]
}

const INTERVALO_LECTURA_MS = 32

function leerMando(mando: Gamepad): MandoLectura {
  return {
    index: mando.index,
    id: mando.id,
    mapping: mando.mapping,
    connected: mando.connected,
    timestamp: mando.timestamp,
    buttons: mando.buttons.map((boton) => ({
      pressed: boton.pressed,
      touched: boton.touched,
      value: boton.value,
    })),
    axes: Array.from(mando.axes),
  }
}

/**
 * Lee los mandos conectados con la Gamepad API.
 *
 * La API no tiene un evento fiable para "hay un mando nuevo", así que se
 * sondea a ~30 Hz. Solo se actualiza el estado cuando cambia algún valor,
 * para no re-renderizar la escena cuando el mando está en reposo.
 */
export function useGamepad() {
  const [soportado] = useState(
    () =>
      typeof navigator !== 'undefined' &&
      typeof navigator.getGamepads === 'function',
  )
  const [mandos, setMandos] = useState<MandoLectura[]>([])
  const [indiceActivo, setIndiceActivo] = useState<number | null>(null)
  const firmaAnterior = useRef('')

  useEffect(() => {
    if (!soportado) return

    let frame = 0
    let ultimaLectura = 0
    let vivo = true

    const leer = (tiempo: number) => {
      if (!vivo) return

      if (tiempo - ultimaLectura >= INTERVALO_LECTURA_MS) {
        ultimaLectura = tiempo

        let lista: MandoLectura[] = []

        try {
          lista = Array.from(navigator.getGamepads())
            .filter((mando): mando is Gamepad => Boolean(mando?.connected))
            .map(leerMando)
        } catch {
          // Algunos navegadores lanzan si la API está restringida.
        }

        const firma = lista
          .map((mando) => {
            const botones = mando.buttons
              .map(
                (boton) =>
                  `${boton.pressed ? 1 : 0}${boton.touched ? 1 : 0}${boton.value.toFixed(3)}`,
              )
              .join('')
            return [
              mando.index,
              mando.id,
              mando.mapping,
              botones,
              mando.axes.map((eje) => eje.toFixed(3)).join(','),
            ].join('|')
          })
          .join('~')

        if (firma !== firmaAnterior.current) {
          firmaAnterior.current = firma
          setMandos(lista)
          // Si el mando seleccionado desaparece, pasa al primero disponible.
          setIndiceActivo((actual) =>
            lista.some((mando) => mando.index === actual)
              ? actual
              : (lista[0]?.index ?? null),
          )
        }
      }

      frame = requestAnimationFrame(leer)
    }

    frame = requestAnimationFrame(leer)

    return () => {
      vivo = false
      cancelAnimationFrame(frame)
    }
  }, [soportado])

  const mandoActivo = useMemo(
    () =>
      mandos.find((mando) => mando.index === indiceActivo) ??
      mandos[0] ??
      null,
    [mandos, indiceActivo],
  )

  return {
    soportado,
    mandos,
    mandoActivo,
    indiceActivo,
    seleccionarMando: setIndiceActivo,
  }
}
