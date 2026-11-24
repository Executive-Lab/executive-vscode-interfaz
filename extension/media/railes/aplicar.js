#!/usr/bin/env node
// Pone los raíles de Executive Lab en el proyecto de un alumno.
//
//   node aplicar.js "~/Documentos/Mi Empresa IA"
//   node aplicar.js <carpeta> --forzar     (vuelve a poner el perfil aunque ya estuviera)
//   node aplicar.js <carpeta> --ajena      (su historial es de alguien: lo que toca ficheros suyos
//                                           se queda pendiente, y la barra lo ofrece con su botón)
//   node aplicar.js <carpeta> --ajena --poner-freno   (ese botón: el freno, con su sí)
//   node aplicar.js <carpeta> --ajena --poner-bloque  (el otro: el bloque de CLAUDE.md, con su sí)
//   node aplicar.js <carpeta> --git <ruta>  (el git con el que mirar de quién es su historial; sin
//                                           esto, el que haya)
//
// De quién es su historial lo mira esto solo, con git (decisión 161): en una
// carpeta cuyo historial no creó la barra, nada de lo que decide su equipo se
// apaga, y lo que no se puede leer cuenta como de alguien. `--ajena` y
// `--historial-ajeno` solo pueden añadir: lo dan por de alguien aunque git diga
// que no. Con `--historial-ajeno`, la barra lo dice también cuando la persona ha
// dicho que sí a montar encima, que es tocar sus ficheros y no decidir por su equipo.
//
// RSC trata esto como una "own skill": vive en el repo del alumno, funciona
// para quien clone sin ejecutar nada, y RSC nunca la instala, actualiza ni
// sobrescribe. Se declara en .rsc.json bajo ownSkills para dejar constancia
// de que es nuestra.
//
// ── Los raíles van donde mire el asistente de esa carpeta ────────────────
//
// Esto escribía en `.claude/` pasara lo que pasara. Y el wizard deja elegir
// Codex —le pasa `--target codex` a RSC, que monta el arnés entero en
// `.codex/`— así que en esas carpetas la habilidad que fija el español y el
// vocabulario, y los cuatro comandos, se quedaban en una carpeta que Codex no
// lee jamás. Sin error y sin aviso: raíles puestos que no encarrilan nada.
//
// La tabla de dónde mira cada asistente es la misma que usa la barra
// (`sitios.js`, aquí al lado), para que no haya dos versiones de la misma verdad.

const fs = require('node:fs');
const path = require('node:path');
const sitios = require('./sitios');
const noEntra = require('./no-entra-en-git');
const { comoHabilidad, cuandoDe } = require('./como-habilidad');
const historialDeLaCarpeta = require('./historial-ajeno');

const [, , destinoBruto, ...banderas] = process.argv;
const forzar = banderas.includes('--forzar');
const ajena = banderas.includes('--ajena');
const ponerFreno = banderas.includes('--poner-freno');
const ponerBloque = banderas.includes('--poner-bloque');
const conQueGit = banderas.includes('--git') ? banderas[banderas.indexOf('--git') + 1] : null;

if (!destinoBruto) {
  console.error('Dime en qué carpeta. Ejemplo:\n  node aplicar.js "~/Documentos/Mi Empresa IA"');
  process.exit(1);
}

const destino = path.resolve(destinoBruto.replace(/^~/, process.env.HOME || process.env.USERPROFILE || ''));
if (!fs.existsSync(destino)) {
  console.error(`No existe esa carpeta:\n  ${destino}`);
  process.exit(1);
}

// Su historial, mirado aquí y no solo por quien llama (revisión de la 161): a mano
// no hay barra que lo diga. Lo mismo que mira la barra (`historial-ajeno.js`), con
// un git que espera. Si git no se puede usar, la respuesta es de error, y eso
// cuenta como de alguien.
function preguntarAGit(args) {
  const hecho = require('node:child_process').spawnSync(conQueGit || 'git', ['-c', 'core.fsmonitor=false', ...args], {
    cwd: destino, encoding: 'utf8', windowsHide: true, timeout: 20000,
  });
  return { codigo: hecho.error || hecho.status === null ? -1 : hecho.status, salida: hecho.stdout || '' };
}
const historialAjeno = ajena || banderas.includes('--historial-ajeno') || historialDeLaCarpeta.esAjenoEsperando(destino, preguntarAGit);

const origen = __dirname;
const hechos = [];
const pendientes = [];

// ── Nada se escribe a través de un enlace que lleve fuera ────────────────
//
// Un `AGENTS.md`, un `.agents/skills` o un `.claude` enlazados a otro sitio
// hacían que los raíles escribieran fuera de esta carpeta: en la de otra empresa,
// o en unas habilidades que comparte todo el ordenador. La 154 lo cerró solo para
// `AGENTS.override.md` (revisión adversaria de la 154). Ahora todo lo que
// escriben los raíles pasa por aquí: cada trozo del camino desde la carpeta, o no
// es un enlace, o lleva a un sitio que sigue dentro. Un enlace roto tampoco vale:
// escribir en él crea el fichero donde apunte.
const noEscritos = [];

