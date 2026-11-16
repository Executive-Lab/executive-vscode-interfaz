// "Mis conexiones": las credenciales de 01-TOOLS con cara de formulario.
//
// RSC guarda las credenciales por proveedor: cada carpeta de 01-TOOLS/ lleva
// su .env.example (qué claves espera), su .env (los valores reales, fuera de
// git) y su test_connection.sh. Aquí se leen las esperadas, se rellenan sin
// que el alumno abra un fichero oculto, y se prueban con el script que trae la
// propia carpeta: no inventamos cómo se comprueba nada.
//
// Aquí muere la mayor parte del soporte del curso. Pedirle a alguien que abra
// un fichero oculto y escriba CLAVE=valor sin comillas ni espacios falla más de
// lo que parece: sobra un espacio, sobran unas comillas, se pega con un salto
// de línea. Un campo de texto y un botón que dice sí o no lo arregla.

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const proyecto = require('./proyecto');
const rutas = require('./rutas');
const procesos = require('./procesos');
const entorno = require('./entorno');

const CARPETA = '01-TOOLS';

// Nombres humanos para proveedores que reconocemos por el nombre de carpeta.
const PROVEEDORES = {
  anthropic: 'Claude', openai: 'OpenAI', stripe: 'Stripe', google: 'Google',
  gmail: 'Gmail', notion: 'Notion', slack: 'Slack', hubspot: 'HubSpot',
  shopify: 'Shopify', holded: 'Holded', twilio: 'Twilio', sendgrid: 'SendGrid',
  supabase: 'Supabase', airtable: 'Airtable', whatsapp: 'WhatsApp', telegram: 'Telegram',
};

// Qué es cada clave, por su sufijo. Lo que no esté aquí se muestra en crudo,
// pero mejor añadirlo que dejar que salga MAILCHIMP_API_KEY.
const SUFIJOS = [
  [/_(API_)?KEY$/, 'Clave de acceso'],
  [/_(API_)?SECRET$/, 'Clave secreta'],
  [/_(ACCESS_|AUTH_)?TOKEN$/, 'Clave de acceso'],
  [/_PASSWORD$/, 'Contraseña'],
  [/_(USER|USERNAME)$/, 'Usuario'],
  [/_(EMAIL|MAIL)$/, 'Correo'],
  [/_(ACCOUNT|ACCOUNT_ID|ACCOUNT_SID)$/, 'Cuenta'],
  [/_(URL|BASE_URL|ENDPOINT|HOST)$/, 'Dirección'],
  [/_(DB|DATABASE)$/, 'Base de datos'],
  [/_PORT$/, 'Puerto'],
  [/_DOMAIN$/, 'Dominio'],
  [/_REGION$/, 'Región'],
  [/_(WORKSPACE|TEAM|ORG|COMPANY)(_ID)?$/, 'Espacio de trabajo'],
  [/_ENV$/, 'Entorno (test o production)'],
];

const ES_SECRETA = /(KEY|SECRET|TOKEN|PASSWORD)$/;

function humanizar(texto) {
  const limpio = texto.replace(/[-_]+/g, ' ').trim().toLowerCase();
  return limpio.charAt(0).toUpperCase() + limpio.slice(1);
}

function etiquetaDeClave(clave) {
  const mayus = clave.toUpperCase();
  const [, etiqueta] = SUFIJOS.find(([patron]) => patron.test(mayus)) || [];
  if (etiqueta) return etiqueta;

  const sinPrefijo = mayus.split('_').slice(1).join('_') || mayus;
  // Una sigla corta se queda como está: "Db" no es una palabra, "DB" sí se
  // reconoce. Lo demás se humaniza.
  return sinPrefijo.length <= 3 ? sinPrefijo : humanizar(sinPrefijo);
}

// Nunca se devuelve una clave entera a la interfaz: solo los últimos cuatro
// caracteres, lo justo para que reconozcan cuál es.
function enmascarar(valor) {
  if (!valor) return '';
  return valor.length <= 4 ? '••••' : `••••${valor.slice(-4)}`;
}

// ── Qué nombre de carpeta vale ───────────────────────────────────────────
//
// Esto exigía `/^[\w.-]+$/`, y `\w` es `[A-Za-z0-9_]`: ni acentos, ni eñes, ni
// espacios. En un producto para alumnos **españoles**, con un asistente al que
// le imponemos escribir en español, eso significaba que `01-TOOLS/Señal/` o
// `01-TOOLS/Correo-Electrónico/` salían en la lista —`proveedores()` lista
// cualquier carpeta— y al abrirlas no había nada. Al intentar guardar una
// clave la barra contestaba «Esa conexión ya no está», que además de falso
// hace pensar que se ha borrado sola.
//
// La comprobación estaba para una cosa buena: que un id venido de la interfaz
// no se salga de `01-TOOLS`. Pero una lista blanca de letras no es la forma de
// pedir eso — se mira dónde cae la ruta de verdad, que es más seguro y no deja
// fuera media lengua.
function carpetaDe(proveedorId) {
  if (typeof proveedorId !== 'string' || !proveedorId.trim()) return null;
  // Un nombre de carpeta, no una ruta: nada de barras ni de subir por el árbol.
  if (/[\\/]/.test(proveedorId) || proveedorId === '..') return null;
  // `_TEMPLATE` es la plantilla y lo que empieza por punto no se enseña, igual
  // que en `proveedores()`.
  if (proveedorId.startsWith('_') || proveedorId.startsWith('.')) return null;

  const base = proyecto.ruta(CARPETA);
  if (!base) return null;

  // Y el cinturón: caiga donde caiga, tiene que quedar dentro de 01-TOOLS.
  const completa = path.resolve(base, proveedorId);
  if (!rutas.estaDentro(base, completa)) return null;

  return fs.existsSync(completa) ? completa : null;
}

