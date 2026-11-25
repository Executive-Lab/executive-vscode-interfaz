// La cara de la empresa, sacada de su web por la propia barra.
//
// Jose, 21-09-2026: *«cuando dices la web en el init no te adapta la interfaz
// a los colores y el logo de la empresa. Debería ejecutarse en el init porque
// ya tienes la web»*. Tenía razón en el diagnóstico: la web solo viajaba
// dentro del primer mensaje al asistente, y hasta que él la miraba —si la
// miraba, si el alumno le daba a enviar— la barra seguía con la cara de
// Executive Lab.
//
// Esto saca un PRIMER INTENTO, al momento y sin pedírselo a nadie: descarga la
// portada, lee lo que una web declara de sí misma y escribe `marca.md` marcado
// como provisional. El asistente lo afina después con el mismo contrato de
// campos (`marca.queLePedimos`), que es quien sabe mirar una web con calma. Si
// no hay red, o la web no dice nada aprovechable, no se escribe nada: la cara
// de siempre y el encargo de siempre. Nunca se pisa una cara puesta a mano.
//
// ── Qué se lee, y en qué orden ───────────────────────────────────────────
//
//   nombre   `og:site_name`; si no, el `<title>` sin la coletilla
//            («Ferretería Soler | Inicio» → «Ferretería Soler»).
//   acento   `<meta name="theme-color">` si es un color de verdad —no blanco,
//            negro ni gris—; si no, una variable CSS de marca (`--primary`,
//            `--brand`, `--accent`…) en el HTML o en su primera hoja de
//            estilos; si no, el color saturado que más se repite en el CSS.
//   fondo    `--background` / `--bg`, o el `background` del `body`; si no, blanco.
//   texto    `--foreground` / `--text`, o el `color` del `body`; si no, según el fondo.
//   logo     `apple-touch-icon` (el grande) y, si no, `icon` en svg o png.
//            Un `.ico` no sirve: la barra no lo pinta.
//   letra    una hoja de Google Fonts (y se baja su fichero) o el `font-family`
//            de sus títulos o de su `body`, sin las del sistema (decisión 204).
//
// Todo con regex sobre el HTML, sin analizador: se buscan cuatro etiquetas
// concretas, y un analizador entero para eso sería más superficie que
// beneficio. Lo que no se encuentra, no se inventa.

const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const https = require('node:https');
const proyecto = require('./proyecto');
const { porQueNoSePudo } = require('./por-que-no-se-escribio');
const marca = require('./marca');
const color = require('./color');
const frontmatter = require('./frontmatter');

const LIMITE_HTML = 1_000_000;
const LIMITE_LOGO = 2_000_000;
const LIMITE_FUENTE = 2_000_000;
const TIEMPO = 8000;
const SALTOS = 3;

// ── Descargar ────────────────────────────────────────────────────────────

// Una petición GET con lo justo: redirecciones, tope de tamaño y de tiempo.
// Devuelve el cuerpo y la dirección final (las redirecciones cambian la base
// de los enlaces relativos).
function descargar(direccion, { limite = LIMITE_HTML, tiempo = TIEMPO, saltos = SALTOS } = {}) {
  return new Promise((resolver, rechazar) => {
    let url;
    try {
      url = new URL(direccion);
    } catch {
      rechazar(new Error(`dirección no válida: ${direccion}`));
      return;
    }
    const cliente = url.protocol === 'http:' ? http : https;
    const peticion = cliente.get(url, {
      headers: { 'user-agent': 'Mozilla/5.0 (compatible; ExecutiveLab/1.0)', accept: 'text/html,*/*' },
    }, (respuesta) => {
      const { statusCode: codigo, headers } = respuesta;
      if (codigo >= 300 && codigo < 400 && headers.location) {
        respuesta.resume();
        if (saltos <= 0) { rechazar(new Error('demasiadas redirecciones')); return; }
        resolver(descargar(new URL(headers.location, url).toString(), { limite, tiempo, saltos: saltos - 1 }));
        return;
      }
      if (codigo < 200 || codigo >= 300) {
        respuesta.resume();
        rechazar(new Error(`la web ha contestado ${codigo}`));
        return;
      }
      const trozos = [];
      let tamano = 0;
      respuesta.on('data', (trozo) => {
        tamano += trozo.length;
        if (tamano > limite) {
          peticion.destroy(new Error('demasiado grande'));
          return;
        }
        trozos.push(trozo);
      });
      respuesta.on('end', () => resolver({
        cuerpo: Buffer.concat(trozos),
        tipo: String(headers['content-type'] || ''),
        url: url.toString(),
      }));
      respuesta.on('error', rechazar);
    });
    peticion.setTimeout(tiempo, () => peticion.destroy(new Error('la web no contesta')));
    peticion.on('error', rechazar);
  });
}

