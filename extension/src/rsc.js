// Hablar con el arnés RSC.
//
// Nunca con @latest. La barra trae una versión de la serie de la clase (P7,
// decisión 145) y la corre con node y el punto de entrada del paquete, sin npx
// por medio, que en Windows es un .cmd y en cualquier sitio tarda segundos. La
// excepción es una carpeta que va por delante: ahí se corre la suya (ver
// `correr`).

const fs = require('node:fs');
const path = require('node:path');
const procesos = require('./procesos');
const proyecto = require('./proyecto');
const entorno = require('./entorno');

// La versión que trae la barra, y el último recurso si .rsc.json no dice ninguna.
// Se actualiza a mano, a propósito: subir de versión es una decisión, no un
// efecto secundario.
const VERSION_DE_RESPALDO = '4.2.0';

// Cómo es una versión frente a la que trae la barra (P7, decisión 145: la serie
// de la clase, y la lleva la barra):
//
//   · 'vieja' — va por detrás, sea una 3 más vieja o una 2: se pone al día, y
//     al abrir la carpeta se hace solo (P9);
//   · 'nueva' — va por delante: está al día. La barra nunca corre encima la suya,
//     que la bajaría sin decirlo (RSC no compara versiones), ni ofrece bajarla;
//   · 'igual'.
//
// Por
// sus números y no como texto (B5): comparada como texto, la 2.0.13 salía
// distinta de la 2.0.5 y se tomaba por anterior, y el arranque la bajaba.
//
// Y 'rara' si no son tres números (revisión de F4, m2): «2.0» salía más nueva y
// «latest», más vieja. RSC siempre escribe los tres, así que una rara es una
// escrita a mano, y se pone como la de la clase igual que una vieja.
const TRES_NUMEROS = /^v?(\d+)\.(\d+)\.(\d+)(?:[-+][0-9A-Za-z.-]+)?$/;

function comoEsLaVersion(version) {
  if (!version) return null;
  const numeros = (v) => {
    const partes = String(v).trim().match(TRES_NUMEROS);
    return partes ? partes.slice(1, 4).map(Number) : null;
  };
  const [a, b] = [numeros(version), numeros(VERSION_DE_RESPALDO)];
  if (!a) return 'rara';
  for (let i = 0; i < 3; i += 1) {
    if (a[i] !== b[i]) return a[i] < b[i] ? 'vieja' : 'nueva';
  }
  return 'igual';
}

// Solo tres números: la carpeta escribe esto, y con un alias, una dirección o un
// `&` decidía qué se baja de npm, y en Windows pasaba por `cmd.exe` (revisión
// de seguridad de P9, L1).
const vaPorDelante = () => comoEsLaVersion(proyecto.versionDelCatalogo()) === 'nueva';

function paquete() {
  const suya = proyecto.versionDelCatalogo();
  return `@ericrisco/rsc@${/^\d+\.\d+\.\d+$/.test(String(suya || '')) ? suya : VERSION_DE_RESPALDO}`;
}

// ── Nombres que salen de la carpeta ─────────────────────────────────────
//
// Al sincronizar, el arnés borra cada habilidad que su fichero de estado
// (`<raíz del asistente>/.rsc-state.json`) tenga y el plan no, uniendo el nombre
// a su carpeta sin comprobarlo (`scripts/install-apply.js` de la 2.0.15). Ese
// fichero viaja en git: un repositorio con un nombre como `../../Documents`
// borraba esa carpeta del ordenador al traerlo (revisión de seguridad de P9, H1,
// reproducido). Antes de dejarle escribir, se miran todos los nombres: los de
// `.rsc.json` y los de cada fichero de estado. Con uno que sale de la carpeta,
// no se corre, y el motivo queda en el informe de «Algo va mal».
const QUE_ESCRIBEN = new Set(['sync', 'repair', 'onboard', 'add', 'uninstall', 'purge', 'install', 'upgrade', 'restore', 'ingest', 'emoji',
  'main', 'isolation', 'knowledge-sync', 'memory', 'git-permissions', 'agents', 'agent-model']);
// Lo que el arnés usa como nombre de carpeta o de fichero al borrar
// (`install-apply.js`, `repair.js`, `targets/agents.js`, `targets/commands.js`).
const NOMBRES_DEL_ESTADO = ['skills', 'agents', 'explicitAgents', 'commands'];
const nombreSeguro = (id) => typeof id === 'string' && id.length > 0 && id.length < 200
  && !/[\\/:\0]/.test(id) && id !== '.' && id !== '..';

