// En qué estamos: lo que RSC escribe cuando se construye algo con SDD.
//
// ── Qué es esto ──────────────────────────────────────────────────────────
//
// SDD es la forma de RSC de construir: antes de escribir nada se acuerda **qué**
// se quiere y **por qué** (la spec), después **cómo** se va a hacer (el plan) y
// la lista de tareas que salen de él. Todo eso queda escrito bajo
// `02-DOCS/wiki/sdd/` y la barra no enseñaba nada, salvo la constitución.
//
// Lo interesante para quien no es técnico: **una spec no es un documento
// técnico**. El propio protocolo lo dice — «what & why, no how». Es literalmente
// lo que cualquiera querría leer para saber en qué anda su proyecto.
//
// ── Por qué esto aparece y desaparece ────────────────────────────────────
//
// Un arnés de contabilidad no tiene specs y no las va a tener nunca, así que en
// esa carpeta este apartado no existe. Uno donde se esté construyendo algo, sí.
// Es la misma regla que el resto de la barra: nada está predefinido, sale lo
// que esa carpeta tenga.

const fs = require('node:fs');
const path = require('node:path');
const proyecto = require('./proyecto');
const frontmatter = require('./frontmatter');
const rutas = require('./rutas');

const SDD = ['02-DOCS', 'wiki', 'sdd'];

// Las cuatro cosas que se leen, en el orden en que se escriben.
//
// `verifications/` entró al auditar el mapeo el 22-09-2026: la cadena la
// escribe al terminar —qué se comprobó y con qué resultado— y no se veía por
// ningún lado. Es la única de las cuatro que contesta «¿esto funciona?», que
// es justo lo que quiere saber quien no va a leer un plan.
//
// Lo que sigue sin salir, a propósito: `progress/`, `sessions/` y `archive/`
// son andamio de la cadena —dónde se quedó una sesión, el registro de aplicar
// tarea por tarea—, no algo que alguien abra para enterarse de su proyecto.
const MONTONES = [
  { id: 'proposals', etiqueta: 'Antes de empezar', pista: 'Lo que se miró antes de decidir.' },
  { id: 'specs', etiqueta: 'Qué queremos', pista: 'Qué se quiere y por qué. Sin nada técnico.' },
  { id: 'plans', etiqueta: 'Cómo se va a hacer', pista: 'El plan, con su lista de tareas.' },
  { id: 'verifications', etiqueta: 'Qué se ha comprobado', pista: 'Lo que se probó al terminar, y si salió bien.' },
];

const TOPE = 20;

// Las tareas van en una tabla con identificadores `T001`, `T002`… No llevan
// marca de hecho o pendiente, así que se cuentan y no se dice cuántas van:
// inventarse un progreso que el fichero no dice sería mentir.
const CUENTA_TAREAS = /^\|\s*T\d{3}\s*\|/gm;

function titulo(crudo, nombre) {
  const campos = frontmatter.analizar(crudo);
  if (typeof campos.title === 'string' && campos.title.trim()) return campos.title.trim();
  const del = crudo.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/, '').match(/^#\s+(.+)$/m);
  return (del && del[1].trim()) || nombre.replace(/[-_]+/g, ' ').replace(/\.md$/, '');
}

// En un monorepo, lo de cada proyecto vive en `02-DOCS/wiki/proyectos/<proyecto>/sdd/`,
// con la misma forma (decisión 195). Se enseña junto a lo de la raíz, con el
// nombre de su proyecto. Solo carpetas de verdad, sin enlaces, y con tope.
const DE_LOS_PROYECTOS = ['02-DOCS', 'wiki', 'proyectos'];
const TOPE_DE_PROYECTOS = 30;
const esFichero = (completa) => {
  try {
    return fs.lstatSync(completa).isFile();
  } catch {
    return false;
  }
};
const esCarpeta = (completa) => {
  try {
    return fs.lstatSync(completa).isDirectory();
  } catch {
    return false;
  }
};

function losProyectosConSdd() {
  const base = proyecto.ruta(...DE_LOS_PROYECTOS);
  if (!base || !esCarpeta(base)) return [];
  let nombres;
  try {
    nombres = fs.readdirSync(base);
  } catch {
    return [];
  }
  return nombres.filter((n) => require('./subproyectos').nombreQueVale(n)).sort().slice(0, TOPE_DE_PROYECTOS)
    .filter((n) => esCarpeta(path.join(base, n)) && esCarpeta(path.join(base, n, 'sdd')));
}

function leerMonton(cual) {
  return leerUnMonton(proyecto.ruta(...SDD, cual), `${cual}/`, null);
}

