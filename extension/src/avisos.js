// Lo que falla, lo que no se entiende y lo que se echa en falta, para quien hace
// la barra.
//
// ── Por qué existe ───────────────────────────────────────────────────────
//
// Jose, 28-09-2026: *«alguna forma de detectar cuando la extensión no va bien o
// cuando el alumno no se aclara bien con ella […] y se envíe una issue al repo
// para que yo pueda revisarla y aprobarla»*. «Algo va mal» deja un informe en
// el ordenador del alumno y un código para el tutor, y a Jose no le llegaba
// nada. Lo que no se entendía y lo que se echaba en falta no lo recogía nadie.
//
// Los avisos entran por tres sitios y salen por uno:
//
//   · el alumno, con «Contárselo a Executive Lab» (en Ayuda y en «Algo va mal»);
//   · su asistente, que los deja escritos en `02-DOCS/raw/avisos/` porque se lo
//     dicen los raíles (`siempre.md`, regla 8, y `SKILL.md`);
//   · la barra, cuando un botón revienta por dentro (`apuntarUnFallo`).
//
// Y salen como una incidencia en el GitHub de la barra, con la sesión que la
// barra ya tiene para «Subir a GitHub»: `repo` basta para abrirla en un sitio
// público, así que no se le pide nada nuevo a nadie.
//
// ── Con permiso, siempre ─────────────────────────────────────────────────
//
// Ese sitio es público, y la incidencia sale con la cuenta del alumno: su
// nombre de GitHub queda a la vista de cualquiera. Mandarla sin preguntar sería
// publicar en su nombre. Así que preparar un aviso no pide permiso —se queda en
// su ordenador— y mandarlo sí: la barra se lo enseña entero, se puede cambiar, y
// solo sale con «Mandarlo». Si dice que no, va a `descartados/` y el mismo no
// se vuelve a proponer (decisión 131).
//
// Y antes de salir se limpia (`limpiar`): claves, carpetas del ordenador, el
// nombre de la empresa y el de la carpeta, correos. Lo que se enseña en la
// pantalla es ya lo limpio, que es lo que se manda.

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const proyecto = require('./proyecto');
const frontmatter = require('./frontmatter');

// A dónde van. Es el mismo sitio del que la barra mira si hay versión nueva.
const { REPO, esNuestro } = require('./sitio');
const CARPETA = ['02-DOCS', 'raw', 'avisos'];
const MANDADOS = 'mandados';
const DESCARTADOS = 'descartados';

// La marca que lee `.github/workflows/avisos.yml` para ponerles etiquetas.
// Cambiarla aquí sin cambiarla allí deja los avisos sin etiquetar, y hay una
// prueba que lo mira.
const MARCA = 'executive-lab-aviso';

const TIPOS = {
  falla: {
    etiqueta: 'Algo no funciona como debería',
    icono: '🐛',
    ejemplo: 'Por ejemplo: «Pulso Guardar en git y no pasa nada», o «el botón de las facturas me escribe algo que no tiene sentido».',
  },
  'no-se-entiende': {
    etiqueta: 'Hay algo que no entiendo',
    icono: '❓',
    ejemplo: 'Por ejemplo: «No sé para qué sirve Qué falta por montar», o «no encuentro dónde se ponen las claves».',
  },
  mejora: {
    etiqueta: 'Se me ocurre una mejora',
    icono: '💡',
    ejemplo: 'Por ejemplo: «Me vendría bien ver aquí lo último que le pedí al asistente».',
  },
};
const ORIGENES = ['alumno', 'asistente', 'barra'];

// Lo que se dejó de lado con «Ahora no» vuelve a salir pasada una semana. Sigue
// en Ayuda mientras tanto: apartarlo no es borrarlo.
const APARTADO_DURANTE = 7 * 24 * 60 * 60 * 1000;

// Lo que la barra apunta por dentro va debajo de esta línea, y el asistente no
// la escribe: así lo que se enseña en la caja es solo lo que cuenta la persona.
const DEBAJO = '## Lo que apuntó la barra';

// ── Dónde ────────────────────────────────────────────────────────────────
//
// Como el informe de «Algo va mal»: con arnés, dentro de él; sin arnés —justo
// cuando montar ha fallado, que es cuando más hace falta contarlo— en la
// carpeta de la extensión, fuera del proyecto. Nunca se crea `02-DOCS/` para
// esto: eso fabricaría media pieza del suelo que el aviso está contando.
let aparte = null;
const dondeSinArnes = (carpeta) => { aparte = carpeta || null; };

