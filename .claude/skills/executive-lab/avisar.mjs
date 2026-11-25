#!/usr/bin/env node
// Te aviso cuando el asistente termina o te necesita (decisión 162).
//
// Un alumno pide algo largo y se va a otra ventana. Claude se queda esperando a
// que le diga sí a algo, o termina, y no se entera nadie. Claude avisa con su
// enganche `Notification` (code.claude.com/docs/en/hooks), y este guion lo
// convierte en un aviso del sistema, corto y en español:
//
//   · `permission_prompt`: «Claude te está preguntando algo en «Contabilidad».»
//     En el editor sale unos seis segundos después de que pregunte.
//   · `idle_prompt`: «Claude ha terminado en «Contabilidad».» Sale un minuto
//     después de terminar, si no se ha escrito nada desde entonces.
//   · `elicitation_dialog` y `elicitation_url_dialog` (decisión 182): un servicio
//     conectado (MCP) pide rellenar un formulario o abrir una página, y llevas unos
//     seis segundos sin escribir. «Claude necesita que rellenes algo en «Contabilidad».»
//     y «Claude necesita que abras una página en «Contabilidad».»
//
// Y con Codex (decisión 171), que lo lanza su `notify` del `config.toml` de usuario
// (learn.chatgpt.com/docs/config-file/config-advanced): el JSON no llega por la
// entrada sino como último argumento, y solo hay un evento, `agent-turn-complete`:
//
//   · «Codex ha terminado en «Contabilidad».» Sale al acabar cada respuesta.
//
// Ese JSON trae también lo que la persona le escribió y lo que contestó el
// asistente (`input-messages`, `last-assistant-message`): aquí no se mira ni se
// enseña. Solo el tipo y `cwd`. Y como el `notify` vale para todas las
// conversaciones de Codex, también las de fuera de la barra, solo avisa si `cwd`
// está dentro de una carpeta que montó la barra (con su `.rsc.json`).
//
// Con Claude, además, apunta el `session_id` de ese JSON (decisión 191), solo el id
// y la hora, en `.rsc/executive-lab-ultima-conversacion.json` de la carpeta: es lo
// que usa «Volver a la última conversación» (`vscode://anthropic.claude-code/open?session=`,
// code.claude.com/docs/en/vs-code). Ni una palabra de la conversación.
//
// Cualquier otro tipo, o una entrada que no se entiende, no avisa de nada.
//
// Lo engancha la barra en `.claude/settings.local.json` de sus carpetas
// (`ajustes-locales.js`), como el freno: `node` a secas, que lo encuentra el
// relevo aunque en el ordenador no haya ninguno, y la carpeta entre comillas.
//
// Cómo se avisa, sin instalar nada:
//   · Mac: `osascript` con `display notification`.
//   · Windows: PowerShell con la burbuja de `System.Windows.Forms.NotifyIcon`, que
//     Windows 10 y 11 enseñan como sus avisos. Va suelto: la burbuja tiene que
//     vivir unos segundos, y el asistente no espera por ella.
//   · Linux: `notify-send`, si está.
//
// El nombre de la carpeta lo elige la persona y puede traer comillas. Nunca se
// pega dentro de un guion: a `osascript` le llega como argumento y a PowerShell
// en una variable de entorno, así que no se interpreta como orden.
//
// Y nunca bloquea ni falla: sale siempre con 0, y todo lleva tope de tiempo.
//
//   argv[2] = la carpeta del proyecto   stdin = el JSON del enganche (Notification)
import { execFile, spawn } from 'node:child_process';
import { existsSync, lstatSync, renameSync, writeFileSync } from 'node:fs';
import { basename, dirname, join } from 'node:path';

export const TITULO = 'Executive Lab';

// Lo que dice cada tipo, con el nombre de la carpeta o sin él.
const QUE_DICE = {
  permission_prompt: (donde) => (donde ? `Claude te está preguntando algo en «${donde}».` : 'Claude te está preguntando algo.'),
  idle_prompt: (donde) => (donde ? `Claude ha terminado en «${donde}».` : 'Claude ha terminado.'),
  elicitation_dialog: (donde) => (donde ? `Claude necesita que rellenes algo en «${donde}».` : 'Claude necesita que rellenes algo.'),
  elicitation_url_dialog: (donde) => (donde ? `Claude necesita que abras una página en «${donde}».` : 'Claude necesita que abras una página.'),
  'agent-turn-complete': (donde) => (donde ? `Codex ha terminado en «${donde}».` : 'Codex ha terminado.'),
};

