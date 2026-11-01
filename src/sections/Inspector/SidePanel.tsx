import { useEffect, useMemo, useRef, useState } from 'react'
import type { GrupoZona, ZonaMando } from '../../data/zones'

export type PuntoCalibracion = [number, number, number]

type SidePanelProps = {
  zonas: ZonaMando[]
  seleccionada: ZonaMando | null
  siguiente: ZonaMando | null
  calibrando: boolean
  puntos: PuntoCalibracion[]
  onSeleccionar: (zona: ZonaMando) => void
  onCerrar: () => void
  onSiguiente: () => void
  onAlternarCalibracion: () => void
  onLimpiarPuntos: () => void
}

type FiltroGrupo = GrupoZona | 'todos'

const GRUPOS: { id: GrupoZona; nombre: string }[] = [
  { id: 'sticks', nombre: 'Sticks' },
  { id: 'trackpads', nombre: 'Trackpads' },
  { id: 'frontales', nombre: 'Botones frontales' },
  { id: 'bumpers', nombre: 'Bumpers' },
  { id: 'gatillos', nombre: 'Gatillos' },
  { id: 'traseros', nombre: 'Botones traseros' },
]

const NOMBRE_GRUPO = new Map(GRUPOS.map((grupo) => [grupo.id, grupo.nombre]))

function formatearValor(valor: number) {
  return Number.isInteger(valor) ? String(valor) : valor.toFixed(1)
}

function formatearPunto(punto: PuntoCalibracion) {
  return punto.map(formatearValor).join(', ')
}

/** Búsqueda tolerante a mayúsculas y tildes. */
function normalizar(texto: string) {
  return texto
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
}

