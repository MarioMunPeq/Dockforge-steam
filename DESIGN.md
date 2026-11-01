# Dock Forge — sistema de diseño

## 01 · Dirección

Plano técnico nocturno. La interfaz se comporta como una lámina de taller
iluminada con luz de estudio: carbón casi negro, tinta cálida, líneas de 1 px
y mucho aire. No hay tarjetas, ni sombras de elevación, ni adornos: la
estructura se explica con la rejilla, las reglas y la numeración de secciones.

La pieza memorable es el mando 3D flotando sobre el carbón. Todo lo demás
—paneles, controles, fichas— se mantiene deliberadamente quieto para que el
objeto y el naranja de seguridad tengan un único lugar donde destacar.

**Lo que no se usa:** azul, violeta, degradados decorativos, glassmorphism,
sombras de tarjeta, radios mayores de 2 px, emojis como iconos.

## 02 · Color

Los tokens viven en `src/styles/tokens.css`.

| Token | Valor | Uso |
| --- | --- | --- |
| `--bg` / `--paper` | `#0F0F0E` | Fondo de la aplicación y de las escenas 3D |
| `--surface` | `#171715` | Superficie de cortinas, diálogos y estados elevados |
| `--line` | `#2C2B28` | Separadores de 1 px, bordes de controles, rejilla |
| `--text` / `--ink` | `#ECE9E1` | Texto, titulares, material de la rejilla |
| `--muted` | `#A19D91` | Texto secundario, unidades, estados inactivos |
| `--accent` | `#FF5A1F` | Interacción, selección, hotspots, puntos clave |
| `--accent-ink` | `#14100E` | Texto sobre superficies naranjas |

Reglas de uso:

- El naranja nunca es fondo de una superficie grande. Aparece en botones
  primarios, subrayados activos, hotspots 3D, cifras clave y marcas de
  selección.
- Los estados de error y aviso no introducen colores nuevos: usan tinta,
  línea y, como máximo, un filete naranja.
- Las tintas suaves se obtienen con `rgba(236, 233, 225, 0.04–0.16)`, no con
  nuevos hex.
- Todo texto sobre naranja usa `--accent-ink` para conservar el contraste AA.

Materiales 3D:

| Token | Valor | Uso |
| --- | --- | --- |
| `--controller` | `#CDC7B8` | Mando: gris cálido claro, destaca sobre el fondo |
| `--graphite` | `#2A2927` | Base del dock en el Taller, distinta del mando |
| `--muted` | `#A19D91` | Puck, patas y cotas de medición |

## 03 · Tipografía

| Familia | Rol |
| --- | --- |
| **JetBrains Mono** | Titulares, etiquetas, numeración, datos, botones y cifras |
| **IBM Plex Sans** | Texto corrido, descripciones y ayudas |

- Titulares de portada: mayúsculas, `clamp(3.25rem, 8.6vw, 9.5rem)`,
  interlineado `0.88`, tracking `-0.055em`.
- Titulares de sección: mayúsculas, `clamp(2rem, 4.5vw, 4.5rem)`, tracking
  `-0.04em`.
- Etiquetas: mono, mayúsculas, `0.65rem`, tracking `0.16em`.
- Texto corrido: IBM Plex Sans 300–400, `1rem–1.125rem`, interlineado `1.65`,
  máximo 62 caracteres por línea.
- Datos numéricos: `font-variant-numeric: tabular-nums`.

La escala es marcada a propósito: hay una distancia clara entre titular,
etiqueta y cuerpo, sin pasos intermedios decorativos.

## 04 · Rejilla y espacio

- Rejilla estricta de **12 columnas**, `gap` de 24 px.
- Márgenes laterales: `clamp(20px, 4vw, 64px)`.
- Ancho máximo de contenido: 1440 px; en pantallas completas la rejilla llega
  a los bordes con margen, no se centra en una tarjeta.
- Separadores de 1 px en lugar de contenedores. Un panel lateral no tiene
  fondo propio: solo una línea vertical.
- Escala de espacio en múltiplos de 4: 4, 8, 12, 16, 24, 32, 48, 64, 96, 128.
- La numeración `01`, `02`, `03`… es la única decoración permitida. Se usa
  porque las secciones y los pasos son secuencias reales.

## 05 · Componentes

### Botones

- **Primario:** rectángulo naranja sólido, texto `--accent-ink` en mono
  mayúsculas, radio 0–2 px. Sin degradado ni sombra.
- **Secundario:** fondo transparente, borde de 1 px `--ink`, texto tinta.
- **Terciario / enlace:** texto mono con subrayado de 1 px; al pasar el ratón
  el subrayado se vuelve naranja.
- Altura mínima 44 px en acciones táctiles. Foco visible: contorno de 2 px
  separado 3 px; sobre naranja, el contorno usa `--accent-ink`.

### Controles

- Sliders: pista de 1 px, tirador cuadrado de 12 px con borde de 1 px. El
  relleno activo, si existe, es naranja.
- Inputs: solo línea inferior de 1 px; sin caja. El foco engrosa la línea y la
  tiñe de naranja.
