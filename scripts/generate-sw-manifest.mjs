// THEOS — Genera dist/public/precache-manifest.json después del build.
//
// El Service Worker (public/sw.js) necesita saber exactamente qué archivos
// precachear al instalarse para que la app funcione sin conexión desde el
// primer arranque (incluidas rutas que el usuario todavía no visitó, como
// /salud o /produccion). El problema: los archivos bajo /assets/ que genera
// Vite llevan un hash en el nombre (ej. index-a1b2c3.js) que cambia en cada
// build, así que sw.js —que vive en public/ y Vite no procesa— no puede
// conocerlos de antemano.
//
// Este script corre automáticamente después de "npm run build" (hook
// "postbuild" en package.json), recorre dist/public tal como quedó
// generado, y escribe la lista real de archivos en un JSON que sw.js lee al
// instalarse. No agrega dependencias nuevas: es Node puro (fs/path).

import { readdirSync, statSync, writeFileSync, existsSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

const DIST_DIR = join(process.cwd(), 'dist', 'public');
// Estos dos nunca deben precachearse desde la lista: sw.js se registra a sí
// mismo aparte, y el manifest no debe intentar precachearse a sí mismo.
const EXCLUIR = new Set(['sw.js', 'precache-manifest.json']);

if (!existsSync(DIST_DIR)) {
  console.error(`[generate-sw-manifest] No existe ${DIST_DIR}. ¿Corriste "npm run build" antes?`);
  process.exit(1);
}

function listarArchivos(dir) {
  const resultado = [];
  for (const entrada of readdirSync(dir)) {
    if (entrada.startsWith('.')) continue;
    const rutaCompleta = join(dir, entrada);
    const info = statSync(rutaCompleta);
    if (info.isDirectory()) {
      resultado.push(...listarArchivos(rutaCompleta));
    } else if (!EXCLUIR.has(entrada)) {
      // Siempre con "/" como separador, sin importar el SO donde se compile.
      const rutaRelativa = relative(DIST_DIR, rutaCompleta).split(sep).join('/');
      resultado.push(`/${rutaRelativa}`);
    }
  }
  return resultado;
}

const archivos = listarArchivos(DIST_DIR).sort();
writeFileSync(join(DIST_DIR, 'precache-manifest.json'), JSON.stringify(archivos));
console.log(`[generate-sw-manifest] precache-manifest.json generado con ${archivos.length} archivos.`);
