import { useEffect, useState } from 'react'
import {
  claveDispositivo,
  idHex,
  nombreDispositivo,
} from './hid'
import type { MapeoHID } from './mapeoHID'
import type { EstadoHID } from './useHID'
import SelectorFuente, { type FuenteMando } from './SelectorFuente'
import VisorInformesHID from './VisorInformesHID'
import AprendizajeHID from './AprendizajeHID'
import EditorMapeoHID from './EditorMapeoHID'
import IconoMando from './IconoMando'

type PanelHIDProps = {
  fuente: FuenteMando
  onCambioFuente: (fuente: FuenteMando) => void
  hidDisponible: boolean
  gamepadDisponible: boolean
  hid: EstadoHID
  mapeo: MapeoHID
  onMapeo: (mapeo: MapeoHID) => void
}

/** Panel de depuración para el modo WebHID. */
export default function PanelHID({
  fuente,
  onCambioFuente,
  hidDisponible,
  gamepadDisponible,
  hid,
  mapeo,
  onMapeo,
}: PanelHIDProps) {
  const activo = hid.dispositivoActivo
  const [sinInformes, setSinInformes] = useState(false)

  useEffect(() => {
    if (!activo || hid.informes.length > 0) {
      setSinInformes(false)
      return
    }

    const temporizador = window.setTimeout(() => setSinInformes(true), 2500)
    return () => window.clearTimeout(temporizador)
  }, [activo, hid.informes.length])

  const estado = !hid.soportado
    ? 'WebHID no disponible'
    : hid.error
      ? 'Revisar conexión'
      : activo
        ? 'HID conectado'
        : 'Sin dispositivo'

  const claseEstado = !hid.soportado || hid.error
    ? 'is-warn'
    : activo
      ? 'is-on'
      : 'is-off'

  return (
    <aside className="gemelo-panel">
      <header className="gemelo-panel__header">
        <div>
          <p className="gemelo-panel__eyebrow">Depuración</p>
          <h2 className="gemelo-panel__title">Entrada HID</h2>
        </div>

        <span className={`gemelo-panel__status ${claseEstado}`}>
          <span className="gemelo-panel__status-dot" />
          {estado}
        </span>
      </header>

      <div className="gemelo-panel__body">
        <SelectorFuente
          fuente={fuente}
          onCambio={onCambioFuente}
          hidDisponible={hidDisponible}
          gamepadDisponible={gamepadDisponible}
        />

        {!hid.soportado ? (
          <div className="gemelo-panel__empty">
            <span className="gemelo-panel__empty-icon">
              <IconoMando size={30} />
            </span>

            <h3 className="gemelo-panel__empty-title">
              WebHID no está disponible
            </h3>
            <p>
              Este navegador no expone <code>navigator.hid</code>. WebHID
              funciona en Chrome y Edge de escritorio, en HTTPS o en{' '}
              <code>localhost</code>. También puedes seguir usando el modo
              Gamepad API.
            </p>
          </div>
        ) : (
          <>
            <section className="gemelo-hid-bloque">
              <div className="gemelo-debug__head">
                <h3 className="gemelo-debug__title">Dispositivo</h3>
                <button
                  type="button"
                  className="gemelo-boton gemelo-boton--primario gemelo-boton--mini"
                  onClick={() => void hid.conectarPorHID()}
                  disabled={hid.solicitando || hid.conectando}
                >
                  {hid.conectando
                    ? 'Abriendo…'
                    : hid.solicitando
                      ? 'Esperando…'
                      : 'Conectar por HID'}
                </button>
              </div>

              <p className="gemelo-hid-nota">
                Pide permiso para dispositivos Valve (
                <code>vendorId 0x28DE</code>). Si usas el puck inalámbrico,
                enciende el mando y conéctalo antes de pulsar el botón.
              </p>

              {hid.error && (
                <div className="gemelo-hid-aviso gemelo-hid-aviso--error">
                  <p>{hid.error}</p>
                  <button
                    type="button"
                    className="gemelo-hid-aviso__cerrar"
                    onClick={hid.limpiarError}
                    aria-label="Cerrar aviso"
                  >
                    ×
                  </button>
                </div>
              )}

              {hid.dispositivos.length === 0 ? (
                <p className="gemelo-hid-nota">
                  Todavía no hay dispositivos autorizados. Pulsa «Conectar por
                  HID» y elige el Steam Controller o su receptor en el diálogo
                  del navegador.
                </p>
              ) : (
                <ul className="gemelo-hid-dispositivos">
                  {hid.dispositivos.map((dispositivo) => {
                    const esActivo =
                      activo !== null &&
                      claveDispositivo(activo) ===
                        claveDispositivo(dispositivo)

                    return (
                      <li
                        key={claveDispositivo(dispositivo)}
                        className={`gemelo-hid-dispositivo ${
                          esActivo ? 'is-activo' : ''
                        }`}
                      >
                        <div className="gemelo-hid-dispositivo__datos">
                          <p className="gemelo-hid-dispositivo__nombre">
                            {nombreDispositivo(dispositivo)}
                          </p>
                          <p className="gemelo-hid-dispositivo__meta">
                            {idHex(dispositivo.vendorId)}:
                            {idHex(dispositivo.productId)} ·{' '}
                            {dispositivo.opened ? 'abierto' : 'cerrado'}
                          </p>
                        </div>

                        <button
                          type="button"
                          className="gemelo-boton gemelo-boton--mini"
                          onClick={() =>
                            esActivo
                              ? void hid.cerrarDispositivo(dispositivo)
                              : void hid.abrirDispositivo(dispositivo)
                          }
                          disabled={hid.conectando}
                        >
                          {esActivo ? 'Desconectar' : 'Conectar'}
                        </button>
                      </li>
                    )
                  })}
                </ul>
              )}

              {activo && sinInformes && (
                <p className="gemelo-hid-aviso gemelo-hid-aviso--info">
                  El dispositivo está abierto pero no llegan informes. Si Steam
                  está en ejecución, ciérralo o desactiva Steam Input: puede
                  tener el mando ocupado en exclusiva.
                </p>
              )}

              {activo && (
                <div className="gemelo-panel__chips">
                  <span className="gemelo-chip gemelo-chip--ok">
                    {idHex(activo.vendorId)}:{idHex(activo.productId)}
                  </span>
                  {activo.manufacturerName && (
                    <span className="gemelo-chip">
                      {activo.manufacturerName}
                    </span>
                  )}
                  <span className="gemelo-chip">
                    {hid.informes.length} informes en búfer
                  </span>
                </div>
              )}
            </section>

            <VisorInformesHID
              informes={hid.informes}
              activo={activo !== null}
              onLimpiar={hid.limpiarInformes}
            />

            <AprendizajeHID
              dispositivo={activo}
              informes={hid.informes}
              mapeo={mapeo}
              onMapeo={onMapeo}
            />

            <EditorMapeoHID mapeo={mapeo} onMapeo={onMapeo} />
          </>
        )}

        <p className="gemelo-panel__footnote">
          WebHID solo se activa tras pulsar «Conectar por HID». Si el
          dispositivo aparece pero no se abre, cierra Steam y desactiva Steam
          Input: puede estar reclamándolo en exclusiva. Los informes y el
          mapeo se quedan en este navegador.
        </p>
      </div>
    </aside>
  )
}
