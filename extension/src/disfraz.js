// El disfraz: los ajustes que hacen que VS Code deje de parecer VS Code.
//
// Dos capas, y la distinción importa:
//
//   · La BASE va a los ajustes de usuario. La escribe el instalador antes del
//     primer arranque, desde `instalador/comun/ajustes-del-editor.js`, y no
//     vive en `disfraz.json` (decisión 163). Ahí van las cosas que solo se
//     pueden fijar para todo el programa: la confianza del workspace, las
//     actualizaciones, la telemetría, la vista enfocada de Claude.
//
//   · El INTERRUPTOR es por ventana. "Ver el editor completo" escribe, en el
//     .vscode/settings.json de la carpeta abierta, los valores de fábrica de
//     lo que se ve — barra de actividad, barra de estado, pestañas, menú,
//     ficheros ocultos, colores— y así esa ventana deja de estar disfrazada
//     sin tocar las demás. "Modo sencillo" los borra.
//
// Regalo añadido: si una clave no la ha registrado ninguna extensión, o no
// admite el ámbito que le pedimos, VS Code la rechaza. Lo anotamos en el canal
// de salida en vez de suponer.

const vscode = require('vscode');
const fs = require('node:fs');
const path = require('node:path');
const proyecto = require('./proyecto');
const identidad = require('./identidad');

const CLAVE_ESTADO = 'disfraz';
const VERSION = 2;

// Estas no admiten ámbito de carpeta: VS Code las declara de ámbito de
// programa, así que valen para todas las ventanas a la vez. **Las pone el
// instalador**, una vez, en la máquina del alumno, donde solo hay una empresa
// y eso es lo correcto.
//
// La extensión no las toca nunca. En la máquina de quien desarrolla —o de
// cualquiera que use VS Code para otras cosas— cambiarlas le altera todas las
// ventanas, que es justo lo que no queremos.
//
// Ya no están en `disfraz.json`: viven con el instalador (decisión 163). La
// lista se queda de guarda, por si alguien las vuelve a poner aquí.
const SOLO_DEL_INSTALADOR = [
  'security.workspace.trust.enabled',
  'update.mode',
  'update.showReleaseNotes',
  'telemetry.telemetryLevel',
  'extensions.ignoreRecommendations',
];

// Lo que el interruptor quita: TODO lo que el modo sencillo escribió en esta
// carpeta. Se BORRA la clave, no se escribe el valor de fábrica encima.
//
// Escribirlo encima era lo de antes y estaba mal: en la carpeta de quien
// desarrolla —un repositorio cualquiera, abierto con la extensión puesta— el
// editor completo le dejaba escrito en su .vscode/settings.json el tema, el
// minimapa, las pestañas y el rótulo de la ventana. Sus preferencias pisadas
// por "los valores de fábrica" en su propio proyecto. Borrando la clave manda
// lo que esa persona tenga puesto, que es lo correcto.
//
// Las de ámbito de programa no entran: la extensión no las escribe nunca.
//
// Y sí entra lo que la vista sencilla escribía en la carpeta y ahora va en los
// ajustes de usuario (decisión 163): una carpeta de antes lo puede tener, y si
// no se quita de aquí se queda escrito para siempre (lo que pasó con el zoom,
// decisión 71).
const YA_NO_VAN_EN_LA_CARPETA = ['claudeCode.hideOnboarding'];
const clavesDeLaCarpeta = (contexto) => [
  ...Object.keys(ajustes(contexto)).filter((c) => !SOLO_DEL_INSTALADOR.includes(c)),
  ...YA_NO_VAN_EN_LA_CARPETA,
];

function ajustes(contexto) {
  const base = JSON.parse(fs.readFileSync(path.join(contexto.extensionPath, 'media', 'disfraz.json'), 'utf8'));
  return { ...base, ...laCaraDeLaEmpresa() };
}