function porDondeSale(fichero, raiz) {
  let real;
  try {
    real = fs.realpathSync(raiz);
  } catch {
    return '.';
  }
  const fuera = (rel) => path.isAbsolute(rel) || rel === '..' || rel.startsWith(`..${path.sep}`);
  if (fuera(path.relative(raiz, fichero))) return path.relative(raiz, fichero);
  let camino = raiz;
  for (const trozo of path.relative(raiz, fichero).split(path.sep).filter(Boolean)) {
    camino = path.join(camino, trozo);
    let info;
    try {
      info = fs.lstatSync(camino);
    } catch {
      return null; // lo que falta se crea, y dentro
    }
    if (!info.isSymbolicLink()) continue;
    try {
      if (!fuera(path.relative(real, fs.realpathSync(camino)))) continue;
    } catch { /* roto: no se sabe adónde va */ }
    return path.relative(raiz, camino);
  }
  return null;
}

function escribirSinEnlaces(fichero, contenido, raiz = destino) {
  const enlace = porDondeSale(fichero, raiz);
  if (enlace) {
    noEscritos.push(enlace.split(path.sep).join('/'));
    return false;
  }
  fs.mkdirSync(path.dirname(fichero), { recursive: true });
  fs.writeFileSync(fichero, contenido);
  return true;
}

// Si la ha copiado entera. Lo que no, no se da por puesto (revisión de la PR #48).
function copiarCarpeta(desde, hasta) {
  let entera = true;
  for (const entrada of fs.readdirSync(desde, { withFileTypes: true })) {
    const a = path.join(desde, entrada.name);
    const b = path.join(hasta, entrada.name);
    const hecho = entrada.isDirectory() ? copiarCarpeta(a, b) : escribirSinEnlaces(b, fs.readFileSync(a));
    entera = entera && hecho;
  }
  return entera;
}

// Para quién quedó puesta la habilidad. Sin ella no se apunta a su `siempre.md`
// ni se engancha su freno: se apuntaría a algo que no está.
const habilidadPuesta = new Set();

// 0. Para qué asistentes se montó esta carpeta: para todos los declarados (E2).
//
// Se ponían solo para el primero, y con dos el otro se quedaba sin raíles. Un
// asistente que no esté en la tabla no se trata como Claude: no se le pone
// nada, y si no queda ninguno que se sepa dónde mira, se para. Poner los raíles
// de Claude en el arnés de otro es peor que no ponerlos, porque desde fuera se
// ve igual que si estuvieran puestos.
let declaracionLeida = null;
try {
  declaracionLeida = JSON.parse(fs.readFileSync(path.join(destino, '.rsc.json'), 'utf8'));
} catch { /* sin declaración: Claude, que es lo que monta nuestro instalador */ }

const declarados = declaracionLeida && Array.isArray(declaracionLeida.targets) && declaracionLeida.targets.length
  ? declaracionLeida.targets
  : [sitios.paraQuien(declaracionLeida)];
const quienes = declarados.filter((q) => sitios.sitiosDe(q));
const raros = declarados.filter((q) => !sitios.sitiosDe(q));
if (!quienes.length) {
  console.error(`Esta carpeta dice estar montada para "${raros.join('", "')}", que no sé dónde mira.`);
  console.error('No pongo nada: unos raíles en la carpeta equivocada se ven igual que unos puestos.');
  process.exit(1);
}
for (const raro of raros) hechos.push(`sin raíles para "${raro}": no sé dónde mira`);

const en = (...partes) => path.join(destino, ...partes);
const comoSeEscribe = (partes) => partes.join('/');

// 1 y 2. La habilidad y los botones, donde mire cada uno.
//
// Y comandos no hay para todos: RSC solo escribe comandos para ocho
// asistentes, y Codex no es uno. No es que estén en otro sitio — con Codex no
// hay ninguno que leer, nunca. Así que se dice, en vez de dejarlos en una
// carpeta muerta. La barra ya sabe explicar ese hueco (`donde.puedeTenerBotones`).
// La copia del freno de RSC se llama por su versión (`freno-rsc-4.1.9.mjs`), y
// copiar la habilidad no borra nada: al subir de versión, la de antes se quedaba
// en la carpeta sin que nadie la cargara (decisión 200). Se quita solo eso: un
// `freno-rsc-<versión>.mjs` que ya no viaja con la habilidad, y que es un fichero,
// no un enlace. Se llama con la carpeta ya copiada, que no va por ningún enlace.
const COPIA_DEL_FRENO = /^freno-rsc-\d+\.\d+\.\d+\.mjs$/;
function retirarLosFrenosDeAntes(carpeta) {
  const deHoy = new Set(fs.readdirSync(path.join(origen, 'executive-lab')));
  let entradas = [];
  try {
    entradas = fs.readdirSync(carpeta, { withFileTypes: true });
  } catch {
    return;
  }
  for (const e of entradas) {
    if (!e.isFile() || !COPIA_DEL_FRENO.test(e.name) || deHoy.has(e.name)) continue;
    try {
      fs.unlinkSync(path.join(carpeta, e.name));
    } catch { /* se queda: no la carga nadie */ }
  }
}

