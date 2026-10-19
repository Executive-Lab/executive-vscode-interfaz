// Claves que viven fuera de sitio — y a dónde va cada una.
//
// ── El sitio de una clave lo define RSC ──────────────────────────────────
//
// `skills/harness` y su plantilla `_TEMPLATE`: **una carpeta por proveedor en
// `01-TOOLS/`**, con su `.env` (los valores reales, que RSC nunca escribe), su
// `.env.example` (los nombres), `CREDENTIALS.md` (dónde se saca cada una) y
// `test_connection`. Y las variables se llaman `<HERRAMIENTA>_<NOMBRE>`. Ese
// es el sitio. Todo lo demás está fuera de sitio.
//
// ── Lo que pasaba ────────────────────────────────────────────────────────
//
// Jose, 21-09-2026, con una captura de un proyecto suyo: las claves estaban en
// un `.env.local` de la raíz —Replicate, Pexels, Buffer, Drive y Telegram, todas
// juntas— y en un `.env.local` dentro de la carpeta de una herramienta. Esto
// solo contaba ficheros en la raíz, así que la barra enseñaba herramientas «sin
// conectar» que funcionaban, y proveedores enteros que no salían por ningún
// lado. *«Hay que conseguir un mapeo muy bueno con las posibilidades de RSC»*.
//
// ── Lo que hace ahora: inventariar y repartir ────────────────────────────
//
// 1. Encuentra todos los ficheros de claves: los `.env*` de la raíz, los de
//    las carpetas de primer nivel, los de `config/`, `credentials/`…, y dentro
//    de cada herramienta los que NO son su `.env` (un `.env.local` ahí también
//    está fuera de sitio: la barra y la prueba de conexión leen `.env`). Los de
//    una carpeta que es una aplicación no: esos están en su sitio.
// 2. Lee los NOMBRES de las claves, nunca los valores. Los valores no salen de
//    su fichero ni para el asistente.
// 3. Reparte: a qué herramienta va cada clave. Primero, porque una herramienta
//    ya la espera en su `.env.example`; si no, por el prefijo `<HERRAMIENTA>_`
//    —que es la convención de RSC—, saltando los prefijos del framework
//    (`NEXT_PUBLIC_`, `VITE_`…). Lo que no tiene dueño claro (`TOKEN`, `PORT`)
//    se le pregunta al asistente, no se adivina.
// 4. El encargo al asistente lleva ese plan hecho, clave por clave. Mover
//    credenciales sin romper lo que las leía sigue siendo cosa suya.

const fs = require('node:fs');
const path = require('node:path');
const proyecto = require('./proyecto');
const lecturas = require('./lecturas');
const entorno = require('./entorno');
const limpio = require('./limpio');
const subproyectos = require('./subproyectos');

const HERRAMIENTAS = '01-TOOLS';

// Ficheros de claves. Los de ejemplo no llevan valores y no cuentan.
const ES_DE_CLAVES = /^(\.env(\..+)?|env|\.envrc)$/;
const ES_EJEMPLO = /\.(example|sample|template|dist)$/i;
const CARPETAS = ['config', 'credentials', 'secrets', 'env'];
const NO_SE_MIRA = new Set(['node_modules', '.git', '.venv', 'venv', 'dist', 'build', '.next', '02-DOCS', '.rsc', '.claude', '.codex', '.vscode', HERRAMIENTAS]);

// Una línea con pinta de credencial: MAYUSCULAS_CON_GUION = algo.
const PARECE_CLAVE = /^\s*(?:export\s+)?([A-Z][A-Z0-9_]{2,})\s*=\s*\S/;
// Lo mismo, sin exigir valor: es como se escriben los `.env.example`.
const PARECE_NOMBRE = /^\s*(?:export\s+)?([A-Z][A-Z0-9_]{2,})\s*=/;
const SUENA_A_SECRETO = /(KEY|SECRET|TOKEN|PASSWORD|PASSWD|CREDENTIAL|API)/;

// Prefijos que no nombran a nadie: son del framework, y el proveedor va detrás.
const PREFIJOS_HUECOS = new Set(['NEXT', 'NEXT_PUBLIC', 'VITE', 'REACT_APP', 'PUBLIC', 'EXPO_PUBLIC', 'NUXT', 'NUXT_PUBLIC', 'APP', 'MY']);
// Nombres que no dicen de quién son. Se le preguntan al asistente.
const SIN_DUENO = /^(API_KEY|API_SECRET|API_URL|API_TOKEN|TOKEN|SECRET|SECRET_KEY|KEY|PASSWORD|DATABASE_URL|DB_[A-Z_]*|PORT|PUERTO|NODE_ENV|ENV|DEBUG|HOST|URL|BASE_URL|LOG_LEVEL|TZ|LANG)$/;

const TOPE = 128 * 1024;

// ── Lo de una aplicación está en su sitio ────────────────────────────────
//
// Jose, 29-09-2026, con una captura de nexus-presupuestos: «Hay 9 claves fuera
// de sitio» — Resend, Supabase, y NEXUS y USE «por montar», que no son nadie.
// Estaban en `03-APP/.env.local`, que es donde las lee la aplicación de esa
// carpeta: Next.js carga los `.env*` de su propia carpeta y de ningún otro
// sitio. Llevarlas a `01-TOOLS` la dejaba sin arrancar.
//
// RSC ya lo tiene escrito (`skills/harness`, fase 1): una carpeta de primer
// nivel con uno de estos ficheros es un subproyecto, y lo de dentro se lee
// para detectar y NUNCA se mueve, renombra, modifica ni borra. `01-TOOLS` es
// para las herramientas del asistente; la aplicación lleva su configuración.
//
// Lo que no cambia: siguen siendo ficheros de claves. No entran en una copia y
// sus valores se tapan en lo que se enseña, y para eso está `paraProteger`,
// que sí los cuenta. Lo que cambia es que no se cuentan como desorden.
const DE_UNA_APP = ['package.json', 'pyproject.toml', 'pubspec.yaml', 'Cargo.toml', 'go.mod'];