/** Panel lateral: leyenda de zonas, ficha del control o modo calibración. */
export default function SidePanel({
  zonas,
  seleccionada,
  siguiente,
  calibrando,
  puntos,
  onSeleccionar,
  onCerrar,
  onSiguiente,
  onAlternarCalibracion,
  onLimpiarPuntos,
}: SidePanelProps) {
  const [copiada, setCopiada] = useState<number | null>(null)
  const [busqueda, setBusqueda] = useState('')
  const [filtro, setFiltro] = useState<FiltroGrupo>('todos')
  const temporizador = useRef<number | null>(null)

  useEffect(() => {
    return () => {
      if (temporizador.current !== null) {
        window.clearTimeout(temporizador.current)
      }
    }
  }, [])

  const consulta = normalizar(busqueda)

  const filtradas = useMemo(() => {
    return zonas.filter((zona) => {
      if (filtro !== 'todos' && zona.grupo !== filtro) return false
      if (!consulta) return true

      const texto = normalizar(
        `${zona.nombre} ${zona.descripcion} ${zona.tipo} ${zona.uso}`,
      )
      return texto.includes(consulta)
    })
  }, [zonas, filtro, consulta])

  const hayFiltro = consulta.length > 0 || filtro !== 'todos'

  const limpiarFiltros = () => {
    setBusqueda('')
    setFiltro('todos')
  }

  const copiarPunto = async (punto: PuntoCalibracion, indice: number) => {
    const texto = `posicion: [${formatearPunto(punto)}],`

    try {
      await navigator.clipboard.writeText(texto)
      setCopiada(indice)

      if (temporizador.current !== null) {
        window.clearTimeout(temporizador.current)
      }

      temporizador.current = window.setTimeout(() => setCopiada(null), 1600)
    } catch {
      // Si el navegador bloquea el portapapeles, el valor sigue disponible
      // en la consola y en el panel flotante de la escena.
      console.log(texto)
    }
  }

  const titulo = calibrando
    ? 'Calibración'
    : seleccionada
      ? 'Ficha del control'
      : 'Zonas del mando'

  return (
    <aside className="inspector-panel">
      <header className="inspector-panel__header">
        <div>
          <p className="inspector-panel__eyebrow">Inspector</p>
          <h2 className="inspector-panel__title">{titulo}</h2>
          <p className="inspector-panel__subtitle">
            {calibrando
              ? 'Coloca los puntos con precisión'
              : seleccionada
                ? NOMBRE_GRUPO.get(seleccionada.grupo)
                : `${zonas.length} puntos interactivos`}
          </p>
        </div>

        <button
          type="button"
          className="inspector-panel__mode"
          aria-pressed={calibrando}
          onClick={onAlternarCalibracion}
        >
          <kbd>C</kbd>
          {calibrando ? 'Salir' : 'Calibrar'}
        </button>
      </header>

      {calibrando ? (
        <div className="inspector-calib">
          <p className="inspector-calib__hint">
            Haz clic sobre cualquier punto del modelo. La posición 3D se
            imprimirá en la consola y aparecerá en el panel flotante sobre la
            escena.
          </p>

          <div className="inspector-calib__formula">
            <span className="inspector-panel__muted">
              {'// src/data/zones.ts'}
            </span>
            <code>posicion: [x, y, z],</code>
          </div>

          <div className="inspector-calib__head">
            <h3 className="inspector-calib__title">Puntos capturados</h3>
            {puntos.length > 0 && (
              <button
                type="button"
                className="inspector-panel__link"
                onClick={onLimpiarPuntos}
              >
                Limpiar
              </button>
            )}
          </div>

          {puntos.length === 0 ? (
            <p className="inspector-calib__empty">
              Todavía no hay puntos. Pulsa <kbd>C</kbd> para salir del modo
              calibración.
            </p>
          ) : (
            <ul className="inspector-calib__list">
              {[...puntos].reverse().map((punto, indice) => {
                const numero = puntos.length - indice
                const posicion = numero - 1

                return (
                  <li key={`${numero}-${punto.join('-')}`}>
                    <button
                      type="button"
                      className="inspector-calib__point"
                      onClick={() => copiarPunto(punto, posicion)}
                      title="Copiar posición"
                    >
                      <span className="inspector-calib__index">
                        {String(numero).padStart(2, '0')}
                      </span>
                      <code>[{formatearPunto(punto)}]</code>
                      <span className="inspector-calib__copy">
                        {copiada === posicion ? 'Copiado' : 'Copiar'}
                      </span>
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      ) : seleccionada ? (
        <div
          key={seleccionada.id}
          className="inspector-ficha"
          role="region"
          aria-live="polite"
          aria-label={`Ficha de ${seleccionada.nombre}`}
          data-inspector-anchor
        >
          <div className="inspector-ficha__top">
            <span
              className={`inspector-tag inspector-tag--${seleccionada.grupo}`}
            >
              {NOMBRE_GRUPO.get(seleccionada.grupo)}
            </span>

            <button
              type="button"
              className="inspector-ficha__close"
              onClick={onCerrar}
              aria-label="Cerrar ficha"
            >
              ×
            </button>
          </div>

          <h3 className="inspector-ficha__title">{seleccionada.nombre}</h3>
          <p className="inspector-ficha__text">{seleccionada.descripcion}</p>

          <dl className="inspector-ficha__specs">
            <div>
              <dt>Tipo</dt>
              <dd>{seleccionada.tipo}</dd>
            </div>
            <div>
              <dt>Recorrido</dt>
              <dd>{seleccionada.recorrido}</dd>
            </div>
            <div>
              <dt>Uso habitual</dt>
              <dd>{seleccionada.uso}</dd>
            </div>
          </dl>

          <div className="inspector-ficha__position">
            <span className="inspector-ficha__position-label">
              Posición (mm)
            </span>
            <dl className="inspector-ficha__data">
              <div>
                <dt>X</dt>
                <dd>{formatearValor(seleccionada.posicion[0])}</dd>
              </div>
              <div>
                <dt>Y</dt>
                <dd>{formatearValor(seleccionada.posicion[1])}</dd>
              </div>
              <div>
                <dt>Z</dt>
                <dd>{formatearValor(seleccionada.posicion[2])}</dd>
              </div>
            </dl>
          </div>

          <p className="inspector-ficha__hint">
            La cámara está centrada en este control. Arrastra para orbitar
            alrededor o pasa al siguiente con la tecla <kbd>N</kbd>.
          </p>

          <button
            type="button"
            className="inspector-ficha__next"
            onClick={onSiguiente}
            disabled={!siguiente}
          >
            <span className="inspector-ficha__next-text">
              <small>Siguiente zona</small>
              <strong>{siguiente?.nombre ?? 'Fin del recorrido'}</strong>
            </span>
            <span className="inspector-ficha__next-key">
              <kbd>N</kbd>
              <span aria-hidden="true">→</span>
            </span>
          </button>

          <button
            type="button"
            className="inspector-button"
            onClick={onCerrar}
          >
            Volver a la lista
          </button>
        </div>
      ) : (
        <div className="inspector-list">
          <p className="inspector-list__intro">
            Busca un control o filtra por categoría. La cámara volará hasta la
            zona que elijas.
          </p>

          <div className="inspector-search">
            <span className="inspector-search__icon" aria-hidden="true">
              ⌕
            </span>
            <input
              type="search"
              className="inspector-search__input"
              value={busqueda}
              placeholder="Buscar control…"
              aria-label="Buscar zona del mando"
              onChange={(evento) => setBusqueda(evento.target.value)}
            />
            {busqueda && (
              <button
                type="button"
                className="inspector-search__clear"
                aria-label="Limpiar búsqueda"
                onClick={() => setBusqueda('')}
              >
                ×
              </button>
            )}
          </div>

          <div
            className="inspector-filtros"
            role="group"
            aria-label="Filtrar zonas por categoría"
          >
            <button
              type="button"
              className="inspector-filtro"
              data-grupo="todos"
              aria-pressed={filtro === 'todos'}
              onClick={() => setFiltro('todos')}
            >
              Todos
              <span className="inspector-filtro__count">{zonas.length}</span>
            </button>

            {GRUPOS.map((grupo) => {
              const total = zonas.filter(
                (zona) => zona.grupo === grupo.id,
              ).length

              return (
                <button
                  key={grupo.id}
                  type="button"
                  className="inspector-filtro"
                  data-grupo={grupo.id}
                  aria-pressed={filtro === grupo.id}
                  onClick={() => setFiltro(grupo.id)}
                >
                  {grupo.nombre}
                  <span className="inspector-filtro__count">{total}</span>
                </button>
              )
            })}
          </div>

          <div className="inspector-list__meta">
            <span>
              {filtradas.length} de {zonas.length} controles
            </span>
            {hayFiltro && (
              <button
                type="button"
                className="inspector-panel__link"
                onClick={limpiarFiltros}
              >
                Quitar filtros
              </button>
            )}
          </div>

          {filtradas.length === 0 ? (
            <div className="inspector-list__empty">
              <p>No hay controles que coincidan.</p>
              <button
                type="button"
                className="inspector-panel__link"
                onClick={limpiarFiltros}
              >
                Ver todos los controles
              </button>
            </div>
          ) : (
            GRUPOS.map((grupo) => {
              const zonasGrupo = filtradas.filter(
                (zona) => zona.grupo === grupo.id,
              )
              if (zonasGrupo.length === 0) return null

              return (
                <section className="inspector-list__group" key={grupo.id}>
                  <h3 className="inspector-list__group-title">
                    {grupo.nombre}
                  </h3>

                  <ul className="inspector-list__items">
                    {zonasGrupo.map((zona) => (
                      <li key={zona.id}>
                        <button
                          type="button"
                          className="inspector-list__item"
                          data-grupo={zona.grupo}
                          onClick={() => onSeleccionar(zona)}
                        >
                          <span className="inspector-list__dot" />
                          <span className="inspector-list__name">
                            {zona.nombre}
                          </span>
                          <span className="inspector-list__arrow">→</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </section>
              )
            })
          )}
        </div>
      )}

      <p className="inspector-panel__hint">
        <kbd>N</kbd> siguiente · <kbd>T</kbd> tour · <kbd>C</kbd> calibración ·{' '}
        <kbd>Esc</kbd> cerrar
      </p>
    </aside>
  )
}
