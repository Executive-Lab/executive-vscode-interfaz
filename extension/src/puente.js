// El puente hasta el asistente, sea cual sea.
//
// Qué asistente es y qué permite cada uno está en `asistentes.js`. Aquí solo
// está el orden en que se intenta hablarle:
//
//   0. Con Codex, su programa, con el encargo, en una pestaña (decisión 206).
//   1. Su enlace profundo, si la extensión que lo recoge está instalada.
//   2. Un comando suyo que acepte texto.
//   3. El portapapeles, avisando de que ha hecho falta.
//
// El orden de los dos primeros está medido, no supuesto: ver `enviar`.
//
// Y antes de los tres, un encargo que no cabe se deja en un fichero de la carpeta
// y se manda la línea que lo nombra (decisión 166, en `cabeEntero`).
//
// El paso 3 no es un fallo silencioso: si se llega ahí, el alumno lo sabe y
// queda anotado en el canal de salida, porque significa que algo ha cambiado
// en la extensión del asistente.

const vscode = require('vscode');
const asistentes = require('./asistentes');

async function comandosDisponibles() {
  return vscode.commands.getCommands(true);
}

async function primeroDisponible(candidatos) {
  if (!candidatos || !candidatos.length) return null;
  const hay = await comandosDisponibles();
  return candidatos.find((c) => hay.includes(c)) || null;
}

async function ejecutarSiExiste(candidatos) {
  const hay = await comandosDisponibles();
  for (const comando of candidatos || []) {
    if (!hay.includes(comando)) continue;
    try {
      await vscode.commands.executeCommand(comando);
      return true;
    } catch { /* el siguiente comando compatible, si lo hay */ }
  }
  return false;
}

// OJO con esto: en Claude, `claude-vscode.focus` no pone el cursor en la caja.
// Coge lo seleccionado en el editor, lo convierte en una mención y se la
// entrega a una conversación — y si ninguna puede cogerla, ABRE OTRA. Así que
// no se llama después de mandar un texto: ver `enviar`.
const darFoco = () => ejecutarSiExiste(asistentes.elDeAhora().foco);

// Abre su chat sin texto: al arrancar, para que el alumno lo tenga delante.
const abrirConversacion = () => ejecutarSiExiste(asistentes.elDeAhora().abrir);

// Abre el chat de un asistente concreto, sin texto (decisión 178: Codex, aunque se hable con otro).
const abrirEste = (asistente) => ejecutarSiExiste(asistente.abrir);

// Una conversación vacía, para empezar otra cosa (decisión 139). Devuelve si se
// ha podido abrir así; si no, quien llama abre la de siempre y lo explica. Con
// los dos en la carpeta, quien llama dice con cuál (decisión 206).
const conversacionNueva = (quien = asistentes.elDeAhora()) => ejecutarSiExiste(quien.nueva);