// El README de cada proveedor empieza con "# Nombre". Si sigue siendo el
// marcador de la plantilla, se usa el nombre de la carpeta.
//
// Sin seguir enlaces (decisión 159): lo que se lee de aquí acaba también escrito
// en la guía en PDF, y un README que fuera un enlace a otro fichero lo metería
// dentro. Y uno que fuera un enlace a /dev/zero colgaba cada repintado.
function etiquetaDeProveedor(id, carpeta) {
  const texto = leerSiEsUnFichero(path.join(carpeta, 'README.md'));
  const primera = (texto || '').split('\n')[0] || '';
  const titulo = primera.replace(/^#\s*/, '').trim();
  if (titulo && !titulo.includes('<')) return titulo;
  return PROVEEDORES[id.toLowerCase()] || humanizar(id);
}

// ── Cómo se escriben los `.env` de verdad ────────────────────────────────
//
// Probando con arneses nuevos salieron dos formas que esto leía mal, y las dos
// hacían que la barra se creyera cosas que no son:
//
//   `export CLAVE=valor`  — la gente lo escribe, y `sueltas.js` ya lo daba por
//     supuesto. Aquí la clave salía llamándose «export CLAVE», así que la
//     pantalla enseñaba la misma dos veces: una diciendo que faltaba y otra
//     con su valor puesto.
//
//   `CLAVE=   # una nota`  — el comentario se tomaba como el valor, así que una
//     clave vacía contaba como puesta, la cuenta de las que faltan mentía, y
//     «Probar la conexión» se lanzaba creyendo que estaba todo.
//
// El comentario solo se quita cuando lleva un espacio delante, que es la regla
// de siempre: una contraseña puede ser `abc#123` y ahí el `#` es suyo. Y si el
// valor va entre comillas, dentro no se toca nada.
function leerEnv(fichero) {
  if (!fs.existsSync(fichero)) return new Map();
  const valores = new Map();
  for (const linea of fs.readFileSync(fichero, 'utf8').split('\n')) {
    const limpia = linea.trim();
    if (!limpia || limpia.startsWith('#') || !limpia.includes('=')) continue;

    const corte = limpia.indexOf('=');
    const clave = limpia.slice(0, corte).trim().replace(/^export\s+/, '');
    // Sin recortar todavía: el espacio de antes del `#` es lo que distingue un
    // comentario de una contraseña que empiece por almohadilla.
    const crudo = limpia.slice(corte + 1);
    let valor;

    // Con comillas simples, como las escribe la barra (F3): tramos entre comillas
    // y comillas escapadas, que bash junta en un solo valor: `'it'\''s'` es it's.
    const simples = crudo.trim().match(/^((?:'[^']*'|\\')+)(?:\s|$)/);
    const entreComillas = crudo.trim().match(/^(["'])([\s\S]*?)\1/);
    if (simples) valor = simples[1].replace(/'([^']*)'|\\'/g, (_, dentro) => (dentro === undefined ? "'" : dentro));
    else if (entreComillas) valor = entreComillas[2];
    else valor = crudo.replace(/\s#.*$/, '').trim();

    valores.set(clave, valor);
  }
  return valores;
}

// Qué es cada clave y dónde se saca, según la tabla de CREDENTIALS.md que
// rellena el asistente:
//
//   | Variable | Tipo | Dónde se saca | Rotación |
//   | `HOLDED_API_KEY` | secreta | Ajustes → Desarrolladores → API | ... |
//
// La tercera columna es lo que el alumno necesita leer justo encima del campo.
function dondeSeSacaCadaClave(carpeta) {
  const donde = new Map();
  // Sin seguir enlaces, como el README (decisión 159).
  const texto = leerSiEsUnFichero(path.join(carpeta, 'CREDENTIALS.md'));
  if (texto === null) return donde;

  // La columna se busca por su cabecera («Dónde se saca», «Where to generate»):
  // si el asistente pone el tipo de acceso como tercera columna, no se lee como
  // «dónde se saca» (revisión de corrección de la 156). Sin cabecera que lo
  // diga, la tercera, como siempre.
  let columna = 2;
  for (const linea of texto.split('\n')) {
    if (!linea.trim().startsWith('|')) continue;
    const celdas = linea.trim().replace(/^\||\|$/g, '').split('|').map((c) => c.trim().slice(0, 300));
    const fila = (celdas[0] || '').match(/^`([A-Z][A-Z0-9_]*)`$/);
    if (!fila) {
      if (!celdas.every((c) => /^:?-*:?$/.test(c))) {
        const cual = celdas.findIndex((c) => /d[oó]nde|where/i.test(c));
        columna = cual > 0 ? cual : 2;
      }
      continue;
    }
    const pista = (celdas[columna] || '').replace(/`/g, '').trim();
    // Las plantillas de RSC traen filas de ejemplo con marcadores.
    if (!pista || /[{<]/.test(pista)) continue;
    donde.set(fila[1], pista);
  }
  return donde;
}

// ── Qué clase de acceso pide (decisión 156) ──────────────────────────────
//
// La propuesta decía una columna «Tipo de acceso» en la tabla de CREDENTIALS.md.
// Pero esa tabla no tiene una forma fija: la plantilla de RSC trae cuatro
// columnas, sus propios ejemplos traen tres, y alguno ni empieza por
// «Variable». Y es una tabla de variables: una herramienta en la que se entra
// con tu cuenta, o que solo pide un fichero, no tiene fila donde escribirlo.
// Así que va en una línea, junto a la URL de su panel, que ya se lee de ahí:
//
//   - URL: https://app.holded.com/api
//   - Tipo de acceso: Una clave
//
// Si el asistente la puso como columna, también vale. Y sin ninguna de las dos,
// la pantalla es la de siempre (P1). Puede nombrar más de una: «Un fichero de
// acceso y entrar con tu cuenta».
const CLASES_DE_ACCESO = [
  // «Iniciar sesión» o «login» a secas también lo dice quien pide usuario y
  // contraseña: solo cuenta si es con tu cuenta.
  ['cuenta', /\boauth\b|\bentra(?:r)?\s+con\s+(?:tu|su|mi|la)\s+cuenta|\binicia(?:r)?\s+sesi[oó]n\s+con\s+(?:tu|su|mi|la)\s+cuenta|\b(?:sign|log)[\s-]?in\s+with\b/i],
  ['fichero', /fichero|archivo|cuenta\s+de\s+servicio|service\s+account|certificad|certificate|\bkey\s*file\b/i],
  ['usuario', /usuario|contrase[ñn]a|\buser(?:name)?\s*(?:and|y|\/|&)\s*pass|\bpassword\b|\bbasic\s+auth/i],
  // «Una clave de API en la URL» no es una dirección que te dan: «url» solo si te la dan.
  ['direccion', /direcci[oó]n|webhook|\burl\s+que\b/i],
  ['clave', /\bclaves?\b|\bapi[\s_-]?key\b|\btoken\b|(?<!account\s)\bkey\b(?!\s*file)|\bsecret\b/i],
];
const TITULO_DEL_ACCESO = /(?:tipo|clase)\s+de\s+acceso|access\s+type|auth(?:entication)?\s+type/i;
const LARGO_DE_UNA_LINEA = 300;

// Lo nuevo de la 156 lee estos ficheros sin seguir enlaces y con tope: uno que
// fuera un enlace a /dev/zero colgaba el editor (revisión de la 149, con la huella).
function leerSiEsUnFichero(ruta, tope = 256 * 1024) {
  try {
    const datos = fs.lstatSync(ruta);
    return datos.isFile() && datos.size <= tope ? fs.readFileSync(ruta, 'utf8') : null;
  } catch {
    return null;
  }
}

// Las clases que nombra un trozo, en el orden en que salen.
function enUnTrozo(trozo) {
  return CLASES_DE_ACCESO
    .map(([clase, patron]) => [clase, trozo.search(patron)])
    .filter(([, donde]) => donde !== -1)
    .sort((a, b) => a[1] - b[1])
    .map(([clase]) => clase);
}

// ── Lo que dice de verdad la línea (revisión de corrección de la 156) ────
//
// Se leía la frase entera, y «Una clave de API (va en el .env, no hace falta
// ningún archivo)» salía clave y fichero: la barra decía que le faltaba un
// fichero que no pedía, y no se probaba sola. Ahora:
//   · solo la primera frase, hasta el primer punto, paréntesis o coma (y si esa
//     no nombra nada, lo de dentro del paréntesis: «Client ID y secret (OAuth)»);
//   · lo que va detrás de «no», «ni» o «sin» no cuenta;
//   · con «o» entre dos clases, vale cualquiera: no se exigen las dos.
function leerLasClases(texto) {
  const limpio = String(texto || '').replace(/[`*_]/g, ' ').slice(0, LARGO_DE_UNA_LINEA);
  if (!limpio.trim() || /[<{]/.test(limpio)) return { clases: [], unoDe: false };
  const lee = (frase) => {
    const clases = [];
    let unoDe = false;
    // Se parte por los nexos, y cada trozo dice si suma, si es otra opción o si niega.
    const trozos = ` ${frase} `.split(/\s(y|e|o|u|ni|sin|no|and|or|without|not)\s/i);
    let nexo = '';
    for (let i = 0; i < trozos.length; i += 1) {
      if (i % 2 === 1) { nexo = trozos[i].toLowerCase(); continue; }
      // «y no un fichero»: el «no» se queda al principio del trozo.
      if (/^(?:ni|sin|no|without|not)$/.test(nexo) || /^\s*(?:ni|sin|no|without|not)\s/i.test(trozos[i])) continue;
      const aqui = enUnTrozo(trozos[i]);
      if (aqui.length && /^(?:o|u|or)$/.test(nexo) && clases.length) unoDe = true;
      for (const clase of aqui) if (!clases.includes(clase)) clases.push(clase);
    }
    return { clases, unoDe };
  };
  const primera = limpio.split(/[.(,;:]/)[0];
  const dePrimeras = lee(primera);
  if (dePrimeras.clases.length) return dePrimeras;
  const dentro = (limpio.match(/\(([^()]{1,200})\)/) || [])[1] || '';
  return lee(dentro);
}

const clasesQueNombra = (texto) => leerLasClases(texto).clases;

function comoSeEntra(carpeta) {
  return accesoDe(carpeta).clases;
}

// Las clases y si vale cualquiera de ellas («Una clave o un fichero de acceso»).
function accesoDe(carpeta) {
  const ninguna = { clases: [], unoDe: false };
  const texto = leerSiEsUnFichero(path.join(carpeta, 'CREDENTIALS.md'));
  if (texto === null) return ninguna;
  // Con tope por línea antes de ninguna expresión: esto corre en cada repintado
  // (`proveedores()`), y un CREDENTIALS.md preparado con cien espacios delante
  // tenía a la de antes 2,4 s pensando (revisión de seguridad de la 156).
  const lineas = texto.split(/\r?\n/).map((l) => l.slice(0, LARGO_DE_UNA_LINEA * 3));
  // Primero la línea: «- Tipo de acceso: Una clave», con negritas o sin ellas.
  // A mano y no con una expresión: el título va hasta los dos puntos.
  for (const cruda of lineas) {
    if (cruda.length > LARGO_DE_UNA_LINEA) continue;
    const linea = cruda.trim().replace(/^[-*] /, '');
    const dosPuntos = linea.indexOf(':');
    if (dosPuntos < 4 || dosPuntos > 60 || linea.includes('|')) continue;
    const titulo = linea.slice(0, dosPuntos).replace(/\*/g, '').trim();
    if (TITULO_DEL_ACCESO.test(titulo)) return leerLasClases(linea.slice(dosPuntos + 1));
  }
  // Y si no, una columna con ese nombre, en la tabla que sea.
  const celdas = (linea) => linea.trim().replace(/^\||\|$/g, '').split('|').map((c) => c.trim().slice(0, LARGO_DE_UNA_LINEA));
  const cabecera = lineas.findIndex((l) => l.trim().startsWith('|') && celdas(l).some((c) => TITULO_DEL_ACCESO.test(c)));
  if (cabecera === -1) return ninguna;
  const columna = celdas(lineas[cabecera]).findIndex((c) => TITULO_DEL_ACCESO.test(c));
  const valores = [];
  for (const linea of lineas.slice(cabecera + 1)) {
    if (!linea.trim().startsWith('|')) break;
    const valor = celdas(linea)[columna] || '';
    if (!/^:?-+:?$/.test(valor)) valores.push(valor);
  }
  return { clases: [...new Set(valores.flatMap(clasesQueNombra))], unoDe: false };
}

// Si de verdad le hace falta su fichero de acceso: lo pide, y no como una opción más.
const pideElFichero = ({ clases, unoDe }) => clases.includes('fichero') && !unoDe;

// Cómo se pinta cada clave según la clase de acceso: el usuario y la contraseña,
// juntos; una dirección que te dan, como dirección. Lo demás, como siempre.
const ES_USUARIO = /_(USER|USERNAME|LOGIN|EMAIL|MAIL)$/;
const ES_CONTRASENA = /_(PASSWORD|PASSWD|PASS)$/;
const ES_DIRECCION = /_(URL|WEBHOOK|WEBHOOK_URL|HOOK|HOOK_URL|ENDPOINT)$/;
function formaDeLaClave(clave, clases) {
  const mayus = clave.toUpperCase();
  if (clases.includes('usuario') && ES_USUARIO.test(mayus)) return 'usuario';
  if (clases.includes('usuario') && ES_CONTRASENA.test(mayus)) return 'contrasena';
  // Solo por su nombre: con «una dirección» a secas, un secreto de firma se pintaba como dirección.
  if (clases.includes('direccion') && ES_DIRECCION.test(mayus)) return 'direccion';
  return null;
}

// Los pasos para conectarla, en cristiano. El asistente los escribe en una
// sección "Cómo conectarla" del README de la herramienta cuando la investiga.
// Los pasos técnicos de la plantilla de RSC (copiar el .env, dar permisos) no
// se enseñan: eso lo hace el panel o el asistente, no el alumno.
// El asistente no siempre titula igual: le decimos "Cómo conectarla" pero
// escribe "Qué hace falta" o "Antes de empezar" y el contenido es el bueno.
// Se aceptan los títulos naturales antes que quedarnos sin guía. Pero si está
// «Cómo conectarla», manda esa: desde la decisión 159 los raíles piden también lo
// que hace falta antes de empezar, y puede venir en su propia sección, delante.
const TITULOS = /^(c[oó]mo\s+(se\s+)?conect|qu[eé]\s+(hace\s+falta|necesitas)|antes\s+de\s+empezar|pasos|puesta\s+en\s+marcha)/i;
const CONECTARLA = /^c[oó]mo\s+(se\s+)?conect/i;
// Dos líneas que los raíles piden dentro de «Cómo conectarla» y que no son pasos
// (decisión 159): lo que hace falta antes de empezar, y de dónde salen los pasos.
const ANTES_DE_EMPEZAR = /^(?:antes\s+de\s+empezar|lo\s+que\s+hace\s+falta|qu[eé]\s+hace\s+falta|hace\s+falta)\s*:\s*(\S.*)$/i;
const LA_FUENTE = /^(?:fuentes?|fuente\s+oficial|sources?)\s*:\s*(\S.*)$/i;
// Una línea sin la marca de lista, sin negritas ni comillas invertidas.
const enLimpio = (linea) => String(linea).trim().replace(/^(?:\d+[.)]|[-*])\s+/, '').replace(/\*\*|__|`/g, '').trim();
// Un punto de una lista, con tope antes de la expresión: `\s+(.*\S)\s*$` vuelve
// atrás sin fin con una línea de espacios, y un README con una de 40.000 tardaba
// 10 s en cada repintado (revisión de seguridad de la 159). Un paso de más de
// 2.000 letras no es un paso.
const LARGO_DE_UN_PASO = 2000;
const unPunto = (linea) => (linea.length > LARGO_DE_UN_PASO ? null : linea.match(/^\s*(?:\d+[.)]|[-*])\s+(.*\S)\s*$/));
// Un párrafo en una línea, sin `\s*\n\s*`, que también vuelve atrás sin fin con espacios.
const enUnaLineaDeTexto = (t) => t.split('\n').map((l) => l.trim()).filter(Boolean).join(' ');
const noEsUnPaso = (linea) => ANTES_DE_EMPEZAR.test(enLimpio(linea)) || LA_FUENTE.test(enLimpio(linea));

function laSeccionDeLosPasos(texto) {
  const secciones = texto.split(/^##\s+/m);
  return secciones.find((t) => CONECTARLA.test(t)) || secciones.find((t) => TITULOS.test(t)) || null;
}

// `tope`: en la barra, ocho pasos; en la guía en PDF, todos los que haya (hasta 30).
function comoSeConecta(carpeta, tope = 8) {
  const texto = leerSiEsUnFichero(path.join(carpeta, 'README.md'));
  if (texto === null) return [];
  // «Cómo conectarla» manda, pero si no da pasos, la primera de las otras, como
  // antes (revisión de corrección de la 159).
  const secciones = texto.split(/^##\s+/m);
  for (const seccion of [laSeccionDeLosPasos(texto), secciones.find((t) => TITULOS.test(t))]) {
    const pasos = seccion ? losPasosDe(seccion, tope) : [];
    if (pasos.length) return pasos;
  }
  return [];
}

function losPasosDe(seccion, tope) {
  const util = (linea) => linea && !/[{<]/.test(linea) && !/\bcp\b|chmod|\.env\b/.test(linea) && !noEsUnPaso(linea);

  const pasos = seccion.split('\n')
    .map(unPunto)
    .filter(Boolean)
    .map((m) => m[1].replace(/[`*]/g, '').trim())
    .filter(util);
  if (pasos.length) return pasos.slice(0, tope);

  // Sin lista, los párrafos de esa sección. Son menos cómodos de seguir, pero
  // dicen lo mismo y es mejor que una pantalla muda.
  return seccion.split(/\n\s*\n/).slice(1)
    .map((t) => enUnaLineaDeTexto(t).replace(/[`*]/g, '').trim())
    .filter((t) => util(t) && t.length > 20 && t.length < 400 && !t.startsWith('#') && !t.startsWith('|'))
    .slice(0, Math.min(tope, 4));
}

// ── El paso donde se saca la clave (decisión 167) ────────────────────────
//
// La guía de un paso cada vez decía «Cuando la tengas, pégala abajo» en cada paso
// que nombraba algo parecido a una clave. El primero de Holded es «Entra en
// app.holded.com con el usuario y la contraseña de la empresa», y ya decía
// «pégala abajo» antes de haber sacado nada. Y si la clave no vale, la guía tiene
// que volver a un paso concreto: el de sacarla otra vez.
//
// Es el último paso que nombra la clave (o el fichero de acceso, si lo pide y no
// está). El último, porque el primero suele ser el camino («Ve a Ajustes → Claves
// de API») y el último, donde se crea o se copia. La contraseña solo cuenta si lo
// que se pega es un usuario y una contraseña: si no, es la de entrar. Sin ninguno,
// el último paso, que es donde acaba la guía.
const NOMBRA_LA_CLAVE = /\bclave|\bkey|\btoken|\bsecret|\bc[oó]digo/i;
const NOMBRA_LA_CONTRASENA = /\bcontrase|\bpassword/i;
const NOMBRA_EL_FICHERO = /\bfichero|\barchivo|\bdescarg/i;
function elPasoDeLaClave(pasos = [], { acceso = [], pideFichero = false, conFichero = 0 } = {}) {
  if (!pasos.length) return 0;
  const conContrasena = acceso.includes('usuario');
  const sinFichero = pideFichero && !conFichero;
  const nombraLaClave = (p) => NOMBRA_LA_CLAVE.test(p)
    || (conContrasena && NOMBRA_LA_CONTRASENA.test(p))
    || (sinFichero && NOMBRA_EL_FICHERO.test(p));
  for (let n = pasos.length - 1; n >= 0; n -= 1) if (nombraLaClave(pasos[n])) return n;
  return pasos.length - 1;
}

// ── Lo que lee la guía en PDF (decisión 159) ─────────────────────────────
//
// Lo que hace falta antes de empezar (una cuenta, ser administrador, un plan),
// si el asistente lo dejó escrito: en una línea «Antes de empezar: …» dentro de
// «Cómo conectarla», o en su propia sección. Una lista de frases, o vacía.
const TITULO_DE_ANTES = /^(antes\s+de\s+empezar|qu[eé]\s+(hace\s+falta|necesitas)|lo\s+que\s+hace\s+falta|requisitos)/i;
function antesDeEmpezar(carpeta) {
  const texto = leerSiEsUnFichero(path.join(carpeta, 'README.md'));
  if (texto === null) return [];
  const pasos = laSeccionDeLosPasos(texto);
  const sirve = (t) => t && t.length <= 500 && !/[{<]/.test(t);
  if (pasos) {
    const enLinea = pasos.split('\n').map((l) => (enLimpio(l).match(ANTES_DE_EMPEZAR) || [])[1]).filter((t) => sirve(t && t.trim()));
    if (enLinea.length) return enLinea.map((t) => t.trim()).slice(0, 6);
  }
  // Su propia sección, si no es la de los pasos.
  const suya = texto.split(/^##\s+/m).slice(1).find((t) => TITULO_DE_ANTES.test(t.trim()) && t !== pasos);
  if (!suya) return [];
  const cuerpo = suya.split('\n').slice(1);
  const lista = cuerpo.map(unPunto).filter(Boolean).map((m) => enLimpio(m[1])).filter(sirve);
  if (lista.length) return lista.slice(0, 6);
  return cuerpo.join('\n').split(/\n\s*\n/).map((t) => enLimpio(enUnaLineaDeTexto(t))).filter((t) => sirve(t) && !t.startsWith('|')).slice(0, 3);
}

// De dónde salen los pasos: la página oficial que el asistente leyó y el día en
// que lo comprobó, en una línea «Fuente: <dirección> · comprobado el 15-10-2026».
// La dirección, solo si va por http o https; el día, si es una fecha de verdad.
// Null sin dirección.
const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
function laFecha(texto) {
  const t = String(texto || '');
  let anio;
  let mes;
  let dia;
  let m = t.match(/\b(\d{4})-(\d{1,2})-(\d{1,2})\b/);
  if (m) [anio, mes, dia] = [m[1], m[2], m[3]].map(Number);
  else if ((m = t.match(/\b(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})\b/))) [dia, mes, anio] = [m[1], m[2], m[3]].map(Number);
  else if ((m = t.match(/\b(\d{1,2})\s+de\s+([a-z]+)\s+(?:de\s+|del\s+)?(\d{4})\b/i))) {
    dia = Number(m[1]);
    mes = MESES.indexOf(m[2].toLowerCase().replace('setiembre', 'septiembre')) + 1;
    anio = Number(m[3]);
  }
  if (!anio || !mes || !dia || anio < 2000 || anio > 2100) return null;
  const fecha = new Date(Date.UTC(anio, mes - 1, dia));
  if (fecha.getUTCFullYear() !== anio || fecha.getUTCMonth() !== mes - 1 || fecha.getUTCDate() !== dia) return null;
  return `${anio}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
}

// Con paréntesis dentro, como las de la Wikipedia: `…/API_(informática)`. Uno de
// cierre que sobra al final es de la frase, no de la dirección.
const UNA_DIRECCION = /https?:\/\/[^\s<>"'«»[\]]{1,500}/;
const LAS_DIRECCIONES = new RegExp(UNA_DIRECCION.source, 'g');
function sinLoDeLaFrase(direccion) {
  let limpia = direccion.replace(/[.,;:]+$/, '');
  while (limpia.endsWith(')') && (limpia.match(/\)/g) || []).length > (limpia.match(/\(/g) || []).length) limpia = limpia.slice(0, -1).replace(/[.,;:]+$/, '');
  return limpia;
}
function deDondeSale(carpeta) {
  const texto = leerSiEsUnFichero(path.join(carpeta, 'README.md'));
  if (texto === null) return null;
  for (const linea of texto.split('\n')) {
    if (linea.length > 1000) continue;
    const resto = (enLimpio(linea).match(LA_FUENTE) || [])[1];
    if (!resto) continue;
    const direccion = (resto.match(UNA_DIRECCION) || [])[0];
    if (!direccion) continue;
    // La fecha, de lo que no es una dirección (una dirección puede llevar otra
    // fecha dentro), y primero de lo que va detrás de «comprobado».
    const sinDirecciones = resto.replace(LAS_DIRECCIONES, ' ');
    const trasComprobado = (sinDirecciones.match(/comprobad[oa]\b([\s\S]*)$/i) || [])[1];
    return { url: sinLoDeLaFrase(direccion), fecha: laFecha(trasComprobado) || laFecha(sinDirecciones) };
  }
  return null;
}

// Todo lo que la guía en PDF lee del README de una conexión. Null si no está.
function laGuia(proveedorId) {
  const carpeta = carpetaDe(proveedorId);
  if (!carpeta) return null;
  return { pasos: comoSeConecta(carpeta, 30), antes: antesDeEmpezar(carpeta), fuente: deDondeSale(carpeta) };
}

// Lo que el asistente dejó escrito para su informático (decisión 156), en una
// sección «## Para tu informático» del README: para qué es, qué acceso y con qué
// permisos, si basta con leer, la página y qué preguntarle. Tal cual, sin el
// título, hasta la sección siguiente. Vacío si no está o es la plantilla.
const PARA_EL_INFORMATICO = /^para\s+(?:tu|el|la|su)\s+(?:inform[aá]tic[oa]|t[eé]cnic[oa]|IT)\b|^for\s+(?:your\s+)?IT\b/i;
function paraTuInformatico(proveedorId) {
  const carpeta = carpetaDe(proveedorId);
  const texto = carpeta ? leerSiEsUnFichero(path.join(carpeta, 'README.md')) : null;
  if (texto === null) return '';
  const seccion = texto.split(/^##\s+/m).slice(1).find((t) => PARA_EL_INFORMATICO.test(t.trim()));
  if (!seccion) return '';
  const cuerpo = seccion.split('\n').slice(1).join('\n').trim();
  // Una sección que solo trae marcadores no es una sección.
  // Con tope: `<[^>]*>` era cuadrática con muchos `<` (revisión de seguridad de la 156).
  return cuerpo.replace(/<[^<>\n]{0,200}>|\{[^{}\n]{0,200}\}/g, '').replace(/[\s\-*|:.]/g, '').length >= 20 ? cuerpo : '';
}

// Dónde se consigue la clave, si la carpeta lo dice. CREDENTIALS.md trae la
// URL del panel del proveedor; .env.example, un "Generate at:".
function dondeSeConsigue(carpeta) {
  for (const [fichero, patron] of [
    ['CREDENTIALS.md', /^-?\s*URL:\s*(https?:\/\/\S+)/m],
    ['.env.example', /Generate at:\s*(https?:\/\/\S+)/],
  ]) {
    // Sin seguir enlaces, como el README (decisión 159).
    const url = ((leerSiEsUnFichero(path.join(carpeta, fichero)) || '').match(patron) || [])[1];
    if (url && !url.includes('...')) return url;
  }
  return null;
}

// ── Una conexión a medio hacer no es una conexión ────────────────────────
//
// El asistente crea una herramienta copiando `01-TOOLS/_TEMPLATE/`, y esa
// plantilla trae sus claves con marcadores dentro: `<TOOL>_API_KEY`,
// `<TOOL>_API_SECRET`. Rellenarlas es el paso siguiente, y entre un paso y el
// otro la barra se repinta —el vigía mira `01-TOOLS/**`— así que el alumno ve
// esa carpeta a medias.
//
// Y lo que veía era una conexión normal: «Sinhacer», con su casilla «Clave de
// acceso» esperando a que escribiera algo. Si escribía, la barra le contestaba
// **«Esa clave no tiene un nombre válido»**, porque `escribir` rechaza los
// marcadores con razón. Un callejón sin salida, en la pantalla donde muere la
// mayor parte del soporte del curso.
//
// Así que se reconoce y se dice. Es la regla de siempre de esta barra: decir
// lo que pasa en vez de enseñar un hueco con rótulo.
const ES_MARCADOR = (clave) => /[<{]/.test(clave);

// ── Una clave que está, pero en otro sitio ───────────────────────────────
//
// Jose, 21-09-2026, con una captura: sus claves vivían en un `.env.local` de
// la raíz, no en `01-TOOLS/<X>/.env`. La barra decía «faltan 2 claves» de una
// herramienta que funcionaba perfectamente, porque solo miraba su `.env`.
//
// No le falta nada: le falta orden, que es otra cosa y se arregla de otra
// manera. `sueltas.js` sabe dónde están y de quién son; aquí se le pregunta.
// Y también se mira el entorno del propio ordenador —lo que Jose llama «las
// globales»—: una clave exportada en el perfil del sistema funciona hoy y no
// viaja con la carpeta, así que se dice, no se cuenta como que falta.
//
// Con `soloLasQueSeMueven` no entran las del `.env` de la raíz de una aplicación:
// están en su sitio y la tarjeta no ofrece moverlas. Para decir dónde están sí cuentan: sin eso, con un `package.json` en la raíz, una
// herramienta cuyas claves viven en ese `.env` pasaba de «ya la tienes» a
// «todavía sin poner» (revisión de la 167).
function dondeMasEstan(proveedorId, nombres, { soloLasQueSeMueven = false } = {}) {
  if (!nombres.length) return new Map();
  const donde = new Map();
  try {
    const sueltas = require('./sueltas');
    // Las de dentro de una aplicación de una subcarpeta siguen sin contar como de
    // la herramienta (decisión 135); las de la raíz, si la carpeta entera es una
    // aplicación, sí se dicen (decisión 167).
    const sitios = soloLasQueSeMueven ? sueltas.buscar() : [
      ...sueltas.buscar(),
      ...sueltas.buscar({ conLasDeLasApps: true }).filter((s) => !s.donde.includes('/')),
    ];
    for (const sitio of sitios) {
      for (const nombre of sitio.nombres) {
        if (nombres.includes(nombre) && !donde.has(nombre)) donde.set(nombre, sueltas.enCristiano(sitio.donde));
      }
    }
    for (const nombre of sueltas.enElOrdenador(nombres)) {
      if (!donde.has(nombre)) donde.set(nombre, 'puesta en tu ordenador, fuera de esta carpeta');
    }
  } catch { /* sin inventario, se sigue como antes */ }
  return donde;
}

// Cuántos ficheros de acceso tiene puestos en su sitio (`keys/`). Se pregunta
// a `sueltas.js`, que es quien sabe reconocer uno.
function conFicheroDeAcceso(proveedorId) {
  try {
    return require('./sueltas').tieneSuFichero(proveedorId);
  } catch {
    return 0;
  }
}

function proveedores() {
  const base = proyecto.ruta(CARPETA);
  if (!base || !fs.existsSync(base)) return [];

  return fs.readdirSync(base, { withFileTypes: true })
    .filter((e) => e.isDirectory() && !e.name.startsWith('_') && !e.name.startsWith('.'))
    .map((e) => {
      const carpeta = path.join(base, e.name);
      const esperadas = leerEnv(path.join(carpeta, '.env.example'));
      const puestas = leerEnv(path.join(carpeta, '.env'));
      // Los marcadores no son claves que falten: son la plantilla sin rellenar.
      // Contarlos daría «faltan 3» en algo que todavía no pide nada.
      const deVerdad = [...esperadas.keys()].filter((k) => !ES_MARCADOR(k));
      const sinPoner = deVerdad.filter((k) => !puestas.get(k));
      const enOtroSitio = dondeMasEstan(e.name, sinPoner);
      return {
        id: e.name,
        etiqueta: etiquetaDeProveedor(e.name, carpeta),
        // Las que no están en ningún sitio. Las que están fuera se cuentan aparte.
        faltan: sinPoner.filter((k) => !enOtroSitio.has(k)).length,
        fueraDeSitio: enOtroSitio.size,
        // Hay credenciales que no son una línea: una cuenta de servicio, un
        // certificado. Viven en `keys/` y autentican igual, así que una
        // herramienta con eso puesto no está «sin conectar» aunque su `.env`
        // esté vacío (decisión 105).
        conFichero: conFicheroDeAcceso(e.name),
        // Qué clase de acceso pide, si el asistente lo dejó escrito (decisión 156).
        acceso: comoSeEntra(carpeta),
        pideFichero: pideElFichero(accesoDe(carpeta)),
        // Sigue siendo la plantilla: el asistente la creó y no la ha terminado.
        aMedioHacer: [...esperadas.keys()].some(ES_MARCADOR),
        tienePrueba: fs.readdirSync(carpeta).some((f) => f.startsWith('test_connection')),
        cositas: scripts(e.name).length,
      };
    })
    .map((p) => ({ ...p, esConexion: esUnaConexion(path.join(base, p.id), p) }))
    .sort((a, b) => a.etiqueta.localeCompare(b.etiqueta, 'es'));
}

// ── Qué carpeta de 01-TOOLS es una conexión (decisión 202) ─────────────────
//
// Jose: «la barra cuenta como conexión cualquier carpeta de 01-TOOLS… eso
// deberíamos arreglarlo». En 01-TOOLS también viven unas notas de seguridad o
// unos guiones sueltos, y contarlos daba «23 programas» donde había 17. Una
// conexión la monta connect-tool con sus claves (`.env.example`, `.env`), su
// `CREDENTIALS.md`, su fichero de acceso en `keys/` o su prueba: con una de esas
// piezas ya es una conexión, aunque esté a medias.
//
// Solo se filtra donde la barra dice «conexiones». Tapar claves, Resultados y lo
// que evita ofrecer otra vez algo que ya tiene carpeta siguen mirándolas todas.
const LO_QUE_LA_HACE_CONEXION = ['.env.example', '.env', 'CREDENTIALS.md'];

function esUnaConexion(carpeta, p) {
  if (p.conFichero > 0 || p.tienePrueba) return true;
  return LO_QUE_LA_HACE_CONEXION.some((f) => fs.existsSync(path.join(carpeta, f)));
}

function conectadas() {
  return proveedores().filter((p) => p.esConexion);
}

// Las claves de un proveedor: las que espera (.env.example) más las que ya
// tenga puestas (.env), sin enseñar nunca el valor entero.
function claves(proveedorId) {
  const carpeta = carpetaDe(proveedorId);
  if (!carpeta) return null;

  const esperadas = leerEnv(path.join(carpeta, '.env.example'));
  const puestas = leerEnv(path.join(carpeta, '.env'));
  const sacadaDe = dondeSeSacaCadaClave(carpeta);

  // Las claves con marcador no se enseñan: son la plantilla sin rellenar, y
  // `escribir` las rechaza, así que una casilla para ellas es una casilla que
  // no lleva a ninguna parte. Se dice que está a medio hacer y se acabó.
  const nombres = [...new Set([...esperadas.keys(), ...puestas.keys()])].filter((k) => !ES_MARCADOR(k));
  const enOtroSitio = dondeMasEstan(proveedorId, nombres.filter((k) => !puestas.get(k)));
  const deVerdad = accesoDe(carpeta);
  const acceso = deVerdad.clases;
  const pasos = comoSeConecta(carpeta);
  const conFichero = conFicheroDeAcceso(proveedorId);

  return {
    proveedor: {
      id: proveedorId,
      etiqueta: etiquetaDeProveedor(proveedorId, carpeta),
      ayuda: dondeSeConsigue(carpeta),
      pasos,
      // Dónde se saca la clave: ahí dice la guía que se pegue abajo, y ahí vuelve
      // si la clave no vale (decisión 167).
      pasoDeLaClave: elPasoDeLaClave(pasos, { acceso, pideFichero: pideElFichero(deVerdad), conFichero }),
      aMedioHacer: [...esperadas.keys()].some(ES_MARCADOR),
      conFichero,
      // La clase de acceso decide la pantalla (decisión 156). Vacío, la de siempre.
      acceso,
      // Si le hace falta su fichero, y no como una opción más.
      pideFichero: pideElFichero(deVerdad),
    },
    claves: nombres.map((clave) => ({
      clave,
      etiqueta: etiquetaDeClave(clave),
      // De dónde se saca esta clave en concreto, tal y como lo escribió el
      // asistente al investigar la herramienta.
      donde: sacadaDe.get(clave) || null,
      secreta: ES_SECRETA.test(clave.toUpperCase()),
      puesta: Boolean(puestas.get(clave)),
      // Está, pero en otro fichero o en el entorno del ordenador. Dicho en
      // cristiano por `sueltas.enCristiano`: «en la carpeta principal».
      fuera: enOtroSitio.get(clave) || null,
      pista: enmascarar(puestas.get(clave)),
      // Usuario, contraseña o una dirección que te dan; null, como siempre.
      forma: formaDeLaClave(clave, acceso),
    })),
  };
}

// Escribe en 01-TOOLS/<proveedor>/.env, creándolo desde el .env.example si
// hace falta y respetando comentarios y orden. Limpia por su cuenta lo que el
// alumno pegue de más: espacios, comillas y el salto del final.
//
// ── Lo que NO cabe aquí, y por qué se dice en vez de aplastarlo ──────────
//
// Un `.env` es una línea por clave. Pero hay credenciales muy corrientes que
// ocupan varias: una clave privada PEM, el JSON de una cuenta de servicio de
// Google. Esto las aceptaba, les quitaba los saltos, decía **«Guardado»** y
// dejaba una clave **rota** — un PEM sin sus saltos no lo acepta ninguna
// herramienta.
//
// Y el alumno no tenía forma de saberlo: la barra le había dicho que sí. Luego
// «Probar la conexión» fallaba y se ponía a revisar una clave que había pegado
// bien. Es exactamente el agujero de soporte que este fichero existe para
// tapar, y estaba aquí dentro.
//
// No se inventa una forma de meterlas: se dice que ahí no caben y se manda al
// asistente, que sabe dónde van. RSC ya lo tiene previsto — el `.gitignore` de
// cada herramienta ignora `keys/`, `*.p8`, `*.p12` y `*.json` justo para esto.
function escribir(proveedorId, clave, valorBruto) {
  const carpeta = carpetaDe(proveedorId);
  if (!carpeta) return { ok: false, mensaje: 'Esa conexión ya no está.' };
  if (!/^[A-Z][A-Z0-9_]*$/i.test(clave)) return { ok: false, mensaje: 'Esa clave no tiene un nombre válido.' };

  // El salto del final es de pegar y se quita. Uno en medio significa que esto
  // no es una clave de una línea, y aplastarlo la estropearía en silencio.
  const sinBordes = String(valorBruto).trim();
  if (/[\r\n]/.test(sinBordes)) {
    return {
      ok: false,
      mensaje: 'Esto ocupa varias líneas y aquí solo cabe una. Si lo aplastara te lo estropearía sin que te enteraras. Pídeselo al asistente: sabe dónde guardarlo.',
    };
  }

  const valor = sinBordes.replace(/^["']|["']$/g, '');
  const destino = path.join(carpeta, '.env');
  // Lo que se escribe tiene que llegar igual a la prueba, que hace
  // `set -a; source .env` (F3): con algo fuera de lo que bash lee tal cual, entre
  // comillas simples, con la comilla escapada. Sin nada raro, como estaba.
  const comoSeEscribe = /^[A-Za-z0-9_./:@+=-]*$/.test(valor) ? valor : `'${valor.replace(/'/g, "'\\''")}'`;
  const base = fs.existsSync(destino) ? destino : path.join(carpeta, '.env.example');

  // Leer y escribir pueden fallar —un `.env` que quedó de solo lectura, un
  // disco lleno, un antivirus que lo tiene cogido— y esto no lo miraba.
  // `guardarClave` llama sin red: la excepción subía y el alumno pulsaba
  // «Guardar» y **no pasaba nada**, ni confirmación ni error. El silencio más
  // caro posible, y justo en la pantalla de las credenciales.
  try {
    // Con finales de Unix: bash deja el `\r` de un fichero escrito en Windows
    // dentro de cada valor, y la prueba recibía otra clave (revisión de F6).
    const lineas = fs.existsSync(base) ? fs.readFileSync(base, 'utf8').split(/\r?\n/) : [];

    let encontrada = false;
    const nuevas = lineas.map((linea) => {
      if (linea.trim().startsWith(`${clave}=`)) {
        encontrada = true;
        return `${clave}=${comoSeEscribe}`;
      }
      return linea;
    });
    if (!encontrada) nuevas.push(`${clave}=${comoSeEscribe}`);

    fs.writeFileSync(destino, nuevas.join('\n').replace(/\n{3,}/g, '\n\n'));
  } catch (fallo) {
    return {
      ok: false,
      mensaje: fallo && ['EACCES', 'EPERM'].includes(fallo.code)
        ? 'No tengo permiso para guardar aquí. Pídeselo al asistente, que puede mirar por qué.'
        : 'No he podido guardarlo. Prueba otra vez, y si sigue igual pídeselo al asistente.',
    };
  }

  try { fs.chmodSync(destino, 0o600); } catch { /* Windows no lo admite; el 01-TOOLS/.gitignore ya lo protege de git */ }
  return { ok: true, mensaje: 'Guardado.' };
}

// ── Un fichero de acceso, a su sitio (decisión 156) ──────────────────────
//
// Una cuenta de servicio o un certificado no caben en un campo: son un fichero
// entero (decisión 105). Se sueltan encima de la barra, o se eligen, y van a
// `01-TOOLS/<HERRAMIENTA>/keys/`, que la plantilla deja fuera de las copias.
//
// Solo si `sueltas.js` lo reconoce como fichero de acceso: una factura soltada
// aquí por error no acaba entre las llaves. Si la conexión dice qué fichero
// busca (`keys/cuenta-de-servicio.json`, en su `.env.example`, su CREDENTIALS.md
// o su README), se llama así, que es donde mira su prueba. Y uno que ya estaba
// con ese nombre no se pierde: se queda al lado, con `.anterior-<fecha>` detrás.
const CABE_UN_FICHERO_DE_ACCESO = 1024 * 1024;
const NO_LO_GUARDO = 'No he podido guardarlo. Prueba otra vez, y si sigue igual pídeselo al asistente.';

// El nombre que busca su prueba. Primero lo que dice la prueba misma
// (`test_connection.*`), que es quien lo busca; si no, lo que dicen sus
// documentos. Devuelve el nombre, o null; y si hay más de uno, que no se sabe:
// eso se dice (revisión de corrección de la 156).
function elQueBusca(carpeta) {
  const nombresEn = (ficheros) => {
    const nombres = new Set();
    for (const fichero of ficheros) {
      const texto = leerSiEsUnFichero(path.join(carpeta, fichero)) || '';
      for (const m of texto.matchAll(/\bkeys[\\/]([A-Za-z0-9][A-Za-z0-9._-]{0,100})/g)) nombres.add(m[1].replace(/\.+$/, ''));
    }
    return [...nombres];
  };
  let pruebas = [];
  try {
    pruebas = fs.readdirSync(carpeta).filter((f) => /^test_connection\.(sh|py|js|mjs)$/.test(f));
  } catch { /* sin carpeta, sin prueba */ }
  for (const nombres of [nombresEn(pruebas), nombresEn(['.env.example', 'CREDENTIALS.md', 'README.md'])]) {
    if (nombres.length === 1) return { nombre: nombres[0], dudoso: false };
    if (nombres.length > 1) return { nombre: null, dudoso: true };
  }
  return { nombre: null, dudoso: false };
}

// Un `.json` entra solo si dice por dentro lo que es: por el nombre, un
// `credentials.json` con una factura dentro acababa entre las llaves (revisión de
// seguridad de la 156). Lo que sí se mira es esto, como en `sueltas.js`.
const UN_JSON_DE_ACCESO = /"(?:type"\s*:\s*"service_account|private_key"|client_secret"|refresh_token")/;
function loEs(nombre, bytes, queEs, ruta) {
  if (!queEs(nombre, ruta)) return false;
  if (!/\.json$/i.test(nombre)) return true;
  const texto = bytes.toString('utf8');
  try {
    JSON.parse(texto);
  } catch {
    return false;
  }
  return UN_JSON_DE_ACCESO.test(texto);
}

// ¿Se queda fuera de git? true, false, o null si aquí no hay git o no se sabe.
async function fueraDeGit(ruta) {
  const raiz = proyecto.raiz();
  if (!raiz) return null;
  const relativa = path.relative(raiz, ruta).split(path.sep).join('/');
  const { codigo } = await procesos.git('check-ignore', '-q', '--', relativa);
  if (codigo === 0) return true;
  return codigo === 1 ? false : null;
}

// El de antes, al lado y con la fecha: con un nombre fijo, la tercera vez se
// perdía el primero (revisión de seguridad de la 156).
function alLado(destino) {
  const fecha = new Date().toISOString().replace(/[-:]/g, '').replace(/\..*$/, '');
  let otro = `${destino}.anterior-${fecha}`;
  for (let n = 2; fs.existsSync(otro); n += 1) otro = `${destino}.anterior-${fecha}-${n}`;
  return otro;
}

async function ponerFicheroDeAcceso(proveedorId, ficheros) {
  const carpeta = carpetaDe(proveedorId);
  if (!carpeta) return { ok: false, mensaje: 'Esa conexión ya no está.' };
  const llegados = (Array.isArray(ficheros) ? ficheros : [])
    .filter((f) => f && typeof f.nombre === 'string' && typeof f.datos === 'string')
    .slice(0, 5);
  if (!llegados.length) return { ok: false, mensaje: 'No me ha llegado ningún fichero. Prueba con «Elegir el fichero».' };

  const llaves = path.join(carpeta, 'keys');
  const fuera = path.join(llaves, '.gitignore');
  try {
    fs.mkdirSync(llaves, { recursive: true });
    // Ni a través de un enlace: lo que se escribe tiene que quedarse en su carpeta.
    const datos = fs.lstatSync(llaves);
    if (datos.isSymbolicLink() || !datos.isDirectory()) return { ok: false, mensaje: NO_LO_GUARDO };
    // La plantilla deja `keys/` fuera de git con su `.gitignore`, pero una
    // herramienta hecha a mano puede no traerlo, y la pantalla dice «no sale de
    // este ordenador». Si no hay nada con ese nombre, ni un enlace colgando, se
    // pone: todo lo de aquí dentro, fuera. El que ya hubiera no se da por bueno:
    // se mira con git después de poner el fichero.
    let hay = true;
    try { fs.lstatSync(fuera); } catch { hay = false; }
    if (!hay) fs.writeFileSync(fuera, '# Los ficheros de acceso no entran en las copias (decisión 156).\n*\n', { flag: 'wx' });
  } catch {
    return { ok: false, mensaje: NO_LO_GUARDO };
  }

  const sueltasM = require('./sueltas');
  const busca = llegados.length === 1 ? elQueBusca(carpeta) : { nombre: null, dudoso: false };
  const esperado = busca.nombre;
  const puestos = [];
  let grande = false;
  let fallo = false;
  let enLugarDe = false;
  let entraEnGit = false;
  for (const fichero of llegados) {
    const suyo = path.basename(fichero.nombre.replace(/\\/g, '/')).trim();
    const bytes = Buffer.from(fichero.datos, 'base64');
    if (!suyo || suyo.startsWith('.') || !bytes.length) continue;
    if (bytes.length > CABE_UN_FICHERO_DE_ACCESO) { grande = true; continue; }
    const nombre = esperado && path.extname(esperado).toLowerCase() === path.extname(suyo).toLowerCase() ? esperado : suyo;
    // Se escribe primero aparte, con un nombre que no cuenta, para mirar qué es.
    const entrando = path.join(llaves, `.entrando-${process.pid}-${Date.now()}-${puestos.length}`);
    const destino = path.join(llaves, nombre);
    let elDeAntes = null;
    try {
      fs.writeFileSync(entrando, bytes, { mode: 0o600, flag: 'wx' });
      if (!loEs(suyo, bytes, sueltasM.queEs, entrando)) {
        fs.rmSync(entrando, { force: true });
        continue;
      }
      if (fs.existsSync(destino)) {
        if (fs.lstatSync(destino).isFile() && fs.readFileSync(destino).equals(bytes)) {
          fs.rmSync(entrando, { force: true });
          puestos.push(nombre);
          continue;
        }
        elDeAntes = alLado(destino);
        fs.renameSync(destino, elDeAntes);
      }
      fs.renameSync(entrando, destino);
      try { fs.chmodSync(destino, 0o600); } catch { /* Windows no lo admite */ }
    } catch {
      try { fs.rmSync(entrando, { force: true }); } catch { /* ya no está */ }
      fallo = true;
      continue;
    }

    // Y se mira con git que de verdad se queda fuera. Si no, se intenta una vez
    // añadiendo su nombre al `.gitignore` de `keys/` (si es un fichero de
    // verdad), y si sigue dentro, no se deja: se quita y se dice.
    if (await fueraDeGit(destino) === false) {
      try {
        if (fs.lstatSync(fuera).isFile()) fs.appendFileSync(fuera, `\n# La barra deja fuera de las copias este fichero de acceso (decisión 156).\n/${nombre}\n`);
      } catch { /* sin un .gitignore de verdad, no se puede */ }
      if (await fueraDeGit(destino) === false) {
        try {
          fs.rmSync(destino, { force: true });
          if (elDeAntes) fs.renameSync(elDeAntes, destino);
        } catch { /* lo que quede, lo dice el aviso */ }
        entraEnGit = true;
        continue;
      }
    }
    if (elDeAntes) enLugarDe = true;
    puestos.push(nombre);
  }

  const nombre = String(etiquetaDeProveedor(proveedorId, carpeta)).slice(0, 60);
  if (!puestos.length) {
    if (entraEnGit) {
      return {
        ok: false,
        mensaje: 'No lo he dejado: en esta carpeta entraría en tus copias de git. Pídeselo al asistente.',
        boton: {
          etiqueta: 'Pedírselo al asistente',
          accion: {
            tipo: 'pedir',
            prompt: `He intentado poner un fichero de acceso en la conexión con ${nombre} (01-TOOLS/${proveedorId}/keys/) y la barra no lo ha dejado: ahí entraría en las copias de git. Mira por qué esa carpeta no queda fuera de git (su .gitignore, o si ya estaba guardado), arréglalo sin borrar nada mío y explícamelo. Después vuelvo a ponerlo yo desde la barra. No abras ni me enseñes ningún fichero de acceso.`,
          },
        },
      };
    }
    if (fallo) return { ok: false, mensaje: NO_LO_GUARDO };
    if (grande) return { ok: false, mensaje: 'Eso pesa demasiado para ser un fichero de acceso.' };
    return {
      ok: false,
      mensaje: 'Eso no parece un fichero de acceso. Si lo es, pídeselo al asistente: sabe dónde va.',
      boton: {
        etiqueta: 'Pedírselo al asistente',
        accion: {
          tipo: 'pedir',
          prompt: `He intentado poner un fichero de acceso en la conexión con ${nombre} (01-TOOLS/${proveedorId}/) y la barra no lo reconoce. Pregúntame cuál es y dónde lo tengo, y ponlo en su sitio, en su carpeta keys, sin abrirlo ni enseñarme lo que lleva dentro.`,
        },
      },
    };
  }
  if (puestos.length > 1) return { ok: true, puestos, mensaje: `Puestos en su sitio los ${puestos.length}.` };
  const dicho = enLugarDe ? 'Puesto en su sitio, en lugar del de antes.' : 'Puesto en su sitio.';
  // Si sus documentos nombran más de un fichero, no se sabe cuál busca la prueba.
  return { ok: true, puestos, mensaje: busca.dudoso ? `${dicho} No sé con qué nombre lo busca su prueba: si no funciona, pídeselo al asistente.` : dicho };
}

// Cada carpeta trae su propia prueba. Se ejecuta la que haya, con el
// intérprete que le toque, y solo se traduce el resultado.
// El Python de este ordenador, si hay uno de verdad (F4). La convención de RSC
// para los guiones de una herramienta es Python, y se lanzaba `python3` o
// `python` a ciegas: sin él, un «No ha salido bien» que no dice qué falta, y en
// Windows `python` puede ser el atajo que abre la Tienda. Se pregunta por su
// versión antes, y se recuerda para cada PATH.
const pythonPorPath = new Map();

async function quePython() {
  const clave = process.env.PATH || '';
  if (pythonPorPath.has(clave)) return pythonPorPath.get(clave);
  const candidatos = entorno.ES_WINDOWS ? [['py', ['-3']], ['python', []], ['python3', []]] : [['python3', []], ['python', []]];
  let elegido = null;
  for (const [programa, antes] of candidatos) {
    const r = await procesos.ejecutar(programa, [...antes, '--version'], { cwd: os.tmpdir(), tiempoMaximo: 10000 });
    if (r.codigo === 0 && /Python 3\./.test(`${r.salida}${r.error}`)) {
      elegido = { programa, antes };
      break;
    }
  }
  pythonPorPath.set(clave, elegido);
  return elegido;
}

// Cada script trae su intérprete. Los .sh de RSC piden bash —usan BASH_SOURCE
// y pipefail—, no sh.
async function lanzar(carpeta, fichero) {
  const ruta = path.join(carpeta, fichero);
  const opciones = { cwd: carpeta, tiempoMaximo: 45000 };
  if (fichero.endsWith('.sh')) return procesos.bash(ruta, opciones);
  if (fichero.endsWith('.py')) {
    const python = await quePython();
    if (!python) return { codigo: -1, salida: '', error: '', sinPython: true };
    return procesos.ejecutar(python.programa, [...python.antes, ruta], opciones);
  }
  return procesos.node([ruta], opciones);
}

// Lo que se dice cuando un guion necesita Python y no está, con el botón que se
// lo pide al asistente: que lo rehaga en bash o en node, que sí están.
const sinPython = (proveedorId, fichero, queEs) => ({
  ok: false,
  mensaje: `${queEs} necesita Python, y en este ordenador no está.`,
  boton: {
    etiqueta: 'Pedírselo al asistente',
    accion: {
      tipo: 'pedir',
      prompt: `La consulta 01-TOOLS/${proveedorId}/${fichero} necesita Python, y en este ordenador no está. Rehazla para que funcione con lo que ya hay aquí, como dice la habilidad, y no me pidas que instale nada.`,
    },
  },
});

// ── Por qué no conecta, y no siempre es la clave ─────────────────────────
//
// Esto contestaba lo mismo a todo lo que no fuera un `.env` a medias: «revisa
// que la clave esté bien pegada». Probando fallos de verdad se vio que dos de
// los tres casos corrientes son otra cosa —no hay internet, o el script de la
// herramienta está roto— y en los dos el alumno se pone a revisar una clave
// que está perfecta. Puede tirarse la tarde con eso y acabar llamando al tutor.
//
// La regla de la casa es que un error diga qué hacer. Decirlo mal es peor que
// no decirlo: manda a mirar donde no es.
//
// Se mira en el orden en que importa, y lo que no se reconoce no culpa a nadie.
const ESTA_ROTA = [/traceback|syntaxerror|modulenotfounderror|command not found|no such file or directory|cannot find module|referenceerror/i,
  'La prueba de esta conexión está rota, y eso no es cosa tuya. Pídeselo al asistente.'];
// Una clave que no vale muchas veces es una que caducó (decisión 149): se dice, y
// si se sabe la fecha, `extension.js` la pone.
const NO_VALE = [/\b(401|403)\b|unauthorized|forbidden|invalid.{0,15}(key|token|credential)|authentication failed|bad credentials/i,
  'La clave no vale: puede que haya caducado o que no esté entera. Sácala otra vez donde te la dieron y pégala entera.'];
const PORQUE_FALLA = [
  [/getaddrinfo|could not resolve|name or service not known|enotfound|network is unreachable|no route to host|econnrefused|connection refused/i,
    'No he podido salir a internet. Mira que tengas conexión y vuelve a probar.'],
  NO_VALE,
  [/\b(429)\b|rate limit|too many requests/i,
    'La herramienta dice que le has pedido demasiadas cosas seguidas. Espera un rato y prueba otra vez.'],
  ESTA_ROTA,
];

// ── Conecta, y la clave puede escribir ──────────────────────────────────
//
// `connect-tool` (RSC 3) empieza toda conexión en solo lectura, y su prueba no
// solo lee: demuestra que escribir falla. Si la clave puede escribir, termina con
// `FAIL — this user can write`, y aquí se contestaba «No conecta, y no sé decirte
// por qué», cuando sí conecta (punto 7 de la decisión 142, en la clase del 13-10).
// No es un fallo: es más permiso del que se pidió, y quedárselo o no lo decide su
// negocio. Así que conecta (`ok`), y `extension.js` pregunta una vez.
//
// Leerlo de más es peor que no leerlo: un fallo de verdad pasaría por «conecta» y,
// con un «Dejarla así», por conectada (revisión de seguridad y de corrección). Así
// que cuenta solo una línea que empieza por FAIL y **afirma** que puede escribir,
// sin negarlo en la misma línea, y nunca si la salida dice que la clave no vale. Lo
// que no case sigue siendo «no sé decirte por qué», que no engaña.
const AFIRMA_QUE_ESCRIBE = /\b(?:this|the)\s+(?:user|key|token|account|role)\s+can\s+write\b|\b(?:has|holds)\s+(?:a\s+)?(?:write|admin)\s+(?:access|permissions?|scopes?|rights)\b|\bwrites?\s+(?:was|were|is|are)\s+(?:allowed|accepted|granted)\b|\bwrites?\s+succeeded\b|\bwrites?\s+(?:was\s+|were\s+|are\s+|is\s+)?not\s+refused\b|\bwrite\s+permissions?\s+(?:was\s+|were\s+|is\s+|are\s+)?granted\b|\bpuede\s+escribir\b|\btiene\s+permisos?\s+de\s+escritura\b/i;
const LO_NIEGA = /\b(?:cannot|can't|can\s+not|lacks?|missing|without|invalid|could\s*n[o']t|unable|not\s+(?:verify|confirm|check|sure))\b|\bno\s+(?:puede|se\s+pudo|tiene)\b|\b(?:sin|falta|faltan)\b/i;
function diceQuePuedeEscribir(salida) {
  if (NO_VALE[0].test(salida)) return false;
  return salida.split(/\r?\n/).some((linea) => {
    const fallo = linea.match(/^\s*FAIL\b(.*)$/i);
    return Boolean(fallo) && AFIRMA_QUE_ESCRIBE.test(fallo[1]) && !LO_NIEGA.test(fallo[1]);
  });
}

// Una clave escrita sin comillas con algo que bash no lee tal cual: la prueba
// hace `source .env`, y con un `;`, un espacio o un `$` fuera de comillas se
// corta o se ejecuta. La barra ya las guarda bien (F3); las de antes, o escritas
// a mano, se dicen, en vez de culpar al guion.
function hayUnaClaveQueSeLeeMal(carpeta) {
  let texto = '';
  try {
    texto = fs.readFileSync(path.join(carpeta, '.env'), 'utf8');
  } catch {
    return false;
  }
  return texto.split('\n').some((linea) => {
    // Un final de Windows: bash deja el `\r` dentro del valor (revisión de F6).
    if (linea.endsWith('\r') && linea.includes('=') && !linea.trim().startsWith('#')) return true;
    const limpia = linea.trim();
    if (!limpia || limpia.startsWith('#') || !limpia.includes('=')) return false;
    const crudo = limpia.slice(limpia.indexOf('=') + 1).trim();
    if (!crudo || /^["']/.test(crudo)) return false;
    return /[\s;&|<>()$`\\'"]/.test(crudo.replace(/\s+#.*$/, ''));
  });
}

async function probar(proveedorId) {
  const carpeta = carpetaDe(proveedorId);
  if (!carpeta) return { ok: false, mensaje: 'Esa conexión ya no está.' };

  const prueba = fs.readdirSync(carpeta).find((f) => /^test_connection\.(sh|py|js|mjs)$/.test(f));
  if (!prueba) return { ok: false, mensaje: 'Esta conexión no trae forma de comprobarse. Pregúntaselo al asistente.' };

  const resultado = await lanzar(carpeta, prueba);
  if (resultado.sinPython) return sinPython(proveedorId, prueba, 'Esta prueba');
  const error = `${resultado.error || ''}\n${resultado.salida || ''}`;

  if (resultado.codigo === 0) return { ok: true, mensaje: 'Conectado. Funciona.' };
  if (diceQuePuedeEscribir(error)) {
    // El nombre sale de la primera línea del README: tapado como en su pantalla,
    // que va en el aviso y en lo que se le pide al asistente (decisión 167).
    const nombre = String(require('./informatico').sinClaves(etiquetaDeProveedor(proveedorId, carpeta))).slice(0, 60);
    return { ok: true, puedeEscribir: true, mensaje: `Conecta, pero esta clave puede cambiar y borrar cosas en ${nombre}, no solo mirarlas.` };
  }

  // Si la clave existe pero en otro sitio, decir «falta» manda a rellenar algo
  // que esa persona ya tiene. Se dice lo que pasa de verdad (decisión 104).
  const fuera = [...dondeMasEstan(proveedorId, [...leerEnv(path.join(carpeta, '.env.example')).keys()], { soloLasQueSeMueven: true }).values()];
  if (fuera.length && /missing .*\.env|not set/i.test(error)) {
    return { ok: false, mensaje: `Tus claves de esta conexión están ${fuera[0]}, y la prueba las busca aquí. Pulsa "Que las ordene" y vuelve a probar.` };
  }
  if (/missing .*\.env/i.test(error)) return { ok: false, mensaje: 'Todavía no has puesto ninguna clave para esta conexión.' };
  if (/not set/i.test(error)) return { ok: false, mensaje: 'Falta alguna clave por rellenar.' };
  // Lo paró el reloj: `procesos.js` lo dice con estas palabras.
  if (/tardado demasiado/i.test(error)) return { ok: false, mensaje: 'La herramienta no contesta. Prueba dentro de un rato.', pasajero: true };

  const porque = PORQUE_FALLA.find(([senal]) => senal.test(error));
  // «Está rota», «no vale» o no se sabe, solo si sus claves se leen bien: si no,
  // lo que falla es una clave que bash lee de otra forma.
  if ((porque === ESTA_ROTA || porque === NO_VALE || !porque) && hayUnaClaveQueSeLeeMal(carpeta)) {
    return { ok: false, mensaje: 'Una clave de esta conexión tiene caracteres que la prueba lee mal. Pégala otra vez y guárdala: ahora la guardo bien.' };
  }
  // Sin internet no dice nada de la conexión: es pasajero, y no se recuerda (decisión 146).
  if (porque) return { ok: false, mensaje: porque[1], pasajero: porque === PORQUE_FALLA[0], ...(porque === NO_VALE ? { noVale: true } : {}) };

  // Y si no se reconoce, no se señala a la clave: se dice lo que se sabe.
  return { ok: false, mensaje: 'No conecta, y no sé decirte por qué. Pídeselo al asistente, que puede mirar el detalle.' };
}

// Lo que se puede hacer de un vistazo, sin abrir conversación: los scripts de
// cada herramienta que **solo miran**. Ya se ejecutaban así desde el principio
// (decisión 8), pero estaban enterrados en Mis conexiones → la herramienta;
// esto los saca a la pantalla principal, agrupados por herramienta.
//
// Solo salen los que solo miran. Los que piden datos o cambian algo siguen
// pasando por el asistente, que pregunta lo que falte y pide permiso — esa
// regla no se toca, que es la que hace que pulsar sea seguro.
//
// En un arnés sin herramientas, o con herramientas sin scripts, esto devuelve
// una lista vacía y la pantalla se queda como estaba. Como todo lo demás: sale
// de leer la carpeta, no de estar escrito en el código.
function loQueSePuedeMirar() {
  return proveedores()
    .map((p) => ({
      id: p.id,
      etiqueta: p.etiqueta,
      scripts: scripts(p.id)
        .filter((s) => !s.pideDatos)
        .map((s) => ({
          fichero: s.fichero,
          // Para el botón, el nombre del fichero en cristiano: la columna del
          // README es una frase entera —"Lo facturado y lo gastado este mes,
          // lo pendiente de cobro…"— y en una barra estrecha no cabe. Esa
          // frase se queda debajo, de pista.
          etiqueta: humanizar(s.fichero.replace(EJECUTABLES, '')),
          queHace: s.etiqueta,
        })),
    }))
    .filter((p) => p.scripts.length);
}

// ------------------------------------------------------ las cositas

// Verbos que solo miran. Se ejecutan directos porque no pueden romper nada, y
// porque esperar a que el asistente te lea una lista es justo la fricción que
// sobra. Se admiten en español y en inglés: la tabla la escribe el asistente,
// pero la plantilla de RSC viene en inglés.
const SOLO_MIRAN = /^(listar|ver|consultar|comprobar|mostrar|leer|test|list|show|check|get)[_-]/i;
const EJECUTABLES = /\.(sh|py|js|mjs)$/;

// El README de cada herramienta trae una tabla de scripts. No se busca por el
// título de la sección —nuestros raíles hacen que Claude la escriba en
// español— sino por las filas: primera celda con un nombre de fichero entre
// comillas invertidas que además existe en la carpeta.
function scripts(proveedorId) {
  const carpeta = carpetaDe(proveedorId);
  if (!carpeta) return [];

  let readme;
  try {
    readme = fs.readFileSync(path.join(carpeta, 'README.md'), 'utf8');
  } catch {
    return [];
  }
  const hay = new Set(fs.readdirSync(carpeta));

  const encontrados = [];
  for (const linea of readme.split('\n')) {
    const fila = linea.match(/^\|\s*`([^`]+)`\s*\|([^|]*)\|([^|]*)\|/);
    if (!fila) continue;

    const fichero = fila[1].trim();
    // Las plantillas de RSC traen filas de ejemplo con marcadores.
    if (!EJECUTABLES.test(fichero) || /[{<]/.test(fichero) || !hay.has(fichero)) continue;
    if (fichero.startsWith('test_connection')) continue; // ese ya es "Probar la conexión"

    const queHace = fila[2].replace(/`/g, '').trim();
    const ejemplo = fila[3].replace(/`/g, '').trim();

    encontrados.push({
      fichero,
      // Sin descripción usable en el README, el nombre del fichero ya dice bastante.
      etiqueta: queHace && !/[{<]/.test(queHace) ? queHace : humanizar(fichero.replace(EJECUTABLES, '')),
      // Pide datos si el ejemplo lleva marcadores de argumento, o si el verbo
      // no es de los que solo miran.
      pideDatos: /[<{[]/.test(ejemplo) || !SOLO_MIRAN.test(fichero),
    });
  }
  return encontrados;
}

// ── Tapar las claves en lo que se enseña (F2) ────────────────────────────
//
// Lo que imprime un guion se pinta tal cual, y lo que la barra se apunta acaba
// en el informe de «Algo va mal». Un guion que enseña la clave con la que
// conecta la dejaba entera en los dos sitios. Se tapan los valores de las claves
// de la carpeta —el `.env` de cada herramienta y los sueltos que ve el
// inventario— con sus cuatro últimos caracteres, como en el resto de la barra
// (C-18). Solo los de seis o más: taparle a alguien un «test» o un «true» de su
// salida no protege nada y la deja ilegible.
const LARGO_DE_UNA_CLAVE = 6;

// Con `soloSecretas`, de los `.env` solo las claves que por su nombre son
// secretas: el mensaje para el informático tapaba también `HOLDED_BASE_URL` y
// `HOLDED_ENV=production`, y perdía la página adonde ir (revisión de corrección
// de la 156). Lo que tapa lo que se enseña aquí sigue tapándolo todo.
const NOMBRE_SECRETO = /(KEY|SECRET|TOKEN|PASSWORD|PASSWD|PASS|PIN|CREDENTIAL|AUTH|PRIVATE|WEBHOOK|HOOK|SIGNING)/i;
function valoresDeClaves({ soloSecretas = false } = {}) {
  const valores = new Set();
  const deAqui = (fichero) => {
    for (const [nombre, valor] of leerEnv(fichero)) {
      if (soloSecretas && !NOMBRE_SECRETO.test(nombre)) continue;
      if (typeof valor === 'string' && valor.length >= LARGO_DE_UNA_CLAVE) valores.add(valor);
    }
  };
  for (const { id } of proveedores()) {
    const carpeta = carpetaDe(id);
    if (carpeta) deAqui(path.join(carpeta, '.env'));
  }
  // Los de una aplicación también: están en su sitio, pero son claves igual.
  let sueltas = { claves: [], ficheros: [] };
  try {
    sueltas = require('./sueltas').paraProteger();
  } catch { /* sin inventario, con las de las herramientas basta */ }
  for (const sitio of sueltas.claves) deAqui(proyecto.ruta(sitio.donde));

  // Y los ficheros de acceso (revisión de F6): una cuenta de servicio o un
  // certificado, en el `keys/` de su herramienta o sueltos. De cada uno, los
  // campos que son secretos, y cada línea del cuerpo de una clave privada, que
  // salen igual la imprima un `cat` del JSON (con `\n`) o en claro.
  const ficheros = [];
  for (const { id } of proveedores()) {
    const llaves = carpetaDe(id) && path.join(carpetaDe(id), 'keys');
    try {
      for (const nombre of fs.readdirSync(llaves)) ficheros.push(path.join(llaves, nombre));
    } catch { /* sin keys/ */ }
  }
  for (const suelto of sueltas.ficheros) ficheros.push(proyecto.ruta(suelto.donde));
  for (const fichero of ficheros) {
    for (const valor of secretosDeUnFichero(fichero)) if (valor.length >= LARGO_DE_UNA_CLAVE) valores.add(valor);
  }
  // Las largas primero: una clave puede llevar dentro otra más corta.
  return [...valores].sort((a, b) => b.length - a.length);
}

const CAMPOS_SECRETOS = /^(private_key|private_key_id|client_secret|refresh_token|access_token|token|password|api_key|secret)$/i;

function cuerpoDeUnaClave(texto) {
  const lineas = [];
  for (const bloque of String(texto).matchAll(/-----BEGIN [^-]+-----([\s\S]*?)-----END [^-]+-----/g)) {
    for (const linea of bloque[1].split(/\r?\n|\\n/)) {
      const limpia = linea.trim();
      if (limpia.length >= 16) lineas.push(limpia);
    }
  }
  return lineas;
}

// Los que no son JSON ni PEM (decisión 170): la clave de un `.ppk` de PuTTY, la
// contraseña de un `.netrc`, de un `.pgpass`, de un `.htpasswd` o de un
// `.git-credentials`, y las claves de `.aws/credentials`. Solo valores; el nombre
// del fichero no sale de aquí.
function secretosDeTexto(texto, nombre) {
  const valores = [];
  for (const m of String(texto).matchAll(/Private-Lines:\s*\d+\s*\n([\s\S]*?)(?:\nPrivate-MAC|$)/g)) {
    for (const linea of m[1].split(/\r?\n/)) if (linea.trim().length >= 16) valores.push(linea.trim());
  }
  // Con comillas, entera (`password "ab cd"`); sin ellas, hasta el espacio.
  for (const m of String(texto).matchAll(/\bpassword\s+(?:"([^"]*)"|(\S+))/g)) valores.push(m[1] ?? m[2]);
  // Usuario y contraseña acotados: sin tope, un fichero de 60 KB de `http://a:` seguidos costaba segundos.
  for (const m of String(texto).matchAll(/\b[a-z][a-z0-9+.-]{1,20}:\/\/[^:/\s@]{1,64}:([^@\s]{1,256})@/gi)) valores.push(m[1]);
  for (const m of String(texto).matchAll(/\baws_(?:secret_access_key|session_token)\s*=\s*(\S+)/gi)) valores.push(m[1]);
  if (/^\.(pgpass|htpasswd)$/i.test(nombre)) {
    for (const linea of String(texto).split(/\r?\n/)) {
      const resto = nombre.toLowerCase() === '.pgpass' ? linea.split(':').slice(4).join(':') : linea.split(':').slice(1).join(':');
      if (resto.trim()) valores.push(resto.trim());
    }
  }
  return valores;
}

function secretosDeUnFichero(fichero) {
  let texto;
  try {
    if (fs.statSync(fichero).size > 64 * 1024) return [];
    texto = fs.readFileSync(fichero, 'utf8');
  } catch {
    return [];
  }
  const secretos = [...cuerpoDeUnaClave(texto), ...secretosDeTexto(texto, path.basename(fichero))];
  try {
    const datos = JSON.parse(texto);
    const recorrer = (cosa) => {
      if (!cosa || typeof cosa !== 'object') return;
      for (const [clave, valor] of Object.entries(cosa)) {
        if (typeof valor === 'string' && CAMPOS_SECRETOS.test(clave)) {
          secretos.push(valor, ...cuerpoDeUnaClave(valor));
        } else if (valor && typeof valor === 'object') recorrer(valor);
      }
    };
    recorrer(datos);
  } catch { /* no es JSON: con el cuerpo de la clave basta */ }
  return secretos;
}

function taparClaves(texto, valores = valoresDeClaves()) {
  let tapado = String(texto == null ? '' : texto);
  for (const valor of valores) tapado = tapado.split(valor).join(enmascarar(valor));
  return tapado;
}

// Ejecuta uno de los que solo miran y devuelve su salida, recortada. Los que
// piden datos o tocan cosas no pasan por aquí: los pide el asistente, que
// pregunta lo que falte y pide permiso antes de cambiar nada.
async function ejecutar(proveedorId, fichero) {
  const carpeta = carpetaDe(proveedorId);
  if (!carpeta) return { ok: false, mensaje: 'Esa conexión ya no está.' };

  const permitido = scripts(proveedorId).find((s) => s.fichero === fichero && !s.pideDatos);
  if (!permitido) return { ok: false, mensaje: 'Esto se lo tengo que pedir al asistente.' };

  const { codigo, salida, error, sinPython: faltaPython } = await lanzar(carpeta, fichero);
  if (faltaPython) return sinPython(proveedorId, fichero, 'Esta consulta');
  if (codigo !== 0) {
    if (/missing .*\.env/i.test(error)) return { ok: false, mensaje: 'Primero pon las claves de esta conexión.' };
    if (/not set/i.test(error)) return { ok: false, mensaje: 'Falta alguna clave por rellenar.' };
    return { ok: false, mensaje: 'No ha salido bien. Prueba a comprobar la conexión.' };
  }

  const texto = taparClaves(salida.trim());
  const lineas = texto.split('\n');
  return {
    ok: true,
    titulo: permitido.etiqueta,
    texto: lineas.length > 40 ? `${lineas.slice(0, 40).join('\n')}\n…` : texto,
    mensaje: texto ? null : 'Hecho, pero no ha devuelto nada.',
  };
}

// La huella de sus claves (decisión 146): si cambian, lo que dijo la última
// prueba ya no vale. Se hace del fichero entero, sin guardar ni enseñar nada. Y de
// los ficheros de acceso de `keys/` (decisión 105): con la clave en un fichero, la
// huella era la de un `.env` vacío y no cambiaba nunca, así que un «Dejarla así»
// valía también para la clave siguiente (revisión del punto 7 de la 142).
function huella(proveedorId) {
  const carpeta = carpetaDe(proveedorId);
  if (!carpeta) return null;
  const suma = require('node:crypto').createHash('sha256');
  // Sin seguir enlaces ni leer lo que no acaba: desde la decisión 149 la huella se
  // calcula cada minuto, y un `.env` que fuera un enlace a /dev/zero colgaba el
  // editor (revisión de seguridad, reproducido).
  try {
    const env = path.join(carpeta, '.env');
    const datos = fs.lstatSync(env);
    if (datos.isFile() && datos.size <= 1024 * 1024) suma.update(fs.readFileSync(env, 'utf8'));
  } catch { /* sin claves todavía */ }
  try {
    const llaves = path.join(carpeta, 'keys');
    for (const nombre of fs.readdirSync(llaves).filter((n) => !n.startsWith('.')).sort()) {
      const ruta = path.join(llaves, nombre);
      const datos = fs.lstatSync(ruta);
      if (!datos.isFile() || datos.size > 1024 * 1024) continue;
      suma.update(`\0${nombre}\0`).update(fs.readFileSync(ruta));
    }
  } catch { /* sin ficheros de acceso */ }
  return suma.digest('hex').slice(0, 16);
}

const tienePrueba = (proveedorId) => {
  const carpeta = carpetaDe(proveedorId);
  try {
    return Boolean(carpeta) && fs.readdirSync(carpeta).some((f) => /^test_connection\.(sh|py|js|mjs)$/.test(f));
  } catch {
    return false;
  }
};

module.exports = { huella, tienePrueba, proveedores, conectadas, claves, escribir, probar, scripts, loQueSePuedeMirar, ejecutar, etiquetaDeClave, enmascarar, leerEnv, taparClaves, valoresDeClaves, quePython };
// Decisión 156: la clase de acceso, lo que pedirle a su informático y el fichero de acceso.
Object.assign(module.exports, { comoSeEntra, clasesQueNombra, leerLasClases, paraTuInformatico, ponerFicheroDeAcceso, elQueBusca, NOMBRE_SECRETO, CABE_UN_FICHERO_DE_ACCESO });
// Decisión 159: lo que lee la guía en PDF.
Object.assign(module.exports, { laGuia, laFecha });
// Decisión 167: el paso donde se saca la clave, y los nombres de los programas que la barra conoce.
Object.assign(module.exports, { elPasoDeLaClave, PROVEEDORES });
