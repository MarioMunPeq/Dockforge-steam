/**
 * URL pública de un archivo de `public/`, respetando la base de Vite.
 *
 * En desarrollo `BASE_URL` es `/`; en GitHub Pages es `/dock-forge/`.
 * Evita rutas absolutas como `/models/mando.glb`, que se romperían al
 * desplegar bajo un subdirectorio.
 */
export function assetUrl(ruta: string) {
  return `${import.meta.env.BASE_URL}${ruta.replace(/^\/+/, '')}`
}