// ── Con Codex, que se ponga a trabajar (decisión 206) ────────────────────
//
// Jose, 25-11-2026: «Quiero que en codex también lo puedas ejecutar tú y abrirlo
// tú, no que copies un mensaje en el portapapeles». Su barra no deja escribirle
// (`asistentes.js`), pero su programa acepta el encargo al arrancar. Se abre en
// una pestaña del editor, en la carpeta, y empieza a trabajar; ahí se ve lo que
// hace y se le contesta. Un encargo, una pestaña: varios van a la vez.
//
// El encargo va detrás de `--`: así uno que empiece por guiones no se toma por
// una opción suya. Delante, las opciones con que ese programa arranca
// (`asistentes.arranqueDeCodex` dice por qué el de su extensión lleva una). Se
// le pasa como argumento, sin pasar por ningún intérprete de órdenes
// (`programaEnElPath` lo explica para Windows). Al volver a abrir el
// editor la pestaña no se recupera: el programa ya no estaría.
//
// ── Y mejor, en su panel (decisión 207) ──────────────────────────────────
//
// Jose, 25-11-2026: «no me refiero a que despliegues terminal, sino esto de codex
// new agent que permite dos ventanas en vscode». Su panel («New Codex Agent») no
// deja que nadie le escriba: su orden no recibe texto y su pantalla de inicio no
// lee nada de la dirección (leído en openai.chatgpt 26.1120.50957). Pero abre una
// conversación ya empezada por su número, `openai-codex://route/local/<número>`,
// con su propio editor, `chatgpt.conversationEditor`: es lo que hace su lista de
// conversaciones. Y su programa, sin pantalla (`exec --json`), empieza una con el
// encargo y lo primero que suelta es ese número. Las dos partes comparten las
// conversaciones (`~/.codex`): probado con el Codex de Jose el 25-11-2026.
//
// Así que: su programa empieza el encargo por detrás, en la carpeta, y cuando
// acaba se abre esa conversación en un panel suyo, entera. Un encargo, un panel:
// varios a la vez. `workspace-write`: puede tocar lo de la carpeta, nada fuera;
// sin pantalla no hay a quién preguntarle, así que no se le deja más. Lo que se
// le diga después, en su panel, va con lo que tenga puesto esa persona.
//
// Al acabar, y no al empezar: probado el 26-11-2026 con el Codex de Jose,
// haciendo lo mismo que su panel (`thread/resume` en un `app-server`) mientras
// su programa hacía un encargo de 30 segundos. Al dar el número, «no rollout
// found»: aún no está en el disco. A medias, a otro panel, «already has an
// active writer»: la tiene su programa. Y a lo largo del encargo no llega nada:
// no se ve en vivo. Al acabar, llega entera. Mientras, la barra de abajo dice que
// está con ello.
//
// Si no da el número a tiempo (sin cuenta, sin red, un programa que no conoce
// `exec`), la pestaña de la 206, que enseña lo que pasa y deja contestarle. Y si
// Codex está en el ordenador pero no en el editor, también: no hay panel donde
// verlo, y por detrás trabajaría sin que nadie lo viera.
const PANEL_DE_CODEX = 'chatgpt.conversationEditor';
const conversacionDeCodex = (numero) => vscode.Uri.parse(`openai-codex://route/local/${encodeURIComponent(numero)}`);
const ESPERA_AL_NUMERO = 30000;
// Se cambia en las pruebas: un programa fingido que suelta lo que el de verdad.
const codexPorDetras = {
  lanzar: (programa, args, opciones) => require('node:child_process').spawn(programa, args, { ...opciones, stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true }),
};

// Empieza el encargo. Devuelve `numero`, que da el de la conversación o null, y
// `acabado`, que se cumple cuando su programa ha terminado.
function empezarPorDetras(programa, texto, salida) {
  let alAcabar;
  const acabado = new Promise((r) => { alAcabar = r; });
  const numero = new Promise((resolver) => {
    let hijo;
    let hecho = false;
    const acabar = (n) => {
      if (hecho) return;
      hecho = true;
      clearTimeout(reloj);
      resolver(n);
    };
    const reloj = setTimeout(() => {
      if (salida) salida.appendLine('[puente] Codex no ha dado el número de la conversación a tiempo'); // diccionario: interno
      try { hijo.kill(); } catch { /* ya no estaba */ }
      acabar(null);
    }, ESPERA_AL_NUMERO);
    try {
      hijo = codexPorDetras.lanzar(programa, ['exec', '--json', '-s', 'workspace-write', '--', texto], { cwd: require('./proyecto').raiz() });
    } catch (error) {
      if (salida) salida.appendLine(`[puente] Codex no ha arrancado por detrás: ${error.message}`); // diccionario: interno
      acabar(null);
      alAcabar(null);
      return;
    }
    hijo.on('error', (error) => {
      if (salida) salida.appendLine(`[puente] Codex no ha arrancado por detrás: ${error.message}`); // diccionario: interno
      acabar(null);
      alAcabar(null);
    });
    // `close` y no `exit`: llega cuando ya se ha leído todo lo que dijo. Uno que
    // suelta el número y acaba en seguida podía acabar antes de leerse el número.
    hijo.on('close', (codigo) => {
      if (salida) salida.appendLine(`[puente] Codex ha acabado por detrás (${codigo})`); // diccionario: interno
      acabar(null);
      alAcabar(codigo);
    });
    require('node:readline').createInterface({ input: hijo.stdout }).on('line', (linea) => {
      let suceso;
      try { suceso = JSON.parse(linea); } catch { return; }
      if (suceso && suceso.type === 'thread.started' && typeof suceso.thread_id === 'string' && suceso.thread_id) acabar(suceso.thread_id);
    });
    // Lo que diga por el otro canal no se enseña, pero tampoco se deja llenar.
    if (hijo.stderr) hijo.stderr.resume();
  });
  return { numero, acabado };
}

