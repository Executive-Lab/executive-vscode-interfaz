// Qué hay en esta carpeta, antes de tocar nada.
//
// Por qué existe: "Preparar esta carpeta" daba por hecho que la carpeta estaba
// vacía. El único guardarraíl era `.rsc.json` — si no estaba, se montaba el
// arnés y punto. En una carpeta con un proyecto ya empezado eso hacía dos
// cosas feas:
//
//   1. Montar un arnés encima sin decir qué había debajo.
//   2. Terminar con `git add -A` y una copia de seguridad llamada "Punto de
//      partida". No se pierde nada —es un commit, no un reset— pero te mete
//      todo el trabajo sin guardar en un commit nuestro, dentro de TU
//      historial. Eso no se hace en la carpeta de otro.
//
// Así que primero se mira, y de lo que se ve sale lo que el panel ofrece. La
// regla: en una carpeta que ya es de alguien, no se toca nada sin decirlo.

const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');

const proyecto = require('./proyecto');
const lecturas = require('./lecturas');
const rutas = require('./rutas');
const procesos = require('./procesos');
const sueltas = require('./sueltas');
const git = require('./git');

// Lo que no cuenta como "algo de alguien": lo pone el sistema o lo ponemos
// nosotros, y su presencia no convierte una carpeta vacía en un proyecto.
const NO_CUENTA = new Set(['.git', '.DS_Store', '.vscode', 'Thumbs.db', '.localized']);

function loQueHayDentro(raiz) {
  try {
    return fs.readdirSync(raiz).filter((n) => !NO_CUENTA.has(n));
  } catch {
    return [];
  }
}

// ¿Este historial es nuestro o de alguien? Nuestro quiere decir que nació en
// la barra (B6).
//
// Se decidía por los autores de los 20 últimos commits, y fallaba de dos
// maneras: el `git init` de la barra no ponía identidad, así que con la de la
// persona puesta en el ordenador el propio punto de partida salía con su nombre;
// y una copia suya encima ya lo volvía «ajeno». El guardado solo no corría.
//
// Cómo se decide ahora vive en `media/railes/historial-ajeno.js`: los raíles lo
// preguntan también, porque se ponen a mano (decisión 161). Y lo que git no deja
// leer, o una rama huérfana de un repositorio con commits, es de alguien.
const historialDeLaCarpeta = require('../media/railes/historial-ajeno');

const { MARCA_DEL_HISTORIAL } = historialDeLaCarpeta;

const historialAjeno = (raiz) => historialDeLaCarpeta.esAjeno(raiz, (args) => procesos.git(...args));

// Para lo que la barra hace sola en una carpeta por ser suya (decisión 157: sus
// marcas de la 3, los ajustes de Claude y el `model` de Codex de la carpeta), no
// basta con que lo parezca: un clon trae el primer commit «Punto de partida — …»,
// y una carpeta sin `.git` no dice nada (revisión de seguridad de la 157, B4).
// Hace falta además una marca de este ordenador que no viaja: la del historial
// (`git config --local`, la pone la barra al crearlo) o, sin git, la que deja el
// montaje en el estado del editor para esta carpeta.
const CLAVE_MONTADA_AQUI = 'executiveLab.montadaAqui';
let estadoDeLaCarpeta = null;
const saberDondeRecordar = (workspaceState) => { estadoDeLaCarpeta = workspaceState || null; };

async function montadaAqui() {
  const raiz = proyecto.raiz();
  if (!raiz) return false;
  if (fs.existsSync(path.join(raiz, '.git'))) {
    const marca = await procesos.git('config', '--local', '--get', MARCA_DEL_HISTORIAL);
    return marca.codigo === 0 && marca.salida.trim() === 'nuestro';
  }
  try {
    return Boolean(estadoDeLaCarpeta) && estadoDeLaCarpeta.get(CLAVE_MONTADA_AQUI) === raiz;
  } catch {
    return false;
  }
}

async function recordarQueSeMontoAqui() {
  const raiz = proyecto.raiz();
  if (!raiz || !estadoDeLaCarpeta) return false;
  try {
    await estadoDeLaCarpeta.update(CLAVE_MONTADA_AQUI, raiz);
    return true;
  } catch {
    return false;
  }
}

async function cambiosSinGuardar(raiz) {
  if (!fs.existsSync(path.join(raiz, '.git'))) return 0;
  const { codigo, salida } = await procesos.git('status', '--porcelain');
  if (codigo !== 0) return 0;
  return salida.trim() ? salida.trim().split('\n').length : 0;
}

// De qué va el proyecto que ya hay, dicho en cristiano y solo si se sabe. No es
// una lista de tecnologías: es para que quien lo lee reconozca su carpeta.
const PISTAS = [
  ['package.json', 'una aplicación'],
  ['requirements.txt', 'algo en Python'],
  ['pyproject.toml', 'algo en Python'],
  ['Gemfile', 'algo en Ruby'],
  ['go.mod', 'algo en Go'],
  ['pom.xml', 'algo en Java'],
  ['Cargo.toml', 'algo en Rust'],
  ['composer.json', 'algo en PHP'],
  ['index.html', 'una web'],
  ['docker-compose.yml', 'varios servicios'],
];

function deQueParece(raiz) {
  if (!raiz) return null;
  for (const [fichero, dicho] of PISTAS) {
    if (fs.existsSync(path.join(raiz, fichero))) return dicho;
  }
  return null;
}

// ── Las carpetas que no se preparan, y las que se preguntan ──────────────
//
// Preparar la carpeta personal hacía un `git init` en ella y un escaneo de todo
// el disco, y RSC escribía sus enganches y habilidades en `~/.claude/`, que es
// la configuración de Claude de esa persona para todo el ordenador (B1). Nada
// lo impedía.
//
// Lista cerrada por sistema (C-5), comparada con el sitio real de la carpeta,
// con los enlaces resueltos:
//
//   prohibida  'raiz'               la raíz de un disco: `/`, `C:\`
//              'personal'           la carpeta personal
//              'contieneLaPersonal' una que la contiene: `/Users`, `C:\Users`
//              'sistema'            una del sistema, ella misma y no lo de dentro
//   delicada   Escritorio, Documentos o Descargas enteras, también en iCloud y
//              en OneDrive, que los mueven de sitio. No se prohíben: se pregunta.
//
// Lo de dentro de una del sistema no se mira a propósito: las carpetas
// temporales viven debajo de `/var`, y ahí se prueba todo esto.
//
// Pura: recibe la casa, el sistema y cómo se resuelve un sitio real, para poder
// probarla con rutas de macOS y de Windows desde cualquiera de los dos.
const DEL_SISTEMA = {
  darwin: ['/System', '/Library', '/Applications', '/usr', '/bin', '/sbin', '/etc', '/var', '/private', '/opt', '/Volumes', '/cores', '/tmp'],
  linux: ['/usr', '/bin', '/sbin', '/lib', '/etc', '/var', '/opt', '/boot', '/sys', '/proc', '/dev', '/mnt', '/media', '/root', '/srv', '/tmp'],
  win32: ['Windows', 'Program Files', 'Program Files (x86)', 'ProgramData', 'PerfLogs', 'Recovery', '$Recycle.Bin'],
};
const DELICADAS = [
  ['escritorio', ['Desktop', 'Escritorio']],
  ['documentos', ['Documents', 'Documentos']],
  ['descargas', ['Downloads', 'Descargas']],
];

function queCarpetaEs(raiz, { casa, plataforma = process.platform, real = (r) => r } = {}) {
  const ruta = plataforma === 'win32' ? path.win32 : path.posix;
  // En macOS y en Windows el disco no distingue mayúsculas.
  const igual = (a, b) => (plataforma === 'linux' ? a === b : a.toLowerCase() === b.toLowerCase());
  const limpia = (r) => {
    const resuelta = ruta.resolve(r);
    const { root } = ruta.parse(resuelta);
    return resuelta === root ? root : resuelta.replace(/[\/]+$/, '');
  };
  const aqui = limpia(real(raiz));
  const suya = casa ? limpia(real(casa)) : null;
  const nada = { prohibida: null, delicada: null };

  if (aqui === ruta.parse(aqui).root) return { ...nada, prohibida: 'raiz' };
  if (suya && igual(aqui, suya)) return { ...nada, prohibida: 'personal' };
  if (suya && igual(suya.slice(0, aqui.length + 1), `${aqui}${ruta.sep}`)) return { ...nada, prohibida: 'contieneLaPersonal' };

  const delSistema = plataforma === 'win32'
    ? DEL_SISTEMA.win32.map((n) => ruta.join(ruta.parse(aqui).root, n))
    : DEL_SISTEMA[plataforma === 'darwin' ? 'darwin' : 'linux'];
  // La lista también por su sitio real: en macOS `/etc`, `/var` y `/tmp` son
  // enlaces a `/private/…`, y en Linux con `/usr` unido `/bin` es `/usr/bin`
  // (revisión de F2, I2).
  if (delSistema.some((s) => igual(aqui, s) || igual(aqui, limpia(real(s))))) return { ...nada, prohibida: 'sistema' };

  if (!suya) return nada;
  const bases = [suya];
  if (plataforma === 'darwin') bases.push(ruta.join(suya, 'Library', 'Mobile Documents', 'com~apple~CloudDocs'));
  if (plataforma === 'win32') bases.push(ruta.join(suya, 'OneDrive'));
  for (const [cual, nombres] of DELICADAS) {
    for (const base of bases) {
      for (const nombre of nombres) {
        const suSitio = ruta.join(base, nombre);
        if (igual(aqui, suSitio) || igual(aqui, limpia(real(suSitio)))) return { ...nada, delicada: cual };
      }
    }
  }
  return nada;
}

