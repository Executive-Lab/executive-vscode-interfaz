// ¿Hay una versión nueva de esto? Y si la hay, ponerla.
//
// Por qué existe: la barra no está en la tienda del editor —va a ser cerrada—,
// así que el editor no la actualiza solo. Se reparte como un `.vsix` en cada
// release de GitHub, y sin esto **nadie se entera de que hay algo mejor**: cada
// uno se queda con la versión que le tocó el día que se la dieron, para
// siempre, y los arreglos no le llegan nunca.
//
// Lo mira una vez al día. Para ponerla, se baja el `.vsix` de esa release, se
// comprueba que es el de nuestro sitio y el de esa versión, y que ha llegado
// entero —la huella `sha256` que publica GitHub con cada fichero—, y se le pasa
// al editor para que lo instale.
//
// Al principio solo se ponía cuando la persona pulsaba «Actualizar ahora»
// (decisión 132). Desde la decisión 136 se pone sola, porque el proyecto pasa a
// ser abierto y quien no pulsa se queda atrás. No es a sus espaldas: la tarjeta
// dice que ya está puesta, y en Ayuda se puede pedir que pregunte antes.
//
// Antes esto solo abría la página de la release (decisión 132). Bajar un
// `.vsix` e instalarlo a mano es de lo más difícil que se le puede pedir a
// alguien que no programa, así que en la práctica no actualizaba nadie. La
// página se queda de repuesto, para cuando no se pueda ponerla sola.

const vscode = require('vscode');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const github = require('./github');

const { REPO, QUIEN_PUBLICA, esLaDeAqui, esNuestro, enNuestrasCuentas, mismoSitio } = require('./sitio');
const ULTIMA = `https://api.github.com/repos/${REPO}/releases/latest`;
// Las de prueba no salen en `latest`: para quien se ofrece a probarlas, se mira
// la lista entera, y de ahí la más nueva, sea o no de prueba (decisión 134).
const TODAS = `https://api.github.com/repos/${REPO}/releases?per_page=15`;
const DE_UNA = (version) => `https://api.github.com/repos/${REPO}/releases/tags/v${version}`;

// Solo lo que publica la dueña del sitio. Una etiqueta que crea otra persona con
// permiso, o una tarea mal hecha, no se ofrece a nadie (revisión de seguridad
// de la decisión 134). La publica `minarkap`, también con el repositorio en la
// organización: ver `sitio.js` (decisión 140).
const DUENA = QUIEN_PUBLICA;
const deLaDuena = (release) => Boolean(release && release.author && release.author.login === DUENA);

// En un aula todos salen a internet por la misma dirección, y GitHub deja 60
// preguntas por hora sin cuenta para todos juntos. Si una falla —sin red, o sin
// cupo—, no se vuelve a preguntar en un rato: se repinta muchas veces por hora,
// y cada repintado sería otra pregunta que gasta el cupo de la clase.
const TRAS_UN_FALLO = 60 * 60 * 1000;

// «Que se ponga al día sola», en Ayuda: encendido de fábrica (lo pone el
// manifiesto). Se mira `=== true` a propósito: un editor que no sepa el valor
// de fábrica no instala nada solo.
const AJUSTE_SOLA = 'executiveLab.actualizarSola';
const actualizarSola = () => {
  try {
    return vscode.workspace.getConfiguration().get(AJUSTE_SOLA) === true;
  } catch {
    return false;
  }
};

// «Probar las versiones nuevas antes», en Ayuda. Es de la persona, no de la
// carpeta: se guarda para todo el editor.
const AJUSTE_PROBAR_ANTES = 'executiveLab.probarAntes';
const probarAntes = () => {
  try {
    return vscode.workspace.getConfiguration().get(AJUSTE_PROBAR_ANTES) === true;
  } catch {
    return false;
  }
};

// Una vez al día basta y sobra. La respuesta se recuerda en el almacén global
// del editor, así que abrir cinco ventanas no son cinco preguntas.
const CADA = 24 * 60 * 60 * 1000;
const CLAVE = 'executiveLab.ultimoMiradoVersion';

// Lo que tarda en bajarse un `.vsix` de 6 MB con una conexión mala.
const ESPERA_AL_BAJAR = 3 * 60 * 1000;

// El `.vsix` ocupa 6 MB. Uno de más de 64 no es nuestro, o es un error al
// publicar, y bajarlo entero a memoria podría tumbar el editor de todos los que
// pulsen a la vez (revisión de seguridad).
const TAMANO_MAXIMO = 64 * 1024 * 1024;

// "0.9.0" → [0, 9, 0]. Lo que no sean números se ignora: una etiqueta como
// "0.9.0-beta" cuenta como 0.9.0, que para avisar es suficiente.
const enNumeros = (version) => String(version || '').split('.').map((t) => parseInt(t, 10) || 0);