// Al acabar, su conversación en un panel suyo. Si no se abre, queda en su lista
// de conversaciones.
async function abrirSuPanel(numero, salida) {
  try {
    await vscode.commands.executeCommand('vscode.openWith', conversacionDeCodex(numero), PANEL_DE_CODEX, { viewColumn: vscode.ViewColumn.Active, preview: false });
    if (salida) salida.appendLine(`[puente] La conversación de Codex, en su panel: ${numero}`); // diccionario: interno
  } catch (error) {
    if (salida) salida.appendLine(`[puente] Codex ha acabado, pero su panel no se ha abierto: ${error.message}`); // diccionario: interno
  }
}

async function ponerACodex(texto, salida) {
  const arranque = asistentes.arranqueDeCodex();
  if (!arranque) return null;
  if (!asistentes.estaInstalado(asistentes.porId('codex'))) return enSuPestana(arranque, texto, salida);
  const trabajo = empezarPorDetras(arranque.programa, texto, salida);
  const numero = await trabajo.numero;
  if (!numero) return enSuPestana(arranque, texto, salida);
  // Con el número, el encargo ya está en marcha: si algo falla después, no se
  // abre además la pestaña, que lo haría dos veces. Acabe bien o mal, lo que haya
  // pasado está en su conversación.
  vscode.window.withProgress({ location: vscode.ProgressLocation.Window, title: 'Codex está con ello' }, () => trabajo.acabado);
  trabajo.acabado.then(() => abrirSuPanel(numero, salida));
  return 'porDetras';
}

// La pestaña de la 206.
function enSuPestana({ programa, opciones }, texto, salida) {
  try {
    const pestana = vscode.window.createTerminal({
      name: 'Codex',
      shellPath: programa,
      shellArgs: [...opciones, '--', texto],
      cwd: require('./proyecto').raiz(),
      location: vscode.TerminalLocation.Editor,
      isTransient: true,
    });
    pestana.show();
    if (salida) salida.appendLine(`[puente] Codex trabaja en una pestaña: ${programa}`); // diccionario: interno
    return 'trabajando';
  } catch (error) {
    if (salida) salida.appendLine(`[puente] Codex no se ha podido abrir en una pestaña: ${error.message}`); // diccionario: interno
    return null;
  }
}

// Manda un texto. Devuelve 'directo' si ha llegado a su caja, 'trabajando' si
// Codex ya está con ello en una pestaña, 'porDetras' si lo hace su programa y su
// panel se abre al acabar (decisión 207), y 'copiado' si hubo que dejarlo en el
// portapapeles.
//
// «Directo» quiere decir que el texto está escrito en su caja, no que se haya
// enviado: Claude lo deja puesto y ya (`setInputText`). Lo manda la persona.
// Quien lea esto y se sienta tentado de prometer más, que mire cómo lo cuenta
// la barra.
//
// ── Por qué el enlace va PRIMERO y los comandos de repuesto ──────────────
//
// Al revés no funciona, y costó tres intentos averiguarlo. Medido en la
// máquina de Jose el 19 de septiembre de 2026, con Claude Code 2.1.276:
//
//   · `vscode://anthropic.claude-code/open?prompt=…`  →  el texto aparece.
//   · `claude-vscode.editor.open(undefined, texto)`   →  conversación vacía.
//   · `claude-vscode.primaryEditor.open(íd.)`         →  conversación vacía.
//
// Y eso que el propio manejador del enlace hace `primaryEditor.open(sesión,
// texto)`, o sea lo mismo que hacíamos nosotros. La diferencia está dentro de
// su ventana: al arrancar decide qué hacer y hay caminos —una conversación ya
// abierta, o el control remoto— que se quedan con la sesión y **tiran el texto
// por el camino**. El enlace entra por donde ellos lo prueban, así que es el
// que se usa.
//
// Los comandos se quedan detrás por si un día el enlace deja de recogerse, y
// porque en una máquina sin su extensión no hay ni una cosa ni la otra.
//
// Y nada de enfocar después. Ver `darFoco`: eso abría una conversación nueva
// vacía encima de la que acababa de recibir el texto.
// ── Un encargo largo, en Windows, por el portapapeles ─────────────────
//
// (Desde la decisión 166 esto es el repuesto: primero se deja en un fichero,
// abajo. Se llega aquí solo si eso no se puede.)
//
// El enlace lleva el texto dentro de la URL, y en Windows `ShellExecute` corta
// las URL sobre los 2.048 caracteres. Si VS Code manda allí su propia URL por el
// sistema, el encargo de ordenar 120 claves —8.448 caracteres— llegaría a medias,
// y `openExternal` diría que sí igual. No se pudo medir sin una persona delante
// (decisión 129), así que se va a lo seguro: en Windows, lo que no cabe va por el
// portapapeles, que no tiene límite. Los comandos no valen para esto: abren una
// conversación vacía y tiran el texto (arriba).
const CABE_EN_UNA_URL_DE_WINDOWS = 2000;
const cabeEnElEnlace = (uri, plataforma = process.platform) => plataforma !== 'win32' || String(uri).length <= CABE_EN_UNA_URL_DE_WINDOWS;

