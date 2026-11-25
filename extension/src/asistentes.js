// Con qué asistente hablamos: Claude o Codex.
//
// El arnés lo sabe —`.rsc.json` guarda a qué asistentes se instaló— así que no
// se adivina: se lee. Si hay varios, manda el que esté instalado en el editor.
//
// Lo que cada uno permite hoy (comprobado leyendo sus extensiones el 17 de
// septiembre de 2026, no adivinado):
//
//   CLAUDE (anthropic.claude-code 2.1.276, leído y PROBADO el 19-09-2026)
//     Se le habla por su enlace: `vscode://anthropic.claude-code/open?prompt=`.
//     Es lo único que entrega el texto de verdad — probado en la máquina de
//     Jose. Los dos comandos que lo aceptan abren una conversación vacía, y
//     eso que el manejador del enlace llama a uno de ellos: lo que se pierde
//     se pierde dentro de su ventana. El porqué completo, en `puente.js`.
//
//     De repuesto quedan `claude-vscode.editor.open(sesion, prompt, …)` —que
//     respeta si esa persona tiene Claude en la barra lateral o en un panel— y
//     `claude-vscode.primaryEditor.open(sesion, prompt)`, que abre siempre una
//     pestaña grande nueva.
//
//     En los dos casos el texto se deja escrito en la caja —`setInputText`—,
//     NO se envía. Lo tiene que mandar la persona. La barra lo dice así.
//
//     Y `claude-vscode.focus` NO es «pon el cursor en la caja», aunque se
//     llame así: coge lo que haya seleccionado en el editor, lo convierte en
//     una mención y se la entrega a una conversación; si ninguna puede
//     cogerla, abre otra. Llamarlo justo después de mandar el texto era lo que
//     le dejaba a Jose una conversación vacía encima de la buena.
//
//   CODEX (openai.chatgpt 26.51120.50957, leído el 25-11-2026)
//     Su barra no deja escribirle desde fuera: ningún comando acepta texto
//     (`chatgpt.addToThread` y `addFileToThread` solo adjuntan ficheros, y
//     `chatgpt.implementTodo` llega enmarcado como "implementa este TODO"), y su
//     enlace lleva a su barra y tira lo que se le pasa: la caja de inicio no lee
//     `prompt` (probado en la máquina de Jose el 25-11-2026: Codex abierto, la caja
//     vacía). Pero trae su propio programa, y ese sí acepta un encargo al
//     arrancar. Así que con Codex el encargo se le da a ese programa, en una
//     pestaña nueva del editor, y se pone a trabajar (decisión 206,
//     `programaDeCodex` y `puente.js`). Sin programa, al portapapeles, avisando.

const vscode = require('vscode');
const proyecto = require('./proyecto');

const ASISTENTES = [
  {
    id: 'claude',
    nombre: 'Claude',
    extension: 'anthropic.claude-code',
    // Comandos que aceptan (sesión, texto). Se prueban por orden, y el orden
    // importa: ver arriba.
    envio: ['claude-vscode.editor.open', 'claude-vscode.primaryEditor.open'],
    enlace: 'vscode://anthropic.claude-code/open',
    // Cómo se le pasa el texto por el enlace.
    parametro: 'prompt',
    abrir: ['claude-vscode.editor.openLast', 'claude-vscode.sidebar.open'],
    // Una conversación nueva. `primaryEditor.open` abre siempre una pestaña
    // nueva (leído en su código el 17-09-2026, arriba); `editor.open` respeta
    // dónde lo tiene cada uno, pero sin sesión no se ha medido si abre otra o
    // enseña la que ya está, así que va detrás. Sin texto ninguno de los dos.
    nueva: ['claude-vscode.primaryEditor.open', 'claude-vscode.editor.open'],
    foco: ['claude-vscode.focus'],
  },
  {
    id: 'codex',
    nombre: 'Codex',
    extension: 'openai.chatgpt',
    envio: [],
    enlace: null,
    parametro: null,
    abrir: ['chatgpt.openSidebar'],
    // «New Codex Agent» (`chatgpt.newCodexPanel`) abre un panel nuevo cada vez, así
    // que se pueden tener varias trabajando a la vez (decisión 206, Jose: «el truco
    // del new agent»). `chatgpt.newChat`, el que documenta Codex (decisión 144),
    // cambia la de su barra, que es una sola: va de repuesto. Sin ninguno, se abre
    // su barra y se dice dónde está el «+».
    nueva: ['chatgpt.newCodexPanel', 'chatgpt.newChat'],
    foco: ['chatgpt.openSidebar'],
  },
];

