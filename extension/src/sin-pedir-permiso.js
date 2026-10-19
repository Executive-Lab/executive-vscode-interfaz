// Trabajar sin pedir permiso, si la persona lo elige (decisión 192).
//
// Jose: *«Mete en el instalador o al iniciar proyecto o donde sea que pregunte si
// por defecto se usa el modo Bypass permissions, y si acepta que sea ese el modo
// por defecto de claude y codex»*. Cambia lo que decían la 163 y la 182 (la barra
// nunca lo pone): ahora lo pone, pero SOLO con el sí de la persona, una vez por
// ordenador, y con «No» de fábrica.
//
// Qué se escribe, y dónde (todo en los ajustes de USUARIO, nunca en los de la carpeta):
//
//   · Claude en el editor (code.claude.com/docs/en/vs-code, «Extension settings»):
//       `claudeCode.initialPermissionMode`: "bypassPermissions"
//       `claudeCode.allowDangerouslySkipPermissions`: true
//     La segunda hace falta: sin ella «a `bypassPermissions` value … starts the
//     conversation in Manual instead» (permission-modes, «Switch permission modes»).
//     Por la API de configuración, `ConfigurationTarget.Global`.
//   · Claude en el terminal: `permissions.defaultMode`: "bypassPermissions" en
//     `~/.claude/settings.json` (permission-modes, «Which mode a session starts in»).
//   · Codex (learn.chatgpt.com/docs/sandboxing): `approval_policy = "never"` y
//     `sandbox_mode = "danger-full-access"` en `~/.codex/config.toml`, arriba.
//
// Lo que NO se escribe: `skipDangerousModePermissionPrompt`. Es la pantalla en la que
// Claude pide «aceptar la responsabilidad» la primera vez («shows a warning dialog
// asking you to accept responsibility»), y esa aceptación la da la persona, no la barra.
//
// El cuidado de siempre:
//   · Lo que ya tenía puesto distinto no se pisa (P4): se dice y no se toca. Solo la
//     pantalla «Qué puede hacer sin preguntarte», con el clic de la persona en esa
//     opción, cambia el modo del editor, que es para lo que existe.
//   · Entero o nada, sin seguir enlaces, y un `config.toml` o un `settings.json` que no
//     se entienden no se tocan.
//   · Queda constancia de lo que se puso y «Quitarlo» quita solo eso, y solo si sigue
//     como se dejó. Para el editor, la constancia va en el estado de la barra; para
//     Claude y para Codex, un fichero al lado de sus ajustes.

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const crypto = require('node:crypto');
const vscode = require('vscode');
const retirados = require('./retirados');

const MARCA = '.executive-lab-sin-pedir-permiso';
const MODO = 'bypassPermissions';
const CLAVE_MODO = 'claudeCode.initialPermissionMode';
const CLAVE_PERMITIR = 'claudeCode.allowDangerouslySkipPermissions';
const LINEAS_DE_CODEX = ['approval_policy = "never"', 'sandbox_mode = "danger-full-access"'];
const CLAVES_DE_CODEX = ['approval_policy', 'sandbox_mode'];
// Si ya hay una de estas arriba, es suya y no se toca. `default_permissions` no se
// combina con `sandbox_mode` (config-reference de Codex).
const CLAVES_QUE_FRENAN = [...CLAVES_DE_CODEX, 'default_permissions'];

const RESPUESTA = 'executiveLab.sinPedirPermiso.respuesta';
const CONSTANCIA = 'executiveLab.sinPedirPermiso.editor';

// El riesgo, dicho igual en la pregunta y en la pantalla.
const RIESGO = 'Puede cambiar o borrar ficheros y ejecutar programas sin preguntarte.';
// En `bypassPermissions` los frenos (enganches `PreToolUse` que deniegan) siguen valiendo, pero
// el modo también deja a Claude escribir en rutas protegidas (permission-modes): podría quitarlos.
const FRENOS_DE_CLAUDE = 'Los frenos de seguridad del arnés siguen puestos, pero sin pedirte permiso Claude también podría quitarlos.';
// Con Codex, el riesgo entero (learn.chatgpt.com/docs/permission-modes, «Full access»).
const RIESGO_DE_CODEX = 'Con Codex, además, puede tocar cualquier fichero del ordenador y usar internet, y los frenos del arnés no le afectan.';

const carpetaDeClaude = () => process.env.CLAUDE_CONFIG_DIR || path.join(os.homedir(), '.claude');
const carpetaDeCodex = () => retirados.carpetaDeCodex();