// Y una carpeta con su propio git es un proyecto aparte (decisión 195): en un
// monorepo, `03-PROYECTOS/<proyecto>/` es un clon de su repositorio, tenga o no un
// manifiesto arriba (`apps/`, `services/`, `datos/`). Lo de dentro es suyo como lo
// de una aplicación. La raíz no cuenta: su git es el de la carpeta.
const esUnaApp = (carpetaRelativa) => (Boolean(carpetaRelativa) && subproyectos.tieneSuGit(proyecto.ruta(carpetaRelativa)))
  || DE_UNA_APP.some((f) => proyecto.existe(carpetaRelativa, f));

// Y si la carpeta entera es una aplicación (decisión 167), los ficheros de claves
// de su raíz también son suyos. La 135 solo miraba las de dentro: una web hecha
// con React, con su `package.json` y su `.env` arriba, daba «Hay 3 claves fuera de
// sitio · Que las ordene», y el encargo le pedía al asistente llevarlas a
// `01-TOOLS`, con lo que la web dejaba de encontrarlas. Solo los de la raíz: una
// carpeta de dentro sigue siendo suya o no por lo que tenga ella. Los ficheros de
// acceso de la raíz siguen contando como hasta ahora (decisión 105).
const laRaizEsUnaApp = () => esUnaApp('');

function lineasDe(fichero) {
  try {
    // Un .env de verdad no ocupa medio mega: si lo ocupa, no es un .env.
    if (fs.statSync(fichero).size > TOPE) return [];
    return fs.readFileSync(fichero, 'utf8').split('\n').filter((l) => !l.trim().startsWith('#'));
  } catch {
    return [];
  }
}

// Los nombres de las claves con valor de un fichero. Los valores se quedan en él.
function nombresDeClaves(fichero) {
  return [...new Set(lineasDe(fichero).map((l) => (l.match(PARECE_CLAVE) || [])[1]).filter(Boolean))];
}

