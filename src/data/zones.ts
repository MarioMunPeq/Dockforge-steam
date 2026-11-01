// Zonas interactivas del mando.
// Las posiciones están en milímetros respecto al centro del modelo:
//   +X → derecha del mando
//   +Y → arriba (cara superior)
//   +Z → parte trasera (botones L4/L5 y R4/R5)
export type GrupoZona =
  | 'sticks'
  | 'trackpads'
  | 'frontales'
  | 'gatillos'
  | 'bumpers'
  | 'traseros'

export type ZonaMando = {
  id: string
  nombre: string
  descripcion: string
  /** Familia del control, para agrupar la leyenda y la ficha. */
  grupo: GrupoZona
  /** Centro del hotspot, en mm respecto al centro del modelo. */
  posicion: [number, number, number]
  /**
   * Desplazamiento de la cámara respecto al hotspot, en coordenadas del
   * modelo. Sirve para elegir desde qué ángulo se inspecciona cada control.
   */
  vista?: [number, number, number]
  /** Datos técnicos que se muestran en la ficha del control. */
  tipo: string
  /** Recorrido o rango de actuación del control. */
  recorrido: string
  /** Uso habitual en juegos. */
  uso: string
}

// Primera aproximación, medida sobre public/models/mando.glb.
// El modo calibración del Inspector (tecla C) permite afinar cada punto.
export const zonas: ZonaMando[] = [
  // ── Sticks ────────────────────────────────────────────────────────────────
  {
    id: 'stick-izquierdo',
    nombre: 'Stick izquierdo',
    grupo: 'sticks',
    posicion: [-23, 32.5, -18],
    vista: [0, 95, -150],
    tipo: 'Analógico capacitivo',
    recorrido: '±12 mm · 360°',
    uso: 'Movimiento del personaje',
    descripcion:
      'Palanca analógica del pulgar izquierdo. En el mando de Steam es capacitiva: detecta el contacto y permite activar el giroscopio o funciones extra sin pulsar. Se usa sobre todo para mover al personaje.',
  },
  {
    id: 'stick-derecho',
    nombre: 'Stick derecho',
    grupo: 'sticks',
    posicion: [23, 32.5, -18],
    vista: [0, 95, -150],
    tipo: 'Analógico capacitivo',
    recorrido: '±12 mm · 360°',
    uso: 'Cámara y apuntado',
    descripcion:
      'Palanca analógica del pulgar derecho. Controla la cámara y el apuntado. Su sensibilidad, zona muerta y curva de respuesta se ajustan por juego desde Steam Input.',
  },

  // ── Trackpads ─────────────────────────────────────────────────────────────
  {
    id: 'trackpad-izquierdo',
    nombre: 'Trackpad izquierdo',
    grupo: 'trackpads',
    posicion: [-41, 18, 6],
    vista: [0, 95, -145],
    tipo: 'Táctil háptico',
    recorrido: 'Superficie 55 × 40 mm · clic 1 mm',
    uso: 'Ratón, rueda y accesos rápidos',
    descripcion:
      'Superficie táctil de alta resolución que puede funcionar como ratón, rueda o cuadrícula de accesos. Admite gestos, pulsación física y zonas configurables para cada juego.',
  },
  {
    id: 'trackpad-derecho',
    nombre: 'Trackpad derecho',
    grupo: 'trackpads',
    posicion: [41, 18, 6],
    vista: [0, 95, -145],
    tipo: 'Táctil háptico',
    recorrido: 'Superficie 55 × 40 mm · clic 1 mm',
    uso: 'Apuntado fino y menús',
    descripcion:
      'Trackpad pensado para apuntar con precisión o navegar por menús. Puedes dividirlo en regiones y asignar una acción distinta a cada una.',
  },

  // ── Botones frontales ─────────────────────────────────────────────────────
  {
    id: 'botones-abxy',
    nombre: 'Botones ABXY',
    grupo: 'frontales',
    posicion: [48.2, 27.5, -29.6],
    vista: [0, 100, -150],
    tipo: 'Digital',
    recorrido: '1,1 mm',
    uso: 'Acciones principales',
    descripcion:
      'Cuatro botones frontales en disposición de rombo. Mantienen la distribución clásica para las acciones principales: saltar, recoger, atacar o interactuar.',
  },
  {
    id: 'cruceta',
    nombre: 'Cruceta',
    grupo: 'frontales',
    posicion: [-48.4, 27.5, -29.6],
    vista: [0, 100, -150],
    tipo: 'Digital · 8 direcciones',
    recorrido: '1,1 mm',
    uso: 'Menús, inventario y armas',
    descripcion:
      'Cruceta digital de ocho direcciones. Es cómoda para menús, inventarios, selección de armas o movimientos discretos que no necesitan precisión analógica.',
  },
  {
    id: 'boton-ver',
    nombre: 'Botón Ver',
    grupo: 'frontales',
    posicion: [-28.2, 25.5, -41],
    vista: [0, 105, -150],
    tipo: 'Digital',
    recorrido: '0,9 mm',
    uso: 'Mapa y superposiciones',
    descripcion:
      'Botón secundario izquierdo, junto al stick. Según el juego abre la vista de mapa, la superposición de información o una función auxiliar.',
  },
  {
    id: 'boton-menu',
    nombre: 'Botón Menú',
    grupo: 'frontales',
    posicion: [28.2, 25.5, -41],
    vista: [0, 105, -150],
    tipo: 'Digital',
    recorrido: '0,9 mm',
    uso: 'Pausa y opciones',
    descripcion:
      'Botón secundario derecho, junto al stick. Habitualmente abre el menú de pausa, las opciones del juego o la lista de jugadores.',
  },
  {
    id: 'boton-steam',
    nombre: 'Botón Steam',
    grupo: 'frontales',
    posicion: [0, 25.5, -27],
    vista: [0, 105, -150],
    tipo: 'Digital',
    recorrido: '0,8 mm',
    uso: 'Interfaz de Steam y encendido',
    descripcion:
      'Botón central con el logotipo de Steam. Abre la interfaz de Steam, la biblioteca, la tienda y los controles del juego. También permite encender el mando.',
  },
  {
    id: 'boton-acceso-rapido',
    nombre: 'Acceso rápido',
    grupo: 'frontales',
    posicion: [0, 19.5, 11],
    vista: [0, 95, -140],
    tipo: 'Digital',
    recorrido: '0,9 mm',
    uso: 'Notificaciones, chat y rendimiento',
    descripcion:
      'Botón central situado entre los trackpads. Abre el menú de acceso rápido para consultar notificaciones, amigos, chat y ajustes de rendimiento. Mantenlo pulsado para ver los atajos.',
  },

  // ── Bumpers ───────────────────────────────────────────────────────────────
  {
    id: 'bumper-izquierdo',
    nombre: 'Bumper izquierdo',
    grupo: 'bumpers',
    posicion: [-45, 18, -51],
    vista: [0, 40, -170],
    tipo: 'Digital',
    recorrido: '1,2 mm',
    uso: 'Recarga y cambio de objeto',
    descripcion:
      'Botón superior izquierdo, situado sobre el gatillo. Ideal para acciones rápidas que no necesitan presión analógica, como recargar o cambiar de objeto.',
  },
  {
    id: 'bumper-derecho',
    nombre: 'Bumper derecho',
    grupo: 'bumpers',
    posicion: [45, 18, -51],
    vista: [0, 40, -170],
    tipo: 'Digital',
    recorrido: '1,2 mm',
    uso: 'Granadas y esquivas',
    descripcion:
      'Botón superior derecho, sobre el gatillo. Suele mapearse a granadas, recarga, esquivas o cambios de arma que deben estar siempre a mano.',
  },

  // ── Gatillos ──────────────────────────────────────────────────────────────
  {
    id: 'gatillo-izquierdo',
    nombre: 'Gatillo izquierdo',
    grupo: 'gatillos',
    posicion: [-47, -12, -49],
    vista: [0, 20, -175],
    tipo: 'Analógico Hall',
    recorrido: '0–100 % · ~8 mm',
    uso: 'Acelerar, frenar y apuntar',
    descripcion:
      'Gatillo analógico con recorrido progresivo. Se usa para acelerar, frenar o apuntar según cuánto se aprieta. Steam Input permite ajustar su punto de activación.',
  },
  {
    id: 'gatillo-derecho',
    nombre: 'Gatillo derecho',
    grupo: 'gatillos',
    posicion: [47, -12, -49],
    vista: [0, 20, -175],
    tipo: 'Analógico Hall',
    recorrido: '0–100 % · ~8 mm',
    uso: 'Disparar o acelerar',
    descripcion:
      'Gatillo analógico principal para disparar o acelerar. Admite curvas de respuesta y zonas muertas para adaptar el tacto a cada tipo de juego.',
  },

  // ── Botones traseros ──────────────────────────────────────────────────────
  {
    id: 'boton-trasero-l4',
    nombre: 'Botón trasero L4',
    grupo: 'traseros',
    posicion: [-46, -17, 28],
    vista: [-30, 40, 220],
    tipo: 'Digital',
    recorrido: '0,8 mm',
    uso: 'Acción extra sin soltar el stick',
    descripcion:
      'Botón trasero superior izquierdo. Se pulsa con el dedo medio o anular sin soltar los sticks, así que puedes mantener una acción mientras sigues moviéndote.',
  },
  {
    id: 'boton-trasero-l5',
    nombre: 'Botón trasero L5',
    grupo: 'traseros',
    posicion: [-42, -14, 6],
    vista: [-30, 40, 220],
    tipo: 'Digital',
    recorrido: '0,8 mm',
    uso: 'Sprint y habilidades',
    descripcion:
      'Botón trasero inferior izquierdo. Añade una acción extra a la mano izquierda y resulta útil para combinar movimiento, sprint y habilidades.',
  },
  {
    id: 'boton-trasero-r4',
    nombre: 'Botón trasero R4',
    grupo: 'traseros',
    posicion: [46, -17, 28],
    vista: [30, 40, 220],
    tipo: 'Digital',
    recorrido: '0,8 mm',
    uso: 'Recarga y agacharse',
    descripcion:
      'Botón trasero superior derecho. Pensado para acciones que deben estar siempre a mano, como recargar, agacharse o cambiar de cámara.',
  },
  {
    id: 'boton-trasero-r5',
    nombre: 'Botón trasero R5',
    grupo: 'traseros',
    posicion: [42, -14, 6],
    vista: [30, 40, 220],
    tipo: 'Digital',
    recorrido: '0,8 mm',
    uso: 'Acciones encadenadas',
    descripcion:
      'Botón trasero inferior derecho. Completa la pareja de botones traseros de la mano derecha y permite encadenar acciones sin levantar el pulgar del stick.',
  },
]
