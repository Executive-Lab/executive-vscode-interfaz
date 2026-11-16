#!/usr/bin/env node
// El vigía de RSC (decisión 201): avisa en cuanto sale una versión de RSC más nueva
// que la que lleva la barra, y dice si el contrato pasa con ella.
//
//   node herramientas/vigia-rsc.js versiones          → fijada=…, ultima=… y como=… (para GitHub)
//   node herramientas/vigia-rsc.js como-si <versión>  → la barra de esta copia, como si la llevara
//
// ── Por qué existe ──────────────────────────────────────────────────────
//
// La 4 salió y, hasta la 200, quien montaba RSC desde el chat se quedaba con una barra
// que miraba y no hacía: «Añadir», «Arreglar» y «Poner al día» decían que la carpeta iba
// por delante. Se vio tarde. Y no hace falta una serie nueva: para la barra, cualquier
// versión más nueva que la suya va por delante (`comoEsLaVersion`, P7), así que una
// carpeta que se pone al día sola a una 4.2 deja de recibir lo que escribe la barra.
//
// El vigía no cambia nada. Lo corre `.github/workflows/vigia-rsc.yml` cada semana: si hay
// una versión nueva, le pasa el contrato y abre una incidencia, una por versión.
//
// ── Lo que no se fía ────────────────────────────────────────────────────
//
// La versión sale de npm y decide qué se baja después. Solo pasan tres números, sin
// espacios ni nada detrás, como en `rsc.js` (revisión de seguridad de P9, L1).

const fs = require('node:fs');
const path = require('node:path');

const RAIZ = path.join(__dirname, '..');
const PAQUETE = '@ericrisco/rsc';
const TRES_NUMEROS = /^(\d+)\.(\d+)\.(\d+)$/;

const numeros = (v) => {
  const partes = typeof v === 'string' ? v.match(TRES_NUMEROS) : null;
  return partes ? partes.slice(1, 4).map(Number) : null;
};

// Cómo va la última frente a la de la barra, con la misma regla que `comoEsLaVersion`:
// número a número, de izquierda a derecha.
function comoVa({ fijada, ultima }) {
  const [a, b] = [numeros(ultima), numeros(fijada)];
  if (!a || !b) return 'rara';
  for (let i = 0; i < 3; i += 1) {
    if (a[i] !== b[i]) return a[i] > b[i] ? 'nueva' : 'vieja';
  }
  return 'igual';
}

// La que lleva la barra: la del arnés de dentro. La batería exige que diga lo mismo que
// el resto de sitios donde está escrita.
function laFijada(raiz = RAIZ) {
  const paquete = JSON.parse(fs.readFileSync(path.join(raiz, 'extension', 'media', 'harness', 'package.json'), 'utf8'));
  return paquete.dependencies[PAQUETE];
}

async function laUltima() {
  const respuesta = await fetch(`https://registry.npmjs.org/${PAQUETE.replace('/', '%2f')}/latest`, {
    headers: { accept: 'application/json', 'user-agent': 'executive-lab-vigia-rsc' },
  });
  if (!respuesta.ok) throw new Error(`npm contesta ${respuesta.status}`);
  return (await respuesta.json()).version;
}

// Así empieza el título: con eso se sabe si ya se avisó de esta versión.
const empiezaPor = (ultima) => `RSC ${ultima} está publicada`;

// El contrato se pasa como si la barra ya llevara la versión nueva. Sin esto, la barra la
// ve por delante y el contrato cae siempre por la versión («se prueba el arnés que viaja
// dentro», y lo que no corre en una carpeta que va por delante), aunque RSC no haya
// cambiado nada: el aviso diría «falla» con cualquier versión (revisión de la 201). La
// pregunta es la de antes de subir: «si la barra la trae, ¿RSC acepta lo que le manda?».
// Solo en la copia desechable de GitHub, nunca en la de trabajo.
const LA_DE_RESPALDO = /^const VERSION_DE_RESPALDO = '\d+\.\d+\.\d+';$/m;
function hacerComoSiLlevara(version, raiz = RAIZ) {
  if (!numeros(version)) throw new Error(`no es una versión de tres números: ${JSON.stringify(version)}`);
  const fichero = path.join(raiz, 'extension', 'src', 'rsc.js');
  const texto = fs.readFileSync(fichero, 'utf8');
  const veces = (texto.match(new RegExp(LA_DE_RESPALDO.source, 'gm')) || []).length;
  if (veces !== 1) throw new Error(`en rsc.js la versión de respaldo sale ${veces} veces, y tiene que salir una`);
  fs.writeFileSync(fichero, texto.replace(LA_DE_RESPALDO, `const VERSION_DE_RESPALDO = '${version}';`));
  return version;
}