// Los nombres que un `.env.example` espera, con valor o sin él.
function nombresEsperados(fichero) {
  return [...new Set(lineasDe(fichero).map((l) => (l.match(PARECE_NOMBRE) || [])[1]).filter(Boolean))]
    .filter((n) => !/[<{]/.test(n));
}

function mirar(rutaRelativa, encontradas) {
  if (encontradas.some((e) => e.donde === rutaRelativa)) return;
  const completa = proyecto.ruta(rutaRelativa);
  if (!completa || !fs.existsSync(completa) || !fs.statSync(completa).isFile()) return;

  const nombres = nombresDeClaves(completa);
  if (!nombres.length) return;

  encontradas.push({
    donde: rutaRelativa,
    cuantas: nombres.length,
    secretos: nombres.some((n) => SUENA_A_SECRETO.test(n)),
    nombres,
  });
}

// Las rutas relativas de aquí van siempre con «/», en cualquier sistema: se
// comparan entre sí, se le pasan a git, que contesta con «/», y se le leen al
// asistente. Con `path.join`, en Windows salían con «\» (lo cazó la máquina
// Windows de GitHub, 28-09-2026). `proyecto.ruta` las resuelve igual.
//
// Los ficheros de claves que hay en una carpeta, salvo los que se le digan.
function ficherosDeClavesEn(carpetaRelativa, salvo = []) {
  const completa = carpetaRelativa ? proyecto.ruta(carpetaRelativa) : proyecto.raiz();
  if (!completa || !fs.existsSync(completa)) return [];
  try {
    // Con tope (decisión 188), y más holgado que el de las demás carpetas: aquí se
    // busca un `.env`, y es mejor mirar de más que dejar uno sin ver.
    return lecturas.entradas(completa, 20000).map((e) => e.name)
      .filter((n) => ES_DE_CLAVES.test(n) && !ES_EJEMPLO.test(n) && !salvo.includes(n))
      .map((n) => (carpetaRelativa ? path.posix.join(carpetaRelativa, n) : n));
  } catch {
    return [];
  }
}

// Las herramientas que hay montadas y qué claves espera cada una.
function herramientas() {
  const base = proyecto.ruta(HERRAMIENTAS);
  if (!base || !fs.existsSync(base)) return [];
  try {
    return lecturas.entradas(base)
      .filter((e) => e.isDirectory() && !e.name.startsWith('_') && !e.name.startsWith('.'))
      .map((e) => ({ id: e.name, esperadas: nombresEsperados(path.join(base, e.name, '.env.example')) }));
  } catch {
    return [];
  }
}

// Devuelve los sitios con claves que están fuera de su sitio. Vacío si el
// proyecto ya está ordenado, que es el caso normal cuando el arnés se montó
// desde cero. Con `conLasDeLasApps`, también los de las aplicaciones: están en
// su sitio, pero son claves igual (lo pide `paraProteger`).
function buscar({ conLasDeLasApps = false } = {}) {
  const raiz = proyecto.raiz();
  if (!raiz) return [];

  const encontradas = [];
  if (conLasDeLasApps || !laRaizEsUnaApp()) for (const fichero of ficherosDeClavesEn('')) mirar(fichero, encontradas);

  // Carpetas de primer nivel: `auto/.env`, `publicar/.env.local`… Sin bajar
  // más: lo que está más hondo es de un subproyecto y no se toca.
  let primerNivel = [];
  try {
    primerNivel = lecturas.entradas(raiz)
      .filter((e) => e.isDirectory() && !e.name.startsWith('.') && !NO_SE_MIRA.has(e.name))
      .map((e) => e.name);
  } catch { /* sin permiso para leer la raíz: se mira lo demás */ }
  for (const carpeta of [...new Set([...primerNivel, ...CARPETAS])]) {
    if (!conLasDeLasApps && esUnaApp(carpeta)) continue;
    for (const fichero of ficherosDeClavesEn(carpeta)) mirar(fichero, encontradas);
  }

  // Dentro de cada herramienta, todo lo que no sea su `.env`: un `.env.local`
  // ahí también está fuera de sitio, porque ni la barra ni la prueba de
  // conexión lo leen.
  for (const h of herramientas()) {
    for (const fichero of ficherosDeClavesEn(path.posix.join(HERRAMIENTAS, h.id), ['.env'])) mirar(fichero, encontradas);
  }

  return encontradas;
}

// ── Las credenciales que no son una línea ────────────────────────────────
//
// Una cuenta de servicio de Google o un `.pem` no es `CLAVE=valor`: es un
// fichero entero que hay que mover. Y hasta hoy la barra no los miraba, así
// que un Drive conectado con cuenta de servicio salía «sin conectar» —su
// `.env` está vacío— y el fichero que de verdad lo autentica no aparecía en
// ningún sitio. Es además la credencial más peligrosa de las dos: una cuenta
// de servicio no caduca y suele abrir un Drive entero.
//
// Su sitio en RSC es `01-TOOLS/<HERRAMIENTA>/keys/`, que la plantilla ya
// excluye de las copias (`gitignore`: `.env`, `keys/`, `out/`).
//
// OJO con las dos carpetas que se llaman igual: un `keys/` en la raíz es
// desorden; el `keys/` de dentro de una herramienta es su casa, y lo que hay
// ahí NO está fuera de sitio. Es lo único que se puede leer mal de aquí.
const POR_NOMBRE = /\.(pem|p8|p12|pfx|key|keystore|jks|ppk)$/i;
const SIN_EXTENSION = /^(id_rsa|id_ed25519|id_ecdsa|id_dsa)$/i;
// Un `.json` que no hace falta abrir: su nombre ya lo dice.
const JSON_INEQUIVOCO = /^(credentials|client_secret.*|.*service[-_]?account.*|token|serviceAccountKey|firebase-adminsdk.*)\.json$/i;
// Y lo que hay que ver dentro de cualquier otro `.json` para que cuente.
// `refresh_token` es lo que deja un inicio de sesión de OAuth (`token.json`, o el
// `authorized_user` de gcloud): sirve para sacar accesos nuevos sin volver a
// pedir nada, así que es una credencial entera (decisión 170).
const DENTRO_DE_UNA_CREDENCIAL = /"(type"\s*:\s*"service_account|private_key"|client_secret"|refresh_token")/;
const TOPE_JSON = 64 * 1024;

// De un `.json` que cuenta salen DOS campos, los dos públicos: qué es y de
// qué cuenta. El resto del contenido no cruza esta función — ni `private_key`,
// ni un trozo, ni al encargo. Es la frontera que hace esto seguro.
function loQueDeclara(fichero) {
  let cabeza;
  try {
    if (fs.statSync(fichero).size > TOPE_JSON) return null;
    cabeza = fs.readFileSync(fichero, 'utf8');
  } catch {
    // Un fichero que no se puede leer no se puede clasificar, y afirmar que es
    // una credencial sería peor que callarse. No es un fallo de la barra.
    return null;
  }
  if (!DENTRO_DE_UNA_CREDENCIAL.test(cabeza)) return null;
  const correo = (cabeza.match(/"client_email"\s*:\s*"([^"@]+@[^"]+)"/) || [])[1] || '';
  const tipo = (cabeza.match(/"type"\s*:\s*"([a-z_]+)"/) || [])[1] || '';
  return { tipo, correo };
}

// Una `.key` es una clave si lo dice lo que lleva dentro: en un Mac, las
// presentaciones de Keynote también acaban así, y quedaban fuera de las copias
// (T054). Una clave en texto empieza por `-----BEGIN`.
function esUnaClave(completa) {
  try {
    const fd = fs.openSync(completa, 'r');
    try {
      const cabeza = Buffer.alloc(64);
      const leidos = fs.readSync(fd, cabeza, 0, 64, 0);
      return /^\s*-----BEGIN /.test(cabeza.slice(0, leidos).toString('latin1'));
    } finally {
      fs.closeSync(fd);
    }
  } catch {
    return false;
  }
}