function ponerLaHabilidadYLosComandos(quien, suyo) {
  if (copiarCarpeta(path.join(origen, 'executive-lab'), en(...suyo.habilidades, 'executive-lab'))) {
    retirarLosFrenosDeAntes(en(...suyo.habilidades, 'executive-lab'));
    habilidadPuesta.add(quien);
    hechos.push(`${comoSeEscribe(suyo.habilidades)}/executive-lab/`);
  } else {
    hechos.push(`${comoSeEscribe(suyo.habilidades)}/executive-lab/ va por un enlace a otro sitio: no la pongo`);
  }
  // Con Claude y con Codex, los botones son habilidades (decisión 141).
  if (suyo.botones) {
    ponerLosBotonesComoHabilidades(quien, suyo);
    return;
  }
  if (!suyo.comandos) {
    hechos.push(`sin comandos: ${quien} no tiene dónde guardarlos, y no me los invento`);
    return;
  }
  const comandos = en(...suyo.comandos);
  // Con el nombre que les da ese asistente: Copilot solo lee `.prompt.md` (E3).
  //
  // Y uno suyo que se llame como uno nuestro no se pisa (revisión de F4, m8): es
  // nuestro si dice lo mismo que el nuestro en su `description`, que es lo que
  // un comando de otro día conserva. La barra mira lo mismo (`terreno`).
  const cuantos = fs.readdirSync(path.join(origen, 'comandos'));
  const suyos = [];
  for (const fichero of cuantos) {
    const suNombre = fichero.replace(/\.md$/, suyo.comandoAcabaEn || '.md');
    const hasta = path.join(comandos, suNombre);
    const nuestro = fs.readFileSync(path.join(origen, 'comandos', fichero), 'utf8');
    if (fs.existsSync(hasta) && descripcionDe(leerSiHay(hasta)) !== descripcionDe(nuestro)) {
      suyos.push(fichero.replace(/\.md$/, ''));
      continue;
    }
    if (!escribirSinEnlaces(hasta, nuestro)) suyos.push(fichero.replace(/\.md$/, ''));
  }
  hechos.push(`${comoSeEscribe(suyo.comandos)}/ (${cuantos.length - suyos.length} comandos${suyos.length ? `; ${suyos.map((s) => `«${s}»`).join(', ')} es tuyo y no lo toco` : ''})`);
}

// Los cuatro de `comandos/`, como habilidades: la misma fuente, escrita como la
// lee cada uno (`como-habilidad.js`). Un comando que ya estuviera de otro día se
// queda donde está —no se borra nada—, y Claude, con los dos, usa la habilidad
// (*«A skill and a file in .claude/commands/ → The skill»*).
const habilidadesDeBotones = [];

function ponerLosBotonesComoHabilidades(quien, suyo) {
  const fuentes = fs.readdirSync(path.join(origen, 'comandos')).filter((f) => f.endsWith('.md'));
  const suyos = [];
  for (const fichero of fuentes) {
    const nombre = fichero.replace(/\.md$/, '');
    const nuestro = fs.readFileSync(path.join(origen, 'comandos', fichero), 'utf8');
    const carpeta = en(...suyo.botones, nombre);
    const hasta = path.join(carpeta, 'SKILL.md');
    // Con su recordatorio, si lo tenía (decisión 144).
    const { skill, openai } = comoHabilidad(nuestro, nombre, quien, { cuando: cuandoDe(leerSiHay(hasta)) });
    // Un enlace con ese nombre es de otro —RSC enlaza así las suyas—, lleve a
    // algo o a nada: no se escribe a través de él.
    let esEnlace = false;
    try {
      esEnlace = fs.lstatSync(carpeta).isSymbolicLink();
    } catch { /* no está */ }
    if (esEnlace) {
      suyos.push(nombre);
      continue;
    }
    // Una suya que se llame igual no se pisa: es nuestra si dice lo mismo en su
    // `description`, como con los comandos.
    if (fs.existsSync(hasta) && descripcionDe(leerSiHay(hasta)) !== descripcionDe(nuestro)) {
      suyos.push(nombre);
      continue;
    }
    if (!escribirSinEnlaces(hasta, skill) || (openai && !escribirSinEnlaces(path.join(carpeta, 'agents', 'openai.yaml'), openai))) {
      suyos.push(nombre);
      continue;
    }
    // Las que caen donde RSC guarda las suyas se declaran como propias, igual que
    // `executive-lab`, para que un `repair` no las tome por basura.
    if (comoSeEscribe(suyo.botones) === comoSeEscribe(suyo.habilidades)) habilidadesDeBotones.push(nombre);
  }
  hechos.push(`${comoSeEscribe(suyo.botones)}/ (${fuentes.length - suyos.length} habilidades con botón${suyos.length ? `; ${suyos.map((s) => `«${s}»`).join(', ')} es tuya y no la toco` : ''})`);
}

// 3. Que el asistente sepa que la habilidad está ahí.
//
// Claude encuentra las suyas solo. Los de la familia AGENTS.md —Codex el
// primero— no: leen su fichero de siempre y nada más, así que una habilidad
// que nadie nombra es una habilidad que no se carga. RSC resuelve esto igual,
// metiendo un trozo entre marcas en ese mismo fichero; aquí se hace lo mismo
// con marcas nuestras, para no pisarnos con las suyas.
//
// Solo en los ficheros compartidos (`sitios.js` dice cuáles, según el adaptador de
// RSC): los `rsc-suggest.md` de Windsurf, Cline, Roo, Continue y Kiro también lo
// son. El de Cursor, no: lo reescribe entero, y Cursor tiene el suyo aparte.
const DESDE = '<!-- executive-lab:start -->';
const HASTA = '<!-- executive-lab:end -->';

