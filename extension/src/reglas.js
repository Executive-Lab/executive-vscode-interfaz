// Las reglas de esta carpeta: lo que el asistente tiene que respetar siempre.
//
// ── Dónde vive, que son tres sitios y ninguno se veía ─────────────────────
//
// Me equivoqué al decirle a Jose que esto no existía en RSC. Existe, y es de
// lo primero que se lee:
//
//   · `02-DOCS/wiki/sdd/constitution.md` — los **innegociables** del proyecto.
//     El `CLAUDE.md` que escribe el arnés lo pone en su mapa bajo el rótulo
//     "Read first, always", junto al perfil de usuario y nada más. O sea: de
//     los cientos de ficheros de una carpeta, estos dos son los que se leen
//     antes de cada cosa que se hace.
//   · `CLAUDE.md`, sección "Working rules" — las reglas de la casa para
//     Claude: qué no se toca, qué no se publica, qué se mira antes.
//   · `AGENTS.md` — lo mismo para todo lo que no es Claude (Codex, Cursor).
//     El propio arnés dice que los dos van alineados.
//
// La constitución solo aparece cuando el arnés se monta con SDD; los otros dos
// los escribe siempre. Por eso aquí no se exige ninguno: se enseña lo que haya
// y se dice con todas las letras lo que falta, que es lo que permite ponerlo.

const fs = require('node:fs');
const proyecto = require('./proyecto');
const asistentes = require('./asistentes');
const donde = require('./donde');
const nombres = require('./nombres');
const trato = require('./trato');

const CONSTITUCION = ['02-DOCS', 'wiki', 'sdd', 'constitution.md'];
const DE_CLAUDE = ['CLAUDE.md'];
const DE_LOS_DEMAS = ['AGENTS.md'];

// Codex escoge el primer fichero no vacío de este nivel. La ficha y «verlas
// enteras» resuelven lo mismo; nunca se completan con las reglas de Claude.
function reglasDeCodex() {
  return require('../media/railes/sitios').dondeVaLoDeSiempre('codex', proyecto.raiz());
}

// ── Las reglas que no se piden por favor: se aplican solas ───────────────
//
// Los guardianes son lo único del arnés que puede **decirle que no** a
// alguien: se enganchan antes de cada orden y la paran si no cumple. Y no se
// nombraban en ningún sitio de la barra, así que quien recibía un bloqueo veía
// un mensaje en inglés que empieza por `BLOCKED` y no tenía dónde mirar.
//
// Se leen **del disco y gratis**, sin lanzar el arnés: cada uno mira su propio
// fichero para saber si está apagado (lo comprobé en su código,
// `targets/*-guard.mjs`), así que mirar ese mismo fichero es leer exactamente
// lo que él va a leer. El informe del doctor también lo sabe, pero cuesta un
// proceso, y esta pantalla se abre para leer, no para esperar.
//
// El sufijo del interruptor NO es uniforme —el de gitmoji es `.no-gitmoji`, no
// `.no-gitmoji-guard`— así que va escrito uno por uno y no calculado.
const GUARDIANES = [
  { id: 'danger-guard', fichero: 'danger-guard.mjs', interruptor: '.no-danger-guard', conUnTecnicoPregunta: true },
  { id: 'gitmoji-guard', fichero: 'gitmoji-guard.mjs', interruptor: '.no-gitmoji' },
  { id: 'ship-guard', fichero: 'ship-guard.mjs', interruptor: '.no-ship-guard' },
  // De la 3 (decisión 145). El de la rama principal no frena en las carpetas de
  // la barra, que la dejan abierta (`.no-trunk-guard`), como se dijo en clase.
  { id: 'branch-guard', fichero: 'branch-guard.mjs', interruptor: '.no-trunk-guard' },
  { id: 'copy-guard', fichero: 'copy-guard.mjs', interruptor: '.no-copy-guard' },
  // De la 4 (decisión 200). Va dentro de `ship-guard`, solo se monta con la cadena
  // ASDD y tiene su propio interruptor: antes de subir a GitHub un cambio de riesgo
  // pide su especificación. En la rama principal no actúa, y en las carpetas de la
  // barra se trabaja en ella.
  { id: 'asdd-gate', fichero: 'asdd-gate.mjs', interruptor: '.no-asdd-gate' },
];

const hayEnRsc = (nombre) => {
  const ruta = proyecto.ruta('.rsc', nombre);
  return Boolean(ruta && fs.existsSync(ruta));
};

