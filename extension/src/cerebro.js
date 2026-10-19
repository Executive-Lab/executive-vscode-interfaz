// "Lo que sabe de tu empresa": el cerebro de 02-DOCS.
//
// RSC monta ahí un motor de caos→conocimiento con una estructura fija
// (`.rsc/skills/harness/references/wiki-protocol.md`): `inbox/` es la zona
// donde se sueltan documentos en crudo, `raw/` guarda los originales, y
// `wiki/` los artículos ya destilados, catalogados en `index.md`, con su
// historial en `log.md` y lo que aún no sabe en `gaps.md`.
//
// Aquí no se inventa ninguna estructura: se lee la suya. Y no se edita nada —
// el alumno lee, sube documentos y pide cambios; escribir en la wiki es
// trabajo del asistente, que sabe mantener el índice, los enlaces y las
// puntuaciones a la vez.

const fs = require('node:fs');
const path = require('node:path');
const vscode = require('vscode');
const proyecto = require('./proyecto');
const lecturas = require('./lecturas');
const rutas = require('./rutas');
const { quedaDentro } = require('./foto');

const WIKI = ['02-DOCS', 'wiki'];
const INBOX = ['02-DOCS', 'inbox'];

function humanizar(texto) {
  const limpio = texto.replace(/[-_]+/g, ' ').trim();
  return limpio.charAt(0).toUpperCase() + limpio.slice(1);
}

// Con tope (decisión 188): `log.md` crece sin fin y `index.md` con cada
// artículo; la barra solo enseña lo primero de cada uno. De lo que pase del
// tope se lee hasta el último salto de línea entero y el resto no se mira. Y se
// guarda mientras el fichero no cambie: un repintado los pedía varias veces.
const TOPE_DE_LECTURA = 1024 * 1024;
function leer(...partes) {
  const ruta = proyecto.ruta(...partes);
  if (!ruta) return null;
  const texto = lecturas.texto(ruta, { tope: TOPE_DE_LECTURA });
  return texto === undefined ? null : texto;
}

// Las plantillas de RSC traen filas de ejemplo con marcadores entre llaves o
// ángulos. No son artículos: no se enseñan.
// Las marcas de las plantillas de RSC son `{…}`, y solo esas: también se
// tomaba por plantilla cualquier texto con «<», y una pregunta como «los pedidos
// de menos de <100 €>» desaparecía (revisión de F7, m2).
const ES_PLANTILLA = (texto) => /\{[^{}]*\}/.test(texto);

// ------------------------------------------------------------ el índice

// El título que lleva un artículo dentro, o su nombre de fichero en cristiano.
function tituloDe(rutaRelativa) {
  return (leer(...WIKI, rutaRelativa) || '')
    .replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/, '')
    .match(/^#\s+(.+)$/m)?.[1]?.trim()
    || humanizar(path.basename(rutaRelativa, '.md'));
}

// Lo que hay en el disco, tema por tema. Es el suelo del catálogo.
//
// Antes esto no existía y todo salía de `index.md`, así que **sin índice el
// panel enseñaba que no sabía nada teniendo cuatro temas escritos**. Y el
// índice lo mantiene el asistente: que lo tenga al día es una aspiración, no
// un hecho. Lo que sí es un hecho son las carpetas.
//
// `harness` y `brand` quedan fuera, como en todo lo demás: son de la máquina y
// de la marca, no de lo que sabe esta empresa. Y las carpetas de trabajo de RSC,
// su andamio: las fichas de cada cambio (`ftd`), sus decisiones, su diseño, su
// pila técnica y sus informes (G6).
const NO_SON_TEMAS = new Set(['harness', 'brand', 'sdd', 'ftd', 'decisions', 'design', 'stack', 'reports']);