// La carpeta de la barra que contiene `cwd`, o '' si no está en ninguna. Sube como
// mucho unos niveles: Codex puede estar en una subcarpeta.
export function laCarpetaDeLaBarra(cwd) {
  if (typeof cwd !== 'string' || !cwd.trim() || cwd.length > 4096) return '';
  let dir = cwd.trim();
  for (let i = 0; i < 8; i += 1) {
    try { if (existsSync(join(dir, '.rsc.json'))) return dir; } catch { /* sigue */ }
    const arriba = dirname(dir);
    if (arriba === dir) break;
    dir = arriba;
  }
  return '';
}

// Lo que manda Codex: un JSON como último argumento, con `type`. Si el último
// argumento no es eso (el enganche de Claude pasa la carpeta), null.
export function laEntradaDeCodex(argv = process.argv) {
  if (argv.length < 3) return null;
  const ultimo = argv[argv.length - 1];
  if (typeof ultimo !== 'string' || ultimo.length > 256 * 1024 || !ultimo.trimStart().startsWith('{')) return null;
  try {
    const datos = JSON.parse(ultimo);
    return datos && typeof datos === 'object' && typeof datos.type === 'string' ? { type: datos.type, cwd: datos.cwd } : null;
  } catch {
    return null;
  }
}

// Milisegundos: lo que se espera a la entrada, al programa que avisa y a todo.
export const TOPE = { entrada: 1500, programa: 4000, todo: 6000 };

const LARGO_MAXIMO = 60;