// Lo que RSC decide por máquina vive en la carpeta personal, en `~/.rsc/`, y no en
// la de la carpeta (`MACHINE_OPT_OUTS` de `targets/opt-outs.js`). Hoy, solo la
// oferta de MemSlop (decisión 200).
const hayEnCasa = (nombre) => {
  try {
    return fs.existsSync(require('node:path').join(require('node:os').homedir(), '.rsc', nombre));
  } catch {
    return false;
  }
};

// ── Lo que hace solo, sin parar nada ─────────────────────────────────────
//
// Además de los tres frenos, el arnés engancha piezas que no le dicen que no
// a nadie: recuerdan, guardan, recogen. No se nombraban, y son la mitad de lo
// que un alumno ve pasar sin saber qué es —la brújula que aparece al abrir,
// el aviso de apuntar el diario al cerrar— (decisión 102). Se leen del disco
// como los guardianes: existe su fichero en `.rsc/`, y su interruptor `.no-*`
// es el que mira el propio código de RSC (`targets/session-start.mjs`,
// `userprompt-gate.mjs`, `worktree-reaper.mjs`, `scripts/install-apply.js`).
//
// Las tres comprobaciones de arranque —revisión periódica, arnés duplicado,
// reglas largas— viven dentro de `session-start.mjs`: están si está él.
// `context7` no deja fichero propio: RSC escribe el interruptor cuando el plan
// lo apaga, y si lo enciende lo apunta en la configuración del asistente. Se
// nombra cuando hay interruptor, que es cuando hay algo que explicar.
const AUTOMATISMOS = [
  { id: 'session-start', fichero: 'session-start.mjs' },
  { id: 'worklog-checkpoint', fichero: 'worklog-checkpoint.mjs' },
  { id: 'userprompt-gate', fichero: 'userprompt-gate.mjs', interruptor: '.no-feature-gate' },
  // Estas dos las monta RSC para cualquier asistente: la recogida es un enganche
  // de git, y la memoria tiene su sitio también con Codex (`targets/memory.js`).
  { id: 'worktree-reaper', fichero: 'worktree-reaper.mjs', interruptor: '.no-worktree-cleanup', paraTodos: true },
  { id: 'session-memory', fichero: 'session-memory.mjs', paraTodos: true },
  { id: 'audit', fichero: 'session-start.mjs', interruptor: '.no-audit' },
  { id: 'scope-check', fichero: 'session-start.mjs', interruptor: '.no-scope-check' },
  { id: 'claudemd-check', fichero: 'session-start.mjs', interruptor: '.no-claudemd-check' },
  { id: 'context7', interruptor: '.no-context7' },
  // Dos avisos más del arranque, que el asistente calla cuando alguien le dice
  // que no (lo pide el propio texto de RSC): el de una carpeta sin git y el de
  // preparar el arnés. En una carpeta montada no dicen nada —hay git y hay
  // perfil—, así que se nombran solo apagados, como context7: cuando hay algo
  // que explicar. El de preparar el arnés no es solo del arranque: lo lee
  // también `suggest`, que va con cualquier asistente.
  { id: 'git-check', fichero: 'session-start.mjs', interruptor: '.no-git', soloApagado: true },
  { id: 'onboarding', interruptor: '.no-harness' },
  // Y el de versión nueva, que la barra apaga al abrirse con
  // `RSC_NO_UPDATE_CHECK` (C4, `relevo.js`). No tiene fichero: se mira donde lo
  // mira el propio enganche, en el entorno que hereda. En la barra sale siempre
  // apagado, porque `ponerAlActivar` lo apaga antes de pintar nada; se mira igual
  // para que, si eso dejara de pasar, aquí se dijera activo y no apagado. Y si el
  // asistente ya estaba en marcha, su conversación no lo ve hasta abrirla otra
  // vez, como el relevo: eso lo pide la pieza del relevo.
  { id: 'update-check', fichero: 'session-start.mjs', entorno: 'RSC_NO_UPDATE_CHECK', porQueApagado: 'Apagado a propósito: aquí va la versión de tu clase' },
  // De la 3 (decisión 145). La actualización sola la apaga el mismo entorno que el
  // aviso; la wiki compartida y la rama principal las decide la barra al montar.
  { id: 'auto-update', fichero: 'auto-update.mjs', interruptor: '.no-auto-update', entorno: 'RSC_NO_UPDATE_CHECK', porQueApagado: 'Apagado a propósito: las versiones las lleva la barra' },
  { id: 'knowledge-sync', fichero: 'knowledge-sync.mjs', interruptor: '.no-knowledge-sync', porQueApagado: 'Apagado a propósito: compartir con tu equipo, cuando digas' },
  { id: 'ftd-nudge', fichero: 'ftd-nudge.mjs', interruptor: '.no-ftd-nudge' },
  { id: 'ftd-close', interruptor: '.no-ftd-close' },
  { id: 'trunk-open', interruptor: '.no-trunk-open' },
  // Apagado por la barra en sus carpetas (decisión 157): con dos conversaciones, a
  // un alumno lo mandaban a trabajar a otra carpeta.
  { id: 'worktree-isolation', interruptor: '.no-worktree-isolation', porQueApagado: 'Apagado a propósito: todo se hace en esta carpeta' },
  // De la 4 (decisión 200). Los emoji: el montaje los deja como antes, encendidos, y
  // `rsc emoji off` los quita para todo el equipo. Lo leen el arranque y el guardián
  // de git, desde `emoji-policy.mjs`.
  { id: 'emoji', fichero: 'emoji-policy.mjs', interruptor: '.no-emoji' },
  // La oferta de MemSlop, una app del Mac. Su «no» es de la máquina (`~/.rsc/.no-memslop`)
  // y la barra lo pone al abrirse (`relevo.callarLaOfertaDeMemSlop`): su instalación pasa
  // por una orden que el freno le para a quien no es técnico, y ofrecer algo que acaba en
  // un bloqueo es un mensaje sin salida (decisión 183). Fuera del Mac, RSC no la ofrece.
  {
    id: 'memslop', fichero: 'memslop-offer.mjs', interruptor: '.no-memslop', enCasa: true, soloEnMac: true, paraTodos: true,
    porQueApagado: 'Apagado a propósito: aquí no hace falta',
  },
];

