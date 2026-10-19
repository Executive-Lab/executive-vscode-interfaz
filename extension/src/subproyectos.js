// Los proyectos de dentro: la carpeta como monorepo (decisión 192).
//
// ── La forma ─────────────────────────────────────────────────────────────
//
// Jose, 19-10-2026: «hay que adaptar la interfaz del arnés a un proyecto monorepo
// estilo mono-repo-executive-lab». En esa forma la raíz lleva el arnés y su git,
// y cada proyecto es un clon de su propio repositorio dentro de `03-PROYECTOS/`,
// que el git de la raíz deja fuera. Su documentación no está dentro: vive en la
// raíz, en `02-DOCS/wiki/proyectos/<proyecto>/`, y se trabaja siempre desde la raíz.
//
// La barra daba por hecho un solo git. Con esta forma, «✓ Todo guardado» decía la
// verdad de la raíz y callaba los proyectos, y lo de dentro de uno se tomaba por
// desorden.
//
// ── Qué es un proyecto de dentro ─────────────────────────────────────────
//
// Se lee del disco (P5): una carpeta del primer o del segundo nivel con su propio
// `.git`, carpeta o fichero (un clon, un worktree o un submódulo). No hace falta
// que la de arriba se llame `03-PROYECTOS`. Sin entrar en las carpetas con punto,
// en `node_modules` ni en las del arnés, y sin seguir enlaces.
//
// ── Lo que hace la barra y lo que hace el asistente ──────────────────────
//
// La barra lee cómo está cada uno: si tiene cambios sin guardar, copias sin subir
// y en qué rama está. Guardar y subir los hace el asistente con un encargo, porque
// cada proyecto tiene sus reglas (cómo se escriben las copias, en qué rama, si
// subir a `main` publica una web) y saberlas pide leer su documentación. La barra
// nunca escribe en el git de un proyecto.

const fs = require('node:fs');
const path = require('node:path');
const proyecto = require('./proyecto');
const lecturas = require('./lecturas');
const procesos = require('./procesos');
const entorno = require('./entorno');

const NO_SE_MIRA = new Set(['node_modules', '01-TOOLS', '02-DOCS']);
const TOPE = 30;
const DOCUMENTACION = ['02-DOCS', 'wiki', 'proyectos'];

// Un nombre que se puede enseñar y meter en un encargo: sin saltos de línea ni
// caracteres de control, y no muy largo. Uno que no cumple no es un proyecto
// para la barra: mejor no enseñarlo que enseñarlo roto.
const NOMBRE_QUE_VALE = /^[^\0-\x1f\x7f]{1,100}$/;

// ¿Tiene su propio git? Un `.git` de verdad: una carpeta o un fichero, no un enlace.
function tieneSuGit(carpeta) {
  try {
    const e = fs.lstatSync(path.join(carpeta, '.git'));
    return e.isDirectory() || e.isFile();
  } catch {
    return false;
  }
}

function carpetasDe(carpeta) {
  try {
    return lecturas.entradas(carpeta)
      .filter((e) => e.isDirectory() && !e.name.startsWith('.') && !NO_SE_MIRA.has(e.name) && NOMBRE_QUE_VALE.test(e.name))
      .map((e) => e.name)
      .sort();
  } catch {
    return [];
  }
}

// Una carpeta de verdad dentro de la raíz, sin enlaces por medio.
function esCarpetaDeVerdad(completa) {
  try {
    return fs.lstatSync(completa).isDirectory();
  } catch {
    return false;
  }
}

function describir(raiz, rel) {
  const nombre = path.posix.basename(rel);
  const docsRel = path.posix.join(...DOCUMENTACION, nombre);
  const docs = esCarpetaDeVerdad(path.join(raiz, ...DOCUMENTACION, nombre)) ? docsRel : null;
  // Lo que conviene leer antes de tocarlo, por este orden y solo lo que existe:
  // sus reglas y su índice en la documentación de la raíz, y lo que lleve dentro.
  const candidatos = [
    ...(docs ? [`${docs}/reglas-del-asistente.md`, `${docs}/index.md`] : []),
    `${rel}/AGENTS.md`, `${rel}/CLAUDE.md`, `${rel}/README.md`,
  ];
  const paraLeer = candidatos.filter((r) => {
    try {
      return fs.lstatSync(path.join(raiz, ...r.split('/'))).isFile();
    } catch {
      return false;
    }
  });
  return { nombre, rel, ruta: path.join(raiz, ...rel.split('/')), docs, paraLeer };
}

