import { useCallback, useMemo, useState } from 'react'
import EscenaGemelo from './EscenaGemelo'
import IconoMando from './IconoMando'
import PanelDepuracion from './PanelDepuracion'
import PanelHID from './PanelHID'
import type { FuenteMando } from './SelectorFuente'
import { esWebHIDSoportado } from './hid'
import {
  cargarMapeoLocal,
  crearMandoDesdeHID,
  guardarMapeoLocal,
  type MapeoHID,
} from './mapeoHID'
import { useGamepad } from './useGamepad'
import { useHID } from './useHID'
import './Gemelo.css'

/** Gemelo digital: visualiza en 3D la entrada de un mando conectado. */
export default function Gemelo() {
  const gamepad = useGamepad()
  const hid = useHID()
  const [fuente, setFuente] = useState<FuenteMando>(() =>
    esWebHIDSoportado() ? 'hid' : 'gamepad',
  )
  const [mapeo, setMapeo] = useState<MapeoHID>(cargarMapeoLocal)

  const actualizarMapeo = useCallback((nuevo: MapeoHID) => {
    setMapeo(nuevo)
    guardarMapeoLocal(nuevo)
  }, [])

  const mandoHID = useMemo(
    () => crearMandoDesdeHID(mapeo, hid.ultimos),
    [mapeo, hid.ultimos],
  )

  const mandoVisible = fuente === 'hid' ? mandoHID : gamepad.mandoActivo
  const conectadoHID = hid.dispositivoActivo !== null

  const enUso = useMemo(() => {
    if (!mandoVisible) return false

    return (
      mandoVisible.buttons.some((boton) => boton.pressed) ||
      mandoVisible.axes.some((eje) => Math.abs(eje) > 0.18)
    )
  }, [mandoVisible])

  let estado: string
  let claseEstado: string

  if (fuente === 'hid') {
    if (!hid.soportado) {
      estado = 'WebHID no disponible'
      claseEstado = 'is-warn'
    } else if (hid.error) {
      estado = 'Revisar conexión HID'
      claseEstado = 'is-warn'
    } else if (conectadoHID) {
      estado = enUso ? 'HID en uso' : 'HID conectado'
      claseEstado = 'is-on'
    } else {
      estado = 'Sin dispositivo HID'
      claseEstado = 'is-off'
    }
  } else if (!gamepad.soportado) {
    estado = 'API no disponible'
    claseEstado = 'is-warn'
  } else if (gamepad.mandoActivo) {
    estado = enUso ? 'Mando en uso' : 'Mando conectado'
    claseEstado = 'is-on'
  } else {
    estado = 'Sin mando'
    claseEstado = 'is-off'
  }

  const mostrarVacio =
    fuente === 'hid' ? !conectadoHID : !gamepad.mandoActivo

  const tituloVacio =
    fuente === 'hid'
      ? !hid.soportado
        ? 'WebHID no disponible'
        : hid.error
          ? 'No se pudo conectar por HID'
          : 'Conecta el Steam Controller por HID'
      : gamepad.soportado
        ? 'No hay ningún mando conectado'
        : 'Gamepad API no disponible'

  const textoVacio =
    fuente === 'hid'
      ? !hid.soportado
        ? 'Este navegador no permite acceder a dispositivos HID. Prueba con Chrome o Edge de escritorio, en HTTPS o localhost.'
        : (hid.error ??
          'Pulsa «Conectar por HID» en el panel, elige el mando o su puck y acepta el permiso del navegador.')
      : gamepad.soportado
        ? 'Conecta un mando por USB o Bluetooth y pulsa cualquier botón para que el navegador lo detecte.'
        : 'Este navegador no permite leer mandos. Prueba con Chrome, Edge o Firefox actualizados.'

  return (
    <section className="gemelo">
      <div className="gemelo__stage">
        <header className="gemelo__header">
          <p className="gemelo__eyebrow">03 / Gemelo digital</p>
          <h1 className="gemelo__title">Mando en vivo</h1>
          <p className="gemelo__subtitle">
            Pulsa cualquier control y mira cómo responde el modelo.
          </p>

          <span className={`gemelo__status ${claseEstado}`}>
            <span className="gemelo__status-dot" />
            {estado}
          </span>
        </header>

        <div className="gemelo__viewer">
          <EscenaGemelo mando={mandoVisible} />
        </div>

        {mostrarVacio && (
          <div className="gemelo__empty" role="status">
            <span className="gemelo__empty-icon">
              <IconoMando size={34} />
            </span>

            <div>
              <strong className="gemelo__empty-title">{tituloVacio}</strong>
              <p className="gemelo__empty-text">{textoVacio}</p>
            </div>
          </div>
        )}

        <footer className="gemelo__footer">
          <span>Arrastra para rotar · Rueda para hacer zoom</span>
          <span className="gemelo__credit">
            Modelo: Valve Corporation · CC BY-NC-SA 4.0
          </span>
        </footer>
      </div>

      {fuente === 'hid' ? (
        <PanelHID
          fuente={fuente}
          onCambioFuente={setFuente}
          hidDisponible={hid.soportado}
          gamepadDisponible={gamepad.soportado}
          hid={hid}
          mapeo={mapeo}
          onMapeo={actualizarMapeo}
        />
      ) : (
        <PanelDepuracion
          soportado={gamepad.soportado}
          mandos={gamepad.mandos}
          mando={gamepad.mandoActivo}
          indiceActivo={gamepad.indiceActivo}
          onSeleccionar={gamepad.seleccionarMando}
          fuente={fuente}
          onCambioFuente={setFuente}
          hidDisponible={hid.soportado}
        />
      )}
    </section>
  )
}