function carpeta() {
  if (proyecto.sueloDelArnes().conocimiento) return proyecto.ruta(...CARPETA);
  return aparte ? path.join(aparte, 'avisos') : null;
}

// ── Leer y escribir ──────────────────────────────────────────────────────

const unaLinea = (valor) => String(valor == null ? '' : valor).replace(/\s+/g, ' ').trim();

function recortar(texto, cuanto) {
  const t = String(texto || '');
  return t.length > cuanto ? `${t.slice(0, cuanto - 1).trimEnd()}…` : t;
}

// El título, si no lo trae: la primera frase de lo que cuenta.
function tituloDe(texto) {
  const primera = unaLinea(String(texto || '').split(/(?<=[.!?])\s|\n/)[0]);
  return recortar(primera, 80);
}

function leer(fichero) {
  let bruto;
  try {
    // Un aviso son unas líneas. Uno de un mega no lo ha escrito nadie a mano.
    if (fs.statSync(fichero).size > 64 * 1024) return null;
    bruto = fs.readFileSync(fichero, 'utf8');
  } catch {
    return null;
  }
  const campos = frontmatter.analizar(bruto);
  const cuerpo = bruto.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/, '');
  const origen = ORIGENES.includes(campos.origen) ? campos.origen : 'asistente';
  // La parte de la barra solo la escribe la barra, y como una línea sola. Lo
  // que escribe el asistente se enseña entero aunque cite esa cabecera: si no,
  // lo que siguiera se iría a «Qué más va con esto» sin que nadie lo viera.
  const separador = cuerpo.match(new RegExp(`^${DEBAJO}[ \\t]*\\r?$`, 'm'));
  const corte = origen !== 'asistente' && separador ? separador.index : -1;
  const texto = (corte >= 0 ? cuerpo.slice(0, corte) : cuerpo).trim();
  const detalle = corte >= 0 ? cuerpo.slice(corte + separador[0].length).trim() : '';

  // El título, de su línea tal cual: el lector de cabeceras quita una comilla
  // de cada punta aunque no se cierre, y lee como lista lo que va entre
  // corchetes, y «No va "Guardar"» salía «No va "Guardar» (revisión).
  const deSuLinea = (bruto.match(/^---\r?\n[\s\S]*?^titulo:[ \t]*(.*?)[ \t]*\r?$/m) || [])[1];
  const titulo = deSuLinea !== undefined ? deSuLinea.replace(/^(["'])(.*)\1$/, '$2') : unaLinea(campos.titulo);

  return {
    fichero,
    nombre: path.basename(fichero),
    tipo: TIPOS[campos.tipo] ? campos.tipo : 'falla',
    origen,
    titulo: recortar(unaLinea(titulo) || tituloDe(texto) || 'Sin título', 120),
    texto,
    detalle,
    firma: unaLinea(campos.firma) || null,
    veces: Math.max(1, parseInt(campos.veces, 10) || 1),
    enlace: unaLinea(campos.enlace) || null,
  };
}

function enUnaCarpeta(donde) {
  try {
    return fs.readdirSync(donde, { withFileTypes: true })
      .filter((e) => e.isFile() && e.name.endsWith('.md'))
      // Los que se escriben después, antes. Se ordena por nombre, que empieza
      // por la fecha, y no por la hora del disco: una copia la cambia.
      .map((e) => e.name).sort().reverse()
      .slice(0, 50)
      .map((nombre) => leer(path.join(donde, nombre)))
      .filter(Boolean);
  } catch {
    return [];
  }
}

// Los que esperan a que alguien diga si se mandan.
function pendientes() {
  const donde = carpeta();
  return donde ? enUnaCarpeta(donde) : [];
}

// El que toca enseñar en la pantalla principal, o null. Como mucho uno, como
// el consejo: los demás se cuentan y están en Ayuda.
function elQueToca(apartados = {}, ahora = Date.now()) {
  const todos = pendientes();
  const libres = todos.filter((a) => !apartados[`aviso:${a.nombre}`] || ahora - apartados[`aviso:${a.nombre}`] > APARTADO_DURANTE);
  if (!libres.length) return null;
  const [primero] = libres;
  return { fichero: primero.fichero, nombre: primero.nombre, titulo: primero.titulo, origen: primero.origen, cuantos: todos.length };
}

const aFrontmatter = (campos) => [
  '---',
  ...Object.entries(campos).filter(([, v]) => v !== null && v !== undefined && v !== '').map(([k, v]) => `${k}: ${unaLinea(v)}`),
  '---',
  '',
].join('\n');

function serializar(aviso, extra = {}) {
  return `${aFrontmatter({
    tipo: aviso.tipo,
    origen: aviso.origen,
    titulo: aviso.titulo,
    firma: aviso.firma,
    veces: aviso.veces > 1 ? aviso.veces : null,
    ...extra,
  })}${String(aviso.texto || '').trim()}\n${aviso.detalle ? `\n${DEBAJO}\n\n${String(aviso.detalle).trim()}\n` : ''}`;
}

function nombreNuevo(donde, titulo) {
  const trozo = String(titulo || 'aviso').normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 50).replace(/-+$/, '') || 'aviso';
  const base = `${new Date().toISOString().slice(0, 10)}-${trozo}`;
  let nombre = `${base}.md`;
  for (let i = 2; fs.existsSync(path.join(donde, nombre)); i += 1) nombre = `${base}-${i}.md`;
  return nombre;
}

// Deja uno escrito, sin mandar. Devuelve el fichero, o null si no hay dónde.
function preparar({ tipo = 'falla', origen = 'alumno', titulo, texto = '', detalle = '', firma = null, veces = 1 }) {
  const donde = carpeta();
  if (!donde) return null;
  const aviso = {
    tipo: TIPOS[tipo] ? tipo : 'falla',
    origen: ORIGENES.includes(origen) ? origen : 'alumno',
    titulo: recortar(unaLinea(titulo) || tituloDe(texto) || 'Sin título', 120),
    texto,
    detalle,
    firma,
    veces,
  };
  try {
    fs.mkdirSync(donde, { recursive: true });
    const fichero = path.join(donde, nombreNuevo(donde, aviso.titulo));
    fs.writeFileSync(fichero, serializar(aviso));
    return fichero;
  } catch {
    return null;
  }
}

// Lo cambia en su sitio: lo que la persona escribió en la caja, o una vez más.
function reescribir(aviso) {
  try {
    fs.writeFileSync(aviso.fichero, serializar(aviso));
    return true;
  } catch {
    return false;
  }
}

// A `mandados/` o a `descartados/`, con lo que haga falta recordar. Los dos se
// guardan por lo mismo: para que ni la barra ni el asistente vuelvan a
// proponer lo que ya se contó o lo que la persona no quiso contar.
// Junto al original, esté donde esté: si el arnés aparece o desaparece entre
// enseñarlo y mandarlo, `carpeta()` ya diría otra, y el original se quedaría
// esperando en la vieja como si nunca se hubiera mandado.
const esUnoQueEspera = (fichero) => Boolean(fichero) && fichero.endsWith('.md') && path.basename(path.dirname(fichero)) === CARPETA[CARPETA.length - 1];

function archivar(aviso, a, extra = {}) {
  const donde = esUnoQueEspera(aviso.fichero) ? path.dirname(aviso.fichero) : carpeta();
  if (!donde) return null;
  const destino = path.join(donde, a);
  try {
    fs.mkdirSync(destino, { recursive: true });
    const nombre = aviso.nombre && !fs.existsSync(path.join(destino, aviso.nombre))
      ? aviso.nombre
      : nombreNuevo(destino, aviso.titulo);
    const fichero = path.join(destino, nombre);
    fs.writeFileSync(fichero, serializar(aviso, { ...extra, cuando: new Date().toISOString() }));
    if (esUnoQueEspera(aviso.fichero)) fs.rmSync(aviso.fichero, { force: true });
    return fichero;
  } catch {
    return null;
  }
}

// ── Lo que pasa con lo que se contó ──────────────────────────────────────
//
// Quien manda un aviso no volvía a saber nada de él, y quien no sabe si sirvió
// de algo deja de contar cosas (decisión 134). Lo que se mandó lo recuerda la
// barra en su almacén, no un fichero de la carpeta: ahí puede escribir
// cualquiera, también un asistente al que le hayan colado algo, y una tarjeta
// «Lo que contaste ya está arreglado: «…»» con cualquier cosa dentro sería un
// mensaje con la cara de Executive Lab (revisión de seguridad).

// El número, solo de una incidencia de nuestro sitio, el de antes o el de
// después del traslado (decisión 140); y el enlace se hace con el número, no se
// coge de ningún sitio.
function numeroDe(enlace) {
  const m = String(enlace || '').match(/^https:\/\/github\.com\/([A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+)\/issues\/(\d+)$/);
  return m && esNuestro(m[1]) ? Number(m[2]) : null;
}
const enlaceDe = (numero) => `https://github.com/${REPO}/issues/${Number(numero)}`;

// Cuáles de estas están cerradas, con **una sola pregunta**: las cerradas del
// sitio desde la más vieja que espera. En un aula todos salen por la misma
// dirección, y GitHub deja 60 preguntas por hora sin cuenta para todos juntos:
// una por aviso eran diez por alumno y día (revisión). Sin respuesta, o sin
// cupo, devuelve null y no pregunta más.
async function lasCerradas(numeros, { desde, esperar = 5000, paginas = 3 } = {}) {
  const { conReloj } = require('./github');
  const buscados = new Set(numeros.map(Number));
  const cerradas = {};
  for (let pagina = 1; pagina <= paginas; pagina += 1) {
    const url = `https://api.github.com/repos/${REPO}/issues?state=closed&since=${encodeURIComponent(desde)}&per_page=100&page=${pagina}`;
    let respuesta = null;
    try {
      respuesta = await conReloj(fetch(url, { headers: { Accept: 'application/vnd.github+json' } }), null, esperar);
    } catch {
      respuesta = null;
    }
    if (!respuesta || !respuesta.ok) return pagina === 1 ? null : cerradas;
    let lista;
    try {
      lista = await respuesta.json();
    } catch {
      return pagina === 1 ? null : cerradas;
    }
    for (const incidencia of Array.isArray(lista) ? lista : []) {
      if (!incidencia || !buscados.has(incidencia.number) || incidencia.state !== 'closed') continue;
      cerradas[incidencia.number] = { como: incidencia.state_reason === 'completed' ? 'hecho' : 'leido', cuando: incidencia.closed_at || null };
    }
    if (!Array.isArray(lista) || lista.length < 100) break;
  }
  return cerradas;
}

// ── Lo que revienta por dentro ───────────────────────────────────────────
//
// Un botón que lanza una excepción es un fallo de la barra, no del alumno, y
// es exactamente lo que a Jose no le llegaba nunca: la persona veía «Algo no ha
// ido bien» y seguía con lo suyo. Se apunta aquí, una vez por fallo: el mismo
// botón con el mismo error suma una vez más al que espera, y si ya se contó o
// la persona dijo que no, no se vuelve a apuntar.

// Lo que distingue un fallo de otro, sin lo que cambia de una vez a la
// siguiente: los números (líneas, tamaños, horas) y las carpetas.
function firmaDe(accion, error) {
  const mensaje = unaLinea(String((error && error.message) || error || '').split('\n')[0]);
  return recortar(`${accion}: ${limpiar(mensaje)}`.replace(/\d+/g, '#'), 160);
}

function apuntarUnFallo({ accion, error, lineas = [] }) {
  try {
    const firma = firmaDe(accion, error);
    const donde = carpeta();
    if (!donde) return null;

    const esperando = pendientes().find((a) => a.firma === firma);
    if (esperando) {
      reescribir({ ...esperando, veces: esperando.veces + 1 });
      return esperando.fichero;
    }
    const yaVisto = [MANDADOS, DESCARTADOS].some((sub) => enUnaCarpeta(path.join(donde, sub)).some((a) => a.firma === firma));
    if (yaVisto) return null;

    const pila = String((error && error.stack) || (error && error.message) || error || '').split('\n').slice(0, 12).join('\n');
    return preparar({
      tipo: 'falla',
      origen: 'barra',
      // El título se enseña, y se puede cambiar, antes de mandarlo: nada del
      // nombre de dentro del botón, que va en los datos (auditoría final).
      titulo: 'Un botón de la barra ha fallado por dentro',
      texto: '',
      // Lo que la barra iba apuntando justo antes: al enseñarlo, días después,
      // lo de ese momento ya no estaría. Se enseña tal cual en «Qué más va con
      // esto», porque es lo que se manda.
      detalle: [`Botón: ${accion}`, pila, ...(lineas.length ? ['', '--- lo último que apuntó la barra ---', ...lineas.slice(-20)] : [])].join('\n'),
      firma,
    });
  } catch {
    // Apuntar un fallo no puede provocar otro.
    return null;
  }
}

// ── Limpiar antes de salir ───────────────────────────────────────────────
//
// Lo que se publica no puede llevar nada de esa persona. Se quita, por este
// orden: los valores de sus claves (los que la barra conoce, enteros: el
// `••••1234` de `enmascarar` enseña cuatro caracteres, y aquí no vale ni eso);
// lo que tiene forma de clave aunque no esté en ningún fichero; la carpeta de
// trabajo y la personal, en Mac, Linux y Windows; su sitio en GitHub; los
// nombres de la empresa, de la carpeta y de su cuenta; y los correos.

const FORMAS_DE_CLAVE = [
  /-----BEGIN [^-]+-----[\s\S]*?-----END [^-]+-----/g,
  /\b(?:gh[pousr]_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,})\b/g,
  /\bsk-[A-Za-z0-9_-]{16,}\b/g,
  // Las de Stripe van con guion bajo, y en una barra que conecta facturación
  // son de las que más se van a ver.
  /\b[spr]k_(?:live|test)_[A-Za-z0-9]{16,}\b/g,
  /\bxox[abposr]-[A-Za-z0-9-]{10,}\b/g,
  /\bAKIA[0-9A-Z]{16}\b/g,
  /\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}/g,
];