// El trozo entre marcas, en su fichero: si ya estaba se cambia, y si no se
// añade al final, sin tocar lo demás. Se crea si no existe.
const ENTRE_MARCAS = new RegExp(`${DESDE}[\\s\\S]*?${HASTA}`);

// Las marcas, las de los ficheros de instrucciones salvo que se digan otras: las
// del `.gitignore` son comentarios suyos.
function ponerElTrozo(fichero, trozo, { desde: DESDE_AQUI = DESDE, entre = ENTRE_MARCAS } = {}) {
  let texto = '';
  try {
    texto = fs.readFileSync(fichero, 'utf8');
  } catch { /* todavía no existe: se crea con el trozo */ }

  if (entre.test(texto)) {
    texto = texto.replace(entre, () => trozo);
  } else if (texto.includes(DESDE_AQUI)) {
    // Con la marca de inicio y sin la de final (revisión de F4, m1), lo nuestro
    // llega hasta el final de ese párrafo: lo de detrás de la primera línea en
    // blanco es de quien lo escribió, y no se toca.
    const desde = texto.indexOf(DESDE_AQUI);
    const hueco = texto.indexOf('\n\n', desde);
    const hasta = hueco < 0 ? texto.replace(/\n+$/, '').length : hueco;
    texto = texto.slice(0, desde) + trozo + texto.slice(hasta);
  } else if (!texto) {
    texto = `${trozo}\n`;
  } else {
    texto += `${texto.endsWith('\n') ? '' : '\n'}\n${trozo}\n`;
  }

  return escribirSinEnlaces(fichero, texto);
}

// Los ficheros de siempre ya nombrados en esta pasada. Dos asistentes pueden leer
// el mismo (Codex y opencode, `AGENTS.md`): el trozo nombra la copia del primero
// declarado, y el segundo tiene la suya, igual (revisión de F5, m6). Nombraba al
// último que pasara.
const yaNombrados = new Map();

function nombrarLaHabilidad(quien, suyo) {
  if (!habilidadPuesta.has(quien)) return `${quien}: la habilidad no está puesta, y no apunto a ella`;
  if (!suyo.siempre) return `${quien} encuentra la habilidad solo`;
  const partes = sitios.dondeVaLoDeSiempre(quien, destino) || suyo.siempre.fichero;
  const suFichero = comoSeEscribe(partes);
  if (yaNombrados.has(suFichero)) return `${suFichero} ya apunta a la de ${yaNombrados.get(suFichero)}, que es la misma`;

  const dir = `${comoSeEscribe(suyo.habilidades)}/executive-lab`;
  const loQueDice = `Léete \`${dir}/siempre.md\` y \`${dir}/SKILL.md\` antes de hacer nada y respeta lo que digan: es la habilidad siempre activa de esta carpeta. Contesta siempre en español.`;

  // Con Cursor, una habilidad es un fichero suelto —`<id>.mdc`, que es donde RSC
  // busca la propia— y su fichero de siempre lo reescribe RSC entero (E3). La
  // nuestra va en el suyo, que se aplica siempre y nombra lo demás.
  if (suyo.habilidadEnUnFichero) {
    const suyaEn = `${comoSeEscribe(suyo.habilidades)}/executive-lab${suyo.habilidadEnUnFichero}`;
    if (!escribirSinEnlaces(en(...suyo.habilidades, `executive-lab${suyo.habilidadEnUnFichero}`),
      `---\ndescription: Executive Lab, la habilidad siempre activa de esta carpeta\nalwaysApply: true\n---\n${loQueDice}\n`)) {
      return `${suyaEn} va por un enlace a otro sitio: no escribo a través de él`;
    }
    return `${suyaEn} (se aplica siempre y apunta a la habilidad)`;
  }
  if (!suyo.siempre.compartido) {
    return `${comoSeEscribe(suyo.siempre.fichero)} es de RSC y lo reescribe: no lo toco`;
  }

  // En una carpeta cuyo historial no creó la barra, un fichero suyo espera a su
  // sí (C-4), como el `CLAUDE.md` de Claude (revisión de F4, m6). Uno que solo
  // lleva lo de RSC, o que ya lleva lo nuestro, no es suyo.
  const fichero = en(...partes);
  // Un override enlazado puede apuntar fuera de la empresa. Se puede leer,
  // pero poner los raíles no debe escribir a través de él.
  if (quien === 'codex' && partes[0] === 'AGENTS.override.md' && fs.lstatSync(fichero).isSymbolicLink()) {
    pendientes.push('el bloque de Cómo se trabaja aquí');
    return `${suFichero} es un enlace: no escribo a través de él`;
  }
  if (ajena && !ponerBloque && esDeAlguien(fichero) && !ENTRE_MARCAS.test(leerSiHay(fichero))) {
    pendientes.push('el bloque de Cómo se trabaja aquí');
    return `${suFichero} (el trozo, pendiente: toca sus instrucciones, y se pide antes)`;
  }
  if (!ponerElTrozo(fichero, `${DESDE}\n${loQueDice}\n${HASTA}`)) return `${suFichero} va por un enlace a otro sitio: no escribo a través de él`;
  yaNombrados.set(suFichero, quien);
  return `${suFichero} (apunta a la habilidad)`;
}