// Si esta carpeta está dentro de otro proyecto: un historial o un arnés más
// arriba (B9). Montar aquí haría un historial dentro de otro, y RSC avisaría de
// otro arnés por encima sin que nadie se lo contara a la persona. Son unas
// pocas comprobaciones de existencia, sin procesos. No se mira la carpeta
// personal ni lo de encima de ella: hay quien guarda su configuración en un git
// ahí, y eso no convierte cada carpeta suya en parte de otro proyecto.
function queHayEncima(raiz) {
  if (!raiz) return null;
  const casa = sitioReal(os.homedir());
  let arriba = path.dirname(sitioReal(raiz));
  while (arriba !== path.dirname(arriba) && !rutas.mismoSitio(arriba, casa)) {
    if (fs.existsSync(path.join(arriba, '.git')) || fs.existsSync(path.join(arriba, '.rsc.json'))) {
      // Con arnés arriba, esto es parte de una carpeta ya preparada, como un
      // proyecto de un monorepo (decisión 195): se trabaja desde allí.
      return { nombre: path.basename(arriba), ruta: arriba, conArnes: fs.existsSync(path.join(arriba, '.rsc.json')) };
    }
    arriba = path.dirname(arriba);
  }
  return null;
}

// El sitio real de una carpeta, con los enlaces resueltos. Si no se puede
// resolver, se compara tal cual: mejor eso que no mirar.
const sitioReal = rutas.sitioReal;

const comoEsEstaCarpeta = (raiz) => queCarpetaEs(raiz, { casa: os.homedir(), real: sitioReal });

// ─────────────────────────────────────────────────────────────────────────
//                        EL PARTE DE RECONOCIMIENTO
// ─────────────────────────────────────────────────────────────────────────
//
// Se mira ANTES de preguntar nada. Jose: *«primero, antes de lanzar las
// preguntas, debería escanear la carpeta»*. Y no es un capricho de orden: de lo
// que se encuentre depende qué rama se toma y, sobre todo, **qué no hay que
// volver a preguntar**.
//
// `queHay()` sabía distinguir cinco casos y con eso se quedaba corto en tres
// sitios, los tres callejones sin salida de la barra:
//
//   · un repositorio **clonado** con arnés dentro se veía igual que uno
//     montado, porque lo declarado en `.rsc.json` tapaba lo que falta en disco;
//   · un `.rsc.json` **ilegible** —marcas de conflicto de merge, que el propio
//     RSC avisa de que pasan— se veía como una carpeta sin arnés, y se habría
//     montado uno encima;
//   · una carpeta con **otro montaje de asistente** hecho a mano se trataba
//     como una carpeta cualquiera y se le montaba RSC sin decir una palabra.
//
// El parte se calcula en tres niveles, separados por lo que cuesta sacarlos:
// así la brújula puede pedirlo cien veces sin lanzar un proceso, y el arranque
// lo pide una vez a fondo con barra de progreso.

const rsc = require('./rsc');
const donde = require('./donde');
const identidad = require('./identidad');
const sitios = require('../media/railes/sitios');
const noEntra = require('../media/railes/no-entra-en-git');

// Los cuatro ficheros de raíz que se llevan la peor parte de un merge y que un
// asistente lee siempre. Si alguno tiene contenido, aquí había alguien.
const FICHEROS_DE_ASISTENTE = ['CLAUDE.md', 'AGENTS.md', 'AGENTS.override.md', 'GEMINI.md', 'CONVENTIONS.md', '.cursorrules'];

const tieneAlgoDentro = (carpeta) => {
  if (!carpeta || !fs.existsSync(carpeta)) return 0;
  try {
    return fs.readdirSync(carpeta).filter((n) => !n.startsWith('.')).length;
  } catch {
    return 0;
  }
};

// ── Lo que escribe RSC en un fichero compartido no es de nadie ───────────
//
// RSC mete su capa siempre-activa dentro del `AGENTS.md` de la casa, entre
// marcas, y desde la 2.0 escribe además un `CLAUDE.md` propio entero —para que
// Claude Code no se lea el bloque dos veces desde que lee `AGENTS.md`—.
//
// Sin quitar eso, un `CLAUDE.md` puesto por RSC contaría como «aquí ya había
// otro asistente montado a mano», y le pediríamos permiso a alguien para
// respetar un fichero que hemos escrito nosotros. RSC hace esta misma resta en
// su `scanProject` por el mismo motivo.
//
// La sombra se descuenta de su principio a su final, no hasta el final del
// fichero (B12): es la marca, el título, dos frases fijas y el comentario que
// explica por qué existe (`targets/agents-md-shadow.js`). Lo que alguien
// escriba debajo es suyo —RSC lo dice de su sombra: «Edit it and it is yours»—
// y cuenta como suyo.
const MARCAS_DE_RSC = [
  /<!-- rsc-suggest:start -->[\s\S]*?<!-- rsc-suggest:end -->/g,
  /<!-- rsc:claude-md-shadow -->\s*# Project instructions\s*\n[^\n]*\n\s*Project instructions for Claude Code go below\.\s*(?:<!--[\s\S]*?-->)?/g,
];

// Y lo nuestro, igual: el bloque entre marcas que dejan los raíles en
// `CLAUDE.md` con Claude y en `AGENTS.md` con Codex. Lo de fuera del bloque es
// de quien lo escribió.
const MARCAS_NUESTRAS = [/<!-- executive-lab:start -->[\s\S]*?<!-- executive-lab:end -->/g];

const tieneTexto = (fichero) => {
  if (!fichero || !fs.existsSync(fichero)) return false;
  try {
    const crudo = fs.readFileSync(fichero, 'utf8');
    return [...MARCAS_DE_RSC, ...MARCAS_NUESTRAS].reduce((texto, marca) => texto.replace(marca, ''), crudo).trim().length > 0;
  } catch {
    return false;
  }
};

// ── Otro montaje de asistente, que no es el nuestro ──────────────────────
//
// Jose: *«si hay un arnés distinto al RSC hay que avisar al usuario y decirle
// si quiere implementar RSC […] adaptamos la estructura del proyecto a la
// estructura de RSC pero mantenemos lo que ya tenía»*.
//
// Para poder decírselo hay que saber QUÉ tiene, no solo que tiene algo. Se
// recorre la tabla de asistentes y se cuenta lo que hay en cada carpeta suya.
function otroMontaje() {
  const encontrados = [];

  for (const quien of Object.keys(sitios.SITIOS)) {
    const habilidades = tieneAlgoDentro(donde.carpetaDeOtro(quien, 'habilidades'));
    const comandos = tieneAlgoDentro(donde.carpetaDeOtro(quien, 'comandos'));
    const agentes = tieneAlgoDentro(donde.carpetaDeOtro(quien, 'agentes'));

    const suyo = sitios.sitiosDe(quien) || {};
    const siempre = suyo.siempre ? proyecto.ruta(...suyo.siempre.fichero) : null;

    // Que exista el fichero de estado de RSC dentro quiere decir que esto lo
    // montó RSC alguna vez, aunque ahora no haya `.rsc.json`. No es "otro
    // arnés": es el nuestro, roto. Se apunta para que la rama lo sepa.
    const deRsc = fs.existsSync(donde.ficheroDeEstadoDe(quien) || '');

    if (habilidades || comandos || agentes || (siempre && tieneTexto(siempre))) {
      encontrados.push({ quien, habilidades, comandos, agentes, deRsc });
    }
  }

  // Y los ficheros de raíz que no cuelgan de ninguna carpeta de asistente.
  const sueltos = FICHEROS_DE_ASISTENTE.filter((n) => tieneTexto(proyecto.ruta(n)));

  return { asistentes: encontrados, ficheros: sueltos };
}

