// Los proyectos de dentro: la carpeta como monorepo (decisión 195).
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

// Un nombre que se puede enseñar y meter en un encargo: sin caracteres de control
// (tampoco los de la segunda tabla ni los separadores de línea de Unicode), sin
// «» —que cerrarían las comillas del encargo y colarían texto como si fuera
// nuestro—, sin punto delante y no muy largo. Espacios, tildes y paréntesis, sí:
// «mi proyecto» es un nombre normal. Uno que no cumple no es un proyecto para la
// barra: mejor no enseñarlo que enseñarlo roto. La misma regla en todos los sitios
// que leen una carpeta de proyecto (`proyectos.js`, `por-donde-ibas.js`).
const NOMBRE_QUE_VALE = /^(?!\.)[^\0-\x1f\x7f-\x9f\u2028\u2029«»/\\]{1,100}$/;
const nombreQueVale = (nombre) => typeof nombre === 'string' && NOMBRE_QUE_VALE.test(nombre);

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
      .filter((e) => e.isDirectory() && !NO_SE_MIRA.has(e.name) && nombreQueVale(e.name))
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
  // Lo que conviene leer antes de tocarlo, por este orden y solo lo que existe: lo
  // común a todos los proyectos (el índice de su documentación y el README de la
  // carpeta que los guarda, donde el monorepo de verdad dice qué subida despliega),
  // sus reglas y su índice, y lo que lleve dentro.
  const arriba = path.posix.dirname(rel);
  const candidatos = [
    `${DOCUMENTACION.join('/')}/README.md`,
    ...(arriba !== '.' ? [`${arriba}/README.md`] : []),
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
  // Su índice, para «Conocimiento de…»: relativo a la wiki, que es como lo abre la barra.
  const indice = docs && paraLeer.includes(`${docs}/index.md`) ? `proyectos/${nombre}/index.md` : null;
  return { nombre, rel, ruta: path.join(raiz, ...rel.split('/')), docs, paraLeer, indice };
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

// ── Cómo está cada uno ───────────────────────────────────────────────────
//
// Un `git status` por proyecto, todos a la vez, con tope de 5 segundos cada uno.
// Un repintado lo pide muchas veces seguidas (decisión 188), así que lo visto se
// guarda unos segundos. Lo que no se pudo mirar es `null`, nunca «guardado»
// (decisión 189).
const TOPE_DE_GIT = 5000;
const SIN_MIRAR = Object.freeze({ sinGuardar: null, sinSubir: 0, rama: null, ramaSinSubir: false });
// Sin confianza no es que git no conteste: es que no se le pregunta. Se dice distinto,
// con su salida (183): darle la confianza.
const SIN_CONFIANZA = Object.freeze({ ...SIN_MIRAR, sinConfianza: true });
const VALE_DURANTE = 15000;
const vistos = new Map();

function leerElEstado(salida) {
  let sinGuardar = 0;
  let sinSubir = 0;
  let rama = null;
  let conUpstream = false;
  let conCuentas = false;
  let sinCopias = false;
  for (const linea of String(salida).split('\n')) {
    if (linea.startsWith('# branch.oid ')) sinCopias = linea.trim().endsWith('(initial)');
    else if (linea.startsWith('# branch.head ')) rama = linea.slice('# branch.head '.length).trim();
    else if (linea.startsWith('# branch.upstream ')) conUpstream = true;
    else if (linea.startsWith('# branch.ab ')) {
      conCuentas = true;
      const m = linea.match(/\+(\d+) -\d+/);
      if (m) sinSubir = Number(m[1]);
    } else if (linea.trim() && !linea.startsWith('#')) sinGuardar += 1;
  }
  if (rama === '(detached)') rama = null;
  // Una rama que no está en GitHub: nunca se subió, o se subió y allí se borró
  // (fusionada y borrada: git sigue nombrándola, pero ya no sabe contar contra
  // ella). Sin ninguna copia todavía, no hay nada que subir. Si nunca se subió,
  // `comoEsta` mira además que haya adónde subirla.
  const ramaSinSubir = Boolean(rama) && !sinCopias && (!conUpstream || !conCuentas);
  return { sinGuardar, sinSubir, rama, ramaSinSubir, conUpstream };
}

async function comoEsta(p, { ahora = Date.now() } = {}) {
  const visto = vistos.get(p.ruta);
  if (visto && ahora - visto.cuando < VALE_DURANTE) return visto.estado;
  const r = await procesos.ejecutar(
    entorno.git(),
    [...procesos.ARGS_DE_GIT, '-C', p.ruta, 'status', '--porcelain=v2', '--branch'],
    { tiempoMaximo: TOPE_DE_GIT },
  );
  let estado = SIN_MIRAR;
  if (r.codigo === 0) {
    const { conUpstream, ...leido } = leerElEstado(r.salida);
    estado = leido;
    // Una rama que nunca se subió solo se ofrece subir si hay adónde: un
    // repositorio sin GitHub tendría el botón para siempre (revisión de la 195).
    if (leido.ramaSinSubir && !conUpstream) {
      const remotos = await procesos.ejecutar(entorno.git(), [...procesos.ARGS_DE_GIT, '-C', p.ruta, 'remote'], { tiempoMaximo: TOPE_DE_GIT });
      if (remotos.codigo !== 0 || !remotos.salida.trim()) estado = { ...leido, ramaSinSubir: false };
    }
  }
  vistos.set(p.ruta, { cuando: ahora, estado });
  return estado;
}

// Lo visto deja de valer cuando el git de un proyecto se mueve: una copia nueva,
// otra rama, una subida. Lo dice el vigía de la extensión, que mira sus registros
// (`.git/logs/`, ver `LOS_REGISTROS`). Sin eso, tras «Guardar» la barra seguía
// diciendo «Cambios sin guardar» hasta 15 segundos (revisión de la 195).
const olvidar = () => vistos.clear();

// Lo que el vigía mira de cada proyecto: los registros de su git, que cambian con
// cada copia, cada cambio de rama y cada subida, y nunca con un `status`. El índice
// no: lo toca cualquier `git status`, también el del propio editor, y la barra se
// pondría a repintar sin parar (decisión 188).
const LOS_REGISTROS = ['*/.git/logs/**', '*/*/.git/logs/**'];
const esDeUnRegistro = (ruta) => /[\\/]\.git[\\/]logs[\\/]/.test(String(ruta || ''));

// Solo en una carpeta de confianza: un `git status` dentro de un repositorio corre
// su configuración, y un filtro `clean` suyo es una orden de quien hizo esa carpeta
// (la revisión de seguridad de la 147 lo reprodujo; `core.fsmonitor` ya va apagado).
// Es la misma línea que el git del propio editor, que no entra en una carpeta sin
// confianza. Sin ella, cada uno sale sin mirar: nunca «guardado».
async function comoEstan(lista = cuales(), { conConfianza = true } = {}) {
  return Promise.all(lista.map(async (p) => ({ ...p, ...(conConfianza ? await comoEsta(p) : SIN_CONFIANZA) })));
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
    'Antes de subir, mira en sus reglas si subir a esa rama pone algo a la vista de otros: una web, una aplicación, un correo. Si es así, dímelo en una frase sencilla, sin palabras técnicas, y espera a que te diga que sí.',
  ].join('\n');
}