// ¿Este fichero es una credencial? Devuelve qué es, o null.
function queEs(nombre, completa) {
  if (/\.key$/i.test(nombre) && completa && !esUnaClave(completa)) return null;
  if (POR_NOMBRE.test(nombre) || SIN_EXTENSION.test(nombre)) {
    return { clase: 'certificado', queEs: 'Un certificado digital' };
  }
  if (!/\.json$/i.test(nombre)) return null;

  const declarado = JSON_INEQUIVOCO.test(nombre) ? (loQueDeclara(completa) || { tipo: '', correo: '' }) : loQueDeclara(completa);
  if (!declarado) return null;
  if (declarado.tipo === 'service_account' || /service[-_]?account/i.test(nombre)) {
    return { clase: 'cuenta de servicio', queEs: 'Una cuenta de servicio de Google', correo: declarado.correo };
  }
  return { clase: 'fichero de acceso', queEs: 'Un fichero con credenciales dentro', correo: declarado.correo };
}

// El proyecto que nombra una cuenta de servicio: de
// `robot@mi-proyecto.iam.gserviceaccount.com` sale `mi-proyecto`. Sirve para
// casarlo con una herramienta montada, y para nada más.
const proyectoDe = (correo) => (String(correo || '').split('@')[1] || '').split('.')[0] || '';

// ¿Este texto nombra a esta herramienta? Por **trozos**, no por `includes`.
//
// Con `includes` bastaba que el identificador apareciera dentro: el proyecto
// `mi-drive-de-pruebas` casaba con DRIVE, y una herramienta llamada `API`
// casaba con casi cualquier cosa. Un falso positivo aquí manda al asistente a
// mover la credencial de otro, así que se parte por guiones, puntos y guiones
// bajos y se exige que un trozo entero sea el identificador.
function nombraA(texto, id) {
  const trozos = String(texto || '').split(/[^A-Za-z0-9]+/).filter(Boolean).map(normal);
  const suyo = normal(id);
  return trozos.includes(suyo);
}

// Los ficheros de acceso que hay fuera de su sitio, con de quién parece cada
// uno. Lo que no se deduce se pregunta: no se inventa una herramienta a partir
// del nombre de un proyecto de Google.
// Topes. Esto se pide en cada repintado, y a diferencia del inventario de
// claves —que solo mira ficheros `.env*`, que son cuatro— aquí hay que abrir
// los `.json` que no se resuelven por el nombre. Una carpeta `datos/` con
// cinco mil ficheros no puede costar un repintado, así que se acota: tantas
// entradas por carpeta, y tantas lecturas en total.
const TOPE_POR_CARPETA = 300;
const TOPE_DE_LECTURAS = 60;
const TOPE_DE_SUBCARPETAS = 40;
const NOMBRE_DE_CREDENCIALES = /^(keys?|secrets?|credentials?|creds|private|auth|certs?|certificados?|claves)$/i;

function ficherosDeAcceso(lasHerramientas = herramientas(), { conLasDeLasApps = false } = {}) {
  const raiz = proyecto.raiz();
  if (!raiz) return [];

  const encontrados = [];
  let leidos = 0;
  const mirarCarpeta = (relativa, dentroDe = null) => {
    const completa = relativa ? proyecto.ruta(relativa) : raiz;
    if (!completa || !fs.existsSync(completa)) return;
    let entradas;
    try {
      entradas = lecturas.entradas(completa);
    } catch { return; }
    for (const entrada of entradas.slice(0, TOPE_POR_CARPETA)) {
      if (!entrada.isFile()) continue;
      // Abrir un `.json` cuesta; los demás se resuelven por el nombre y son
      // gratis. Solo los que hay que abrir gastan del tope.
      // Uno que su nombre ya dice (`credentials.json`) no gasta del tope: se
      // reconoce igual aunque ya no quede (decisión 170).
      const hayQueAbrirlo = /\.json$/i.test(entrada.name) && !JSON_INEQUIVOCO.test(entrada.name);
      if (hayQueAbrirlo && leidos >= TOPE_DE_LECTURAS) continue;
      if (hayQueAbrirlo) leidos += 1;

      const suyo = queEs(entrada.name, path.join(completa, entrada.name));
      if (!suyo) continue;
      const donde = relativa ? path.posix.join(relativa, entrada.name) : entrada.name;
      if (encontrados.some((f) => f.donde === donde)) continue;

      // De quién es, por el orden de la aclaración C3 de la spec.
      let herramienta = dentroDe;
      let por = dentroDe ? 'está en su carpeta' : null;
      if (!herramienta) {
        const porNombre = lasHerramientas.find((h) => nombraA(entrada.name, h.id));
        if (porNombre) { herramienta = porNombre.id; por = 'lo dice su nombre'; }
      }
      if (!herramienta && suyo.correo) {
        const proyectoSuyo = proyectoDe(suyo.correo);
        const porProyecto = lasHerramientas.find((h) => nombraA(proyectoSuyo, h.id));
        if (porProyecto) { herramienta = porProyecto.id; por = 'lo dice la cuenta'; }
      }

      encontrados.push({
        donde,
        nombre: entrada.name,
        clase: suyo.clase,
        queEs: suyo.queEs,
        herramienta: herramienta || null,
        existe: Boolean(herramienta && lasHerramientas.some((h) => h.id === herramienta)),
        por: por || 'sin dueño',
      });
    }
  };

  // Con la carpeta entera como aplicación, sus ficheros de acceso de la raíz son
  // suyos, como su `.env` (decisión 180): están en su sitio y no se mueven. Siguen
  // contando para `paraProteger` y para el aviso de «ya están en tus copias».
  if (conLasDeLasApps || !laRaizEsUnaApp()) mirarCarpeta('');
  let primerNivel = [];
  try {
    primerNivel = lecturas.entradas(raiz)
      .filter((e) => e.isDirectory() && !e.name.startsWith('.') && !NO_SE_MIRA.has(e.name))
      .map((e) => e.name);
  } catch { /* sin permiso: se mira lo demás */ }
  // Un `keys/` en la raíz es desorden; el de dentro de una herramienta no. Y lo
  // de una aplicación es suyo, como sus claves.
  // Las lecturas son pocas, así que se gastan por orden de importancia
  // (decisión 170): primero el primer nivel, después las subcarpetas con nombre de
  // credenciales, y al final el resto del segundo nivel.
  const primeras = [...new Set([...primerNivel, ...CARPETAS, 'keys'])].filter((c) => conLasDeLasApps || !esUnaApp(c));
  for (const carpeta of primeras) mirarCarpeta(carpeta);
  const hijasDe = (carpeta) => {
    try {
      return lecturas.entradas(proyecto.ruta(carpeta))
        .filter((e) => e.isDirectory() && !e.name.startsWith('.') && !NO_SE_MIRA.has(e.name))
        .map((e) => e.name).slice(0, TOPE_DE_SUBCARPETAS)
        .map((h) => path.posix.join(carpeta, h))
        .filter((r) => conLasDeLasApps || !esUnaApp(r));
    } catch { return []; }
  };
  // Y un nivel más: `datos/google/cuenta.json` es donde la gente guarda una cuenta de servicio.
  const segundas = primeras.flatMap(hijasDe);
  const conNombreDeClave = (r) => NOMBRE_DE_CREDENCIALES.test(path.posix.basename(r));
  for (const r of segundas.filter(conNombreDeClave)) mirarCarpeta(r);
  for (const r of segundas.filter((x) => !conNombreDeClave(x))) mirarCarpeta(r);

  // Dentro de cada herramienta, lo que esté FUERA de su `keys/`. Lo que hay en
  // `keys/` está en su casa y no se cuenta como desorden.
  for (const h of lasHerramientas) mirarCarpeta(path.posix.join(HERRAMIENTAS, h.id), h.id);

  return encontrados;
}

