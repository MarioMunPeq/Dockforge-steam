# Dock Forge

Configurador web para diseñar un dock 3D del Steam Controller (2026) y
descargar el STL listo para imprimir.

## Desarrollo

```bash
npm install
npm run dev
```

Abre la URL que muestra Vite (por defecto `http://localhost:5173`).

## Estructura

- `public/models/mando.glb` — modelo del Steam Controller.
- `public/models/puck.glb` — puck del Steam Controller.
- `src/components/Viewer.tsx` — visor 3D con React Three Fiber.
- `src/App.tsx` — layout de la aplicación.

El modelo 3D es propiedad de Valve Corporation y se distribuye bajo la licencia
[CC BY-NC-SA 4.0](https://creativecommons.org/licenses/by-nc-sa/4.0/). Consulta
`license.txt` para más detalles.