// Los proyectos de dentro, en orden. Vacío si la carpeta no es un monorepo.
function cuales(raiz = proyecto.raiz()) {
  if (!raiz) return [];
  const hallados = [];
  for (const primera of carpetasDe(raiz)) {
    if (hallados.length >= TOPE) break;
    const completa = path.join(raiz, primera);
    // Uno del primer nivel es un proyecto entero: no se mira dentro.
    if (tieneSuGit(completa)) { hallados.push(primera); continue; }
    for (const segunda of carpetasDe(completa)) {
      if (hallados.length >= TOPE) break;
      if (tieneSuGit(path.join(completa, segunda))) hallados.push(`${primera}/${segunda}`);
    }
  }
  return hallados.map((rel) => describir(raiz, rel));
}

const hayAlguno = (raiz) => cuales(raiz).length > 0;

// ¿Esta ruta, relativa a la raíz y con «/», cae dentro de un proyecto de dentro?
function deCualEs(rel, lista = cuales()) {
  const limpia = String(rel || '').split(path.sep).join('/').replace(/^\.\/+/, '');
  return lista.find((p) => limpia === p.rel || limpia.startsWith(`${p.rel}/`)) || null;
}

// ── Cómo está cada uno ───────────────────────────────────────────────────
//
// Un `git status` por proyecto, todos a la vez, con tope de 5 segundos cada uno.
// Un repintado lo pide muchas veces seguidas (decisión 188), así que lo visto se
// guarda unos segundos. Lo que no se pudo mirar es `null`, nunca «guardado»
// (decisión 189).
const TOPE_DE_GIT = 5000;
const VALE_DURANTE = 15000;
const vistos = new Map();

function leerElEstado(salida) {
  let sinGuardar = 0;
  let sinSubir = 0;
  let rama = null;
  let conRemoto = false;
  for (const linea of String(salida).split('\n')) {
    if (linea.startsWith('# branch.head ')) rama = linea.slice('# branch.head '.length).trim();
    else if (linea.startsWith('# branch.upstream ')) conRemoto = true;
    else if (linea.startsWith('# branch.ab ')) {
      const m = linea.match(/\+(\d+) -\d+/);
      if (m) sinSubir = Number(m[1]);
    } else if (linea.trim() && !linea.startsWith('#')) sinGuardar += 1;
  }
  if (rama === '(detached)') rama = null;
  // Una rama que no está en GitHub todavía: todo lo suyo está sin subir.
  const ramaSinSubir = Boolean(rama) && !conRemoto;
  return { sinGuardar, sinSubir, rama, ramaSinSubir };
}

async function comoEsta(p, { ahora = Date.now() } = {}) {
  const visto = vistos.get(p.ruta);
  if (visto && ahora - visto.cuando < VALE_DURANTE) return visto.estado;
  const r = await procesos.ejecutar(
    entorno.git(),
    [...procesos.ARGS_DE_GIT, '-C', p.ruta, 'status', '--porcelain=v2', '--branch'],
    { tiempoMaximo: TOPE_DE_GIT },
  );
  const estado = r.codigo === 0 ? leerElEstado(r.salida) : { sinGuardar: null, sinSubir: 0, rama: null, ramaSinSubir: false };
  vistos.set(p.ruta, { cuando: ahora, estado });
  return estado;
}

// Tras pedirle algo al asistente, lo visto ya no vale.
const olvidar = () => vistos.clear();

async function comoEstan(lista = cuales()) {
  return Promise.all(lista.map(async (p) => ({ ...p, ...(await comoEsta(p)) })));
}

// ── Los tres encargos ────────────────────────────────────────────────────
//
// Con las cuatro partes de `encargos.js`: qué hay (leído del disco), qué tiene que
// quedar, qué no se toca y qué hay que avisar. Lo lee el asistente, no la persona:
// van las rutas tal cual.

function queHay(p) {
  return [
    `Esta carpeta es un monorepo: la raíz lleva el arnés y su propio git, y el proyecto «${p.nombre}» está en ${p.rel}/, con su propio git, aparte del de la raíz.`, // diccionario: interno
    p.paraLeer.length
      ? `Sus reglas y su documentación: ${p.paraLeer.join(', ')}. Léelas antes de tocar nada.`
      : 'No tiene documentación propia todavía.',
    p.docs
      ? `Lo que documentes de él va en ${p.docs}/, no dentro de ${p.rel}/.`
      : `Si documentas algo de él, va en ${DOCUMENTACION.join('/')}/${p.nombre}/, no dentro de ${p.rel}/.`,
  ].join(' ');
}