// ── Y mejor que el portapapeles, un fichero (decisión 166) ───────────────
//
// El portapapeles pide pegar, y un encargo de 8.448 caracteres en la caja no se
// lee. Así que lo que no cabe se deja en un fichero de la carpeta que no entra en
// git (`pedidos.dejarUnEncargo`), y se manda una sola línea que lo nombra. Igual
// en el Mac que en Windows, y con Codex igual que con Claude: se mide como si
// fuera el enlace de Claude, que es el que tiene tope. Así lo que pasa en Windows
// se ve todos los días en un Mac.
//
// Lo que entra en el fichero se tapa como el informe de «Algo va mal», que vive
// al lado (`conexiones.taparClaves`). Si no se puede dejar —sin el bloque de la
// barra en el `.gitignore`, sin `02-DOCS`, con un enlace en el camino—, todo
// sigue como antes: en Windows al portapapeles, y en lo demás por el enlace.
function cabeEntero(texto) {
  const claude = asistentes.porId('claude');
  return cabeEnElEnlace(`${claude.enlace}?${claude.parametro}=${encodeURIComponent(texto)}`, 'win32');
}

async function dejarloEnUnFichero(texto, salida) {
  const apuntar = (linea) => { if (salida) salida.appendLine(`[puente] encargo largo: ${linea}`); }; // diccionario: interno
  let limpio;
  try {
    limpio = require('./conexiones').taparClaves(texto);
  } catch (error) {
    // Sin poder taparlo, no se escribe en la carpeta.
    apuntar(`no lo dejo en un fichero, no se ha podido tapar: ${error.message}`);
    return null;
  }
  const hecho = await require('./pedidos').dejarUnEncargo(require('./proyecto').raiz(), limpio);
  if (!hecho.ok) {
    apuntar(`no lo dejo en un fichero (${hecho.motivo})`);
    return null;
  }
  apuntar(`en ${hecho.ruta}`);
  return require('./pedidos').laLinea(hecho.ruta);
}

// Al portapapeles, y se abre la conversación para pegarlo. Se dice por qué: no es
// lo mismo un asistente al que no se le puede escribir que un texto largo.
async function alPortapapeles(quien, texto, salida, porLargo = false, plataforma = process.platform) {
  await vscode.env.clipboard.writeText(texto);
  await abrirConversacion();
  if (salida) salida.appendLine(`[puente] ${porLargo ? 'encargo largo en Windows' : `sin canal directo con ${quien.nombre}`}: al portapapeles`); // diccionario: interno
  const pegar = plataforma === 'darwin' ? 'Cmd+V' : 'Ctrl+V';
  vscode.window.showWarningMessage(porLargo
    ? `Es un texto largo: te lo he copiado para que llegue entero. Pégalo con ${pegar} en la caja de ${quien.nombre} y dale a enviar.`
    : `Con ${quien.nombre} no puedo escribirle yo. Te lo he copiado: pégalo con ${pegar} en su caja y dale a enviar.`);
  return 'copiado';
}