// Todo lo que es una credencial, esté en su sitio o no: los ficheros que no
// entran en una copia y los valores que se tapan en lo que se enseña. Aquí sí
// cuentan los de las aplicaciones. Los `.env` de las herramientas no vienen:
// quien protege ya los tiene.
function paraProteger() {
  return {
    claves: buscar({ conLasDeLasApps: true }),
    ficheros: [...ficherosDeAcceso(herramientas(), { conLasDeLasApps: true }), ...ficherosDelSistema()],
  };
}

// Los que las herramientas del propio sistema leen de un sitio fijo: `.netrc`,
// `.pgpass`, `.git-credentials`, `.htpasswd` y `.aws/credentials`. Son
// credenciales, así que no entran en una copia ni se enseñan sus valores; pero
// **no son desorden y no se mueven** (decisión 170): llevarlos a `keys/` dejaría
// a `git`, `psql` o `aws` sin encontrarlos. Se avisa de ellos y nada más.
const DEL_SISTEMA = ['.netrc', '.pgpass', '.git-credentials', '.htpasswd', '.aws/credentials'];
function ficherosDelSistema() {
  const raiz = proyecto.raiz();
  if (!raiz) return [];
  return DEL_SISTEMA.filter((donde) => {
    try { return fs.lstatSync(path.join(raiz, ...donde.split('/'))).isFile(); } catch { return false; }
  }).map((donde) => ({
    donde, nombre: path.posix.basename(donde), clase: 'del sistema', queEs: 'Un fichero de acceso que lee el sistema',
    herramienta: null, existe: false, por: 'sin dueño',
  }));
}

// Si una herramienta tiene ya su fichero de acceso puesto donde toca. Es lo
// que hace que deje de decir «sin conectar» algo que funciona.
function tieneSuFichero(herramientaId) {
  const carpeta = proyecto.ruta(HERRAMIENTAS, herramientaId, 'keys');
  if (!carpeta || !fs.existsSync(carpeta)) return 0;
  try {
    return lecturas.entradas(carpeta)
      .filter((e) => e.isFile() && !e.name.startsWith('.') && queEs(e.name, path.join(carpeta, e.name)))
      .length;
  } catch {
    return 0;
  }
}

// ── A quién pertenece cada clave ─────────────────────────────────────────

const normal = (t) => String(t || '').toUpperCase().replace(/[^A-Z0-9]/g, '');

// El prefijo que nombra al proveedor: `PEXELS_API_KEY` → PEXELS,
// `NEXT_PUBLIC_BUFFER_API_KEY` → BUFFER. Null si el nombre no dice de quién es.
function prefijoDe(nombre) {
  const partes = String(nombre).split('_');
  let i = 0;
  while (i < partes.length - 1) {
    if (PREFIJOS_HUECOS.has(partes.slice(i, i + 2).join('_'))) { i += 2; continue; }
    if (PREFIJOS_HUECOS.has(partes[i])) { i += 1; continue; }
    break;
  }
  const resto = partes.slice(i).join('_');
  if (partes.length - i < 2 || SIN_DUENO.test(resto)) return null;
  return partes[i];
}

function aQuien(nombre, lasHerramientas = herramientas()) {
  const duena = lasHerramientas.find((h) => h.esperadas.includes(nombre));
  if (duena) return { herramienta: duena.id, existe: true, por: 'la espera' };
  const prefijo = prefijoDe(nombre);
  if (!prefijo) return { herramienta: null, existe: false, por: 'sin dueño' };
  const misma = lasHerramientas.find((h) => normal(h.id) === normal(prefijo));
  return { herramienta: misma ? misma.id : prefijo, existe: Boolean(misma), por: 'prefijo' };
}

