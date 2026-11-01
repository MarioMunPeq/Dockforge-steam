import { useEffect, useRef, useState } from 'react'
import {
  contarBotonesMapeados,
  contarEjesMapeados,
  descargarMapeoJSON,
  leerMapeoDeArchivo,
  normalizarMapeo,
  serializarMapeo,
  type MapeoHID,
} from './mapeoHID'

type EditorMapeoHIDProps = {
  mapeo: MapeoHID
  onMapeo: (mapeo: MapeoHID) => void
}

/**
 * Editor del JSON de mapeo. El archivo se puede descargar, editar fuera de la
 * app y volver a importar; también se guarda solo en localStorage.
 */
export default function EditorMapeoHID({
  mapeo,
  onMapeo,
}: EditorMapeoHIDProps) {
  const [texto, setTexto] = useState(() => serializarMapeo(mapeo))
  const [error, setError] = useState<string | null>(null)
  const [aviso, setAviso] = useState<string | null>(null)
  const editando = useRef(false)
  const entradaArchivo = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!editando.current) setTexto(serializarMapeo(mapeo))
  }, [mapeo])

  const aplicar = () => {
    try {
      const nuevo = normalizarMapeo(JSON.parse(texto))
      onMapeo(nuevo)
      setTexto(serializarMapeo(nuevo))
      setError(null)
      setAviso('Mapeo aplicado y guardado en este navegador.')
    } catch (fallo) {
      setAviso(null)
      setError(
        fallo instanceof Error ? fallo.message : 'El JSON no es válido.',
      )
    }
  }

  const descargar = () => {
    try {
      const nuevo = normalizarMapeo(JSON.parse(texto))
      onMapeo(nuevo)
      setTexto(serializarMapeo(nuevo))
      descargarMapeoJSON(nuevo)
      setError(null)
      setAviso('Descargado mapeo-hid-steam-controller.json.')
    } catch (fallo) {
      setAviso(null)
      setError(
        fallo instanceof Error
          ? fallo.message
          : 'Corrige el JSON antes de descargarlo.',
      )
    }
  }

  const importar = async (archivo: File | undefined) => {
    if (!archivo) return

    try {
      const nuevo = await leerMapeoDeArchivo(archivo)
      onMapeo(nuevo)
      setTexto(serializarMapeo(nuevo))
      setError(null)
      setAviso(`Importado ${archivo.name}.`)
    } catch (fallo) {
      setAviso(null)
      setError(
        fallo instanceof Error ? fallo.message : 'No se pudo leer el archivo.',
      )
    } finally {
      if (entradaArchivo.current) entradaArchivo.current.value = ''
    }
  }

  return (
    <section className="gemelo-hid-bloque">
      <div className="gemelo-debug__head">
        <h3 className="gemelo-debug__title">Mapeo JSON</h3>
        <span className="gemelo-debug__hint">
          {contarBotonesMapeados(mapeo)} botones ·{' '}
          {contarEjesMapeados(mapeo)} ejes
        </span>
      </div>

      <p className="gemelo-hid-nota">
        El aprendizaje rellena este JSON. Las claves de <code>botones</code> son
        ids de control (<code>boton-a</code>, <code>dpad-arriba</code>,{' '}
        <code>lb</code>…). Puedes corregir bytes a mano, descargarlo y volver a
        importarlo cuando quieras.
      </p>

      <textarea
        className="gemelo-hid-editor"
        value={texto}
        spellCheck={false}
        rows={12}
        onFocus={() => {
          editando.current = true
        }}
        onBlur={() => {
          editando.current = false
        }}
        onChange={(evento) => setTexto(evento.target.value)}
        aria-label="JSON del mapeo HID"
      />

      <div className="gemelo-hid-acciones">
        <button
          type="button"
          className="gemelo-boton gemelo-boton--primario"
          onClick={aplicar}
        >
          Aplicar texto
        </button>
        <button
          type="button"
          className="gemelo-boton"
          onClick={descargar}
        >
          Descargar JSON
        </button>
        <button
          type="button"
          className="gemelo-boton"
          onClick={() => entradaArchivo.current?.click()}
        >
          Importar…
        </button>

        <input
          ref={entradaArchivo}
          className="gemelo-hid-archivo"
          type="file"
          accept="application/json,.json"
          onChange={(evento) => void importar(evento.target.files?.[0])}
        />
      </div>

      {error && (
        <p className="gemelo-hid-aviso gemelo-hid-aviso--error" role="alert">
          {error}
        </p>
      )}
      {aviso && (
        <p className="gemelo-hid-aviso gemelo-hid-aviso--ok" role="status">
          {aviso}
        </p>
      )}
    </section>
  )
}
