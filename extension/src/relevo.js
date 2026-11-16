// El relevo de Node: que los enganches del arnés encuentren un `node` aunque en
// el ordenador no haya ninguno (C2, decisión 4 de Jose).
//
// ── Por qué existe ──────────────────────────────────────────────────────
//
// RSC escribe sus enganches como `node …`, y Claude Code los corre con `sh -c`
// (Git Bash en Windows). Si no encuentra `node`, según su propia documentación
// es un error que no bloquea: la orden sigue, sin freno, sin brújula al
// empezar y sin memoria, y en cada orden sale un aviso de error. El README
// decía «No hace falta Node», y para los enganches no era verdad.
//
// La barra ya corre RSC con el Node que trae VS Code (su binario con
// `ELECTRON_RUN_AS_NODE=1`). El relevo hace lo mismo para los enganches: un
// `node` pequeño que llama a ese.
//
// ── Lo que toca y lo que no ─────────────────────────────────────────────
//
//   · Vive en el almacén de la extensión, fuera de la carpeta del alumno (P8).
//   · Del anfitrión, que comparten todas las extensiones, toca dos cosas: el
//     PATH, solo si no hay ya un `node`, y el interruptor del aviso de versión
//     de RSC (abajo), que no lee nadie más. `ELECTRON_RUN_AS_NODE` va dentro del
//     relevo, nunca en ese entorno: ahí convertiría en Node a cualquier Electron
//     que se lanzara después.
//   · Se pone al activar la barra, antes de que se abra el chat, para que el
//     proceso del asistente y sus enganches lo hereden. Si el asistente ya
//     estaba abierto, lo coge al abrirlo otra vez.
//
// Lo que no se ha medido aquí, y queda con su prueba en pendientes: en un VS
// Code de verdad, que el proceso del asistente herede el PATH; y en Windows,
// el relevo en Git Bash y en PowerShell.

const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');

const clavePath = (env) => Object.keys(env).find((k) => k.toLowerCase() === 'path') || 'PATH';

// El `node` que encontraría un enganche en este PATH, o null. Se mira el disco
// y no se lanza `which`: esto corre al activar la barra.
function nodeDelPath(env = process.env, plataforma = process.platform) {
  const nombres = plataforma === 'win32' ? ['node.exe', 'node.cmd'] : ['node'];
  for (const dir of String(env[clavePath(env)] || '').split(path.delimiter).filter(Boolean)) {
    for (const nombre of nombres) {
      const candidato = path.join(dir, nombre);
      try {
        if (fs.statSync(candidato).isFile()) return candidato;
      } catch {
        // no está aquí
      }
    }
  }
  return null;
}

// Entre comillas simples para `sh`: dentro no se interpreta nada, y una
// comilla simple se escribe cerrando, escapándola y abriendo otra vez.
const entreComillas = (texto) => `'${String(texto).replace(/'/g, "'\\''")}'`;

// Se escribe solo si cambia, y de golpe: a un fichero aparte que después ocupa
// su sitio. Reescribirlo en cada apertura, a trozos, dejaba un instante en que un
// enganche de otra ventana corría un guion vacío, salía con 0, y el freno dejaba
// pasar la orden (revisión de F3, M5).
function dejarDeGolpe(fichero, texto, modo) {
  try {
    if (fs.readFileSync(fichero, 'utf8') === texto) return;
  } catch {
    // no estaba
  }
  const nuevo = `${fichero}.nuevo`;
  fs.writeFileSync(nuevo, texto, modo ? { mode: modo } : undefined);
  if (modo) fs.chmodSync(nuevo, modo);
  fs.renameSync(nuevo, fichero);
}

function escribirElRelevo(carpeta, ejecutable, plataforma) {
  fs.mkdirSync(carpeta, { recursive: true });
  dejarDeGolpe(path.join(carpeta, 'node'), [
    '#!/bin/sh',
    '# El relevo de Node de Executive Lab: el Node que trae VS Code, para los enganches del arnés.', // diccionario: interno
    `ELECTRON_RUN_AS_NODE=1 exec ${entreComillas(ejecutable)} "$@"`,
    '',
  ].join('\n'), 0o755);
  if (plataforma === 'win32') {
    dejarDeGolpe(path.join(carpeta, 'node.cmd'), [
      '@echo off',
      'set ELECTRON_RUN_AS_NODE=1',
      `"${ejecutable}" %*`,
      '',
    ].join('\r\n'));
  }
}

// La misma carpeta en el disco, se escriba como se escriba. En Windows las rutas no
// distinguen mayúsculas, y el almacén de la extensión llega a veces con la unidad en
// minúscula (`c:\\…`); el macOS de fábrica tampoco las distingue; y una barra al
// final no cambia la carpeta. Comparadas a pelo, el relevo no se reconocía a sí
// mismo y la barra decía que ya había un node, que era el suyo. Lo cazó la barra en
// un VS Code de Windows, y la revisión lo reprodujo en un Mac. Si las dos existen,
// manda el disco (el dispositivo y el nodo); si no, la ruta, como la compara el
// sistema.
const sinBarraFinal = (ruta) => String(ruta).replace(/[\\/]+$/, '');
function mismaCarpeta(a, b, plataforma) {
  if (!a || !b) return false;
  if (sinBarraFinal(a) === sinBarraFinal(b)) return true;
  try {
    const x = fs.statSync(a, { bigint: true });
    const y = fs.statSync(b, { bigint: true });
    return x.dev === y.dev && x.ino === y.ino && x.ino !== 0n;
  } catch {
    // alguna todavía no existe
  }
  return plataforma === 'win32'
    && sinBarraFinal(path.win32.normalize(String(a))).toLowerCase() === sinBarraFinal(path.win32.normalize(String(b))).toLowerCase();
}

