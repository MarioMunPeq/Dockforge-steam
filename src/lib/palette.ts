/**
 * Paleta compartida con Three.js.
 * Los nombres espejan los tokens de `src/styles/tokens.css`; Three.js no puede
 * leer variables CSS, así que este es el único punto de traducción.
 */
export const PALETA = {
  bg: '#0f0f0e',
  surface: '#171715',
  line: '#2c2b28',
  lineStrong: '#4a4843',
  text: '#ece9e1',
  muted: '#a19d91',
  accent: '#ff5a1f',
  accentInk: '#14100e',
  controller: '#cdc7b8',
  graphite: '#2a2927',
  graphiteLight: '#33312d',
  puck: '#77736a',
  sombra: '#000000',
} as const

/** Luces del estudio: clave cálida, relleno neutro y contorno trasero. */
export const LUCES = {
  clave: '#fff2df',
  relleno: '#ded7c8',
  contorno: '#fff4e6',
} as const