- Interruptores: pista rectangular de 30 × 16 px con radio máximo 2 px;
  activo en naranja.
- Segmentados: botones contiguos separados por líneas de 1 px; el activo se
  marca con fondo tinta y texto papel.

### Panel lateral

Sin superficie propia. Se separa del visor con una línea vertical de 1 px.
Cabecera fija, cuerpo desplazable, acciones fijas al pie. Los grupos se
separan con reglas horizontales, no con cajas.

## 06 · Escena 3D

- Fondo `--bg`, sin viñeta ni degradado.
- Mando en gris cálido claro (`#CDC7B8`), rugosidad alta, metalness casi nulo,
  clearcoat apenas insinuado.
- Base del Taller en grafito (`#2A2927`), claramente distinta del mando; puck
  y patas en grises medios.
- Luz de estudio: clave cálida desde arriba a la derecha, relleno suave y
  **luz de contorno** trasera que separa el mando del fondo.
- Sombra de contacto suave y baja; en fondo oscuro sube de opacidad para
  asentar el objeto sin sombras duras.
- El naranja solo aparece en hotspots, zonas activas del gemelo, líneas de
  selección y el punto de corte.
- Rejilla de referencia en `--line`, visible únicamente en la vista de medidas.

## 07 · Scroll, carga y navegación

- **Lenis** gobierna el scroll de Inicio y se sincroniza con ScrollTrigger;
  con `prefers-reduced-motion` se usa el scroll nativo.
- **Pantalla de carga:** porcentaje real del modelo 3D, estado por fases,
  marca revelada por líneas y salida en cortina. La aplicación entra debajo
  con navegación y contenido escalonados.
- **Cursor de precisión:** punto inmediato + anillo cuadrado con inercia.
  Reacciona a enlaces, botones, campos y elementos con `data-cursor`; se
  desactiva en táctil y respeta movimiento reducido.
- **Transición entre secciones:** cortina de superficie con filo naranja que
  cubre el cambio de ruta y se retira hacia arriba. Nunca un corte seco.

## 08 · Inicio: relato por scroll

Cinco escenas fijas con el mando a pantalla completa. El scroll es la única
animación orquestada de la aplicación.

1. **Objeto.** El mando entero gira despacio sobre carbón. Titular de portada.
2. **Superficie.** La cámara baja a sticks y trackpads. Texto breve.
3. **Corte.** Un plano de recorte recorre el mando y revela su interior.
4. **Estructura.** Transición a alambre mientras el mando sigue girando.
5. **Encaje.** Aparece el dock en grafito, el mando se asienta y aparece el
   acceso al Taller.

Detalles técnicos:

- GSAP + ScrollTrigger sobre el contenedor de scroll de Inicio; el progreso
  alimenta directamente la escena.
- El progreso se escribe en una ref y Three.js lo lee en `useFrame`; no hay
  renders de React por frame.
- La malla del mando es una sola pieza. No se separan componentes.
- `prefers-reduced-motion: reduce` desactiva el scroll animado, Lenis, el
  cursor con inercia y las cortinas; muestra una portada estática.

## 09 · Resto de secciones

- **Inspector:** visor a la izquierda, panel de fichas a la derecha separado
  por línea. Hotspots naranjas.
- **Gemelo:** visor con halos naranjas sobre los controles activos. Panel de
  depuración sin fondo, con filas separadas por líneas y datos en mono.
- **Taller:** visor claro con la base en grafito. Panel de parámetros a la
  derecha, grupos numerados, sliders finos y exportación naranja.

## 10 · Movimiento y accesibilidad

- Movimiento no provocado: la secuencia de Inicio y la entrada de carga. En
  el resto, las transiciones existen para explicar un cambio de estado
  (hover, foco, selección) y duran 120–180 ms.
- `prefers-reduced-motion`: se elimina el scroll animado, los pulsos y las
  animaciones de entrada.
- Foco de teclado siempre visible sobre fondo y sobre naranja.
- Contraste mínimo AA para texto corrido y etiquetas: `--muted` sobre `--bg`
  supera 7:1.
- Todas las acciones siguen disponibles con teclado; los `kbd` se muestran
  como texto mono con borde de 1 px.

## 11 · Implementación

```
src/styles/tokens.css              variables, color, tipografía, z-index
src/index.css                      importa tokens y estilos globales
src/App.css                        shell, entrada, botones, escena compartida
src/components/NavBar.css          navegación
src/components/CargadorApp.*       pantalla de carga con progreso real
src/components/CursorPersonalizado.* cursor de precisión
src/components/TransicionSeccion.* cortina entre rutas
src/lib/useLenisScroll.ts          Lenis + ScrollTrigger
src/sections/Inicio/               portada + escena de scroll
src/sections/Inspector/            inspector + panel
src/sections/Gemelo/               gemelo + paneles
src/sections/Taller/               visor + parámetros + diálogo
```

Criterio de revisión: si un elemento se puede explicar con una línea de 1 px,
no se le añade una caja; si un color no es fondo, superficie, tinta, gris o
naranja, no entra.