function trabajarEn(p) {
  return [
    `Vamos a trabajar en el proyecto «${p.nombre}».`,
    '',
    queHay(p),
    '',
    `Seguimos trabajando desde la raíz. Lo que cambies en el código de ${p.rel}/ se guarda en su propio git, con sus reglas, no en el de la raíz.`, // diccionario: interno
    '',
    `No toques los demás proyectos ni el arnés de la raíz salvo que te lo pida, y no montes un arnés dentro de ${p.rel}/.`,
    '',
    'Cuando lo hayas leído, dime en dos frases cómo está y pregúntame qué quiero hacer.',
  ].join('\n');
}

function guardar(p) {
  return [
    queHay(p),
    '',
    `Guarda en su propio git los cambios que tiene sin guardar ${p.rel}/, siguiendo sus reglas: cómo se escriben las copias y en qué rama. Si hay cambios que no son de lo mismo, haz una copia por cada cosa.`, // diccionario: interno
    '',
    'No subas nada a GitHub: solo guardar en este ordenador. No metas claves ni ficheros de acceso en la copia, ni nada de los demás proyectos.', // diccionario: interno
    '',
    'Si algo no está claro (un cambio que parece a medias, o uno que no sabes de quién es), pregúntame antes de guardarlo. Al terminar, dime qué has guardado.',
  ].join('\n');
}

function subir(p) {
  return [
    queHay(p),
    '',
    `Sube a GitHub las copias de ${p.rel}/ que no están subidas, en su propia rama y siguiendo sus reglas.`, // diccionario: interno
    '',
    'No subas nada de la raíz ni de los demás proyectos, y no fuerces la subida si GitHub tiene algo que aquí no está: dímelo.', // diccionario: interno
    '',
    'Antes de subir, mira en sus reglas si subir a esa rama publica una web o despliega algo. Si es así, dímelo con esas palabras y espera a que te diga que sí.',
  ].join('\n');
}

const ACCIONES = {
  trabajar: { etiqueta: (p) => `Trabajar en «${p.nombre}»`, icono: '💬', prompt: trabajarEn },
  guardar: { etiqueta: (p) => `Guardar «${p.nombre}» en git`, icono: '💾', prompt: guardar },
  subir: { etiqueta: (p) => `Subir «${p.nombre}» a GitHub`, icono: '☁️', prompt: subir },
};

// El botón ya hecho (P6): quien tiene los datos arma la acción.
function boton(cual, p) {
  const a = ACCIONES[cual];
  return { etiqueta: a.etiqueta(p), icono: a.icono, accion: { tipo: 'pedir', prompt: a.prompt(p) } };
}

// La rama de siempre no se nombra: solo se dice cuando está en otra.
const RAMAS_PRINCIPALES = ['main', 'master'];

// Lo que se enseña de cada uno: cómo está, dicho, y sus botones.
function enPantalla(p) {
  const estado = p.sinGuardar === null
    ? 'No he podido mirar si hay cambios sin guardar'
    : [
      p.sinGuardar ? 'Cambios sin guardar' : '✓ Todo guardado',
      p.sinSubir ? (p.sinSubir === 1 ? '1 copia sin subir' : `${p.sinSubir} copias sin subir`) : '',
      !p.sinSubir && p.ramaSinSubir ? 'Su rama no está en GitHub' : '',
      p.rama && !RAMAS_PRINCIPALES.includes(p.rama) ? `En la rama «${p.rama}»` : '',
    ].filter(Boolean).join(' · ');
  const guardarlo = p.sinGuardar ? boton('guardar', p) : null;
  const botones = [
    boton('trabajar', p),
    ...(guardarlo ? [guardarlo] : []),
    ...(p.sinSubir || p.ramaSinSubir ? [boton('subir', p)] : []),
  ];
  return {
    nombre: p.nombre,
    estado,
    rama: p.rama,
    sinGuardar: p.sinGuardar === null ? null : p.sinGuardar > 0,
    // El de guardar, aparte: la línea de las copias lo lleva también.
    guardar: guardarlo,
    botones,
  };
}

module.exports = {
  cuales, hayAlguno, deCualEs, tieneSuGit, comoEsta, comoEstan, olvidar, leerElEstado, enPantalla, boton,
  trabajarEn, guardar, subir, TOPE, DOCUMENTACION,
};
