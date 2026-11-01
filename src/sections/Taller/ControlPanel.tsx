import type {
  PresetId,
  TallerParams,
  VistaTaller,
} from './dockParams'
import { PRESETS, nombrePreset } from './dockParams'
import type { AvisoImpresion } from './diagnostico'

type ControlPanelProps = {
  values: TallerParams
  onLiveChange: <K extends keyof TallerParams>(
    parametro: K,
    valor: TallerParams[K],
  ) => void
  onCommit: <K extends keyof TallerParams>(
    parametro: K,
    valor: TallerParams[K],
  ) => void
  onPreset: (id: PresetId) => void
  onReset: () => void
  onExport: () => void
  calculating: boolean
  exportable: boolean
  exportado: boolean
  avisos: AvisoImpresion[]
  aviso: string | null
  modo: VistaTaller
}

type NumericKey = Exclude<keyof TallerParams, 'texto' | 'patas' | 'canalCable' | 'puckActivo' | 'puckPosicion' | 'preset'>

type Control = {
  key: NumericKey
  label: string
  min: number
  max: number
  step: number
  unit: string
  disabled?: boolean
}

function formatear(valor: number) {
  return Number.isInteger(valor) ? valor : valor.toFixed(1)
}

const BASE_CONTROLS: Control[] = [
  { key: 'ancho', label: 'Ancho', min: 120, max: 320, step: 5, unit: 'mm' },
  { key: 'fondo', label: 'Fondo', min: 100, max: 260, step: 5, unit: 'mm' },
  { key: 'grosor', label: 'Grosor', min: 6, max: 30, step: 1, unit: 'mm' },
  { key: 'redondeo', label: 'Redondeo', min: 0, max: 12, step: 0.5, unit: 'mm' },
  { key: 'inclinacion', label: 'Inclinación', min: 0, max: 90, step: 1, unit: '°' },
]

const HUECO_CONTROLS: Control[] = [
  { key: 'holgura', label: 'Holgura', min: 0, max: 10, step: 0.5, unit: 'mm' },
  { key: 'profundidad', label: 'Profundidad', min: 0, max: 14, step: 0.5, unit: 'mm' },
]

function controlesPuck(disabled: boolean): Control[] {
  return [
    { key: 'puckDistancia', label: 'Distancia al mando', min: 2, max: 40, step: 1, unit: 'mm', disabled },
    { key: 'puckHolgura', label: 'Holgura del puck', min: 0, max: 6, step: 0.5, unit: 'mm', disabled },
    { key: 'puckProfundidad', label: 'Profundidad del puck', min: 0, max: 10, step: 0.5, unit: 'mm', disabled },
  ]
}

function controlesCanal(disabled: boolean): Control[] {
  return [
    { key: 'canalAncho', label: 'Ancho del canal', min: 6, max: 24, step: 1, unit: 'mm', disabled },
    { key: 'canalAlto', label: 'Alto del canal', min: 2, max: 8, step: 0.5, unit: 'mm', disabled },
  ]
}

function controlesTexto(values: TallerParams): Control[] {
  const margen = 6

  return [
    {
      key: 'textoTamano',
      label: 'Tamaño',
      min: 4,
      max: 36,
      step: 1,
      unit: 'mm',
    },
    {
      key: 'textoRelieve',
      label: 'Relieve',
      min: 0.4,
      max: 3,
      step: 0.2,
      unit: 'mm',
    },
    {
      key: 'textoX',
      label: 'Posición X',
      min: Math.ceil(-values.ancho / 2 + margen),
      max: Math.floor(values.ancho / 2 - margen),
      step: 1,
      unit: 'mm',
    },
    {
      key: 'textoZ',
      label: 'Posición Z',
      min: Math.ceil(-values.fondo / 2 + margen),
      max: Math.floor(values.fondo / 2 - margen),
      step: 1,
      unit: 'mm',
    },
    {
      key: 'textoRotacion',
      label: 'Rotación',
      min: -180,
      max: 180,
      step: 5,
      unit: '°',
    },
  ]
}