// La memoria no tiene interruptor: se apaga en la declaración, con
// `memory: false` (`targets/memory.js`, `memoryEnabledForProject`). Salía
// activa estando apagada (C5).
const memoriaApagada = () => (proyecto.declaracion() || {}).memory === false;
const estaApagado = (a) => Boolean(a.interruptor && (a.enCasa ? hayEnCasa(a.interruptor) : hayEnRsc(a.interruptor)))
  || Boolean(a.entorno && process.env[a.entorno])
  || (a.id === 'session-memory' && memoriaApagada());

// Lo que RSC solo hace en un Mac no se nombra en otro sitio: estaría contando algo
// que ahí no pasa nunca. Y lo que se apaga en la carpeta personal vale para todas
// las carpetas de la máquina: aquí solo se cuenta si esta carpeta trae la pieza.
// Sin eso, una carpeta de la 3, donde no hay oferta que callar, la nombraba apagada.
const enEsteSistema = (a) => (!a.soloEnMac || process.platform === 'darwin') && (!a.enCasa || hayEnRsc(a.fichero));

function losAutomatismos() {
  return AUTOMATISMOS
    .filter((a) => hayEnRsc(a.fichero || a.interruptor) && enEsteSistema(a) && (!a.soloApagado || estaApagado(a)))
    .map((a) => {
      const dicho = nombres.comoSeLlama('automatismos', a.id, {});
      const apagado = estaApagado(a);
      return {
        id: a.id,
        nombre: dicho.nombre,
        queHace: dicho.queHace,
        estado: apagado ? 'apagado' : 'activo',
        porQue: apagado ? a.porQueApagado || 'Apagado aquí, a propósito' : '',
      };
    });
}

// ── Lo que aquí se decidió no usar, junto y en español ───────────────────
//
// Dos fuentes que decían lo mismo a medias: `optOuts` de `.rsc.json` (lo que
// el plan aceptado apagó) y los interruptores `.rsc/.no-*` (lo que de verdad
// mira cada pieza al arrancar). La radiografía leía solo la primera y la
// enseñaba con el identificador en clave. Ahora se unen, sin repetir, y cada
// uno se nombra por su fila de guardián o de automatismo.
//
// En `optOuts` RSC escribe los mismos interruptores sin el `.no-`
// (`install-apply.js`, `localDecisions`), así que cada uno se traduce a la pieza
// que apaga su propio interruptor. Se sabía solo el de gitmoji, y `feature-gate`
// o `worktree-cleanup` salían en clave, y además de con su nombre (C5).
const OPT_OUT_A_PIEZA = Object.fromEntries([...GUARDIANES, ...AUTOMATISMOS]
  .filter((p) => p.interruptor)
  .map((p) => [p.interruptor.replace(/^\.no-/, ''), p.id]));

