import { useEffect, useMemo, useRef, useState } from 'react'
import ControlPanel from './ControlPanel'
import ExportDialog from './ExportDialog'
import Viewer from './Viewer'
import {
  DEFAULT_TALLER_PARAMS,
  PRESETS,
  normalizarParams,
  type DockParams,
  type PresetId,
  type TallerParams,
  type VistaTaller,
} from './dockParams'
import { construirAvisos } from './diagnostico'
import { exportarSTL } from './exportStl'
import { altoConMando } from './layout'
import { useDockModel } from './useDockModel'
import './Taller.css'

const CAMPOS_DOCK: (keyof DockParams)[] = [
  'preset',
  'ancho',
  'fondo',
  'grosor',
  'redondeo',
  'inclinacion',
  'holgura',
  'profundidad',
  'patas',
  'canalCable',
  'canalAncho',
  'canalAlto',
  'puckActivo',
  'puckPosicion',
  'puckDistancia',
  'puckHolgura',
  'puckProfundidad',
]

const MODOS: { id: VistaTaller; label: string }[] = [
  { id: 'materiales', label: 'Materiales' },
  { id: 'seccion', label: 'Sección' },
  { id: 'medidas', label: 'Medidas' },
]

function mismosDock(a: TallerParams, b: TallerParams) {
  return CAMPOS_DOCK.every((campo) => a[campo] === b[campo])
}