// `plataforma` es para las pruebas: así se prueba lo de Windows desde cualquier máquina.
async function enviar(texto, salida, { plataforma = process.platform } = {}) {
  // ── Nada de abrir una conversación con la caja vacía ────────────────────
  //
  // Ya pasó una vez y costó tres versiones: un botón mandaba `undefined` y esa
  // palabra acabó escrita en la caja de Claude. Hay una prueba que vigila que
  // ningún botón mande texto vacío, pero eso cuida el lado de quien llama.
  // Aquí es donde se sabe de verdad, y donde no cuesta nada negarse: abrir una
  // conversación en blanco deja a alguien mirando un cursor sin saber por qué.
  if (!String(texto || '').trim()) {
    if (salida) salida.appendLine('[puente] no mando nada: el texto venía vacío'); // diccionario: interno
    return 'vacio';
  }

  // Lo que no cabe, a un fichero, y se manda la línea que lo nombra (arriba).
  if (!cabeEntero(texto)) texto = await dejarloEnUnFichero(texto, salida) || texto;

  const quien = asistentes.elDeAhora();

  // Con Codex, su programa, ya trabajando (arriba).
  if (quien.id === 'codex') {
    const trabajando = await ponerACodex(texto, salida);
    if (trabajando) return trabajando;
  }

  // openExternal dice que sí en cuanto entrega la URI, sin mirar si alguien la
  // recoge: por eso se comprueba antes que su extensión está instalada.
  if (quien.enlace && asistentes.estaInstalado(quien)) {
    const uri = `${quien.enlace}?${quien.parametro}=${encodeURIComponent(texto)}`;
    if (!cabeEnElEnlace(uri, plataforma)) return alPortapapeles(quien, texto, salida, true, plataforma);
    try {
      if (await vscode.env.openExternal(vscode.Uri.parse(uri))) return 'directo';
    } catch (error) {
      if (salida) salida.appendLine(`[puente] el enlace ha fallado: ${error.message}`); // diccionario: interno
    }
  }

  const hay = await comandosDisponibles();
  for (const comando of quien.envio) {
    if (!hay.includes(comando)) continue;
    try {
      await vscode.commands.executeCommand(comando, undefined, texto);
      return 'directo';
    } catch (error) {
      if (salida) salida.appendLine(`[puente] ${comando} ha fallado: ${error.message}`); // diccionario: interno
    }
  }

  return alPortapapeles(quien, texto, salida, false, plataforma);
}

// Vuelca lo que hay. Sirve para saber qué expone cada asistente sin leer código.
async function diagnostico(salida) {
  const hay = await comandosDisponibles();
  salida.clear();

  for (const quien of asistentes.ASISTENTES) {
    const suyos = hay.filter((c) => c.startsWith(`${quien.id === 'claude' ? 'claude-vscode' : 'chatgpt'}.`)).sort();
    salida.appendLine(`=== ${quien.nombre} (${quien.extension}) ===`);
    salida.appendLine(`  instalado: ${asistentes.estaInstalado(quien) ? 'sí' : 'no'}`);
    salida.appendLine(`  envío:     ${(await primeroDisponible(quien.envio)) || 'NINGUNO — irá al portapapeles'}`);
    salida.appendLine(`  abrir:     ${(await primeroDisponible(quien.abrir)) || 'ninguno'}`);
    salida.appendLine(`  foco:      ${(await primeroDisponible(quien.foco)) || 'ninguno'}`);
    salida.appendLine(`  comandos que expone (${suyos.length}):`);
    suyos.forEach((c) => salida.appendLine(`    ${c}`));
    salida.appendLine('');
  }

  const ahora = asistentes.elDeAhora();
  salida.appendLine(`El arnés de esta carpeta habla con: ${ahora.nombre}`);
  salida.show(true);
}

module.exports = { enviar, darFoco, abrirConversacion, abrirEste, conversacionNueva, diagnostico, primeroDisponible, cabeEnElEnlace, cabeEntero, codexPorDetras };