// Qué hay para los enganches, y dónde. Pone el relevo solo si hace falta.
//
//   nodeDelSistema  ya hay un `node` de verdad en el PATH: no se toca nada
//   relevoVSCode    el relevo está puesto y va el primero del PATH
//   ninguno         no se ha podido poner, y la pieza lo dice con su botón
function asegurar({ carpeta, ejecutable = process.execPath, env = process.env, plataforma = process.platform } = {}) {
  const encontrado = nodeDelPath(env, plataforma);
  const esElNuestro = Boolean(carpeta) && Boolean(encontrado) && mismaCarpeta(path.dirname(encontrado), carpeta, plataforma);
  if (encontrado && !esElNuestro) return { modo: 'nodeDelSistema', carpeta: null, node: encontrado };
  if (!carpeta || !ejecutable) return { modo: 'ninguno', carpeta: null };

  try {
    escribirElRelevo(carpeta, ejecutable, plataforma);
  } catch (error) {
    return { modo: 'ninguno', carpeta: null, error: error.message };
  }

  const clave = clavePath(env);
  const partes = String(env[clave] || '').split(path.delimiter).filter(Boolean);
  if (!mismaCarpeta(partes[0], carpeta, plataforma)) env[clave] = [carpeta, ...partes.filter((d) => !mismaCarpeta(d, carpeta, plataforma))].join(path.delimiter);
  return { modo: 'relevoVSCode', carpeta };
}

// ── Y el aviso de versión nueva, apagado (C4) ────────────────────────────
//
// El arranque de cada conversación de RSC mira en npm si hay una versión más
// nueva y, si la hay, le dice al asistente que ofrezca
// `npx @ericrisco/rsc@latest`. En una clase la versión es la de la clase (P7):
// ofrecer otra es pedirle al alumno que se salga de ella, y detrás vienen la
// regla 7 y la versión que va y viene. RSC solo lo apaga con
// `RSC_NO_UPDATE_CHECK` en el entorno del enganche, así que va donde el
// enganche lo hereda, como el PATH. Si ya venía puesto, se respeta.
function callarElAvisoDeVersion(env = process.env) {
  if (!env.RSC_NO_UPDATE_CHECK) env.RSC_NO_UPDATE_CHECK = '1';
}

// ── Y la oferta de MemSlop, callada (decisión 200) ───────────────────────
//
// Desde la 4, en un Mac, el arranque de cada conversación le pide al asistente
// que ofrezca MemSlop, una app que cierra los servidores y navegadores que dejan
// abiertos los asistentes, y que la instale con `curl … | bash` si le dicen que
// sí (`targets/memslop-offer.mjs`). A quien no es técnico, el freno del propio
// arnés le para esa orden: un sí que acaba en un bloqueo es un mensaje sin
// salida (decisión 183). Y en clase nadie deja servidores abiertos.
//
// RSC la calla con un fichero de la máquina, `~/.rsc/.no-memslop`, y no tiene
// variable de entorno, así que va ese fichero. Solo en un Mac, que es donde se
// ofrece; si ya está, no se toca. Va aparte de `ponerAlActivar` para que quien la
// llame diga en qué carpeta personal escribe.
function callarLaOfertaDeMemSlop({ casa = os.homedir(), plataforma = process.platform } = {}) {
  if (plataforma !== 'darwin' || !casa) return 'noHaceFalta';
  const marca = path.join(casa, '.rsc', '.no-memslop');
  try {
    if (fs.existsSync(marca)) return 'yaEstaba';
    fs.mkdirSync(path.dirname(marca), { recursive: true });
    fs.writeFileSync(marca, 'Puesto por la barra de Executive Lab: en clase no hace falta (decisión 200).\n', { flag: 'wx' });
    return 'callada';
  } catch (error) {
    return error && error.code === 'EEXIST' ? 'yaEstaba' : 'noSePudo';
  }
}

// Lo que se puso al activar la barra, para la pieza «Lo que el arnés hace
// solo». Si todavía no se ha puesto, se mira sin escribir nada: sin carpeta
// para el relevo, `asegurar` solo lee el PATH.
let ultimo = null;
//
// `yaHabiaAsistente`: el asistente ya estaba en marcha cuando se puso el relevo,
// así que su proceso no lo ve hasta que se abra la conversación otra vez.
function ponerAlActivar(opciones = {}) {
  callarElAvisoDeVersion(opciones.env);
  const puesto = asegurar(opciones);
  ultimo = { ...puesto, tarde: puesto.modo === 'relevoVSCode' && Boolean(opciones.yaHabiaAsistente) };
  return ultimo;
}
const comoEsta = () => ultimo || asegurar({ carpeta: null });

module.exports = { nodeDelPath, asegurar, escribirElRelevo, ponerAlActivar, comoEsta, callarElAvisoDeVersion, callarLaOfertaDeMemSlop };
