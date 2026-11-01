import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  VALVE_VENDOR_ID,
  claveDispositivo,
  describirErrorHID,
  esCancelacionHID,
  obtenerHID,
  type DispositivoHID,
  type EstadoInformesHID,
  type InformeHID,
  type InformeHIDEvento,
} from './hid'

export type { InformeHID }

type EstadoInformes = {
  informes: InformeHID[]
  ultimos: EstadoInformesHID
}

const MAX_INFORMES = 80

type Escucha = {
  dispositivo: DispositivoHID
  escucha: (evento: InformeHIDEvento) => void
}

function fusionarDispositivos(
  actuales: DispositivoHID[],
  nuevos: DispositivoHID[],
) {
  const mapa = new Map(
    actuales.map((dispositivo) => [claveDispositivo(dispositivo), dispositivo]),
  )

  for (const dispositivo of nuevos) {
    mapa.set(claveDispositivo(dispositivo), dispositivo)
  }

  return [...mapa.values()]
}

/**
 * Acceso a WebHID para el Steam Controller.
 *
 * WebHID no expone un flujo continuo: cada dispositivo abierto emite eventos
 * `inputreport`. Guardamos los últimos informes en un búfer y los volcamos
 * una vez por frame para no saturar React si el mando envía a 100 Hz.
 */
