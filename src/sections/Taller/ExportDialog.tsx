import type { TallerParams } from './dockParams'
import {
  calcularAjustesHueco,
  calcularAjustesPuck,
  nombrePreset,
} from './dockParams'
import type { AvisoImpresion } from './diagnostico'
import { nombreArchivo } from './exportStl'

type ExportDialogProps = {
  abierto: boolean
  params: TallerParams
  altoTotal: number
  avisos: AvisoImpresion[]
  onCerrar: () => void
  onConfirmar: () => void
}

function numero(valor: number) {
  return Math.round(valor * 10) / 10
}

/** Resumen previo a la descarga, con las medidas finales del STL. */
export default function ExportDialog({
  abierto,
  params,
  altoTotal,
  avisos,
  onCerrar,
  onConfirmar,
}: ExportDialogProps) {
  if (!abierto) return null

  const hueco = calcularAjustesHueco(params)
  const puck = calcularAjustesPuck(params)
  const posicionPuck =
    params.puckPosicion === 'detras'
      ? 'detrás'
      : params.puckPosicion === 'izquierda'
        ? 'izquierda'
        : 'derecha'

  return (
    <div
      className="taller-dialog__backdrop"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onCerrar()
      }}
    >
      <div
        className="taller-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="taller-dialog-titulo"
      >
        <header className="taller-dialog__header">
          <div>
            <p className="taller-dialog__eyebrow">Exportar STL</p>
            <h2 className="taller-dialog__title" id="taller-dialog-titulo">
              Resumen del diseño
            </h2>
          </div>
          <button
            type="button"
            className="taller-dialog__close"
            onClick={onCerrar}
            aria-label="Cerrar resumen"
          >
            ×
          </button>
        </header>

        <p className="taller-dialog__file">
          <span>Archivo</span>
          <code>{nombreArchivo(params)}</code>
        </p>

        <dl className="taller-dialog__grid">
          <div>
            <dt>Base</dt>
            <dd>
              {numero(params.ancho)} × {numero(params.fondo)} ×{' '}
              {numero(params.grosor)} mm
            </dd>
          </div>
          <div>
            <dt>Altura total</dt>
            <dd>{numero(altoTotal)} mm con el mando</dd>
          </div>
          <div>
            <dt>Preset</dt>
            <dd>{nombrePreset(params.preset)}</dd>
          </div>
          <div>
            <dt>Hueco del mando</dt>
            <dd>
              {numero(hueco.profundidad)} mm de profundidad ·{' '}
              {numero(hueco.margen)} mm de holgura
            </dd>
          </div>
          <div>
            <dt>Puck</dt>
            <dd>
              {params.puckActivo
                ? `${posicionPuck} · ${numero(
                    params.puckDistancia,
                  )} mm · hueco de ${numero(puck.profundidad)} mm`
                : 'Sin hueco de puck'}
            </dd>
          </div>
          <div>
            <dt>Acabado</dt>
            <dd>
              Redondeo {numero(params.redondeo)} mm ·{' '}
              {params.patas ? 'patas' : 'sin patas'} ·{' '}
              {params.canalCable ? 'canal de cable' : 'sin canal'}
            </dd>
          </div>
        </dl>

        <div className="taller-dialog__avisos">
          {avisos.map((aviso, indice) => (
            <p
              key={`${aviso.nivel}-${indice}`}
              className={`taller-dialog__aviso taller-dialog__aviso--${aviso.nivel}`}
            >
              <span aria-hidden="true">
                {aviso.nivel === 'ok' ? '✓' : aviso.nivel === 'error' ? '×' : '!'}
              </span>
              {aviso.texto}
            </p>
          ))}
        </div>

        <p className="taller-dialog__note">
          El STL se descarga en milímetros e incluye la base rebajada y el texto
          extruido. Los alojamientos de las patas van vacíos para pegar las
          tuercas o topes de goma.
        </p>

        <footer className="taller-dialog__footer">
          <button
            type="button"
            className="taller-dialog__cancel"
            onClick={onCerrar}
          >
            Cancelar
          </button>
          <button
            type="button"
            className="taller-dialog__confirm"
            onClick={onConfirmar}
          >
            Descargar STL
          </button>
        </footer>
      </div>
    </div>
  )
}