// Las claves sueltas, agrupadas por la herramienta a la que van. Las que ya
// existen primero; luego las que habría que montar; lo sin dueño, aparte.
function reparto(sitios = buscar(), lasHerramientas = herramientas()) {
  const grupos = new Map();
  const sinDueno = [];
  for (const sitio of sitios) {
    for (const nombre of sitio.nombres) {
      const a = aQuien(nombre, lasHerramientas);
      if (!a.herramienta) {
        if (!sinDueno.some((x) => x.nombre === nombre)) sinDueno.push({ nombre, donde: sitio.donde });
        continue;
      }
      const grupo = grupos.get(a.herramienta) || { herramienta: a.herramienta, existe: a.existe, claves: [], donde: [] };
      if (!grupo.claves.includes(nombre)) grupo.claves.push(nombre);
      if (!grupo.donde.includes(sitio.donde)) grupo.donde.push(sitio.donde);
      grupos.set(a.herramienta, grupo);
    }
  }
  const lista = [...grupos.values()].sort((x, y) => Number(y.existe) - Number(x.existe) || x.herramienta.localeCompare(y.herramienta));
  return { grupos: lista, sinDueno };
}

// Dónde está un fichero, dicho para quien no va a abrirlo.
function enCristiano(donde) {
  if (!donde.includes('/') && !donde.includes(path.sep)) return 'en la carpeta principal';
  if (donde.startsWith(`${HERRAMIENTAS}/`) || donde.startsWith(`${HERRAMIENTAS}${path.sep}`)) return 'en su carpeta, con otro nombre';
  return `en la carpeta ${donde.split(/[/\\]/)[0]}`;
}

// Cuáles de estos nombres están puestos en el propio ordenador (el entorno
// del sistema), que es «global» y no viaja con la carpeta.
const enElOrdenador = (nombres) => nombres.filter((n) => typeof process.env[n] === 'string' && process.env[n] !== '');

// ── Y si además están subidas ────────────────────────────────────────────
//
// Montar esto sobre un proyecto que ya existía se encontró, en la prueba con
// un arnés nuevo de verdad, con el caso que importa: el `.env` de esa persona
// **ya estaba en su historial de git**, porque lo guardó el día que empezó.
// Moverlas no las saca de ahí. Sacarlas es otra cosa y la decide esa persona,
// así que aquí solo se mira y se dice.
//
// Revisión de la 167: esto corre en cada repintado, así que (1) no corre `git`
// en una carpeta sin confianza —un `.git/config` con `core.fsmonitor` ejecuta
// ese programa con solo abrirla—, (2) lleva `-c core.fsmonitor=false` como el
// resto de la barra, y (3) guarda lo que contestó mientras el índice de git no
// cambie (son dos `git` síncronos de hasta 5 s).
let laCarpetaEsDeConfianza = () => true;
function ponerConfianza(funcion) { laCarpetaEsDeConfianza = funcion; }

const ultimaRespuesta = { clave: null, subidas: [] };
function paraElIndice(raiz) {
  try {
    let git = path.join(raiz, '.git');
    if (fs.statSync(git).isFile()) {
      const dentro = /^gitdir:\s*(.+)$/m.exec(fs.readFileSync(git, 'utf8'));
      if (!dentro) return null;
      git = path.resolve(raiz, dentro[1].trim());
    }
    const e = fs.statSync(path.join(git, 'index'));
    return `${e.mtimeMs}:${e.size}:${e.ino}`;
  } catch {
    return null;
  }
}

function estanSubidas(sitios) {
  const raiz = proyecto.raiz();
  if (!raiz || !sitios.length || !laCarpetaEsDeConfianza()) return [];
  const lista = sitios.map((s) => s.donde);
  const indice = paraElIndice(raiz);
  // Decisión 188: sin `.git` (o sin índice, que es una carpeta recién iniciada)
  // no hay nada subido y no hace falta lanzar nada. Antes, sin clave, el git se
  // lanzaba en cada repintado para oír «no es un repositorio».
  if (!indice) return [];
  const clave = `${raiz}\n${indice}\n${lista.join('\n')}`;
  if (ultimaRespuesta.clave === clave) return ultimaRespuesta.subidas;
  try {
    const { execFileSync } = require('node:child_process');
    // El git de la casa (el que trae la barra, no el del PATH, que en un Mac sin
    // las herramientas abre el diálogo de Apple); sin ventana en Windows; y con
    // `--no-optional-locks`, que solo mira y no le quita el `index.lock` a nadie.
    // Con el índice sin cambios no vuelve a correr (la clave de arriba).
    const salida = execFileSync(entorno.git(), ['--no-optional-locks', '-c', 'core.fsmonitor=false', 'ls-files', '--', ...lista], {
      cwd: raiz, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], timeout: 5000, windowsHide: true,
    });
    const subidas = salida.split('\n').map((l) => l.trim()).filter(Boolean);
    ultimaRespuesta.clave = clave;
    ultimaRespuesta.subidas = subidas;
    return subidas;
  } catch {
    return [];
  }
}