// ── El disfraz también se pone la cara de la empresa ──────────────────────
//
// El disfraz traía un tema CLARO fijo y el rótulo "Mi Empresa — Executive Lab".
// Jose, con su carpeta de Asesoría Norte: *«he vuelto al modo sencillo y me
// carga los putos colores de executivelab»*. Y era verdad, literalmente: su
// marca es azul marino y el modo sencillo le encendía un editor blanco con
// nuestro nombre en la ventana.
//
// La barra ya se pintaba con su marca. Lo que faltaba es que el resto de la
// ventana —el tema, los bordes, el título— hiciera lo mismo, porque si no la
// barra es una isla de su empresa dentro de una ventana de la nuestra.
//
// Si no hay marca, se queda lo de siempre, que es el default correcto.
function laCaraDeLaEmpresa() {
  let suya = null;
  let comoSeLlama = null;
  try {
    suya = require('./marca').leer();
    comoSeLlama = require('./identidad').titulo();
  } catch {
    return {};
  }
  if (!suya || !suya.tokens) {
    return comoSeLlama ? { 'window.title': `${comoSeLlama} — \${activeEditorShort}` } : {};
  }

  const t = suya.tokens;
  return {
    // El tema del editor, del lado que sea la marca. Un tema claro detrás de
    // una barra azul marino es lo que Jose estaba viendo.
    'workbench.colorTheme': suya.oscura ? 'Default Dark Modern' : 'Default Light Modern',
    'window.title': `${comoSeLlama || 'Mi trabajo'} — \${activeEditorShort}`,
    // Y la ventana entera con sus colores, no solo nuestra barra.
    'workbench.colorCustomizations': {
      'sideBar.background': t['--fondo'],
      'sideBar.foreground': t['--texto'],
      'sideBar.border': t['--borde'],
      'sideBarSectionHeader.background': t['--fondo'],
      'sideBarSectionHeader.foreground': t['--apagado'],
      'sideBarTitle.foreground': t['--texto-fuerte'],
      'activityBar.background': t['--fondo'],
      'activityBar.foreground': t['--texto-fuerte'],
      'activityBar.inactiveForeground': t['--apagado'],
      'activityBar.border': t['--borde'],
      'activityBarBadge.background': t['--acento-relleno'],
      'activityBarBadge.foreground': t['--sobre-acento'],
      'titleBar.activeBackground': t['--fondo'],
      'titleBar.activeForeground': t['--texto-fuerte'],
      'titleBar.border': t['--borde'],
      'statusBar.background': t['--fondo'],
      'statusBar.foreground': t['--texto'],
      'statusBar.border': t['--borde'],
      'editorGroupHeader.tabsBackground': t['--fondo'],
      'focusBorder': t['--acento'],
    },
  };
}

function estado(contexto) {
  return contexto.globalState.get(CLAVE_ESTADO) || { version: 0, pendientes: null, quitado: false };
}

// ------------------------------------------------------------------- la base