// `delante`: cómo se nombra el fichero para volver a abrirlo (`dondeVive`).
function leerUnMonton(carpeta, delante, deProyecto) {
  if (!carpeta || !esCarpeta(carpeta)) return [];

  let nombres;
  try {
    // Ficheros de verdad: un enlace podría apuntar fuera y enseñar su título, o
    // abrirlo (revisión de seguridad de la 195; pasaba también con lo de la raíz).
    nombres = fs.readdirSync(carpeta).filter((n) => n.endsWith('.md') && !n.startsWith('.') && esFichero(path.join(carpeta, n)));
  } catch {
    return [];
  }

  return nombres.sort().slice(0, TOPE).map((nombre) => {
    let crudo = '';
    try {
      crudo = fs.readFileSync(path.join(carpeta, nombre), 'utf8');
    } catch { /* se queda con el nombre */ }

    const campos = frontmatter.analizar(crudo);
    const tareas = (crudo.match(CUENTA_TAREAS) || []).length;
    return {
      fichero: `${delante}${nombre}`,
      // El nombre de su proyecto, en un monorepo; null, lo de la raíz.
      proyecto: deProyecto,
      titulo: titulo(crudo, nombre),
      // `status` lo escribe SDD; si no está, no se inventa. Dicho con el diccionario.
      estado: comoEsta(campos.status),
      tareas,
    };
  });
}

// ── Cómo está, en pocas palabras ─────────────────────────────────────────
//
// `status` es texto libre: lo escribe la cadena SDD o quien sea, en inglés o en
// español. En un monorepo de verdad salieron treinta valores distintos —`shipped`,
// `pass`, `approved-autopilot`, `aprobado-en-autopiloto`, `verified_for_publication`,
// `research_complete_pending_scope_discussion`…—, y la pantalla los enseñaba tal
// cual, en inglés (decisión 195). Se reducen a las palabras del diccionario.
//
// Por palabras enteras, no por trozos: con trozos, «implemented» salía «en marcha»
// e «inactive» también (revisión del vigía del diccionario). Y en este orden:
//   · lo que va detrás de «then» o «luego» es lo de ahora: «failed-then-passed» está
//     comprobado;
//   · lo que va detrás de «after», «with», «for» o «tras» cuenta la historia y no se
//     mira: «approved-after-review» está acordado, «passed-with-fixes» comprobado;
//   · una negación se lleva la palabra que niega, y solo esa: «not-approved» no dice
//     nada, «aprobado-sin-cambios» está acordado, «pass-no-failures» comprobado
//     (revisiones de la 195).
// Entre las que quedan gana la de más arriba en `EN_ORDEN`. Lo que no se entiende no
// se enseña: mejor nada que una palabra que nadie sabe leer.
const PALABRAS = {
  sustituido: ['superseded', 'sustituido', 'sustituida', 'replaced', 'reemplazado', 'reemplazada'],
  retirado: ['retracted', 'cancelled', 'canceled', 'abandoned', 'deprecated', 'rejected', 'withdrawn', 'retirado', 'retirada', 'descartado', 'descartada', 'cancelado', 'cancelada', 'rechazado', 'rechazada'],
  'salió mal': ['failed', 'fail', 'failing', 'fallido', 'fallida', 'suspendido'],
  parado: ['blocked', 'bloqueado', 'bloqueada', 'stuck', 'parado', 'parada'],
  // «hold» suelto no: en «done (hold removed)» no está aplazado.
  aplazado: ['deferred', 'postponed', 'paused', 'aplazado', 'aplazada', 'pausado', 'pausada'],
  'en revisión': ['review', 'reviewing', 'revision', 'revisando', 'clarified', 'clarificado', 'clarificada'],
  'en borrador': ['draft', 'borrador', 'proposed', 'propuesto', 'propuesta', 'pending', 'pendiente', 'gathering', 'research', 'wip', 'idea'],
  comprobado: ['pass', 'passed', 'verified', 'comprobado', 'comprobada', 'verificado', 'verificada'],
  terminado: ['done', 'shipped', 'complete', 'completed', 'finished', 'implemented', 'delivered', 'merged', 'closed', 'published', 'hecho', 'hecha', 'terminado', 'terminada', 'cerrado', 'cerrada', 'publicado', 'publicada', 'completado', 'completada'],
  acordado: ['approved', 'approve', 'accepted', 'agreed', 'ratified', 'authorized', 'authorised', 'stable', 'ready', 'reviewed', 'aprobado', 'aprobada', 'aceptado', 'aceptada', 'acordado', 'acordada', 'listo', 'lista', 'revisado', 'revisada'],
  'en marcha': ['progress', 'active', 'ongoing', 'started', 'doing', 'implementing', 'curso', 'marcha', 'activo', 'activa', 'empezado', 'empezada'],
};
const EN_ORDEN = ['sustituido', 'retirado', 'salió mal', 'parado', 'aplazado', 'en revisión', 'en borrador', 'comprobado', 'terminado', 'acordado', 'en marcha'];
const DE_CADA_PALABRA = new Map(Object.entries(PALABRAS).flatMap(([dicho, palabras]) => palabras.map((p) => [p, dicho])));
const LO_DE_AHORA = new Set(['then', 'luego', 'despues', 'now', 'ahora']);
const LA_HISTORIA = new Set(['after', 'with', 'for', 'tras', 'con', 'por', 'desde']);
const NIEGA = new Set(['not', 'no', 'non', 'never', 'without', 'sin', 'nunca']);