// ── Y lo que aquí no puede estar puesto tampoco está apagado ─────────────
//
// Apagado es una decisión sobre algo que podría estar. Con Codex, RSC no
// engancha ninguna de estas piezas —lo dice su instalador en una línea, y
// `sitios.js` lo copia en la columna `frenos`—, así que nombrarlas aquí es
// contar una decisión que nadie tomó.
//
// Y pasaba: nuestros propios raíles dejan `.no-audit`, `.no-worktree-cleanup` y
// `.no-scope-check` en `.rsc/` sea cual sea el asistente (los dos primeros, solo
// en las carpetas cuyo historial creó la barra; decisión 161), así que una carpeta de
// Codex decía tener apagada «La revisión periódica de habilidades» cuando ahí esa
// revisión no existe. La memoria entre conversaciones no se ve afectada: esa sí
// la monta RSC para Codex, y no tiene interruptor.
//
// Se mira por la clase de pieza y no por si está su fichero en `.rsc/`, porque
// `.rsc/` es de esta máquina y no viaja: en un clon no habría ni un interruptor,
// y lo que la declaración dice que se apagó sí tiene que seguir contándose.
//
// Lo que RSC monta para cualquier asistente cuenta con cualquiera, si está: la
// recogida solo se monta cuando el plan gobierna el código, y un interruptor de
// nuestros raíles sin su pieza sería otra vez contar lo que nadie decidió.
const puedeEstarAqui = (pieza) => {
  if (!pieza || !pieza.fichero || donde.puedeTenerFrenos()) return true;
  return Boolean(pieza.paraTodos && hayEnRsc(pieza.fichero));
};

function loApagado() {
  const nombrar = (monton, id) => nombres.comoSeLlama(monton, id, {}).nombre;
  const lista = [];
  const meter = (id, nombre) => {
    if (!lista.some((x) => x.nombre === nombre)) lista.push({ id, nombre });
  };
  for (const g of GUARDIANES) if (hayEnRsc(g.interruptor) && puedeEstarAqui(g)) meter(g.id, nombrar('guardianes', g.id));
  for (const a of AUTOMATISMOS) {
    if (estaApagado(a) && puedeEstarAqui(a) && enEsteSistema(a)) meter(a.id, nombrar('automatismos', a.id));
  }

  const declarados = (proyecto.declaracion() || {}).optOuts;
  for (const id of Array.isArray(declarados) ? declarados : []) {
    const pieza = OPT_OUT_A_PIEZA[id] || id;
    const esGuardian = GUARDIANES.find((g) => g.id === pieza);
    // Uno que no conocemos se nombra igual: no saber qué es no da derecho a
    // tragárselo. Lo que sí se calla es lo que sabemos que ahí no se monta.
    if (!puedeEstarAqui(esGuardian || AUTOMATISMOS.find((a) => a.id === pieza))) continue;
    meter(pieza, nombrar(esGuardian ? 'guardianes' : 'automatismos', pieza));
  }
  return lista;
}

