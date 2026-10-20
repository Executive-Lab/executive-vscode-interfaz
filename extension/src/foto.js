// La foto del cerebro (decisión 151, punto 11 de la 142).
//
// En la clase del 13-10, Eric mandó instalar Obsidian para hacerle una foto al
// cerebro: el conocimiento que el asistente va escribiendo en `02-DOCS/wiki/`,
// con un punto por artículo y una línea por enlace. Esto es esa foto, sin
// instalar nada y sin red: se lee la wiki, se arma el dibujo y se coloca cada
// punto con una disposición de fuerzas sencilla, la misma idea que usa
// Obsidian en su vista de grafo.
//
// Aquí no hay `vscode`: entra una carpeta y una lista de artículos, y sale el
// dibujo. Así se prueba entero sin abrir el editor, como `rumbo.js`. Qué cuenta
// como artículo lo decide `cerebro.todosLosDocumentos()`, que es quien ya lo
// sabe (fuera el andamio, lo archivado, el índice, el diario y los huecos).
//
// ── Los enlaces, de las dos formas ──────────────────────────────────────
//
// RSC escribe enlaces normales de markdown, relativos (`[Texto](../tema/Nota.md)`):
// su wiki es Obsidian y OKF a la vez, y OKF no sabe seguir `[[…]]`. Pero en la
// clase se habló de `[[wikilinks]]`, y hay wikis escritas a mano o de antes de
// la 3. Se leen las dos. Un `[[nombre]]` se busca como lo busca Obsidian, por el
// nombre del fichero, y además por sus `aliases` (RSC guarda ahí el nombre viejo
// para que los enlaces de antes sigan valiendo) y por su título.
//
// ── Determinista ────────────────────────────────────────────────────────
//
// Nada al azar: lo mismo en la wiki da la misma foto, en el mismo orden en que
// lleguen los ficheros. Por eso se puede probar, y por eso dos fotos del mismo
// día se pueden comparar.

const fs = require('node:fs');
const path = require('node:path');

// Cuántos puntos caben en la foto. Una wiki de empresa anda por los cientos;
// con más, la foto se vuelve una mancha y colocarlos tarda: se enseñan los que
// más enlazan, que son los que dan forma al cerebro, y se dice cuántos hay.
const TOPE = 300;
// Y cuántas líneas, por si alguien enlaza todo con todo.
const TOPE_DE_ENLACES = 4000;
// Lo que se lee, como el buscador (`buscar.js`): una carpeta rara no congela nada.
const MAXIMO_FICHEROS = 2000;
const MAXIMO_POR_FICHERO = 1024 * 1024;
// Y entre todos: 2.000 de un mega serían dos gigas.
const MAXIMO_EN_TOTAL = 64 * 1024 * 1024;
// Cuántos enlaces se leen de un artículo, y cuántos se buscan entre todos. Sin
// tope, un artículo de un mega con `[[x]]` repetido eran 200.000 búsquedas, y
// todo esto corre en el hilo del editor: la ventana entera se quedaba quieta
// (revisión de seguridad, M1). Pasado el tope, la foto lo dice.
const MAXIMO_ENLACES_POR_ARTICULO = 2000;
const MAXIMO_ENLACES_EN_TOTAL = 100000;
// Los `aliases` de un artículo, y lo largo de un nombre: 5.000 alias en 2.000
// ficheros eran 17 segundos (revisión de seguridad, M2).
const MAXIMO_ALIASES = 50;
const LARGO_DE_UN_NOMBRE = 200;
// Dónde quedan las fotos, desde la carpeta de trabajo: dentro de la wiki, en su
// `out/`, como los demás resultados. La wiki no la barre RSC buscando documentos
// nuevos, porque es lo que sale de leer y no lo que entra: lo dice su protocolo
// (`ingest-ignore-defaults.md`, en la 3.0.22) y lo cumple el asistente.
// `02-DOCS/.rscignore` es donde lo escribe al empezar la wiki; no hay un
// programa que lo impida (revisión de seguridad, B6). Una prueba lo mira en el
// paquete, por si RSC lo cambia.
const CARPETA = ['02-DOCS', 'wiki', 'out'];
// El lado del dibujo, en sus propias unidades: el panel y la foto lo escalan.
const LADO = 1000;
const MARGEN = 70;
// Cuántos nombres se escriben al lado de su punto, de los que más enlazan.
const ROTULOS = 40;