// ── Leer el HTML ─────────────────────────────────────────────────────────

const atributo = (etiqueta, nombre) => {
  const m = etiqueta.match(new RegExp(`\\b${nombre}\\s*=\\s*("([^"]*)"|'([^']*)'|([^\\s>]+))`, 'i'));
  return m ? (m[2] ?? m[3] ?? m[4] ?? '').trim() : '';
};

const etiquetas = (html, nombre) => html.match(new RegExp(`<${nombre}\\b[^>]*>`, 'gi')) || [];

// Y los espacios se aplastan a uno. Un `<title>` partido en varias líneas es
// HTML normal y corriente —lo escribe cualquier formateador— y eso llegaba a
// la cabecera del récord de marca con su salto dentro: el nombre se quedaba en
// la primera palabra («Casa» de «Casa\n  Pepe») y la segunda línea se colaba
// como si fuera otro campo. Aquí no entra nada con un salto de línea.
const sinEntidades = (t) => String(t || '')
  .replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'")
  .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&nbsp;/g, ' ')
  .replace(/\s+/g, ' ')
  .trim();

function meta(html, clave) {
  for (const et of etiquetas(html, 'meta')) {
    const nombre = (atributo(et, 'name') || atributo(et, 'property')).toLowerCase();
    if (nombre === clave) return sinEntidades(atributo(et, 'content'));
  }
  return '';
}

// «Ferretería Soler | Inicio», «Inicio - Ferretería Soler»: se queda la parte
// que no sea una palabra de menú, y si hay duda, la más larga.
const MENU = /^(inicio|home|bienvenidos?|welcome|página principal|portada)$/i;
function nombreDelTitulo(titulo) {
  const partes = sinEntidades(titulo).split(/\s+[|–—\-·»]\s+/).map((p) => p.trim()).filter(Boolean);
  if (!partes.length) return '';
  const candidatas = partes.filter((p) => !MENU.test(p));
  return (candidatas.length ? candidatas : partes).sort((a, b) => b.length - a.length)[0].slice(0, 60);
}

// `#abc`, `#aabbcc`, `#aabbccdd`, `rgb(…)`, `rgba(…)` → `#aabbcc`, o null.
function normalizar(valor) {
  const t = String(valor || '').trim().toLowerCase();
  const hex = t.match(/^#([0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/);
  if (hex) {
    let h = hex[1];
    if (h.length <= 4) h = h.split('').map((c) => c + c).join('');
    return `#${h.slice(0, 6)}`;
  }
  const rgb = t.match(/^rgba?\(\s*(\d{1,3})\s*[, ]\s*(\d{1,3})\s*[, ]\s*(\d{1,3})/);
  if (rgb) {
    return `#${[rgb[1], rgb[2], rgb[3]].map((c) => Math.min(255, Number(c)).toString(16).padStart(2, '0')).join('')}`;
  }
  return null;
}

// Blanco, negro y los grises no son un color de marca: son el fondo de todo.
// Se mide la diferencia entre el canal más alto y el más bajo: en un gris son
// iguales, y con menos de un 12 % de diferencia el ojo no ve color.
function esGris(valor) {
  const hex = normalizar(valor);
  if (!hex) return true; // lo que no es un color tampoco es un color de marca
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  return Math.max(r, g, b) - Math.min(r, g, b) < 0.12;
}

const VARIABLES_DE_MARCA = /--(?:color-)?(?:primary|brand|accent|main|principal|primario|marca|acento|theme)(?:-color|-500|-600|-base|-main)?\s*:\s*([^;}]+)/gi;
const VARIABLES_DE_FONDO = /--(?:color-)?(?:background|bg|fondo|surface|body-bg)(?:-color|-base|-primary)?\s*:\s*([^;}]+)/gi;
const VARIABLES_DE_TEXTO = /--(?:color-)?(?:foreground|text|texto|body-color|on-background)(?:-color|-base|-primary)?\s*:\s*([^;}]+)/gi;