const esEnlace = (ruta) => { try { return fs.lstatSync(ruta).isSymbolicLink(); } catch { return false; } };
const sello = (ahora) => ahora.toISOString().slice(0, 19).replace(/[-:]/g, '').replace('T', '-');
const MAS_GRANDE = 256 * 1024;

// Entero o nada, con los permisos que tenía.
function escribirEntero(fichero, contenido) {
  const temporal = `${fichero}.executive-lab-${process.pid}-${crypto.randomBytes(6).toString('hex')}`;
  fs.writeFileSync(temporal, contenido, { flag: 'wx' });
  try {
    try { fs.chmodSync(temporal, fs.statSync(fichero).mode); } catch { /* no había fichero */ }
    fs.renameSync(temporal, fichero);
  } catch (error) {
    fs.rmSync(temporal, { force: true });
    throw error;
  }
}

function leerMarca(carpeta) {
  const marca = path.join(carpeta, MARCA);
  if (esEnlace(marca)) return null;
  try {
    if (fs.statSync(marca).size > 64 * 1024) return null;
    const dato = JSON.parse(fs.readFileSync(marca, 'utf8'));
    return dato && typeof dato === 'object' ? dato : null;
  } catch {
    return null;
  }
}

function escribirMarca(carpeta, dato) {
  fs.mkdirSync(carpeta, { recursive: true });
  escribirEntero(path.join(carpeta, MARCA), `${JSON.stringify({
    porQue: 'Lo puso la barra de Executive Lab con el sí de la persona (decisión 192). Al quitarlo, solo se quita lo que sigue como lo dejó.', // diccionario: interno
    ...dato,
  }, null, 2)}\n`);
}

// ── Claude: ~/.claude/settings.json ────────────────────────────────────────

// { hecho: 'puesto' | 'yaEstaba' | 'tieneLoSuyo' | 'ilegible' | 'enlace' | 'raro' | 'fallo' }
function ponerEnClaude({ carpeta = carpetaDeClaude() } = {}) {
  const fichero = path.join(carpeta, 'settings.json');
  if (esEnlace(fichero) || esEnlace(carpeta) || esEnlace(path.join(carpeta, MARCA))) return { hecho: 'enlace', fichero };
  const existe = fs.existsSync(fichero);
  let datos = {};
  if (existe) {
    try {
      if (fs.statSync(fichero).size > MAS_GRANDE) return { hecho: 'ilegible', fichero };
      datos = JSON.parse(fs.readFileSync(fichero, 'utf8'));
    } catch {
      return { hecho: 'ilegible', fichero };
    }
    if (!datos || typeof datos !== 'object' || Array.isArray(datos)) return { hecho: 'ilegible', fichero };
  }
  const permisos = datos.permissions;
  if (permisos !== undefined && (!permisos || typeof permisos !== 'object' || Array.isArray(permisos))) return { hecho: 'raro', fichero };
  if (permisos && Object.prototype.hasOwnProperty.call(permisos, 'defaultMode')) {
    return permisos.defaultMode === MODO
      ? { hecho: 'yaEstaba', fichero }
      : { hecho: 'tieneLoSuyo', valor: permisos.defaultMode, fichero };
  }
  try {
    fs.mkdirSync(carpeta, { recursive: true });
    const nuevo = { ...datos, permissions: { ...(permisos || {}), defaultMode: MODO } };
    // La constancia primero: lo que no se puede dejar a medias es el ajuste.
    escribirMarca(carpeta, { clave: 'permissions.defaultMode', valor: MODO, creoPermissions: permisos === undefined, creoElFichero: !existe });
    escribirEntero(fichero, `${JSON.stringify(nuevo, null, 2)}\n`);
  } catch (error) {
    fs.rmSync(path.join(carpeta, MARCA), { force: true });
    return { hecho: 'fallo', error: error.message, fichero };
  }
  return { hecho: 'puesto', fichero };
}