// Lo que cuesta un `readdir` y un `JSON.parse`. Nada de procesos.
//
// Esto se puede llamar en cada repintado sin pensarlo. Lo que lanza git va
// aparte, abajo, porque la pantalla principal se repinta sola y no puede
// permitirse dos subprocesos cada vez.
function mirar() {
  const raiz = proyecto.raiz();

  // Sin carpeta abierta no hay nada que mirar, y varias de las piezas de abajo
  // dan por hecho que hay una ruta. Se corta aquí.
  if (!raiz) {
    return {
      raiz: null,
      carpeta: { vacia: true, cuantos: 0, parece: null, prohibida: null, delicada: null },
      declarada: 'no',
      declaracion: null,
      recibo: null,
      suelo: { declaracion: false, conexiones: false, conocimiento: false, faltan: [] },
      habilidades: { declaradas: [], enDisco: [], colgando: [] },
      clonado: false,
      dentroDeOtro: null,
      conEstadoDeRsc: false,
      versionAtrasada: false,
      otroMontaje: { asistentes: [], ficheros: [] },
      railes: { habilidadPropia: false, perfil: false, nombres: null },
      claves: null,
    };
  }

  const dentro = loQueHayDentro(raiz);
  const declarada = proyecto.comoEstaLaDeclaracion();
  const declaracion = declarada === 'ok' ? proyecto.declaracion() : null;

  const suelo = proyecto.sueloDelArnes();
  const declaradas = declaracion
    ? [...new Set([...(declaracion.skills || []), ...(declaracion.ownSkills || [])])]
    : [];
  const enDisco = rsc.habilidadesEnDisco();

  // ── Un clon, como lo llama el propio RSC ──────────────────────────────
  //
  // `.rsc/` es de cada máquina y nunca viaja en git, y las habilidades de RSC
  // tampoco: él mismo las deja fuera (`install-apply.js`). Lo nuestro sí viaja
  // —`executive-lab`, los comandos, los ajustes—, así que «hay alguna
  // habilidad en disco» no distinguía un clon de un arnés montado: la nuestra
  // lo tapaba, y la barra decía «ya estaba» con las del arnés sin estar (B2).
  //
  // Es clon si falta `.rsc/`, o si no está en disco ninguna de las que RSC
  // declara, descontadas las propias.
  const propias = new Set(['executive-lab', ...((declaracion && declaracion.ownSkills) || [])]);
  const deRsc = declaradas.filter((id) => !propias.has(id));
  // Una habilidad nativa de Codex con el mismo nombre no completa la copia
  // que RSC declaró en .codex/rsc. El diagnóstico mira esa copia concreta.
  const delArnesEnDisco = rsc.habilidadesDelArnesEnDisco();
  const clonado = Boolean(declaracion) && (!proyecto.existe('.rsc')
    || (deRsc.length > 0 && !deRsc.some((id) => delArnesEnDisco.includes(id))));

  return {
    raiz,
    carpeta: { vacia: !dentro.length, cuantos: dentro.length, parece: deQueParece(raiz), ...comoEsEstaCarpeta(raiz) },
    declarada,
    declaracion,
    recibo: proyecto.recibo(),
    suelo: { ...suelo, faltan: Object.entries(suelo).filter(([, hay]) => !hay).map(([que]) => que) },
    habilidades: {
      declaradas,
      enDisco,
      // Declaradas y no montadas aquí: lo que RSC llama «what a fresh clone
      // looks like». Se arregla con `sync`, no volviendo a montar.
      colgando: declaradas.filter((id) => !(propias.has(id) ? enDisco : delArnesEnDisco).includes(id)),
    },
    clonado,
    dentroDeOtro: queHayEncima(raiz),
    conEstadoDeRsc: fs.existsSync(donde.ficheroDeEstado() || ''),
    // Montada con un catálogo más viejo que el que trae la barra dentro. Uno
    // más nuevo no es atrasado (B5): se dice aparte, y no se baja sin pulsar.
    versionAtrasada: ['vieja', 'rara'].includes(rsc.comoEsLaVersion(declaracion && declaracion.catalogVersion)),
    versionMasNueva: rsc.comoEsLaVersion(declaracion && declaracion.catalogVersion) === 'nueva',
    otroMontaje: otroMontaje(),
    railes: comoEstanLosRailes(),
    claves: sueltas.resumen(),
  };
}

// Decisión 188: estas tres comparaciones corren en cada repintado y leían del
// disco los mismos ficheros cada vez (los nuestros no cambian en toda la sesión).
// Se leen una vez y se guardan mientras el fichero siga igual (`lecturas.js`). Si
// uno no se puede leer, salta como antes, y cada comparación contesta «sí»: sin
// poder mirar no se afirma que esté viejo.
const leido = (ruta) => {
  const texto = lecturas.texto(ruta);
  if (texto === undefined) throw new Error('no se puede leer');
  return texto;
};

// Los raíles son lo nuestro: la habilidad que fija el español y el vocabulario,
// y los dos nombres en el perfil. No los pone RSC, así que un arnés montado por
// otra vía —o traído de otro ordenador— puede estar entero y no tenerlos.
//
// Y de aquí sale la única pregunta que un clon necesita: los nombres.
// ── Y si son los de hoy ──────────────────────────────────────────────────
//
// Esto solo miraba si el fichero **existe**. Pero los raíles los copia el
// wizard al montar, con los que llevara la barra ese día: una carpeta montada
// la semana pasada corre las reglas de la semana pasada, y la barra decía
// «Puesto». Es la fricción F13 de la auditoría, y muerde justo cuando las
// reglas nuevas importan — el día que se les añade el protocolo de
// credenciales, todas las carpetas de antes siguen sin conocerlo.
//
// Se compara el contenido, no una fecha ni un número: es lo único que no
// miente cuando alguien edita el fichero a mano. Y de todos los ficheros de la
// habilidad, no solo de SKILL.md: el freno y su copia fijada (C1) llegaron
// después, y con SKILL.md igual se daban por puestos sin estar. Barato: cuatro
// ficheros.
function laHabilidadEsLaDeHoy(carpetaDeLaExtension, puesta) {
  const nuestra = carpetaDeLaExtension && path.join(carpetaDeLaExtension, 'media', 'railes', 'executive-lab');
  if (!nuestra || !fs.existsSync(path.join(nuestra, 'SKILL.md')) || !fs.existsSync(puesta)) return true;
  const suya = path.dirname(puesta);
  try {
    return fs.readdirSync(nuestra).every((fichero) => {
      const aqui = path.join(suya, fichero);
      return fs.existsSync(aqui) && leido(path.join(nuestra, fichero)) === leido(aqui);
    });
  } catch {
    // Sin poder leer uno de los dos no se afirma que esté viejo: decirlo mal
    // manda a alguien a rehacer algo que estaba bien.
    return true;
  }
}