/** Panel lateral con presets, parámetros, diagnóstico y exportación. */
export default function ControlPanel({
  values,
  onLiveChange,
  onCommit,
  onPreset,
  onReset,
  onExport,
  calculating,
  exportable,
  exportado,
  avisos,
  aviso,
  modo,
}: ControlPanelProps) {
  const slider = (control: Control) => {
    const valor = values[control.key] as number
    // El valor en vivo ya coincide con el slider al soltar, así que aquí
    // siempre se confirma: el padre evita repetir el CSG si no cambió nada.
    const commit = (nuevo: number) => {
      onCommit(control.key, nuevo as never)
    }

    return (
      <label
        className={`panel__control${
          control.disabled ? ' panel__control--off' : ''
        }`}
        key={control.key}
      >
        <span className="panel__row">
          <span className="panel__label">{control.label}</span>
          <span className="panel__value">
            {formatear(valor)}
            <small>{control.unit}</small>
          </span>
        </span>

        <input
          type="range"
          min={control.min}
          max={control.max}
          step={control.step}
          value={valor}
          disabled={control.disabled}
          onChange={(event) =>
            onLiveChange(control.key, Number(event.target.value) as never)
          }
          onPointerUp={(event) =>
            commit(Number(event.currentTarget.value))
          }
          onKeyUp={(event) => {
            if (event.key.startsWith('Arrow') || event.key === 'Home' || event.key === 'End') {
              commit(Number(event.currentTarget.value))
            }
          }}
          onBlur={(event) => commit(Number(event.currentTarget.value))}
        />
      </label>
    )
  }

  const toggle = (
    key: 'patas' | 'canalCable' | 'puckActivo',
    label: string,
    detalle: string,
  ) => (
    <label className="panel__toggle" key={key}>
      <span className="panel__toggleText">
        <span className="panel__label">{label}</span>
        <span className="panel__toggleHint">{detalle}</span>
      </span>
      <input
        type="checkbox"
        checked={values[key]}
        onChange={(event) =>
          onCommit(key, event.target.checked as never)
        }
      />
      <span className="panel__switch" aria-hidden="true" />
    </label>
  )

  const puckDeshabilitado = !values.puckActivo

  return (
    <aside className="panel" aria-busy={calculating}>
      <div className="panel__header">
        <div>
          <h2 className="panel__title">Parámetros</h2>
          <p className="panel__subtitle">
            Diseño {nombrePreset(values.preset).toLowerCase()}
          </p>
        </div>
        <button type="button" className="panel__reset" onClick={onReset}>
          Restablecer
        </button>
      </div>

      <div className="panel__controls">
        <section className="panel__group">
          <h3 className="panel__groupTitle">Presets de diseño</h3>
          <div className="panel__presets">
            {PRESETS.map((preset) => (
              <button
                key={preset.id}
                type="button"
                className={`panel__preset${
                  values.preset === preset.id ? ' panel__preset--activo' : ''
                }`}
                onClick={() => onPreset(preset.id)}
                title={preset.descripcion}
              >
                <span>{preset.nombre}</span>
                <small>{preset.descripcion}</small>
              </button>
            ))}
          </div>
        </section>

        <section className="panel__group">
          <h3 className="panel__groupTitle">Base</h3>
          <div className="panel__groupControls">
            {BASE_CONTROLS.map(slider)}
          </div>
        </section>

        <section className="panel__group">
          <h3 className="panel__groupTitle">Hueco del mando</h3>
          <div className="panel__groupControls">
            {HUECO_CONTROLS.map(slider)}
          </div>
        </section>

        <section className="panel__group">
          <h3 className="panel__groupTitle">Hueco del puck</h3>

          {toggle(
            'puckActivo',
            'Incluir puck',
            'Hueco propio con holgura independiente',
          )}

          <div className={`panel__puck${puckDeshabilitado ? ' panel__puck--off' : ''}`}>
            <span className="panel__miniLabel">Posición</span>
            <div className="panel__segmented" role="group" aria-label="Posición del puck">
              {(
                [
                  ['izquierda', 'Izquierda'],
                  ['derecha', 'Derecha'],
                  ['detras', 'Detrás'],
                ] as const
              ).map(([id, nombre]) => (
                <button
                  key={id}
                  type="button"
                  disabled={puckDeshabilitado}
                  className={
                    values.puckPosicion === id
                      ? 'panel__segment panel__segment--activo'
                      : 'panel__segment'
                  }
                  onClick={() => onCommit('puckPosicion', id)}
                >
                  {nombre}
                </button>
              ))}
            </div>

            {controlesPuck(puckDeshabilitado).map(slider)}
          </div>
        </section>

        <section className="panel__group">
          <h3 className="panel__groupTitle">Acabado</h3>

          {toggle(
            'patas',
            'Patas antideslizantes',
            'Cuatro alojamientos de Ø13 mm en la base',
          )}

          {toggle(
            'canalCable',
            'Canal para cable',
            'Ranura inferior que sale por detrás',
          )}

          <div className={`panel__canal${values.canalCable ? '' : ' panel__canal--off'}`}>
            {controlesCanal(!values.canalCable).map(slider)}
          </div>
        </section>

        <section className="panel__group">
          <h3 className="panel__groupTitle">Texto extruido</h3>
          <div className="panel__groupControls">
            <label className="panel__control">
              <span className="panel__row">
                <span className="panel__label">Texto</span>
                <span className="panel__value">
                  {values.texto.length}
                  <small>/20</small>
                </span>
              </span>
              <input
                className="panel__textInput"
                type="text"
                value={values.texto}
                maxLength={20}
                spellCheck={false}
                placeholder="STEAM"
                onChange={(event) => onLiveChange('texto', event.target.value)}
              />
            </label>

            {controlesTexto(values).map(slider)}
          </div>
        </section>
      </div>

      <div className="panel__actions">
        {aviso && (
          <p className="panel__warning" role="status">
            {aviso}
          </p>
        )}

        {avisos.length > 0 && (
          <ul className="panel__avisos">
            {avisos.map((item, indice) => (
              <li
                key={`${item.nivel}-${indice}`}
                className={`panel__aviso panel__aviso--${item.nivel}`}
              >
                <span className="panel__avisoIcon" aria-hidden="true">
                  {item.nivel === 'ok' ? '✓' : item.nivel === 'error' ? '×' : '!'}
                </span>
                {item.texto}
              </li>
            ))}
          </ul>
        )}

        <button
          type="button"
          className={`panel__export${
            exportado ? ' panel__export--ok' : ''
          }`}
          onClick={onExport}
          disabled={!exportable || calculating}
        >
          {exportado
            ? 'STL descargado'
            : calculating
              ? 'Calculando…'
              : 'Revisar y exportar STL'}
        </button>
      </div>

      <p className="panel__hint">
        {modo === 'seccion'
          ? 'Vista de corte: el plano atraviesa el centro del modelo.'
          : 'Escala real: 1 unidad = 1 mm. El CSG se recalcula al soltar cada control.'}
      </p>
    </aside>
  )
}
