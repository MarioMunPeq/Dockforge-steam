import { useEffect, useRef, useState } from 'react'
import type { DispositivoHID, InformeHID } from './hid'
import {
  CONTROLES_APRENDIZAJE,
  bitsCambiados,
  descargarMapeoJSON,
  type BitCambiado,
  type MapeoHID,
} from './mapeoHID'

type Fase = 'inactivo' | 'reposo' | 'escuchando' | 'detectado' | 'fin'

type AprendizajeHIDProps = {
  dispositivo: DispositivoHID | null
  informes: InformeHID[]
  mapeo: MapeoHID
  onMapeo: (mapeo: MapeoHID) => void
}

/**
 * Asistente paso a paso: pide pulsar un control, compara los informes con el
 * reposo y propone los bits que han cambiado. Al confirmar se guarda la
 * referencia en el mapeo y el modelo 3D empieza a iluminar ese control.
 */
export default function AprendizajeHID({
  dispositivo,
  informes,
  mapeo,
  onMapeo,
}: AprendizajeHIDProps) {
  const [activo, setActivo] = useState(false)
  const [paso, setPaso] = useState(0)
  const [fase, setFase] = useState<Fase>('inactivo')
  const [base, setBase] = useState<Uint8Array | null>(null)
  const [baseInforme, setBaseInforme] = useState<number | null>(null)
  const [candidatos, setCandidatos] = useState<BitCambiado[]>([])
  const [seleccion, setSeleccion] = useState(0)
  const [ladoActivo, setLadoActivo] = useState<0 | 1>(1)
  const [mensaje, setMensaje] = useState<string | null>(null)

  const candidatosPendientes = useRef(new Map<string, BitCambiado>())
  const temporizador = useRef(0)
  const ultimaSecuencia = useRef(-1)

  const ultimo = informes[informes.length - 1]
  const control = CONTROLES_APRENDIZAJE[paso]
  const total = CONTROLES_APRENDIZAJE.length

  const limpiarDeteccion = () => {
    if (temporizador.current !== 0) {
      window.clearTimeout(temporizador.current)
      temporizador.current = 0
    }
    candidatosPendientes.current.clear()
  }

  useEffect(() => {
    return () => {
      if (temporizador.current !== 0) {
        window.clearTimeout(temporizador.current)
      }
    }
  }, [])

  useEffect(() => {
    if (!activo || fase !== 'escuchando' || !base || baseInforme === null) {
      return
    }

    const nuevos = informes.filter(
      (informe) =>
        informe.secuencia > ultimaSecuencia.current &&
        informe.reportId === baseInforme,
    )

    if (nuevos.length === 0) return
    ultimaSecuencia.current = nuevos[nuevos.length - 1].secuencia

    let hayNuevos = false

    for (const informe of nuevos) {
      const cambios = bitsCambiados(base, informe.bytes).filter(
        (cambio) => cambio.ahora === ladoActivo,
      )

      for (const cambio of cambios) {
        const clave = `${cambio.byte}:${cambio.bit}:${cambio.ahora}`

        if (!candidatosPendientes.current.has(clave)) {
          candidatosPendientes.current.set(clave, cambio)
          hayNuevos = true
        }
      }
    }

    if (candidatosPendientes.current.size === 0) return

    // Esperamos un instante sin bits nuevos para que una pulsación rápida
    // (un solo informe) también se detecte, aunque el mando deje de enviar.
    if (hayNuevos && temporizador.current !== 0) {
      window.clearTimeout(temporizador.current)
      temporizador.current = 0
    }

    if (temporizador.current === 0) {
      temporizador.current = window.setTimeout(() => {
        const lista = [...candidatosPendientes.current.values()].sort(
          (a, b) => a.byte - b.byte || a.bit - b.bit,
        )

        temporizador.current = 0
        candidatosPendientes.current.clear()

        if (lista.length > 0) {
          setCandidatos(lista)
          setSeleccion(0)
          setFase('detectado')
        }
      }, 350)
    }
  }, [activo, base, baseInforme, fase, informes, ladoActivo])

  useEffect(() => {
    if (dispositivo || !activo) return

    setActivo(false)
    setFase('inactivo')
    setMensaje('Se desconectó el dispositivo; el aprendizaje se ha detenido.')
  }, [activo, dispositivo])

  const reiniciarPaso = () => {
    setBase(null)
    setBaseInforme(null)
    setCandidatos([])
    setSeleccion(0)
    limpiarDeteccion()
    setMensaje(null)
    setFase('reposo')
  }

  const iniciar = () => {
    setActivo(true)
    setPaso(0)
    setFase('reposo')
    setBase(null)
    setBaseInforme(null)
    setCandidatos([])
    setSeleccion(0)
    setMensaje(
      'Suelta todos los controles. Cuando el mando esté quieto, captura el reposo.',
    )
    limpiarDeteccion()
    ultimaSecuencia.current = -1
  }

  const cancelar = () => {
    setActivo(false)
    setFase('inactivo')
    setBase(null)
    setBaseInforme(null)
    setCandidatos([])
    limpiarDeteccion()
    setMensaje(null)
  }

  const capturarReposo = () => {
    if (!ultimo) {
      setMensaje('Todavía no hay informes. Pulsa un botón del mando y espera.')
      return
    }

    setBase(ultimo.bytes.slice())
    setBaseInforme(ultimo.reportId)
    setCandidatos([])
    setSeleccion(0)
    setMensaje(null)
    limpiarDeteccion()
    ultimaSecuencia.current = ultimo.secuencia
    setFase('escuchando')
  }

  const avanzar = () => {
    if (paso + 1 >= total) {
      setFase('fin')
      setBase(null)
      setBaseInforme(null)
      setCandidatos([])
      limpiarDeteccion()
      return
    }

    setPaso((actual) => actual + 1)
    setBase(null)
    setBaseInforme(null)
    setCandidatos([])
    setSeleccion(0)
    limpiarDeteccion()
    setMensaje(null)
    setFase('reposo')
  }

  const confirmar = () => {
    const elegido = candidatos[seleccion]
    if (!control || !elegido || baseInforme === null) return

    const nuevo: MapeoHID = {
      ...mapeo,
      actualizado: new Date().toISOString(),
      botones: {
        ...mapeo.botones,
        [control.id]: {
          informe: baseInforme,
          byte: elegido.byte,
          bit: elegido.bit,
          activo: ladoActivo,
        },
      },
    }

    onMapeo(nuevo)
    avanzar()
  }

  const guardar = () => {
    descargarMapeoJSON(mapeo)
    setMensaje('Mapeo descargado como mapeo-hid-steam-controller.json.')
  }

  return (
    <section className="gemelo-hid-bloque">
      <div className="gemelo-debug__head">
        <h3 className="gemelo-debug__title">Aprendizaje</h3>
        <span className="gemelo-debug__hint">
          {activo ? `${Math.min(paso + 1, total)}/${total}` : 'paso a paso'}
        </span>
      </div>

      {!activo ? (
        <>
          <p className="gemelo-hid-nota">
            El asistente te pedirá pulsar cada control. Compara el informe con
            el reposo y guarda el byte y el bit que cambian. Al terminar, el
            modelo iluminará los controles con ese mapeo.
          </p>

          <label className="gemelo-hid-opcion">
            <input
              type="checkbox"
              checked={ladoActivo === 0}
              onChange={(evento) =>
                setLadoActivo(evento.target.checked ? 0 : 1)
              }
            />
            El bit se apaga al pulsar (activo a 0)
          </label>

          <div className="gemelo-hid-acciones">
            <button
              type="button"
              className="gemelo-boton gemelo-boton--primario"
              onClick={iniciar}
              disabled={!dispositivo || informes.length === 0}
            >
              Iniciar aprendizaje
            </button>
            <button
              type="button"
              className="gemelo-boton"
              onClick={guardar}
              disabled={Object.keys(mapeo.botones).length === 0}
            >
              Descargar JSON
            </button>
          </div>

          {(!dispositivo || informes.length === 0) && (
            <p className="gemelo-hid-nota">
              Conecta el dispositivo por HID y pulsa algún botón para que
              lleguen informes.
            </p>
          )}
        </>
      ) : fase === 'fin' ? (
        <>
          <p className="gemelo-hid-paso">
            Aprendizaje completado. Hay{' '}
            <strong>{Object.keys(mapeo.botones).length}</strong> controles en el
            mapeo.
          </p>

          <div className="gemelo-hid-acciones">
            <button
              type="button"
              className="gemelo-boton gemelo-boton--primario"
              onClick={guardar}
            >
              Descargar mapeo JSON
            </button>
            <button
              type="button"
              className="gemelo-boton"
              onClick={iniciar}
            >
              Repetir
            </button>
            <button
              type="button"
              className="gemelo-boton"
              onClick={cancelar}
            >
              Cerrar
            </button>
          </div>
        </>
      ) : (
        <>
          <div
            className="gemelo-hid-progreso"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={total}
            aria-valuenow={paso + 1}
          >
            <span style={{ width: `${((paso + 1) / total) * 100}%` }} />
          </div>

          <p className="gemelo-hid-paso">
            Pulsa <strong>{control?.nombre}</strong>
            {fase === 'reposo' && (
              <span className="gemelo-hid-paso__sub">
                Suelta todos los controles y captura el reposo.
              </span>
            )}
          </p>

          {fase === 'reposo' && (
            <div className="gemelo-hid-acciones">
              <button
                type="button"
                className="gemelo-boton gemelo-boton--primario"
                onClick={capturarReposo}
              >
                Capturar reposo
              </button>
              <button
                type="button"
                className="gemelo-boton"
                onClick={cancelar}
              >
                Cancelar
              </button>
            </div>
          )}

          {fase === 'escuchando' && (
            <>
              <p className="gemelo-hid-nota">
                Escuchando el informe{' '}
                <code>
                  0x{(baseInforme ?? 0).toString(16).toUpperCase()}
                </code>
                . Pulsa y suelta el control.
              </p>
              <div className="gemelo-hid-acciones">
                <button
                  type="button"
                  className="gemelo-boton"
                  onClick={reiniciarPaso}
                >
                  Volver a capturar reposo
                </button>
                <button
                  type="button"
                  className="gemelo-boton"
                  onClick={cancelar}
                >
                  Cancelar
                </button>
              </div>
            </>
          )}

          {fase === 'detectado' && (
            <>
              <p className="gemelo-hid-nota">
                Bits detectados en el informe{' '}
                <code>
                  0x{(baseInforme ?? 0).toString(16).toUpperCase()}
                </code>
                . Elige el que corresponda a <strong>{control?.nombre}</strong>.
              </p>

              <div className="gemelo-hid-candidatos" role="radiogroup">
                {candidatos.map((candidato, indice) => (
                  <label
                    key={`${candidato.byte}:${candidato.bit}`}
                    className={`gemelo-hid-candidato ${
                      indice === seleccion ? 'is-sel' : ''
                    }`}
                  >
                    <input
                      type="radio"
                      name="candidato-hid"
                      checked={indice === seleccion}
                      onChange={() => setSeleccion(indice)}
                    />
                    <span>
                      Byte <strong>{candidato.byte}</strong> · bit{' '}
                      <strong>{candidato.bit}</strong>
                    </span>
                    <code>
                      {candidato.antes} → {candidato.ahora}
                    </code>
                  </label>
                ))}
              </div>

              <div className="gemelo-hid-acciones">
                <button
                  type="button"
                  className="gemelo-boton gemelo-boton--primario"
                  onClick={confirmar}
                >
                  Confirmar y seguir
                </button>
                <button
                  type="button"
                  className="gemelo-boton"
                  onClick={reiniciarPaso}
                >
                  Repetir
                </button>
                <button
                  type="button"
                  className="gemelo-boton"
                  onClick={avanzar}
                >
                  Omitir
                </button>
              </div>
            </>
          )}
        </>
      )}

      {mensaje && (
        <p className="gemelo-hid-aviso gemelo-hid-aviso--info" role="status">
          {mensaje}
        </p>
      )}
    </section>
  )
}