// Aplica lo que falte. Devuelve cuántas claves cambiaron y cuáles no pudieron.
async function aplicar(contexto, salida, { forzar = false } = {}) {
  const antes = estado(contexto);
  if (antes.quitado && !forzar) return { primeraVez: false, aplicadas: 0, pendientes: [] };

  const todos = ajustes(contexto);
  const primeraVez = antes.version !== VERSION || forzar;
  // Las pendientes de antes que ya no son del disfraz se olvidan: la vista
  // enfocada de Claude, por ejemplo, se quedaba pendiente en cada arranque
  // porque en la carpeta no cabe (decisión 163).
  const claves = primeraVez ? Object.keys(todos) : (antes.pendientes || []).filter((c) => c in todos);
  if (!claves.length) {
    if ((antes.pendientes || []).length) await contexto.globalState.update(CLAVE_ESTADO, { ...antes, pendientes: [] });
    return { primeraVez: false, aplicadas: 0, pendientes: [] };
  }

  // El disfraz va a los ajustes de ESTA carpeta, no a los de VS Code entero:
  // así una ventana con la empresa del alumno está disfrazada y otra con
  // cualquier otra cosa no se entera. Sin carpeta abierta no hay dónde
  // escribirlo, y se deja estar.
  if (!hayCarpeta()) return { primeraVez: false, aplicadas: 0, pendientes: [] };

  // Y solo si esta carpeta lo pide. Sin el interruptor encendido no se toca
  // nada: es el editor de quien lo abre, no el nuestro.
  if (!quiereVistaSencilla() && !forzar) return { primeraVez: false, aplicadas: 0, pendientes: [] };

  const configuracion = vscode.workspace.getConfiguration();
  const pendientes = [];
  let cambiadas = 0;
  for (const clave of claves) {
    if (SOLO_DEL_INSTALADOR.includes(clave)) continue;

    // El rótulo de la ventana lo ponen los nombres que dio el alumno, no el
    // genérico de la plantilla.
    const valor = clave === 'window.title' ? identidad.titulo() : todos[clave];

    // Si ya está escrito —por el instalador o por una sesión anterior— no hay
    // nada que cambiar ni que reabrir.
    const visto = configuracion.inspect(clave);
    const puesto = visto?.workspaceValue !== undefined ? visto.workspaceValue : visto?.globalValue;
    if (JSON.stringify(puesto) === JSON.stringify(valor)) continue;

    try {
      await configuracion.update(clave, valor, vscode.ConfigurationTarget.Workspace);
      cambiadas += 1;
    } catch (error) {
      pendientes.push(clave);
      salida.appendLine(`[disfraz] ${clave} no admite ámbito de carpeta: ${error.message}`);
    }
  }

  await contexto.globalState.update(CLAVE_ESTADO, { version: VERSION, pendientes, quitado: false });
  return { primeraVez, aplicadas: cambiadas, pendientes };
}

// Quita el disfraz de TODO VS Code: de esta carpeta y de los ajustes de
// usuario. Es la salida de emergencia — la que hace falta cuando alguien
// instala esto en el editor donde trabaja y se le cambian todas las ventanas.
async function quitar(contexto, salida) {
  const configuracion = vscode.workspace.getConfiguration();
  let quitadas = 0;

  // El interruptor va el primero: si se queda encendido, el siguiente arranque
  // vuelve a poner todo lo que acabamos de quitar.
  //
  // Lo que ya no va en la carpeta (decisión 163) se quita solo de ella: en los
  // ajustes de usuario lo pone el instalador, y lo quita al desinstalar.
  const deLaCarpeta = new Set(YA_NO_VAN_EN_LA_CARPETA);
  for (const clave of [CLAVE_INTERRUPTOR, ...Object.keys(ajustes(contexto)), ...YA_NO_VAN_EN_LA_CARPETA]) {
    for (const ambito of [vscode.ConfigurationTarget.Workspace, vscode.ConfigurationTarget.Global]) {
      if (deLaCarpeta.has(clave) && ambito !== vscode.ConfigurationTarget.Workspace) continue;
      try {
        const visto = configuracion.inspect(clave);
        const hay = ambito === vscode.ConfigurationTarget.Workspace
          ? visto?.workspaceValue !== undefined
          : visto?.globalValue !== undefined;
        if (!hay) continue;
        await configuracion.update(clave, undefined, ambito);
        quitadas += 1;
      } catch (error) {
        salida.appendLine(`[disfraz] no he podido quitar ${clave}: ${error.message}`);
      }
    }
  }

  await contexto.globalState.update(CLAVE_ESTADO, { version: VERSION, pendientes: [], quitado: true });
  return { quitadas };
}

// ------------------------------------------------ el interruptor, por ventana

function hayCarpeta() {
  const carpetas = vscode.workspace.workspaceFolders;
  return Boolean(carpetas && carpetas.length);
}

// Una carpeta es una empresa cuando tiene la declaración del arnés. Es lo
// mismo que mira la brújula para saber si hay algo montado.
const esUnaEmpresa = () => proyecto.existe('.rsc.json');