// Quitar tildes, mayúsculas y signos: «Ciclo de facturación», «ciclo-de-facturacion»
// y «Ciclo_de_Facturación» son el mismo nombre. Las letras de cualquier
// alfabeto se quedan: un nombre en cirílico o en chino se quedaba en nada y no
// se podía enlazar (revisión de corrección, 4).
const pelar = (texto) => String(texto || '')
  .normalize('NFD').replace(/[̀-ͯ]/g, '')
  .toLowerCase()
  .replace(/[^\p{L}\p{N}]+/gu, '-')
  .replace(/^-+|-+$/g, '');
// Una ruta para compararla sin fijarse en mayúsculas ni en cómo guarda las
// tildes cada sistema: el Mac las guarda descompuestas (NFD).
const comoRuta = (ruta) => String(ruta).normalize('NFC').toLowerCase();

const humanizar = (texto) => {
  const limpio = String(texto).replace(/[-_]+/g, ' ').trim();
  return limpio.charAt(0).toUpperCase() + limpio.slice(1);
};

const sinCabecera = (texto) => String(texto || '').replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/, '');

// El código no enlaza: un `[x](y.md)` dentro de un bloque de código es un
// ejemplo, no un enlace. Línea a línea y no con una expresión que vuelva atrás:
// un fichero preparado para eso no tiene que colgar la barra.
function sinCodigo(texto) {
  const fuera = [];
  let valla = null;
  for (const linea of texto.split('\n')) {
    const marca = linea.match(/^ {0,3}(`{3,}|~{3,})/);
    if (valla) {
      if (marca && marca[1][0] === valla[0] && marca[1].length >= valla.length) valla = null;
      continue;
    }
    if (marca) { valla = marca[1]; continue; }
    fuera.push(linea.replace(/`[^`\n]*`/g, ''));
  }
  return fuera.join('\n');
}

// Los `aliases` de la cabecera, en las dos formas que escribe la gente:
// `aliases: [a, b]` y la lista con guiones debajo.
// La cabecera, y un campo suyo sin leer los demás. `frontmatter.analizar` parte
// todas las listas enteras, dos veces por fichero, y una de 5.000 alias en
// 2.000 ficheros eran segundos (revisión de seguridad, M2).
const cabeceraDe = (texto) => (String(texto || '').match(/^---\r?\n([\s\S]*?)\r?\n---/) || [])[1] || '';
const sinComillas = (v) => String(v).trim().replace(/^["']|["']$/g, '').trim();
function campo(cabecera, nombre) {
  const linea = cabecera.match(new RegExp(`^${nombre}:[ \\t]*(.*)$`, 'm'));
  return linea ? linea[1] : null;
}

// Sin repetidos, como mucho 50 y ninguno larguísimo, en las dos formas que
// escribe la gente: `aliases: [a, b]` y la lista con guiones debajo. Se lee
// solo lo que cabe en esos 50.
function aliasesDe(texto, cabecera = cabeceraDe(texto)) {
  const linea = cabecera ? campo(cabecera, 'aliases') : null;
  if (linea === null) return [];
  let lista;
  if (linea.trim()) {
    const valor = linea.trim().slice(0, MAXIMO_ALIASES * (LARGO_DE_UN_NOMBRE + 2));
    lista = valor.startsWith('[') ? valor.replace(/^\[|\]$/g, '').split(',') : [valor];
  } else {
    const debajo = cabecera.match(/^aliases:[ \t]*\r?\n((?:[ \t]+-[ \t]+[^\n]*\n?){1,50})/m);
    lista = debajo ? debajo[1].split('\n').map((l) => l.replace(/^[ \t]*-[ \t]+/, '')) : [];
  }
  return [...new Set(lista.map(sinComillas).filter((a) => a && a.length <= LARGO_DE_UN_NOMBRE))].slice(0, MAXIMO_ALIASES);
}

// El título: el de la cabecera, si no el primer `# `, y si no el nombre del
// fichero en cristiano.
function tituloDe(texto, ruta, cabecera = cabeceraDe(texto)) {
  const delCampo = sinComillas(campo(cabecera, 'title') || '');
  if (delCampo) return delCampo.slice(0, LARGO_DE_UN_NOMBRE);
  const delTexto = (sinCabecera(texto).match(/^#\s+(.+)$/m) || [])[1];
  return ((delTexto && delTexto.trim()) || humanizar(path.posix.basename(ruta, '.md'))).slice(0, LARGO_DE_UN_NOMBRE);
}

// ------------------------------------------------------------ los enlaces

// Lo que un artículo enlaza, tal cual está escrito: `{ forma, destino }`.
//
// Las expresiones van con tope y sin corchetes dentro del destino: sin eso, un
// fichero de un mega con `](` o `[[` repetidos las hacía volver atrás sin fin.
// Y como mucho `tope` enlaces por artículo.
function enlacesEscritos(texto, tope = MAXIMO_ENLACES_POR_ARTICULO) {
  const cuerpo = sinCodigo(sinCabecera(texto));
  const vistos = [];
  const formas = [
    // `[Texto](destino)`, `[Texto](<destino con espacios>)`, `[Texto](destino "título")`
    // y `[Texto](Nota%20(2).md)`, con un nivel de paréntesis, como CommonMark.
    ['markdown', /\]\(\s*(<[^<>\n]{1,1000}>|(?:[^()[\]\s]|\([^()[\]\s]{0,200}\)){1,1000})(?:\s+["'(][^()\n]{0,300})?\)/g],
    // Las referencias al final: `[1]: destino`.
    ['markdown', /^ {0,3}\[[^[\]\n]{1,300}\]:[ \t]*(<[^<>\n]{1,1000}>|\S{1,1000})/gm],
    // `[[Destino]]`, `[[Destino|lo que se lee]]`, `[[Destino#Sección]]` y `![[Destino]]`.
    ['wiki', /\[\[([^[\]\n]{1,300})\]\]/g],
  ];
  for (const [forma, expresion] of formas) {
    for (const [, crudo] of cuerpo.matchAll(expresion)) {
      if (vistos.length >= tope) return vistos;
      const destino = forma === 'wiki' ? crudo.split('|')[0].split('#')[0].trim() : crudo.replace(/^<|>$/g, '');
      if (destino) vistos.push({ forma, destino });
    }
  }
  return vistos;
}

// Con qué se busca un artículo por su nombre: la ruta, el nombre del fichero,
// sus `aliases` y su título, todo pelado. Con varios del mismo nombre gana el de
// la misma carpeta, y si no hay, el primero por ruta. Los ganadores se deciden
// aquí, una vez: antes se ordenaba la lista entera en cada `[[enlace]]`
// (revisión de seguridad, M1).
//
// `articulos` llega ordenado por ruta, así que el primero que se apunta en cada
// nombre, y en cada carpeta de ese nombre, es el que gana.
function elIndice(articulos) {
  const rutas = new Set(articulos.map((a) => a.ruta));
  // Las mismas, para cuando no casan tal cual: gana la primera por ruta.
  const parecidas = new Map();
  for (const a of articulos) if (!parecidas.has(comoRuta(a.ruta))) parecidas.set(comoRuta(a.ruta), a.ruta);
  const porNombre = new Map();
  const apuntar = (clave, ruta) => {
    if (!clave) return;
    const carpeta = path.posix.dirname(ruta);
    const hay = porNombre.get(clave);
    if (!hay) porNombre.set(clave, { primero: ruta, porCarpeta: new Map([[carpeta, ruta]]) });
    else if (!hay.porCarpeta.has(carpeta)) hay.porCarpeta.set(carpeta, ruta);
  };
  for (const a of articulos) {
    apuntar(pelar(a.ruta.replace(/\.md$/i, '')), a.ruta);
    apuntar(pelar(path.posix.basename(a.ruta, '.md')), a.ruta);
    for (const alias of a.aliases || []) apuntar(pelar(alias), a.ruta);
    apuntar(pelar(a.titulo), a.ruta);
  }
  return { rutas, parecidas, porNombre };
}

function porNombre(nombre, desde, indice) {
  const hay = indice.porNombre.get(pelar(nombre.replace(/\.md$/i, '')));
  if (!hay) return null;
  return hay.porCarpeta.get(path.posix.dirname(desde)) || hay.primero;
}

// A qué artículo lleva un enlace, o null si no lleva a ninguno de la wiki: una
// web, un original de `raw/`, una imagen o algo que ya no está.
function resolver({ forma, destino }, desde, indice) {
  if (forma === 'wiki') return porNombre(destino, desde, indice);

  // Una web, un correo o un ancla del mismo artículo no llevan a otro concepto.
  if (/^[a-z][a-z0-9+.-]*:/i.test(destino) || destino.startsWith('#')) return null;
  let limpio = destino.split('#')[0].split('?')[0];
  try { limpio = decodeURIComponent(limpio); } catch { /* se queda como venía */ }
  if (!limpio) return null;

  // Desde la carpeta del artículo, que es como escribe RSC (`newLinkFormat: relative`).
  // Una que empieza por «/» cuenta desde la base de Obsidian, que es `02-DOCS/`.
  const relativa = limpio.startsWith('/')
    ? path.posix.normalize(limpio.replace(/^\/+/, '')).replace(/^wiki\//, '')
    : path.posix.normalize(path.posix.join(path.posix.dirname(desde), limpio));
  for (const candidata of [relativa, `${relativa}.md`]) {
    if (indice.rutas.has(candidata)) return candidata;
  }
  // Escrita con otras mayúsculas, o con las tildes de otro sistema.
  for (const candidata of [relativa, `${relativa}.md`]) {
    const parecida = indice.parecidas.get(comoRuta(candidata));
    if (parecida) return parecida;
  }
  // Obsidian también escribe el camino más corto: solo el nombre, sin carpeta.
  if (!limpio.includes('/')) return porNombre(limpio, desde, indice);
  return null;
}

// ---------------------------------------------------------------- el dibujo

// `articulos`: `[{ ruta, texto }]`, con las rutas relativas a la wiki y con «/».
// Sale `{ nodos: [{ ruta, titulo, grado }], enlaces: [[a, b]] }`: un nodo por
// artículo, en orden de ruta, y una línea por par de artículos enlazados, se
// enlacen en un sentido o en los dos. Sin repetidos y sin que uno se enlace
// consigo mismo.
function delCerebro(articulos) {
  const conTodo = [...articulos]
    .filter((a) => a && typeof a.ruta === 'string' && a.ruta)
    .sort((a, b) => (a.ruta < b.ruta ? -1 : a.ruta > b.ruta ? 1 : 0))
    .filter((a, i, lista) => i === 0 || lista[i - 1].ruta !== a.ruta)
    .map((a) => {
      const cabecera = cabeceraDe(a.texto);
      return { ruta: a.ruta, texto: a.texto || '', titulo: tituloDe(a.texto, a.ruta, cabecera), aliases: aliasesDe(a.texto, cabecera) };
    });

  const indice = elIndice(conTodo);
  const posicion = new Map(conTodo.map((a, i) => [a.ruta, i]));
  const pares = new Set();
  // Lo que queda por buscar entre todos. Si se acaba, o algún artículo pasa de
  // su tope, la foto no está entera, y se dice.
  let quedan = MAXIMO_ENLACES_EN_TOTAL;
  let entera = true;

  conTodo.forEach((a, i) => {
    if (quedan <= 0) { if (a.texto) entera = false; return; }
    const escritos = enlacesEscritos(a.texto, Math.min(MAXIMO_ENLACES_POR_ARTICULO, quedan));
    if (escritos.length >= MAXIMO_ENLACES_POR_ARTICULO || escritos.length >= quedan) entera = false;
    quedan -= escritos.length;
    for (const enlace of escritos) {
      const destino = resolver(enlace, a.ruta, indice);
      if (!destino) continue;
      const j = posicion.get(destino);
      if (j === undefined || j === i) continue;
      pares.add(i < j ? `${i}:${j}` : `${j}:${i}`);
    }
  });

  const enlaces = [...pares]
    .map((p) => p.split(':').map(Number))
    .sort((x, y) => x[0] - y[0] || x[1] - y[1]);
  const grado = new Array(conTodo.length).fill(0);
  for (const [a, b] of enlaces) { grado[a] += 1; grado[b] += 1; }

  return {
    nodos: conTodo.map((a, i) => ({ ruta: a.ruta, titulo: a.titulo, grado: grado[i] })),
    enlaces,
    entera,
  };
}

// Con más puntos de los que caben, los que más enlazan; a igualdad, por ruta.
// Las líneas que llevaban a uno que se queda fuera, también fuera.
function recortar({ nodos, enlaces }, tope = TOPE) {
  const total = nodos.length;
  if (total <= tope && enlaces.length <= TOPE_DE_ENLACES) return { nodos, enlaces, total };

  const quedan = nodos
    .map((n, i) => ({ n, i }))
    .sort((x, y) => y.n.grado - x.n.grado || (x.n.ruta < y.n.ruta ? -1 : 1))
    .slice(0, tope)
    .sort((x, y) => x.i - y.i);
  const nuevo = new Map(quedan.map(({ i }, j) => [i, j]));
  return {
    nodos: quedan.map(({ n }) => n),
    enlaces: enlaces
      .filter(([a, b]) => nuevo.has(a) && nuevo.has(b))
      .map(([a, b]) => [nuevo.get(a), nuevo.get(b)])
      .slice(0, TOPE_DE_ENLACES),
    total,
  };
}

// ── Dónde va cada punto ──────────────────────────────────────────────────
//
// Como la vista de grafo de Obsidian, que usa d3-force, pero sin azar y sin
// traerse nada (decisión 197). Hasta la 196 era Fruchterman y Reingold, y en
// una wiki de verdad —423 conceptos, 300 en la foto— salía una mancha: cada
// grupo suelto repelía a todos los demás desde lejos, salía disparado a un
// borde, y para que cupiera todo el grupo grande se encogía hasta ser un
// borrón de puntos unos encima de otros. Ahora:
//
// - cada enlace es un muelle que quiere medir lo mismo, y tira menos cuanto más
//   enlaza el punto, para que lo que cuelga de un índice no se amontone;
// - todos se apartan de todos, pero solo de cerca: un grupo suelto ya no
//   empuja al grande desde la otra punta;
// - un poco de gravedad hacia el centro junta los grupos sueltos y lo que no
//   enlaza con nada alrededor del grande, en vez de mandarlos a las esquinas;
// - y ninguno se monta encima de otro: se miden con el tamaño con que se
//   pintan, con un hueco entre medias.
//
// Se empieza en espiral (la de las pipas del girasol), que reparte sin azar, y
// cada vuelta se mueve menos que la anterior hasta que se queda quieto. Con el
// tope de 300 son unas 45.000 parejas por vuelta: unos 150 ms en total.
function disponer({ nodos, enlaces }, { lado = LADO, margen = MARGEN, vueltas = 300 } = {}) {
  const n = nodos.length;
  if (!n) return [];
  if (n === 1) return [{ x: lado / 2, y: lado / 2 }];

  // Lo que mide cada punto en la foto, y lo que enlaza en ella.
  const r = nodos.map((nodo) => radio(Number(nodo.grado) || 0, n));
  const base = radio(0, n);
  const cuenta = new Array(n).fill(0);
  for (const [a, b] of enlaces) { cuenta[a] += 1; cuenta[b] += 1; }
  const largo = base * 3.5;
  const carga = base * base * 6;
  const alcance2 = (largo * 6) ** 2;
  const gravedad = 0.04;
  const hueco = base * 0.6;

  const ORO = Math.PI * (3 - Math.sqrt(5));
  const x = new Float64Array(n);
  const y = new Float64Array(n);
  const vx = new Float64Array(n);
  const vy = new Float64Array(n);
  for (let i = 0; i < n; i += 1) {
    const d = largo * 0.7 * Math.sqrt(i + 0.5);
    x[i] = d * Math.cos(i * ORO);
    y[i] = d * Math.sin(i * ORO);
  }

  let calor = 1;
  const enfriar = 1 - 0.001 ** (1 / vueltas);
  for (let v = 0; v < vueltas; v += 1) {
    calor -= calor * enfriar;
    // Los muelles: cada enlace quiere medir `largo` entre los bordes de sus dos
    // puntos, y lo que se mueve se reparte según lo que enlaza cada punta.
    for (const [a, b] of enlaces) {
      let dx = x[b] + vx[b] - x[a] - vx[a];
      let dy = y[b] + vy[b] - y[a] - vy[a];
      const d = Math.sqrt(dx * dx + dy * dy) || 1e-6;
      const tira = ((d - largo - r[a] - r[b]) / d) * calor / Math.min(cuenta[a], cuenta[b]);
      dx *= tira;
      dy *= tira;
      const deB = cuenta[a] / (cuenta[a] + cuenta[b]);
      vx[b] -= dx * deB; vy[b] -= dy * deB;
      vx[a] += dx * (1 - deB); vy[a] += dy * (1 - deB);
    }
    for (let i = 0; i < n; i += 1) {
      for (let j = i + 1; j < n; j += 1) {
        let dx = x[j] - x[i];
        let dy = y[j] - y[i];
        let d2 = dx * dx + dy * dy;
        // Dos en el mismo sitio: se separan en una dirección fija, no al azar.
        if (d2 < 1e-6) { dx = 0.01 * (j - i); dy = 0.01; d2 = dx * dx + dy * dy; }
        // Se apartan, solo de cerca.
        if (d2 < alcance2) {
          const f = (carga * calor) / Math.max(d2, base * base);
          vx[i] -= dx * f; vy[i] -= dy * f;
          vx[j] += dx * f; vy[j] += dy * f;
        }
        // Y no se pisan: se empujan hasta tocarse con un hueco, el pequeño más.
        const junto = r[i] + r[j] + hueco;
        if (d2 < junto * junto) {
          const empuje = ((junto - Math.sqrt(d2)) / Math.sqrt(d2)) * 0.5;
          const deI = (r[j] * r[j]) / (r[i] * r[i] + r[j] * r[j]);
          vx[i] -= dx * empuje * deI; vy[i] -= dy * empuje * deI;
          vx[j] += dx * empuje * (1 - deI); vy[j] += dy * empuje * (1 - deI);
        }
      }
    }
    for (let i = 0; i < n; i += 1) {
      vx[i] -= x[i] * gravedad * calor;
      vy[i] -= y[i] * gravedad * calor;
      vx[i] *= 0.6;
      vy[i] *= 0.6;
      x[i] += vx[i];
      y[i] += vy[i];
    }
  }

  // Encajarlo en el cuadro, sin deformarlo, y centrado. Con el hueco de entre
  // medias no hace falta separar nada después: ni con 300 sueltos, ni con uno
  // que lo enlaza todo, ni con 40 enlazados todos con todos sale uno pisado.
  let minX = Infinity; let maxX = -Infinity; let minY = Infinity; let maxY = -Infinity;
  for (let i = 0; i < n; i += 1) {
    minX = Math.min(minX, x[i]); maxX = Math.max(maxX, x[i]);
    minY = Math.min(minY, y[i]); maxY = Math.max(maxY, y[i]);
  }
  const util = lado - 2 * margen;
  const ancho = maxX - minX;
  const alto = maxY - minY;
  const escala = Math.max(ancho, alto) > 0 ? util / Math.max(ancho, alto) : 1;
  const sobraX = margen + (util - ancho * escala) / 2;
  const sobraY = margen + (util - alto * escala) / 2;
  const redondo = (v) => Math.round(v * 10) / 10;
  return Array.from({ length: n }, (_, i) => ({
    x: redondo(sobraX + (x[i] - minX) * escala),
    y: redondo(sobraY + (y[i] - minY) * escala),
  }));
}

// El tamaño de cada punto: más grande cuanto más enlaza, y más pequeños todos
// cuantos más hay, para que quepan sin pisarse. Algo más pequeños que hasta la
// 196: con 300, los de antes llenaban el cuadro, y ahora se puede acercar.
function radio(grado, cuantos) {
  const base = Math.max(4, Math.min(18, 110 / Math.sqrt(Math.max(1, cuantos))));
  return Math.round(base * (1 + 0.3 * Math.sqrt(grado)) * 10) / 10;
}

// ── El color de cada punto ───────────────────────────────────────────────
//
// Como los grupos de Obsidian, pero sin tener que montarlos (decisión 197): el
// grupo de un concepto es su primera carpeta, que es su tema, y en un monorepo
// la de su proyecto (`proyectos/<proyecto>`, decisión 195), que si no lo
// pintaría todo del mismo color. Lo que está suelto en la raíz de la wiki no es
// de ningún grupo.
function grupoDe(ruta) {
  const partes = String(ruta).split('/');
  if (partes.length < 2) return '';
  if (partes[0] === 'proyectos' && partes.length > 2) return `${partes[0]}/${partes[1]}`;
  return partes[0];
}

// Llevan color los tres grupos con más puntos, y todos los demás van en gris.
// Tres y no ocho: con cuatro o más, dos de ellos se confunden con la vista de
// siempre, o para un daltónico, porque en un grafo cualquier grupo puede caer
// al lado de cualquier otro (comprobado con el validador de la paleta). Con un
// grupo solo no hay nada que distinguir, y la foto sigue con el de la marca.
const CON_COLOR = 3;
function losGrupos(nodos, cuantos = CON_COLOR) {
  const cuantosHay = new Map();
  for (const n of nodos) {
    const g = grupoDe(n.ruta);
    if (g) cuantosHay.set(g, (cuantosHay.get(g) || 0) + 1);
  }
  if (cuantosHay.size < 2) return [];
  return [...cuantosHay.entries()]
    .sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1))
    .slice(0, cuantos)
    .map(([id, puntos]) => ({ id, etiqueta: humanizar(id.split('/').pop()).slice(0, LARGO_DE_UN_NOMBRE), puntos }));
}

// Los que llevan su nombre escrito al lado: los que más enlazan, en orden.
function rotulos(nodos, cuantos = ROTULOS) {
  return nodos
    .map((n, i) => ({ n, i }))
    .sort((x, y) => y.n.grado - x.n.grado || (x.n.ruta < y.n.ruta ? -1 : 1))
    .slice(0, cuantos)
    .map(({ i }) => i);
}

// ------------------------------------------------------------ desde el disco

function leerSiCabe(completa) {
  try {
    const datos = fs.lstatSync(completa);
    // Ni enlaces a otro sitio ni ficheros enormes: un `.md` que apunta a
    // `/dev/zero` no tiene que colgar la barra.
    if (!datos.isFile() || datos.size > MAXIMO_POR_FICHERO) return '';
    return fs.readFileSync(completa, 'utf8');
  } catch {
    return '';
  }
}

// Todo junto, para el panel: lee los artículos (`rutas`, relativas a `wiki`),
// arma el dibujo, se queda con lo que cabe y coloca cada punto.
function laFoto(wiki, rutas, { tope = TOPE, enTotal = MAXIMO_EN_TOTAL, ficheros = MAXIMO_FICHEROS } = {}) {
  const lista = [...new Set((rutas || []).filter((r) => typeof r === 'string' && /\.md$/i.test(r)))].sort();
  let leido = 0;
  const articulos = lista.map((ruta, i) => {
    // Pasado el tope de lectura, el concepto sale, pero sin leer sus enlaces.
    const texto = wiki && i < ficheros && leido < enTotal ? leerSiCabe(path.join(wiki, ...ruta.split('/'))) : '';
    leido += texto.length;
    return { ruta, texto };
  });
  const entero = delCerebro(articulos);
  const { nodos, enlaces, total } = recortar(entero, tope);
  const sitio = disponer({ nodos, enlaces });
  const grupos = losGrupos(nodos);
  const cual = new Map(grupos.map((g, i) => [g.id, i]));
  return {
    lado: LADO,
    total,
    // Si se leyeron todos los enlaces: con demasiados, la foto lo dice.
    entera: entero.entera !== false,
    // `grupo`: el número del suyo en `grupos`, o -1 si va en gris. Sin grupos, -1 todos.
    nodos: nodos.map((n, i) => ({ ...n, ...sitio[i], r: radio(n.grado, nodos.length), grupo: cual.has(grupoDe(n.ruta)) ? cual.get(grupoDe(n.ruta)) : -1 })),
    enlaces,
    rotulos: rotulos(nodos),
    grupos,
  };
}

// --------------------------------------------------------- guardar la foto

const FIRMA_PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
// Una foto de 1.600 puntos de lado pesa unos cientos de KB. Lo que pase de
// esto no es una foto nuestra.
const MAXIMO_PNG = 15 * 1024 * 1024;
const ES_FOTO = /^La foto del cerebro [0-9]{2}-[0-9]{2}-[0-9]{4}( \([0-9]+\))?\.png$/;

const dosCifras = (v) => String(v).padStart(2, '0');
// «La foto del cerebro 15-10-2026.png»: el día como se escribe aquí.
const nombreDeLaFoto = (cuando = new Date()) => `La foto del cerebro ${dosCifras(cuando.getDate())}-${dosCifras(cuando.getMonth() + 1)}-${cuando.getFullYear()}.png`;

// Si `ruta` queda dentro de `raiz` de verdad, siguiendo los enlaces del disco.
// De lo que aún no existe se mira la parte que sí: un `02-DOCS/wiki` que es un
// enlace a otro sitio dejaba crear `out/` y la foto fuera de la carpeta, porque
// solo se miraba el último trozo (revisión de seguridad, M3).
function quedaDentro(raiz, ruta) {
  if (!raiz || !ruta) return false;
  try {
    const base = fs.realpathSync(raiz);
    let existe = path.resolve(ruta);
    const falta = [];
    for (;;) {
      try {
        fs.lstatSync(existe);
        break;
      } catch {
        const arriba = path.dirname(existe);
        if (arriba === existe) return false;
        falta.unshift(path.basename(existe));
        existe = arriba;
      }
    }
    const relativa = path.relative(base, path.join(fs.realpathSync(existe), ...falta));
    return relativa === '' || (!relativa.startsWith('..') && !path.isAbsolute(relativa));
  } catch {
    return false;
  }
}

// Guarda lo que pinta el panel (un PNG en base64) en `carpeta`, sin pisar
// ninguna: la segunda del mismo día lleva «(2)». Sirve para comparar el antes y
// el después de pedirle que enlace lo que tiene suelto. Solo dentro de `raiz`,
// la carpeta de trabajo: una carpeta traída de fuera no decide dónde escribe la
// barra.
function guardar(carpeta, png, { cuando = new Date(), raiz = null } = {}) {
  if (!carpeta || typeof png !== 'string' || !png) return { ok: false, motivo: 'sinDatos' };
  if (png.length > (MAXIMO_PNG * 4) / 3 + 4) return { ok: false, motivo: 'demasiado' };
  const datos = Buffer.from(png, 'base64');
  if (datos.length < FIRMA_PNG.length + 12 || !datos.subarray(0, FIRMA_PNG.length).equals(FIRMA_PNG)) return { ok: false, motivo: 'noEsUnaFoto' };
  // Antes de crear nada, y otra vez después: entre una cosa y otra pudo cambiar.
  if (!quedaDentro(raiz, carpeta)) return { ok: false, motivo: 'fuera' };

  try {
    fs.mkdirSync(carpeta, { recursive: true });
    if (!fs.lstatSync(carpeta).isDirectory() || !quedaDentro(raiz, carpeta)) return { ok: false, motivo: 'fuera' };
    const nombre = nombreDeLaFoto(cuando);
    const base = nombre.slice(0, -'.png'.length);
    let fichero = nombre;
    for (let n = 2; fs.existsSync(path.join(carpeta, fichero)); n += 1) fichero = `${base} (${n}).png`;
    // `wx`: si entre mirar y escribir apareciera otra con ese nombre, no se pisa.
    fs.writeFileSync(path.join(carpeta, fichero), datos, { flag: 'wx' });
    return { ok: true, fichero };
  } catch (error) {
    return { ok: false, motivo: 'noSeEscribe', detalle: error.message };
  }
}

const tamano = (bytes) => (bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / (1024 * 1024)).toFixed(1)} MB`);

// Las fotos que hay, de la más nueva a la más vieja, con la forma de un
// resultado (`salidas.js`): para abrirlas o llevárselas.
function lasFotos(carpeta, raiz) {
  if (!carpeta || !quedaDentro(raiz, carpeta)) return [];
  let dentro;
  try {
    dentro = fs.readdirSync(carpeta, { withFileTypes: true });
  } catch {
    return [];
  }
  return dentro
    .filter((e) => e.isFile() && ES_FOTO.test(e.name))
    .map((e) => {
      try {
        const datos = fs.statSync(path.join(carpeta, e.name));
        return { fichero: e.name, cuando: datos.mtime.toISOString(), tamano: tamano(datos.size), orden: datos.mtimeMs };
      } catch {
        return null;
      }
    })
    .filter(Boolean)
    .sort((a, b) => b.orden - a.orden || (a.fichero < b.fichero ? 1 : -1))
    .map(({ orden, ...resto }) => resto);
}

// El fichero de una foto, solo si es una de las nuestras y está en su sitio. Lo
// que llega del panel se trata como si viniera de fuera.
function donde(carpeta, fichero, raiz) {
  if (!carpeta || typeof fichero !== 'string' || fichero !== path.basename(fichero) || !ES_FOTO.test(fichero)) return null;
  const completa = path.join(carpeta, fichero);
  try {
    return fs.lstatSync(completa).isFile() && quedaDentro(raiz, completa) ? completa : null;
  } catch {
    return null;
  }
}

module.exports = {
  TOPE,
  LADO,
  CARPETA,
  MAXIMO_ENLACES_POR_ARTICULO,
  MAXIMO_ENLACES_EN_TOTAL,
  MAXIMO_ALIASES,
  enlacesEscritos,
  delCerebro,
  recortar,
  disponer,
  radio,
  rotulos,
  CON_COLOR,
  grupoDe,
  losGrupos,
  laFoto,
  nombreDeLaFoto,
  guardar,
  lasFotos,
  donde,
  // La guía en PDF de cada conexión mira lo mismo antes de escribir (decisión 159).
  quedaDentro,
};