const porId = (id) => ASISTENTES.find((a) => a.id === id) || null;

const estaInstalado = (a) => Boolean(vscode.extensions.getExtension(a.extension));

// Decisión 190: Codex también se usa solo por terminal, sin la extensión del
// editor. Se sabe sin coste y sin lanzar nada: `codex` en el PATH, o la sesión en
// `~/.codex` (reutiliza lo de la 186). Con Claude no se mira: su ejecutable lo
// trae la propia extensión. Cambiable: las pruebas no miran el ordenador de nadie.
const terminal = {
  hayEnElPath(nombre) {
    const fs = require('node:fs');
    const path = require('node:path');
    const sufijos = process.platform === 'win32' ? ['.exe', '.cmd', '.bat', ''] : [''];
    for (const carpeta of String(process.env.PATH || '').split(path.delimiter).filter(Boolean)) {
      for (const sufijo of sufijos) {
        try {
          if (fs.statSync(path.join(carpeta, nombre + sufijo)).isFile()) return true;
        } catch { /* ahí no está */ }
      }
    }
    return false;
  },
  haySesion: () => require('./sesion-del-asistente').sesionDeCodex() === 'si',
  // El `codex` del PATH que se puede abrir tal cual, con su ruta entera, o null
  // (decisión 206). En Windows solo un `.exe`: un `.cmd` pasa por `cmd.exe`, que
  // reinterpreta el encargo (`&`, `%`, `"`), y el encargo puede llevar lo que
  // escribió la persona.
  programaEnElPath(nombre) {
    const fs = require('node:fs');
    const path = require('node:path');
    const sufijo = process.platform === 'win32' ? '.exe' : '';
    for (const carpeta of String(process.env.PATH || '').split(path.delimiter).filter(Boolean)) {
      const programa = path.join(carpeta, nombre + sufijo);
      try {
        if (!fs.statSync(programa).isFile()) continue;
        fs.accessSync(programa, fs.constants.X_OK);
        return programa;
      } catch { /* ahí no está, o no se puede abrir */ }
    }
    return null;
  },
};

// ── El programa de Codex (decisión 206) ──────────────────────────────────
//
// Su extensión trae el programa entero, el mismo Codex con la misma cuenta
// (`~/.codex`), en `bin/<sistema>-<procesador>/`. Así lo busca ella misma: leído
// en openai.chatgpt 26.51120.50957 el 25-11-2026. Ese programa acepta un encargo
// al arrancar (`codex [PROMPT]`) y se pone a trabajar, que es lo que su barra no
// deja hacer desde fuera (`puente.js`). Si no está ahí, el `codex` del ordenador
// (decisión 190). Sin ninguno, null.
const SISTEMA_DE_CODEX = { darwin: 'macos', win32: 'windows', linux: 'linux' };
const PROCESADOR_DE_CODEX = { x64: 'x86_64', arm64: 'aarch64' };
function programaDeCodex({ plataforma = process.platform, arquitectura = process.arch } = {}) {
  const codex = porId('codex');
  const suya = vscode.extensions.getExtension(codex.extension);
  const sistema = SISTEMA_DE_CODEX[plataforma];
  const procesador = PROCESADOR_DE_CODEX[arquitectura];
  if (suya && suya.extensionPath && sistema && procesador) {
    const path = require('node:path');
    const programa = path.join(suya.extensionPath, 'bin', `${sistema}-${procesador}`, plataforma === 'win32' ? 'codex.exe' : 'codex');
    try {
      if (require('node:fs').statSync(programa).isFile()) return programa;
    } catch { /* su extensión no lo trae aquí */ }
  }
  return terminal.programaEnElPath('codex');
}
const enTerminal = (a) => Boolean(a) && a.id === 'codex' && (terminal.hayEnElPath('codex') || terminal.haySesion());

// Lo tiene puesto en este ordenador, de una forma o de otra. Lo que necesita la
// extensión (que los botones le escriban, abrirle la barra) sigue mirando
// `estaInstalado`.
const estaPuesto = (a) => estaInstalado(a) || enTerminal(a);

