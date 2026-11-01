# Dock Forge

Configurador web multipágina para diseñar un dock 3D del Steam Controller
(2026) y descargar el STL listo para imprimir.

## Desarrollo

```bash
npm install
npm run dev
```

Abre la URL que muestra Vite (por defecto `http://localhost:5173`).

## Secciones

La navegación superior se mantiene fija y usa `react-router`:

- `/` — Inicio: portada y acceso a las secciones.
- `/inspector` — Inspector: zonas interactivas del mando.
- `/gemelo` — Gemelo digital del mando.
- `/taller` — Taller: editor paramétrico del dock.

Cada sección vive únicamente en su carpeta de `src/sections/`. Los archivos
comunes (`App`, `NavBar`, `Mando3D`, `StudioScene` y `zones`) se modifican
desde fuera de las secciones.

## Estructura

- `src/App.tsx` — rutas y estructura general de la aplicación.
- `src/components/NavBar.tsx` — barra de navegación superior.
- `src/components/StudioScene.tsx` — escena compartida: cámara, luces de
  estudio, `Environment` local, rejilla y sombras de contacto.
- `src/components/Mando3D.tsx` — mando reutilizable con escala real, rotación,
  color/material y `children` para añadir elementos encima.
- `src/data/zones.ts` — tipo `ZonaMando` y array de zonas del mando.
- `src/sections/Inicio/index.tsx` — portada.
- `src/sections/Inspector/index.tsx` — placeholder del inspector de zonas.
- `src/sections/Gemelo/index.tsx` — placeholder del gemelo digital.
- `src/sections/Taller/` — editor completo:
  - `index.tsx` — estado de los parámetros y layout.
  - `Viewer.tsx` — dock y mando dentro de la escena compartida.
  - `Dock.tsx` — base paramétrica con bordes redondeados.
  - `ControlPanel.tsx` — sliders de ancho, fondo, grosor, inclinación y holgura.
  - `dockParams.ts` — tipo `DockParams` y valores por defecto.
  - `Taller.css` — estilos del editor y del panel.
- `public/models/mando.glb` — modelo del Steam Controller.
- `public/models/puck.glb` — puck del Steam Controller.

Todas las medidas trabajan a escala real: **1 unidad = 1 mm**.
La holgura se guarda en el estado, pero todavía no modifica la geometría.

El modelo 3D es propiedad de Valve Corporation y se distribuye bajo la licencia
[CC BY-NC-SA 4.0](https://creativecommons.org/licenses/by-nc-sa/4.0/). Consulta
`license.txt` para más detalles.