// Si una ruta de la wiki es del andamio: se mira su primera carpeta. Vale también
// con índice, que es el caso normal —`specify`, `sdd` y `decision-records` le
// piden al asistente que indexe lo suyo—: se aplica fila a fila, y un tema que se
// queda sin filas no sale (revisión de F7, importante 1). Y lo archivado, que RSC
// mueve a `<tema>/_archive/`.
const esAndamio = (ruta) => NO_SON_TEMAS.has(String(ruta).replace(/^\.[\\/]/, '').split(/[\\/]/)[0].trim().toLowerCase());
const esArchivado = (ruta) => /(^|\/)_archive\//.test(String(ruta));

function delDisco() {
  const wiki = proyecto.ruta(...WIKI);
  if (!wiki || !fs.existsSync(wiki)) return [];

  let carpetas;
  try {
    carpetas = lecturas.entradas(wiki);
  } catch {
    return [];
  }

  return carpetas
    .filter((e) => e.isDirectory() && !e.name.startsWith('.') && !NO_SON_TEMAS.has(e.name))
    .map((e) => {
      let dentro = [];
      try {
        // Solo ficheros de verdad: de un enlace del disco se leía el título (revisión, B5).
        dentro = lecturas.entradas(path.join(wiki, e.name)).filter((f) => f.isFile()).map((f) => f.name);
      } catch { /* una carpeta que no se puede leer no tumba las demás */ }

      return {
        id: e.name,
        etiqueta: humanizar(e.name),
        descripcion: null,
        articulos: dentro
          .filter((f) => f.endsWith('.md') && f !== 'index.md' && !f.startsWith('.'))
          .map((f) => ({ titulo: tituloDe(`${e.name}/${f}`), ruta: `${e.name}/${f}`, resumen: '', fecha: '' })),
      };
    })
    .filter((t) => t.articulos.length);
}

// `wiki/index.md` agrupa por tema con `## <tema>` y una tabla por tema:
// | [Título](tema/fichero.md) | Resumen | AAAA-MM-DD | Puntuación |
function delIndice() {
  const texto = leer(...WIKI, 'index.md');
  if (!texto) return [];

  const temas = [];
  let actual = null;

  for (const linea of texto.split('\n')) {
    const cabecera = linea.match(/^##\s+(.+?)\s*$/);
    if (cabecera) {
      if (ES_PLANTILLA(cabecera[1])) { actual = null; continue; }
      actual = { id: cabecera[1], etiqueta: humanizar(cabecera[1]), descripcion: null, articulos: [] };
      temas.push(actual);
      continue;
    }
    if (!actual) continue;

    // Bajo el título de cada tema, RSC deja una línea que lo describe. Es
    // mejor rótulo que el nombre de la carpeta, que viene sin tildes.
    const suelta = linea.trim();
    if (suelta && !suelta.startsWith('|') && !suelta.startsWith('>') && !actual.descripcion && !actual.articulos.length) {
      if (!ES_PLANTILLA(suelta)) actual.descripcion = suelta;
      continue;
    }

    const fila = linea.match(/^\|\s*\[([^\]]+)\]\(([^)]+)\)\s*\|([^|]*)\|([^|]*)\|/);
    if (!fila) continue;
    const [, titulo, ruta, resumen, fecha] = fila;
    if (ES_PLANTILLA(titulo) || ES_PLANTILLA(ruta) || esAndamio(ruta) || esArchivado(ruta)) continue;
    // Lo archivado: RSC le pone `[Archived]` delante del resumen (G6).
    if (/^\s*\[(Archived|Archivado)\]/i.test(resumen) || /^\[Archivado\]/i.test(titulo)) continue;

    actual.articulos.push({
      titulo: titulo.replace(/^\[Archivado\]\s*/i, '').trim(),
      ruta: ruta.trim(),
      resumen: resumen.trim(),
      fecha: fecha.trim(),
    });
  }

  return temas.filter((t) => t.articulos.length);
}