// Lo que se dice cuando falta, con el botón que lo pone (decisión 166). Decía
// «Díselo a tu tutor», y la barra ya sabía ponerlo: es una extensión del editor,
// y ponerla es un clic suyo. Una sola frase para todos los sitios donde se dice.
const falta = (a) => ({
  // Quien lo usa por terminal no «lo tiene que poner»: lo que falta es la
  // extensión, y solo para que los botones le hablen desde aquí (decisión 190).
  texto: !estaInstalado(a) && enTerminal(a)
    ? `Ya tienes ${a.nombre}, pero fuera del editor. Para que los botones le hablen desde aquí, hay que ponerlo también en el editor.`
    : `Falta ${a.nombre} en este ordenador, y sin él no puedo hablar con nadie.`,
  malo: true,
  boton: { etiqueta: `Poner ${a.nombre}`, accion: { tipo: 'ponerElAsistente', cual: a.id } },
});

// Decisión 190: lo que el asistente solo lee al empezar una conversación (los
// raíles, `AGENTS.md` o `CLAUDE.md`, los enganches, los ajustes) no lo ve una
// conversación que ya estaba abierta. Con Claude y con Codex es igual, y se dice
// igual, con su nombre. Con otro asistente, nada: no se sabe cómo lo lee.
const { REABRIR } = require('./solo');
const paraQueLoCoja = (id) => {
  const a = porId(id);
  return a ? REABRIR(a.nombre) : null;
};

// A cuáles se instaló el arnés. RSC lo guarda en `.rsc.json`.
function losDelArnes() {
  const declaracion = proyecto.declaracion();
  const targets = declaracion && Array.isArray(declaracion.targets) ? declaracion.targets : [];
  return targets.map(porId).filter(Boolean);
}

// ── Una sola respuesta a «con qué asistente» (E2) ────────────────────────
//
// La barra contestaba de dos formas: dónde mira —el primero declarado, en
// `donde`, `saberes.comoSePide` y `rsc.anadir`— y con quién habla —el primero
// instalado, aquí—. Con los dos declarados y solo Codex en el ordenador,
// buscaba las habilidades en la carpeta de Claude y le hablaba a Codex. Ahora
// todo tira de esta función, por este orden:
//
//   1. el que se eligió en esta carpeta, si el arnés está montado para él;
//   2. el que pide el ajuste, igual (decisión 158);
//   3. el que apuntó la barra al prepararla para el otro, igual (decisión 158);
//   4. el primero declarado que esté instalado;
//   5. el primero declarado, aunque no esté, para poder decir qué falta;
//   6. sin nada declarado, el que esté instalado, y si no, Claude.
//
// Hablar con uno para el que no está montado el arnés sería hablar sin sus
// habilidades, así que lo declarado va antes que lo instalado.
//
// La elección va en el estado del espacio de trabajo, que es de esta carpeta y
// de este ordenador, y no en el orden de `targets`: RSC los ordena en cada
// escritura, así que un `sync` o un `add` la deshacían (E1).
const CLAVE_DE_LA_ELECCION = 'executiveLab.conQuien';
let estado = null;
const saberDondeGuardar = (workspaceState) => { estado = workspaceState || null; };

// Y lo que apunta la barra sola, que no es una elección: al preparar la carpeta
// también para el otro, el asistente con el que ya se hablaba (decisión 158). Va
// aparte para que un cambio del ajuste mande sobre él; lo elegido no.
const CLAVE_DEL_APUNTE = 'executiveLab.conQuienPorDefecto';

function leer(clave) {
  try {
    return estado ? estado.get(clave) || null : null;
  } catch {
    return null;
  }
}

const laEleccion = () => leer(CLAVE_DE_LA_ELECCION);

// ── El ajuste, para todo el editor (decisión 158) ───────────────────────
//
// `executiveLab.asistente` dice con cuál se trabaja en todas las carpetas:
//
//   · `automatico`, el de siempre: si hay uno puesto, ese; con los dos, se
//     pregunta al montar;
//   · `claude` o `codex`: se monta para ese sin preguntar, y en una carpeta
//     montada para los dos es con el que se habla;
//   · `losDos`: se monta para los dos, y una carpeta montada para uno se
//     prepara sola también para el otro (`extension.js`).
//
// Lo que se eligió en una carpeta manda en esa carpeta: el ajuste va detrás.
// Se lee cada vez, para que cambiarlo con la barra abierta se note sin recargar.
const AJUSTE = 'executiveLab.asistente';
const VALORES_DEL_AJUSTE = ['automatico', 'claude', 'codex', 'losDos'];

