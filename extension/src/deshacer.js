// Deshacer con RSC (decisión 173): quitar una habilidad o un agente que se añadió, y
// volver a lo que había antes de montar.
//
// Las dos cosas son de RSC y la barra no las inventa: `uninstall <id>` quita una
// habilidad o un agente (sus ficheros, su apunte en `.rsc.json` y en el estado) y
// `restore <copia>` devuelve lo que guardó en `.rsc/backups/`. Ninguno pregunta
// nada, así que la pregunta es de la barra, con un clic de la persona (P9): aquí
// solo está lo que decide si se ofrece y lo que se corre. Preguntar y repintar, en
// `extension.js`.
//
// Lo que no se ofrece nunca: lo suyo (`ownSkills`), lo que ponen los raíles de la
// barra (`acciones.esDeLaBarra`), lo que el arnés pone de suelo y lo de
// fontanería. Un botón que quita algo que hace falta para funcionar no es un
// botón: es una avería con rótulo.

const fs = require('node:fs');
const path = require('node:path');
const rsc = require('./rsc');
const proyecto = require('./proyecto');
const { etiqueta: unRotulo } = require('./limpio');

// Lo que RSC equipa siempre (`default-skill-floor.js`): `sync` lo volvería a poner. Con la 4
// son nueve (decisión 200), y una prueba lo compara con el paquete.
const SUELO = new Set(['orient', 'suggest', 'unslop', 'ftd', 'connect-tool', 'design', 'ux', 'tidy', 'security-audit']);

// Un id que RSC leería como un nombre y nunca como una opción: no empieza por `-`.
// El analizador de RSC no entiende `--` como fin de opciones (`rsc.js`: lo salta como
// a cualquier `--algo`), así que no se usa: un agente llamado `--all` corría `uninstall
// --all`, que en RSC es `purge`. Aquí no llega ni a ofrecerse.
const ID_DE_HABILIDAD = /^[a-z0-9][a-z0-9-]{1,39}$/;
const ID_DE_AGENTE = /^[a-z0-9][a-z0-9-]{1,59}$/;

// Los agentes del catálogo de RSC, y solo ellos. Una prueba lo compara con el paquete.
let delCatalogo = null;
function agentesDelCatalogo() {
  if (!delCatalogo) {
    try {
      delCatalogo = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'media', 'agentes-del-catalogo.json'), 'utf8')).agentes;
    } catch {
      delCatalogo = [];
    }
  }
  return delCatalogo;
}

// ¿Se ofrece «Quitarla» para esta habilidad? Solo la del catálogo que se añadió.
function sePuedeQuitarLaHabilidad(id, { propias = [], deLaBarra = false, esFontaneria = false } = {}) {
  if (typeof id !== 'string' || !ID_DE_HABILIDAD.test(id)) return false;
  return !SUELO.has(id) && !propias.includes(id) && !deLaBarra && !esFontaneria;
}

// ¿Y para este agente? Tres cosas a la vez: un nombre que no puede ser una opción, que
// sea de la lista cerrada del catálogo de RSC (lo que dice `.rsc.json` lo escribe quien
// hizo la carpeta, y no basta), y que la declaración lo apunte como pedido.
function sePuedeQuitarElAgente(id, { declarados = [], propios = [], catalogo = agentesDelCatalogo() } = {}) {
  if (typeof id !== 'string' || !ID_DE_AGENTE.test(id)) return false;
  if (!catalogo.includes(id)) return false;
  return declarados.includes(id) && !propios.includes(id);
}

// Lo último que dijo RSC, en una línea y sin comillas, para decirlo en pantalla.
function loQueDijo(hecho) {
  const crudo = `${(hecho && hecho.error) || ''}\n${(hecho && hecho.salida) || ''}`;
  const lineas = crudo.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  return unRotulo(lineas[lineas.length - 1] || '', 160);
}

// `rsc uninstall <id>` para todos los asistentes declarados. Lo que cuenta es el
// disco: que haya salido bien y que ya no esté la habilidad en ninguno.
async function quitar(id) {
  if (!sePuedeQuitarLaHabilidad(id)) return { ok: false, dijo: '' };
  const para = rsc.losAsistentes();
  const hecho = await rsc.correr(['uninstall', id, '--target', para.join(',')], { tiempoMaximo: 120000 });
  const siguen = para.filter((quien) => rsc.habilidadesDelArnesEnDisco(quien).includes(id));
  const ok = hecho.codigo === 0 && siguen.length === 0;
  return { ok, hecho, dijo: ok ? '' : loQueDijo(hecho) };
}

// Lo mismo con un agente. RSC no lo quita si una habilidad que sigue puesta lo
// necesita: entonces sale bien, el fichero sigue, y `siguePuesto` lo dice.
async function quitarAgente(id, ficheros) {
  // Aunque llegue un mensaje a mano: lo de la lista cerrada y con un nombre que no es una opción.
  if (typeof id !== 'string' || !ID_DE_AGENTE.test(id) || !agentesDelCatalogo().includes(id)) return { ok: false, dijo: '' };
  const para = rsc.losAsistentes();
  const hecho = await rsc.correr(['uninstall', id, '--target', para.join(',')], { tiempoMaximo: 120000 });
  const siguePuesto = (ficheros || []).some((f) => fs.existsSync(f));
  return { ok: hecho.codigo === 0 && !siguePuesto, hecho, siguePuesto: hecho.codigo === 0 && siguePuesto, dijo: hecho.codigo === 0 ? '' : loQueDijo(hecho) };
}

