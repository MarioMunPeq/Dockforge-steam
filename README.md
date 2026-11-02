# Dock Forge

Configurador web multipágina para diseñar un dock 3D del Steam Controller
(2026) y descargar el STL listo para imprimir.

## Desarrollo

```bash
npm install
npm run dev
```

Abre la URL que muestra Vite (por defecto `http://localhost:5173/`).

## Build y previsualización

```bash
npm run build
npm run preview
```

La previsualización usa la base de producción, así que el proyecto se sirve en
`http://localhost:4173/dock-forge/` (no en la raíz). Comprueba ahí que cargan el
mando, el puck, la tipografía y el favicon antes de desplegar.

## Rutas

La navegación usa `HashRouter` para que funcione en GitHub Pages sin
configuración de servidor: recargar o compartir un enlace no produce un 404.

- `/#/` — Inicio: portada y acceso a las secciones.
- `/#/inspector` — Inspector: zonas interactivas del mando.
- `/#/gemelo` — Gemelo digital del mando.
- `/#/taller` — Taller: editor paramétrico del dock.

## Assets

La aplicación se publica bajo el subdirectorio `/dock-forge/`, definido con
`base` en `vite.config.ts`. Todas las rutas a archivos de `public/` pasan por
`assetUrl()` (`src/lib/assets.ts`), que antepone `import.meta.env.BASE_URL`.
El favicon de `index.html` usa `%BASE_URL%`.

No uses rutas absolutas como `/models/mando.glb`: en GitHub Pages apuntarían a
la raíz del dominio y devolverían 404.

Si cambias el nombre del repositorio, actualiza `base` en `vite.config.ts` para
que coincida con el nuevo subdirectorio.

## Estructura

- `src/App.tsx` — rutas y estructura general de la aplicación.
- `src/components/NavBar.tsx` — barra de navegación superior.
- `src/components/StudioScene.tsx` — escena compartida: cámara, luces de
  estudio, `Environment` local, rejilla y sombras de contacto.
- `src/components/Mando3D.tsx` — mando reutilizable con escala real, rotación,
  color/material y `children` para añadir elementos encima.
- `src/data/zones.ts` — tipo `ZonaMando` y array de zonas del mando.
- `src/lib/assets.ts` — resolución de assets bajo la base de Vite.
- `src/sections/Inicio/index.tsx` — portada.
- `src/sections/Inspector/index.tsx` — inspector de zonas del mando.
- `src/sections/Gemelo/index.tsx` — gemelo digital.
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

## Despliegue en GitHub Pages

El repositorio debe llamarse `dock-forge` (o ajustar `base` en
`vite.config.ts`). El flujo `.github/workflows/deploy.yml` se ejecuta en cada
push a `main`: instala con `npm ci`, compila con `npm run build` y publica
`dist` con las acciones oficiales de Pages.

1. Sube el proyecto a GitHub.
2. En el repositorio, abre **Settings → Pages**.
3. En **Build and deployment → Source**, elige **GitHub Actions**.
4. Haz push a `main` (o lanza el workflow manualmente desde **Actions**).
5. Cuando termine, la web estará en
   `https://<usuario>.github.io/dock-forge/`.

El workflow declara los permisos `pages: write` e `id-token: write`, y agrupa
los despliegues con `concurrency` para no publicar dos versiones a la vez.

## Atribución y licencia de los modelos 3D

El modelo 3D del Steam Controller y el puck son propiedad de
**Valve Corporation** y se distribuyen bajo la licencia
[Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International
(CC BY-NC-SA 4.0)](https://creativecommons.org/licenses/by-nc-sa/4.0/).

Copyright 2026 Valve Corporation.

Al usar o redistribuir estos materiales debes:

- **Atribuir** a Valve Corporation e indicar que se han modificado (por ejemplo,
  el centrado y la unificación de geometría que hace esta aplicación).
- **No usarlos con fines comerciales.**
- **Compartir las adaptaciones bajo la misma licencia** CC BY-NC-SA 4.0.

Esta aplicación no está afiliada, patrocinada ni respaldada por Valve. Consulta
`license.txt` para el texto completo de la licencia.