// ── Los interruptores que la persona mueve con un clic (decisiones 172, 176 y 201) ─
//
// RSC 3.0.22 trae una orden oficial para cada uno: `main lock|unlock`,
// `isolation on|off` y `knowledge-sync on|off`. Escriben la marca de `.rsc/`, la
// apuntan en `.rsc.json` (que va a git: es una decisión del equipo) y rehacen lo
// montado. La barra llama a la orden, nunca escribe las marcas a mano.
//
// El estado sale de las mismas marcas que lee el propio RSC (`trunkPolicy`,
// `branch-guard.mjs`, `knowledge-sync.mjs`), no de las filas de «Lo que se
// comprueba solo»: esas dependen de qué guardianes se montaron, y en una carpeta
// de empresa, sin código, no hay freno de la rama principal aunque la marca
// siga mandando en lo demás. Se enseña donde está `trunk-policy.mjs`, que RSC
// copia con todo arnés de la 3 para Claude, y con Codex no, que no engancha nada.
const EQUIPO = 'Es una decisión del equipo: queda apuntada para guardarla en git y que todos trabajen igual.';
const INTERRUPTORES = {
  principal: {
    nombre: 'La rama principal',
    // `.no-trunk-guard` la abre y manda sobre todo; `.no-trunk-open` la cierra; sin ninguna
    // decide el proyecto: se cierra sola con equipo, CI o publicación (`trunkPolicy`).
    estado: () => (hayEnRsc('.no-trunk-guard') ? 'abierta' : (hayEnRsc('.no-trunk-open') ? 'cerrada' : 'segun')),
    dice: {
      abierta: 'La rama principal está abierta: el asistente trabaja directamente en ella, sin preguntar.',
      cerrada: 'La rama principal está cerrada: el asistente trabaja en una copia aparte y te pregunta antes de tocarla.',
      segun: 'La rama principal se cierra sola si el proyecto tiene equipo o está publicado; si no, el asistente decide.',
    },
    botones: { abierta: ['principal-cerrar'], cerrada: ['principal-abrir'], segun: ['principal-cerrar', 'principal-abrir'] },
  },
  aparte: {
    nombre: 'El trabajo aparte',
    estado: () => (hayEnRsc('.no-worktree-isolation') ? 'apagado' : 'encendido'),
    dice: {
      encendido: 'Con otra conversación en esta carpeta, lo nuevo se hace en una copia aparte para no pisarla.',
      apagado: 'Todas las conversaciones trabajan en esta misma carpeta.',
    },
    botones: { encendido: ['aparte-apagar'], apagado: ['aparte-encender'] },
  },
  wiki: {
    nombre: 'Compartir el conocimiento con el equipo',
    estado: () => (hayEnRsc('.no-knowledge-sync') ? 'apagado' : 'encendido'),
    dice: {
      encendido: 'Las conexiones y lo que sabe de tu empresa se suben solos a la copia compartida, y se traen los de los demás.',
      apagado: 'Cada uno trabaja con lo suyo: nada se sube ni se trae solo.',
    },
    botones: { encendido: ['wiki-dejar'], apagado: ['wiki-compartir'] },
  },
  // La memoria entre conversaciones (decisión 176): `memory on|off`. No es una marca de
  // `.rsc/`: RSC la apunta en `.rsc.json` (`memory: false`) y rehace los enganches de
  // cada asistente (Claude en `.claude/settings.local.json`, Codex en `.codex/hooks.json`).
  memoria: {
    nombre: 'Recordar entre conversaciones',
    cuando: () => hayMemoria(),
    estado: () => (memoriaApagada() ? 'apagado' : 'encendido'),
    dice: {
      encendido: 'El asistente se acuerda de lo que hicisteis la última vez y sigue por ahí.',
      apagado: 'El asistente empieza cada conversación de cero.',
    },
    botones: { encendido: ['memoria-dejar'], apagado: ['memoria-recordar'] },
  },
  // Los dibujos en las respuestas (decisión 201): `emoji on|off`, de la 4. RSC escribe o
  // quita `.rsc/.no-emoji` y lo apunta en `.rsc.json`: lo decide el equipo. El montaje los
  // deja encendidos sin preguntar (decisión 200), y una preferencia no se rellena por
  // defecto (P9): aquí se cambia a un clic. Sale con Claude, que es a quien RSC le monta la
  // pieza que lo lee, donde está esa pieza o donde ya están apagados, para poder volver a
  // ponerlos. Con Codex solo, no: nada suyo lee la marca, y la frase prometería algo que no
  // pasa (revisión de la 201).
  emoji: {
    nombre: 'Dibujos en las respuestas (emoji)',
    cuando: () => conClaude() && (hayEnRsc('emoji-policy.mjs') || hayEnRsc('.no-emoji')),
    estado: () => (hayEnRsc('.no-emoji') ? 'apagado' : 'encendido'),
    dice: {
      encendido: 'El asistente usa dibujos (emoji) en sus respuestas y en lo que guarda.',
      apagado: 'El asistente escribe solo con palabras, sin dibujos (emoji).',
    },
    botones: { encendido: ['emoji-quitar'], apagado: ['emoji-poner'] },
  },
};

// Cada botón: su orden, lo que cambia al pulsarlo y cómo tiene que quedar la
// carpeta después. Lo único que manda el panel es el nombre del botón.
const BOTONES = {
  'principal-cerrar': { cual: 'principal', etiqueta: 'Cerrar la rama principal', args: ['main', 'lock'], llega: 'cerrada', queCambia: 'Si la cierras, el asistente trabaja en una copia aparte y te pregunta antes de tocarla.' },
  'principal-abrir': { cual: 'principal', etiqueta: 'Abrir la rama principal', args: ['main', 'unlock'], llega: 'abierta', queCambia: 'Si la abres, el asistente trabaja directamente en ella, sin preguntar.' },
  'aparte-apagar': { cual: 'aparte', etiqueta: 'Apagar el trabajo aparte', args: ['isolation', 'off'], llega: 'apagado', queCambia: 'Si lo apagas, todas las conversaciones trabajan en esta misma carpeta.' },
  'aparte-encender': { cual: 'aparte', etiqueta: 'Encender el trabajo aparte', args: ['isolation', 'on'], llega: 'encendido', queCambia: 'Si lo enciendes, con otra conversación en marcha lo nuevo se hace en una copia aparte.' },
  'wiki-dejar': { cual: 'wiki', etiqueta: 'Dejar de compartir el conocimiento', args: ['knowledge-sync', 'off'], llega: 'apagado', queCambia: 'Si lo dejas, cada uno trabaja con lo suyo.' },
  'memoria-dejar': { cual: 'memoria', etiqueta: 'Dejar de recordar entre conversaciones', args: ['memory', 'off'], llega: 'apagado', queCambia: 'Si lo dejas, el asistente empieza cada conversación de cero.' },
  'memoria-recordar': { cual: 'memoria', etiqueta: 'Recordar entre conversaciones', args: ['memory', 'on'], llega: 'encendido', queCambia: 'Si lo enciendes, el asistente se acordará de lo que hicisteis la última vez.' },
  'wiki-compartir': { cual: 'wiki', etiqueta: 'Compartir el conocimiento', args: ['knowledge-sync', 'on'], llega: 'encendido', queCambia: 'Si lo compartes, las conexiones y lo que sabe de tu empresa se suben solos y se traen los de los demás.' },
  'emoji-quitar': { cual: 'emoji', etiqueta: 'Quitar los dibujos', args: ['emoji', 'off'], llega: 'apagado', queCambia: 'Si los quitas, el asistente escribe solo con palabras.' },
  'emoji-poner': { cual: 'emoji', etiqueta: 'Poner los dibujos', args: ['emoji', 'on'], llega: 'encendido', queCambia: 'Si los pones, el asistente vuelve a usar dibujos (emoji) en sus respuestas.' },
};