function mirarloBien(p) {
  return [
    queHay(p),
    '',
    `No he podido mirar si ${p.rel}/ tiene cambios sin guardar: su git no contesta.`, // diccionario: interno
    '',
    'Míralo y dime en una frase qué le pasa y qué hago. No cambies nada sin preguntarme.',
  ].join('\n');
}

const ACCIONES = {
  trabajar: { etiqueta: (p) => `Trabajar en «${p.nombre}»`, icono: '💬', prompt: trabajarEn },
  guardar: { etiqueta: (p) => `Guardar «${p.nombre}» en git`, icono: '💾', prompt: guardar },
  subir: { etiqueta: (p) => `Subir «${p.nombre}» a GitHub`, icono: '☁️', prompt: subir },
  // Un aviso sin salida no vale (183): lo que no se pudo mirar, lo mira el asistente.
  mirar: { etiqueta: () => 'Que lo mire el asistente', icono: '💬', prompt: mirarloBien },
};

// El botón ya hecho (P6): quien tiene los datos arma la acción.
function boton(cual, p) {
  const a = ACCIONES[cual];
  return { etiqueta: a.etiqueta(p), icono: a.icono, accion: { tipo: 'pedir', prompt: a.prompt(p) } };
}

// La rama de siempre no se nombra: solo se dice cuando está en otra.
const RAMAS_PRINCIPALES = ['main', 'master'];

// Lo que se enseña de cada uno: cómo está, dicho, y sus botones. Sin confianza no se
// dice nada de cada uno: el apartado lo dice una vez, con su botón.
function enPantalla(p) {
  const estado = p.sinConfianza ? ''
    : p.sinGuardar === null
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
    ...(p.sinGuardar === null && !p.sinConfianza ? [boton('mirar', p)] : []),
    // Su documentación, que en Conocimiento no está entre los temas de la raíz. Con el
    // nombre del diccionario («Conocimiento de <nombre>»), no con una perífrasis (98).
    ...(p.indice ? [{ etiqueta: `Conocimiento de «${p.nombre}»`, icono: '📚', accion: { tipo: 'leerArticulo', ruta: p.indice } }] : []),
    ...(guardarlo ? [guardarlo] : []),
    ...(p.sinSubir || p.ramaSinSubir ? [boton('subir', p)] : []),
  ];
  return {
    nombre: p.nombre,
    estado,
    rama: p.rama,
    sinGuardar: p.sinGuardar === null ? null : p.sinGuardar > 0,
    sinConfianza: Boolean(p.sinConfianza),
    // El de guardar, aparte: la línea de las copias lo lleva también.
    guardar: guardarlo,
    botones,
  };
}

module.exports = {
  cuales, tieneSuGit, comoEsta, comoEstan, olvidar, leerElEstado, enPantalla, nombreQueVale, LOS_REGISTROS, esDeUnRegistro, TOPE,
};