function elAjuste() {
  try {
    const valor = vscode.workspace.getConfiguration().get(AJUSTE);
    return VALORES_DEL_AJUSTE.includes(valor) ? valor : 'automatico';
  } catch {
    return 'automatico';
  }
}

function conQuien() {
  const declarados = losDelArnes();
  // Montado aquí, y que siga en el ordenador: si no, los botones acababan en
  // «pégalo en su caja» para una caja que no hay (revisión de F5, m1).
  const sePuede = (a) => Boolean(a) && declarados.some((d) => d.id === a.id) && estaInstalado(a);
  const elegido = porId(laEleccion());
  if (sePuede(elegido)) return elegido;
  // Lo que pide el ajuste, si esta carpeta está montada para él (decisión 158).
  const delAjuste = porId(elAjuste());
  if (sePuede(delAjuste)) return delAjuste;
  // Lo que apuntó la barra sola, que no es elegir: va detrás del ajuste.
  const apuntado = porId(leer(CLAVE_DEL_APUNTE));
  if (sePuede(apuntado)) return apuntado;
  return declarados.find(estaInstalado) || declarados[0] || ASISTENTES.find(estaInstalado) || ASISTENTES[0];
}

const elDeAhora = () => conQuien();

// Lo que hay que enseñar para poder elegir: cuál manda ahora, cuáles están
// puestos en este ordenador y cuáles declaró el arnés.
function comoEstamos() {
  const ahora = elDeAhora();
  const delArnes = losDelArnes().map((a) => a.id);
  const targets = (proyecto.declaracion() || {}).targets;
  return {
    ahora: ahora ? ahora.id : null,
    // Lo que dice el ajuste de todo el editor, para decirlo en una línea (decisión 158).
    ajuste: elAjuste(),
    // Si la carpeta está montada, aunque sea para uno que la barra no ofrece: ahí
    // el de ahora no tiene nada, y se dice (revisión de F5, m4).
    montada: Array.isArray(targets) && targets.length > 0,
    cuales: ASISTENTES.map((a) => ({
      id: a.id,
      nombre: a.nombre,
      instalado: estaInstalado(a),
      // Por terminal, sin la extensión (decisión 190).
      enTerminal: !estaInstalado(a) && enTerminal(a),
      // Si el arnés se montó para él. Se puede hablar con uno no declarado,
      // pero conviene decirlo.
      delArnes: delArnes.includes(a.id),
      // Con Codex los botones no pueden mandar texto: abren su barra y lo
      // dejan copiado. Se dice aquí y no en una nota al pie.
      mandaTexto: a.envio.length > 0,
    })),
  };
}

// Seguir con el de antes en esta carpeta, sin montar nada. Al prepararla también
// para el otro por el ajuste de los dos, RSC lo pone delante en `targets`, y los
// botones cambiarían de asistente sin que nadie lo pidiera (decisión 158). Se
// apunta aparte de lo elegido: si después se cambia el ajuste, manda el ajuste.
async function seguirCon(id) {
  if (!estado || !porId(id)) return false;
  try {
    await estado.update(CLAVE_DEL_APUNTE, id);
    return true;
  } catch {
    return false;
  }
}