const hayArnesDeLaTres = () => donde.puedeTenerFrenos() && hayEnRsc('trunk-policy.mjs');

// La memoria la monta RSC para Claude y para Codex (`targets/memory.js`), así que se
// ofrece en cuanto la carpeta es de uno de los dos y el arnés trae su pieza: no hace
// falta que haya frenos. Con otro asistente, o con una carpeta sin la pieza (la 2),
// no hay nada que mover.
// Si Claude es uno de los asistentes de esta carpeta: los que declara, o con el que se trabaja.
const conClaude = () => {
  const dec = proyecto.declaracion() || {};
  const quienes = Array.isArray(dec.targets) && dec.targets.length ? dec.targets : [asistentes.conQuien().id];
  return quienes.includes('claude');
};

const hayMemoria = () => {
  const dec = proyecto.declaracion() || {};
  const quienes = Array.isArray(dec.targets) && dec.targets.length ? dec.targets : [asistentes.conQuien().id];
  return quienes.some((t) => t === 'claude' || t === 'codex')
    && (hayEnRsc('session-memory.mjs') || hayEnRsc('trunk-policy.mjs') || memoriaApagada());
};
const aplica = (i) => (i.cuando ? i.cuando() : hayArnesDeLaTres());

// Lo que enseña la pantalla: cómo está cada uno, y los botones que tocan.
function losInterruptores() {
  return Object.entries(INTERRUPTORES).filter(([, i]) => aplica(i)).map(([cual, i]) => {
    const estado = i.estado();
    return {
      cual,
      nombre: i.nombre,
      estado,
      dice: i.dice[estado],
      equipo: EQUIPO,
      botones: i.botones[estado].map((id) => ({ id, etiqueta: BOTONES[id].etiqueta, queCambia: BOTONES[id].queCambia })),
    };
  });
}

// El botón que se ha pulsado, si es uno nuestro y hay algo que cambiar aquí. Una
// cadena y nada más: `__proto__` o un array no son un nombre.
const elBoton = (id) => (typeof id === 'string' && Object.prototype.hasOwnProperty.call(BOTONES, id) && aplica(INTERRUPTORES[BOTONES[id].cual]) ? BOTONES[id] : null);
const estadoDe = (cual) => INTERRUPTORES[cual].estado();

// El freno ante órdenes peligrosas puede venir de dos sitios (C1): el de RSC,
// que solo se engancha cuando el plan practica la cadena SDD, y el nuestro, que
// ponen los raíles con la misma copia (`freno.mjs`). Si están los dos, manda el
// de RSC y el nuestro se aparta, así que el que cuenta es ese. El nuestro puede
// estar sin enganchar: en una carpeta cuyo historial no creó la barra, se espera
// a su sí (C-4).
//
// «Enganchado» es una entrada de verdad antes de cada orden de Bash, no su
// nombre en cualquier sitio de los ajustes: con él en una nota, o enganchado a
// otra herramienta, el nuestro se apartaba sin que frenara nadie y aquí se decía
// que lo ponía el arnés (revisión final, crítico). El envoltorio `freno.mjs`
// decide con la misma regla.
function alcanzaABash(matcher) {
  if (matcher === undefined || matcher === null || matcher === '' || matcher === '*') return true;
  if (typeof matcher !== 'string') return false;
  try {
    return new RegExp(`^(?:${matcher})$`).test('Bash');
  } catch {
    return matcher === 'Bash';
  }
}