function esMasNueva(candidata, actual) {
  const a = enNumeros(candidata);
  const b = enNumeros(actual);
  for (let i = 0; i < Math.max(a.length, b.length); i += 1) {
    if ((a[i] || 0) > (b[i] || 0)) return true;
    if ((a[i] || 0) < (b[i] || 0)) return false;
  }
  return false;
}

// El nombre que le pone `publicar.sh`, y nada más: una release con otro fichero
// dentro no se instala.
const nombreDelPaquete = (version) => `executive-lab-${version}.vsix`;

// De una release, lo que hace falta para ponerla: su versión y su `.vsix`, con
// dónde está, cuánto ocupa y su huella. Sin un `.vsix` que cuadre, `paquete` es
// null y solo se puede avisar.
function deUnaRelease(release) {
  const version = String((release && release.tag_name) || '').replace(/^v/, '');
  if (!/^\d+\.\d+\.\d+$/.test(version) || !deLaDuena(release)) return null;
  const nombre = nombreDelPaquete(version);
  // Y el fichero, subido por quien publica: en la organización hay más gente,
  // y tareas, que podrían cambiar el paquete de una versión que publicó otra
  // persona; GitHub daría la huella del cambiado (revisión de la decisión 140).
  const suyo = ((release && release.assets) || []).find((a) => a && a.name === nombre && a.uploader && a.uploader.login === DUENA);
  const candidato = suyo ? { nombre, url: suyo.browser_download_url, tamano: suyo.size, huella: suyo.digest, sitio: sitioDeLaRelease(release) } : null;
  return { version, paquete: paqueteDeFiar(candidato, version) ? candidato : null, deprueba: Boolean(release.prerelease) };
}

// De la lista, la más nueva que no sea un borrador.
function laMasNueva(releases) {
  return (Array.isArray(releases) ? releases : [])
    .filter((r) => r && !r.draft)
    .map(deUnaRelease)
    .filter(Boolean)
    .reduce((mejor, r) => (!mejor || esMasNueva(r.version, mejor.version) ? r : mejor), null);
}

