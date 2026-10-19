#!/usr/bin/env node
// Deja las piezas puestas. Nada más.
//
//   node preparar.js --asistente claude   (o codex, o losDos)
//   node preparar.js --sin-editor        (para probar sin tocar el VS Code de quien prueba)
//
// ── El reparto ───────────────────────────────────────────────────────────
//
// El instalador pone las **piezas**: el editor, git, Node y las dos
// extensiones. Se acabó ahí.
//
// Todo lo demás —elegir carpeta, preguntar de qué va esto, el objetivo, los
// nombres, la web, montar el arnés, los raíles, la primera copia— lo hace el
// **panel**, cuando esa persona abre una carpeta y pulsa "Preparar esta
// carpeta". Y lo hace ya, entero, en `extension/src/arrancar.js`.
//
// Antes esto montaba también un arnés en `Documentos/Mi Empresa IA`, con seis
// preguntas dentro del instalador. Eso significaba dos cosas malas: que había
// dos versiones del mismo onboarding —esta y la del panel— que había que
// mantener a la par, y que el instalador decidía por adelantado en qué carpeta
// iba a trabajar alguien que todavía no había abierto el programa.
//
// El Node portable que ejecuta esto vive en la misma carpeta que este fichero.
// No imprime nada para que lo lea el alumno: escribe un registro y devuelve 0
// o 1. Quien enseña la barra de progreso es el instalador.

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const git = require('./git');
const loDelEditor = require('./ajustes-del-editor');
const { ponerElControlRemoto } = require('./control-remoto');

const APP = __dirname;
const ES_WINDOWS = process.platform === 'win32';
const NODE = process.execPath;

const primero = (rutas, respaldo) => rutas.find((r) => r && fs.existsSync(r)) || respaldo;

// ------------------------------------------------------------------ ayudas

function argumento(nombre, porDefecto = null) {
  const i = process.argv.indexOf(`--${nombre}`);
  return i !== -1 && process.argv[i + 1] ? process.argv[i + 1] : porDefecto;
}

const registro = [];
// Lo que se ha ido poniendo, y por qué se ha parado si se ha parado: es lo que
// lee el instalador para decírselo a la persona y lo que va al informe.
const pasos = [];
let motivo = '';
const anotar = (linea) => registro.push(`[${new Date().toISOString()}] ${linea}`);

// PATH con nuestro Node delante: los enganches del arnés lo llaman por nombre.
function entorno() {
  const env = { ...process.env };
  const clave = Object.keys(env).find((k) => k.toLowerCase() === 'path') || 'PATH';
  env[clave] = [path.dirname(NODE), env[clave] || ''].join(path.delimiter);
  return env;
}

function correr(programa, args, opciones = {}) {
  anotar(`> ${path.basename(programa)} ${args.join(' ').slice(0, 300)}`);
  const r = spawnSync(programa, args, { encoding: 'utf8', windowsHide: true, env: entorno(), ...opciones });
  const salida = `${r.stdout || ''}${r.stderr || ''}`;
  anotar(r.error ? `ERROR ${r.error.message}` : salida.trim() || '(sin salida)');
  return { codigo: r.error ? -1 : r.status, salida };
}