function enganchadoAntesDeBash(texto, aguja) {
  let ajustes;
  try {
    ajustes = JSON.parse(texto || '');
  } catch {
    return false;
  }
  const entradas = ajustes && ajustes.hooks && ajustes.hooks.PreToolUse;
  if (!Array.isArray(entradas)) return false;
  return entradas.some((e) => e && Array.isArray(e.hooks) && alcanzaABash(e.matcher)
    && e.hooks.some((h) => h && typeof h.command === 'string' && h.command.includes(aguja)));
}

function elDeRscEstaPuesto() {
  return hayEnRsc('danger-guard.mjs') && enganchadoAntesDeBash(leer('.claude', 'settings.json'), '.rsc/danger-guard.');
}

function comoEstaElNuestro() {
  if (!donde.puedeTenerFrenos()) return { enganchado: false, pendiente: false };
  const habilidades = donde.carpetaDeHabilidades();
  const esta = Boolean(habilidades && fs.existsSync(require('node:path').join(habilidades, 'executive-lab', 'freno.mjs')));
  const enganchado = enganchadoAntesDeBash(leer('.claude', 'settings.json'), '/executive-lab/freno.mjs');
  return { enganchado: esta && enganchado, pendiente: esta && !enganchado };
}

// Qué guardianes hay montados y cuáles están actuando ahora mismo.
//
// Tres estados, y los tres significan cosas distintas para quien mira:
//   'armado'    está y te puede parar
//   'apagado'   está, y alguien decidió aquí que no actúe
//   'pendiente' el nuestro, a falta de engancharlo en sus ajustes
//
// El de órdenes peligrosas actúa también con quien es técnico, pero de otra
// forma: no le bloquea nada y le pregunta antes de lo que no tiene vuelta atrás
// (`FOR_EVERYONE` en el de RSC). Antes salía «no aplica», y no era verdad
// (decisión 205).
function losGuardianes() {
  const eresTecnico = trato.comoEstamos().palabras === 'technical';
  const nuestro = comoEstaElNuestro();
  const conElNuestro = (g) => g.id === 'danger-guard' && (nuestro.enganchado || nuestro.pendiente);

  return GUARDIANES
    .filter((g) => hayEnRsc(g.fichero) || conElNuestro(g))
    .map((g) => {
      const dicho = nombres.comoSeLlama('guardianes', g.id, {});
      // El de RSC frena si está su fichero y además enganchado, como lo mira el
      // envoltorio (revisión de F3, M4). Con uno de los dos solo, frena el nuestro.
      const deRsc = g.id === 'danger-guard' ? elDeRscEstaPuesto() : hayEnRsc(g.fichero);
      const pendiente = !deRsc && conElNuestro(g) && !nuestro.enganchado;
      const apagado = hayEnRsc(g.interruptor);
      const soloPregunta = Boolean(g.conUnTecnicoPregunta && eresTecnico);
      return {
        id: g.id,
        nombre: dicho.nombre,
        queHace: dicho.queHace,
        // Apagado va primero: es lo que decidió la persona (revisión de F3, M3).
        estado: apagado ? 'apagado' : (pendiente ? 'pendiente' : 'armado'),
        // Por qué no actúa, cuando no actúa, o cómo, si contigo es distinto. Sin
        // esto, «no actúa» parece una avería y es una decisión.
        porQue: apagado
          ? 'Apagado aquí, a propósito'
          : (pendiente
            ? 'Todavía no: toca los ajustes de Claude de esta carpeta'
            : (soloPregunta ? 'Contigo no bloquea: te pregunta antes de lo que no tiene vuelta atrás, porque tu perfil dice que eres técnico' : '')),
        // De quién es, junto a lo que hace. Solo el de órdenes peligrosas puede
        // ser de los dos, y sin enganchar todavía no es de nadie.
        deQuien: g.id !== 'danger-guard' || pendiente ? ''
          : (deRsc ? 'Lo pone el arnés.' : 'Lo pone Executive Lab: el arnés no lo trae en esta clase de proyecto.'),
      };
    });
}

// Una regla ocupa una línea. Un fichero entero no cabe en la barra, y para
// leerlo entero está el botón que lo abre al lado.
const TOPE = 25;

function leer(...partes) {
  const ruta = proyecto.ruta(...partes);
  if (!ruta) return null;
  try {
    return fs.readFileSync(ruta, 'utf8');
  } catch {
    return null;
  }
}

// Las plantillas del arnés traen ejemplos entre llaves y encabezados de
// muestra. Enseñarlos como si fueran las reglas de esta empresa es mentir.
const ES_PLANTILLA = (t) => /[{}]|^(Template|Añade|Add)\b/i.test(t || '');