// 3b. Y con Claude, lo que vale siempre, en cada conversación (D1).
//
// Claude encuentra las habilidades solo, pero carga una cuando decide que hace
// falta, y esta es la que fija el español, prohíbe la terminal y trae la regla
// 7. Claude Code importa al empezar cada conversación lo que `CLAUDE.md` nombra
// con `@`, así que ahí va un bloque entre marcas con `siempre.md`, que es
// corto. No sale de `sitios.js`: esa tabla es copia de la de RSC, y para RSC
// Claude no tiene fichero compartido.
//
// Sin ningún `CLAUDE.md`, Claude Code lee el `AGENTS.md` de la carpeta, y
// crearle uno haría que dejara de leerlo. Si ese `AGENTS.md` es de alguien, el
// bloque lo importa también. Si solo lleva lo de RSC, no: RSC ya lo da con su
// enganche, y saldría dos veces (`targets/agents-md-shadow.js`).
//
// En una carpeta cuyo historial no creó la barra, toca un fichero suyo, así que
// espera a su sí (C-4): queda pendiente, y la barra lo ofrece con su botón.
const FORMAS_DE_CLAUDE_MD = ['CLAUDE.md', path.join('.claude', 'CLAUDE.md'), 'CLAUDE.local.md'];

const leerSiHay = (fichero) => {
  try {
    return fs.readFileSync(fichero, 'utf8');
  } catch {
    return '';
  }
};

// Con cualquier `CLAUDE.md`, aquí o más arriba, aunque esté vacío, Claude no lee
// el `AGENTS.md` de la carpeta. Salvo la sombra que deja RSC al enganchar a
// Claude junto a un asistente de `AGENTS.md`, que no es de nadie: existe para que
// su trozo no llegue dos veces, no para callar las normas del equipo (revisión de
// F5, I6; `targets/agents-md-shadow.js`).
const SOMBRA_DE_RSC = '<!-- rsc:claude-md-shadow -->';

function hayUnClaudeMd(desde) {
  let dir = desde;
  for (;;) {
    for (const forma of FORMAS_DE_CLAUDE_MD) {
      const fichero = path.join(dir, forma);
      if (!fs.existsSync(fichero)) continue;
      if (dir === desde && forma === 'CLAUDE.md' && leerSiHay(fichero).includes(SOMBRA_DE_RSC)) continue;
      return true;
    }
    const arriba = path.dirname(dir);
    if (arriba === dir) return false;
    dir = arriba;
  }
}

// Lo que se le dice a Claude de un `AGENTS.md` con normas de la carpeta y con el
// trozo de RSC: importarlo traería ese trozo dos veces, así que se le pide que lo
// lea (revisión de F5, I6).
const LEE_TAMBIEN_AGENTS = 'Lee también `AGENTS.md`: lleva las normas de esta carpeta. Lo que va entre las marcas de rsc-suggest ya lo tienes.';

const llevaLoDeRsc = (fichero) => leerSiHay(fichero).includes('<!-- rsc-suggest:start -->');