export function useHID() {
  const hid = useMemo(() => obtenerHID(), [])
  const soportado = hid !== null

  const [dispositivos, setDispositivos] = useState<DispositivoHID[]>([])
  const [dispositivoActivo, setDispositivoActivo] =
    useState<DispositivoHID | null>(null)
  const [estadoInformes, setEstadoInformes] = useState<EstadoInformes>({
    informes: [],
    ultimos: {},
  })
  const [error, setError] = useState<string | null>(null)
  const [solicitando, setSolicitando] = useState(false)
  const [conectando, setConectando] = useState(false)

  const escuchas = useRef(new Map<string, Escucha>())
  const pendientes = useRef<InformeHID[]>([])
  const frame = useRef(0)
  const secuencia = useRef(0)

  const volcarInformes = useCallback(() => {
    frame.current = 0

    const lote = pendientes.current
    pendientes.current = []
    if (lote.length === 0) return

    setEstadoInformes((anterior) => {
      const ultimos = { ...anterior.ultimos }

      for (const informe of lote) {
        ultimos[informe.reportId] = informe.bytes
      }

      return {
        informes: [...anterior.informes, ...lote].slice(-MAX_INFORMES),
        ultimos,
      }
    })
  }, [])

  const adjuntarEscucha = useCallback(
    (dispositivo: DispositivoHID) => {
      const clave = claveDispositivo(dispositivo)
      const existente = escuchas.current.get(clave)

      if (existente) {
        if (existente.dispositivo === dispositivo) return

        existente.dispositivo.removeEventListener('inputreport', existente.escucha)
        escuchas.current.delete(clave)
      }

      const escucha = (evento: InformeHIDEvento) => {
        const bytes = new Uint8Array(evento.data.byteLength)

        for (let indice = 0; indice < bytes.length; indice++) {
          bytes[indice] = evento.data.getUint8(indice)
        }

        pendientes.current.push({
          secuencia: ++secuencia.current,
          reportId: evento.reportId,
          bytes,
          recibidoEn: performance.now(),
        })

        if (frame.current === 0) {
          frame.current = requestAnimationFrame(volcarInformes)
        }
      }

      dispositivo.addEventListener('inputreport', escucha)
      escuchas.current.set(clave, { dispositivo, escucha })
    },
    [volcarInformes],
  )

  const quitarEscucha = useCallback((dispositivo: DispositivoHID) => {
    const clave = claveDispositivo(dispositivo)
    const entrada = escuchas.current.get(clave)
    if (!entrada) return

    entrada.dispositivo.removeEventListener('inputreport', entrada.escucha)
    escuchas.current.delete(clave)
  }, [])

  const abrirDispositivo = useCallback(
    async (dispositivo: DispositivoHID) => {
      setConectando(true)
      setError(null)

      try {
        if (!dispositivo.opened) await dispositivo.open()

        adjuntarEscucha(dispositivo)
        setDispositivoActivo(dispositivo)
        setDispositivos((actuales) =>
          fusionarDispositivos(actuales, [dispositivo]),
        )
      } catch (fallo) {
        setError(describirErrorHID(fallo))
      } finally {
        setConectando(false)
      }
    },
    [adjuntarEscucha],
  )

  const cerrarDispositivo = useCallback(
    async (dispositivo: DispositivoHID) => {
      quitarEscucha(dispositivo)
      setError(null)

      try {
        if (dispositivo.opened) await dispositivo.close()
      } catch {
        // Si ya estaba cerrado por el sistema, no hay nada que hacer.
      }

      setDispositivoActivo((activo) =>
        activo && claveDispositivo(activo) === claveDispositivo(dispositivo)
          ? null
          : activo,
      )
    },
    [quitarEscucha],
  )

  const conectarPorHID = useCallback(async () => {
    if (!hid) {
      setError('WebHID no está disponible en este navegador.')
      return
    }

    setSolicitando(true)
    setError(null)

    try {
      const seleccionados = await hid.requestDevice({
        filters: [{ vendorId: VALVE_VENDOR_ID }],
      })

      const autorizados = await hid.getDevices()
      setDispositivos((actuales) =>
        fusionarDispositivos(actuales, autorizados),
      )

      const elegido =
        seleccionados[0] ??
        autorizados.find((dispositivo) => !dispositivo.opened) ??
        null

      if (!elegido) {
        setError(
          'No se seleccionó ningún dispositivo de Valve. Si el puck está conectado y el mando encendido, vuelve a intentarlo.',
        )
        return
      }

      await abrirDispositivo(elegido)
    } catch (fallo) {
      if (!esCancelacionHID(fallo)) {
        setError(describirErrorHID(fallo))
      }
    } finally {
      setSolicitando(false)
    }
  }, [abrirDispositivo, hid])

  const limpiarInformes = useCallback(() => {
    setEstadoInformes({ informes: [], ultimos: {} })
  }, [])

  const limpiarError = useCallback(() => setError(null), [])

  useEffect(() => {
    if (!hid) return

    let vivo = true
    const mapaEscuchas = escuchas.current

    hid
      .getDevices()
      .then((autorizados) => {
        if (vivo) setDispositivos((actuales) => fusionarDispositivos(actuales, autorizados))
      })
      .catch(() => {
        // getDevices puede fallar si la página no tiene permiso; se ignora.
      })

    const alConectar = (evento: Event) => {
      const { device } = evento as Event & { device: DispositivoHID }
      setDispositivos((actuales) => fusionarDispositivos(actuales, [device]))
    }

    const alDesconectar = (evento: Event) => {
      const { device } = evento as Event & { device: DispositivoHID }
      const clave = claveDispositivo(device)

      quitarEscucha(device)
      setDispositivos((actuales) =>
        actuales.filter(
          (dispositivo) => claveDispositivo(dispositivo) !== clave,
        ),
      )
      setDispositivoActivo((activo) =>
        activo && claveDispositivo(activo) === clave ? null : activo,
      )
    }

    hid.addEventListener('connect', alConectar)
    hid.addEventListener('disconnect', alDesconectar)

    return () => {
      vivo = false
      hid.removeEventListener('connect', alConectar)
      hid.removeEventListener('disconnect', alDesconectar)

      if (frame.current !== 0) cancelAnimationFrame(frame.current)
      frame.current = 0
      pendientes.current = []

      for (const { dispositivo, escucha } of mapaEscuchas.values()) {
        dispositivo.removeEventListener('inputreport', escucha)
        if (dispositivo.opened) void dispositivo.close().catch(() => {})
      }
      mapaEscuchas.clear()
    }
  }, [hid, quitarEscucha])

  return {
    soportado,
    dispositivos,
    dispositivoActivo,
    informes: estadoInformes.informes,
    ultimos: estadoInformes.ultimos,
    error,
    solicitando,
    conectando,
    conectarPorHID,
    abrirDispositivo,
    cerrarDispositivo,
    limpiarInformes,
    limpiarError,
  }
}

export type EstadoHID = ReturnType<typeof useHID>