// Los puntos de una sección concreta. `## Working rules` en el de Claude,
// cualquier lista en la constitución.
function puntosDe(texto, seccion = null) {
  if (!texto) return [];

  let trozo = texto;
  if (seccion) {
    const desde = texto.search(new RegExp(`^##\\s+${seccion}\\s*$`, 'mi'));
    if (desde === -1) return [];
    const resto = texto.slice(desde).split(/\r?\n/).slice(1).join('\n');
    const hasta = resto.search(/^##\s+/m);
    trozo = hasta === -1 ? resto : resto.slice(0, hasta);
  }

  return trozo.split(/\r?\n/)
    .map((l) => l.match(/^\s*[-*]\s+(.{4,})$/))
    .filter(Boolean)
    .map((m) => m[1].trim())
    .filter((t) => !ES_PLANTILLA(t))
    .slice(0, TOPE);
}

// La constitución no siempre lleva guiones: puede ser prosa con encabezados.
// Se cogen los encabezados como títulos de principio, que es lo que son.
function principios(texto) {
  if (!texto) return [];
  const conGuion = puntosDe(texto);
  if (conGuion.length) return conGuion;

  return texto.split(/\r?\n/)
    .map((l) => l.match(/^#{2,4}\s+(.{4,})$/))
    .filter(Boolean)
    .map((m) => m[1].trim())
    .filter((t) => !ES_PLANTILLA(t))
    .slice(0, TOPE);
}

function queHay() {
  const constitucion = leer(...CONSTITUCION);
  const deClaude = leer(...DE_CLAUDE);
  const conCodex = asistentes.elDeAhora().id === 'codex';
  const deLosDemas = leer(...(conCodex ? reglasDeCodex() : DE_LOS_DEMAS));

  // `AGENTS.md` repite las de `CLAUDE.md` por diseño, así que se enseña una
  // sola lista: dos listas iguales seguidas solo hacen dudar de si son
  // distintas. Manda la del asistente con el que se está hablando — con Codex,
  // `CLAUDE.md` no lo lee nadie, así que enseñarlo sería enseñar reglas que no
  // se están aplicando.
  const otro = asistentes.elDeAhora().id !== 'claude';
  const primero = otro ? deLosDemas : deClaude;
  const segundo = otro ? deClaude : deLosDemas;

  return {
    innegociables: principios(constitucion),
    // Lo que se comprueba solo, sin que nadie lo pida. Va aquí y no en otra
    // pantalla porque es lo mismo que lo de arriba —reglas de esta carpeta—
    // con la diferencia de que estas las aplica una máquina.
    guardianes: losGuardianes(),
    // Y lo que hace solo sin parar nada: va en el mismo desplegable, porque
    // es la misma pregunta —«¿qué hace esto por su cuenta?»— con otra respuesta.
    automatismos: losAutomatismos(),
    // Si este asistente llega a tener frenos. Con Codex no: RSC no le engancha
    // ninguno, así que la lista vacía no es un descuido de quien montó esto y la
    // pantalla lo tiene que decir en vez de enseñar un cero.
    puedeTenerFrenos: donde.puedeTenerFrenos(),
    // Y los tres que se cambian con un clic (decisión 172).
    interruptores: losInterruptores(),
    deLaCasa: puntosDe(primero, 'Working rules').length
      ? puntosDe(primero, 'Working rules')
      : conCodex ? puntosDe(primero) : puntosDe(segundo, 'Working rules'),
    // Cuál se está leyendo, para que el botón de "verlas enteras" abra ese.
    cual: otro ? 'otros' : 'claude',
    hay: {
      constitucion: Boolean(constitucion),
      claude: Boolean(deClaude),
      otros: Boolean(deLosDemas),
    },
  };
}

// Para el botón que las abre enteras, al lado. Solo estos cuatro ficheros: los
// tres de reglas y el plan con el que RSC montó esto, que también es una
// decisión escrita de esta carpeta y no se podía abrir desde ningún sitio.
const PLAN_DE_MONTAJE = ['02-DOCS', 'wiki', 'harness', 'installation-plan.md'];

function dondeVive(cual) {
  const sitios = {
    constitucion: CONSTITUCION, claude: DE_CLAUDE,
    otros: asistentes.elDeAhora().id === 'codex' ? reglasDeCodex() : DE_LOS_DEMAS,
    plan: PLAN_DE_MONTAJE,
  };
  const partes = sitios[cual];
  if (!partes) return null;
  const ruta = proyecto.ruta(...partes);
  return ruta && fs.existsSync(ruta) ? ruta : null;
}

module.exports = {
  queHay, dondeVive, losInterruptores, elBoton, estadoDe, INTERRUPTORES, BOTONES, losGuardianes, losAutomatismos, loApagado, GUARDIANES, AUTOMATISMOS, enganchadoAntesDeBash,
};
