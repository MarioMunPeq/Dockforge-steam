export type FuenteMando = 'hid' | 'gamepad'

type SelectorFuenteProps = {
  fuente: FuenteMando
  onCambio: (fuente: FuenteMando) => void
  hidDisponible: boolean
  gamepadDisponible: boolean
}

/** Selector entre WebHID (Steam Controller por puck) y Gamepad API. */
export default function SelectorFuente({
  fuente,
  onCambio,
  hidDisponible,
  gamepadDisponible,
}: SelectorFuenteProps) {
  return (
    <div className="gemelo-fuente" role="tablist" aria-label="Fuente de entrada">
      <button
        type="button"
        role="tab"
        aria-selected={fuente === 'hid'}
        className={`gemelo-fuente__tab ${fuente === 'hid' ? 'is-activo' : ''}`}
        onClick={() => onCambio('hid')}
      >
        WebHID
        <span className="gemelo-fuente__nota">
          {hidDisponible ? 'Puck / USB' : 'No disponible'}
        </span>
      </button>

      <button
        type="button"
        role="tab"
        aria-selected={fuente === 'gamepad'}
        className={`gemelo-fuente__tab ${
          fuente === 'gamepad' ? 'is-activo' : ''
        }`}
        onClick={() => onCambio('gamepad')}
      >
        Gamepad API
        <span className="gemelo-fuente__nota">
          {gamepadDisponible ? 'Navegador' : 'No disponible'}
        </span>
      </button>
    </div>
  )
}