// EL INTERRUPTOR. Un ajuste de la carpeta, `executiveLab.vistaSencilla`.
//
// Nada se disfraza solo, ni siquiera un arnés: se decide carpeta a carpeta.
// Quien tenga la extensión puesta y abra cualquier otra cosa —o un arnés que
// quiera ver entero— se encuentra su editor tal y como lo tiene.
//
// Lo enciende el instalador en la carpeta que crea (ahí el alumno no tiene
// que saber que existe), o el propio alumno desde la barra.
const CLAVE_INTERRUPTOR = 'executiveLab.vistaSencilla';

const quiereVistaSencilla = () => vscode.workspace.getConfiguration().get(CLAVE_INTERRUPTOR) === true;

// En qué está esta ventana, según el interruptor de la carpeta.
const modoDeEstaVentana = () => (quiereVistaSencilla() ? 'sencillo' : 'avanzado');

// Apaga el interruptor de ESTA carpeta y quita de ella lo que escribimos.
async function verEditorCompleto(contexto, salida) {
  if (!hayCarpeta()) {
    return { ok: false, mensaje: 'Primero abre una carpeta; sin ella no puedo cambiar solo esta ventana.' };
  }

  const configuracion = vscode.workspace.getConfiguration();
  await configuracion.update(CLAVE_INTERRUPTOR, false, vscode.ConfigurationTarget.Workspace);
  const claves = clavesDeLaCarpeta(contexto);
  const rechazadas = [];
  for (const clave of claves) {
    // Nada de valores de fábrica: se quita lo nuestro y vuelve lo suyo.
    try {
      await configuracion.update(clave, undefined, vscode.ConfigurationTarget.Workspace);
    } catch (error) {
      rechazadas.push(clave);
      salida.appendLine(`[disfraz] ${clave} no admite ámbito de carpeta: ${error.message}`);
    }
  }

  if (rechazadas.length === claves.length) {
    return { ok: false, mensaje: 'No he podido cambiar solo esta ventana. Pulsa «Algo va mal» y pásale el código a tu tutor.' };
  }
  return { ok: true, rechazadas, mensaje: 'Ya ves el editor completo en esta ventana. Las demás siguen igual.' };
}

// Enciende el interruptor de ESTA carpeta y pone el disfraz.
async function volverAModoSencillo(contexto, salida) {
  if (!hayCarpeta()) {
    return { ok: false, mensaje: 'Primero abre una carpeta; sin ella no puedo cambiar solo esta ventana.' };
  }

  const configuracion = vscode.workspace.getConfiguration();
  for (const clave of clavesDeLaCarpeta(contexto)) {
    try {
      await configuracion.update(clave, undefined, vscode.ConfigurationTarget.Workspace);
    } catch (error) {
      salida.appendLine(`[disfraz] no he podido devolver ${clave}: ${error.message}`);
    }
  }
  await configuracion.update(CLAVE_INTERRUPTOR, true, vscode.ConfigurationTarget.Workspace);
  await aplicar(contexto, salida, { forzar: true });
  return { ok: true, mensaje: 'Esta ventana ya está en vista sencilla. Las demás siguen igual.' };
}

// Algunos ajustes (menú, centro de comandos) solo se ven tras reabrir.
async function proponerReabrir(mensaje) {
  const eleccion = await vscode.window.showInformationMessage(mensaje, 'Hacerlo ahora', 'Más tarde');
  if (eleccion === 'Hacerlo ahora') await vscode.commands.executeCommand('workbench.action.reloadWindow');
}

module.exports = {
  aplicar,
  esUnaEmpresa,
  quiereVistaSencilla,
  CLAVE_INTERRUPTOR,
  quitar,
  verEditorCompleto,
  volverAModoSencillo,
  modoDeEstaVentana,
  proponerReabrir,
  estado,
  clavesDeLaCarpeta,
};