function quitarDeClaude({ carpeta = carpetaDeClaude() } = {}) {
  const fichero = path.join(carpeta, 'settings.json');
  if (esEnlace(fichero) || esEnlace(carpeta) || esEnlace(path.join(carpeta, MARCA))) return { hecho: 'enlace' };
  const marca = leerMarca(carpeta);
  if (!marca) return { hecho: fs.existsSync(path.join(carpeta, MARCA)) ? 'noCasa' : 'noEraNuestro' };
  let datos;
  try {
    datos = JSON.parse(fs.readFileSync(fichero, 'utf8'));
  } catch {
    // Sin fichero no hay nada que quitar; uno que ya no se entiende, no se toca.
    if (!fs.existsSync(fichero)) { fs.rmSync(path.join(carpeta, MARCA), { force: true }); return { hecho: 'yaNoEstaba' }; }
    return { hecho: 'ilegible' };
  }
  let hecho = 'yaNoEstaba';
  const permisos = datos && datos.permissions;
  if (permisos && typeof permisos === 'object' && permisos.defaultMode === MODO) {
    const { defaultMode: _quitado, ...resto } = permisos;
    const nuevo = { ...datos };
    if (Object.keys(resto).length || marca.creoPermissions === false) nuevo.permissions = resto;
    else delete nuevo.permissions;
    try {
      if (marca.creoElFichero && !Object.keys(nuevo).length) fs.rmSync(fichero, { force: true });
      else escribirEntero(fichero, `${JSON.stringify(nuevo, null, 2)}\n`);
    } catch (error) {
      return { hecho: 'fallo', error: error.message };
    }
    hecho = 'quitado';
  }
  fs.rmSync(path.join(carpeta, MARCA), { force: true });
  return { hecho };
}

const claudeAhora = ({ carpeta = carpetaDeClaude() } = {}) => {
  try {
    const datos = JSON.parse(fs.readFileSync(path.join(carpeta, 'settings.json'), 'utf8'));
    return Boolean(datos && datos.permissions && datos.permissions.defaultMode === MODO);
  } catch {
    return false;
  }
};

// ── Codex: ~/.codex/config.toml ────────────────────────────────────────────

function mirarElConfig(codex) {
  const config = path.join(codex, 'config.toml');
  if (esEnlace(config) || esEnlace(codex)) return { hecho: 'enlace' };
  if (!fs.existsSync(config)) return { hecho: 'noHay', texto: '' };
  let texto;
  try {
    if (fs.statSync(config).size > MAS_GRANDE) return { hecho: 'ilegible' };
    texto = fs.readFileSync(config, 'utf8');
  } catch {
    return { hecho: 'ilegible' };
  }
  const leido = retirados.leerElToml(texto);
  return leido ? { hecho: 'ok', texto, leido } : { hecho: 'raro' };
}