// ── Volver a la copia del montaje ────────────────────────────────────────

// La ruta de algo de la carpeta, relativa a ella, o null si no es de dentro. Con
// `path.relative` y los enlaces resueltos (`realpathSync.native`: en un Mac `/private/var/…`
// y no `/var/…`, y en Windows la letra de unidad como la tiene el disco); en Windows sin
// distinguir mayúsculas, que `C:\` y `c:\` son la misma unidad. `plataforma` es solo para probarlo.
function deLaCarpeta(raiz, ruta, plataforma = process.platform) {
  const P = plataforma === 'win32' ? path.win32 : path;
  const bases = [P.resolve(raiz)];
  try { bases.push(fs.realpathSync.native(raiz)); } catch { /* sin carpeta, nada */ }
  const igual = (x) => (plataforma === 'win32' ? x.toLowerCase() : x);
  if (!P.isAbsolute(ruta)) return null;
  for (const base of bases) {
    const relativa = P.relative(igual(base), igual(P.resolve(ruta)));
    if (!relativa || relativa === '..' || relativa.startsWith(`..${P.sep}`) || P.isAbsolute(relativa)) continue;
    // Con la caja original de la ruta: lo que `relative` devolvió es lo de la minúscula.
    return plataforma === 'win32' ? P.resolve(ruta).slice(P.resolve(ruta).length - relativa.length) : relativa;
  }
  return null;
}

// Lo que `restore --dry-run` dice que tocaría: RSC escribe una ruta por línea, con dos
// espacios delante. Se cuentan todas antes de filtrar: las que no son de dentro de la
// carpeta no se tiran en silencio, se dicen (`descartadas`), y quien llama no restaura.
function lasRutasDeLaSalida(salida, raiz, plataforma = process.platform) {
  const lineas = String(salida || '').split(/\r?\n/).filter((l) => /^ {2}\S/.test(l)).map((l) => l.trim());
  const P = plataforma === 'win32' ? path.win32 : path;
  const rutas = lineas.filter((p) => deLaCarpeta(raiz, p, plataforma) !== null).map((p) => P.resolve(p));
  return { rutas, total: lineas.length, descartadas: lineas.length - rutas.length };
}

// Qué tocaría, sin tocar nada (`restore <copia> --dry-run`). Con 0 rutas, o con alguna que no
// es de esta carpeta, no vale: la copia de lo de ahora tiene que cubrir exactamente lo que se toca.
async function loQueTocaria(id, plataforma = process.platform) {
  const raiz = proyecto.raiz();
  const hecho = await rsc.correr(['restore', id, '--dry-run'], { tiempoMaximo: 60000 });
  if (hecho.codigo !== 0) return { ok: false, dijo: loQueDijo(hecho), rutas: [] };
  const { rutas, total, descartadas } = lasRutasDeLaSalida(hecho.salida, raiz, plataforma);
  if (total === 0) return { ok: false, motivo: 'vacia', rutas: [] };
  if (descartadas > 0) return { ok: false, motivo: 'ajenas', rutas: [] };
  return { ok: true, rutas };
}

// RSC no guarda lo de ahora antes de restaurar. La barra sí: una copia de cada
// sitio que va a cambiar, en `.rsc/antes-de-recuperar/<fecha>/` (fuera de
// `.rsc/backups/`, que es de RSC y donde la barra busca la del montaje).
// Devuelve la carpeta, o null si no se pudo: entonces no se restaura.
function guardarLoDeAhora(rutas, ahora = new Date()) {
  const raiz = proyecto.raiz();
  const sello = ahora.toISOString().replace(/[-:]/g, '').replace(/\..*/, '').replace('T', '-');
  const destino = path.join(raiz, '.rsc', 'antes-de-recuperar', sello);
  try {
    fs.mkdirSync(path.join(destino, 'files'), { recursive: true });
    for (const ruta of rutas) {
      let info;
      try { info = fs.lstatSync(ruta); } catch { continue; }
      const relativa = deLaCarpeta(raiz, ruta);
      if (!relativa) return null;
      const aqui = path.join(destino, 'files', relativa);
      fs.mkdirSync(path.dirname(aqui), { recursive: true });
      if (info.isSymbolicLink()) fs.symlinkSync(fs.readlinkSync(ruta), aqui);
      else fs.cpSync(ruta, aqui, { recursive: true, verbatimSymlinks: true });
    }
    return destino;
  } catch {
    return null;
  }
}

// `rsc restore <copia>`, con lo de ahora guardado antes.
async function recuperar(id, rutas) {
  const guardado = guardarLoDeAhora(rutas);
  if (!guardado) return { ok: false, guardado: null, dijo: '' };
  const hecho = await rsc.correr(['restore', id], { tiempoMaximo: 120000 });
  return { ok: hecho.codigo === 0, guardado, hecho, dijo: hecho.codigo === 0 ? '' : loQueDijo(hecho) };
}

module.exports = {
  SUELO, sePuedeQuitarLaHabilidad, sePuedeQuitarElAgente, quitar, quitarAgente,
  lasRutasDeLaSalida, deLaCarpeta, agentesDelCatalogo, loQueTocaria, guardarLoDeAhora, recuperar, loQueDijo,
};
