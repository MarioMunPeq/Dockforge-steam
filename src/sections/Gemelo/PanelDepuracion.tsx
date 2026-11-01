import {
  etiquetaBoton,
  etiquetaEje,
  zonaDeBoton,
} from './mapeo'
import type { MandoLectura } from './useGamepad'
import SelectorFuente, { type FuenteMando } from './SelectorFuente'
import IconoMando from './IconoMando'

type PanelDepuracionProps = {
  soportado: boolean
  mandos: MandoLectura[]
  mando: MandoLectura | null
  indiceActivo: number | null
  onSeleccionar: (indice: number) => void
  fuente: FuenteMando
  onCambioFuente: (fuente: FuenteMando) => void
  hidDisponible: boolean
}

/** Panel lateral con el estado del mando y todos sus botones y ejes. */
export default function PanelDepuracion({
  soportado,
  mandos,
  mando,
  indiceActivo,
  onSeleccionar,
  fuente,
  onCambioFuente,
  hidDisponible,
}: PanelDepuracionProps) {
  const enUso =
    mando !== null &&
    (mando.buttons.some((boton) => boton.pressed) ||
      mando.axes.some((eje) => Math.abs(eje) > 0.18))

  const estado = !soportado
    ? 'API no disponible'
    : mando
      ? enUso
        ? 'En uso'
        : 'Conectado'
      : 'Esperando mando'

  const claseEstado = !soportado
    ? 'is-warn'
    : mando
      ? 'is-on'
      : 'is-off'

  return (
    <aside className="gemelo-panel">
      <header className="gemelo-panel__header">
        <div>
          <p className="gemelo-panel__eyebrow">Depuración</p>
          <h2 className="gemelo-panel__title">Entrada del mando</h2>
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
          gamepadDisponible={soportado}
        />

        {!mando ? (
          <div className="gemelo-panel__empty">
            <span className="gemelo-panel__empty-icon">
              <IconoMando size={30} />
            </span>

            <h3 className="gemelo-panel__empty-title">
              {soportado
                ? 'No hay ningún mando conectado'
                : 'Gamepad API no disponible'}
            </h3>

            {soportado ? (
              <>
                <p>
                  Conecta un mando por USB o Bluetooth y pulsa cualquier botón
                  o mueve un stick.
                </p>
                <ul className="gemelo-panel__tips">
                  <li>
                    El navegador solo expone el mando después de una
                    interacción.
                  </li>
                  <li>
                    La API funciona en <code>localhost</code> o en HTTPS.
                  </li>
                  <li>
                    Cuando lo detecte, aquí aparecerán todos sus botones y ejes
                    en tiempo real.
                  </li>
                  <li>
                    Si el Steam Controller inalámbrico con puck no aparece,
                    cambia a la fuente <strong>WebHID</strong>.
                  </li>
                </ul>
              </>
            ) : (
              <p>
                Este navegador no implementa{' '}
                <code>navigator.getGamepads()</code>. Prueba con Chrome, Edge o
                Firefox actualizados.
              </p>
            )}
          </div>
        ) : (
          <>
            <section className="gemelo-panel__pad" aria-label="Mando conectado">
              <p className="gemelo-panel__pad-name">{mando.id}</p>

              <div className="gemelo-panel__chips">
                <span className="gemelo-chip">Índice {mando.index}</span>
                <span
                  className={`gemelo-chip ${
                    mando.mapping === 'standard'
                      ? 'gemelo-chip--ok'
                      : 'gemelo-chip--warn'
                  }`}
                >
                  {mando.mapping === 'standard'
                    ? 'Mapeo estándar'
                    : mando.mapping
                      ? `Mapeo ${mando.mapping}`
                      : 'Sin mapeo estándar'}
                </span>
                <span className="gemelo-chip">
                  {mando.buttons.length} botones
                </span>
                <span className="gemelo-chip">{mando.axes.length} ejes</span>
              </div>

              {mando.mapping !== 'standard' && (
                <p className="gemelo-panel__warning">
                  El navegador no aplica el mapeo estándar: los índices pueden
                  variar. Usa esta lista para ajustar <code>mapeo.ts</code>.
                </p>
              )}

              {mandos.length > 1 && (
                <label className="gemelo-panel__selector">
                  <span>Mando inspeccionado</span>
                  <select
                    value={indiceActivo ?? ''}
                    onChange={(evento) =>
                      onSeleccionar(Number(evento.target.value))
                    }
                  >
                    {mandos.map((opcion) => (
                      <option key={opcion.index} value={opcion.index}>
                        #{opcion.index} · {opcion.id}
                      </option>
                    ))}
                  </select>
                </label>
              )}
            </section>

            <section className="gemelo-debug">
              <div className="gemelo-debug__head">
                <h3 className="gemelo-debug__title">Botones</h3>
                <span className="gemelo-debug__hint">P = pulsado · T = tocado</span>
              </div>

              <div className="gemelo-debug__list" role="list">
                {mando.buttons.map((boton, indice) => {
                  const zona = zonaDeBoton(indice)

                  return (
                    <div
                      key={indice}
                      className={`gemelo-fila ${
                        boton.pressed ? 'gemelo-fila--on' : ''
                      }`}
                      role="listitem"
                    >
                      <span className="gemelo-fila__index">
                        {String(indice).padStart(2, '0')}
                      </span>

                      <span className="gemelo-fila__name">
                        {etiquetaBoton(indice)}
                        {!zona && (
                          <span className="gemelo-fila__tag">sin zona</span>
                        )}
                      </span>

                      <span className="gemelo-fila__bar" aria-hidden="true">
                        <span
                          style={{
                            transform: `scaleX(${Math.min(1, Math.max(0, boton.value))})`,
                          }}
                        />
                      </span>

                      <span
                        className={`gemelo-fila__flag ${
                          boton.pressed ? 'is-on' : ''
                        }`}
                        title="Pulsado"
                      >
                        P
                      </span>
                      <span
                        className={`gemelo-fila__flag ${
                          boton.touched || boton.pressed ? 'is-on' : ''
                        }`}
                        title="Tocado"
                      >
                        T
                      </span>

                      <code className="gemelo-fila__value">
                        {boton.value.toFixed(2)}
                      </code>
                    </div>
                  )
                })}
              </div>
            </section>

            <section className="gemelo-debug">
              <div className="gemelo-debug__head">
                <h3 className="gemelo-debug__title">Ejes</h3>
                <span className="gemelo-debug__hint">−1.0 … +1.0</span>
              </div>

              <div className="gemelo-debug__list" role="list">
                {mando.axes.map((valor, indice) => {
                  const activo = Math.abs(valor) > 0.12
                  const posicion = Math.min(1, Math.max(-1, valor))

                  return (
                    <div
                      key={indice}
                      className={`gemelo-eje ${activo ? 'is-on' : ''}`}
                      role="listitem"
                    >
                      <span className="gemelo-eje__index">
                        {String(indice).padStart(2, '0')}
                      </span>
                      <span className="gemelo-eje__name">
                        {etiquetaEje(indice)}
                      </span>

                      <span className="gemelo-eje__track" aria-hidden="true">
                        <span className="gemelo-eje__center" />
                        <span
                          className="gemelo-eje__dot"
                          style={{ left: `${50 + posicion * 50}%` }}
                        />
                      </span>

                      <code className="gemelo-eje__value">
                        {valor.toFixed(3)}
                      </code>
                    </div>
                  )
                })}
              </div>
            </section>

            <p className="gemelo-panel__footnote">
              El mapeo botón → zona vive en{' '}
              <code>src/sections/Gemelo/mapeo.ts</code>. Si un botón no enciende
              nada, añade su índice a la zona correspondiente.
            </p>
          </>
        )}
      </div>
    </aside>
  )
}