// Un nombre de fichero lo ha escrito quien hizo la carpeta: antes de que entre
// en un encargo, o es una ruta de verdad o no entra (revisión de la 167).
const RUTA_SEGURA = /^[\w./@+-]{1,200}$/;
const ruta = (donde) => {
  const limpia = limpio.etiqueta(donde, 200);
  return RUTA_SEGURA.test(limpia) && limpia === donde ? limpia : '(un fichero con un nombre raro)';
};
const rutas = (lista) => lista.map(ruta).join(', ');

// El encargo al asistente, con el plan hecho. Las rutas y los nombres de las
// claves van aquí porque esto se lo lee él; los valores, nunca.
// Cuántas líneas de reparto caben en un encargo. Con un `.env` de 120 claves
// —que existen— el encargo salía de 22.576 caracteres: una parrafada que el
// asistente lee peor que un resumen, y que no cabe en ninguna cabeza. Se
// nombran las primeras y se dice cuántas quedan; el asistente tiene la carpeta
// delante para ver el resto.
const CABEN_EN_EL_ENCARGO = 25;

const yLasDemas = (lista, pintar, queSon) => (lista.length > CABEN_EN_EL_ENCARGO
  ? [...lista.slice(0, CABEN_EN_EL_ENCARGO).map(pintar),
    `- Y ${lista.length - CABEN_EN_EL_ENCARGO} ${queSon} más, en esos mismos ficheros: mismo criterio, míralas tú.`]
  : lista.map(pintar));

function encargo(sitios, { grupos, sinDueno }, subidas, ficheros = []) {
  // Puede no haber ni una clave suelta y sí un fichero de acceso tirado. Abrir
  // con «hay 0 claves guardadas fuera de su sitio, en: .» era exactamente eso,
  // y se lo estaba mandando al asistente (lo pilló `review`).
  const lineas = sitios.length ? [
    `En esta carpeta hay ${sitios.reduce((t, s) => t + s.cuantas, 0)} claves guardadas fuera de su sitio, en: ${rutas(sitios.map((s) => s.donde))}. `
      + `El sitio de una clave es 01-TOOLS/<HERRAMIENTA>/.env, por el protocolo de harness: una carpeta por proveedor, con su .env, su .env.example, su CREDENTIALS.md y su prueba de conexión.`,
    '',
    'Reparto que sale por el nombre de cada clave:',
    ...yLasDemas(grupos, (g) => (g.existe
      ? `- ${g.claves.join(', ')} (${rutas(g.donde)}) → 01-TOOLS/${g.herramienta}/.env, que ya existe${g.claves.length === 1 ? ' y la espera' : ''}.`
      : `- ${g.claves.join(', ')} (${rutas(g.donde)}) → 01-TOOLS/${g.herramienta}/, que no existe: créala desde 01-TOOLS/_TEMPLATE, con su .env.example, su CREDENTIALS.md (dónde se saca cada una) y su prueba de conexión.`), 'herramientas'),
    ...(sinDueno.length
      ? [`- Sin dueño claro: ${sinDueno.map((x) => `${x.nombre} (${ruta(x.donde)})`).join(', ')}. Pregúntame de qué herramienta son antes de moverlas.`]
      : []),
  ] : [
    'En esta carpeta hay credenciales guardadas fuera de su sitio. El sitio lo define el protocolo de harness: una carpeta por proveedor en 01-TOOLS, con su .env, su .env.example, su CREDENTIALS.md y su prueba de conexión.',
  ];
  lineas.push(...[
    // Los ficheros de acceso: otra clase de credencial y otro destino. Van en
    // el mismo encargo porque es la misma mudanza, y porque partirla en dos
    // deja media casa ordenada.
    ...(ficheros.length ? [
      '',
      'Y hay credenciales que no son una línea sino un fichero entero. Su sitio es 01-TOOLS/<HERRAMIENTA>/keys/, que el .gitignore de la plantilla ya excluye:',
      ...yLasDemas(ficheros, (f) => (f.herramienta
        ? `- ${ruta(f.donde)} — ${f.queEs.toLowerCase()} → 01-TOOLS/${f.herramienta}/keys/ (${f.por}).${f.existe ? '' : ' Esa herramienta no existe: créala desde 01-TOOLS/_TEMPLATE.'}`
        : `- ${ruta(f.donde)} — ${f.queEs.toLowerCase()}. No sé de qué herramienta es: pregúntamelo antes de moverlo.`), 'credenciales'),
      'No abras ni me pegues el contenido de ninguno: con saber cuál es y a dónde va, basta.',
    ] : []),
    '',
    'Qué tiene que quedar: cada clave en el .env de su herramienta y solo ahí, los .env.example con los nombres, y cada herramienta con su prueba de conexión pasando.',
    '',
    'Qué no se toca: no imprimas ni me pegues ningún valor de clave. No borres el fichero viejo si algo del proyecto lo lee todavía: mira primero qué lo carga (scripts, dotenv, docker-compose) y adapta eso, o deja el fichero viejo cargando desde el nuevo. No reescribas el historial de git.',
    '',
    'Antes de mover nada, enséñame el reparto en una línea por herramienta y espera mi OK. '
      + 'Y déjame corregirte: este reparto lo he sacado yo del nombre de cada clave y puedo haberme equivocado, '
      + 'así que si te digo que alguna es de otra herramienta, manda lo que yo diga.',
  ]);
  if (subidas.length) {
    lineas.push('', `AVISO IMPORTANTE: estos ficheros ya están guardados en el historial de git (${rutas(subidas)}), `
      + 'así que moverlos NO saca esas claves de ahí: siguen en el historial y viajarían con cualquier copia que se suba. '
      + 'Explícaselo en cristiano antes de tocar nada y dile que lo prudente es cambiar esas claves en el proveedor, '
      + 'que es lo único que las deja inservibles. No reescribas el historial sin que te lo pida.');
  }
  return lineas.join('\n');
}