// De qué repositorio es una release, según la dirección que le pone GitHub.
// Al preguntar por `REPO`, GitHub contesta con el repositorio de verdad aunque
// le hayan cambiado el nombre o la cuenta.
function sitioDeLaRelease(release) {
  const m = String((release && release.html_url) || '').match(/^https:\/\/github\.com\/([A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+)\/releases\/tag\/[^/]+$/);
  return m ? m[1] : null;
}

// Solo de nuestro sitio, de esa versión, y con huella. Lo que no cumpla las
// tres no se baja: se ofrece la página. «Nuestro sitio» es cualquiera de
// `SITIOS` (decisión 140), o el repositorio de la propia release si está en una
// de nuestras cuentas: así, si le vuelven a cambiar el nombre, las barras que
// ya están puestas siguen poniéndose al día (decisión 148). Que esté en
// nuestras cuentas no basta: en la organización están también los de los
// alumnos.
function delPaqueteEnNuestroSitio(url, version, sitioDeSuRelease) {
  const m = String(url || '').match(/^https:\/\/github\.com\/([A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+)\/releases\/download\/v([^/]+)\/([^/]+)$/);
  if (!m) return false;
  const nuestro = esNuestro(m[1]) || (enNuestrasCuentas(m[1]) && mismoSitio(m[1], sitioDeSuRelease));
  return nuestro && m[2] === version && m[3] === nombreDelPaquete(version);
}

function paqueteDeFiar(paquete, version) {
  return Boolean(paquete)
    && paquete.nombre === nombreDelPaquete(version)
    && delPaqueteEnNuestroSitio(paquete.url, version, paquete.sitio)
    && /^sha256:[0-9a-f]{64}$/.test(String(paquete.huella || ''))
    && Number.isInteger(paquete.tamano) && paquete.tamano > 0 && paquete.tamano <= TAMANO_MAXIMO;
}

// La última publicada, recordada un día. Nunca lanza: sin red no se avisa, y
// que esto falle no puede estropearle la pantalla a nadie. Con «Probar las
// versiones nuevas antes», también las de prueba; lo recordado de un canal no
// vale para el otro.
async function laUltima(contexto, { fresca = false, deprueba = probarAntes() } = {}) {
  // Una barra hecha a partir de esta, con otro nombre, no pregunta aquí: lo que
  // encontrara sería la nuestra, y la pondría sola al lado de la suya (decisión 204).
  if (!esLaDeAqui(contexto)) return null;
  try {
    const almacen = contexto.globalState;
    const canal = deprueba ? 'pruebas' : 'estable';
    const mirado = almacen.get(CLAVE) || { cuando: 0, version: null };
    const delMismoCanal = (mirado.canal || 'estable') === canal;
    const lo = () => (mirado.version && delMismoCanal ? { version: mirado.version, paquete: mirado.paquete || null, deprueba: Boolean(mirado.deprueba) } : null);
    if (!fresca && delMismoCanal && Date.now() - mirado.cuando < CADA) return lo();
    // Falló hace poco: con lo que se sabía, y sin volver a preguntar. El botón
    // (`fresca`) sí pregunta: es una persona pidiéndolo, no un repintado.
    if (!fresca && mirado.fallo && Date.now() - mirado.fallo < TRAS_UN_FALLO) return lo();

    // Con reloj, como todo lo que sale a la red desde aquí: la barra no puede
    // quedarse esperando a GitHub para pintarse.
    const respuesta = await github.conReloj(fetch(deprueba ? TODAS : ULTIMA, { headers: { Accept: 'application/vnd.github+json' } }), null, 5000);
    if (!respuesta || !respuesta.ok) {
      await almacen.update(CLAVE, { ...mirado, fallo: Date.now() });
      return lo();
    }

    const datos = await respuesta.json();
    const ultima = deprueba ? laMasNueva(datos) : deUnaRelease(datos);
    await almacen.update(CLAVE, {
      cuando: Date.now(),
      canal,
      version: ultima ? ultima.version : null,
      paquete: ultima ? ultima.paquete : null,
      deprueba: Boolean(ultima && ultima.deprueba),
    });
    return ultima;
  } catch {
    return null;
  }
}

// La nueva, con si es de prueba, o null.
async function laNuevaSiHay(contexto, actual) {
  const ultima = await laUltima(contexto);
  return ultima && esMasNueva(ultima.version, actual) ? { version: ultima.version, deprueba: Boolean(ultima.deprueba) } : null;
}

// Devuelve la versión nueva, o null.
async function hayUnaNueva(contexto, actual) {
  const ultima = await laUltima(contexto);
  return ultima && esMasNueva(ultima.version, actual) ? ultima.version : null;
}

// ── Ponerla ──────────────────────────────────────────────────────────────
//
// Solo desde el botón. Se vuelve a preguntar a GitHub en ese momento: lo que se
// recordó ayer puede no ser ya la última. Devuelve qué pasó; quien llama lo dice
// y lo apunta.
async function ponerLaNueva(contexto, actual, { esperar = ESPERA_AL_BAJAR } = {}) {
  const ultima = await laUltima(contexto, { fresca: true });
  if (!ultima) return { ok: false, motivo: 'sinRespuesta' };
  if (!esMasNueva(ultima.version, actual)) return { ok: false, motivo: 'yaEstaAlDia', version: ultima.version };
  const { paquete } = ultima;
  if (!paqueteDeFiar(paquete, ultima.version)) return { ok: false, motivo: 'sinPaquete', version: ultima.version };

  const carpeta = contexto.globalStorageUri ? path.join(contexto.globalStorageUri.fsPath, 'versiones') : null;
  if (!carpeta) return { ok: false, motivo: 'sinSitio', version: ultima.version };

  // Con un corte de verdad, no solo dejando de esperar: si no, una descarga
  // colgada seguiría bajando por detrás (revisión de seguridad).
  const cortar = new AbortController();
  const reloj = setTimeout(() => cortar.abort(), esperar);
  let bytes;
  try {
    const respuesta = await fetch(paquete.url, { signal: cortar.signal });
    if (!respuesta || !respuesta.ok) return { ok: false, motivo: 'sinRespuesta', version: ultima.version };
    // Si dice de antemano que no mide lo que tiene que medir, ni se baja. Si no
    // lo dice —un proxy, o una descarga por trozos—, se mide al llegar: `null`
    // como número es 0, y así se rechazaba siempre (auditoría final).
    const cabecera = respuesta.headers && respuesta.headers.get ? respuesta.headers.get('content-length') : null;
    const anunciado = cabecera === null || cabecera === undefined || String(cabecera).trim() === '' ? NaN : Number(cabecera);
    if (Number.isFinite(anunciado) && anunciado !== paquete.tamano) {
      cortar.abort();
      return { ok: false, motivo: 'aMedias', version: ultima.version };
    }
    bytes = Buffer.from(await respuesta.arrayBuffer());
  } catch {
    return { ok: false, motivo: 'sinRespuesta', version: ultima.version };
  } finally {
    clearTimeout(reloj);
  }
  // Entero y el mismo: un corte a medias o un fichero cambiado no se instala.
  if (bytes.length !== paquete.tamano) return { ok: false, motivo: 'aMedias', version: ultima.version };
  const huella = `sha256:${crypto.createHash('sha256').update(bytes).digest('hex')}`;
  if (huella !== paquete.huella) return { ok: false, motivo: 'noCoincide', version: ultima.version };

  const fichero = path.join(carpeta, paquete.nombre);
  try {
    // Solo se guarda la que se va a poner: las de antes no sirven para nada.
    fs.rmSync(carpeta, { recursive: true, force: true });
    fs.mkdirSync(carpeta, { recursive: true });
    fs.writeFileSync(fichero, bytes);
    await vscode.commands.executeCommand('workbench.extensions.installExtension', vscode.Uri.file(fichero));
  } catch (error) {
    return { ok: false, motivo: 'noSeInstala', version: ultima.version, detalle: error && error.message };
  }
  return { ok: true, version: ultima.version };
}

// ── Qué trae ─────────────────────────────────────────────────────────────
//
// Lo de «## Qué trae» de la release, en frases: es lo que se le enseña a quien
// acaba de ponerla (decisión 134). Lo escribe quien publica
// (`/publicar-una-version`), pensando en el alumno. Se quitan las marcas de
// markdown, porque la pantalla lo pinta como texto; y lo que va entre
// paréntesis al empezar es una nota para quien publica, no para el alumno.
function loQueTrae(cuerpo) {
  const lineas = String(cuerpo || '').split(/\r?\n/);
  const desde = lineas.findIndex((l) => /^##\s+qu[ée]\s+trae\b/i.test(l.trim()));
  if (desde < 0) return [];
  const cosas = [];
  for (const linea of lineas.slice(desde + 1)) {
    if (/^#{1,2}\s/.test(linea.trim())) break;
    // Solo los de primer nivel: lo sangrado es el detalle de uno de ellos.
    const punto = linea.match(/^[-*]\s+(.+)$/);
    if (!punto) continue;
    // Las marcas, fuera; pero un guion bajo dentro de una palabra
    // (`mi_archivo`) es parte de ella (revisión).
    const limpia = punto[1]
      .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
      .replace(/\*\*|__|`/g, '')
      .replace(/(^|\s)[*_](\S)/g, '$1$2')
      .replace(/(\S)[*_](?=\s|[.,;:!?]|$)/g, '$1')
      .replace(/\s+/g, ' ')
      .trim();
    if (!limpia || limpia.startsWith('(')) continue;
    cosas.push(limpia.length > 280 ? `${limpia.slice(0, 279).trimEnd()}…` : limpia);
    if (cosas.length === 6) break;
  }
  return cosas;
}

// Lo que trae una versión, recordado para no preguntarlo en cada repintado.
// Sin red, nada: la tarjeta se enseña igual, sin la lista.
const CLAVE_QUE_TRAE = 'executiveLab.queTrae';
async function queTrae(contexto, version) {
  try {
    const recordado = contexto.globalState.get(CLAVE_QUE_TRAE);
    if (recordado && recordado.version === version && !recordado.fallo) return recordado.cosas;
    // Si falló hace poco, sin la lista y sin volver a preguntar en cada repintado.
    if (recordado && recordado.version === version && Date.now() - recordado.fallo < TRAS_UN_FALLO) return [];
    const respuesta = await github.conReloj(fetch(DE_UNA(version), { headers: { Accept: 'application/vnd.github+json' } }), null, 5000);
    if (!respuesta || !respuesta.ok) {
      await contexto.globalState.update(CLAVE_QUE_TRAE, { version, cosas: [], fallo: Date.now() });
      return [];
    }
    const cosas = loQueTrae((await respuesta.json()).body);
    await contexto.globalState.update(CLAVE_QUE_TRAE, { version, cosas });
    return cosas;
  } catch {
    return [];
  }
}

// La página de la última versión, para cuando no se puede ponerla sola.
const dondeBajarla = () => vscode.Uri.parse(`https://github.com/${REPO}/releases/latest`);

// La de una versión en concreto, para «Ver qué trae» cuando no hay lista.
const dondeVerla = (version) => vscode.Uri.parse(`https://github.com/${REPO}/releases/tag/v${version}`);

module.exports = {
  hayUnaNueva, laNuevaSiHay, laUltima, ponerLaNueva, esMasNueva, deUnaRelease, laMasNueva, paqueteDeFiar, loQueTrae, queTrae,
  dondeBajarla, dondeVerla, probarAntes, actualizarSola, REPO, DUENA, CLAVE, CLAVE_QUE_TRAE, AJUSTE_PROBAR_ANTES, AJUSTE_SOLA,
  TAMANO_MAXIMO, TRAS_UN_FALLO,
};
