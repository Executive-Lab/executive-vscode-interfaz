#!/usr/bin/env node
// Lo que hay que dejar dentro de extension/ antes de empaquetar el .vsix.
//
//   node preparar-paquete.js
//
// Hoy es una sola cosa: los módulos que la extensión comparte con el
// instalador. Viven en instalador/comun/ porque el instalador también los usa,
// y vsce solo empaqueta lo que cuelga de extension/, así que hay que copiarlos.
//
// La copia NO se versiona (está en .gitignore): la fuente es
// instalador/comun/, y dos ficheros iguales en el repositorio serían dos
// verdades esperando a separarse.
//
// Lo llama `npm run empaquetar`. Si alguna vez falla, el .vsix sale sin módulo
// del historial y las copias de seguridad quedan apagadas sin decir nada — por
// eso esto grita en vez de seguir.

const fs = require('node:fs');
const path = require('node:path');

const AQUI = __dirname;
const DE = path.join(AQUI, '..', 'instalador', 'comun');
const A = path.join(AQUI, 'media', 'comun');

// Los que la barra usa. `preparar.js` se queda fuera: es del instalador.
// `ajustes-del-editor.js` dice qué falta en los ajustes del asistente y deja
// constancia (decisión 163), y necesita a su lado `ajustes.js`.
const MODULOS = ['historial.js', 'git.js', 'enganches.js', 'control-remoto.js', 'ajustes.js', 'ajustes-del-editor.js'];

if (!fs.existsSync(DE)) {
  console.error(`No encuentro los módulos comunes en:\n  ${DE}`);
  process.exit(1);
}

fs.mkdirSync(A, { recursive: true });

for (const modulo of MODULOS) {
  const origen = path.join(DE, modulo);
  if (!fs.existsSync(origen)) {
    console.error(`Falta ${modulo} en instalador/comun/`);
    process.exit(1);
  }
  fs.copyFileSync(origen, path.join(A, modulo));
  console.log(`  media/comun/${modulo}`);
}

// La tabla de dónde mira cada asistente vive con los raíles, y la lee también
// `src/donde.js` — o sea, casi toda la barra. Sin ella el .vsix se instala y no
// arranca nada. Es un fichero versionado, así que faltar no debería faltar;
// pero lo que no se comprueba se rompe callado, y esto se rompería entero.
const tabla = path.join(AQUI, 'media', 'railes', 'sitios.js');
if (!fs.existsSync(tabla)) {
  console.error('\nFalta media/railes/sitios.js, que es de donde la barra saca las rutas de cada');
  console.error('asistente. Cópialo de skills/sitios.js antes de empaquetar.');
  process.exit(1);
}
console.log('  media/railes/sitios.js (la tabla de cada asistente)');

// El arnés también viaja dentro, y no está versionado: si falta, el .vsix sale
// aparentemente bien y el arnés se descarga por su cuenta al usarlo, que es
// justo lo que el camino sin instalador venía a evitar. Mejor verlo aquí.
const arnes = path.join(AQUI, 'media', 'harness', 'node_modules', '@ericrisco', 'rsc', 'scripts', 'rsc.js');
if (!fs.existsSync(arnes)) {
  console.error('\nFalta el arnés dentro de la extensión. Ponlo antes de empaquetar:');
  console.error('  npm install --prefix extension/media/harness @ericrisco/rsc@4.1.9');
  process.exit(1);
}
console.log('  media/harness/ (el arnés está)');