/** Editor paramétrico del dock. Los parámetros viven solo en esta sección. */
export default function Taller() {
  const [params, setParams] = useState<TallerParams>({
    ...DEFAULT_TALLER_PARAMS,
  })
  const [paramsCalculo, setParamsCalculo] = useState<TallerParams>({
    ...DEFAULT_TALLER_PARAMS,
  })
  const [modo, setModo] = useState<VistaTaller>('materiales')
  const [dialogoExport, setDialogoExport] = useState(false)
  const [exportado, setExportado] = useState(false)

  const paramsRef = useRef(params)
  const exportTimer = useRef<number | null>(null)
  const modelo = useDockModel(paramsCalculo, params)

  const avisos = useMemo(
    () => construirAvisos(paramsCalculo, modelo.diagnostico),
    [paramsCalculo, modelo.diagnostico],
  )

  const avisoGrave = avisos.find((aviso) => aviso.nivel === 'error')
  const avisoLeve = avisos.find((aviso) => aviso.nivel === 'aviso')
  const resumenAviso = avisoGrave ?? avisoLeve ?? null

  const altoTotal = useMemo(() => {
    const caja = modelo.mando?.geometry.boundingBox ?? null
    return altoConMando(caja, modelo.placementY, paramsCalculo.inclinacion)
  }, [modelo.mando, modelo.placementY, paramsCalculo.inclinacion])

  useEffect(() => {
    return () => {
      if (exportTimer.current !== null) {
        window.clearTimeout(exportTimer.current)
      }
    }
  }, [])

  useEffect(() => {
    const alPulsar = (evento: KeyboardEvent) => {
      if (evento.key === 'Escape' && dialogoExport) {
        evento.preventDefault()
        setDialogoExport(false)
      }
    }

    window.addEventListener('keydown', alPulsar)
    return () => window.removeEventListener('keydown', alPulsar)
  }, [dialogoExport])

  const aplicarLive = <K extends keyof TallerParams,>(
    parametro: K,
    valor: TallerParams[K],
  ) => {
    setParams((actuales) => {
      const siguientes = normalizarParams({
        ...actuales,
        [parametro]: valor,
      })
      paramsRef.current = siguientes
      return siguientes
    })
  }

  const aplicarCommit = <K extends keyof TallerParams,>(
    parametro: K,
    valor: TallerParams[K],
  ) => {
    const siguientes = normalizarParams({
      ...paramsRef.current,
      [parametro]: valor,
    })
    paramsRef.current = siguientes
    setParams(siguientes)
    setParamsCalculo((actuales) =>
      mismosDock(actuales, siguientes) ? actuales : siguientes,
    )
    setExportado(false)
  }

  const aplicarPreset = (id: PresetId) => {
    const preset = PRESETS.find((candidato) => candidato.id === id)
    if (!preset) return

    const siguientes = normalizarParams({ ...preset.params })
    paramsRef.current = siguientes
    setParams(siguientes)
    setParamsCalculo(siguientes)
    setExportado(false)
  }

  const handleReset = () => {
    const siguientes = normalizarParams({ ...DEFAULT_TALLER_PARAMS })
    paramsRef.current = siguientes
    setParams(siguientes)
    setParamsCalculo(siguientes)
    setExportado(false)
    setDialogoExport(false)
  }

  const handleExport = () => {
    if (!modelo.base || modelo.calculando || modelo.cargando) return
    setDialogoExport(true)
  }

  const confirmarExport = () => {
    if (!modelo.base) return

    exportarSTL(modelo.base, modelo.texto, params)
    setDialogoExport(false)

    if (exportTimer.current !== null) {
      window.clearTimeout(exportTimer.current)
    }
    setExportado(true)
    exportTimer.current = window.setTimeout(() => {
      setExportado(false)
      exportTimer.current = null
    }, 2500)
  }

  const estado = modelo.cargando
    ? 'Cargando mando y puck…'
    : modelo.calculando
      ? 'Calculando huecos y revisando el diseño…'
      : null

  return (
    <section className="taller">
      <div className="taller__stage">
        <Viewer
          params={paramsCalculo}
          paramsTexto={params}
          base={modelo.base}
          texto={modelo.texto}
          mando={modelo.mando}
          puck={modelo.puck}
          colocacionPuck={modelo.colocacionPuck}
          placementY={modelo.placementY}
          modo={modo}
        />

        <header className="taller__header">
          <p className="taller__eyebrow">Configurador</p>
          <h1 className="taller__title">Taller</h1>
          <p className="taller__subtitle">
            Base, hueco del mando, puck y acabado en milímetros reales.
          </p>
        </header>

        <div className="taller__modes" role="group" aria-label="Vista previa">
          {MODOS.map((opcion) => (
            <button
              key={opcion.id}
              type="button"
              className={`taller__mode${
                modo === opcion.id ? ' taller__mode--activo' : ''
              }`}
              aria-pressed={modo === opcion.id}
              onClick={() => setModo(opcion.id)}
            >
              {opcion.label}
            </button>
          ))}
        </div>

        {estado && (
          <div className="taller__status" role="status" aria-live="polite">
            <span className="taller__spinner" aria-hidden="true" />
            {estado}
          </div>
        )}

        {!estado && modelo.aviso && (
          <div
            className="taller__status taller__status--warning"
            role="status"
          >
            {modelo.aviso}
          </div>
        )}

        {!estado && !modelo.aviso && resumenAviso && (
          <div
            className={`taller__print-badge taller__print-badge--${resumenAviso.nivel}`}
            role="status"
          >
            <span aria-hidden="true">
              {resumenAviso.nivel === 'error' ? '×' : '!'}
            </span>
            {resumenAviso.nivel === 'error'
              ? 'Revisa el diseño antes de imprimir'
              : 'Aviso de impresión'}
            <small>Ver detalle en el panel</small>
          </div>
        )}

        <footer className="taller__footer">
          <span>Arrastra para rotar · Rueda para hacer zoom</span>
          <span className="taller__credit">
            Modelos: Valve Corporation · CC BY-NC-SA 4.0
          </span>
        </footer>
      </div>

      <ControlPanel
        values={params}
        onLiveChange={aplicarLive}
        onCommit={aplicarCommit}
        onPreset={aplicarPreset}
        onReset={handleReset}
        onExport={handleExport}
        calculating={modelo.calculando}
        exportable={!!modelo.base && !modelo.cargando}
        exportado={exportado}
        avisos={avisos}
        aviso={modelo.aviso}
        modo={modo}
      />

      <ExportDialog
        abierto={dialogoExport}
        params={params}
        altoTotal={altoTotal}
        avisos={avisos}
        onCerrar={() => setDialogoExport(false)}
        onConfirmar={confirmarExport}
      />
    </section>
  )
}