function primeraVariable(css, patron) {
  for (const m of css.matchAll(patron)) {
    const hex = normalizar(m[1].trim().split(/\s+/)[0]);
    if (hex) return hex;
  }
  return null;
}

// Lo que el `body` (o `html`) declara de fondo y de letra.
function delBody(css, propiedad) {
  const bloque = css.match(/(?:^|[\s,}])(?:html\s*,\s*)?body\s*\{([^}]*)\}/i) || css.match(/(?:^|[\s,}])html\s*\{([^}]*)\}/i);
  if (!bloque) return null;
  const decl = bloque[1].match(new RegExp(`(?:^|;)\\s*${propiedad}(?:-color)?\\s*:\\s*([^;]+)`, 'i'));
  return decl ? normalizar(decl[1].trim().split(/\s+/)[0]) : null;
}

// El color saturado que más se repite: en una web con marca, suele ser ella.
function elMasRepetido(css) {
  const cuenta = new Map();
  for (const m of css.matchAll(/#(?:[0-9a-f]{3}|[0-9a-f]{6})\b/gi)) {
    const hex = normalizar(m[0]);
    if (!hex || esGris(hex)) continue;
    cuenta.set(hex, (cuenta.get(hex) || 0) + 1);
  }
  const mejor = [...cuenta.entries()].sort((a, b) => b[1] - a[1])[0];
  return mejor && mejor[1] >= 2 ? mejor[0] : null;
}

const cssEnLinea = (html) => (html.match(/<style\b[^>]*>([\s\S]*?)<\/style>/gi) || []).join('\n');

function hojasDeEstilo(html, base) {
  const hojas = [];
  for (const et of etiquetas(html, 'link')) {
    const rel = atributo(et, 'rel').toLowerCase();
    const href = atributo(et, 'href');
    if (rel.split(/\s+/).includes('stylesheet') && href) {
      try { hojas.push(new URL(href, base).toString()); } catch { /* un href roto no cuenta */ }
    }
  }
  return hojas;
}

const EXTENSIONES = /\.(svg|png|jpe?g|webp)(?:[?#].*)?$/i;

// El icono grande primero. Se descartan los .ico porque la barra no los pinta.
function logoDe(html, base) {
  const candidatos = [];
  for (const et of etiquetas(html, 'link')) {
    const rel = atributo(et, 'rel').toLowerCase().split(/\s+/);
    const href = atributo(et, 'href');
    if (!href) continue;
    let direccion;
    try { direccion = new URL(href, base).toString(); } catch { continue; }
    const tipo = atributo(et, 'type').toLowerCase();
    const ext = (direccion.match(EXTENSIONES) || [])[1] || (tipo === 'image/svg+xml' ? 'svg' : tipo === 'image/png' ? 'png' : null);
    if (!ext) continue;
    const tamano = Number((atributo(et, 'sizes').match(/(\d+)x/) || [])[1] || 0);
    if (rel.includes('apple-touch-icon') || rel.includes('apple-touch-icon-precomposed')) candidatos.push({ direccion, ext: ext.toLowerCase(), peso: 1000 + tamano });
    else if (rel.includes('icon')) candidatos.push({ direccion, ext: ext.toLowerCase(), peso: (ext === 'svg' ? 500 : 0) + tamano });
  }
  candidatos.sort((a, b) => b.peso - a.peso);
  return candidatos[0] ? { url: candidatos[0].direccion, ext: candidatos[0].ext.replace('jpeg', 'jpg') } : null;
}

// ── La tipografía ────────────────────────────────────────────────────────
//
// La de sus títulos (decisión 204). Primero una hoja de Google Fonts, que además
// es libre y se puede bajar; si no, el `font-family` de sus títulos (`h1`, `h2`)
// o del `body`, saltándose las del sistema, que no son de nadie.
const DEL_SISTEMA = /^(-apple-system|system-ui|ui-sans-serif|ui-serif|ui-monospace|blinkmacsystemfont|segoe ui|roboto|helvetica|helvetica neue|arial|sans-serif|serif|monospace|cursive|fantasy|emoji|math|georgia|times|times new roman|verdana|tahoma|inherit|initial|unset|revert)$/i;
// Va escrito tal cual en la cabecera del récord y en la hoja de estilo.
const NOMBRE_DE_TIPOGRAFIA = /^[\p{L}\p{N}][\p{L}\p{N} -]{0,47}$/u;

function deGoogle(href) {
  const m = String(href || '').replace(/&amp;/g, '&').match(/^https?:\/\/fonts\.googleapis\.com\/css2?\?(.+)$/i);
  if (!m) return null;
  const familia = new URLSearchParams(m[1]).get('family');
  const nombre = familia ? familia.split(':')[0].trim() : '';
  return NOMBRE_DE_TIPOGRAFIA.test(nombre) ? nombre : null;
}

function primeraFamilia(lista) {
  for (const trozo of String(lista || '').split(',')) {
    const nombre = trozo.trim().replace(/^['"]|['"]$/g, '').trim();
    if (nombre && !/^var\(/i.test(nombre) && !DEL_SISTEMA.test(nombre) && NOMBRE_DE_TIPOGRAFIA.test(nombre)) return nombre;
  }
  return null;
}

function tipografiaDeCss(css) {
  const importada = deGoogle((String(css).match(/@import\s+(?:url\(\s*)?['"]?(https?:\/\/fonts\.googleapis\.com\/[^'")\s]+)/i) || [])[1]);
  if (importada) return { nombre: importada, google: true };
  for (const selector of ['h1', 'h2', 'body']) {
    for (const [, cuerpo] of String(css).matchAll(new RegExp(`(?:^|[}\\s,>])${selector}\\b[^{}]*\\{([^}]*)\\}`, 'gi'))) {
      const nombre = primeraFamilia((cuerpo.match(/font-family\s*:\s*([^;}]+)/i) || [])[1]);
      if (nombre) return { nombre, google: false };
    }
  }
  return null;
}

function tipografiaDe(html, css) {
  for (const et of etiquetas(html, 'link')) {
    const nombre = deGoogle(atributo(et, 'href'));
    if (nombre) return { nombre, google: true };
  }
  return tipografiaDeCss(css);
}

// Su fichero, solo de Google Fonts: ahí todas son libres, y se sabe de dónde
// viene. Con varias, la del alfabeto latino, que Google marca con un comentario.
async function bajarDeGoogle(nombre, bajar) {
  const hoja = (await bajar(`https://fonts.googleapis.com/css2?family=${encodeURIComponent(nombre).replace(/%20/g, '+')}`, { limite: 200_000 })).cuerpo.toString('utf8');
  const bloques = hoja.split('@font-face');
  const latino = bloques.findIndex((b, i) => i > 0 && /\/\*\s*latin\s*\*\/\s*$/.test(bloques[i - 1]));
  const elegido = latino > 0 ? bloques[latino] : (bloques[1] || '');
  const m = elegido.match(/url\((https:\/\/fonts\.gstatic\.com\/[^)\s'"]+\.(woff2|woff|ttf|otf))\)/i);
  if (!m) return null;
  const fichero = await bajar(m[1], { limite: LIMITE_FUENTE });
  return fichero && fichero.cuerpo.length ? { cuerpo: fichero.cuerpo, ext: m[2].toLowerCase() } : null;
}

// Lo que se puede saber de una web leyendo solo su portada. Puro: sin red.
function extraer(html, base) {
  const css = cssEnLinea(html);
  const tema = normalizar(meta(html, 'theme-color'));
  const nombre = meta(html, 'og:site_name') || nombreDelTitulo((html.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i) || [])[1] || '');

  return {
    nombre: nombre || '',
    acento: (tema && !esGris(tema) ? tema : null) || primeraVariable(css, VARIABLES_DE_MARCA) || elMasRepetido(css),
    fondo: primeraVariable(css, VARIABLES_DE_FONDO) || delBody(css, 'background'),
    texto: primeraVariable(css, VARIABLES_DE_TEXTO) || delBody(css, 'color'),
    logo: logoDe(html, base),
    tipografia: tipografiaDe(html, css),
    hojas: hojasDeEstilo(html, base),
  };
}

// Lo mismo, pero sobre una hoja de estilos: para cuando la portada no lo dice.
function extraerDeCss(css) {
  return {
    acento: primeraVariable(css, VARIABLES_DE_MARCA) || elMasRepetido(css),
    fondo: primeraVariable(css, VARIABLES_DE_FONDO) || delBody(css, 'background'),
    texto: primeraVariable(css, VARIABLES_DE_TEXTO) || delBody(css, 'color'),
    tipografia: tipografiaDeCss(css),
  };
}

// ── Escribir la cara ─────────────────────────────────────────────────────

// Una cara puesta a mano —por el asistente o por quien sea— no se pisa. Solo
// se reescribe la que esto mismo dejó como provisional.
function hayCaraPuestaAMano() {
  const registro = proyecto.ruta(...marca.CARPETA, marca.FICHERO);
  if (!registro || !fs.existsSync(registro)) return false;
  const campos = frontmatter.leer(registro);
  return String(campos.provisional || '').trim().toLowerCase() !== 'si';
}

async function sacarLaCara(web, { bajar = descargar } = {}) {
  const raiz = proyecto.raiz();
  if (!raiz) return { ok: false, motivo: 'sin carpeta' };
  if (hayCaraPuestaAMano()) return { ok: false, motivo: 'ya hay una cara puesta a mano' };

  let portada;
  try {
    portada = await bajar(web);
  } catch (error) {
    return { ok: false, motivo: `no he podido leer la web: ${error.message}` };
  }
  if (!/html/i.test(portada.tipo) && !/<html|<head|<body/i.test(portada.cuerpo.toString('utf8', 0, 2000))) {
    return { ok: false, motivo: 'eso no es una página web' };
  }

  const html = portada.cuerpo.toString('utf8');
  const leido = extraer(html, portada.url);

  // La portada no siempre lleva el CSS dentro: se mira la primera hoja (dos
  // como mucho), que es donde una web con marca declara sus colores.
  for (const hoja of leido.hojas.slice(0, 2)) {
    if (leido.acento && leido.fondo && leido.tipografia) break;
    try {
      const css = (await bajar(hoja, { limite: 400_000 })).cuerpo.toString('utf8');
      const deLaHoja = extraerDeCss(css);
      leido.acento = leido.acento || deLaHoja.acento;
      leido.fondo = leido.fondo || deLaHoja.fondo;
      leido.texto = leido.texto || deLaHoja.texto;
      leido.tipografia = leido.tipografia || deLaHoja.tipografia;
    } catch { /* una hoja que no baja no tumba lo demás */ }
  }

  if (!leido.acento) return { ok: false, motivo: 'la web no declara ningún color de marca' };

  // Sin fondo declarado, blanco: es lo que hace una web que no dice nada. El
  // texto solo decide si la marca es clara u oscura; las letras las calcula
  // `marca.js` con la escala de Material.
  const fondo = leido.fondo || '#ffffff';
  const texto = leido.texto && color.luz(leido.texto) !== color.luz(fondo)
    ? leido.texto
    : (color.luz(fondo) > 0.5 ? '#1a1a1a' : '#f5f5f5');

  const carpeta = path.join(raiz, ...marca.CARPETA);
  try {
    fs.mkdirSync(carpeta, { recursive: true });
  } catch (error) {
    return { ok: false, motivo: `no he podido crear la carpeta de la marca: ${error.message}`, escritura: `No he podido crear la carpeta de la marca: ${porQueNoSePudo(error)}.` };
  }

  let logo = null;
  let logoSinGuardar = null;
  if (leido.logo) {
    let bajado = null;
    try {
      bajado = await bajar(leido.logo.url, { limite: LIMITE_LOGO });
    } catch { /* sin logotipo se escribe el nombre: `marca.js` ya lo hace */ }
    if (bajado && bajado.cuerpo.length > 0) {
      try {
        fs.writeFileSync(path.join(carpeta, `logo.${leido.logo.ext}`), bajado.cuerpo);
        logo = `logo.${leido.logo.ext}`;
      } catch (error) { logoSinGuardar = `No he podido guardar el logotipo: ${porQueNoSePudo(error)}.`; }
    }
  }

  // Su tipografía (decisión 204): el nombre siempre; el fichero, si es de
  // Google Fonts. Si no baja, la cara se pone igual, con el nombre.
  let fuente = null;
  if (leido.tipografia && leido.tipografia.google) {
    try {
      const bajada = await bajarDeGoogle(leido.tipografia.nombre, bajar);
      if (bajada) {
        fs.writeFileSync(path.join(carpeta, `fuente.${bajada.ext}`), bajada.cuerpo);
        fuente = `fuente.${bajada.ext}`;
      }
    } catch { /* sin su fichero, por su nombre */ }
  }

  // Un cinturón más, porque este nombre sale de una web ajena y acaba en una
  // cabecera donde cada línea es un campo: lo que llegue con un salto dentro
  // se queda en una línea o no entra. Lo de arriba ya lo aplasta; esto lo
  // garantiza aunque mañana el nombre venga por otro camino.
  const enUnaLinea = (t) => String(t || '').replace(/\s+/g, ' ').trim();
  const nombre = enUnaLinea(leido.nombre) || new URL(portada.url).hostname.replace(/^www\./, '');
  const registro = [
    '---',
    `empresa: ${nombre}`,
    `fondo: ${fondo}`,
    `texto: ${texto}`,
    `acento: ${leido.acento}`,
    ...(logo ? [`logo: ${logo}`] : []),
    ...(leido.tipografia ? [`tipografia: ${leido.tipografia.nombre}`] : []),
    ...(fuente ? [`fuente: ${fuente}`] : []),
    `resource: ${web}`,
    'provisional: si',
    '---',
    '',
    `# La marca de ${nombre}`,
    '',
    `Sacada de ${web} de forma automática al montar la carpeta: es un primer intento. El asistente`,
    'puede afinarla mirando la web con calma; al reescribir este fichero, quita `provisional`.',
    '',
  ].join('\n');
  try {
    fs.writeFileSync(path.join(carpeta, marca.FICHERO), registro);
  } catch (error) {
    return { ok: false, motivo: `no he podido escribir ${marca.FICHERO}: ${error.message}`, escritura: `No he podido guardar los colores de tu web (${marca.FICHERO}): ${porQueNoSePudo(error)}.` };
  }

  return { ok: true, nombre, acento: leido.acento, fondo, logo: Boolean(logo), tipografia: leido.tipografia ? leido.tipografia.nombre : null, fuente: Boolean(fuente), logoSinGuardar };
}

module.exports = { sacarLaCara, extraer, extraerDeCss, descargar, normalizar, esGris, nombreDelTitulo, logoDe };