// Qué hacer con el aviso: 'ya' si el vigía ya avisó de esta versión, abierta o cerrada;
// 'seco' si se lanzó en seco; 'abrir' si no. Solo cuentan las que abrió el propio vigía: el
// repositorio es público, y una incidencia de cualquiera con ese título lo callaba
// (revisión de la 201).
const EL_VIGIA = 'github-actions[bot]';
function queHacer({ todas = [], ultima, enSeco = '' }) {
  const ya = (Array.isArray(todas) ? todas : []).find((i) => i && !i.pull_request
    && i.user && i.user.login === EL_VIGIA
    && typeof i.title === 'string' && i.title.startsWith(empiezaPor(ultima)));
  if (ya) return { que: 'ya', numero: ya.number };
  return { que: enSeco === '1' ? 'seco' : 'abrir' };
}

// El aviso, para quien lleva la barra. `contrato`: 'pasa', 'falla' o 'no-corrio'.
function elAviso({ fijada, ultima, contrato, fallos = 0, enlace = '' }) {
  if (comoVa({ fijada, ultima }) !== 'nueva') throw new Error(`no hay nada que avisar: ${ultima} frente a ${fijada}`);
  const serie = numeros(ultima)[0] !== numeros(fijada)[0];
  const queDice = {
    pasa: `El contrato con la ${ultima}, con la barra como si ya la llevara, **pasa**: lo que la barra le manda, RSC lo sigue aceptando.`,
    falla: `El contrato con la ${ultima}, con la barra como si ya la llevara, **falla**${fallos ? ` (${fallos} ${fallos === 1 ? 'comprobación' : 'comprobaciones'})` : ''}: hay algo que la barra le manda y RSC ya no acepta igual.`,
    'no-corrio': `El contrato con la ${ultima} **no se ha podido pasar**: algo falló antes, al bajarla o al prepararla.`,
  }[contrato] || `El contrato con la ${ultima}: sin resultado.`;
  return {
    titulo: `${empiezaPor(ultima)}, y la barra lleva la ${fijada}`,
    cuerpo: [
      `La última de RSC es la **${ultima}**. La barra lleva la **${fijada}**.${serie ? ' Cambia la serie.' : ''}`,
      '',
      `Mientras la barra no la traiga, una carpeta que se ponga al día sola a la ${ultima} irá por delante de la barra, y la barra no escribirá en ella (P7): «Añadir», «Arreglar» y «Poner al día» dirán que la carpeta va por delante. Pasa con las que se montan o se ponen al día desde el chat.`,
      '',
      queDice,
      ...(enlace ? ['', `Lo que dijo, entero: ${enlace}`] : []),
      '',
      '**Qué hacer.** Subir la versión de RSC en la barra, en todos los sitios donde está escrita (la decisión 200 es la guía), y pasar la batería con `--con-arnes`, el contrato y GitHub.',
      '',
      'Lo ha abierto el vigía de RSC (`.github/workflows/vigia-rsc.yml`, decisión 201). Avisa una vez por versión: cerrar esta incidencia no hace que vuelva a salir.',
    ].join('\n'),
  };
}

async function versiones() {
  // `VIGIA_FIJADA` y `VIGIA_ULTIMA`, para probarlo sin cambiar la barra ni preguntar a npm.
  const fijada = process.env.VIGIA_FIJADA || laFijada();
  const ultima = process.env.VIGIA_ULTIMA || await laUltima();
  const como = comoVa({ fijada, ultima });
  // Una versión rara no se dice: decidiría qué se baja después.
  if (como === 'rara') {
    console.error(`El vigía no se fía de estas versiones: la barra ${JSON.stringify(fijada)}, la última ${JSON.stringify(ultima)}.`);
    process.exitCode = 1;
    return;
  }
  console.log(`fijada=${fijada}\nultima=${ultima}\ncomo=${como}`);
}

if (require.main === module) {
  const orden = process.argv[2];
  if (orden === 'versiones') {
    versiones().catch((error) => {
      console.error(`El vigía no ha podido mirar las versiones: ${error.message}`);
      process.exitCode = 1;
    });
  } else if (orden === 'como-si') {
    try {
      console.log(`La barra, como si llevara la ${hacerComoSiLlevara(process.argv[3])}.`);
    } catch (error) {
      console.error(`El vigía no ha podido poner la barra a esa versión: ${error.message}`);
      process.exitCode = 1;
    }
  } else {
    console.error('Uso: node herramientas/vigia-rsc.js versiones | como-si <versión>');
    process.exitCode = 2;
  }
}

module.exports = { comoVa, laFijada, laUltima, elAviso, empiezaPor, hacerComoSiLlevara, queHacer };