// El nombre de la carpeta, limpio: sin saltos ni caracteres de control, sin los
// que dan la vuelta al texto, y corto. El primero que sirva.
export function elNombre(...candidatos) {
  for (const candidato of candidatos) {
    if (typeof candidato !== 'string' || !candidato.trim() || candidato.includes('${')) continue;
    const limpio = basename(candidato.trim().replace(/[\\/]+$/, ''))
      .replace(/[\u0000-\u001f\u007f-\u009f\u200e\u200f\u202a-\u202e\u2066-\u2069]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    if (!limpio) continue;
    return limpio.length > LARGO_MAXIMO ? `${limpio.slice(0, LARGO_MAXIMO - 1)}…` : limpio;
  }
  return '';
}

// El texto del aviso, o null si no hay que avisar de nada.
export function elTexto(entrada, carpeta = '') {
  if (!entrada || typeof entrada !== 'object') return null;
  // Codex: solo en lo de la barra, y con el nombre de esa carpeta.
  if (entrada.type === 'agent-turn-complete') {
    const mia = laCarpetaDeLaBarra(entrada.cwd);
    return mia ? QUE_DICE['agent-turn-complete'](elNombre(mia)) : null;
  }
  const decir = entrada.notification_type !== 'agent-turn-complete' && Object.prototype.hasOwnProperty.call(QUE_DICE, entrada.notification_type) ? QUE_DICE[entrada.notification_type] : null;
  return decir ? decir(elNombre(carpeta, process.env.CLAUDE_PROJECT_DIR, entrada.cwd)) : null;
}

// El id de una conversación de Claude: lo que se apunta acaba en un enlace.
export const ID_VALIDO = /^[A-Za-z0-9_-]{6,64}$/;
export const DONDE_SE_APUNTA = ['.rsc', 'executive-lab-ultima-conversacion.json'];

// Apunta el id de la última conversación en la carpeta de la barra. Devuelve true si
// lo dejó escrito. Sin carpeta de la barra, sin id válido o con un enlace por medio,
// no escribe nada.
export function apuntarLaUltima(entrada, carpeta, ahora = new Date()) {
  try {
    if (!entrada || typeof entrada !== 'object' || !Object.prototype.hasOwnProperty.call(QUE_DICE, entrada.notification_type)) return false;
    if (entrada.notification_type === 'agent-turn-complete') return false;
    const id = entrada.session_id;
    if (typeof id !== 'string' || !ID_VALIDO.test(id)) return false;
    if (typeof carpeta !== 'string' || !carpeta.trim() || carpeta.length > 4096 || !existsSync(join(carpeta.trim(), '.rsc.json'))) return false;
    const dir = join(carpeta.trim(), DONDE_SE_APUNTA[0]);
    // Sin `.rsc/` no se apunta: crearla haría que RSC dejara de reponer las marcas del equipo (revisión de la 177).
    try { if (!lstatSync(dir).isDirectory()) return false; } catch { return false; }
    const fichero = join(dir, DONDE_SE_APUNTA[1]);
    try { if (lstatSync(fichero).isSymbolicLink()) return false; } catch { /* no está: se crea */ }
    const temporal = `${fichero}.${process.pid}.tmp`;
    writeFileSync(temporal, `${JSON.stringify({ id, cuando: ahora.toISOString() })}\n`);
    renameSync(temporal, fichero);
    return true;
  } catch {
    return false;
  }
}

// El de Windows, fijo y solo en ASCII: PowerShell 5.1 lee mal lo demás. El
// título y el texto llegan en dos variables de entorno.
export const GUION_DE_WINDOWS = [
  "$ErrorActionPreference = 'Stop'",
  'Add-Type -AssemblyName System.Windows.Forms',
  'Add-Type -AssemblyName System.Drawing',
  '$aviso = New-Object System.Windows.Forms.NotifyIcon',
  'try {',
  '  $aviso.Icon = [System.Drawing.SystemIcons]::Information',
  "  $aviso.Text = 'Executive Lab'",
  '  $aviso.BalloonTipIcon = [System.Windows.Forms.ToolTipIcon]::Info',
  '  $aviso.BalloonTipTitle = $env:EXECUTIVE_LAB_AVISO_TITULO',
  '  $aviso.BalloonTipText = $env:EXECUTIVE_LAB_AVISO_TEXTO',
  '  $aviso.Visible = $true',
  '  $aviso.ShowBalloonTip(8000)',
  '  Start-Sleep -Seconds 8',
  '} finally {',
  '  $aviso.Dispose()',
  '}',
].join('\r\n');

// Lo que se lanza en cada sistema: { programa, args, env?, suelto? }, o null.
export function laOrden(plataforma, titulo, texto) {
  if (plataforma === 'darwin') {
    // El guion es fijo; el título y el texto le llegan como argumentos.
    return {
      programa: 'osascript',
      args: ['-e', 'on run argv', '-e', 'display notification (item 2 of argv) with title (item 1 of argv)', '-e', 'end run', titulo, texto],
    };
  }
  if (plataforma === 'win32') {
    return {
      programa: 'powershell.exe',
      args: ['-NoProfile', '-NonInteractive', '-WindowStyle', 'Hidden', '-EncodedCommand', Buffer.from(GUION_DE_WINDOWS, 'utf16le').toString('base64')],
      env: { EXECUTIVE_LAB_AVISO_TITULO: titulo, EXECUTIVE_LAB_AVISO_TEXTO: texto },
      suelto: true,
    };
  }
  // notify-send lee marcado en el texto: un nombre con < o & saldría como enlace o roto.
  const sinMarcado = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  if (plataforma === 'linux') return { programa: 'notify-send', args: ['--', titulo, sinMarcado(texto)] };
  return null;
}

// Lanza la orden sin shell. Lo que no está o falla, se calla.
function lanzarDeVerdad(orden) {
  return new Promise((listo) => {
    try {
      const env = { ...process.env, ...(orden.env || {}) };
      if (orden.suelto) {
        const hijo = spawn(orden.programa, orden.args, { env, detached: true, stdio: 'ignore', windowsHide: true });
        hijo.on('error', () => {});
        hijo.unref();
        listo();
        return;
      }
      execFile(orden.programa, orden.args, { env, timeout: TOPE.programa, windowsHide: true }, () => listo());
    } catch {
      listo();
    }
  });
}

// Lo de dentro, para las pruebas: con la entrada ya leída y el lanzador que se dé.
export async function avisar({ entrada, carpeta = '', plataforma = process.platform, lanzar = lanzarDeVerdad } = {}) {
  const texto = elTexto(entrada, carpeta);
  if (!texto) return null;
  apuntarLaUltima(entrada, carpeta);
  const orden = laOrden(plataforma, TITULO, texto);
  if (!orden) return null;
  await lanzar(orden);
  return orden;
}

// Lo que manda Claude por la entrada, con su tope: si no llega entero, nada.
function leerLaEntrada() {
  return new Promise((listo) => {
    let texto = '';
    const acabar = () => {
      clearTimeout(reloj);
      try { process.stdin.destroy(); } catch { /* ya estaba */ }
      try { listo(JSON.parse(texto)); } catch { listo(null); }
    };
    const reloj = setTimeout(() => { texto = ''; acabar(); }, TOPE.entrada);
    try {
      process.stdin.setEncoding('utf8');
      process.stdin.on('data', (trozo) => { texto += trozo; if (texto.length > 64 * 1024) { texto = ''; acabar(); } });
      process.stdin.on('end', acabar);
      process.stdin.on('error', acabar);
    } catch {
      acabar();
    }
  });
}

// Solo cuando lo corre el enganche, no cuando lo carga una prueba.
if (/(^|[\\/])avisar\.mjs$/.test(process.argv[1] || '')) {
  const salir = () => process.exit(0);
  process.on('uncaughtException', salir);
  process.on('unhandledRejection', salir);
  setTimeout(salir, TOPE.todo).unref();
  try {
    // Con Codex, el JSON va en los argumentos y no hay nada que esperar en la entrada.
    const deCodex = laEntradaDeCodex();
    await avisar(deCodex ? { entrada: deCodex } : { entrada: await leerLaEntrada(), carpeta: process.argv[2] || '' });
  } catch {
    // Un aviso que no sale no es un fallo del asistente.
  }
  salir();
}