// La `description` de la cabecera de un comando, o null.
function descripcionDe(texto) {
  const cabecera = (texto.match(/^---\r?\n([\s\S]*?)\r?\n---/) || [])[1] || '';
  const linea = cabecera.match(/^description:\s*(.+?)\s*$/m);
  return linea ? linea[1].replace(/^["']|["']$/g, '') : null;
}

function esDeAlguien(fichero) {
  try {
    return fs.readFileSync(fichero, 'utf8')
      .replace(/<!-- rsc-suggest:start -->[\s\S]*?<!-- rsc-suggest:end -->/g, '')
      .replace(new RegExp(ENTRE_MARCAS.source, 'g'), '')
      .trim().length > 0;
  } catch {
    return false;
  }
}

function ponerLoDeSiempre(quien, suyo) {
  if (quien !== 'claude') return null;
  if (!habilidadPuesta.has(quien)) return 'CLAUDE.md (sin el bloque: la habilidad no está puesta, y no apunto a lo que no hay)';
  const fichero = en('CLAUDE.md');
  const antes = fs.existsSync(fichero) ? fs.readFileSync(fichero, 'utf8') : null;
  const viejo = antes && antes.match(ENTRE_MARCAS);
  if (ajena && !ponerBloque && !viejo) {
    pendientes.push('el bloque de Cómo se trabaja aquí');
    return 'CLAUDE.md (el bloque, pendiente: toca sus instrucciones, y se pide antes)';
  }
  // La primera vez se decide por lo que hay; después, el `CLAUDE.md` ya es el
  // nuestro, y se mantiene lo decidido. Salvo que ese `AGENTS.md` ya no sea de
  // nadie o lleve lo de RSC: si después se engancha Codex, RSC mete ahí su trozo,
  // y el import lo traería dos veces (revisión de F4, m7; `agents-md-shadow.js`).
  //
  // Con lo de RSC dentro, en vez de importarlo se le pide que lo lea (I6).
  const loLeia = viejo ? (viejo[0].includes('@AGENTS.md') || viejo[0].includes(LEE_TAMBIEN_AGENTS)) : !hayUnClaudeMd(destino);
  const conAgents = loLeia && esDeAlguien(en('AGENTS.md'));
  const deAgents = !conAgents ? [] : [llevaLoDeRsc(en('AGENTS.md')) ? LEE_TAMBIEN_AGENTS : '@AGENTS.md'];
  const lineas = [`@${comoSeEscribe(suyo.habilidades)}/executive-lab/siempre.md`, ...deAgents];
  if (!ponerElTrozo(fichero, [DESDE, ...lineas, HASTA].join('\n'))) return 'CLAUDE.md va por un enlace a otro sitio: no escribo a través de él';
  return `CLAUDE.md (se carga siempre.md en cada conversación${conAgents ? ', y se le apunta su AGENTS.md' : ''})`;
}


// 4. Callar los avisos del arnés que mandan al alumno a una terminal.
//
// El enganche de arranque de RSC (`targets/session-start.mjs`) corre en cada
// sesión y puede imprimir cinco avisos con `npx @ericrisco/rsc …` dentro. Al
// asistente se le dice, con esas palabras, que **se lo ofrezca al alumno**.
//
// Eso choca de frente con dos cosas de esta casa: la habilidad `executive-lab`
// prohíbe mandar al alumno a una terminal, y la decisión 6 quitó `npx` a
// propósito (en Windows es un `.cmd`, y tarda). Y uno de esos avisos ofrece
// `@latest`, que se saltaría la versión fijada de la que depende que toda la
// clase corra el mismo catálogo.
//
// RSC ya prevé esto: cada aviso tiene su interruptor, y él mismo escribe
// `.no-context7` cuando excluye esa integración. Aquí se hace lo mismo con los
// que no pintan nada en la carpeta de un alumno.
//
// Los que NO se tocan, a propósito:
//   · `.no-git`            — la barra quiere git; que avise si falta está bien.
//   · `.no-claudemd-check` — es higiene de verdad y no lleva ningún comando.
//   · `.no-harness`        — apagaría el onboarding entero.
//
// El aviso de versión nueva no se apaga con un fichero sino con la variable
// `RSC_NO_UPDATE_CHECK`, así que ese sigue abierto y está dicho en la auditoría.
//
// Y un guardián, que no es un aviso: el de gitmoji deniega todo `git commit -m`
// sin emoji ni gramática inglesa, y en esta casa se guarda en español y en
// frase (el raíl `guardar.md`). RSC lo monta cuando el plan practica SDD, que es
// justo lo que eligen quienes construyen algo que irá creciendo: cada copia de
// esa persona recibiría un «BLOCKED» en inglés (A11). La decisión 94 lo apagó
// en este repositorio y Jose lo apagó en las de alumno el 25-09-2026. Se pone
// siempre, no solo cuando el plan lo trae: `repair` lo monta aunque el plan no
// lo pida (C6), y entonces el interruptor ya tiene que estar.
//
// ── Solo en lo nuestro (decisión 161) ──
//
// Tres de los cuatro son, para RSC, decisiones del equipo (`PROJECT_OPT_OUTS`,
// `targets/opt-outs.js`): los apunta en `.rsc.json` como `optOuts` la próxima vez
// que escribe, viajan en git y un clon los rehace. Ponerlos en una carpeta cuyo
// historial no creó la barra era decidir por su equipo (P4). Ahí vale lo que su
// `.rsc.json` ya declare, y eso lo rehace RSC. El de los dos sitios del arnés
// (`scope-check`) es de esta máquina: no se apunta ni viaja, y va en todas.
//
// Ninguno hace falta para que la barra funcione: sus copias las guarda con su
// propio git, y el guardián de gitmoji solo mira las órdenes del asistente.
//
// Lo que ya está no se quita, sea de quien sea. Una barra de antes los dejó
// también en carpetas de alguien, y RSC ya los apuntó en su `.rsc.json`: quitarlos
// volvería a encender el guardián de gitmoji de un día para otro, y cambiaría otra
// vez su `.rsc.json` sin preguntar.
//
// Y `.rsc/` no se crea. Si no está, RSC todavía no ha montado en este ordenador,
// y al hacerlo la construye con lo que declara `.rsc.json`, pero solo si no la
// encuentra (`fromScratch`, `install-apply.js`). Creada antes con estas cuatro
// dentro, RSC daba por buenas las marcas que había y perdía las demás que el
// equipo había apagado: en un clon, la wiki compartida y la actualización sola
// se encendían. Los raíles van detrás de lo que hace RSC, así que llegan igual.
const DEL_EQUIPO = 'del equipo';
const DE_ESTA_MAQUINA = 'de esta máquina';
const CALLAR = [
  ['no-audit', 'la revisión de habilidades es herramienta de quien mantiene esto, no del alumno', DEL_EQUIPO],
  ['no-worktree-cleanup', 'un alumno no tiene worktrees, y el aviso lleva dos comandos', DEL_EQUIPO],
  ['no-scope-check', 'hablar de "scopes" a quien lleva las facturas no significa nada', DE_ESTA_MAQUINA],
  ['no-gitmoji', 'aquí se guarda en español y en frase: el guardián de gitmoji denegaría cada copia', DEL_EQUIPO],
];

function callarLosAvisos() {
  const carpeta = en('.rsc');
  if (!fs.existsSync(carpeta)) return '.rsc/ (todavía no está: la construye el arnés con lo que declara la carpeta, y no la adelanto)';
  const puestos = [];
  const suyos = [];
  for (const [nombre, porque, de] of CALLAR) {
    if (historialAjeno && de === DEL_EQUIPO) {
      suyos.push(nombre);
      continue;
    }
    const fichero = path.join(carpeta, `.${nombre}`);
    if (fs.existsSync(fichero)) continue;
    if (escribirSinEnlaces(fichero, `${porque}\n`)) puestos.push(nombre);
  }
  const loSuyo = suyos.length ? `; ${suyos.join(', ')}: lo decide su equipo en .rsc.json` : '';
  return puestos.length ? `.rsc/ (callados: ${puestos.join(', ')}${loSuyo})` : `.rsc/ (los avisos ya estaban callados${loSuyo})`;
}

hechos.push(callarLosAvisos());

// 4b. El freno ante órdenes peligrosas (C1, decisión 1 de Jose).
//
// RSC solo engancha el suyo cuando el plan practica la cadena SDD, y en el resto
// de carpetas de alumno nada paraba un `rm -rf`. La habilidad trae el
// envoltorio y la copia fijada del de RSC (`freno.mjs` y `freno-rsc-4.1.9.mjs`,
// copiados en el paso 1); aquí se engancha antes de cada orden.
//
// La orden no lleva `.rsc/`: RSC quita todo enganche con esa aguja cuando
// reescribe los suyos, y esta tiene que sobrevivir a un `sync`. De ese fichero
// no se toca nada más: se añade una entrada, y si ya está como debe, ni se
// reescribe.
//
// Solo donde hay dónde: con Codex no hay enganches (`sitios.js`, columna
// `frenos`). Y en una carpeta cuyo historial no creó la barra no se pone en
// silencio, porque toca sus ajustes (C-4, P4): queda pendiente, y la barra lo
// ofrece con su botón, que es `--poner-freno`.
function engancharElFreno(quien, suyo) {
  if (!suyo.frenos || !suyo.ajustes) return `sin freno: ${quien} no tiene dónde engancharlo`;
  // El freno vive en la habilidad: sin ella, cada orden llamaría a un fichero que no está.
  if (!habilidadPuesta.has(quien)) return 'sin freno: la habilidad no está puesta';
  const ORDEN_DEL_FRENO = 'node "${CLAUDE_PROJECT_DIR}/' + comoSeEscribe(suyo.habilidades) + '/executive-lab/freno.mjs" "${CLAUDE_PROJECT_DIR}"';
  const ENTRADA_DEL_FRENO = { matcher: 'Bash', hooks: [{ type: 'command', command: ORDEN_DEL_FRENO }] };
  const fichero = en(...suyo.ajustes);
  const dondeVa = comoSeEscribe(suyo.ajustes);

  let ajustes = {};
  if (fs.existsSync(fichero)) {
    try {
      ajustes = JSON.parse(fs.readFileSync(fichero, 'utf8'));
    } catch {
      return `${dondeVa} no se puede leer: el freno no se engancha`;
    }
  }
  const antes = ajustes.hooks && Array.isArray(ajustes.hooks.PreToolUse) ? ajustes.hooks.PreToolUse : [];
  // Se mira orden a orden, no grupo a grupo: un enganche de la persona puede ir
  // en el mismo grupo que el nuestro, y quitar el grupo entero se lo llevaba
  // (revisión de F3, I1).
  const esLaNuestra = (orden) => Boolean(orden) && typeof orden.command === 'string' && orden.command.includes('/executive-lab/freno.mjs');
  const nuestras = antes.flatMap((grupo) => (Array.isArray(grupo.hooks) ? grupo.hooks : []).filter(esLaNuestra));
  const soloLaDeHoy = antes.length && antes.filter((grupo) => (grupo.hooks || []).some(esLaNuestra))
    .every((grupo) => JSON.stringify(grupo) === JSON.stringify(ENTRADA_DEL_FRENO));
  if (nuestras.length === 1 && soloLaDeHoy) {
    return `${dondeVa} (el freno ya estaba enganchado)`;
  }
  if (ajena && !ponerFreno && !nuestras.length) {
    pendientes.push('el freno ante órdenes peligrosas');
    return `${dondeVa} (el freno, pendiente: toca sus ajustes, y se pide antes)`;
  }

  const sinLasNuestras = antes
    .map((grupo) => (Array.isArray(grupo.hooks) ? { ...grupo, hooks: grupo.hooks.filter((o) => !esLaNuestra(o)) } : grupo))
    .filter((grupo) => !Array.isArray(grupo.hooks) || grupo.hooks.length);
  ajustes.hooks = ajustes.hooks || {};
  ajustes.hooks.PreToolUse = [...sinLasNuestras, ENTRADA_DEL_FRENO];
  if (!escribirSinEnlaces(fichero, `${JSON.stringify(ajustes, null, 2)}\n`)) return `${dondeVa} va por un enlace a otro sitio: el freno no se engancha`;
  return `${dondeVa} (el freno ante órdenes peligrosas, enganchado)`;
}

// Lo de cada asistente, para cada uno. Va aquí, detrás de lo que se define
// arriba, y antes del perfil y de la declaración, que son de la carpeta y van
// una vez.
for (const quien of quienes) {
  const suyo = sitios.sitiosDe(quien);
  ponerLaHabilidadYLosComandos(quien, suyo);
  hechos.push(nombrarLaHabilidad(quien, suyo));
  const loDeSiempre = ponerLoDeSiempre(quien, suyo);
  if (loDeSiempre) hechos.push(loDeSiempre);
  hechos.push(engancharElFreno(quien, suyo));
}

// 4b. Lo que no entra en git: las claves y los ficheros de acceso (F1).
//
// Un bloque entre marcas en el `.gitignore` de la raíz, con lo que el inventario
// de la barra reconoce como credencial (`no-entra-en-git.js` dice cuál y por
// qué). Uno por carpeta, no por asistente. Aditivo: lo que ya estaba en git
// sigue en git. En una carpeta cuyo historial no creó la barra, su `.gitignore`
// espera a su sí (C-4), como sus instrucciones.
function ponerLoQueNoEntra() {
  const fichero = en('.gitignore');
  const hay = leerSiHay(fichero);
  if (ajena && !ponerBloque && hay.trim() && !noEntra.elQueHay(hay)) {
    pendientes.push('la lista de lo que no entra en git');
    return '.gitignore (lo que no entra en git, pendiente: es suyo, y se pide antes)';
  }
  if (!ponerElTrozo(fichero, noEntra.elBloque(), { desde: noEntra.DESDE, entre: noEntra.ENTRE_MARCAS })) return '.gitignore va por un enlace a otro sitio: no escribo a través de él';
  return '.gitignore (lo que no entra en git: claves y ficheros de acceso)';
}
hechos.push(ponerLoQueNoEntra());

// 5. El perfil del arnés.
//
// Aquí NO se tocan `technical_level` ni `accompaniment`: los pregunta RSC en su
// onboarding y son la respuesta del alumno. Imponer L3 y "no técnico" a todo el
// mundo era arrogante — un arnés puede ser para quien lleva las facturas o para
// quien montó la web de la empresa hace diez años, y RSC ya se lo pregunta.
//
// Lo que sí se pone es lo que es nuestro: el idioma y la marca de los raíles.
// Si el perfil no existe todavía (raíles antes del onboarding), se deja la
// plantilla entera, que sí trae unos valores por defecto prudentes.
const NUESTRO = [['language', 'es'], ['executive_lab_rails', '1']];
const perfil = path.join(destino, '02-DOCS', 'wiki', 'harness', 'user-profile.md');

function ajustarPerfil() {
  if (!fs.existsSync(perfil)) {
    if (!escribirSinEnlaces(perfil, fs.readFileSync(path.join(origen, 'perfil-de-usuario.md')))) return '02-DOCS/wiki/harness/user-profile.md va por un enlace a otro sitio: no lo toco';
    return '02-DOCS/wiki/harness/user-profile.md (nuevo)';
  }

  const texto = fs.readFileSync(perfil, 'utf8');
  const bloque = texto.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  if (!bloque) return '02-DOCS/wiki/harness/user-profile.md (no entiendo su cabecera — no lo toco)';

  let frontmatter = bloque[1];
  if (/^executive_lab_rails:/m.test(frontmatter) && !forzar) {
    return '02-DOCS/wiki/harness/user-profile.md (ya tenía los raíles — no lo he tocado)';
  }

  for (const [clave, valor] of NUESTRO) {
    const linea = new RegExp(`^${clave}:.*$`, 'm');
    frontmatter = linea.test(frontmatter) ? frontmatter.replace(linea, `${clave}: ${valor}`) : `${frontmatter}\n${clave}: ${valor}`;
  }
  frontmatter = frontmatter.replace(/^\n+/, '');

  if (!escribirSinEnlaces(perfil, texto.replace(bloque[0], `---\n${frontmatter}\n---\n`))) return '02-DOCS/wiki/harness/user-profile.md va por un enlace a otro sitio: no lo toco';

  const nivel = (frontmatter.match(/^technical_level:\s*(\S+)/m) || [])[1] || '?';
  return `02-DOCS/wiki/harness/user-profile.md (idioma es · se respeta ${nivel})`;
}

hechos.push(ajustarPerfil());

// 6. Dejar constancia en .rsc.json. RSC conserva ownSkills tal cual; en 1.4.1
//    `doctor` todavía no lo comprueba, pero es donde el README de RSC dice
//    que va, y es lo que evitará que un futuro `repair` lo tome por basura.
const declaracion = path.join(destino, '.rsc.json');
if (fs.existsSync(declaracion)) {
  try {
    const rsc = JSON.parse(fs.readFileSync(declaracion, 'utf8'));
    const propias = new Set(rsc.ownSkills || []);
    const nuestras = ['executive-lab', ...habilidadesDeBotones];
    if (nuestras.some((id) => !propias.has(id))) {
      nuestras.forEach((id) => propias.add(id));
      rsc.ownSkills = [...propias];
      hechos.push(escribirSinEnlaces(declaracion, `${JSON.stringify(rsc, null, 2)}\n`)
        ? '.rsc.json (declarada en ownSkills)'
        : '.rsc.json va por un enlace a otro sitio: no lo toco');
    }
  } catch {
    hechos.push('.rsc.json (no he podido leerlo — decláralo a mano en ownSkills)');
  }
} else {
  hechos.push('.rsc.json (no existe todavía — falta pasar el onboarding del arnés)');
}

console.log(`Raíles puestos en ${destino}\n`);
hechos.forEach((h) => console.log(`  · ${h}`));
if (pendientes.length) console.log(`\nPendiente, hasta que se diga que sí: ${[...new Set(pendientes)].join(', ')}.`);
if (noEscritos.length) console.log(`\nNo escribo a través de un enlace que sale de la carpeta: ${[...new Set(noEscritos)].join(', ')}.`);
console.log('\nAbre una conversación nueva para que se carguen.');