const escaparRegex = (t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Una carpeta, escrita como la escriba quien sea: con / o con \, y con la \
// doblada como sale en un JSON o en una pila de Windows.
function variantesDeUnaCarpeta(carpetaEntera) {
  if (!carpetaEntera) return [];
  const partes = carpetaEntera.split(/[\\/]+/).filter(Boolean);
  const unidad = /^[A-Za-z]:$/.test(partes[0] || '') ? '' : '/';
  return [...new Set([
    carpetaEntera,
    `${unidad}${partes.join('/')}`,
    partes.join('\\'),
    partes.join('\\\\'),
  ])].filter((v) => v.length > 3).sort((a, b) => b.length - a.length);
}

// La empresa, siempre. El nombre de esto y el de la carpeta, solo si son más
// de una palabra: «Contabilidad», «ventas» o «casa» son palabras de la frase, y
// taparlas deja un aviso que no se entiende («el botón de <su nombre> no va»);
// «asesoria-norte» o «Proyecto Norte» sí son un nombre.
const sinTildes = (t) => String(t).normalize('NFD').replace(/[\u0300-\u036f]/g, '');

// Un nombre, escrito como lo escriba quien sea. La forma de «Subir a GitHub»
// sobre todo: la barra le pone al sitio de su copia el nombre de la carpeta sin
// tildes, en minúsculas y con guiones (`guardar.js`), y así sale en el informe
// de «Algo va mal». Con la forma de la pantalla sola, «ferreteria-soler» se
// publicaba tal cual (revisión de seguridad).
function formasDe(nombre) {
  const tal = String(nombre).trim();
  const sin = sinTildes(tal);
  const guiones = sin.toLowerCase().replace(/[^a-z0-9/]+/g, '-').replace(/^-+|-+$/g, '');
  return [tal, sin, guiones, guiones.replace(/-/g, '_'), guiones.replace(/-/g, ' '), tal.replace(/ /g, '%20'), encodeURIComponent(tal)];
}

const variasPalabras = (n) => String(n).trim().split(/[\s_.-]+/).filter(Boolean).length > 1;

function losNombres() {
  const nombres = [];
  try {
    const { arnes, empresa } = require('./identidad').leer();
    nombres.push(empresa);
    if (arnes && variasPalabras(arnes)) nombres.push(arnes);
  } catch { /* sin perfil */ }
  const raiz = proyecto.raiz();
  if (raiz) {
    const suya = raiz.split(/[\\/]/).filter(Boolean).pop() || '';
    if (variasPalabras(suya)) nombres.push(suya, suya.replace(/[-_.]+/g, ' '));
  }
  return nombres;
}

// Todas las formas, las largas primero: un nombre puede llevar dentro otro. Con
// dos letras se taparían palabras de verdad.
const todasLasFormas = (nombres) => [...new Set(nombres
  .filter((n) => typeof n === 'string' && n.trim().length >= 3)
  .flatMap(formasDe)
  .filter((f) => f.length >= 3))]
  .sort((a, b) => b.length - a.length);

function valoresDeSusClaves() {
  try {
    return require('./conexiones').valoresDeClaves();
  } catch {
    return [];
  }
}

// `otros` son lo suyo que la barra sabe y no está en el perfil: su usuario de
// GitHub y el sitio de su copia («maria/ferreteria-soler»).
function limpiar(texto, { nombres = losNombres(), otros = [], claves = valoresDeSusClaves(), casa = os.homedir(), raiz = proyecto.raiz() } = {}) {
  let limpio = String(texto == null ? '' : texto);

  for (const valor of claves) if (valor) limpio = limpio.split(valor).join('[clave de acceso]');
  // Una dirección con la clave dentro, como las que git escribe al subir. Antes
  // que las formas de clave: con la clave ya tapada, esto no la encontraría.
  limpio = limpio.replace(/(https?:\/\/)[^\s/@:]+(?::[^\s/@]+)?@/g, '$1');
  for (const forma of FORMAS_DE_CLAVE) limpio = limpio.replace(forma, '[clave de acceso]');

  // Sin distinguir mayúsculas: en Windows, y en un Mac de fábrica, `D:\Clientes`
  // y `d:\clientes` son la misma carpeta, y el editor y una pila no siempre la
  // escriben igual (auditoría final).
  for (const v of variantesDeUnaCarpeta(raiz)) limpio = limpio.replace(new RegExp(escaparRegex(v), 'gi'), '<la carpeta>');
  for (const v of variantesDeUnaCarpeta(casa)) limpio = limpio.replace(new RegExp(escaparRegex(v), 'gi'), '~');
  // Una carpeta de la red de la oficina: `\\NAS-OFICINA\Ferreteria Soler\…`,
  // con la barra doblada o no. Dice el servidor, el recurso y a veces la empresa.
  limpio = limpio.replace(/\\{2,}[^\\\s'"`]+\\{1,2}[^\\\s'"`]+/g, '<carpeta de red>');
  // Y cualquier otra carpeta personal: la de otro usuario del mismo ordenador,
  // o la de una pila que viene de otra máquina.
  limpio = limpio
    .replace(/\/(?:Users|home)\/[^/\s'"`)]+/g, '~')
    .replace(/\b[A-Za-z]:(?:\\{1,2}|\/)(?:Users|Documents and Settings)(?:\\{1,2}|\/)[^\\/\s'"`)]+/gi, '~');

  // Su sitio en GitHub, que lleva su nombre de usuario y el de su proyecto.
  limpio = limpio.replace(/\bgithub\.com[/:]([A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+)/g, (todo, sitio) => (esNuestro(sitio.replace(/\.+$/, '').replace(/\.git$/, '')) ? todo : 'github.com/<su sitio>'));
  limpio = limpio.replace(/\bgit@github\.com\b/g, 'github.com');

  // Los correos antes que los nombres: con el de la empresa tapado dentro,
  // «pepe@ferreteria-soler.es» ya no parecería un correo y saldría «pepe».
  limpio = limpio.replace(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g, '<correo>');

  for (const forma of todasLasFormas([...nombres, ...otros])) {
    limpio = limpio.replace(new RegExp(`(?<![\\p{L}\\p{N}])${escaparRegex(forma)}(?![\\p{L}\\p{N}])`, 'giu'), '<su nombre>');
  }

  // Una @ delante de un nombre avisa en GitHub a esa persona. Nadie quiere que
  // un aviso de la barra le llegue a un desconocido.
  limpio = limpio.replace(/(^|[^\w`])@(?=[A-Za-z0-9-])/g, '$1@\u200b');
  return limpio;
}

// ── Lo que va con cada aviso ─────────────────────────────────────────────
//
// Lo que Jose necesita para arreglarlo y el alumno no sabe decir: qué versión,
// qué ordenador, qué asistente. Lo último que apuntó la barra va solo con lo que
// falla: para una idea o una duda no aporta nada y enseña más de la cuenta.
function datos({ barra = null, editor = null, tipo = 'falla', origen = 'alumno', lineas = [], detalle = '', otros = [] } = {}) {
  let asistente = '(ninguno)';
  try {
    const como = require('./asistentes').comoEstamos();
    const quien = como.cuales.find((a) => a.id === como.ahora);
    if (quien) asistente = `${quien.nombre}${quien.instalado ? '' : ' (no está puesto)'}`;
  } catch { /* sin saberlo, se dice que no se sabe */ }

  const partes = [
    `Barra: ${barra || '?'}`,
    `Arnés: ${proyecto.versionDelCatalogo() || '(sin montar)'}`,
    `Sistema: ${process.platform} ${process.arch} · editor ${editor || '?'}`,
    `Asistente: ${asistente}`,
  ];
  // Lo que se apuntó cuando pasó —la pila de un fallo, el informe de «Algo va
  // mal»— manda sobre lo de ahora, que ya lo lleva dentro o no tiene que ver.
  if (detalle) partes.push('', recortar(String(detalle).trim(), 12000));
  else if (tipo === 'falla' && origen !== 'barra' && lineas.length) partes.push('', '--- lo último que apuntó la barra ---', ...lineas.slice(-30));
  return limpiar(partes.join('\n'), { otros });
}

// ── La incidencia ────────────────────────────────────────────────────────

const QUIEN_LO_CUENTA = {
  alumno: 'lo cuenta el alumno',
  asistente: 'lo ha preparado su asistente y el alumno ha dicho que se mande',
  barra: 'lo ha apuntado la barra al fallar, y el alumno ha dicho que se mande',
};

function componer({ tipo, origen, titulo, texto, datos: conQue = '', barra = null, otros = [] }) {
  const cual = TIPOS[tipo] ? tipo : 'falla';
  const de = ORIGENES.includes(origen) ? origen : 'alumno';
  const titular = recortar(unaLinea(limpiar(titulo || tituloDe(texto) || 'Sin título', { otros })), 90);
  // Los datos ya llegan limpios de `datos()`, y se enseñaron así; se vuelven a
  // limpiar por si alguien los arma de otra forma, que limpiar lo limpio lo
  // deja igual. Era la única barrera para el informe de «Algo va mal»
  // (auditoría final). Y tres comillas seguidas cerrarían el bloque antes de tiempo.
  const enBloque = limpiar(String(conQue || ''), { otros }).replace(/```/g, "'''");
  return {
    titulo: `${TIPOS[cual].icono} ${titular}`,
    cuerpo: [
      `<!-- ${MARCA} tipo=${cual} origen=${de} barra=${unaLinea(barra || '?').replace(/[^0-9A-Za-z.-]/g, '')} -->`,
      `**${TIPOS[cual].etiqueta}** · ${QUIEN_LO_CUENTA[de]}`,
      '',
      limpiar(String(texto || '').trim(), { otros }) || '_(sin nada más que lo de abajo)_',
      '',
      '<details><summary>Datos de la barra</summary>',
      '',
      '```text',
      enBloque,
      '```',
      '',
      '</details>',
    ].join('\n'),
  };
}

// La abre en GitHub. Nunca lanza: devuelve qué pasó, y quien llama lo apunta.
async function mandar({ titulo, cuerpo }, clave, { esperar = 10000 } = {}) {
  if (!clave) return { ok: false, motivo: 'sinCuenta' };
  const { conReloj } = require('./github');
  let respuesta = null;
  try {
    respuesta = await conReloj(fetch(`https://api.github.com/repos/${REPO}/issues`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${clave}`,
        Accept: 'application/vnd.github+json',
        'Content-Type': 'application/json',
        'X-GitHub-Api-Version': '2022-11-28',
      },
      body: JSON.stringify({ title: titulo, body: cuerpo }),
    }), null, esperar);
  } catch {
    respuesta = null;
  }
  if (!respuesta) return { ok: false, motivo: 'sinRespuesta' };
  if (respuesta.status === 201) {
    try {
      const hecha = await respuesta.json();
      return { ok: true, numero: hecha.number, url: hecha.html_url };
    } catch {
      return { ok: true, numero: null, url: null };
    }
  }
  return { ok: false, motivo: respuesta.status === 401 ? 'sinPermiso' : 'rechazado', estado: respuesta.status };
}

module.exports = {
  REPO, CARPETA, MANDADOS, DESCARTADOS, MARCA, TIPOS, ORIGENES, DEBAJO, APARTADO_DURANTE,
  dondeSinArnes, carpeta, leer, pendientes, elQueToca, preparar, reescribir, archivar,
  lasCerradas, numeroDe, enlaceDe,
  apuntarUnFallo, firmaDe, limpiar, datos, componer, mandar, tituloDe,
};
// Las formas de clave, para tapar también lo que sale en el mensaje para el informático (decisión 156).
module.exports.FORMAS_DE_CLAVE = FORMAS_DE_CLAVE;