function comoEsta(status) {
  if (typeof status !== 'string' || !status.trim()) return '';
  let palabras = status.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').split(/[^a-z0-9]+/).filter(Boolean);
  const ahora = palabras.map((p) => LO_DE_AHORA.has(p)).lastIndexOf(true);
  if (ahora !== -1) palabras = palabras.slice(ahora + 1);
  const corte = palabras.findIndex((p) => LA_HISTORIA.has(p));
  if (corte !== -1) palabras = palabras.slice(0, corte);
  const quedan = [];
  for (let i = 0; i < palabras.length; i += 1) {
    if (!NIEGA.has(palabras[i])) { quedan.push(palabras[i]); continue; }
    while (i + 1 < palabras.length && NIEGA.has(palabras[i + 1])) i += 1;
    i += 1; // la negada
  }
  const dichas = new Set(quedan.map((p) => DE_CADA_PALABRA.get(p)).filter(Boolean));
  return EN_ORDEN.find((d) => dichas.has(d)) || '';
}

const conCosas = (leer) => MONTONES.map((m) => ({ ...m, cosas: leer(m.id) })).filter((m) => m.cosas.length);

// Lo de la raíz.
function queHay() {
  return conCosas(leerMonton);
}

// Y lo de cada proyecto de un monorepo, aparte (decisión 195): con ocho proyectos
// salían noventa documentos mezclados con los de la raíz. Cada uno con lo suyo.
function deLosProyectos() {
  return losProyectosConSdd()
    .map((p) => ({ nombre: p, montones: conCosas((cual) => leerUnMonton(proyecto.ruta(...DE_LOS_PROYECTOS, p, 'sdd', cual), `proyectos/${p}/sdd/${cual}/`, p)) }))
    .filter((p) => p.montones.length);
}

const hayAlgo = () => queHay().length > 0 || deLosProyectos().length > 0;

// Abrir uno. El nombre viene de un mensaje del panel, así que se comprueba que
// sigue siendo de ahí dentro y que es un `.md`. Lo de un proyecto (decisión 195)
// tiene que tener exactamente su forma, y su carpeta no puede ser un enlace.
const DE_UN_PROYECTO = /^proyectos\/([^/\\]+)\/sdd\/(proposals|specs|plans|verifications)\/[^/\\]+\.md$/;
function dondeVive(fichero) {
  if (typeof fichero !== 'string') return null;
  const deProyecto = DE_UN_PROYECTO.exec(fichero);
  if (deProyecto && !losProyectosConSdd().includes(deProyecto[1])) return null;
  const raiz = deProyecto ? proyecto.ruta(...DE_LOS_PROYECTOS, deProyecto[1], 'sdd') : proyecto.ruta(...SDD);
  if (!raiz) return null;

  const completa = path.resolve(raiz, deProyecto ? fichero.split('/').slice(3).join('/') : fichero);
  const dentro = path.resolve(raiz) + path.sep;
  if (!completa.startsWith(dentro) || !completa.endsWith('.md')) return null;
  // Y el sitio real tiene que seguir dentro: con `specs/` enlazado a otra carpeta, el
  // listado no la enseñaba pero abrirla sí (revisión del guardián de la 195; pasaba
  // también con lo de la raíz). La misma guarda que `cerebro.dentroDeLaWiki`.
  if (!esFichero(completa)) return null;
  try {
    return rutas.estaDentro(fs.realpathSync.native(raiz), fs.realpathSync.native(completa)) ? completa : null;
  } catch {
    return null;
  }
}

module.exports = { queHay, deLosProyectos, hayAlgo, dondeVive, comoEsta, MONTONES };