// Manda el índice, y el disco es la red de seguridad.
//
// Cuando hay índice se usa solo él: trae resumen, fecha y un orden pensado, y
// deja fuera a propósito lo archivado y las filas de plantilla. Lo que esté
// escrito y no mencione sale por otro sitio —`sinOrdenar()`, "sin ordenar
// todavía"—, que es una distinción que este proyecto hace aposta.
//
// Pero **sin índice no se enseñaba nada**, y eso es lo que estaba mal: un arnés
// con cuatro temas escritos decía que no sabía nada, solo porque el asistente
// aún no había escrito `index.md`. Ahí se lee el disco, que es un hecho, en vez
// de callarse.
function catalogo() {
  const porIndice = delIndice();
  return porIndice.length ? porIndice : delDisco();
}

function articulos(temaId) {
  return (catalogo().find((t) => t.id === temaId) || {}).articulos || [];
}

function cuantoSabe() {
  return catalogo().reduce((total, tema) => total + tema.articulos.length, 0);
}

// La ruta viene del índice, que escribe el asistente: se comprueba que no se
// salga de la wiki antes de abrir nada. Y de verdad, siguiendo los enlaces del
// disco: un `x.md` que es un enlace a `~/.ssh/config` está en la wiki por el
// nombre, y al pulsarlo se leía y se enseñaba (revisión de seguridad, B5).
function dentroDeLaWiki(rutaRelativa) {
  const wiki = proyecto.ruta(...WIKI);
  if (!wiki || typeof rutaRelativa !== 'string') return null;
  const completa = path.resolve(wiki, rutaRelativa);
  if (!rutas.estaDentro(wiki, completa)) return null;
  try {
    return rutas.estaDentro(fs.realpathSync.native(wiki), fs.realpathSync.native(completa)) ? completa : null;
  } catch {
    return null;
  }
}

// Lo que se lee de un concepto dentro de la barra, y cuántos enlaces se miran:
// un artículo de un mega con `[` sin cerrar colgaba el editor al abrirlo desde
// la foto (revisión de seguridad, B4).
const MAXIMO_ARTICULO = 1024 * 1024;
const MAXIMO_ENLACES = 2000;