// Y lo que llega con la habilidad (D6): los comandos, donde el asistente los
// tiene, y el bloque entre marcas de `CLAUDE.md` o de `AGENTS.md`. Mirando solo
// la habilidad, un comando de otro día, o un bloque que todavía no nombra
// `siempre.md`, se daban por puestos. Un bloque que falta no es de antes: es lo
// que el reponer pone, o lo que espera al sí de alguien (C-4).
function losComandosSonLosDeHoy(carpetaDeLaExtension) {
  const nuestros = carpetaDeLaExtension && path.join(carpetaDeLaExtension, 'media', 'railes', 'comandos');
  // Con Claude y Codex van como habilidades (decisión 141), escritas como las
  // escribe `aplicar.js`; un comando de antes que siga ahí ya no cuenta.
  if (donde.carpetaDeBotones()) return lasDeBotonSonLasDeHoy(nuestros, carpetaDeLaExtension);
  const suyos = donde.carpetaDeComandos();
  if (!nuestros || !suyos || !fs.existsSync(nuestros)) return true;
  try {
    // Con el nombre que les da cada asistente: `guardar.prompt.md` en Copilot (E3).
    // Uno suyo que se llama como uno nuestro no es nuestro de antes: los raíles no
    // lo pisan (revisión de F4, m8), así que tampoco cuenta como viejo. Es nuestro
    // si su `description` es la nuestra, como en `aplicar.js`.
    const descripcion = (texto) => {
      const cabecera = (texto.match(/^---\r?\n([\s\S]*?)\r?\n---/) || [])[1] || '';
      const linea = cabecera.match(/^description:\s*(.+?)\s*$/m);
      return linea ? linea[1].replace(/^["']|["']$/g, '') : null;
    };
    return fs.readdirSync(nuestros).every((fichero) => {
      const aqui = path.join(suyos, fichero.replace(/\.md$/, donde.acabaUnComando()));
      if (!fs.existsSync(aqui)) return false;
      const [nuestro, suyo] = [leido(path.join(nuestros, fichero)), leido(aqui)];
      return nuestro === suyo || descripcion(nuestro) !== descripcion(suyo);
    });
  } catch {
    return true;
  }
}

function lasDeBotonSonLasDeHoy(nuestros, carpetaDeLaExtension) {
  if (!nuestros || !fs.existsSync(nuestros)) return true;
  try {
    const { comoHabilidad, descripcionDe, cuandoDe } = require(path.join(carpetaDeLaExtension, 'media', 'railes', 'como-habilidad.js'));
    const quien = donde.paraQuien();
    return fs.readdirSync(nuestros).filter((f) => f.endsWith('.md')).every((fichero) => {
      const nombre = fichero.replace(/\.md$/, '');
      const aqui = path.join(donde.carpetaDeBotones(), nombre, 'SKILL.md');
      if (!fs.existsSync(aqui)) return false;
      const fuente = leido(path.join(nuestros, fichero));
      const suya = leido(aqui);
      // Una suya que se llama como una nuestra no es nuestra de antes: no se pisa.
      // Con su recordatorio, que no la hace de antes (decisión 144).
      return suya === comoHabilidad(fuente, nombre, quien, { cuando: cuandoDe(suya) }).skill || descripcionDe(fuente) !== descripcionDe(suya);
    });
  } catch {
    return true;
  }
}

// Lo de siempre se mira donde lo ponen los raíles para cada asistente declarado,
// y en ningún otro sitio (revisión de F4, I3): se miraban `CLAUDE.md` y
// `AGENTS.md` fuera quien fuera el asistente, y con Claude los raíles no
// reescriben `AGENTS.md`. Una carpeta que usó Codex con la barra de antes y pasó
// a Claude se quedaba «de una versión anterior» para siempre.
const NUESTRO = /<!-- executive-lab:start -->[\s\S]*?<!-- executive-lab:end -->/;
const NOMBRA_SIEMPRE = /\/executive-lab\/siempre\.md/;

function loDeSiempreDeCadaUno() {
  const declaracion = proyecto.declaracion();
  const declarados = declaracion && Array.isArray(declaracion.targets) && declaracion.targets.length
    ? declaracion.targets
    : [sitios.paraQuien(declaracion)];
  return declarados.map((quien) => sitios.dondeVaLoDeSiempre(quien, proyecto.raiz())).filter(Boolean).map((partes) => {
    let texto = null;
    try {
      texto = fs.readFileSync(proyecto.ruta(...partes), 'utf8');
    } catch { /* no está */ }
    // El `.mdc` de Cursor es entero nuestro: no lleva marcas, y tiene que
    // aplicarse siempre (revisión de F5, m9).
    const entero = partes[partes.length - 1].startsWith('executive-lab.');
    const bloque = texto === null ? null : (entero ? [texto] : texto.match(NUESTRO));
    return { texto, bloque, entero };
  });
}

// Y el de lo que no entra en git (F1), uno por carpeta: si está, el de hoy.
function elDeGit() {
  let texto = '';
  try {
    texto = fs.readFileSync(proyecto.ruta('.gitignore'), 'utf8');
  } catch { /* no hay */ }
  return noEntra.elQueHay(texto);
}

function losBloquesSonLosDeHoy() {
  const deGit = elDeGit();
  return loDeSiempreDeCadaUno().every(({ bloque, entero }) => !bloque || (NOMBRA_SIEMPRE.test(bloque[0]) && (!entero || /^alwaysApply:\s*true\s*$/m.test(bloque[0]))))
    && (!deGit || deGit === noEntra.elBloque());
}

// Dónde vive la barra, para poder comparar sus raíles con los de la carpeta.
// Mismo patrón que `buscar.saberDondeEstamos` y `rsc.saberDondeEstamos`: lo
// dice `activate()` una vez y no hay que pasarlo por seis funciones.
let carpetaDeLaBarra = null;
const saberDondeEstamos = (ruta) => { carpetaDeLaBarra = ruta; };

function comoEstanLosRailes(carpetaDeLaExtension = carpetaDeLaBarra) {
  const habilidades = donde.carpetaDeHabilidades();
  const nombres = identidad.leer();
  const suSkill = habilidades && path.join(habilidades, 'executive-lab', 'SKILL.md');
  const puesta = Boolean(suSkill && fs.existsSync(suSkill));

  return {
    habilidadPropia: puesta,
    // Puestos, pero de una versión anterior de la barra.
    alDia: !puesta || (laHabilidadEsLaDeHoy(carpetaDeLaExtension, suSkill)
      && losComandosSonLosDeHoy(carpetaDeLaExtension) && losBloquesSonLosDeHoy()),
    perfil: proyecto.existe(...identidad.PERFIL),
    // `puesto` es lo que distingue un nombre escrito por alguien del que se
    // deduce de la carpeta. Un nombre deducido no cuenta como contestado.
    nombres: nombres.puesto ? { arnes: nombres.arnes, empresa: nombres.empresa } : null,
    // Lo que se contestó al montar y no pide RSC: sin leerlo aquí, volver a
    // montar lo perdía, porque RSC reescribe el perfil y no se vuelve a
    // preguntar.
    alcance: nombres.alcance,
    personas: nombres.personas,
  };
}

// Lo de arriba más el estado, todavía sin tocar git.
function mirarYClasificar() {
  const visto = mirar();
  return { ...visto, estado: queEstadoEs(visto) };
}

// El estado, derivado de lo de arriba. Nueve, excluyentes, y en este orden.
function queEstadoEs(visto) {
  if (!visto.raiz) return 'sinCarpeta';
  if (visto.declarada === 'rota') return 'reciboRoto';

  if (visto.declarada === 'no') {
    // Sin `.rsc.json` pero con carpetas de asistente puestas: aquí ya había un
    // montaje, nuestro o de otro. Si trae el fichero de estado de RSC es el
    // nuestro sin declaración; si no, es de alguien.
    const hayOtro = visto.otroMontaje.asistentes.length || visto.otroMontaje.ficheros.length;
    // Lo que hay lo dejó RSC, y nada más: es un montaje nuestro que se quedó a
    // medias sin su `.rsc.json`, no uno de otro (B8). Se termina, y no se pide
    // permiso como si fuera de alguien.
    const soloDeRsc = visto.otroMontaje.asistentes.length > 0
      && visto.otroMontaje.asistentes.every((a) => a.deRsc)
      && !visto.otroMontaje.ficheros.length;
    if (soloDeRsc) return 'aMedias';
    if (hayOtro) return 'otroArnes';
    return visto.carpeta.vacia ? 'vacia' : 'empezada';
  }

  // Con `.rsc.json`: primero lo que impide usarlo, después lo que falta.
  if (!visto.recibo) return 'sinRecibo';
  if (visto.clonado) return 'clonado';
  if (visto.suelo.faltan.length) return 'aMedias';
  return 'conArnes';
}

// El parte entero. `profundo` añade lo que cuesta subprocesos de RSC, que solo
// hace falta al arrancar y al revisar — nunca en la pantalla principal.
async function reconocer({ profundo = false } = {}) {
  const visto = mirarYClasificar();

  if (visto.estado === 'sinCarpeta') {
    return Object.freeze({ ...visto, git: { hay: false, repositorio: false, ajeno: false, sinGuardar: 0 } });
  }

  const parte = { ...visto, git: await comoEstaElHistorial(visto.raiz) };

  if (!profundo) return Object.freeze(parte);

  // Lo caro, y solo cuando alguien está esperando delante de una barra.
  const [salud, reparaciones, recomendaciones] = await Promise.all([
    rsc.salud(), rsc.arreglarEnSeco(), rsc.reevaluar(),
  ]);
  return Object.freeze({
    ...parte,
    arnes: {
      salud: rsc.comoEstaDeSalud(salud),
      reparaciones: rsc.queHayQueArreglar(reparaciones),
      // Lo que el arnés aplazó al montarse y hoy ya encajaría. Solo lectura:
      // aceptar un plan nuevo lo hace una persona, por su huella.
      recomendaciones: rsc.queRecomienda(recomendaciones),
    },
  });
}

// Git: si está en el ordenador, si esta carpeta es un repositorio, si el
// historial es de alguien y cuánto hay sin guardar. Dos subprocesos, y por eso
// va aparte de `mirar()`.
async function comoEstaElHistorial(raiz) {
  const [hay, ajeno, sinGuardar] = await Promise.all([
    git.hay(),
    historialAjeno(raiz),
    cambiosSinGuardar(raiz),
  ]);
  return {
    hay,
    repositorio: fs.existsSync(path.join(raiz, '.git')),
    ajeno,
    sinGuardar,
    sePuedeInstalarSolo: git.sePuedeInstalarSolo(),
  };
}

// El estado de la carpeta, en una palabra, y con lo que haga falta para
// contarlo. Los cinco casos son excluyentes y cubren todo.
//
//   sinCarpeta    no hay ninguna abierta
//   conArnes      ya tiene arnés y está entero
//   aMedias       tiene .rsc.json pero le falta suelo
//   vacia         no hay nada: se puede preparar sin pensar
//   empezada      ya es de alguien; hay que decir qué hay antes de tocar
//
// ── Por qué esto es ahora una proyección ─────────────────────────────────
//
// `reconocer()` distingue nueve estados; esta función sigue devolviendo los
// cinco de siempre, colapsando los cuatro nuevos a lo que ya se veía. No es
// deuda: es lo que permite cambiar el reconocimiento sin tocar la brújula, el
// informe de soporte ni la radiografía, que llevan meses leyendo estas cinco
// palabras. Quien necesite el detalle —el arranque— pide `reconocer()`.
//
// El colapso, fila a fila:
//
//   reciboRoto  → lo que diga el suelo. Hoy `.rsc.json` ilegible ya se veía
//                 como arnés, porque solo se miraba que el fichero existiera.
//   clonado     → lo que diga el suelo, ídem.
//   sinRecibo   → lo que diga el suelo, ídem.
//   otroArnes   → 'empezada': sin `.rsc.json`, es una carpeta con cosas.
const COMO_SE_VEIA = {
  sinCarpeta: () => 'sinCarpeta',
  vacia: () => 'vacia',
  empezada: () => 'empezada',
  otroArnes: () => 'empezada',
  conArnes: () => 'conArnes',
  aMedias: () => 'aMedias',
  reciboRoto: (visto) => (visto.suelo.faltan.length ? 'aMedias' : 'conArnes'),
  clonado: (visto) => (visto.suelo.faltan.length ? 'aMedias' : 'conArnes'),
  sinRecibo: (visto) => (visto.suelo.faltan.length ? 'aMedias' : 'conArnes'),
};

async function queHay() {
  const visto = mirarYClasificar();
  const tipo = COMO_SE_VEIA[visto.estado](visto);

  if (tipo !== 'empezada') return { tipo };

  // Solo aquí se lanza git, igual que antes: es el único caso que necesita
  // saber de quién es el historial y cuánto hay sin guardar.
  const historial = await comoEstaElHistorial(visto.raiz);

  return {
    tipo,
    cuantos: visto.carpeta.cuantos,
    parece: visto.carpeta.parece,
    conHistorial: historial.ajeno,
    sinGuardar: historial.sinGuardar,
    // Claves sueltas en ficheros que ya estaban: no se tocan, se cuentan, y el
    // asistente ya sabe qué hacer con ellas cuando el arnés esté montado.
    claves: visto.claves,
  };
}

// ¿Podemos dejar un "Punto de partida" en el historial de esta carpeta?
//
// Solo si el historial es nuestro. En el de alguien no se escribe: se monta el
// arnés, se deja todo en el disco y que esa persona lo guarde cuando quiera,
// con su mensaje y en su momento.
const podemosGuardarElPuntoDePartida = async () => !(await historialAjeno(proyecto.raiz()));

// ¿Puede la barra guardar sola una copia aquí? (decisión 164, que la enciende de
// fábrica.) Solo en un historial de esta carpeta que creó la barra en este
// ordenador: con su marca local (`git config --local`), que no viaja en un clon.
// No vale lo que basta para el punto de partida (`historialAjeno`):
//   · sin `.git` propio, git sube a buscar el de más arriba, y la copia acabaría
//     en el historial de otro proyecto;
//   · un `git init` suyo, sin commits todavía, se da allí por nuestro, y la
//     copia sola haría commit en él cada hora y correría su `pre-commit`;
//   · un clon de un historial de la barra empieza por «Punto de partida — …»,
//     y es de quien lo clonó.
// Guardar a mano no pasa por aquí: lo pulsa alguien que está mirando.
async function podemosGuardarSolo() {
  const raiz = proyecto.raiz();
  if (!raiz || !fs.existsSync(path.join(raiz, '.git'))) return false;
  const marca = await procesos.git('config', '--local', '--get', MARCA_DEL_HISTORIAL);
  return marca.codigo === 0 && marca.salida.trim() === 'nuestro';
}

// ---------------------------------------------------------- la radiografía

// "¿Hasta qué punto está montada esta carpeta?" — pieza por pieza, y sin
// esconder lo que falta.
//
// Existe porque la pantalla principal solo sabe decir dos cosas: o hay arnés o
// no. Y entre medias hay mucho: un arnés montado sin conexiones, conexiones a
// medias, claves que están pero fuera de sitio, una wiki vacía. Quien mira la
// barra y no ve conexiones no sabe si es que no hay o es que no las encuentra.
// Esto lo dice.
// `sigueSinCopias`: que en esta carpeta se eligió seguir sin copias, que se
// guarda en el estado del espacio de trabajo y no en el disco.
async function radiografia({ aFondo = null, sigueSinCopias = false } = {}) {
  const conexiones = require('./conexiones');
  const cerebro = require('./cerebro');
  // Tarde a propósito: `encargos` lee `cerebro` y `sueltas`, y cargarlo arriba
  // metería a `terreno` en un círculo con medio módulo del proyecto.
  const encargos = require('./encargos');
  const acciones = require('./acciones');
  const github = require('./github');
  const asistentes = require('./asistentes');
  const donde = require('./donde');

  const hay = await queHay();
  if (hay.tipo === 'sinCarpeta') return { queEs: hay.tipo, piezas: [], listo: false, algoRoto: false };

  // Lo que se ha encontrado sin tocar nada: de aquí salen las piezas que la
  // lista de antes no enseñaba por ningún lado.
  const parte = mirarYClasificar();

  const conArnes = hay.tipo === 'conArnes' || hay.tipo === 'aMedias';
  const proveedores = conArnes ? conexiones.proveedores() : [];
  const aMedias = proveedores.filter((p) => p.faltan > 0).length;
  const fuera = sueltas.resumen();
  const temas = conArnes ? cerebro.catalogo().length : 0;
  const botones = conArnes ? acciones.acciones().length : 0;
  const cuenta = await github.estado();

  // Con quién habla esta carpeta, y si esa persona lo tiene puesto.
  //
  // Faltaba, y era la primera pregunta: una carpeta montada para un asistente
  // que no está instalado se comporta como si estuviera rota —los botones no
  // hacen nada— y aquí no salía por ningún lado. Lo sabíamos de sobra
  // (`asistentes.comoEstamos`) y no lo decíamos.
  const conQuien = asistentes.elDeAhora();
  const loTiene = conQuien ? asistentes.estaPuesto(conQuien) : false;

  // Si lo que el arnés hace solo tiene con qué arrancar (C2): lo decide el
  // relevo al abrirse la barra (`relevo.js`).
  const conEnganches = conArnes && hayEnganchesConNode();
  const elRelevo = require('./relevo').comoEsta();
  const arrancan = conEnganches && elRelevo.modo !== 'ninguno';
  // Con el relevo puesto después de que el asistente arrancara, su proceso no lo
  // ve hasta que se abre la conversación otra vez (revisión de F3, I3).
  const tarde = arrancan && Boolean(elRelevo.tarde);

  // Si en esta carpeta hay historial de verdad.
  const conHistorial = proyecto.existe('.git');

  // ── Cada pieza trae su salida ─────────────────────────────────────────
  //
  // Esta pantalla listaba ocho cosas y **no tenía ni un botón**: decía «se
  // quedó a medias», «no lo tienes puesto», «N sin terminar», «el asistente
  // puede ordenarlas» — y no se podía pulsar nada para ninguna. Diagnosticar
  // sin ofrecer salida es dejar a alguien mirando una lista de problemas.
  //
  // La regla, y hay una prueba que la recorre entera: **toda pieza que no esté
  // en 'si' trae `arreglo`**. Si alguien añade una fila sin salida, falla.
  //
  // `arreglo.como` dice quién puede hacerlo:
  //   'solo'    lo hace la barra de un clic
  //   'agente'  se lo pedimos al asistente, con el encargo escrito
  //   'persona' solo puede hacerlo quien está delante del ordenador
  //
  // Y un 'solo' que cambia algo en la carpeta dice además una de dos (P9,
  // decisión 142; ver `solo.js`): `alAbrir: true`, y la barra lo hace al abrir
  // la carpeta sin esperar a nadie; o `retiene`, con el caso de P9 que pide el sí
  // de esa persona. Los que solo llevan a otra pantalla no dicen nada.
  //
  // ── Lo que falta no siempre está roto (decisión 164) ──────────────────
  //
  // Una carpeta recién montada no tiene conexiones, ni conocimiento, ni copia
  // fuera: es lo normal el primer día, y llega con el trabajo. Esas piezas
  // llevan `porHacer: true`. Siguen saliendo en esta lista, con su marca y su
  // botón, pero no son «algo roto»: al terminar de montar no se enseña la lista
  // por ellas, se va a la principal (`algoRoto`, abajo).
  const conArreglo = (pieza, arreglo) => (pieza.estado === 'si' || pieza.estado === 'noAplica' || !arreglo
    ? pieza
    : { ...pieza, arreglo });

  // Un encargo de `encargos.js` puesto en la forma que entiende la pantalla.
  // `comprobar` no viaja: es una función, y al otro lado hay un navegador.
  const comoEncargo = (encargo) => (encargo
    ? { como: 'agente', etiqueta: encargo.etiqueta, accion: { tipo: 'pedir', prompt: encargo.prompt } }
    : null);

  // Cuándo se aceptó el plan de montaje. RSC lo deja en `.rsc.json`
  // (`onboarding.acceptedAt`) y no se enseñaba: «Listo» no dice desde cuándo.
  const montadoEl = fechaDelPlan();

  // `estado` es 'si' | 'no' | 'aMedias' | 'noAplica', y de ahí sale cómo se pinta.
  const piezas = [
    conArreglo({
      nombre: 'El asistente, montado aquí',
      estado: hay.tipo === 'conArnes' ? 'si' : hay.tipo === 'aMedias' ? 'aMedias' : 'no',
      // «Listo» solo cuando el arnés también lo daría por listo (G7): con los
      // innegociables por escribir está montado, y lo que falta va en su pieza.
      detalle: hay.tipo === 'conArnes'
        ? `${proyecto.faltanLosInnegociables() ? 'Montado' : 'Listo'}${montadoEl ? `, desde el ${montadoEl}` : ''}`
        : hay.tipo === 'aMedias' ? 'Se quedó a medias' : 'Todavía no',
    // A medias, terminarlo es seguir con lo que ya contestó: se hace solo. Sin
    // nada montado, prepararla pide sus respuestas.
    }, { como: 'solo', etiqueta: 'Terminar de prepararlo', accion: { tipo: 'arrancar' }, ...(hay.tipo === 'aMedias' ? { alAbrir: true } : { retiene: 'loDecide' }) }),
    conArreglo({
      nombre: 'Tu asistente',
      estado: loTiene ? 'si' : 'no',
      detalle: loTiene
        ? conQuien.nombre
        : `${conQuien ? conQuien.nombre : 'Ninguno'}, y no lo tienes puesto en este ordenador`,
    }, { como: 'persona', etiqueta: 'Ver tu asistente', accion: { tipo: 'verAsistente' } }),
    // Abrir cada conversación con lo suyo, los frenos, la memoria: con Claude
    // son enganches que arrancan con `node`, y sin ninguno no corre nada sin
    // que nada lo diga. Con Codex no hay enganches, y la línea no sale.
    ...(conEnganches ? [conArreglo({
      nombre: 'Lo que el arnés hace solo',
      estado: tarde ? 'aMedias' : (arrancan ? 'si' : 'no'),
      detalle: tarde ? (asistentes.paraQueLoCoja(donde.paraQuien()) || 'Cierra la conversación con Claude y ábrela otra vez para que lo coja.') : (arrancan ? 'Listo' : 'No arranca en este ordenador'),
    }, { como: 'solo', etiqueta: 'Arreglarlo', accion: { tipo: 'arreglarElRelevo' }, alAbrir: true })] : []),
    // ── Lo que cuelga del arnés, mientras no hay arnés ────────────────────
    //
    // Sin arnés montado, «no tienes conexiones» y «no ha aprendido nada» no son
    // cosas que falten: son cosas que todavía no aplican. Marcarlas en rojo con
    // un botón que lleva a una pantalla vacía es ruido, y esconde la única que
    // importa, que es montar el arnés. `noAplica` no pide arreglo.
    conArreglo({
      nombre: 'Conexiones con tus herramientas',
      estado: !conArnes ? 'noAplica' : (!proveedores.length ? 'no' : (aMedias ? 'aMedias' : 'si')),
      detalle: !conArnes ? 'Cuando esté montado' : (!proveedores.length
        ? 'Ninguna todavía'
        : `${proveedores.length}${aMedias ? `, y ${aMedias} sin terminar` : ''}`),
      // Qué conectar lo decide su negocio, y una a medias ya la dice la tarjeta.
      porHacer: true,
    }, { como: 'solo', etiqueta: 'Ver tus conexiones', accion: { tipo: 'verConexiones' } }),
    // El encargo ya estaba escrito en `sueltas.js` y **solo se podía lanzar
    // desde la pantalla de conexiones, que exige arnés montado**. O sea: justo
    // en el momento en que se avisa, no había nada que pulsar.
    conArreglo({
      nombre: 'Claves que ya tenías, fuera de sitio',
      estado: fuera ? 'aMedias' : 'si',
      detalle: fuera
        ? `${fuera.claves === 1 ? '1 clave' : `${fuera.claves} claves`} en ${fuera.sitios === 1 ? 'un sitio' : `${fuera.sitios} sitios`}; el asistente puede ${fuera.claves === 1 ? 'ordenarla' : 'ordenarlas'}`
        : 'Nada suelto',
      // Eran suyas antes del arnés, y ordenarlas ya va en el primer mensaje.
      porHacer: true,
    }, comoEncargo(encargos.ordenarLasClaves())),
    conArreglo({
      nombre: 'Conocimiento',
      estado: !conArnes ? 'noAplica' : (temas ? 'si' : 'no'),
      detalle: !conArnes ? 'Cuando esté montado' : (temas ? `${temas} ${temas === 1 ? 'tema' : 'temas'}` : 'Todavía no ha aprendido nada'),
      porHacer: true,
    }, { como: 'solo', etiqueta: 'Darle documentos (inbox)', accion: { tipo: 'verPapeles' } }),
    // Los botones solo son una pieza que falta si ese asistente llega a
    // tenerlos: una cruz permanente no es información, es un reproche por algo
    // que no se puede arreglar. Con Claude y con Codex salen de sus habilidades
    // (decisión 141); con otros, de sus comandos; si no puede haberlos, esta
    // línea no sale.
    ...(donde.puedeTenerBotones() ? [conArreglo({
      nombre: 'Habilidades con botón',
      estado: !conArnes ? 'noAplica' : (botones ? 'si' : 'no'),
      detalle: !conArnes ? 'Cuando esté montado' : (botones ? `${botones}` : 'Ninguno todavía'),
      porHacer: true,
    }, { como: 'solo', etiqueta: 'Ver los que hay', accion: { tipo: 'verSaberes' } })] : []),
    // Con el arnés puesto y sin historial en la carpeta no hay copias, aunque
    // lo demás esté entero: pasa cuando se eligió seguir sin ellas (B3), y
    // decía «Listas» (B7). Se ofrecen, con su botón.
    (conArnes && !conHistorial
      ? {
        nombre: 'Copias de seguridad aquí',
        estado: 'no',
        // «Porque lo elegiste», solo a quien lo eligió: salía siempre que faltaba
        // git (revisión de F2, m12).
        detalle: sigueSinCopias ? 'Sin copias, porque lo elegiste' : 'Todavía sin copias',
        // Si eligió seguir sin copias, es suyo. Si no, se ponen solas: lo pesado ya
        // se queda fuera de la copia, y con demasiado peso nuevo no se guarda
        // (decisión 147, `guardar.js`).
        arreglo: { como: 'solo', etiqueta: 'Ponerlas ahora', accion: { tipo: 'ponerCopias' }, ...(sigueSinCopias ? { retiene: 'loDecide' } : { alAbrir: true }) },
        // Lo que eligió no está roto; lo que tenía que salir solo y no salió, sí.
        ...(sigueSinCopias ? { porHacer: true } : {}),
      }
      : conArreglo({
        nombre: 'Copias de seguridad aquí',
        estado: hay.tipo === 'empezada' && hay.conHistorial ? 'si' : (conArnes ? 'si' : 'no'),
        detalle: hay.tipo === 'empezada' && hay.conHistorial
          ? 'Ya tenías un historial tuyo; no lo toco'
          : (conArnes ? 'Listas' : 'Cuando prepares la carpeta'),
      }, { como: 'solo', etiqueta: 'Preparar esta carpeta', accion: { tipo: 'arrancar' }, retiene: 'loDecide' })),
    conArreglo({
      nombre: 'Copias fuera de este ordenador',
      estado: cuenta.conectado ? 'si' : 'no',
      detalle: cuenta.conectado
        ? `Dentro${cuenta.usuario ? ` como ${cuenta.usuario}` : ''}${cuenta.remoto && cuenta.remoto.esGitHub ? ` · ${cuenta.remoto.corto}` : ''}`
        : 'Aún no has entrado en tu cuenta',
      // La cuenta es suya, y si la deja para más tarde, la tiene en Sugerencias.
      porHacer: true,
    }, { como: 'persona', etiqueta: 'Guardar fuera de aquí', accion: { tipo: 'verCopiaFuera' } }),
  ];


  // Los innegociables que pide el plan. Con la cadena SDD, RSC los exige y
  // `onboard` no los escribe: los escribe el asistente con quien lleva el
  // proyecto, así que el botón se lo pide (A3 de la auditoría todo-cuadra).
  // Hasta ahora, aquí salía «Listo» y RSC decía «incompleto».
  if (conArnes && proyecto.faltanLosInnegociables()) {
    piezas.push({
      nombre: 'Innegociables',
      estado: 'no',
      detalle: 'Faltan, y el arnés los pide para lo que vas a construir',
      arreglo: comoEncargo(encargos.levantarElSuelo([proyecto.INNEGOCIABLES.join('/')])),
    });
  }

  // El freno propio, pendiente (C1, C-4). En una carpeta cuyo historial no creó
  // la barra, reponer los raíles no lo engancha solo, porque toca sus ajustes:
  // se ofrece aquí, con su botón. Si el de RSC está puesto, ya frena ese.
  // Si la persona lo apagó, o su perfil dice que es técnica —y entonces no frena—,
  // no se ofrece (revisión de F3, M3).
  const apagadoOTecnico = proyecto.existe('.rsc', '.no-danger-guard') || require('./trato').comoEstamos().palabras === 'technical';
  if (conArnes && donde.puedeTenerFrenos() && parte.railes.habilidadPropia && !apagadoOTecnico) {
    const freno = comoEstaElFreno();
    if (!freno.nuestro && !freno.deRsc) {
      piezas.push({
        nombre: 'Freno ante órdenes peligrosas',
        estado: 'no',
        detalle: 'Todavía no: toca los ajustes de Claude de esta carpeta',
        // Toca los ajustes de una carpeta que ya era suya: P4 y C-4.
        arreglo: { como: 'solo', etiqueta: 'Ponerlo ahora', accion: { tipo: 'ponerElFreno' }, retiene: 'loDecide' },
      });
    }
  }

  // En una carpeta de alguien, lo que la barra no hace sola (decisión 177): cada
  // cosa con su botón y su «Ahora no», y una vez dicho que no, no vuelve. Qué se
  // ofrece y cómo se hace, en `de-alguien.js`.
  if (conArnes) {
    for (const p of await piezasDeAlguien(asistentes)) piezas.push(p);
  }

  // Lo que el repositorio declara y no está en esta máquina. Es lo que RSC
  // llama «what a fresh clone looks like», y hasta ahora se veía como un arnés
  // sano: la barra pintaba botones que no respondían.
  if (parte.habilidades.colgando.length) {
    piezas.push({
      nombre: 'Lo que esta carpeta traía puesto',
      estado: 'no',
      detalle: `${parte.habilidades.colgando.length} ${parte.habilidades.colgando.length === 1 ? 'cosa declarada que no está' : 'cosas declaradas que no están'} en este ordenador`,
      arreglo: { como: 'solo', etiqueta: 'Traerlo ahora', accion: { tipo: 'arrancar' }, alAbrir: true },
    });
  }

  // Una carpeta que ya era de alguien y de la que el asistente no sabe nada.
  // No es un fallo: es trabajo por hacer, y no lo puede hacer la barra.
  if (hay.tipo === 'empezada' && !temas) {
    piezas.push({
      nombre: 'Lo que ya había aquí',
      estado: 'no',
      detalle: 'El asistente todavía no lo ha mirado',
      arreglo: comoEncargo(encargos.ordenarLaCarpeta(parte)),
      porHacer: true,
    });
  }

  // ── La versión del arnés de esta carpeta ──────────────────────────────
  //
  // No es una curiosidad: la barra lleva un arnés dentro y lo ejecuta **sea
  // cual sea** el que diga la carpeta. Cuando la barra sube de versión mayor,
  // todas las carpetas montadas antes se quedan con su declaración vieja y
  // pasan a correr un arnés más nuevo contra una instalación más vieja.
  //
  // RSC sabe reconciliarlo —`sync` reconstruye desde el plan aceptado— pero no
  // lo hace solo, y mientras tanto lo declarado y lo instalado no cuadran. Así
  // que se dice, con el botón que lo arregla.
  if (conArnes) {
    const suya = proyecto.versionDelCatalogo();
    const nuestra = rsc.VERSION_DE_RESPALDO;
    const relacion = rsc.comoEsLaVersion(suya);
    // Por delante de la barra (P7, decisión 145): está al día. La barra trabaja
    // ahí con la versión de la carpeta (`rsc.correr`) y no ofrece bajarla, que
    // es lo contrario de lo que hizo la clase.
    if (relacion === 'nueva') {
      piezas.push({
        nombre: 'La versión del arnés',
        estado: 'si',
        detalle: `${suya}, más nueva que la de la barra`,
      });
    } else {
      const alDia = !suya || relacion === 'igual';
      piezas.push({
        nombre: 'La versión del arnés',
        estado: alDia ? 'si' : 'aMedias',
        detalle: alDia ? (suya || 'la que trae la barra') : `${suya}, y la barra ya trae la ${nuestra}`,
        ...(alDia ? {} : { arreglo: { como: 'solo', etiqueta: 'Ponerlo al día', accion: { tipo: 'arrancar' }, alAbrir: true } }),
      });
    }
  }

  // ── La última revisión que hizo el asistente ──────────────────────────
  //
  // `rsc audit` deja un informe entero en HTML en `02-DOCS/audits/`: qué stack
  // hay, qué herramientas convendría crear, qué carpetas heredadas quedan. Lo
  // escribe y no lo abría nadie — la barra ni sabía que existía (auditoría del
  // mapeo, 22-09-2026). Y el aviso que lo pide ya se nombra en Las reglas,
  // como «La revisión periódica de habilidades»: faltaba la otra punta.
  if (conArnes) {
    const ultima = laUltimaRevision();
    if (ultima) {
      piezas.push({
        nombre: 'La última revisión del asistente',
        estado: 'si',
        detalle: ultima.cuando,
        arreglo: { como: 'solo', etiqueta: 'Abrir la revisión', accion: { tipo: 'abrirRevision', fichero: ultima.fichero } },
      });
    }
  }

  // ── El plan con el que se montó ───────────────────────────────────────
  //
  // RSC deja escrito qué instaló y por qué en `installation-plan.md`, y en
  // `.rsc.json` cuándo se aceptó. Ninguno se enseñaba: quien quería saber
  // «¿por qué tengo esto puesto?» no tenía dónde mirar (decisión 102). Se
  // pide a `reglas.js` en el momento, como el resto de lo que abre ficheros.
  if (conArnes && require('./reglas').dondeVive('plan')) {
    piezas.push({
      nombre: 'El plan de montaje',
      estado: 'si',
      detalle: montadoEl ? `Aceptado el ${montadoEl}` : 'Escrito',
      arreglo: { como: 'solo', etiqueta: 'Ver el plan de montaje', accion: { tipo: 'abrirReglas', cual: 'plan' } },
    });
  }

  // ── Lo que aquí se decidió no usar ────────────────────────────────────
  //
  // Lo que quien montó esto apagó a propósito: `optOuts` de `.rsc.json` y los
  // interruptores `.rsc/.no-*`, unidos y nombrados en español por `reglas.js`.
  // Es lo que explica que un guardián figure como apagado en Las reglas. No es
  // un fallo, así que no pide arreglo.
  if (conArnes) {
    const apagado = require('./reglas').loApagado();
    if (apagado.length) {
      piezas.push({
        nombre: 'Lo que tiene apagado',
        estado: 'noAplica',
        detalle: apagado.map((a) => a.nombre).join(' · '),
      });
    }
  }

  // ── Lo que el arnés dice de sí mismo, y que se pedía para tirarlo ─────
  //
  // `reconocer({profundo:true})` lanza TRES procesos —`doctor --json`,
  // `repair --dry-run` y `reassess`— y hasta hoy esta pantalla leía uno. Los
  // otros dos se calculaban, se guardaban y no los miraba nadie.
  //
  // No era solo gasto. Era que esta pantalla podía decir **«no falta nada»**
  // teniendo el arnés roto, porque la única fuente que lo sabía —`repair`— se
  // estaba tirando. Una pantalla que se llama «Qué falta por montar» y que no
  // mira lo que el propio arnés dice que le falta no está diagnosticando.
  if (conArnes && aFondo) {
    // 1. Lo que el arnés declara y no está en disco. Con esto en rojo, la
    //    barra pinta botones que no responden.
    const falta = rsc.queFaltaEnDisco(aFondo.salud);
    if (falta && falta.length) {
      piezas.push({
        nombre: 'Lo que debería estar puesto',
        estado: 'no',
        // Por sus nombres, no por lo que escribe el arnés (G3).
        detalle: `${falta.length} ${falta.length === 1 ? 'cosa declarada que no está' : 'cosas declaradas que no están'}: ${falta.slice(0, 3).map((f) => `«${require('./nombres').comoSeLlama({ habilidad: 'habilidades', agente: 'ayudantes', comando: 'comandos' }[f.que], f.id, {}).nombre}»`).join(', ')}`, // diccionario: interno
        // `repair` sin `--yes` aplica lo que restaura y deja pendiente lo que hay
        // que decidir, y antes guarda copia (`scripts/lib/repair.js`). Lo único
        // que crearía de nuevo es `.rsc.json`, y esta pieza solo sale con él puesto.
        arreglo: { como: 'solo', etiqueta: 'Traerlas ahora', accion: { tipo: 'arreglar' }, alAbrir: true },
      });
    }

    // 2. Lo que `repair` encuentra. Se separa lo que sabe arreglar solo de lo
    //    que hace falta decidir: `repair --yes` a ciegas aplicaría también los
    //    `[ask]`, y uno de ellos mueve el arnés a otro asistente.
    const roto = aFondo.reparaciones;
    if (roto && roto.sabemos && !roto.sano) {
      const soloFix = roto.solas.length && !roto.aDecidir.length;
      piezas.push({
        nombre: 'Cosas del arnés fuera de sitio',
        estado: 'aMedias',
        detalle: roto.aDecidir.length
          ? `${roto.solas.length + roto.aDecidir.length} ${roto.solas.length + roto.aDecidir.length === 1 ? 'cosa' : 'cosas'}, y ${roto.aDecidir.length} ${roto.aDecidir.length === 1 ? 'necesita' : 'necesitan'} que alguien decida`
          : (roto.solas.length === 1 ? '1 cosa, y se arregla sola' : `${roto.solas.length} cosas, y se arreglan solas`),
        arreglo: soloFix
          ? { como: 'solo', etiqueta: 'Arreglarlo ahora', accion: { tipo: 'arreglar' }, alAbrir: true }
          : { como: 'persona', etiqueta: 'Ver qué pasa', accion: { tipo: 'algoVaMal' } },
      });
    }

    // 3. Las copias que guarda el propio arnés antes de tocar nada. No son las
    //    de git, y son la vuelta atrás de un montaje que salió mal: existían
    //    desde siempre y no se veían por ningún lado.
    const suyas = rsc.queCopiasDelArnes(aFondo.salud);
    if (suyas) {
      piezas.push({
        nombre: 'Copias que guarda el arnés',
        estado: suyas.hay && suyas.cuantas ? 'si' : 'noAplica',
        detalle: suyas.hay && suyas.cuantas
          ? `${suyas.cuantas}, la última antes del montaje de ahora`
          : 'Todavía ninguna. Se guarda una antes de cada cambio del arnés',
      });
    }
  }

  // ── Lo que el arnés aplazó y hoy ya encajaría ─────────────────────────
  //
  // Cuando se monta, RSC decide qué instala y qué aplaza mirando lo que hay en
  // la carpeta **ese día**, y congela esa foto. Un proyecto que crece deja esa
  // foto atrás: el de aquí se decidió sobre 14 ficheros.
  //
  // `reassess` compara y recomienda, y no escribe nada — aceptar un plan nuevo
  // lo hace una persona, por su huella. Así que esto no ofrece un botón que
  // aplique: ofrece uno que lo cuente en cristiano y lo proponga.
  if (aFondo && aFondo.recomendaciones && aFondo.recomendaciones.length) {
    piezas.push({
      nombre: 'Lo que el arnés dejó para más adelante',
      estado: 'aMedias',
      detalle: aFondo.recomendaciones.length === 1
        ? '1 cosa que se aplazó al montarlo y hoy ya encaja'
        : `${aFondo.recomendaciones.length} cosas que se aplazaron al montarlo y hoy ya encajan`,
      arreglo: comoEncargo(encargos.reajustar(aFondo.recomendaciones)),
      // Una propuesta del arnés, no una avería: aceptarla lo decide una persona.
      porHacer: true,
    });
  }

  // Con el fichero de la declaración ilegible no se ofrece tocar nada: cada
  // botón que llevara a montar acabaría en un «no voy a tocar nada», y volver a
  // ofrecerlo es prometer algo que no va a pasar.
  if (parte.estado === 'reciboRoto') {
    return {
      queEs: hay.tipo,
      listo: false,
      algoRoto: true,
      piezas: [{
        nombre: 'El fichero que dice cómo está montado esto',
        estado: 'no',
        detalle: 'No se puede leer. Suele ser un conflicto sin resolver, y no lo voy a tocar. Pulsa «Algo va mal» y pásale el código a tu tutor.',
        arreglo: { como: 'persona', etiqueta: 'Algo va mal', accion: { tipo: 'algoVaMal' } },
      }],
    };
  }

  // Y lo nuestro, que es otra capa: un arnés puede estar entero para RSC y no
  // tener nada de la barra.
  if (conArnes) {
    const railes = parte.railes.habilidadPropia && parte.railes.nombres;
    // Puestos pero viejos es un tercer estado, y el que más engaña: se ve
    // igual que «Puesto» y el asistente está leyendo las reglas de otro día.
    const viejos = railes && !parte.railes.alDia;
    // Y sin lo que vale siempre donde lo lee cada asistente (D1): en una carpeta
    // cuyo historial no creó la barra, reponer los raíles no lo pone sin su sí
    // (C-4), y el botón lo pregunta. Con Claude y con los demás (revisión de F4,
    // m6).
    const sinBloque = railes && !viejos && !tieneElBloque();
    const bien = railes && !viejos && !sinBloque;
    piezas.push({
      nombre: 'Lo que pone la barra',
      estado: bien ? 'si' : 'aMedias',
      detalle: viejos
        ? 'Puesto, pero de una versión anterior de la barra'
        : (bien ? 'Puesto' : 'Falta ajustarlo a esta carpeta'),
      ...(bien ? {} : {
        arreglo: {
          como: 'solo',
          etiqueta: viejos ? 'Ponerlo al día' : 'Ajustarlo ahora',
          accion: viejos ? { tipo: 'ponerLosRailesAlDia' } : (sinBloque ? { tipo: 'ponerElBloque' } : { tipo: 'arrancar' }),
          // Al día, solos (decisión 108); el bloque toca un fichero suyo (C-4).
          ...(sinBloque ? { retiene: 'loDecide' } : { alAbrir: true }),
        },
      }),
    });
  }

  return { queEs: hay.tipo, piezas, listo: piezas.every((p) => p.estado === 'si' || p.estado === 'noAplica'), algoRoto: hayAlgoRoto(piezas) };
}

// Si hay algo roto de verdad (decisión 164): una pieza que falta o está a medias
// y que no es lo que llega con el trabajo (`porHacer`). Es lo único que hace
// enseñar la lista al terminar de montar; lo demás, a la principal.
const hayAlgoRoto = (piezas = []) => piezas.some((p) => (p.estado === 'no' || p.estado === 'aMedias') && !p.porHacer);

// Si el `CLAUDE.md` de la carpeta ya trae nuestro bloque, el que importa
// `siempre.md` en cada conversación.
// Lo de siempre, puesto para todos los declarados: el bloque de `CLAUDE.md` con
// Claude, y el trozo de su fichero con los demás (revisión de F4, m6). Y el de lo
// que no entra en git (F1).
function loQueFaltaPorPoner() {
  const falta = [];
  if (!loDeSiempreDeCadaUno().every(({ bloque }) => Boolean(bloque) && NOMBRA_SIEMPRE.test(bloque[0]))) falta.push('Cómo se trabaja aquí');
  if (!elDeGit()) falta.push('la lista de lo que no entra en git');
  return falta;
}

const tieneElBloque = () => loQueFaltaPorPoner().length === 0;

// Lo que se ofrece hoy en una carpeta de alguien (decisión 177), mirado ahora: lo
// usan la pantalla y, otra vez, cada botón antes de actuar.
async function laOfertaDeAlguien(asistentes = require('./asistentes')) {
  const deAlguien = require('./de-alguien');
  const arrancar = require('./arrancar');
  const codex = asistentes.porId('codex');
  const conCodex = asistentes.estaInstalado(codex) || asistentes.losDelArnes().includes(codex);
  return deAlguien.queSeOfrece({
    raiz: proyecto.raiz(),
    memoria: estadoDeLaCarpeta,
    aqui: await montadaAqui(),
    estaEnGit: arrancar.estaEnGitConLaBarra,
    git: procesos.git,
    conCodex,
  });
}

// Las piezas de la 177. Nada si la carpeta es de la barra, o no se puede mirar.
async function piezasDeAlguien(asistentes) {
  try {
    const retirados = require('./retirados');
    const oferta = await laOfertaDeAlguien(asistentes);
    const ahoraNo = (cual) => ({ etiqueta: 'Ahora no', accion: { tipo: 'noOfrecerMas', cual } });
    const piezas = [];

    // Lo que apagó una barra de antes: solo lo que se ve apagado, por su nombre.
    if (oferta.marcas) {
      const ids = { '.no-audit': ['audit'], '.no-worktree-cleanup': ['worktree-reaper'], '.no-gitmoji': ['gitmoji-guard'] };
      const quePide = new Set(oferta.marcas.marcas.flatMap((m) => ids[m] || []));
      const nombres = require('./reglas').loApagado().filter((a) => quePide.has(a.id)).map((a) => a.nombre);
      if (nombres.length) {
        piezas.push({
          nombre: 'Lo que apagó una versión anterior de la barra',
          estado: 'no',
          detalle: nombres.join(' · '),
          porHacer: true,
          arreglo: { como: 'solo', etiqueta: 'Volver a encenderlo', accion: { tipo: 'volverAEncender' }, retiene: 'loDecide' },
          ahoraNo: ahoraNo('marcas'),
        });
      }
    }

    if (oferta.claude) {
      const { idioma, preguntar } = oferta.claude;
      const cosas = [idioma ? 'que te hable en español' : null, preguntar ? 'que pregunte antes de subir' : null].filter(Boolean);
      const etiqueta = idioma && preguntar ? 'Que Claude me hable en español y pregunte antes de subir'
        : (idioma ? 'Que Claude me hable en español' : 'Que Claude pregunte antes de subir');
      piezas.push({
        nombre: 'Claude, a tu manera',
        estado: 'no',
        detalle: `Todavía no: ${cosas.join(' y ')}. Esta carpeta ya era de alguien, y esto toca tus ajustes de Claude en ella.`,
        porHacer: true,
        arreglo: { como: 'solo', etiqueta, accion: { tipo: 'ponerLoDeClaudeAqui' }, retiene: 'loDecide' },
        ahoraNo: ahoraNo('claude'),
      });
    }

    if (oferta.codex) {
      const filas = (retirados.leerLaTabla() || {}).codex || [];
      const nombres = oferta.codex.modelos.map((id) => (filas.find((f) => f && f.id === id) || {}).nombre || id);
      piezas.push({
        nombre: 'La versión de Codex',
        estado: 'no',
        detalle: `Esta carpeta tiene elegida una versión que ya no existe (${nombres.join(', ')}), y Codex no contesta.`,
        porHacer: true,
        arreglo: { como: 'solo', etiqueta: 'Arreglar el modelo de Codex', accion: { tipo: 'arreglarCodexAqui' }, retiene: 'loDecide' },
        ahoraNo: ahoraNo('codex'),
      });
    }
    return piezas;
  } catch {
    return [];
  }
}

// Qué freno ante órdenes peligrosas está enganchado aquí: el nuestro (los
// raíles), el de RSC (cuando el plan practica la cadena SDD), los dos o ninguno.
function comoEstaElFreno() {
  let ajustes = '';
  try {
    ajustes = fs.readFileSync(proyecto.ruta('.claude', 'settings.json'), 'utf8');
  } catch {
    // sin ajustes, sin frenos
  }
  return {
    // Enganchados de verdad antes de cada orden de Bash, como en «Las reglas»
    // (revisión final, crítico).
    nuestro: require('./reglas').enganchadoAntesDeBash(ajustes, '/executive-lab/freno.mjs'),
    deRsc: require('./reglas').enganchadoAntesDeBash(ajustes, '.rsc/danger-guard.') && proyecto.existe('.rsc', 'danger-guard.mjs'),
  };
}

// Si esta carpeta tiene enganches que arrancan con `node`: los de Claude, en
// `.claude/settings.json`. RSC no escribe ninguno para Codex.
const ORDEN_CON_NODE = /^(?:node|"[^"]*node(?:\.exe)?"|\S*[\\/]node(?:\.exe)?)\s/i;

function hayEnganchesConNode() {
  let datos;
  try {
    datos = JSON.parse(fs.readFileSync(proyecto.ruta('.claude', 'settings.json'), 'utf8'));
  } catch {
    return false;
  }
  const ordenes = [];
  const recorrer = (nodo) => {
    if (Array.isArray(nodo)) return nodo.forEach(recorrer);
    if (!nodo || typeof nodo !== 'object') return undefined;
    if (typeof nodo.command === 'string') ordenes.push(nodo.command.trim());
    return Object.values(nodo).forEach(recorrer);
  };
  recorrer(datos && datos.hooks);
  return ordenes.some((o) => ORDEN_CON_NODE.test(o));
}

// La revisión más reciente de `02-DOCS/audits/`. RSC las nombra
// `audit-AAAA-MM-DD-HHMM.html`, así que la más nueva es la última por nombre.
const REVISIONES = ['02-DOCS', 'audits'];

function laUltimaRevision() {
  const carpeta = proyecto.ruta(...REVISIONES);
  if (!carpeta || !fs.existsSync(carpeta)) return null;
  let cual;
  try {
    cual = fs.readdirSync(carpeta).filter((n) => n.endsWith('.html')).sort().pop();
  } catch {
    return null;
  }
  if (!cual) return null;

  // La fecha va en el nombre; si no se puede leer, se dice lo que se sabe.
  const partes = cual.match(/(\d{4})-(\d{2})-(\d{2})/);
  const cuando = partes
    ? new Date(`${partes[1]}-${partes[2]}-${partes[3]}T00:00:00`).toLocaleDateString('es-ES', { day: 'numeric', month: 'long' })
    : 'sin fecha';
  return { fichero: cual, cuando: partes ? `Del ${cuando}` : 'Escrita' };
}

// Abrirla. El nombre viene de un mensaje del panel, así que se comprueba que
// sigue siendo de ahí dentro y que es un `.html`.
function dondeViveLaRevision(fichero) {
  const carpeta = proyecto.ruta(...REVISIONES);
  if (!carpeta || typeof fichero !== 'string') return null;
  const completa = path.resolve(carpeta, fichero);
  const dentro = path.resolve(carpeta) + path.sep;
  if (!completa.startsWith(dentro) || !completa.endsWith('.html')) return null;
  return fs.existsSync(completa) ? completa : null;
}

// La fecha en que se aceptó el plan de montaje, dicha como se dice: «18 de
// septiembre». Sin recibo, o con una fecha ilegible, no se inventa nada.
function fechaDelPlan() {
  const declaracion = proyecto.declaracion();
  const cuando = declaracion && declaracion.onboarding && declaracion.onboarding.acceptedAt;
  const fecha = new Date(cuando || NaN);
  if (Number.isNaN(fecha.getTime())) return null;
  return fecha.toLocaleDateString('es-ES', { day: 'numeric', month: 'long' });
}

module.exports = {
  queCarpetaEs, comoEsEstaCarpeta, queHayEncima, MARCA_DEL_HISTORIAL,
  queHay, reconocer, mirarYClasificar, podemosGuardarElPuntoDePartida, podemosGuardarSolo, radiografia, hayAlgoRoto, fechaDelPlan,
  laOfertaDeAlguien, montadaAqui, recordarQueSeMontoAqui, saberDondeRecordar, CLAVE_MONTADA_AQUI,
  laUltimaRevision, dondeViveLaRevision, comoEstanLosRailes, saberDondeEstamos, comoEstaElFreno, tieneTexto, tieneElBloque, loQueFaltaPorPoner,
};
