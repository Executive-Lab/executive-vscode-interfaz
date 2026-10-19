#!/usr/bin/env node
// El diálogo del instalador de macOS es AppleScript, y las pruebas del .dmg solo
// corren `instalar.js` con node: la parte que ve la persona no la probaba nadie.
// Así se coló «No puede obtenerse items 3 thru -1 of {"DETALLE", …} (-1728)» la
// primera vez que alguien lo abrió de verdad: una línea DETALLE trae dos trozos.
//
// Esto saca de `instalar.applescript` las dos funciones que leen el progreso
// (`leerLoUltimo` y `recadoDe`) y las corre con `osascript` contra una línea de
// cada clase, tal como las escribe `instalar.js`. Solo en macOS.
'use strict';

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const AQUI = __dirname;

function laFuncion(fuente, nombre) {
  const m = new RegExp(`^on ${nombre}\\(.*?^end ${nombre}$`, 'ms').exec(fuente);
  if (!m) throw new Error(`no encuentro «on ${nombre}» en instalar.applescript`);
  return m[0];
}

// Las líneas, como las escribe instalar.js. Si cambia su forma, esto lo dice.
const FORMAS = ['`PASO\\t${paso}\\t${PASOS}\\t${texto}\\n`', '`DETALLE\\t${texto}\\n`', "`FIN\\t${bien ? 'ok' : 'error'}\\t${mensaje || ''}\\n`"];
const CASOS = [
  { linea: 'PASO\t3\t9\tPoniendo Claude', clase: 'PASO', dato: '3', recado: 'Poniendo Claude' },
  { linea: 'DETALLE\tDescargando lo que hace falta (unos 40 MB)…', clase: 'DETALLE', dato: 'Descargando lo que hace falta (unos 40 MB)…', recado: '' },
  { linea: 'FIN\tok\t/Users/ana/Documents', clase: 'FIN', dato: 'ok', recado: '/Users/ana/Documents' },
  { linea: 'FIN\terror\t', clase: 'FIN', dato: 'error', recado: '' },
  { linea: 'SOLO', clase: 'SOLO', dato: '', recado: '' },
  { linea: '', clase: '', dato: '', recado: '' },
];

function probar() {
  if (process.platform !== 'darwin') return { saltada: 'SALTADA: el diálogo es AppleScript, solo en macOS' };
  const fuente = fs.readFileSync(path.join(AQUI, 'instalar.applescript'), 'utf8');
  const instalar = fs.readFileSync(path.join(AQUI, 'instalar.js'), 'utf8');
  for (const forma of FORMAS) {
    if (!instalar.includes(forma)) throw new Error(`instalar.js ya no escribe ${forma}: pon al día los casos de probar-el-dialogo.js`);
  }
  const taller = fs.mkdtempSync(path.join(os.tmpdir(), 'dialogo-mac-'));
  try {
    const guion = path.join(taller, 'leer.applescript');
    fs.writeFileSync(guion, [
      'on run argv',
      '\tset loLeido to leerLoUltimo(item 1 of argv)',
      '\treturn (clase of loLeido) & "|" & (dato of loLeido) & "|" & recadoDe(loLeido)',
      'end run',
      '',
      laFuncion(fuente, 'leerLoUltimo'),
      '',
      laFuncion(fuente, 'recadoDe'),
      '',
    ].join('\n'));
    const malos = [];
    CASOS.forEach((caso, i) => {
      const fichero = path.join(taller, `progreso-${i}.txt`);
      // Como lo deja instalar.js: lo anterior y, al final, la línea que toca.
      fs.writeFileSync(fichero, `PASO\t1\t9\tEmpezando\n${caso.linea}${caso.linea ? '\n' : ''}`);
      if (!caso.linea) fs.writeFileSync(fichero, '');
      let salida;
      try {
        salida = execFileSync('/usr/bin/osascript', [guion, fichero], { encoding: 'utf8' }).replace(/\n$/, '');
      } catch (error) {
        malos.push(`«${caso.linea || '(vacía)'}»: ${String(error.stderr || error.message).trim()}`);
        return;
      }
      const esperado = `${caso.clase}|${caso.dato}|${caso.recado}`;
      if (salida !== esperado) malos.push(`«${caso.linea || '(vacía)'}»: da «${salida}», tocaba «${esperado}»`);
    });
    if (malos.length) throw new Error(`el diálogo del Mac no lee el progreso:\n  ${malos.join('\n  ')}`);
    return { bien: CASOS.length };
  } finally {
    fs.rmSync(taller, { recursive: true, force: true });
  }
}

module.exports = { probar, CASOS };

if (require.main === module) {
  try {
    const r = probar();
    console.log(r.saltada || `El diálogo del Mac lee bien las ${r.bien} clases de línea.`);
  } catch (error) {
    console.error(error.message);
    process.exit(1);
  }
}