// Los enlaces que un artículo hace a otros. Se resuelven aquí, con la misma
// guarda que todo lo demás, y el panel solo pinta como clicables los que
// existen de verdad: antes se pintaban todos como texto muerto, y un artículo
// que remitía a otro era un callejón sin salida.
function enlacesDe(cuerpo, rutaRelativa) {
  const carpeta = path.dirname(rutaRelativa);
  const encontrados = {};

  // Con tope y sin corchetes dentro, como en `foto.js`: `\[[^\]]+\]` volvía
  // atrás sin fin con una línea de `[` sin cerrar. El panel busca lo mismo.
  let cuantos = 0;
  for (const [, destino] of cuerpo.matchAll(/\[[^[\]\n]{1,300}\]\(([^()\n]{1,1000})\)/g)) {
    cuantos += 1;
    if (cuantos > MAXIMO_ENLACES) break;
    if (/^https?:|^mailto:|^#/.test(destino) || encontrados[destino]) continue;
    // El ancla de dentro del fichero no lleva a otro documento.
    const limpio = destino.split('#')[0];
    if (!limpio) continue;

    const relativa = path.posix.normalize(path.posix.join(carpeta === '.' ? '' : carpeta, limpio));
    if (dentroDeLaWiki(relativa)) encontrados[destino] = relativa;
  }
  return encontrados;
}

// El artículo se lee DENTRO del panel, no en la vista previa de VS Code: esa
// enseña el frontmatter —`type: article`, `score: 7.0`— antes que el texto, y
// eso es exactamente lo que este proyecto existe para no enseñar.
function leerArticulo(rutaRelativa) {
  const completa = dentroDeLaWiki(rutaRelativa);
  if (!completa) return { ok: false, mensaje: 'Ese documento ya no está donde decía el índice.' };

  let texto;
  try {
    if (fs.statSync(completa).size > MAXIMO_ARTICULO) {
      return {
        ok: false,
        malo: false,
        mensaje: 'Este concepto es demasiado largo para leerlo aquí.',
        boton: { etiqueta: 'Pedírselo al asistente', accion: { tipo: 'pedir', prompt: `Cuéntame en pocas líneas qué dice el concepto «${require('./limpio').etiqueta(path.basename(completa, '.md'))}» de la wiki.` } },
      };
    }
    texto = fs.readFileSync(completa, 'utf8');
  } catch {
    return { ok: false, mensaje: 'No he podido abrirlo. Pulsa «Algo va mal» y pásale el código a tu tutor.' };
  }

  // Fuera la cabecera técnica, y fuera el título repetido: ya va de rótulo.
  const cuerpo = texto.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/, '').trimStart();
  const titulo = (cuerpo.match(/^#\s+(.+)$/m) || [])[1] || path.basename(completa, '.md');

  const sinTitulo = cuerpo.replace(/^#\s+.+\r?\n/, '').trimStart();
  return {
    ok: true,
    titulo: titulo.trim(),
    cuerpo: sinTitulo,
    enlaces: enlacesDe(sinTitulo, rutaRelativa),
  };
}

// Todo lo que hay escrito en la wiki, lo mencione el índice o no.
function todosLosDocumentos() {
  const wiki = proyecto.ruta(...WIKI);
  if (!wiki || !fs.existsSync(wiki)) return [];

  const raiz = ['index.md', 'log.md', 'gaps.md'];
  const encontrados = [];

  const recorrer = (carpeta) => {
    let entradas;
    try {
      entradas = lecturas.entradas(carpeta);
    } catch {
      return;
    }
    for (const entrada of entradas) {
      if (entrada.name.startsWith('.')) continue;
      const completa = path.join(carpeta, entrada.name);
      // Con «/», como las escribe el índice: con `path.relative` a secas, en
      // Windows salían con «\», no casaban con ninguna del índice, y todo lo
      // escrito salía como sin ordenar (máquina Windows de GitHub, 28-09-2026).
      const relativa = path.relative(wiki, completa).split(path.sep).join('/');
      if (entrada.isDirectory()) {
        // El andamio, arriba del todo; lo archivado, en cualquier tema. Tenía su
        // propia lista, la de antes, y «sin ordenar» enseñaba `ftd/`, `stack/` y
        // las versiones viejas de `_archive/` (revisión de F7, importante 1).
        if (entrada.name === '_archive' || (carpeta === wiki && NO_SON_TEMAS.has(entrada.name))) continue;
        recorrer(completa);
      // Solo ficheros de verdad: un enlace del disco no es un concepto (revisión, B5).
      } else if (entrada.isFile() && entrada.name.endsWith('.md') && !raiz.includes(relativa)) {
        encontrados.push(relativa);
      }
    }
  };
  recorrer(wiki);
  return encontrados;
}

// En un monorepo, `proyectos/<proyecto>/` es la documentación de cada proyecto, con
// su propio índice (decisión 195). No está «sin ordenar» para el índice de la raíz,
// y «Que los ordene» le pedía al asistente meterla en temas: desmontarla. En uno de
// verdad eran 380 de 402. Se reconoce por su índice o por ser un proyecto de dentro;
// sigue saliendo en el buscador y en Proyectos («Conocimiento de…»).
function laDocumentacionDeLosProyectos() {
  const deDentro = new Set(require('./subproyectos').cuales().map((p) => p.nombre));
  const vistos = new Map();
  return (ruta) => {
    const m = /^proyectos\/([^/]+)\/./.exec(ruta);
    if (!m) return false;
    if (!vistos.has(m[1])) {
      let conIndice = false;
      try {
        conIndice = fs.lstatSync(path.join(proyecto.ruta(...WIKI), 'proyectos', m[1], 'index.md')).isFile();
      } catch { /* sin índice propio */ }
      vistos.set(m[1], conIndice || deDentro.has(m[1]));
    }
    return vistos.get(m[1]);
  };
}

// Lo que está escrito pero el índice no menciona. Hasta ahora era invisible
// desde el panel: existía en el disco y no había forma de llegar a ello.
function sinOrdenar() {
  const indexados = new Set(catalogo().flatMap((t) => t.articulos.map((a) => a.ruta.replace(/^\.\//, ''))));
  const deUnProyecto = laDocumentacionDeLosProyectos();
  return todosLosDocumentos()
    .filter((r) => !indexados.has(r) && !deUnProyecto(r))
    .map((ruta) => ({
      ruta,
      titulo: (leer(...WIKI, ruta) || '')
        .replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/, '')
        .match(/^#\s+(.+)$/m)?.[1]?.trim()
        || humanizar(path.basename(ruta, '.md')),
    }));
}

// Lo que no es markdown (un archivado en HTML, un original) se abre fuera.
async function abrirFuera(rutaRelativa) {
  const completa = dentroDeLaWiki(rutaRelativa);
  if (!completa) return { ok: false, mensaje: 'Ese documento ya no está donde decía el índice.' };
  await vscode.env.openExternal(vscode.Uri.file(completa));
  return { ok: true };
}

// ------------------------------------------------- historial y huecos

// `log.md` va del más nuevo al más viejo: `## [AAAA-MM-DD] tipo | título`.
function aprendidoUltimamente(cuantas = 5) {
  const texto = leer(...WIKI, 'log.md');
  if (!texto) return [];

  const entradas = [];
  for (const linea of texto.split('\n')) {
    const m = linea.match(/^##\s*\[(\d{4}-\d{2}-\d{2})\]\s*([a-zA-Z-]+)\s*\|\s*(.+?)\s*$/);
    if (!m) continue;
    const [, fecha, tipo, titulo] = m;
    if (ES_PLANTILLA(titulo)) continue;
    entradas.push({ fecha, tipo, titulo });
    if (entradas.length >= cuantas) break;
  }
  return entradas;
}

// Las preguntas que RSC apunta, como las apunta (`wiki-gaps-template.md`, G6):
// un bloque `## [fecha] gap | concepto` con su `Status:`, abierto hasta que se
// marca `[FILLED fecha]`. Solo se leían viñetas, y no salía ninguna. Las
// viñetas se siguen leyendo, que alguien puede escribirlas a mano.
function loQueAunNoSabe(cuantos = 5) {
  const texto = leer(...WIKI, 'gaps.md');
  if (!texto) return [];

  // El ejemplo de la plantilla lleva `{concept}`, y eso no cuenta (ES_PLANTILLA).
  // Las viñetas, solo fuera de los bloques de RSC: dentro son notas del bloque,
  // o su estado escrito en viñeta (revisión de F7, m2).
  const abiertas = [];
  const sueltas = [];
  for (const bloque of texto.split(/^(?=## )/m)) {
    const cabecera = bloque.match(/^##\s+\[[^\]]*\]\s*gap\s*\|\s*(.+?)\s*$/m);
    if (!cabecera) {
      for (const linea of bloque.split('\n')) {
        const vineta = linea.match(/^[-*]\s+(.+?)\s*$/);
        if (vineta && !ES_PLANTILLA(vineta[1])) sueltas.push(vineta[1]);
      }
      continue;
    }
    // El estado como se escriba: `Status: open`, en negrita, en viñeta, y con
    // una nota detrás o sin ella.
    const estado = (bloque.match(/^\s*(?:[-*]\s+)?\**Status\**:?\**\s*(.+?)\s*$/mi) || [])[1] || 'open';
    if (/FILLED/i.test(cabecera[1]) || !/^open\b/i.test(estado)) continue;
    if (!ES_PLANTILLA(cabecera[1])) abiertas.push(cabecera[1]);
  }
  return [...abiertas, ...sueltas].slice(0, cuantos);
}

// El panel humano que RSC regenera solo en cada pasada de mantenimiento.
// Lo escribe el asistente al repasar la wiki y queda fuera de git, así que
// muchas veces no está: sin él, no se ofrece. Y sin seguir enlaces, como la foto
// (decisión 151): un fichero de verdad, dentro de la carpeta de trabajo. Un
// `dashboard.html` que es un enlace, o una wiki enlazada a otro sitio, abría en
// el navegador lo que hubiera al otro lado.
function hayPanel() {
  const ruta = proyecto.ruta(...WIKI, 'dashboard.html');
  try {
    return Boolean(ruta) && fs.lstatSync(ruta).isFile() && quedaDentro(proyecto.raiz(), ruta);
  } catch {
    return false;
  }
}

// Se mira otra vez al pulsar: entre pintar el botón y pulsarlo pudo cambiar.
// Dice si lo ha abierto.
function abrirPanel() {
  if (!hayPanel()) return false;
  Promise.resolve(vscode.env.openExternal(vscode.Uri.file(proyecto.ruta(...WIKI, 'dashboard.html')))).catch(() => {});
  return true;
}

// -------------------------------------------------- darle documentos

// `saltar` y `noCuentan` miran solo arriba del todo, como en «Documentos entregados».
function contar(partes, saltar = [], noCuentan = null) {
  const carpeta = proyecto.ruta(...partes);
  if (!carpeta || !fs.existsSync(carpeta)) return 0;

  let cuenta = 0;
  const recorrer = (donde) => {
    for (const entrada of lecturas.entradas(donde)) {
      if (entrada.name.startsWith('.') || entrada.name === 'README.md') continue;
      if (noCuentan && donde === carpeta && noCuentan.test(entrada.name)) continue;
      if (entrada.isDirectory()) {
        if (donde === carpeta && saltar.includes(entrada.name)) continue;
        recorrer(path.join(donde, entrada.name));
      } else cuenta += 1;
    }
  };
  try { recorrer(carpeta); } catch { /* si no se puede leer, cero */ }
  return cuenta;
}

const esperandoLectura = () => {
  const inbox = proyecto.ruta(...INBOX);
  if (!inbox || !fs.existsSync(inbox)) return 0;
  return lecturas.entradas(inbox)
    .filter((e) => e.isFile() && !e.name.startsWith('.') && e.name !== 'README.md').length;
};

// Cuántos días lleva esperando el documento más viejo de la bandeja. Sirve
// para no dar la lata el mismo día que se dejan, y sí a los tres días.
function esperandoDesdeHace() {
  const inbox = proyecto.ruta(...INBOX);
  if (!inbox || !fs.existsSync(inbox)) return null;

  let masViejo = null;
  for (const entrada of lecturas.entradas(inbox)) {
    if (!entrada.isFile() || entrada.name.startsWith('.') || entrada.name === 'README.md') continue;
    try {
      const cuando = fs.statSync(path.join(inbox, entrada.name)).mtimeMs;
      if (masViejo === null || cuando < masViejo) masViejo = cuando;
    } catch { /* uno que no se pueda mirar no tumba el resto */ }
  }
  return masViejo === null ? null : Math.floor((Date.now() - masViejo) / 86400000);
}

const yaLeidos = () => contar([...INBOX, '_processed']);
// `raw/worklog/` también cuelga de `raw/`, pero no es un documento que nadie
// haya dado: es el diario que el arnés se escribe solo. Contarlo ahí le diría
// al alumno que ha entregado papeles que no ha entregado. Lo mismo lo que deja
// la barra (los avisos, los informes): se salta lo mismo que en «Documentos
// entregados», de la misma lista (revisión de la 153).
const originales = () => {
  const { NO_SON_PAPELES, NO_ES_UN_PAPEL } = require('./papeles');
  return contar(['02-DOCS', 'raw'], NO_SON_PAPELES, NO_ES_UN_PAPEL);
};

// Copia lo que elija el alumno a `inbox/`. No se procesa aquí: el barrido de
// la bandeja lo hace el asistente, que sabe extraer, clasificar y enlazar.
// Dónde cae un documento nuevo, sin pisar nunca uno que ya esté. Lo usan el
// botón de elegirlos y el arrastrar-y-soltar, para que los dos numeren igual.
function sitioLibre(inbox, nombre) {
  const extension = path.extname(nombre);
  const base = nombre.slice(0, nombre.length - extension.length);
  let destino = path.join(inbox, nombre);
  for (let n = 2; fs.existsSync(destino); n += 1) destino = path.join(inbox, `${base} (${n})${extension}`);
  return destino;
}

// Soltados encima de la barra. El panel no ve la ruta de lo que se suelta —el
// editor no se la da, y hace bien— pero sí puede leer el contenido, así que
// llega ya leído y aquí solo se escribe.
//
// Un documento suelto no se abre ni se interpreta: se deja en la bandeja, igual
// que los que se eligen con el botón, y el asistente hace el resto.
function guardarSoltados(ficheros = []) {
  const inbox = proyecto.ruta(...INBOX);
  if (!inbox) return { ok: false, mensaje: 'No hay carpeta de trabajo abierta.' };
  fs.mkdirSync(inbox, { recursive: true });

  let cuantos = 0;
  for (const fichero of ficheros) {
    const nombre = path.basename(String(fichero.nombre || '')).trim();
    if (!nombre || !fichero.datos) continue;

    try {
      fs.writeFileSync(sitioLibre(inbox, nombre), Buffer.from(fichero.datos, 'base64'));
      cuantos += 1;
    } catch {
      /* uno que falle no tumba los demás */
    }
  }

  if (!cuantos) return { ok: false, mensaje: 'No he podido guardar ninguno. Pulsa «Algo va mal» y pásale el código a tu tutor.' };
  return {
    ok: true,
    cuantos,
    mensaje: cuantos === 1 ? 'Documento añadido.' : `${cuantos} documentos añadidos.`,
  };
}

async function anadirDocumentos() {
  const elegidos = await vscode.window.showOpenDialog({
    canSelectMany: true,
    openLabel: 'Dárselos',
    title: 'Elige los documentos que quieres que lea',
  });
  if (!elegidos || !elegidos.length) return { ok: true, cuantos: 0 };

  const inbox = proyecto.ruta(...INBOX);
  if (!inbox) return { ok: false, mensaje: 'No hay carpeta de trabajo abierta.' };
  fs.mkdirSync(inbox, { recursive: true });

  let cuantos = 0;
  for (const origen of elegidos) {
    // Si ya hay uno con ese nombre, se numera: nunca se pisa nada.
    const destino = sitioLibre(inbox, path.basename(origen.fsPath));

    try {
      fs.copyFileSync(origen.fsPath, destino);
      cuantos += 1;
    } catch {
      /* uno que falle no tumba los demás */
    }
  }

  if (!cuantos) return { ok: false, mensaje: 'No he podido copiar ninguno. Pulsa «Algo va mal» y pásale el código a tu tutor.' };
  return {
    ok: true,
    cuantos,
    mensaje: cuantos === 1 ? 'Documento añadido.' : `${cuantos} documentos añadidos.`,
  };
}

// Lo que se le pide al darle documentos, por el botón o soltándolos, con uno o con
// varios: decía «un documento nuevo… Léelos» (decisión 166). Lo que dice la barra
// al darlos solo dice lo que ha hecho ella, «Documento añadido.»: si el encargo ha
// llegado y cómo, lo dice quien lo manda.
const queLePedimos = (cuantos) => (cuantos === 1
  ? 'Te he dejado un documento nuevo en la bandeja de entrada. Léelo, guárdalo donde toque y cuéntame en dos líneas qué has aprendido.'
  : `Te he dejado ${cuantos} documentos nuevos en la bandeja de entrada. Léelos, guárdalos donde toque y cuéntame en dos líneas qué has aprendido.`);

module.exports = {
  queLePedimos,
  guardarSoltados,
  catalogo,
  articulos,
  sinOrdenar,
  todosLosDocumentos,
  cuantoSabe,
  leerArticulo,
  abrirFuera,
  aprendidoUltimamente,
  loQueAunNoSabe,
  hayPanel,
  abrirPanel,
  esperandoLectura,
  esperandoDesdeHace,
  yaLeidos,
  originales,
  anadirDocumentos,
  esAndamio,
};