// En Windows un .cmd nunca se lanza directo — Node lo rechaza con EINVAL —,
// pasa por cmd.exe con la línea ya citada.
const citar = (a) => (/[\s"]/.test(a) ? `"${a.replace(/"/g, '""')}"` : a);
function correrCmd(programa, args) {
  if (!ES_WINDOWS) return correr(programa, args);
  const linea = [programa, ...args].map(citar).join(' ');
  return correr('cmd.exe', ['/d', '/s', '/c', `"${linea}"`], { windowsVerbatimArguments: true });
}

// ------------------------------------------------------------------- pasos

// git es obligatorio y no lo llevamos dentro: se lanza el instalador oficial
// del sistema. El porqué de las dos cosas está en comun/git.js y en la
// decisión 26.
//
// Aquí se falla en alto si no aparece: sin git, el panel no puede preparar
// ninguna carpeta, y es mejor saberlo ahora —con la barra de progreso del
// instalador delante— que la primera vez que alguien pulse el botón.
async function asegurarGit() {
  if (await git.hay()) {
    anotar('git: ya estaba.');
    pasos.push('git: ya estaba');
    return true;
  }

  anotar('git: no está; lanzando el instalador oficial del sistema.');
  const hecho = await git.instalar({}, (que) => anotar(`git: ${que}`));
  if (!hecho.ok) {
    anotar(`ERROR: no he podido dejar git puesto (${hecho.mensaje}).`);
    motivo = motivo || 'no he podido instalar git (hace falta conexión a internet)';
    return false;
  }
  anotar('git: instalado.');
  pasos.push('git: instalado');
  return true;
}

// La línea de comandos de VS Code, por su ruta completa: recién instalado, el
// PATH de este proceso todavía no la tiene.
function code() {
  if (ES_WINDOWS) {
    // Donde lo deja cada tipo de instalación: por usuario (la nuestra), o para todo
    // el equipo. Quien ya lo tenía puesto para todo el equipo no tiene el de usuario.
    const local = process.env.LOCALAPPDATA || path.join(os.homedir(), 'AppData', 'Local');
    return primero([
      path.join(local, 'Programs', 'Microsoft VS Code', 'bin', 'code.cmd'),
      path.join(process.env.ProgramFiles || 'C:\\Program Files', 'Microsoft VS Code', 'bin', 'code.cmd'),
      path.join(process.env['ProgramFiles(x86)'] || 'C:\\Program Files (x86)', 'Microsoft VS Code', 'bin', 'code.cmd'),
    ], 'code.cmd');
  }
  // El instalador de macOS lo pone en ~/Applications, que no pide
  // administrador. Si esa persona ya lo tenía en /Applications, se usa el suyo.
  const dentroDeLaApp = path.join('Visual Studio Code.app', 'Contents', 'Resources', 'app', 'bin', 'code');
  return primero([
    path.join(os.homedir(), 'Applications', dentroDeLaApp),
    path.join('/Applications', dentroDeLaApp),
  ], 'code');
}

const EXTENSION_DEL_ASISTENTE = { claude: 'anthropic.claude-code', codex: 'openai.chatgpt' };

// Con qué asistentes: el elegido, o los dos. Lo que no se entiende, Claude, que
// es lo que se instalaba hasta ahora.
function asistentesDe(asistente) {
  const elegidos = loDelEditor.asistentesDe(asistente);
  return elegidos.length ? elegidos : ['claude'];
}

function vestirElEditor(asistente) {
  const cli = code();
  let bien = true;
  for (const cual of asistentesDe(asistente)) {
    bien = correrCmd(cli, ['--install-extension', EXTENSION_DEL_ASISTENTE[cual], '--force']).codigo === 0 && bien;
  }

  const vsix = path.join(APP, 'executive-lab.vsix');
  if (fs.existsSync(vsix)) bien = correrCmd(cli, ['--install-extension', vsix, '--force']).codigo === 0 && bien;
  else anotar('AVISO: no encuentro executive-lab.vsix junto a este script.');

  if (!bien) {
    anotar('ERROR: no se han podido instalar las extensiones del editor.');
    motivo = motivo || (fs.existsSync(cli)
      ? 'no he podido instalar las extensiones del editor (hace falta conexión a internet)'
      : 'el editor (Visual Studio Code) no está instalado');
  } else pasos.push('extensiones del editor: puestas');
  return bien;
}

// Lo que se deja puesto en los ajustes de usuario del editor (decisión 163): lo
// de todo el editor —la confianza, las actualizaciones, la bienvenida— y lo del
// asistente elegido. Qué es cada cosa, y por qué, en `ajustes-del-editor.js`.
// Lo que esa persona ya tenía decidido no se pisa, y queda constancia al lado
// para que desinstalar quite solo lo nuestro.
//
// El resto del disfraz —todo lo que se ve— lo escribe la extensión en el
// .vscode/settings.json de cada carpeta, cuando esa persona lo enciende. Aquí
// no se escribe porque aquí todavía no hay ninguna carpeta.
async function ajustesDelEditor(asistente, { fichero = loDelEditor.ficheroDeUsuario() } = {}) {
  // --sin-editor también se los salta: si no, "probar sin tocar el VS Code de
  // quien prueba" le apagaba las actualizaciones y la telemetría de verdad.
  if (process.argv.includes('--sin-editor')) {
    anotar('Ajustes del editor: omitidos (--sin-editor).');
    return null;
  }

  try {
    const hecho = await loDelEditor.ponerEnElFichero({ fichero, asistentes: asistentesDe(asistente), anotar });
    const dicho = { puesto: 'puestos', nada: 'no faltaba nada', ilegible: 'AVISO: no los entiendo; no los toco' }[hecho.hecho] || hecho.hecho;
    anotar(`Ajustes del editor: ${dicho}${hecho.puestas.length ? ` (${hecho.puestas.join(', ')})` : ''}${hecho.respetadas.length ? `; ya los había decidido esa persona: ${hecho.respetadas.join(', ')}` : ''}.`);
    return hecho;
  } catch (error) {
    anotar(`AVISO: los ajustes del editor no se han podido poner (${error.message}).`);
    return null;
  }
}

// El control remoto de Claude, para todas las sesiones (decisión 143): en sus
// ajustes de usuario, que es el único sitio donde Claude le hace caso. Solo con
// Claude, que es el que lo tiene; y no con --sin-editor, que es probar sin tocar
// los ajustes de verdad de quien prueba.
function controlRemoto(asistente) {
  if (!asistentesDe(asistente).includes('claude')) return;
  if (process.argv.includes('--sin-editor')) {
    anotar('Control remoto: omitido (--sin-editor).');
    return;
  }
  try {
    const { hecho } = ponerElControlRemoto();
    anotar(`Control remoto: ${{ puesto: 'puesto para todas las sesiones', yaEstaba: 'ya lo había decidido esa persona; no lo toco', ilegible: 'AVISO: sus ajustes de Claude no se pueden leer; no los toco' }[hecho] || hecho}.`);
  } catch (error) {
    anotar(`AVISO: el control remoto no se ha podido poner (${error.message}).`);
  }
}

// -------------------------------------------------------------------- main

async function main() {
  const asistente = argumento('asistente', 'claude');
  anotar(`Executive Lab · ${process.platform} · node ${process.version} · asistente: ${asistente}`);

  // Solo para probar el camino malo en la máquina `el-exe` de GitHub: hace falta la
  // variable de la prueba Y que esto corra dentro de GitHub Actions, que en el
  // portátil de nadie es verdad. Así no se puede disparar en un alumno.
  const forzado = process.env.EXECUTIVE_LAB_PROBAR_FALLO === '1' && process.env.GITHUB_ACTIONS === 'true';
  if (forzado) {
    anotar('ERROR: fallo forzado por la prueba (EXECUTIVE_LAB_PROBAR_FALLO).');
    motivo = 'fallo forzado por la prueba de la máquina de GitHub';
    return terminar(false, asistente);
  }

  let bien = await asegurarGit();

  if (process.argv.includes('--sin-editor')) anotar('Extensiones: omitidas (--sin-editor).');
  else bien = vestirElEditor(asistente) && bien;

  await ajustesDelEditor(asistente);
  controlRemoto(asistente);

  terminar(bien, asistente);
}

// Escribe el registro y, si algo falló, el motivo y el informe para el tutor; y sale.
// El instalador lee `motivo.txt` (en Windows-1252, que es lo que sabe leer) para
// decírselo a la persona: sin esto, un fallo aquí se acababa en un código de salida
// que Inno no mira, y la persona veía «instalado» sin estarlo.
function terminar(bien, asistente) {
  anotar(bien
    ? 'Listo. El resto lo hace el panel cuando se abra una carpeta.'
    : 'Ha quedado algo sin poner; mira las líneas de ERROR de arriba.');

  // No hay carpeta de trabajo todavía, así que el registro se queda junto a la
  // app; si ni eso se puede, en la carpeta temporal del sistema.
  const texto = `${registro.join('\n')}\n`;
  try {
    fs.writeFileSync(path.join(APP, 'instalacion.log'), texto);
  } catch {
    try { fs.writeFileSync(path.join(os.tmpdir(), 'executive-lab-instalacion.log'), texto); } catch { /* queda el código */ }
  }
  if (!bien) dejarElInforme(texto, asistente);
  process.exit(bien ? 0 : 1);
}

function dejarElInforme(textoDelRegistro, asistente) {
  const porQue = motivo || 'no ha dicho por qué';
  try { fs.writeFileSync(path.join(APP, 'motivo.txt'), Buffer.from(porQue, 'latin1')); } catch { /* el instalador dirá que no ha dicho por qué */ }
  const escritorio = argumento('escritorio', path.join(os.homedir(), 'Desktop'));
  const informe = [
    'Executive Lab: la instalación no ha terminado.',
    `Motivo: ${porQue}`,
    `Asistente elegido: ${asistente}`,
    '',
    '--- Progreso',
    ...(pasos.length ? pasos : ['(no se había puesto nada)']),
    '',
    `--- Registro (${path.join(APP, 'instalacion.log')})`,
    textoDelRegistro,
  ].join('\r\n');
  try {
    fs.mkdirSync(escritorio, { recursive: true });
    fs.writeFileSync(path.join(escritorio, 'Informe para tu tutor.txt'), `\ufeff${informe}`, 'utf8');
  } catch (error) {
    anotar(`AVISO: no he podido dejar el informe en el escritorio (${error.message}).`);
  }
}

// Se puede cargar sin instalar nada, para probar sus pasos sueltos en una
// carpeta de mentira (`humo.js`).
module.exports = { ajustesDelEditor, controlRemoto, asistentesDe, registro };

if (require.main === module) {
  main().catch((error) => {
    anotar(`ERROR sin recoger: ${error && error.stack ? error.stack : error}`);
    motivo = motivo || `ha pasado algo que no esperaba (${error && error.message ? error.message : error})`;
    terminar(false, argumento('asistente', 'claude'));
  });
}