// Cambiar con cuál se habla (E1).
//
// Se reordenaba `targets` en `.rsc.json`, y eso ni duraba —RSC los ordena en
// cada escritura— ni montaba nada: las habilidades y los agentes del otro
// «dejaban de verse», y lo declarado no cuadraba con lo instalado. Ahora:
//
//   · con uno para el que ya está montado, se apunta la elección y ya;
//   · con uno para el que no, se prepara también para él —`montar`, que es el
//     `sync --target` del arnés de dentro y sus raíles— y solo si sale bien se
//     apunta. Si no, no se cambia nada.
async function elegir(id, { montar } = {}) {
  const cual = porId(id);
  if (!cual) return { ok: false, mensaje: 'Ese no es uno de los dos.' };
  if (!estaInstalado(cual)) {
    const { texto, boton } = falta(cual);
    return { ok: false, mensaje: texto, boton: { ...boton, accion: { ...boton.accion, desde: 'asistente' } } };
  }

  const declaracion = proyecto.declaracion();
  if (!declaracion) return { ok: false, mensaje: 'Esta carpeta todavía no está preparada.' };

  const noSePudo = { ok: false, mensaje: `No he podido prepararla para ${cual.nombre}. Pulsa «Algo va mal» y pásale el código a tu tutor.` };
  const declarados = () => {
    const d = proyecto.declaracion() || {};
    return Array.isArray(d.targets) ? d.targets : [];
  };
  // Declarado y sin sus raíles es un cambio que se quedó a medias: el arnés lo
  // declaró y los raíles no se pudieron poner. Se termina, en vez de decir
  // «Hecho» sin ellos (revisión de F5, m2).
  const suyo = require('../media/railes/sitios').sitiosDe(id);
  const conSusRailes = () => Boolean(suyo) && require('node:fs').existsSync(proyecto.ruta(...suyo.habilidades, 'executive-lab', 'SKILL.md'));
  let renombrados = [];
  if (!declarados().includes(id) || !conSusRailes()) {
    if (typeof montar !== 'function') return noSePudo;
    let hecho;
    try {
      hecho = await montar(id);
    } catch (error) {
      hecho = { ok: false, detalle: error.message };
    }
    if (hecho === true) hecho = { ok: true };
    if (!hecho || typeof hecho !== 'object') hecho = { ok: false };
    // Una carpeta que va por delante no se prepara con la versión de la barra
    // (P7, decisión 145): espera a que la barra se ponga al día.
    if (hecho.porDelante) {
      return { ok: false, mensaje: 'Esta carpeta lleva una versión del arnés más nueva que la de la barra. Hasta que la barra se ponga al día, pídeselo al asistente.' };
    }
    if (hecho.cancelado) return { ok: false, cancelado: true, mensaje: 'No he tocado nada. Cuando quieras, el botón sigue aquí.' };
    if (!hecho.ok) return { ...noSePudo, ...(hecho.mensaje ? { mensaje: hecho.mensaje } : {}), detalle: hecho.detalle };
    if (!declarados().includes(id)) return { ...noSePudo, detalle: 'el arnés terminó bien y no lo ha declarado' }; // diccionario: interno
    renombrados = hecho.renombrados || [];
  }

  // Sin dónde guardarlo no se dice «Hecho»: la elección no duraría ni hasta el
  // siguiente repintado (revisión de F5, M2).
  const noSeGuardo = { ok: false, mensaje: 'No he podido guardarlo. Pulsa «Algo va mal» y pásale el código a tu tutor.' };
  if (!estado) return { ...noSeGuardo, detalle: 'la barra no tiene dónde guardar la elección' }; // diccionario: interno
  try {
    await estado.update(CLAVE_DE_LA_ELECCION, id);
  } catch (error) {
    return { ...noSeGuardo, detalle: error.message };
  }

  // Lo que se pierde sin estar en ninguna carpeta: los frenos. RSC solo se los
  // engancha a Claude, y los raíles también, así que al pasar a otro asistente
  // desaparece el que para una orden peligrosa, y ese es el que protege a quien
  // no es técnico. No se puede arreglar desde aquí, pero callarlo es peor: esto
  // se pulsa una vez, y nadie vuelve a mirar Las reglas para enterarse.
  const donde = require('./donde');
  const sinFrenos = (donde.SITIOS[id] || {}).frenos
    ? ''
    : ` Y ${cual.nombre} no trae frenos: el que para una orden peligrosa solo se le engancha a Claude.`;
  const conOtroNombre = renombrados
    .map((r) => ` Tu ${r.que === 'habilidad' ? 'habilidad' : r.que} «${r.id}» ahora se llama «${r.ahora}».`)
    .join('');
  return { ok: true, mensaje: `Hecho. A partir de ahora los botones hablan con ${cual.nombre}.${conOtroNombre}${sinFrenos}` };
}

module.exports = { ASISTENTES, saberDondeGuardar, conQuien, elDeAhora, losDelArnes, estaInstalado, estaPuesto, REABRIR, paraQueLoCoja, enTerminal, terminal, programaDeCodex, porId, falta, comoEstamos, elegir, AJUSTE, VALORES_DEL_AJUSTE, elAjuste, seguirCon };
