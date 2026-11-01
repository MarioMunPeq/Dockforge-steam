import { useEffect, useMemo, useRef, useState } from 'react'
import type { InformeHID } from './hid'
import {
  bitsCambiados,
  bytesCambiados,
  formatearBytes,
} from './mapeoHID'

type VisorInformesHIDProps = {
  informes: InformeHID[]
  activo: boolean
  onLimpiar: () => void
}

function hexByte(byte: number) {
  return byte.toString(16).toUpperCase().padStart(2, '0')
}

/**
 * Visor de informes en bruto. Compara cada informe con una línea base que se
 * actualiza cuando el mando lleva un rato quieto, de modo que los bytes que
 * cambian al pulsar un control quedan resaltados mientras se mantiene pulsado.
 */
export default function VisorInformesHID({
  informes,
  activo,
  onLimpiar,
}: VisorInformesHIDProps) {
  const ultimo = informes[informes.length - 1]
  const [byteSeleccionado, setByteSeleccionado] = useState(0)
  const [cambioActual, setCambioActual] = useState<{
    reportId: number
    indices: Set<number>
    base: Uint8Array | null
  } | null>(null)
  const bases = useRef(
    new Map<number, { bytes: Uint8Array; ultimoCambio: number }>(),
  )

  useEffect(() => {
    if (!ultimo) {
      // El visor se sincroniza con el flujo de informes del dispositivo.
      // oxlint-disable-next-line react/set-state-in-effect
      setCambioActual(null)
      return
    }

    const ahora = performance.now()
    let entrada = bases.current.get(ultimo.reportId)

    if (!entrada) {
      entrada = { bytes: ultimo.bytes, ultimoCambio: 0 }
      bases.current.set(ultimo.reportId, entrada)
    }

    const cambios = bytesCambiados(entrada.bytes, ultimo.bytes)

    if (cambios.size > 0) {
      entrada.ultimoCambio = ahora
      setCambioActual({
        reportId: ultimo.reportId,
        indices: cambios,
        base: entrada.bytes,
      })
    } else if (ahora - entrada.ultimoCambio > 700) {
      entrada.bytes = ultimo.bytes
      setCambioActual({
        reportId: ultimo.reportId,
        indices: new Set(),
        base: entrada.bytes,
      })
    }
  }, [ultimo])

  useEffect(() => {
    if (!ultimo || !cambioActual || cambioActual.indices.size === 0) return

    // Si el mando deja de enviar informes (o suelta el botón y no hay más
    // eventos), devolvemos la línea base al último estado conocido.
    const temporizador = window.setTimeout(() => {
      const entrada = bases.current.get(ultimo.reportId)
      if (!entrada) return

      entrada.bytes = ultimo.bytes
      entrada.ultimoCambio = performance.now()
      setCambioActual({
        reportId: ultimo.reportId,
        indices: new Set(),
        base: entrada.bytes,
      })
    }, 900)

    return () => window.clearTimeout(temporizador)
  }, [cambioActual, ultimo])

  const historial = useMemo(() => {
    const anteriores = new Map<number, Uint8Array>()

    return informes.map((informe) => {
      const anterior = anteriores.get(informe.reportId) ?? null
      const cambios = bytesCambiados(anterior, informe.bytes)
      anteriores.set(informe.reportId, informe.bytes)

      return { ...informe, cambios }
    })
  }, [informes])

  if (!ultimo) {
    return (
      <section className="gemelo-hid-bloque">
        <div className="gemelo-debug__head">
          <h3 className="gemelo-debug__title">Informes HID</h3>
          <button
            type="button"
            className="gemelo-boton gemelo-boton--mini"
            onClick={onLimpiar}
            disabled
          >
            Limpiar
          </button>
        </div>

        <p className="gemelo-hid-nota">
          {activo
            ? 'Conectado. Pulsa cualquier botón del mando para empezar a ver informes.'
            : 'Conecta un dispositivo por HID para ver sus informes en bruto.'}
        </p>
      </section>
    )
  }

  const bytes = Array.from(ultimo.bytes)
  const cambios = cambioActual
  const indicesCambio =
    cambios?.reportId === ultimo.reportId ? cambios.indices : new Set<number>()
  const baseSeleccionada = cambios?.base ?? null
  const indiceByte = Math.min(
    byteSeleccionado,
    Math.max(0, ultimo.bytes.length - 1),
  )
  const cambiosBitsSeleccionados = bitsCambiados(
    baseSeleccionada,
    ultimo.bytes,
  ).filter((cambio) => cambio.byte === indiceByte)
  const byteActual = ultimo.bytes[indiceByte] ?? 0

  return (
    <section className="gemelo-hid-bloque">
      <div className="gemelo-debug__head">
        <h3 className="gemelo-debug__title">Informes HID</h3>
        <button
          type="button"
          className="gemelo-boton gemelo-boton--mini"
          onClick={onLimpiar}
        >
          Limpiar
        </button>
      </div>

      <div className="gemelo-hid-informe">
        <div className="gemelo-hid-informe__meta">
          <span>
            Informe <strong>0x{ultimo.reportId.toString(16).toUpperCase()}</strong>
          </span>
          <span>{ultimo.bytes.length} bytes</span>
          <span>#{ultimo.secuencia}</span>
        </div>

        <div className="gemelo-hid-bytes" role="list" aria-label="Bytes del informe">
          {bytes.map((byte, indice) => (
            <button
              type="button"
              key={indice}
              role="listitem"
              className={`gemelo-hid-byte ${
                indicesCambio.has(indice) ? 'is-cambio' : ''
              } ${indice === indiceByte ? 'is-sel' : ''}`}
              title={`Byte ${indice}: 0x${hexByte(byte)}`}
              onClick={() => setByteSeleccionado(indice)}
            >
              <span className="gemelo-hid-byte__indice">{indice}</span>
              <span className="gemelo-hid-byte__hex">{hexByte(byte)}</span>
            </button>
          ))}
        </div>

        <p className="gemelo-hid-cambio-resumen">
          {indicesCambio.size > 0
            ? `Cambian ${indicesCambio.size} byte(s) respecto al reposo.`
            : 'Sin cambios respecto al reposo.'}
        </p>
      </div>

      <div className="gemelo-hid-bits" aria-label="Bits del byte seleccionado">
        {[7, 6, 5, 4, 3, 2, 1, 0].map((bit) => {
          const valor = (byteActual >> bit) & 1
          const cambia = cambiosBitsSeleccionados.some(
            (cambio) => cambio.bit === bit,
          )

          return (
            <span
              key={bit}
              className={`gemelo-hid-bit ${valor ? 'is-on' : ''} ${
                cambia ? 'is-cambio' : ''
              }`}
              title={`Byte ${indiceByte}, bit ${bit}`}
            >
              <span>{bit}</span>
              <strong>{valor}</strong>
            </span>
          )
        })}
      </div>

      <div className="gemelo-hid-historial">
        <p className="gemelo-hid-historial__titulo">Últimos informes</p>

        {historial
          .slice(-9)
          .reverse()
          .map((informe) => (
            <div
              className="gemelo-hid-historial__fila"
              key={informe.secuencia}
            >
              <span className="gemelo-hid-historial__seq">
                #{informe.secuencia}
              </span>
              <span className="gemelo-hid-historial__id">
                0x{informe.reportId.toString(16).toUpperCase()}
              </span>
              <code className="gemelo-hid-historial__bytes">
                {Array.from(informe.bytes, (byte, indice) => (
                  <span
                    key={indice}
                    className={informe.cambios.has(indice) ? 'is-cambio' : ''}
                  >
                    {hexByte(byte)}
                  </span>
                ))}
              </code>
            </div>
          ))}
      </div>

      <p className="gemelo-hid-nota">
        Los bytes resaltados cambian respecto al último estado en reposo.
        Último informe: <code>{formatearBytes(ultimo.bytes)}</code>
      </p>
    </section>
  )
}