const tablasDe = (t) => t.split('\n').filter((l) => /^\s*\[/.test(l)).join('\n');

// El texto con las dos líneas entre las claves de arriba (una clave al final caería
// dentro de la última tabla), o null si el resultado no se entiende. `relleno`: se
// añadió una línea en blanco detrás, para poder quitarla igual.
function conLasLineas(texto) {
  const eol = texto.includes('\r\n') ? '\r\n' : '\n';
  const lineas = texto.split('\n').map((l) => l.replace(/\r$/, ''));
  const antes = retirados.leerElToml(texto);
  if (!antes) return null;
  const hasta = antes.primeraTabla >= 0 ? antes.primeraTabla : lineas.length;
  let donde = -1;
  for (let i = 0; i < hasta; i += 1) if (lineas[i].trim() && !lineas[i].trim().startsWith('#')) donde = i;
  const nuevo = [...lineas];
  let relleno = false;
  if (donde >= 0) {
    nuevo.splice(donde + 1, 0, ...LINEAS_DE_CODEX);
  } else {
    relleno = Boolean(texto.trim());
    nuevo.splice(0, 0, ...LINEAS_DE_CODEX, ...(relleno ? [''] : []));
  }
  let resultado = nuevo.join(eol);
  // Si al fichero le faltaba el salto del final, se le pone (el resto de líneas lo piden)
  // y se apunta para quitarlo igual.
  const salto = Boolean(resultado) && !resultado.endsWith(eol);
  if (salto) resultado += eol;
  const leido = retirados.leerElToml(resultado);
  if (!leido || !CLAVES_DE_CODEX.every((c) => leido.clavesDeArriba.has(c)) || tablasDe(resultado) !== tablasDe(texto)) return null;
  return { texto: resultado, relleno, salto };
}

function ponerEnCodex({ codex = carpetaDeCodex(), ahora = new Date() } = {}) {
  const config = mirarElConfig(codex);
  const fichero = path.join(codex, 'config.toml');
  if (config.hecho === 'enlace' || esEnlace(path.join(codex, MARCA))) return { hecho: 'enlace', fichero };
  if (config.hecho !== 'noHay' && config.hecho !== 'ok') return { hecho: config.hecho, fichero };
  if (config.leido) {
    // Cualquiera de las claves, o un perfil elegido arriba (que puede decir otra cosa),
    // es suyo: no se completa a medias.
    if (CLAVES_QUE_FRENAN.some((c) => config.leido.clavesDeArriba.has(c)) || config.leido.perfil !== null) {
      return { hecho: 'tieneLoSuyo', fichero };
    }
  }
  const dicho = conLasLineas(config.texto);
  if (!dicho) return { hecho: 'raro', fichero };
  let copia = null;
  try {
    fs.mkdirSync(codex, { recursive: true });
    escribirMarca(codex, { lineas: LINEAS_DE_CODEX, relleno: dicho.relleno, salto: dicho.salto, creoElFichero: config.hecho === 'noHay' });
    if (config.hecho === 'ok') {
      // Una copia que ya existe (dos pasadas en el mismo segundo) no se pisa: se numera.
      let n = 1;
      copia = `${fichero}.copia-executive-lab-${sello(ahora)}`;
      while (fs.existsSync(copia)) { n += 1; copia = `${fichero}.copia-executive-lab-${sello(ahora)}-${n}`; }
      fs.copyFileSync(fichero, copia, fs.constants.COPYFILE_EXCL);
    }
    escribirEntero(fichero, dicho.texto);
  } catch (error) {
    const sigue = mirarElConfig(codex);
    if (!sigue.leido || !CLAVES_DE_CODEX.some((c) => sigue.leido.clavesDeArriba.has(c))) fs.rmSync(path.join(codex, MARCA), { force: true });
    return { hecho: 'fallo', error: error.message, fichero };
  }
  return { hecho: 'puesto', fichero, copia };
}

function quitarDeCodex({ codex = carpetaDeCodex() } = {}) {
  if (esEnlace(path.join(codex, MARCA)) || esEnlace(codex)) return { hecho: 'enlace' };
  const marca = leerMarca(codex);
  if (!marca) return { hecho: fs.existsSync(path.join(codex, MARCA)) ? 'noCasa' : 'noEraNuestro' };
  const config = mirarElConfig(codex);
  const fichero = path.join(codex, 'config.toml');
  if (config.hecho === 'noHay') { fs.rmSync(path.join(codex, MARCA), { force: true }); return { hecho: 'yaNoEstaba' }; }
  if (config.hecho !== 'ok') return { hecho: config.hecho };

  const lineas = config.texto.split('\n');
  const hasta = config.leido.primeraTabla >= 0 ? config.leido.primeraTabla : lineas.length;
  const donde = LINEAS_DE_CODEX.map((l) => {
    const sitios = [];
    for (let i = 0; i < hasta; i += 1) if (lineas[i].replace(/\r$/, '') === l) sitios.push(i);
    return sitios;
  });
  // Las dos, cada una una vez, y solo arriba: si no, está cambiado y es suyo.
  if (donde.some((s) => s.length !== 1)) {
    if (donde.every((s) => s.length === 0)) { fs.rmSync(path.join(codex, MARCA), { force: true }); return { hecho: 'yaNoEstaba' }; }
    return { hecho: 'cambiado' };
  }
  const fuera = new Set(donde.map((s) => s[0]));
  // El blanco que se añadió detrás, si se añadió y sigue ahí.
  if (marca.relleno) {
    const ultima = Math.max(...fuera);
    if (lineas[ultima + 1] !== undefined && lineas[ultima + 1].replace(/\r$/, '') === '') fuera.add(ultima + 1);
  }
  let resto = lineas.filter((_, i) => !fuera.has(i)).join('\n');
  if (marca.salto) resto = resto.replace(/\r?\n$/, '');
  const leido = retirados.leerElToml(resto);
  if (!leido || CLAVES_DE_CODEX.some((c) => leido.clavesDeArriba.has(c))) return { hecho: 'raro' };
  try {
    if (marca.creoElFichero && !resto.trim()) fs.rmSync(fichero, { force: true });
    else escribirEntero(fichero, resto);
  } catch (error) {
    return { hecho: 'fallo', error: error.message };
  }
  fs.rmSync(path.join(codex, MARCA), { force: true });
  return { hecho: 'quitado' };
}

const codexAhora = ({ codex = carpetaDeCodex() } = {}) => {
  const config = mirarElConfig(codex);
  if (config.hecho !== 'ok') return false;
  const arriba = config.texto.split('\n').slice(0, config.leido.primeraTabla >= 0 ? config.leido.primeraTabla : undefined).map((l) => l.replace(/\r$/, '').trim());
  return LINEAS_DE_CODEX.every((l) => arriba.includes(l));
};

// ── El editor (los ajustes de usuario) ─────────────────────────────────────

const PONER = { [CLAVE_MODO]: MODO, [CLAVE_PERMITIR]: true };
const delUsuario = (clave) => (vscode.workspace.getConfiguration().inspect(clave) || {}).globalValue;

let memoria = null;
const saberDondeGuardar = (globalState) => { memoria = globalState || null; };
const leerEstado = (clave) => { try { return memoria ? memoria.get(clave) : undefined; } catch { return undefined; } };
const sinValor = (v) => v === undefined || v === null || v === '';

// `forzar`: con el clic de la persona en la pantalla, que es para lo que existe el
// modo, se cambia aunque tuviera otro; se apunta cómo estaba para devolverlo.
async function ponerEnElEditor({ forzar = false } = {}) {
  const hacer = [];
  for (const [clave, valor] of Object.entries(PONER)) {
    const actual = delUsuario(clave);
    if (actual === valor) continue;
    if (!sinValor(actual) && !forzar) return { hecho: 'tieneLoSuyo', clave, valor: actual };
    hacer.push({ clave, valor, antes: sinValor(actual) ? undefined : actual });
  }
  if (!hacer.length) return { hecho: 'yaEstaba' };
  const hechas = [];
  try {
    for (const h of hacer) {
      await vscode.workspace.getConfiguration().update(h.clave, h.valor, vscode.ConfigurationTarget.Global);
      hechas.push(h);
    }
  } catch (error) {
    // Lo que sí se escribió se devuelve a como estaba.
    for (const h of hechas) await vscode.workspace.getConfiguration().update(h.clave, h.antes, vscode.ConfigurationTarget.Global).catch(() => {});
    return { hecho: 'fallo', error: error.message };
  }
  // Se suma a lo que ya constara: una clave puede venir de una vez y la otra de otra.
  const antes = leerEstado(CONSTANCIA);
  const previas = antes && Array.isArray(antes.puestas) ? antes.puestas : [];
  const puestas = [...previas.filter((p) => !hechas.some((h) => h.clave === p.clave)), ...hechas];
  if (memoria) await memoria.update(CONSTANCIA, { puestas });
  return { hecho: 'puesto' };
}

async function quitarDelEditor() {
  const constancia = leerEstado(CONSTANCIA);
  if (!constancia || !Array.isArray(constancia.puestas)) return { hecho: 'noEraNuestro' };
  let quitado = false;
  for (const { clave, valor, antes } of constancia.puestas) {
    // Solo si sigue como lo dejamos: si lo cambió después, es suyo.
    if (delUsuario(clave) !== valor) continue;
    try {
      await vscode.workspace.getConfiguration().update(clave, antes, vscode.ConfigurationTarget.Global);
      quitado = true;
    } catch (error) {
      return { hecho: 'fallo', error: error.message };
    }
  }
  if (memoria) await memoria.update(CONSTANCIA, undefined);
  return { hecho: quitado ? 'quitado' : 'yaNoEstaba' };
}

const editorAhora = () => delUsuario(CLAVE_MODO) === MODO;

// ── Todo junto ─────────────────────────────────────────────────────────────

// `usa`: { claude, codex }, cuáles de los dos usa la persona. Devuelve, por cada
// sitio, lo que pasó; al que no se usa no se le toca nada.
async function ponerlo({ usa, forzar = false, carpetas = {} } = {}) {
  const hechos = {};
  if (usa.claude) {
    hechos.editor = await ponerEnElEditor({ forzar });
    hechos.claude = ponerEnClaude({ carpeta: carpetas.claude });
  }
  if (usa.codex) hechos.codex = ponerEnCodex({ codex: carpetas.codex });
  return hechos;
}

// Lo que puso la barra, de los tres sitios. Con «Quitarlo» y al elegir otro modo.
// `solo`: ['claude'] o ['codex'] quita únicamente lo de ese asistente (un clic vale para lo
// que nombra); sin nada, los dos.
async function quitarlo({ carpetas = {}, solo = null } = {}) {
  const hechos = {};
  if (!solo || solo.includes('claude')) {
    hechos.editor = await quitarDelEditor();
    hechos.claude = quitarDeClaude({ carpeta: carpetas.claude });
  }
  if (!solo || solo.includes('codex')) hechos.codex = quitarDeCodex({ codex: carpetas.codex });
  return hechos;
}

// Lo que dicen los ajustes de verdad, para la pantalla y para no preguntar de más.
function comoEstamos({ carpetas = {} } = {}) {
  return {
    editor: editorAhora(),
    claude: claudeAhora({ carpeta: carpetas.claude }),
    codex: codexAhora({ codex: carpetas.codex }),
  };
}

const laRespuesta = () => leerEstado(RESPUESTA) || null;
const apuntarRespuesta = (quiere) => (memoria ? memoria.update(RESPUESTA, quiere ? 'si' : 'no') : undefined);

// Los dichos por su nombre, según cuáles use: «Claude», «Codex», «Claude y Codex».
const losNombres = (usa) => [usa.claude ? 'Claude' : null, usa.codex ? 'Codex' : null].filter(Boolean).join(' y ');

// A cuáles de los dos asistentes usa la persona en este ordenador: lo tiene puesto
// o el arnés de esta carpeta está montado para él. Se carga tarde: `asistentes`
// también pinta cosas de la barra.
function queUsa() {
  const asistentes = require('./asistentes');
  const claude = asistentes.porId('claude');
  const codex = asistentes.porId('codex');
  const delArnes = asistentes.losDelArnes();
  return {
    claude: asistentes.estaInstalado(claude) || delArnes.includes(claude),
    codex: asistentes.estaPuesto(codex) || delArnes.includes(codex),
  };
}

// La pregunta y su riesgo, según cuáles use.
function laPregunta(usa) {
  const quienes = losNombres(usa);
  const verbo = usa.claude && usa.codex ? 'trabajen' : 'trabaje';
  return {
    texto: `¿Quieres que ${quienes} ${verbo} sin pedirte permiso para cada cosa? ${RIESGO}${usa.claude ? ` ${FRENOS_DE_CLAUDE}` : ''}${usa.codex ? ` ${RIESGO_DE_CODEX}` : ''}`,
    si: 'Sí, sin pedirme permiso',
    no: 'No, que me pregunte',
  };
}

// La frase de lo que se hizo: nombra solo los asistentes donde de verdad quedó puesto, y dice
// aparte cuál no se ha podido. null si no se pudo nada.
function laFrase(hechos, usa) {
  const vale = (h) => h && ['puesto', 'yaEstaba'].includes(h.hecho);
  const suyo = (h) => h && h.hecho === 'tieneLoSuyo';
  const grupos = { claude: [hechos.editor, hechos.claude], codex: [hechos.codex] };
  const puestos = [];
  const fallidos = [];
  let loSuyo = false;
  for (const [id, nombre] of [['claude', 'Claude'], ['codex', 'Codex']]) {
    if (!usa[id]) continue;
    const hs = grupos[id].filter(Boolean);
    if (hs.some(suyo)) loSuyo = true;
    if (hs.some(vale)) puestos.push(nombre);
    else if (hs.some((h) => !suyo(h))) fallidos.push(nombre);
  }
  const noPude = fallidos.length ? ` Con ${fallidos.join(' y ')} no he podido ponerlo: lo he dejado como estaba.` : '';
  if (!puestos.length) {
    if (!loSuyo) return null;
    return `Ya tenías puesto cómo quieres que pida permiso, y no lo he tocado. Si quieres cambiarlo, está en Cómo quieres que trabaje.${noPude}`;
  }
  return `Hecho. ${puestos.join(' y ')} ${puestos.length > 1 ? 'trabajarán' : 'trabajará'} sin pedirte permiso. Se nota en la próxima conversación que abras.${loSuyo ? ' Lo que ya tenías puesto distinto no lo he tocado.' : ''}${noPude}`;
}

module.exports = {
  MARCA, MODO, CLAVE_MODO, CLAVE_PERMITIR, LINEAS_DE_CODEX, RESPUESTA, CONSTANCIA, RIESGO, FRENOS_DE_CLAUDE, RIESGO_DE_CODEX,
  carpetaDeClaude, carpetaDeCodex, saberDondeGuardar,
  ponerEnClaude, quitarDeClaude, claudeAhora,
  ponerEnCodex, quitarDeCodex, codexAhora,
  ponerEnElEditor, quitarDelEditor, editorAhora,
  ponerlo, quitarlo, comoEstamos, laRespuesta, apuntarRespuesta, queUsa, laPregunta, laFrase, losNombres,
};