function nombresQueSalenDeLaCarpeta(raiz = proyecto.raiz()) {
  if (!raiz) return [];
  const malos = [];
  const leer = (fichero) => { try { return JSON.parse(fs.readFileSync(fichero, 'utf8')); } catch { return null; } };
  const mirar = (donde, valor) => {
    const nombres = Array.isArray(valor) ? valor : (valor && typeof valor === 'object' ? Object.keys(valor) : []);
    for (const id of nombres) if (!nombreSeguro(id)) malos.push(`${donde}: ${JSON.stringify(id)}`);
  };
  const declaracion = leer(path.join(raiz, '.rsc.json'));
  if (declaracion) for (const clave of ['skills', 'ownSkills', 'agents', 'commands']) mirar(`.rsc.json ${clave}`, declaracion[clave]);
  // Los estados viven en la raíz de cada asistente, y todas empiezan por punto
  // (`.claude/skills`, `.codex/rsc`, `.cursor/rules`…): se buscan ahí, hasta tres
  // niveles, sin entrar en `.git`.
  const buscar = (dir, nivel) => {
    let entradas = [];
    try { entradas = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
    for (const e of entradas) {
      const ruta = path.join(dir, e.name);
      if (e.isFile() && e.name === '.rsc-state.json') {
        const estado = leer(ruta) || {};
        // Solo los nombres: el estado también guarda rutas (`ignoreEntriesAdded`, los
        // `files` de cada habilidad), y esas el arnés ya las comprueba antes de borrar.
        for (const clave of NOMBRES_DEL_ESTADO) mirar(`${path.relative(raiz, ruta)} ${clave}`, estado[clave]);
      } else if (e.isDirectory() && nivel < 3 && e.name !== '.git' && e.name !== 'node_modules') {
        buscar(ruta, nivel + 1);
      }
    }
  };
  let arriba = [];
  try { arriba = fs.readdirSync(raiz, { withFileTypes: true }); } catch { /* sin carpeta, nada */ }
  for (const e of arriba) if (e.isDirectory() && e.name.startsWith('.') && e.name !== '.git') buscar(path.join(raiz, e.name), 1);
  return malos;
}

// Cómo se invoca, por orden de preferencia:
//   1. el arnés preinstalado por el instalador (o el del proyecto) → node rsc.js
//   2. npx-cli.js del node que tengamos → node npx-cli.js --yes @ericrisco/rsc@X
//   3. npx del PATH (máquina de desarrollo), pasando por cmd.exe en Windows
// La carpeta de la extensión la pone extension.js al arrancar: desde aquí no
// hay forma de saberla, y es donde puede viajar el arnés.
let carpetaDeLaExtension = null;
const saberDondeEstamos = (ruta) => { carpetaDeLaExtension = ruta; };

async function correr(args, opciones) {
  // Pedir el plan de `onboard` no escribe nada: lo que escribe es aceptarlo.
  const escribe = QUE_ESCRIBEN.has(args[0]) && !args.includes('--dry-run') && args[1] !== 'status'
    // `memory` solo escribe con `on` y con `off`: `resume`, `metrics` y `status` miran.
    && (args[0] !== 'memory' || args[1] === 'on' || args[1] === 'off')
    && (args[0] !== 'onboard' || args.includes('--accept-plan'));
  if (escribe) {
    const malos = nombresQueSalenDeLaCarpeta();
    if (malos.length) {
      return { codigo: 1, salida: '', error: `no se corre ${args[0]}: hay nombres que salen de la carpeta (${malos.slice(0, 3).join(' · ')})` }; // diccionario: interno
    }
  }

  // Una carpeta que va por delante (P7, decisión 145). La barra no corre encima
  // la suya para escribir, que la bajaría sin avisar: RSC no compara versiones.
  // Y tampoco baja la de la carpeta de npm. npx lee el `.npmrc` de la carpeta,
  // así que una preparada podía mandarlo a su registro, o meter opciones de Node
  // que cargan un fichero suyo, y ejecutar lo que quisiera solo con abrir la barra
  // (revisión de seguridad del paso a la 3, H1, reproducido). Mirar sin escribir
  // se hace con la de dentro; escribir espera a que la barra se ponga al día, y
  // mientras tanto lo hace el asistente, si se lo piden.
  if (escribe && vaPorDelante()) {
    return { codigo: 1, salida: '', error: `no se corre ${args[0]}: la carpeta va por delante de la barra`, porDelante: true }; // diccionario: interno
  }

  // Al pasar de la 2 a la 3, o al montar, lo que la barra decide va justo antes de
  // escribir, en un solo sitio para todos los caminos; y si la orden no sale, se
  // quita (decisión 145, `decidir.js`).
  const puestas = escribe ? await require('./decidir').antesDeEscribir() : null;
  const hecho = await lanzar(args, opciones);
  if (puestas && hecho.codigo !== 0) require('./decidir').quitar(puestas);
  return hecho;
}

function lanzar(args, opciones) {
  const entrada = entorno.entradaDelArnes(proyecto.raiz(), carpetaDeLaExtension);
  if (entrada) return procesos.node([entrada, ...args], opciones);

  const npx = entorno.npxCli();
  if (npx) return procesos.node([npx, '--yes', paquete(), ...args], opciones);

  return procesos.delPath('npx', ['--yes', paquete(), ...args], opciones);
}

// Dónde se quedó la última sesión, según el checkpoint local de RSC. Devuelve
// null cuando no hay nada: RSC responde con éxito y un aviso entre paréntesis.
//
// ── Por qué esto tiene su propio recuerdo ────────────────────────────────
//
// Cuesta un proceso de Node entero, y se pedía en cada repintado. La brújula
// guarda su estado veinte segundos, pero **el camino del vigía se salta ese
// recuerdo**: repinta con `fresco`, y hace bien —si el asistente acaba de
// escribir un concepto, el número de conceptos tiene que subir ya—.
//
// El problema es meter esto en el mismo saco. Lo que sabe la brújula cambia
// cuando se toca un fichero; el registro de continuación **no**: solo cambia
// cuando se guarda un punto de sesión. Así que mientras el asistente trabaja
// —una tanda de cambios cada 600 ms— se arrancaba un proceso por tanda para
// releer algo que no se había movido.
//
// Un minuto, entonces, y aparte: el dato se usa para un rótulo de zona, no
// para nada que necesite estar al segundo. Y `olvidar()` para cuando se cambia
// de carpeta, que ahí sí es otro registro.
const CUANTO_DURA = 60000;
// Decisión 190: un fallo o un tiempo agotado también se recuerda, más rato. En una
// carpeta grande `memory resume` pasa de los 20 s, y como un fallo no se
// recordaba, se volvía a lanzar —y a esperar— en cada repintado. Cinco minutos:
// sin continuación durante ese rato, que es lo mismo que ya pasaba mientras
// fallaba, y sin un proceso nuevo por repintado.
const CUANTO_DURA_UN_FALLO = 5 * 60000;
let recordado = { cuando: 0, texto: null, raiz: null, fallo: false };
let enCurso = null; // { raiz, promesa }: dos repintados seguidos no lanzan dos procesos

const olvidarLaContinuacion = () => { recordado = { cuando: 0, texto: null, raiz: null, fallo: false }; enCurso = null; };

const loRecordado = (aqui) => (recordado.cuando
  && recordado.raiz === aqui
  && Date.now() - recordado.cuando < (recordado.fallo ? CUANTO_DURA_UN_FALLO : CUANTO_DURA)
  ? { texto: recordado.texto } : null);

async function retomar() {
  const aqui = proyecto.raiz();
  const visto = loRecordado(aqui);
  if (visto) return visto.texto;
  if (enCurso && enCurso.raiz === aqui) return enCurso.promesa;

  const promesa = (async () => {
    const { codigo, salida } = await correr(['memory', 'resume'], { tiempoMaximo: 20000 });
    // Un fallo se recuerda (más rato que un acierto): repetirlo al momento no lo arregla.
    if (codigo !== 0) {
      if (proyecto.raiz() === aqui) recordado = { cuando: Date.now(), texto: null, raiz: aqui, fallo: true };
      return null;
    }
    const texto = salida.trim();
    const limpio = !texto || /^\(no local continuation/i.test(texto) ? null : texto;
    if (proyecto.raiz() === aqui) recordado = { cuando: Date.now(), texto: limpio, raiz: aqui, fallo: false };
    return limpio;
  })();
  const mia = { raiz: aqui, promesa };
  enCurso = mia;
  try {
    return await promesa;
  } finally {
    if (enCurso === mia) enCurso = null;
  }
}

// Para pintar: lo recordado si lo hay; si no, se lanza y se espera lo justo. Lo
// que tarde más no frena la pantalla: sigue en marcha, se recuerda al acabar y
// sale en el siguiente repintado.
async function retomarSinEsperar(plazo = 2000) {
  let reloj;
  const tarde = new Promise((resolve) => { reloj = setTimeout(() => resolve(null), plazo); if (reloj.unref) reloj.unref(); });
  try {
    return await Promise.race([retomar().catch(() => null), tarde]);
  } finally {
    clearTimeout(reloj);
  }
}

// Los asistentes a los que se les pone o se les quita una habilidad: todos los declarados
// que sabemos dónde miran, a la vez; sin nada declarado, el de ahora (E2).
function losAsistentes() {
  const sitios = require('../media/railes/sitios');
  const declarados = ((proyecto.declaracion() || {}).targets || []).filter((q) => sitios.sitiosDe(q));
  return declarados.length ? declarados : [require('./donde').paraQuien()];
}

// Enseñarle algo nuevo del catálogo. El catálogo viaja dentro del paquete,
// así que esto no necesita red.
//
// OJO: `rsc add` de la 1.4.1 dice "Installed" pase lo que pase, incluso con un
// identificador que no existe (comprobado el 17-09-2026 con `add --help`). Por
// eso no se cree a su código de salida: se mira si la habilidad ha aparecido
// de verdad en el disco.
//
// En una carpeta que va por delante, el `add` de la barra dejaría su versión y la
// bajaría sin decirlo (revisión de F4, I2). Por eso `correr` usa ahí la suya.
async function anadir(id) {
  if (!/^[a-z0-9-]{2,40}$/.test(id)) return { ok: false };

  // Para todos los asistentes declarados que sabemos dónde miran, a la vez (`--target
  // claude,codex`, medido con el paquete): con uno solo, el otro se quedaba con una
  // habilidad declarada que no tenía (revisión de F5, m5). Sin nada declarado,
  // para el de ahora (E2). Por el objeto del módulo, para que se pueda fingir.
  const para = losAsistentes();
  const hecho = await module.exports.correr(['add', id, '--target', para.join(',')], { tiempoMaximo: 180000 });
  // En disco, no declarada: una que el arnés declaró y no puso no se da por añadida (G4).
  return { ok: hecho.codigo === 0 && para.every((quien) => habilidadesDelArnesEnDisco(quien).includes(id)) };
}

// Las habilidades que están **en disco, en este ordenador**.
//
// Va aparte de `habilidadesPuestas()` por un motivo concreto: aquella hace la
// unión con lo declarado en `.rsc.json`, y con esa unión un repositorio clonado
// es indetectable — lo declarado tapa lo que falta. Para saber si hay que
// traerlas hay que mirar el disco a secas.
//
// Con Cursor, cada habilidad es un fichero `<id>.mdc` en la carpeta de sus
// reglas, y ahí también deja RSC los suyos, que no son habilidades: el de siempre
// (`rsc-suggest.mdc`) y el de la memoria (`rsc-memory.mdc`). Van con `rsc-` delante
// (E3; revisión de F5, m3).
function habilidadesEnDisco() {
  const donde = require('./donde');
  const enSuCarpeta = habilidadesEn(donde.carpetaDeHabilidades());
  // Con Codex, las de botón van en `.agents/skills`, que es donde él las lee,
  // y no con las de RSC (decisión 141). Están puestas, así que se ven.
  const deBotones = donde.carpetaDeBotones();
  if (!deBotones || deBotones === donde.carpetaDeHabilidades()) return enSuCarpeta;
  return [...enSuCarpeta, ...habilidadesEn(deBotones).filter((id) => !enSuCarpeta.includes(id))];
}

function habilidadesDelArnesEnDisco(quien = require('./donde').paraQuien()) {
  const donde = require('./donde');
  const suyo = donde.SITIOS[quien] || {};
  return habilidadesEn(donde.carpetaDeOtro(quien, 'habilidades'), suyo.habilidadEnUnFichero || null);
}

function habilidadesEn(carpeta, ext = require('./donde').habilidadEnUnFichero()) {
  if (!carpeta || !fs.existsSync(carpeta)) return [];
  try {
    // Un enlace cuenta si lleva a algo: en Mac, RSC enlaza cada habilidad a
    // `.rsc/skills/<id>`, y sin esa carpeta el enlace apunta a nada (revisión de
    // F7, m1). `existsSync` sigue el enlace.
    const lleva = (e) => !e.isSymbolicLink() || fs.existsSync(path.join(carpeta, e.name));
    const entradas = fs.readdirSync(carpeta, { withFileTypes: true }).filter((e) => !e.name.startsWith('.') && lleva(e));
    if (!ext) return entradas.filter((e) => {
      if (!e.isDirectory() && !e.isSymbolicLink()) return false;
      try { return fs.statSync(path.join(carpeta, e.name, 'SKILL.md')).isFile(); } catch { return false; }
    }).map((e) => e.name);
    return entradas
      .filter((e) => (e.isFile() || e.isSymbolicLink()) && e.name.endsWith(ext) && !e.name.startsWith('rsc-'))
      .map((e) => e.name.slice(0, -ext.length));
  } catch {
    return [];
  }
}

// Las habilidades que esta carpeta tiene puestas: las de disco más las que
// declara el arnés. Es lo que la barra enseña.
// Las habilidades que trae el arnés de la clase, el que viaja dentro de la
// barra; o null si no se sabe dónde está.
function habilidadesDeLaClase() {
  const carpeta = carpetaDeLaExtension
    && path.join(carpetaDeLaExtension, 'media', 'harness', 'node_modules', '@ericrisco', 'rsc', 'skills');
  if (!carpeta || !fs.existsSync(carpeta)) return null;
  try {
    return new Set(fs.readdirSync(carpeta, { withFileTypes: true }).filter((e) => e.isDirectory()).map((e) => e.name));
  } catch {
    return null;
  }
}

function habilidadesPuestas() {
  const declaracion = proyecto.declaracion() || {};
  return [...new Set([...habilidadesEnDisco(), ...(declaracion.skills || []), ...(declaracion.ownSkills || [])])];
}

// ── Leer lo que contesta el arnés ────────────────────────────────────────

// `doctor --json` sale entero por la salida normal. Si no se puede leer, se
// dice que no se sabe: inventarse un informe sano sería peor que no tenerlo.
//
// Y sale con 1 cuando falta algo, con el informe entero igual: desde la 2.0.19
// (#277 de RSC, `scripts/rsc.js` y `healthy` en `scripts/doctor.js`). La barra
// lo tiraba, y «Algo va mal» y «Qué falta por montar» se quedaban sin saber nada
// justo con el arnés roto (decisión 157). Un 1 con un informe que dice que no
// está sano es un informe; lo demás —otro código, algo que no es un informe, o un
// 1 que no lo dice— sigue sin serlo.
function comoEstaDeSalud({ codigo, salida }) {
  if (codigo !== 0 && codigo !== 1) return null;
  try {
    const informe = JSON.parse(salida);
    if (!informe || typeof informe !== 'object' || Array.isArray(informe)) return null;
    return codigo === 1 && informe.healthy !== false ? null : informe;
  } catch {
    return null;
  }
}

// `repair --dry-run` imprime una línea por hallazgo, marcada `[fix]` si la sabe
// arreglar sola y `[ask]` si hace falta que alguien decida.
//
// La diferencia no es cosmética: `repair --yes` a ciegas aplicaría también los
// `[ask]`, y uno de ellos —`wrong-target`— **mueve el arnés a otro asistente**.
// Así que solo se deja arreglar solo lo que no pregunta nada.
function queHayQueArreglar({ codigo, salida }) {
  const texto = String(salida || '');
  if (codigo !== 0) return { sano: false, solas: [], aDecidir: [], sabemos: false };
  return {
    sabemos: true,
    sano: /Nothing to repair/i.test(texto),
    solas: texto.split('\n').map((l) => l.trim()).filter((l) => l.includes('[fix]')),
    aDecidir: texto.split('\n').map((l) => l.trim()).filter((l) => l.includes('[ask]')),
  };
}

// ── Lo que el doctor sabe y la barra no contaba ─────────────────────────
//
// `doctor --json` trae mucho más que «sano o no», y hasta hoy se pedía entero
// para no mirar dentro: la radiografía lanzaba tres procesos y leía uno. Lo
// que sigue son lectores de los campos que sí le importan a quien usa la
// barra. Cada uno devuelve `null` cuando el informe no se pudo leer, para que
// la pantalla pueda callar en vez de inventarse un «todo bien».

// Los guardianes: lo único del arnés que puede **decirle que no** a alguien.
//
// Son tres, se enganchan antes de cada orden y RSC los apunta en el recuento
// de enganches del informe (`contextBudget.scopes[].hookCounts.PreToolUse`).
// Que estén armados es lo normal y es bueno; lo que no puede ser es que nadie
// los nombre hasta que uno bloquea algo, que es justo cuando peor sienta.
//
// `gitmoji` tiene además su propio campo, porque se puede apagar y el informe
// dice si lo está. Los otros dos se apagan igual, con su fichero en `.rsc/`.
const LOS_GUARDIANES = ['danger-guard', 'gitmoji-guard', 'ship-guard', 'branch-guard'];

function queGuardianes(informe) {
  if (!informe) return null;

  const ambitos = (informe.contextBudget && informe.contextBudget.scopes) || [];
  const enganchados = new Set();
  for (const ambito of ambitos) {
    const antes = (ambito.hookCounts && ambito.hookCounts.PreToolUse) || {};
    for (const nombre of Object.keys(antes)) enganchados.add(nombre);
  }

  return LOS_GUARDIANES.map((id) => ({
    id,
    // El informe nombra el de gitmoji aparte, y ahí es donde dice si se apagó.
    apagado: id === 'gitmoji-guard' ? informe.gitmojiGuard === 'opted-out' : false,
    armado: enganchados.has(id),
  }));
}

// Las copias que guarda el propio arnés antes de tocar nada. No son las de
// git: RSC copia lo suyo antes de aplicar un plan, y eso es una red de
// seguridad que existe y que no se veía por ningún lado.
function queCopiasDelArnes(informe) {
  if (!informe || !informe.backups) return null;
  const { exists, count, latest } = informe.backups;
  return { hay: Boolean(exists), cuantas: count || 0, ultima: latest || null };
}

// Lo que el arnés declara y no está en disco. Con esto en rojo, la barra pinta
// botones que no responden — y era el caso que no se podía distinguir sin
// mirar aquí.
// Con la forma que escribe `scripts/doctor.js` de la 2.0.5 (G3): las habilidades
// como «id:ruta» —una por fichero que falta, y en Windows la ruta lleva sus dos
// puntos—, y los agentes y los comandos como objetos con su `id`. Tomarlas por
// nombres pintaba rutas y «[object Object]».
function queFaltaEnDisco(informe) {
  if (!informe) return null;
  const idDe = (cosa) => (cosa && typeof cosa === 'object' ? cosa.id : String(cosa || '').split(':')[0]);
  const falta = [];
  const poner = (lista, que) => {
    for (const cosa of lista || []) {
      const id = idDe(cosa);
      if (id && !falta.some((f) => f.id === id && f.que === que)) falta.push({ id, que });
    }
  };
  poner(informe.missing, 'habilidad');
  poner(informe.missingAgents, 'agente');
  poner(informe.missingCommands, 'comando');
  return falta;
}

// Si el arnés dice que está entero: nada de lo declarado falta y sus enganches
// pueden correr. `null` si no se sabe.
//
// Lo dice él, en `healthy`, desde la 2.0.19: es lo mismo que su código de salida
// (decisión 157). Hasta entonces `doctor` salía con 0 pase lo que pase (G3), y
// con un informe sin `healthy` se sigue mirando como antes.
function estaEntero(informe) {
  if (!informe) return null;
  if (typeof informe.healthy === 'boolean') return informe.healthy;
  const falta = queFaltaEnDisco(informe);
  return falta.length === 0 && informe.hookWired !== false;
}

// Lo que `reassess` recomienda, leído. Es de solo lectura, así que esto no
// puede cambiar nada: solo saber si hay algo que contar.
//
//   RSC_REASSESSMENT_NO_CHANGE      el plan sigue encajando
//   RSC_REASSESSMENT_RECOMMENDED    y detrás, una línea `tipo/id: por qué`
function queRecomienda({ codigo, salida }) {
  const texto = String(salida || '');
  if (codigo !== 0 || /RSC_REASSESSMENT_NO_CHANGE/.test(texto)) return [];

  return texto.split('\n')
    .map((l) => l.trim())
    .map((l) => l.match(/^(agent|guard|hook|workflow|skill|route|capability)\/([a-z0-9-]+):\s*(.+)$/))
    .filter(Boolean)
    .map(([, tipo, id, porQue]) => ({ tipo, id, porQue }));
}

// ── El plan, antes de aceptarlo ──────────────────────────────────────────
//
// `onboard` sin `--accept-plan` enseña el plan y no escribe nada. De ahí se lee
// lo que hace falta para decidir antes de firmar: la huella, la línea exacta de
// aceptación, lo que va a gestionar (`Managed paths:`, que en una carpeta de
// alguien incluye ficheros suyos), lo que ha elegido (`Selected:`) y si ha
// visto otro arnés por encima.
function leerElPlanEnSeco(salida = '') {
  const lineas = String(salida).split('\n');
  const seccion = (titulo) => {
    const desde = lineas.indexOf(titulo);
    if (desde < 0) return [];
    const hasta = lineas.findIndex((l, i) => i > desde && /^\S/.test(l));
    return lineas.slice(desde + 1, hasta < 0 ? undefined : hasta).map((l) => l.trim()).filter(Boolean);
  };
  const aceptar = (String(salida).match(/^Accept exactly this plan: npx @ericrisco\/rsc@\S+ onboard (.+)$/m) || [])[1];
  return {
    planId: (String(salida).match(/^Plan id: ([0-9a-f]{64})$/m) || [])[1] || null,
    aceptar: aceptar ? aceptar.trim().split(/\s+/) : [],
    gestionados: seccion('Managed paths:'),
    seleccionados: seccion('Selected:')
      .map((l) => l.match(/^\+ ([a-z-]+)\/(\S+) —/))
      .filter(Boolean)
      .map(([, kind, id]) => ({ kind, id })),
    avisos: lineas.filter((l) => /^Parent harness detected/.test(l)),
  };
}

// Lo que cambia entre lo que se aceptó y lo que propone un plan nuevo: lo que
// entra y lo que sale de «Selected». La huella puede cambiar solo porque cambió
// lo que hay en la carpeta, y eso no es una política nueva (decisión 95). Un
// recibo sin decisiones —de una versión anterior— no se puede comparar.
function cambiosDePolitica(seleccionados = [], decisiones) {
  if (!Array.isArray(decisiones)) return null;
  const clave = (d) => `${d.kind}/${d.id}`;
  const antes = new Set(decisiones.filter((d) => d && d.state === 'selected').map(clave));
  const ahora = new Set(seleccionados.map(clave));
  return {
    entran: [...ahora].filter((k) => !antes.has(k)).sort(),
    salen: [...antes].filter((k) => !ahora.has(k)).sort(),
  };
}

// ── Lo que contesta el montaje ───────────────────────────────────────────
//
// `onboard --accept-plan` termina de seis formas, y dos se llaman casi igual y
// no se parecen en nada (A3 de la auditoría todo-cuadra):
//
//   Listo          RSC_ONBOARDING_READY <huella>, por la salida normal
//   SueloAMedias   RSC_ONBOARDING_INCOMPLETE <huella>, por la salida normal y
//                  con código 0: el plan ESTÁ aplicado y falta parte del suelo.
//                  Pasa siempre que el plan practica SDD, porque entonces el
//                  suelo incluye los innegociables y `onboard` no los escribe
//   Deshecho       RSC_ONBOARDING_INCOMPLETE: …, por la de errores y con código
//                  4: falló a mitad y RSC lo ha deshecho
//   PlanCambiado   RSC_PLAN_CHANGED, con código 3
//   Invalido       RSC_ONBOARDING_INVALID o _REQUIRED, con código 2
//   Fallo          cualquier otra cosa
//
// La barra leía como un fallo todo lo que no fuera «listo», así que quien
// elegía algo que va a crecer se quedaba sin raíles, sin nombres y sin
// enganches, con el arnés montado debajo.
//
// Para dar un «a medias» por bueno, la huella tiene que ser la que se aceptó y
// la que RSC dejó escrita en el recibo: el de otro plan no es este montaje.
function comoAcaboElMontaje({ codigo, salida = '', error = '' }, { planId, aceptado } = {}) {
  const listo = salida.match(/^RSC_ONBOARDING_READY ([0-9a-f]{64})$/m);
  if (codigo === 0 && listo && (!planId || listo[1] === planId)) return { forma: 'Listo', planId: listo[1] };

  const aMedias = salida.match(/^RSC_ONBOARDING_INCOMPLETE ([0-9a-f]{64})$/m);
  if (codigo === 0 && aMedias && aMedias[1] === planId && aceptado === planId) {
    const faltan = [...salida.matchAll(/^\s+missing harness floor (.+)$/gm)].map((m) => m[1].trim());
    return { forma: 'SueloAMedias', planId, faltan };
  }

  if (codigo === 4 && /RSC_ONBOARDING_INCOMPLETE:/.test(error)) {
    const motivo = error.split('RSC_ONBOARDING_INCOMPLETE:')[1].split('. Recover with:')[0].trim();
    return { forma: 'Deshecho', motivo };
  }
  if (/RSC_PLAN_CHANGED/.test(`${salida}\n${error}`)) return { forma: 'PlanCambiado' };

  const invalido = error.match(/RSC_ONBOARDING_INVALID: invalid ([a-z-]+)/);
  if (invalido) return { forma: 'Invalido', campo: invalido[1] };
  const falta = error.match(/RSC_ONBOARDING_REQUIRED (\{.*\})/);
  if (falta) {
    try {
      return { forma: 'Invalido', campo: JSON.parse(falta[1]).missing.join(', ') };
    } catch {
      return { forma: 'Invalido', campo: null };
    }
  }
  return { forma: 'Fallo', codigo };
}

// De qué asistente se pregunta. Sin `--target`, con dos declarados RSC contesta
// por el primero de su lista, y con Codex roto y Claude entero «Algo va mal»
// decía que todo estaba bien (revisión de F7, importante 3). Es el mismo que el
// de la pieza «Lo que debería estar puesto», que lee este informe.
function delDeAhora() {
  const declarados = (proyecto.declaracion() || {}).targets;
  return Array.isArray(declarados) && declarados.length ? ['--target', require('./donde').paraQuien()] : [];
}

const revisar = () => module.exports.correr(['doctor', ...delDeAhora()], { tiempoMaximo: 120000 });

// El mismo doctor, pero para máquina. Sin `--json` la salida lleva delante el
// bloque de presupuesto de contexto, en texto, así que `JSON.parse` revienta.
// `revisar()` se queda como está: esa la lee una persona, en el informe.
const salud = () => module.exports.correr(['doctor', '--json', ...delDeAhora()], { tiempoMaximo: 120000 });

// Traer a esta máquina lo que el repositorio declara. Es la acción correcta
// para un clon: reconstruye desde el plan aceptado y —a diferencia de `add` y
// de `install`— no exige que ya haya un arnés instalado aquí, que en un clon
// es justo lo que no hay.
const sincronizar = () => correr(['sync'], { tiempoMaximo: 300000 });

// Si lo que se acordó al montar sigue encajando con lo que hay hoy. Es de
// **solo lectura**: recomienda y no escribe nada. Aceptar un plan nuevo lo
// tiene que hacer una persona, por su huella.
const reevaluar = () => correr(['reassess'], { tiempoMaximo: 60000 });
const arreglarEnSeco = () => correr(['repair', '--dry-run'], { tiempoMaximo: 120000 });

// `repair` vuelve a instalar sin la política del plan aceptado: medido con el
// paquete, en una carpeta de operaciones con algo roto engancha los cuatro frenos
// de RSC, que ese plan no pide, y el siguiente `sync` los quita (C6). Qué frenos
// había dependía de qué orden corrió la barra la última vez. Así que detrás de
// cada `repair` que sale bien va un `sync`, que aplica el plan que alguien
// aceptó. Si el `sync` falla, se dice ese fallo.
async function yDespuesElPlan(reparado, sincronizarlo = sincronizar) {
  if (reparado.codigo !== 0) return reparado;
  const sincronizado = await sincronizarlo();
  if (sincronizado.codigo === 0) return reparado;
  return { ...sincronizado, salida: [reparado.salida, sincronizado.salida].filter(Boolean).join('\n') };
}

const arreglar = async () => yDespuesElPlan(await correr(['repair'], { tiempoMaximo: 180000 }));

// Arreglar sin que nadie conteste. Solo se llama cuando `queHayQueArreglar()`
// ha dicho que no hay nada que preguntar: ver arriba por qué.
const arreglarSolo = async () => yDespuesElPlan(await correr(['repair', '--yes'], { tiempoMaximo: 180000 }));

// Lo que un `sync --dry-run` dice que tocaría, relativo a la carpeta. RSC lo
// escribe con la ruta entera, dos espacios delante, debajo de «Would sync»; en un
// Mac, la carpeta temporal puede salir por `/private` (medido con el paquete).
function loQueTocaElSync(salida, raiz) {
  if (!raiz) return [];
  const raices = [raiz];
  try {
    raices.push(fs.realpathSync(raiz));
  } catch { /* con la que hay basta */ }
  const dentro = (ruta) => {
    for (const base of raices) {
      const rel = path.relative(base, ruta);
      if (rel && !rel.startsWith('..') && !path.isAbsolute(rel)) return rel.split(path.sep).join('/');
    }
    return null;
  };
  return String(salida || '').split('\n')
    .map((linea) => (linea.match(/^ {2}(\S.*)$/) || [])[1])
    .filter(Boolean)
    .map((ruta) => dentro(ruta.trim()))
    .filter(Boolean);
}

// Qué arnés corre de verdad, para el informe de «Algo va mal» (G2).
const queArnes = () => entorno.entradaDelArnes(proyecto.raiz(), carpetaDeLaExtension);

module.exports = {
  loQueTocaElSync,
  queArnes,
  correr, retomar, retomarSinEsperar, revisar, salud, sincronizar, reevaluar, arreglarEnSeco, arreglar, arreglarSolo,
  comoEstaDeSalud, queHayQueArreglar, queRecomienda, comoAcaboElMontaje, leerElPlanEnSeco, cambiosDePolitica,
  queGuardianes, queCopiasDelArnes, queFaltaEnDisco, estaEntero, LOS_GUARDIANES,
  olvidarLaContinuacion,
  paquete, vaPorDelante, nombresQueSalenDeLaCarpeta, VERSION_DE_RESPALDO, comoEsLaVersion, habilidadesDeLaClase, yDespuesElPlan, saberDondeEstamos, habilidadesPuestas, habilidadesEnDisco, habilidadesDelArnesEnDisco, anadir, losAsistentes,
};