// Un resumen para la pantalla, sin nombrar ficheros ni valores.
function resumen() {
  const lasHerramientas = herramientas();
  const sitios = buscar();
  const deAcceso = ficherosDeAcceso(lasHerramientas);
  if (!sitios.length && !deAcceso.length) return null;

  // Los ficheros de acceso entran en la misma pregunta a git: un
  // `credentials.json` en el historial es la credencial que más daño hace ahí,
  // porque una cuenta de servicio no caduca (A6, hueco que encontró `analyze`).
  const subidas = estanSubidas([...sitios, ...deAcceso.map((f) => ({ donde: f.donde }))]);
  const { grupos, sinDueno } = reparto(sitios, lasHerramientas);
  return {
    sitios: sitios.length,
    ficheros: sitios.map((s) => s.donde),
    claves: sitios.reduce((total, s) => total + s.cuantas, 0),
    // Las credenciales que son un fichero entero, con de quién parece cada una.
    ficherosDeAcceso: deAcceso,
    // Cuántos de esos ficheros están ya guardados en el historial. Cero es el
    // caso normal; más de cero cambia lo que hay que hacer.
    subidas: subidas.length,
    // A qué herramienta va cada clave, para que la pantalla lo diga en
    // cristiano y el asistente lo tenga hecho.
    reparto: grupos,
    sinDueno,
    // Proveedores que existen por sus claves —o por un fichero de acceso— y
    // todavía no tienen carpeta.
    porMontar: [
      ...grupos.filter((g) => !g.existe).map((g) => ({ herramienta: g.herramienta, claves: g.claves.length })),
      ...deAcceso
        .filter((f) => f.herramienta && !f.existe && !grupos.some((g) => g.herramienta === f.herramienta))
        .map((f) => ({ herramienta: f.herramienta, claves: 0, conFichero: true })),
    ],
    prompt: encargo(sitios, { grupos, sinDueno }, subidas, deAcceso),
  };
}

// ── Las de una aplicación que ya están en las copias ─────────────────────
//
// Lo que dejó a medias la decisión 135: el aviso de «ya están en tus copias»
// va en la tarjeta de fuera de sitio, y las de una aplicación ya no salen ahí.
// Un `.env.local` guardado en git viaja con cada copia y con «Subir a GitHub»,
// así que se dice aparte. No se mueven: se dejan de guardar.
function deLasAppsEnLasCopias() {
  const fuera = new Set([...buscar(), ...ficherosDeAcceso()].map((s) => s.donde));
  const { claves, ficheros } = paraProteger();
  const deApps = [...claves, ...ficheros].filter((s) => !fuera.has(s.donde));
  const subidas = estanSubidas(deApps);
  if (!subidas.length) return null;

  const enGit = (s) => subidas.includes(s.donde);
  const nombres = [...new Set(claves.filter(enGit).flatMap((s) => s.nombres))];
  const deAcceso = ficheros.filter(enGit).length;
  // La de un fichero de la raíz es la principal (''): con la carpeta entera como
  // aplicación, salía «la aplicación de la carpeta .env» (decisión 167).
  const carpetas = [...new Set(subidas.map((d) => (d.includes('/') ? d.split('/')[0] : '')))].sort();
  return {
    ficheros: subidas,
    carpetas,
    claves: nombres.length,
    deAcceso,
    // Los nombres van al asistente para que diga cuáles cambiar; los valores, nunca.
    prompt: [
      `En esta carpeta hay una aplicación con credenciales que ya están guardadas en el historial de git: ${rutas(subidas)}.`,
      'Están en su sitio: es donde las lee la aplicación, y para el protocolo de harness lo de dentro de un subproyecto no se mueve. No las muevas.',
      '',
      'Lo que hay que hacer:',
      '1. Explícame en cristiano qué significa que estén en el historial: cada copia guardada se las lleva, y si las copias se suben a GitHub, van con ellas.',
      '2. Que dejen de guardarse a partir de ahora: añádelas al .gitignore de la aplicación y sácalas del índice con git rm --cached, sin borrarlas del disco. Comprueba después que la aplicación sigue leyéndolas.',
      '3. Recomiéndame cambiarlas donde se sacaron, que es lo único que deja inservibles las que ya están en el historial'
        + `${nombres.length ? `: ${nombres.join(', ')}` : ''}.`
        + `${deAcceso ? ' Un fichero de acceso se anula donde se sacó (una cuenta de servicio, en Google) y se saca otro.' : ''}`,
      '',
      'No imprimas ni me pegues ningún valor ni el contenido de ningún fichero. No reescribas el historial de git sin que te lo pida.',
    ].join('\n'),
  };
}

module.exports = {
  deLasAppsEnLasCopias, ponerConfianza, rutas, estanSubidas,
  buscar, resumen, reparto, aQuien, prefijoDe, herramientas, enCristiano, enElOrdenador, nombresDeClaves, nombresEsperados,
  ficherosDeAcceso, tieneSuFichero, queEs, paraProteger, DE_UNA_APP,
  // Para no ofrecer «Conectar» a lo que no es un programa (decisión 152).
  SUENA_A_SECRETO,
};
