// La interfaz de la barra lateral.
//
// Sin frameworks a propósito: son unas pocas pantallas y tienen que seguir
// funcionando dentro de cinco años sin que nadie actualice nada.

const vscode = acquireVsCodeApi();
const app = document.getElementById('app');

let estado = null;
let accionesDescubiertas = [];
// Si el asistente de esta carpeta llega a tener botones: Codex no tiene.
let puedeTenerBotones = true;
// Los cuatro datos de hoy, en una línea. Vacío si no hay nada que contar.
let pulso = [];
// Qué herramientas tiene abiertas en el acordeón. Vive aquí y no en el estado
// del arnés porque es de esta persona y de este rato: el vigía repinta la
// pantalla cada vez que el asistente toca un fichero, y sin esto se le cerraría
// el acordeón en las narices a media lectura.
const abiertas = new Set();
let modo = 'sencillo';
let marcaPuesta = true;
let comoSeLlama = 'tu trabajo';
let aviso = null;
// Lo último que se buscó: desde un artículo abierto desde el buscador, el
// "Volver" tiene que devolver a los resultados, no a la lista de temas.
let ultimaBusqueda = '';
// En cuál de los dos buscadores se escribió lo último, para volver al suyo.
let ultimoBuscado = 'conceptos';
// Lo último que se pintó, para saber si un repintado es de la misma pantalla.
let ultimoPintado = '';

const pedir = (tipo, extra = {}) => vscode.postMessage({ tipo, ...extra });

// Dónde cae lo que se arrastra encima: la bandeja de documentos, salvo cuando
// se está mirando la cara de la empresa, que va a su carpeta.
let dondeCaeLoQueSueltas = 'documentos';
// Y en la pantalla de una conexión que pide un fichero de acceso, a esa
// conexión (decisión 156): «Suéltalo aquí».
let conexionQueRecibe = null;

// -------------------------------------------------- soltar documentos encima
//
// El editor NO le da a la barra la ruta de lo que se suelta, y hace bien: eso
// sería dejarle leer cualquier cosa del disco. Pero sí deja leer el contenido
// de lo que esa persona ha soltado a propósito, que es justo lo que hace falta.
// Así que el fichero viaja leído y la extensión solo escribe.
//
// Límite por fichero: un documento de trabajo no ocupa 40 MB, y si los ocupa,
// mejor el botón de siempre que atascar el canal de mensajes.
const LIMITE = 40 * 1024 * 1024;

function leer(fichero) {
  return new Promise((resolver) => {
    if (fichero.size > LIMITE) return resolver(null);
    const lector = new FileReader();
    lector.onerror = () => resolver(null);
    lector.onload = () => {
      // El resultado viene como "data:<tipo>;base64,<datos>".
      const coma = String(lector.result).indexOf(',');
      resolver(coma === -1 ? null : { nombre: fichero.name, datos: String(lector.result).slice(coma + 1) });
    };
    lector.readAsDataURL(fichero);
    return undefined;
  });
}

// Abrir o cerrar una herramienta se recuerda mientras dure esta sesión, para
// que un repintado del vigía no la cierre a media lectura.
document.addEventListener('toggle', (e) => {
  const quien = e.target && e.target.dataset ? e.target.dataset.abrir : null;
  if (!quien) return;
  if (e.target.open) abiertas.add(quien);
  else abiertas.delete(quien);
}, true);

document.addEventListener('dragover', (e) => {
  e.preventDefault();
  document.body.classList.add('soltando');
});
document.addEventListener('dragleave', (e) => {
  if (e.relatedTarget) return;
  document.body.classList.remove('soltando');
});
document.addEventListener('drop', async (e) => {
  e.preventDefault();
  document.body.classList.remove('soltando');

  const sueltos = [...(e.dataTransfer && e.dataTransfer.files ? e.dataTransfer.files : [])];
  if (!sueltos.length) return;

  const leidos = (await Promise.all(sueltos.map(leer))).filter(Boolean);
  if (dondeCaeLoQueSueltas === 'acceso' && conexionQueRecibe) {
    pedir('soltarFicheroDeAcceso', { ficheros: leidos, proveedor: conexionQueRecibe });
    return;
  }
  if (!leidos.length) {
    pedir('soltarDocumentos', { ficheros: [], para: dondeCaeLoQueSueltas });
    return;
  }
  pedir('soltarDocumentos', { ficheros: leidos, para: dondeCaeLoQueSueltas });
});

// Todo lo que venga de fuera se escapa antes de pintarse. `texto` vale para el
// contenido; `atributo` escapa además las comillas, porque ahí sí rompen.
const ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

function escapar(valor, patron) {
  return valor == null ? '' : String(valor).replace(patron, (c) => ESCAPES[c]);
}

const texto = (valor) => escapar(valor, /[&<>]/g);
const atributo = (valor) => escapar(valor, /[&<>"']/g);

function boton({ etiqueta, icono = '', accion, principal = false, discreto = false, pequeno = false, soloIcono = false }) {
  const clases = [principal ? 'principal' : '', discreto ? 'discreto' : '', pequeno ? 'pequeno' : '', soloIcono ? 'solo-icono' : ''].filter(Boolean).join(' ');

  // Un botón que es solo un dibujo sigue teniendo que decir su nombre: al
  // pasar por encima y para quien lo oye en vez de verlo. Un cuadrito mudo no
  // es un botón, es un acertijo.
  if (soloIcono) {
    return `<button class="${clases}" title="${atributo(etiqueta)}" aria-label="${atributo(etiqueta)}"
      data-accion="${atributo(JSON.stringify(accion))}"><span class="icono" aria-hidden="true">${icono}</span></button>`;
  }

  return `<button class="${clases}" data-accion="${atributo(JSON.stringify(accion))}">
    ${icono ? `<span class="icono" aria-hidden="true">${icono}</span>` : ''}
    <span class="texto">${texto(etiqueta)}</span>
  </button>`;
}

// ── Una cosa que se puede hacer: el botón, y detrás la (i) ──────────────
//
// Jose, viendo la lista de comandos: *«quiero que sea con botones, no tanta
// cosa. Si quieres saber qué hace puedes meter una (i) de info y meter ahí las
// cosas. Pero tiene que ser más minimalista»*.
//
// Antes cada cosa ocupaba tres bloques: el nombre en negrita, un párrafo
// explicándola, y un botón que ponía "Hacerlo". Con seis comandos eso ya era
// una pantalla entera de scroll, y con veinticinco habilidades era ilegible.
// Y el botón no decía qué hacía: decía "Hacerlo".
//
// Ahora una cosa **es** un botón, con su nombre. Lo que hace vive detrás de la
// (i), que abre y cierra sin repintar —así no se pierde el scroll— y donde
// además caben los botones de segunda fila que antes competían con el primero.
//
// Y dentro va también **cómo se llama de verdad**. Jose: *«¿pero cómo se llaman
// las skills realmente? ¿Lo pondrías en algún lado, aunque sea en lo de info?»*.
// Sí: el rótulo está en cristiano para poder leerlo, pero quien vaya a escribir
// `/revisar-la-barra` en una conversación tiene que poder saber cuál es. En el
// botón sería ruido; en la (i) está justo donde se va a buscar.
let cuantasFilas = 0;
function filaDeAccion({ etiqueta, icono, queHace, accion, principal = false, dentro = '', nombreReal = '', seEscribe = false }) {
  const hayQueContar = Boolean(queHace || dentro || nombreReal);
  cuantasFilas += 1;
  const id = `q${cuantasFilas}`;

  return `
    <div class="fila">
      ${boton({ etiqueta, icono, accion, principal })}
      ${hayQueContar ? `<button class="info" data-info="${id}" aria-controls="${id}" aria-expanded="false"
        title="Qué hace" aria-label="Qué hace">i</button>` : ''}
    </div>
    ${hayQueContar ? `<div class="loQueHace" id="${id}" hidden>
      ${queHace ? `<p>${texto(queHace)}</p>` : ''}
      ${nombreReal ? `<p class="deVerdad">${seEscribe ? 'Se escribe' : 'Se llama'} <code>${texto(nombreReal)}</code></p>` : ''}
      ${dentro}
    </div>` : ''}
  `;
}

// Un grupo plegable de la pantalla principal.
//
// ── Por qué ──────────────────────────────────────────────────────────────
//
// Esta pantalla empezó con seis botones. Con doce y cuatro rótulos sueltos ya
// no se leía: todo pesaba lo mismo, así que para encontrar lo de siempre había
// que repasarlo todo. Lo de diario —lo que el asistente ha creado y lo que se
// mira de un vistazo— se queda arriba y a la vista; lo demás baja a cinco
// filas plegadas que se abren cuando hacen falta.
//
// No se esconde nada: cada fila dice qué guarda y cuánto hay dentro, y lo que
// se abre se queda abierto mientras dure la sesión (el vigía repinta la
// pantalla cada vez que el asistente toca un fichero).
function grupo({ id, etiqueta, cuantos = '', dentro, abiertoDeEntrada = false }) {
  if (!dentro) return '';
  const abierto = abiertas.has(id) || (abiertoDeEntrada && !abiertas.size);
  return `
    <details class="acordeon grupo" data-abrir="${atributo(id)}"${abierto ? ' open' : ''}>
      <summary>${texto(etiqueta)}${cuantos ? `<span class="cuantos">${texto(cuantos)}</span>` : ''}</summary>
      ${dentro}
    </details>`;
}

// Un aviso, y —si el aviso manda a "Algo va mal"— el botón que lo abre.
//
// Estaba roto de la forma más tonta: el aviso de un arranque fallido decía
// «Pulsa "Algo va mal"» en una pantalla que no tiene ese botón, porque vive
// dentro de Ayuda y Ayuda solo sale cuando ya hay arnés. O sea, justo cuando
// más falta hace, no estaba. Ahora lo trae el propio aviso: quien lo nombra,
// lo ofrece, esté en la pantalla que esté.
// Con varias carpetas abiertas se trabaja con la primera, y se dice (B9).
function lineaDeVarias() {
  if (!estado || !estado.conVarias) return '';
  return `<p class="nota">${texto(`Trabajo con «${estado.conVarias}», la primera de las carpetas abiertas.`)}</p>`;
}

// Un aviso puede traer su propio botón, cuando lo que dice tiene arreglo: el de
// «Guardar en git» con una credencial suelta lo trae para ponerla en su sitio (F1).
// Decisión 183: un texto que manda a «preguntárselo al asistente» lleva el botón
// que se lo pregunta. El texto va tal cual a la extensión, que lo limpia y arma
// el encargo (lo que viene de la carpeta no se fía aquí).
const MANDA_AL_ASISTENTE = /(Pregúntaselo|Pídeselo|Pídele[^.]*) al asistente/;
const queLoMire = (dicho) => boton({ etiqueta: 'Que lo mire el asistente', icono: '💬', pequeno: true, accion: { tipo: 'queLoMireElAsistente', texto: dicho } });

function bloqueAviso(cual = aviso) {
  if (!cual) return '';
  const manda = cual.malo && /Algo va mal/.test(cual.texto || '');
  const alAsistente = cual.malo && !cual.boton && !(Array.isArray(cual.botones) && cual.botones.length) && MANDA_AL_ASISTENTE.test(cual.texto || '');
  return `<div class="aviso ${cual.malo ? 'malo' : ''}">${texto(cual.texto)}</div>`
    + (cual.boton && cual.boton.etiqueta && cual.boton.accion ? boton({ etiqueta: cual.boton.etiqueta, icono: '▸', pequeno: true, accion: cual.boton.accion }) : '')
    // O varios, cuando lo que dice es una pregunta y cada uno es una respuesta.
    + (Array.isArray(cual.botones) ? cual.botones.filter((b) => b && b.etiqueta && b.accion).map((b) => boton({ etiqueta: b.etiqueta, icono: '▸', pequeno: true, accion: b.accion })).join('') : '')
    + (alAsistente ? queLoMire(cual.texto) : '')
    + (manda ? boton({ etiqueta: 'Algo va mal', icono: '🆘', accion: { tipo: 'algoVaMal' } }) : '');
}

// Arriba, y pequeño. Arriba porque en una barra estrecha el final de la
// pantalla está a dos pantallazos, y salir de un sitio no puede costar más que
// entrar. Pequeño porque justo debajo va el rótulo que dice dónde estás, y dos
// cosas grandes seguidas compiten entre ellas.
const volver = (accion = { tipo: 'volver' }) => boton({ etiqueta: 'Volver', icono: '←', pequeno: true, accion });

// --------------------------------------------------- leer un artículo

// Un markdown mínimo, para enseñar los artículos de la wiki dentro del panel.
// Se escapa todo primero y después se aplican los patrones, así que nada de lo
// que haya escrito el asistente puede convertirse en etiquetas.
//
// No es un analizador completo a propósito: cubre lo que hay en un artículo de
// la wiki —títulos, párrafos, listas, tablas, citas, negrita y enlaces— y nada
// más. Una biblioteca entera para esto sería una dependencia que mantener.
// Los enlaces del artículo que se está leyendo y que llevan a otro documento
// de verdad. Los resuelve la extensión (cerebro.enlacesDe), que es quien puede
// mirar el disco; aquí solo se pintan.
let enlacesDelArticulo = {};
// Si el artículo se abrió desde la foto del cerebro: sus enlaces siguen
// volviendo a la foto (decisión 151).
let enlacesDesde = null;

function enLinea(t) {
  return texto(t)
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|[^*])\*([^*]+)\*/g, '$1<em>$2</em>')
    // Los de fuera se abren fuera; los de dentro navegan por dentro, y los que
    // no llevan a ningún sitio se quedan en texto: mejor eso que un clic roto.
    // Con tope y sin corchetes dentro: `\[([^\]]+)\]` volvía atrás sin fin con
    // una línea de `[` sin cerrar, y colgaba la pantalla (revisión de seguridad, B4).
    .replace(/\[([^[\]\n]{1,300})\]\(([^()\n]{1,1000})\)/g, (_, rotulo, destino) => {
      if (/^https?:/.test(destino)) return `<a href="${atributo(destino)}">${rotulo}</a>`;
      const dentro = enlacesDelArticulo[destino];
      return dentro
        ? `<a class="enlace-interno vivo" data-accion="${atributo(JSON.stringify({ tipo: 'leerArticulo', ruta: dentro, ...(enlacesDesde ? { desde: enlacesDesde } : {}) }))}">${rotulo}</a>`
        : `<span class="enlace-interno">${rotulo}</span>`;
    });
}

function comoMarkdown(fuente, enlaces = {}) {
  enlacesDelArticulo = enlaces || {};
  const salida = [];
  let lista = null;
  let tabla = null;

  const cerrarLista = () => { if (lista) { salida.push(`</${lista}>`); lista = null; } };
  const cerrarTabla = () => { if (tabla) { salida.push('</tbody></table>'); tabla = null; } };
  const cerrar = () => { cerrarLista(); cerrarTabla(); };

  for (const cruda of String(fuente).split('\n')) {
    const linea = cruda.trimEnd();

    if (!linea.trim()) { cerrar(); continue; }

    const titulo = linea.match(/^(#{1,4})\s+(.*)$/);
    if (titulo) { cerrar(); salida.push(`<h${titulo[1].length + 2}>${enLinea(titulo[2])}</h${titulo[1].length + 2}>`); continue; }

    if (/^(-{3,}|\*{3,}|_{3,})$/.test(linea.trim())) { cerrar(); salida.push('<hr class="separador">'); continue; }

    // Tablas: la fila de guiones se traga, las demás son filas.
    if (/^\s*\|/.test(linea)) {
      const celdas = linea.trim().replace(/^\||\|$/g, '').split('|').map((c) => c.trim());
      if (celdas.every((c) => /^:?-{2,}:?$/.test(c))) continue;
      if (!tabla) { cerrarLista(); salida.push('<table><tbody>'); tabla = true; }
      salida.push(`<tr>${celdas.map((c) => `<td>${enLinea(c)}</td>`).join('')}</tr>`);
      continue;
    }
    cerrarTabla();

    const cita = linea.match(/^>\s?(.*)$/);
    if (cita) { cerrarLista(); salida.push(`<blockquote>${enLinea(cita[1])}</blockquote>`); continue; }

    const punto = linea.match(/^\s*[-*]\s+(.*)$/);
    const numero = linea.match(/^\s*\d+[.)]\s+(.*)$/);
    if (punto || numero) {
      const quiere = punto ? 'ul' : 'ol';
      if (lista !== quiere) { cerrarLista(); salida.push(`<${quiere}>`); lista = quiere; }
      salida.push(`<li>${enLinea((punto || numero)[1])}</li>`);
      continue;
    }
    cerrarLista();

    salida.push(`<p>${enLinea(linea.trim())}</p>`);
  }

  cerrar();
  return salida.join('\n');
}
const nada = (frase) => `<p class="cargando">${texto(frase)}</p>`;

// La fecha de una entrada del historial, en palabras y por días de calendario.
function cuando(iso) {
  const entonces = new Date(`${iso}T12:00:00`);
  if (Number.isNaN(entonces.getTime())) return '';
  const dia = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const dias = Math.round((dia(new Date()) - dia(entonces)) / 86400000);
  if (dias <= 0) return 'hoy';
  if (dias === 1) return 'ayer';
  if (dias < 7) return `hace ${dias} días`;
  return new Intl.DateTimeFormat('es-ES', { day: 'numeric', month: 'long' }).format(entonces);
}
const plural = (n, uno, varios) => (n === 1 ? uno : varios.replace('{n}', n));

// El rastro de por dónde se ha llegado, con cada tramo clicable menos el
// último. Antes cada pantalla tenía su "Volver" escrito a mano y desde un
// artículo no había forma de saber en qué tema estabas.
function migas(tramos) {
  const utiles = tramos.filter(Boolean);
  if (utiles.length < 2) return '';
  return `<nav class="migas">${utiles.map((tramo, i) => (
    i === utiles.length - 1
      ? `<span class="aqui">${texto(tramo.etiqueta)}</span>`
      : `<a data-accion="${atributo(JSON.stringify(tramo.accion))}">${texto(tramo.etiqueta)}</a><span class="separa">›</span>`
  )).join('')}</nav>`;
}

// Buscar es mirar: lo resuelve la barra sin abrir una conversación.
// Dos buscadores, cada uno en su sitio y con su nombre.
//
// Yo defendía uno solo con los resultados agrupados. Jose decidió dos, con su
// argumento: **que se sepa por el nombre qué va a salir**. Buscar un contrato
// firmado y buscar cómo se factura aquí son dos preguntas distintas, y
// mezclar las respuestas obliga a leerlas todas para descartar.
const BUSCADORES = {
  papeles: {
    rotulo: 'Buscar un documento',
    pista: 'Por su nombre: un contrato, una factura, un albarán…',
    vacio: { tipo: 'verPapeles' },
  },
  conceptos: {
    rotulo: 'Buscar un concepto',
    pista: 'Un cliente, una norma, cómo se hace algo aquí…',
    vacio: { tipo: 'verCerebro' },
  },
};

function cajaDeBusqueda(donde, valor = '') {
  const cual = BUSCADORES[donde] || BUSCADORES.conceptos;
  return `
    <h2>${texto(cual.rotulo)}</h2>
    <input class="buscar" type="search" data-buscar data-donde="${atributo(donde)}" value="${atributo(valor)}"
      placeholder="${atributo(cual.pista)}"
      aria-label="${atributo(cual.rotulo)}">`;
}

// ---------------------------------------------------- llevarte un archivo

// Lo que el asistente ha producido, sacado del `out/` que RSC define en cada
// herramienta. Dos formas de llevárselo y ninguna enseña una ruta: abrirlo con
// el programa de siempre, o guardarlo donde esa persona diga.
// El nombre manda, y las dos acciones son dos dibujos a la derecha: son
// siempre las mismas para todos los ficheros, así que escribirlas enteras
// una y otra vez solo quita sitio al nombre, que es lo único que cambia.
const filaDeResultado = (a, abrir, llevar) => `
    <div class="archivo">
      <div class="archivo-que">
        <p class="nombre">${texto(a.fichero)}</p>
        <p class="pista">${texto(a.tamano)} · ${texto(cuando(a.cuando.slice(0, 10)))}</p>
      </div>
      <div class="archivo-acciones">
        ${boton({ etiqueta: `Abrir ${a.fichero}`, icono: '👁', pequeno: true, soloIcono: true, accion: abrir })}
        ${boton({ etiqueta: `Guardar ${a.fichero} donde yo diga`, icono: '⬇', pequeno: true, soloIcono: true, accion: llevar })}
      </div>
    </div>`;

// Lo producido, en un plegable por conexión; y las fotos del cerebro, en el
// suyo (decisión 151). Lo usan Resultados (out) y Documentos.
function gruposDeResultados(herramientas = [], fotos = []) {
  const plegable = (id, etiqueta, cuantos, dentro) => `
      <details class="acordeon" data-abrir="${atributo(id)}"${abiertas.has(id) ? ' open' : ''}>
        <summary>${texto(etiqueta)} <span class="cuantos">${cuantos}</span></summary>
        ${dentro}
      </details>`;
  return herramientas.map((h) => plegable(`salida:${h.id}`, h.etiqueta, h.cuantos, `
        ${h.archivos.map((a) => filaDeResultado(a, { tipo: 'abrirSalida', herramienta: h.id, fichero: a.fichero }, { tipo: 'guardarSalida', herramienta: h.id, fichero: a.fichero })).join('')}
        ${h.hayMas ? boton({ etiqueta: plural(h.hayMas, 'Ver el que falta', 'Ver los {n} que faltan'), icono: '📂', discreto: true, pequeno: true, accion: { tipo: 'abrirCarpetaDeSalida', herramienta: h.id } }) : ''}`)).join('')
    + (fotos.length ? plegable('fotos:cerebro', 'La foto del cerebro', fotos.length,
      fotos.map((a) => filaDeResultado(a, { tipo: 'abrirLaFoto', fichero: a.fichero }, { tipo: 'llevarteLaFoto', fichero: a.fichero })).join('')) : '');
}

function pantallaSalidas(datos) {
  const herramientas = datos.herramientas || [];
  const fotos = datos.fotos || [];

  return `
    ${migas([{ etiqueta: 'Principal', accion: { tipo: 'volver' } }, { etiqueta: 'Resultados (out)' }])}
    ${bloqueAviso()}
    ${volver()}

    <div class="brujula">
      <h2>Resultados (out)</h2>
      <p class="hiciste">Lo que ha producido con cada conexión. Ábrelo para verlo, o guárdatelo donde quieras.</p>
    </div>

    ${herramientas.length || fotos.length ? gruposDeResultados(herramientas, fotos)
      : nada('Todavía no ha preparado nada para llevarse.')}

  `;
}

// ------------------------------------------------------ habilidades (skills)

// Recordatorios (decisiones 144 y 155, y su revisión adversaria): un solo
// nombre, el de Habilidades, para lo que lleva la barra —avisa a su hora y se
// hace con un clic—. Cada uno, con lo que se puede hacer con él de verdad: hacerlo,
// cambiarlo o quitarlo. Y, una vez y abajo, «Que se haga sola», que prepara el
// encargo para el gestor del asistente: eso ya no es un recordatorio.
function pantallaRecordatorios({ horarios = [], hayHabilidades = false, queSeHagaSola = '', aviso: avisoLocal }) {
  return `
    ${migas([{ etiqueta: 'Principal', accion: { tipo: 'volver' } }, { etiqueta: 'Recordatorios' }])}
    ${bloqueAviso(avisoLocal)}
    ${volver()}
    <div class="brujula">
      <h2>Recordatorios</h2>
      <p class="hiciste">La barra te avisa a su hora y tú decides cuándo hacerlo. Si el editor estaba cerrado, verás el aviso al volver.</p>
    </div>
    ${hayHabilidades
    ? boton({ etiqueta: 'Poner un recordatorio', icono: '🕑', principal: !horarios.length, pequeno: horarios.length > 0, accion: { tipo: 'ponerHorario' } })
    : `${boton({ etiqueta: 'Crear un recordatorio nuevo', icono: '＋', principal: true, accion: { tipo: 'crearRecordatorio' } })}
      <p class="pista">Se lo pido al asistente: te pregunta qué quieres que te recuerde y cuándo.</p>`}
    ${horarios.length ? '<p class="pista">Se usa la hora de este ordenador.</p>' : ''}
    ${horarios.map((r) => `
      <section class="recordatorio">
        <h3>${texto(r.etiqueta)}</h3>
        <p class="detalle">${texto(r.enPalabras || 'Hay que revisar el horario.')}</p>
        ${r.pendiente ? '<p class="pendiente">Tienes un aviso pendiente.</p>' : ''}
        <p class="pista">${texto(r.proxima ? `Próximo aviso: ${r.proxima}.` : 'No hay una próxima fecha válida. Cambia el horario para volver a recibir avisos.')}</p>
        ${r.compartida ? '<p class="pista">Está compartida con otra carpeta: se cambia allí.</p>' : ''}
        <div class="fila">
          ${r.enPalabras ? boton({ etiqueta: 'Hacerlo ahora', icono: '▸', pequeno: true, accion: { tipo: 'hacerElRecordatorio', nombre: r.nombre } }) : ''}
          ${r.puedeCambiar ? boton({ etiqueta: 'Cambiar', pequeno: true, discreto: true, accion: { tipo: 'ponerHorario', nombre: r.nombre } }) : ''}
          ${r.puedeQuitar ? boton({ etiqueta: 'Quitar', pequeno: true, discreto: true, accion: { tipo: 'quitarRecordatorio', nombre: r.nombre } }) : ''}
        </div>
      </section>`).join('')}
    ${hayHabilidades && queSeHagaSola ? `
      <hr class="separador">
      <p class="detalle">${texto(queSeHagaSola)}</p>
      ${boton({ etiqueta: 'Que se haga sola', icono: '↗', pequeno: true, discreto: true, accion: { tipo: 'queSeHagaSola' } })}` : ''}
  `;
}

// Para qué se montó esta carpeta, dicho como lo dijo quien la montó.
const DE_QUE_VA = {
  operations: 'el día a día de un negocio',
  content: 'crear contenido',
  software: 'construir algo',
  research: 'estudiar un tema a fondo',
};

// Una habilidad instalada: se pulsa y se invoca. Con Claude el botón manda
// `/su-identificador`, que es exactamente lo que se escribiría a mano —RSC lo
// dice: para Claude las habilidades son comandos—, y la (i) lo enseña como
// «Se escribe /unslop» para que se pueda atar con lo que se oye en clase.
//
// Y de dónde viene va también en la (i), no en un titular: antes lo instalado
// se partía en tres cabeceras —propias, del catálogo, fuera del catálogo— por
// una frontera que no cambia nada al usarlas (decisión 101).
const ORIGEN = {
  tuya: 'Tuya: escrita para esta carpeta.',
  catalogo: 'Del catálogo.',
  aqui: 'Instalada aquí, fuera del catálogo.',
};
// Una con un nombre que no se puede usar para pedirla —lo escribió quien hizo la
// carpeta, y no es un nombre—: se ve, pero sin botón (revisión de la PR #48).
const sinNombreQueValga = (etiqueta, frase) => `
    <div class="fila">
      <p class="nombre">${texto(etiqueta)}</p>
    </div>
    <p class="pista">${texto(frase)}</p>
    ${MANDA_AL_ASISTENTE.test(frase) ? queLoMire(`${etiqueta}: ${frase}`) : ''}`;

// La que está siempre activa (`executive-lab`, de los raíles): un botón que la
// pide no hace nada, así que se ve sin él, con lo que hace (decisión 164).
const filaDeHabilidad = (c) => (c.siempre
  ? sinNombreQueValga(c.nombre, c.frase || '')
  : !c.prompt
  ? sinNombreQueValga(c.nombre.charAt(0).toUpperCase() + c.nombre.slice(1), 'Su nombre no se puede usar para pedirla. Pídele al asistente que se lo cambie.')
  : filaDeAccion({
  etiqueta: c.nombre.charAt(0).toUpperCase() + c.nombre.slice(1),
  icono: '✨',
  queHace: c.frase,
  accion: { tipo: 'pedir', prompt: c.prompt },
  nombreReal: c.prompt && c.prompt.startsWith('/') ? c.prompt : c.id,
  seEscribe: Boolean(c.prompt && c.prompt.startsWith('/')),
  dentro: `${ORIGEN[c.origen] ? `<p>${ORIGEN[c.origen]}</p>` : ''}${c.quitable
    ? boton({ etiqueta: 'Quitarla', icono: '🗑️', pequeno: true, discreto: true, accion: { tipo: 'quitarHabilidad', habilidad: c.id, nombre: c.nombre } })
    : ''}`,
}));

// Una del catálogo que todavía no está: se pulsa y se añade (`rsc add`).
const filaDelCatalogo = (c) => filaDeAccion({
  etiqueta: c.nombre.charAt(0).toUpperCase() + c.nombre.slice(1),
  icono: '＋',
  queHace: c.frase,
  accion: { tipo: 'aprenderCapacidad', capacidad: c.id, nombre: c.nombre },
  nombreReal: c.id,
  dentro: `<p>${c.porQue && c.porQue.length
    ? `Pega con lo que ya tienes escrito: ${texto(c.porQue.join(', '))}. `
    : ''}Al pulsar se añade a esta carpeta.</p>`,
});

// Las habilidades (skills). Cuatro bloques y en este orden: lo instalado, junto
// y bajo un solo titular, con el origen de cada una en la (i); lo que el
// catálogo ofrece para esta carpeta; y al final, plegado, lo que pesa poco —el
// resto del catálogo y las que el arnés monta para funcionar—. Todo lo
// instalado se ve: el mapeo entre el arnés y la barra tiene que ser completo,
// y una habilidad puesta que no sale en ningún sitio es un agujero, no una
// simplificación.
//
// Jose, 21-09-2026 (decisión 101): las tres cabeceras de lo instalado
// —propias, del catálogo, fuera del catálogo— partían una misma lista por una
// frontera que no importa al usarlas y que además es frágil: «propia» solo
// quiere decir declarada en `ownSkills`, así que una escrita a mano y sin
// declarar caía en «fuera del catálogo» sin que nada hubiera cambiado. Los
// datos siguen llegando en sus montones (`saberes.js` no cambia, y su suma
// sigue teniendo que cuadrar); es la pantalla la que los junta.
function pantallaSaberes(datos) {
  const suyas = datos.suyas || [];
  const sabe = datos.sabe || [];
  const otras = datos.otras || [];
  // Una copia: se le añaden los comandos del arnés, y repintar no puede duplicarlos.
  const deSerie = [...(datos.deSerie || [])];
  const puede = datos.puedeAprender || [];
  const demas = datos.lasDemas || [];

  const conOrigen = (lista, origen) => lista.map((c) => ({ ...c, origen }));
  // Los comandos de antes, que son habilidades (decisión 141): los suyos, con
  // las instaladas; los del arnés, plegados con las del arnés.
  const comoHabilidad = (c) => ({ id: c.nombre, nombre: c.etiqueta, frase: c.queHace, prompt: c.prompt });
  const comandos = datos.comandos || [];
  const instaladas = [
    ...conOrigen(suyas, 'tuya'),
    ...conOrigen(comandos.filter((c) => !c.delArnes).map(comoHabilidad), 'tuya'),
    ...conOrigen(sabe, 'catalogo'),
    ...conOrigen(otras, 'aqui'),
  ];
  deSerie.push(...comandos.filter((c) => c.delArnes).map(comoHabilidad));

  // Sugerencias: las que pegan con lo escrito y, si son pocas, hasta seis de
  // las que pegan con esta clase de carpeta. Lo demás del catálogo —lo que no
  // cupo y lo que no pega con para lo que se montó esto— va plegado en un solo
  // montón. No se tira, por si alguien monta una carpeta para una cosa y acaba
  // haciendo otra; pero con 59 en el catálogo, desplegado era una pantalla
  // entera de scroll.
  const aLaVista = Math.max(datos.encajan || 0, Math.min(puede.length, 6));
  const sugeridas = puede.slice(0, aLaVista);
  const resto = [...puede.slice(aLaVista), ...demas];

  return `
    ${migas([{ etiqueta: 'Principal', accion: { tipo: 'volver' } }, { etiqueta: 'Habilidades (skills)' }])}
    ${bloqueAviso()}
    ${volver()}

    <div class="brujula">
      <h2>Habilidades (skills)</h2>
      <p class="hiciste">Las que están puestas se piden con un clic, o escribiendo su nombre en la conversación. Las del catálogo se añaden desde aquí.</p>
    </div>

    ${/* Lo que se recuerda y cuándo tiene su pantalla, con el mismo nombre
          (decisión 144 y revisión adversaria de la 155). Solo si hay algo. */''}
    ${datos.hayRecordatorios ? boton({ etiqueta: 'Recordatorios', icono: '🕑', pequeno: true, accion: { tipo: 'verRecordatorios' } }) : ''}

    <h2>Instaladas</h2>
    ${instaladas.length
      ? instaladas.map(filaDeHabilidad).join('')
      : nada(deSerie.length ? 'Solo las del arnés, que van abajo.' : 'Todavía no hay ninguna puesta.')}

    <hr class="separador">

    <h2>Sugerencias del catálogo</h2>
    <p class="detalle">${datos.deQueVa && DE_QUE_VA[datos.deQueVa]
      ? `Las que pegan con una carpeta para ${texto(DE_QUE_VA[datos.deQueVa])}. Pulsa una y se añade.`
      : 'Pulsa una y se añade. La (i) dice para qué sirve.'}</p>
    ${sugeridas.length
      ? sugeridas.map(filaDelCatalogo).join('')
      : nada('Ya están puestas todas las que pegan con esto.')}

    ${resto.length ? `
      <details class="acordeon grupo">
        <summary>Resto del catálogo<span class="cuantos">${resto.length}</span></summary>
        <p class="detalle">Las que no pegan con para lo que montaste esto, o no cupieron arriba. Si te hacen falta, ahí están.</p>
        ${resto.map(filaDelCatalogo).join('')}
      </details>` : ''}

    ${deSerie.length ? `
      <details class="acordeon grupo">
        <summary>Las del arnés<span class="cuantos">${deSerie.length}</span></summary>
        <p class="detalle">${deSerie.some((c) => c.deLaBarra)
          ? 'Las montan el arnés y la barra para funcionar. Están puestas como las demás; van plegadas porque no se piden a menudo.'
          : 'Las monta el arnés para funcionar. Están puestas como las demás; van plegadas porque no se piden a menudo.'}</p>
        ${deSerie.map(filaDeHabilidad).join('')}
      </details>` : ''}

    <hr class="separador">

    ${/* No todo sale de un catálogo. Lo que hace falta en una carpeta depende de
          para qué dijo esa persona que era, o —si ya venía con trabajo hecho— de
          lo que haya dentro. Eso no lo sabemos nosotros: lo sabe el asistente
          leyendo su perfil y su carpeta. */''}
    <h2>Crear una habilidad nueva</h2>
    <p class="detalle">Si lo que necesitas no está en el catálogo, se escribe una a medida para esta carpeta.</p>
    ${boton({
      etiqueta: 'Pedirle propuestas de habilidades',
      icono: '🧠',
      accion: {
        tipo: 'pedir',
        prompt: [
          'Mira para qué dije que era esta carpeta y lo que ya hay dentro, y proponme tres habilidades (skills) nuevas que me vendrían bien y que no existan ya.',
          '',
          'De cada una dime: cómo se llamaría, qué me ahorraría, y un ejemplo de algo concreto que yo le pediría.',
          'No me propongas cosas genéricas: tienen que salir de lo que hay en esta carpeta.',
          'Cuando elija una, escríbela como habilidad propia de esta carpeta y déjala puesta.',
        ].join('\n'),
      },
    })}
    ${boton({
      etiqueta: 'Escribir una habilidad a medida',
      icono: '✏️',
      accion: { tipo: 'pedir', prompt: 'Quiero una habilidad (skill) nueva para algo que hago yo y que todavía no sabe hacer. Pregúntame qué es, cómo lo hago paso a paso y qué tiene que salir al final, y déjala escrita como habilidad propia de esta carpeta.' },
    })}
  `;
}

// ------------------------------------------------------------- las reglas

// Lo que el asistente tiene que respetar siempre. Son tres sitios de RSC y
// ninguno se veía: la constitución (los innegociables, que el arnés pone en su
// mapa bajo "léete esto siempre"), y las reglas de la casa del CLAUDE.md y del
// AGENTS.md.
// Lo que se comprueba solo. Tres estados y tres marcas, porque significan
// cosas distintas: armado te puede parar, apagado es una decisión de aquí, y
// «contigo no actúa» es una tercera cosa que sin decirla parece una avería.
const MARCA_GUARDIAN = { armado: '●', apagado: '○', noAplica: '·', pendiente: '○' };

function pantallaReglas({
  innegociables = [], deLaCasa = [], guardianes = [], automatismos = [], hay = {}, cual = 'claude',
  puedeTenerFrenos = true, interruptores = [], aviso: avisoLocal,
}) {
  const lista = (reglas, vacio, comoQuitar) => (reglas.length
    ? reglas.map((r) => `<div class="entrada"><p class="nombre">${enLinea(r)}</p></div>`).join('')
    : nada(vacio));

  return `
    ${migas([{ etiqueta: 'Principal', accion: { tipo: 'volver' } }, { etiqueta: 'Las reglas' }])}
    ${bloqueAviso(avisoLocal)}
    ${volver()}

    <div class="brujula">
      <h2>Las reglas</h2>
      <p class="hiciste">Lo que tiene que respetar siempre, pase lo que pase. Se las lee antes de cada cosa que hace.</p>
    </div>

    <h2>Innegociables</h2>
    ${lista(innegociables, 'Todavía no hay ninguno. Son las cosas que no se saltan nunca, pase lo que pase.')}
    ${hay.constitucion ? boton({ etiqueta: 'Verlas enteras', icono: '▸', pequeno: true, discreto: true, accion: { tipo: 'abrirReglas', cual: 'constitucion' } }) : ''}

    <hr class="separador">
    <h2>Cómo se trabaja aquí</h2>
    ${lista(deLaCasa, 'Todavía no hay ninguna.')}
    ${hay[cual] ? boton({ etiqueta: 'Verlas enteras', icono: '▸', pequeno: true, discreto: true, accion: { tipo: 'abrirReglas', cual } }) : ''}

    <hr class="separador">
    ${boton({
      etiqueta: 'Añadir una regla',
      icono: '➕',
      principal: true,
      accion: { tipo: 'pedir', prompt: 'Quiero añadir una regla que tengas que respetar siempre en esta carpeta. Pregúntame cuál es, dime dónde la vas a dejar y por qué ahí, y déjala escrita.' },
    })}
    ${boton({
      etiqueta: 'Decirle qué NO quiero que haga',
      icono: '🚫',
      accion: { tipo: 'pedir', prompt: 'Hay cosas que no quiero que hagas nunca en esta carpeta. Pregúntame cuáles son, una a una, y déjalas escritas donde te las leas siempre.' },
    })}

    ${/* Lo que se cambia con un clic (decisión 172): cómo está, qué cambia y su
          botón. El clic es el sí de quien lo pulsa; lo hace la orden del arnés. */''}
    ${interruptores.length ? `
      <hr class="separador">
      <h2>Cómo trabaja el asistente</h2>
      ${interruptores.map((i) => `
        <div class="pieza si">
          <span class="pieza-nombre">${texto(i.nombre)}</span>
        </div>
        <p class="detalle">${texto(i.dice)} ${texto(i.equipo)}</p>
        ${i.botones.map((b) => `
          <p class="detalle">${texto(b.queCambia)}</p>
          ${boton({ etiqueta: b.etiqueta, icono: '🔧', pequeno: true, accion: { tipo: 'cambiarInterruptor', cual: b.id } })}`).join('')}`).join('')}` : ''}

    ${/* Lo único del arnés que puede decir que NO. Va al final y plegado
          (decisión 101): es automático y de dentro, así que casi nunca se abre.
          Pero no se quita, porque cuando el freno actúa al alumno le sale en la
          conversación un aviso en inglés que empieza por BLOCKED y la barra no
          puede interceptarlo: este es el único sitio donde pone qué es eso. */''}
    ${/* Y con un asistente al que no se le engancha ninguno, la sección salía
          con un cero al lado y la memoria dentro, como si a esta carpeta le
          faltara algo. No le falta: con Codex no hay frenos, y el que se pierde
          es el que para una orden peligrosa — el que protege justo a quien no es
          técnico. Eso se dice, que es lo único que podemos hacer desde aquí. */''}
    ${guardianes.length || automatismos.length || !puedeTenerFrenos ? `
      <hr class="separador">
      <details class="acordeon grupo">
        <summary>Lo que se comprueba solo<span class="cuantos">${guardianes.length + automatismos.length}</span></summary>
        <p class="detalle">${puedeTenerFrenos
    ? 'Frenos que se aplican antes de cada cosa que hace y pueden pararla. Si alguna vez te sale un aviso en inglés que no te deja seguir, es esto.'
    : 'Tu asistente no trae frenos: solo se le enganchan a Claude. Aquí nada te va a parar antes de hacer algo.'}</p>
        ${guardianes.map((g) => `
          <div class="pieza ${g.estado === 'armado' ? 'si' : 'noAplica'}">
            <span class="pieza-marca" aria-hidden="true">${MARCA_GUARDIAN[g.estado] || '·'}</span>
            <span class="pieza-nombre">${texto(g.nombre)}</span>
            <span class="pieza-detalle">${texto(g.porQue || 'Puesto')}</span>
          </div>
          ${g.queHace || g.deQuien ? `<p class="detalle">${texto([g.queHace, g.deQuien].filter(Boolean).join(' '))}</p>` : ''}`).join('')}
        ${/* Y lo que el arnés hace solo sin parar nada: la brújula al empezar,
              el aviso del diario al cerrar, la memoria entre conversaciones…
              Es lo que un alumno ve pasar sin saber qué es, y no se nombraba en
              ningún sitio (decisión 102). Va aquí porque la pregunta es la
              misma: «¿qué hace esto por su cuenta?». */''}
        ${automatismos.length ? `
          <p class="detalle">Y lo que hace solo, sin parar nada:</p>
          ${automatismos.map((a) => `
            <div class="pieza ${a.estado === 'activo' ? 'si' : 'noAplica'}">
              <span class="pieza-marca" aria-hidden="true">${a.estado === 'activo' ? '●' : '○'}</span>
              <span class="pieza-nombre">${texto(a.nombre)}</span>
              <span class="pieza-detalle">${texto(a.porQue || 'Activo')}</span>
            </div>
            ${a.queHace ? `<p class="detalle">${texto(a.queHace)}</p>` : ''}`).join('')}` : ''}
        ${guardianes.length || automatismos.length ? boton({
    etiqueta: 'Cambiar lo que se comprueba',
    icono: '🔧',
    pequeno: true,
    discreto: true,
    accion: { tipo: 'pedir', prompt: 'Quiero repasar las comprobaciones que se aplican solas en esta carpeta. Explícame una por una qué me para cada una y qué pasa si la quito, y pregúntame cuál quiero cambiar antes de tocar nada.' },
  }) : ''}
      </details>` : ''}

  `;
}

// ------------------------------------------------------------ en qué estamos

// Lo que RSC escribe cuando se construye algo con SDD: qué se quiere, por qué y
// cómo. Aparece solo si esa carpeta lo tiene — una de contabilidad no lo tendrá
// nunca, y una donde se monte una web, sí.
// ------------------------------------------------------------- comandos

// Todos los comandos de esta carpeta. Los que alguien marcó como botón salen
// arriba —son los mismos que se pueden fijar en Acciones rápidas— y detrás los
// que están escritos y nadie ha marcado, y los que trae el arnés.
function pantallaComandos({ comandos = [] }) {
  const fila = (c) => (!c.prompt
    ? sinNombreQueValga(c.etiqueta, 'Su nombre no se puede usar para pedirlo. Pídele al asistente que se lo cambie.')
    : filaDeAccion({
      etiqueta: c.etiqueta,
      icono: c.icono || '▸',
      queHace: c.queHace,
      accion: { tipo: 'pedir', prompt: c.prompt },
      nombreReal: c.prompt,
      seEscribe: true,
    }));

  const mios = comandos.filter((c) => !c.delArnes);
  const delArnes = comandos.filter((c) => c.delArnes);

  return `
    ${migas([{ etiqueta: 'Principal', accion: { tipo: 'volver' } }, { etiqueta: 'Comandos' }])}
    ${bloqueAviso()}
    ${volver()}

    <div class="brujula">
      <h2>Comandos</h2>
      <p class="hiciste">Peticiones guardadas con nombre. Se lanzan con un clic, o escribiendo su nombre en la conversación.</p>
    </div>

    ${/* Un asistente que no tiene dónde guardarlos no va a tener ninguno nunca,
          y aquí ponía «se van creando conforme repites tareas» y ofrecía crear
          uno. La principal ya lo explicaba —«no trabaja con botones»— y esta
          pantalla, que es a la que se llega desde ella, no se enteraba. */''}
    ${mios.length ? mios.map(fila).join('') : nada(puedeTenerBotones
      ? 'Todavía no hay ninguno. Se van creando conforme repites tareas.'
      : 'Tu asistente no trabaja con comandos. Pídele las cosas escribiéndolas en la conversación.')}
    ${puedeTenerBotones ? boton({
      etiqueta: 'Crear un comando',
      icono: '➕',
      accion: { tipo: 'pedir', prompt: 'Quiero un comando nuevo para algo que hago a menudo. Pregúntame cuál es, qué tiene que hacer exactamente y cómo quiero que se llame, y déjalo escrito con su botón en la barra.' },
    }) : ''}

    ${/* Plegados, como las habilidades del arnés: están y se ven, pero no se
          piden a menudo y no los escribió nadie de aquí (decisión 101). */''}
    ${delArnes.length ? `
      <hr class="separador">
      <details class="acordeon grupo">
        <summary>Los del arnés<span class="cuantos">${delArnes.length}</span></summary>
        <p class="detalle">No los ha escrito nadie de aquí: vienen con el arnés. Van plegados porque no se piden a menudo.</p>
        ${delArnes.map(fila).join('')}
      </details>` : ''}

    <hr class="separador">
    ${boton({ etiqueta: 'Fijar alguno arriba', icono: '☆', pequeno: true, discreto: true, accion: { tipo: 'verFijadas' } })}
  `;
}

// ------------------------------------------------------------- sugerencias

// Dos mitades, y son distintas a propósito.
//
// **Lo que ve la barra** son hechos que se comprueban leyendo el disco: hay tres
// documentos sin leer desde el martes, a Odoo le falta una clave, llevas nueve
// días sin guardar. Salen al momento y cada uno trae su botón.
//
// **Lo que ve el asistente** es todo lo demás, y no lo podemos calcular
// nosotros: si lo que repites debería ser un botón, si te vendría bien una
// habilidad que no tienes, si algo que haces cada semana lo podría llevar un
// ayudante, si lo que quieres construir merece acordarse antes de empezar. Eso
// se le pregunta, porque es quien lee lo que hay escrito y lo que le pides.
function pantallaSugerencias({ ahora = [], hayAgentes }) {
  const delDisco = ahora.length
    ? ahora.map((c) => `
      <div class="entrada">
        <p class="nombre">${texto(c.texto)}</p>
        ${boton({ etiqueta: c.boton, icono: '✨', pequeno: true, accion: c.accion })}
      </div>`).join('')
    : nada('Por aquí no veo nada que arreglar ahora mismo.');

  return `
    ${migas([{ etiqueta: 'Principal', accion: { tipo: 'volver' } }, { etiqueta: 'Sugerencias' }])}
    ${bloqueAviso()}
    ${volver()}

    <div class="brujula">
      <h2>Sugerencias</h2>
      <p class="hiciste">Lo que le vendría bien a esto, mirado por los dos lados.</p>
    </div>

    <h2>Visto en la carpeta</h2>
    ${delDisco}

    <hr class="separador">
    <h2>Lo que proponga el asistente</h2>
    <p class="detalle">Mira lo que hay montado y lo que le pides, y propone. Tarda un poco.</p>
    ${boton({
      etiqueta: 'Pedirle que revise la carpeta',
      icono: '🔍',
      principal: true,
      accion: {
        tipo: 'pedir',
        prompt: [
          'Repasa esta carpeta entera y dime qué le vendría bien. Mira lo que hay montado y lo que te vengo pidiendo, y propón como mucho cinco cosas, ordenadas por lo que más me ahorraría.',
          '',
          'Mira en concreto:',
          '- Algo que te pida a menudo y que debería quedarse como comando.',
          '- Alguna habilidad que no tenga puesta y que me haría falta.',
          '- Algo que repito cada semana o cada mes y que podría llevar un agente por su cuenta, sin que yo esté delante.',
          '- Algún programa mío que todavía no está conectado y debería estarlo.',
          '- Algo que esté a medias o mal montado y convenga arreglar.',
          '- Y si lo que quiero construir es lo bastante gordo como para acordarlo antes de empezar en vez de ir haciendo.',
          '',
          'De cada una dime qué es, qué me ahorra y qué hace falta para tenerla. Y pregúntame cuál quieres que monte antes de tocar nada.',
        ].join('\n'),
      },
    })}

    ${/* Sin agentes no hay apartado de Agentes, y con él se va el botón de
          crear uno: la única puerta era una línea que decía «aparecen solos».
          Un cartel no es una puerta. Aquí se le pide al asistente que mire si
          hace falta alguno, y qué es un agente se dice en la propia frase.
          Decidir solos si «esta carpeta merece un agente» no: eso no se lee
          del disco, y lo que no se puede calcular se delega (decisión 101). */''}
    ${hayAgentes ? '' : `
      <hr class="separador">
      <h2>Agentes</h2>
      <p class="detalle">Todavía no hay ninguno. Un agente es un encargo fijo que se hace solo cuando se lanza, sin que estés delante.</p>
      ${boton({
    etiqueta: 'Ver si te vendría bien un agente',
    icono: '🤖',
    accion: {
      tipo: 'pedir',
      prompt: [
        'Mira si en esta carpeta hay algo que debería llevar un agente por su cuenta: un encargo fijo que se hace solo cuando se lanza, sin que yo esté delante.',
        'Repasa lo que te vengo pidiendo, los comandos que ya hay y el diario, y dime como mucho tres cosas que se repiten y que podría llevar un agente: qué haría cada uno, cada cuánto y qué me ahorra.',
        'Si no ves ninguna, dímelo claro y no montes nada. Si ves alguna, pregúntame cuál quiero antes de escribirla.',
      ].join('\n'),
    },
  })}`}
  `;
}

// -------------------------------------------------------------- los agentes

function pantallaAgentes({ agentes = [] }) {
  return `
    ${migas([{ etiqueta: 'Principal', accion: { tipo: 'volver' } }, { etiqueta: 'Agentes' }])}
    ${bloqueAviso()}
    ${volver()}

    <div class="brujula">
      <h2>Agentes</h2>
      <p class="hiciste">Cada agente tiene un encargo fijo y lo hace por su cuenta cuando se le lanza.</p>
    </div>

    ${agentes.length
      ? agentes.map((a) => (!a.prompt
        ? sinNombreQueValga(a.nombre.charAt(0).toUpperCase() + a.nombre.slice(1), 'Su nombre no se puede usar para lanzarlo. Pídele al asistente que se lo cambie.')
        : filaDeAccion({
        etiqueta: a.nombre.charAt(0).toUpperCase() + a.nombre.slice(1),
        icono: '🤖',
        queHace: a.queHace,
        accion: { tipo: 'pedir', prompt: a.prompt },
        nombreReal: a.id || a.fichero.replace(/\.[^.]+$/, ''),
        // El encargo entero va detrás de la (i): interesa una vez, y antes
        // competía con el botón que de verdad se pulsa.
        dentro: boton({ etiqueta: 'Ver sus instrucciones', icono: '📄', pequeno: true, discreto: true, accion: { tipo: 'verAgente', fichero: a.fichero } })
          + (a.quitable ? boton({ etiqueta: 'Quitarlo', icono: '🗑️', pequeno: true, discreto: true, accion: { tipo: 'quitarAgente', fichero: a.fichero, nombre: a.nombre } }) : ''),
      }))).join('')
      : nada('Todavía no hay ninguno.')}

    <hr class="separador">
    ${boton({
      etiqueta: 'Crear un agente',
      icono: '➕',
      accion: { tipo: 'pedir', prompt: 'Quiero un agente nuevo que se encargue de algo por su cuenta. Pregúntame de qué, cada cuánto y qué tiene que hacer exactamente, y déjalo escrito.' },
    })}
  `;
}

function pantallaProyectos({ montones = [], deLosProyectos = [] }) {
  // Cómo está cada cosa llega ya dicho con el diccionario (`proyectos.comoEsta`):
  // aquí no se traduce ni se enseña nada en crudo (decisión 195).
  const losMontones = (lista) => lista.map((m) => `
      <h2>${texto(m.etiqueta)}</h2>
      <p class="detalle">${texto(m.pista)}</p>
      ${m.cosas.map((c) => `
        <div class="entrada">
          <p class="nombre">${texto(c.titulo)}</p>
          ${c.estado || c.tareas ? `<p class="pista">${texto([
            c.estado,
            c.tareas ? plural(c.tareas, '1 tarea', '{n} tareas') : '',
          ].filter(Boolean).join(' · '))}</p>` : ''}
          ${boton({ etiqueta: 'Abrirlo', icono: '▸', pequeno: true, accion: { tipo: 'verProyecto', fichero: c.fichero } })}
        </div>`).join('')}`).join('<hr class="separador">');

  // En un monorepo, lo de cada proyecto va en el suyo, plegado: con ocho proyectos
  // salían noventa documentos mezclados con los de la raíz (decisión 195).
  const porProyecto = deLosProyectos.length ? `
    ${montones.length ? '<hr class="separador">' : ''}
    <h2>Proyectos</h2>
    <p class="detalle">${texto('Lo de cada proyecto, en el suyo.')}</p>
    ${deLosProyectos.map((p) => grupo({
      id: `enQueEstamos:${p.nombre}`,
      etiqueta: p.nombre,
      cuantos: plural(p.montones.reduce((n, m) => n + m.cosas.length, 0), '1 documento', '{n} documentos'),
      dentro: losMontones(p.montones),
    })).join('')}` : '';

  return `
    ${migas([{ etiqueta: 'Principal', accion: { tipo: 'volver' } }, { etiqueta: 'En qué estamos' }])}
    ${bloqueAviso()}
    ${volver()}

    <div class="brujula">
      <h2>En qué estamos</h2>
      <p class="hiciste">Lo que se acordó construir, por qué, y cómo se va a hacer.</p>
    </div>

    ${losMontones(montones)}
    ${porProyecto}
  `;
}

// ----------------------------------------------------- la cara de la empresa

// El diseño lo hace el asistente. Esto es la puerta por la que entra el
// material: la web, el logotipo, su manual de marca, una captura de su página,
// o nada de eso y contárselo con palabras.
function pantallaLaCara({
  puesta, descartada, nombre, web, hayLogo, provisional = false, material = [], aviso: avisoLocal,
}) {
  // Si la cara la sacó la barra sola de la web, se dice: es un primer intento
  // que el asistente todavía no ha mirado, y venderlo como final sería mentir.
  const estadoAhora = descartada
    ? `<div class="aviso malo"><p>No he podido usar lo que hay: ${texto(descartada)}.</p></div>${MANDA_AL_ASISTENTE.test(descartada) ? queLoMire(`No he podido usar lo que hay para la cara de la barra: ${descartada}.`) : ''}`
    : (puesta
      ? `<p class="hiciste">Ahora mismo lleva la cara de ${texto(nombre || 'tu empresa')}${hayLogo ? ', con su logotipo' : ''}${provisional ? ', sacada de su web de forma automática; el asistente la afina' : ''}.</p>`
      : '<p class="hiciste">Ahora mismo lleva la de Executive Lab.</p>');

  return `
    ${migas([{ etiqueta: 'Principal', accion: { tipo: 'volver' } }, { etiqueta: 'El tema de mi empresa' }])}
    ${bloqueAviso(avisoLocal)}
    ${volver()}

    <div class="brujula">
      <h2>El tema de mi empresa</h2>
      ${estadoAhora}
      <p class="detalle">Los colores los saca el asistente de lo que le des. Si lo que elige no se lee bien, no se aplica: prefiero dejar la cara de siempre antes que una pantalla ilegible.</p>
    </div>

    <h2>Dale material</h2>
    ${boton({ etiqueta: web ? `Cambiar la web (${web})` : 'Decirle cuál es tu web', icono: '🌐', principal: true, accion: { tipo: 'ponerLaCara' } })}
    ${boton({ etiqueta: 'Subirle el logotipo o lo que tengas', icono: '📎', accion: { tipo: 'materialDeMarca' } })}
    <p class="detalle">El logotipo, su manual de marca, una captura de la web… o arrástralo aquí encima.</p>
    ${boton({
      etiqueta: 'Contárselo con mis palabras',
      icono: '💬',
      accion: { tipo: 'pedir', prompt: 'Quiero ponerle a esto la cara de mi empresa y no tengo web ni logotipo a mano. Pregúntame cómo es: los colores, el nombre, el aire que tiene, y déjalo montado.' },
    })}

    ${material.length ? `
      <hr class="separador">
      <h2>Lo que ya le has dado</h2>
      ${material.map((m) => `<div class="archivo"><div class="archivo-que"><p class="nombre">${texto(m)}</p></div></div>`).join('')}` : ''}

    ${puesta || descartada ? `
      <hr class="separador">
      ${boton({ etiqueta: 'Volver a la cara de siempre', icono: '↩️', discreto: true, pequeno: true, accion: { tipo: 'quitarLaCara' } })}` : ''}
  `;
}

// ------------------------------------------------- cómo quieres que trabaje

// El subapartado de personalización. Son cuatro cosas y cada una cambia el día
// a día, así que van juntas y no repartidas por la barra.
function pantallaComoTrabaja({
  permisos = [], permiso, hayPermisos = true, cadaCuanto = [], guarda,
  objetivo, metas = [], limites = [], aviso: avisoLocal,
}) {
  const elegir = (opciones, puesto, accion) => opciones.map((o) => `
    <div class="capacidad${o.id === puesto ? ' puesta' : ''}">
      <p class="nombre">${texto(o.nombre)}${o.id === puesto ? ' <span class="cuantos">ahora mismo</span>' : ''}</p>
      <p class="pista">${texto(o.frase)}</p>
      ${o.id === puesto ? '' : boton({ etiqueta: 'Ponme así', icono: '▸', pequeno: true, accion: { ...accion, cual: o.id } })}
    </div>`).join('');

  const puntos = (lista) => `<ul class="lista">${lista.map((t) => `<li>${enLinea(t)}</li>`).join('')}</ul>`;

  return `
    ${migas([{ etiqueta: 'Principal', accion: { tipo: 'volver' } }, { etiqueta: 'Cómo quieres que trabaje' }])}
    ${bloqueAviso(avisoLocal)}
    ${volver()}

    <div class="brujula">
      <h2>Cómo quieres que trabaje</h2>
      <p class="hiciste">Cuatro cosas que cambian el día a día.</p>
    </div>

    <h2>Qué puede hacer sin preguntarte</h2>
    ${hayPermisos
      ? `${elegir(permisos, permiso, { tipo: 'ponerPermiso' })}
    <p class="detalle">Vale para todas tus carpetas, no solo para esta. Si en una conversación eliges otro a mano, el editor se acuerda de ese.${permisos.some((p) => p.id === permiso) ? '' : ' Ahora tienes puesto otro que no se cambia desde aquí.'}</p>`
      : nada('Esto lo lleva tu asistente por su cuenta, en sus propios ajustes. Desde aquí no se toca.')}

    <hr class="separador">
    <h2>Cada cuánto guarda solo</h2>
    ${elegir(cadaCuanto, guarda, { tipo: 'ponerCadaCuanto' })}
    <p class="detalle">Solo mientras tengas esto abierto, y solo si hay algo nuevo. Nunca toca el historial de otra persona.</p>

    <hr class="separador">
    <h2>Para qué es esto</h2>
    ${objetivo ? `<p class="hiciste">${enLinea(objetivo)}</p>` : nada('No lo dijiste al montar la carpeta.')}
    ${metas.length ? puntos(metas) : ''}
    ${limites.length ? `<h2>Los límites que pusiste</h2>${puntos(limites)}` : ''}
    <p class="detalle">Se lo lee antes de contestarte. Si ya no es esto, díselo.</p>
    ${boton({
      etiqueta: 'Cambiar para qué es esto',
      icono: '✏️',
      accion: { tipo: 'pedir', prompt: 'Quiero repasar para qué es esta carpeta y qué límites tengo. Enséñame lo que tienes apuntado, pregúntame qué ha cambiado y déjalo al día en mi perfil.' },
    })}

    <hr class="separador">
    <h2>Cómo te habla</h2>
    ${boton({ etiqueta: 'Cuánto te explica y con qué palabras', icono: '🗣️', accion: { tipo: 'verTrato' } })}

  `;
}

// ---------------------------------------------------------- tu asistente

// Lo que dice el ajuste de todo el editor, en una línea (decisión 158).
const DEL_AJUSTE = {
  automatico: 'En los ajustes: Automático. Al preparar una carpeta uso el que tengas puesto, y si tienes los dos, te pregunto.',
  claude: 'En los ajustes: Claude. Preparo cada carpeta para Claude sin preguntarte.',
  codex: 'En los ajustes: Codex. Preparo cada carpeta para Codex sin preguntarte.',
  losDos: 'En los ajustes: Los dos. Preparo cada carpeta para Claude y para Codex.',
};

function pantallaAsistente({ ahora, ajuste = 'automatico', montada = false, cuales = [], aviso: avisoLocal }) {
  return `
    ${migas([{ etiqueta: 'Principal', accion: { tipo: 'volver' } }, { etiqueta: 'Tu asistente' }])}
    ${bloqueAviso(avisoLocal)}
    ${volver()}

    <div class="brujula">
      <h2>Tu asistente</h2>
      <p class="hiciste">El asistente al que le hablan los botones de esta barra.</p>
    </div>

    ${cuales.map((a) => `
      <div class="capacidad${a.id === ahora ? ' puesta' : ''}">
        <p class="nombre">${texto(a.nombre)}${a.id === ahora ? ' <span class="cuantos">ahora mismo</span>' : ''}</p>
        <p class="pista">${texto(a.instalado
          ? (a.mandaTexto
            ? 'Puesto en este ordenador. Los botones le mandan el texto directamente.'
            : 'Puesto en este ordenador. Los botones abren su barra y te dejan el texto copiado, porque no admite que se lo pasen.')
          : (a.enTerminal
            ? 'Lo tienes fuera del editor. Para que los botones le hablen desde aquí, ponlo también en el editor.'
            : 'No está en este ordenador.'))}</p>
        ${/* Se pone con un clic, y se vuelve aquí (decisión 166). */''}
        ${a.instalado ? '' : boton({ etiqueta: `Poner ${a.nombre}`, icono: '⬇️', pequeno: true, accion: { tipo: 'ponerElAsistente', cual: a.id, desde: 'asistente' } })}
        ${a.instalado && a.id !== ahora && !a.delArnes
          ? '<p class="pista">Esta carpeta no se montó para él: al cambiar, la preparo también para él.</p>'
          : ''}
        ${a.instalado && a.id !== ahora
          ? boton({ etiqueta: `Hablar con ${a.nombre}`, icono: '▸', pequeno: true, accion: { tipo: 'elegirAsistente', cual: a.id } })
          : ''}
        ${a.instalado && a.id === ahora && montada && !a.delArnes
          ? `<p class="pista">Esta carpeta no se montó para él.</p>${boton({ etiqueta: `Prepararla también para ${a.nombre}`, icono: '▸', pequeno: true, accion: { tipo: 'elegirAsistente', cual: a.id } })}`
          : ''}
      </div>`).join('')}

    <p class="detalle">${texto(DEL_AJUSTE[ajuste] || DEL_AJUSTE.automatico)} Lo que elijas aquí manda en esta carpeta.</p>
    ${boton({ etiqueta: 'Cambiar el ajuste', icono: '▸', pequeno: true, discreto: true, accion: { tipo: 'abrirElAjuste' } })}

    <hr class="separador">
    ${boton({
      etiqueta: 'Configurarlo',
      icono: '⚙️',
      accion: { tipo: 'pedir', prompt: 'Quiero repasar cómo estás configurado en esta carpeta: qué lees antes de contestar, qué permisos tienes y qué se ejecuta solo. Explícamelo en cristiano y dime qué me conviene cambiar.' },
    })}

  `;
}

// ------------------------------------------------------- acciones rápidas

// Qué va arriba del todo. Hasta cinco, de entre todo lo que esta carpeta sepa
// hacer: los botones que el asistente ha creado, las consultas de cada programa
// y las habilidades puestas.
function pantallaFijadas({ grupos = [], elegidas = [], tope = 5, aviso: avisoLocal }) {
  const lleno = elegidas.length >= tope;

  return `
    ${migas([{ etiqueta: 'Principal', accion: { tipo: 'volver' } }, { etiqueta: 'Acciones rápidas' }])}
    ${volver()}
    ${bloqueAviso(avisoLocal)}

    <div class="brujula">
      <h2>Acciones rápidas</h2>
      <p class="hiciste">Lo que quieras tener arriba del todo, hasta ${texto(tope)}.</p>
      <p class="detalle">${texto(elegidas.length
        ? `Llevas ${elegidas.length} de ${tope}.`
        : 'Sin elegir nada, arriba salen los botones que ha ido creando el asistente.')}</p>
    </div>

    ${grupos.length ? grupos.map((g) => `
      <h2>${texto(g.titulo)}</h2>
      ${g.cosas.map((c) => {
        const puesta = elegidas.includes(c.id);
        return `
          <div class="archivo">
            <div class="archivo-que">
              <p class="nombre">${texto(c.etiqueta)}</p>
              ${c.pista ? `<p class="pista">${texto(c.pista)}</p>` : ''}
            </div>
            <div class="archivo-acciones">
              ${puesta
                ? boton({ etiqueta: `Quitar ${c.etiqueta} de arriba`, icono: '★', pequeno: true, soloIcono: true, accion: { tipo: 'soltar', cual: c.id } })
                : boton({ etiqueta: `Poner ${c.etiqueta} arriba`, icono: '☆', pequeno: true, soloIcono: true, accion: { tipo: 'fijar', cual: c.id } })}
            </div>
          </div>`;
      }).join('')}`).join('')
      : nada('Todavía no hay nada que fijar. Según vaya habiendo botones, programas y habilidades, aparecerán aquí.')}

    ${lleno ? `<p class="detalle">${texto(`Ya tienes las ${tope}. Quita una para poner otra.`)}</p>` : ''}

  `;
}

// -------------------------------------------------------------- la ayuda

// Todo lo que sirve cuando alguien se atasca, en un sitio. Antes estaba
// repartido: el SOS en un grupo, la revisión de la carpeta en otro, y "¿y ahora
// qué hago?" en ningún sitio — que es la pregunta más frecuente de todas y no
// tenía botón.
function pantallaAyuda({ github, avisos = [], version = null, controlRemoto = null }) {
  return `
    ${migas([{ etiqueta: 'Principal', accion: { tipo: 'volver' } }, { etiqueta: 'Ayuda' }])}
    ${bloqueAviso()}
    ${volver()}

    <div class="brujula">
      <h2>Ayuda</h2>
      <p class="hiciste">Si te has atascado, empieza por aquí.</p>
    </div>

    <h2>No sé qué hacer ahora</h2>
    ${boton({
      etiqueta: 'Dime por dónde seguir',
      icono: '🧭',
      principal: true,
      accion: { tipo: 'pedir', prompt: 'Mira cómo está esto y dime por dónde seguir: qué tengo a medias, qué sería lo siguiente y por qué. Dame dos o tres opciones concretas, no una lista larga.' },
    })}
    ${boton({ etiqueta: 'Qué le vendría bien a esto', icono: '✨', accion: { tipo: 'verSugerencias' } })}
    ${boton({
      etiqueta: 'Pensemos ideas juntos',
      icono: '💡',
      accion: { tipo: 'pedir', prompt: 'Quiero que pensemos ideas juntos sobre qué más podría hacer con esto. Mira lo que ya hay montado, pregúntame lo que necesites y propón cosas que encajen con mi trabajo, no cosas genéricas.' },
    })}

    <hr class="separador">
    <h2>Algo no funciona</h2>
    ${/* Tres cosas distintas, y antes solo había dos. «Algo va mal» saca el
          informe para el tutor: sirve cuando la barra misma está rota.
          «Qué falta por montar» es la lista de piezas. Lo que faltaba es lo de
          en medio y lo más frecuente: algo no cuadra y no sabes por qué. Eso
          lo mira el asistente, con el diagnóstico de la barra delante
          (decisión 104). */''}
    ${boton({
      etiqueta: 'Resolver una incidencia',
      icono: '🩺',
      principal: true,
      accion: { tipo: 'resolverIncidencia', cual: 'contar' },
    })}
    <p class="detalle">Cuéntale qué pasa y lo repasa todo: lo que hay montado, tus conexiones y sus claves, y qué lo explica.</p>
    ${boton({ etiqueta: 'No encuentro mis conexiones', icono: '🔌', pequeno: true, discreto: true, accion: { tipo: 'resolverIncidencia', cual: 'conexiones' } })}
    ${boton({ etiqueta: 'Dice que faltan claves y las tengo', icono: '🔑', pequeno: true, discreto: true, accion: { tipo: 'resolverIncidencia', cual: 'clave' } })}
    ${boton({ etiqueta: 'No hace lo que le pido', icono: '💬', pequeno: true, discreto: true, accion: { tipo: 'resolverIncidencia', cual: 'noHace' } })}
    ${boton({ etiqueta: 'Qué falta por montar', icono: '🔎', accion: { tipo: 'verRadiografia' } })}
    ${boton({ etiqueta: 'Algo va mal', icono: '🆘', accion: { tipo: 'algoVaMal' } })}

    ${/* El control remoto lo deja puesto la barra, pero no siempre puede funcionar,
          y nadie lo decía (decisión 185). Solo con Claude puesto. */''}
    ${controlRemoto ? `
      <hr class="separador">
      <h2>Seguir desde el móvil</h2>
      <p class="detalle">Tu conversación con Claude se puede seguir desde el móvil o desde claude.ai/code. La barra lo deja activado, pero no siempre funciona.</p>
      <p class="detalle">Hace falta un plan de pago de Claude: con una clave de acceso de pago por uso no va. Si tu empresa usa Claude Team o Enterprise, quien lleva la cuenta tiene que activarlo antes. Si no te funciona, pídeselo a esa persona.</p>
      ${controlRemoto.apagado ? '<p class="detalle">Y en este ordenador está apagado: tiene desactivado el envío de datos no esenciales de Claude, y con eso el control remoto no se puede usar. Dile a quien te instaló esto que lo quite.</p>' : ''}` : ''}

    <hr class="separador">
    ${/* Lo que falla, lo que no se entiende y lo que se echa en falta, para
          quien hace la barra (decisión 131). Aquí están también los que
          esperan: los que preparó el asistente, los que apuntó la barra al
          fallar y los que no se pudieron mandar. */''}
    <h2>Mejorar esta barra</h2>
    ${boton({ etiqueta: 'Contárselo a Executive Lab', icono: '📣', accion: { tipo: 'verContar' } })}
    <p class="detalle">Un fallo, algo que no se entiende o una idea. Lo lee quien hace esta barra.</p>
    ${avisos.length ? `
      <p class="detalle">${texto(plural(avisos.length, 'Tienes 1 aviso sin mandar:', 'Tienes {n} avisos sin mandar:'))}</p>
      ${avisos.map((a) => boton({
        etiqueta: a.origen === 'barra' ? 'Un botón de la barra ha fallado por dentro' : a.titulo,
        icono: '✉️',
        pequeno: true,
        discreto: true,
        accion: { tipo: 'verElAviso', fichero: a.fichero },
      })).join('')}` : ''}

    <hr class="separador">
    <h2>Guías</h2>
    ${boton({
      etiqueta: github && github.conectado ? 'Cómo funciona lo de GitHub' : 'Cómo entrar en GitHub',
      icono: '☁️',
      accion: { tipo: 'verCopiaFuera' },
    })}
    ${boton({
      etiqueta: 'Explícame cómo funciona esto',
      icono: '📖',
      accion: { tipo: 'pedir', prompt: 'Explícame de cero cómo funciona esto: qué es esta carpeta, qué haces tú, qué hago yo, y qué gano. Sin palabras técnicas y con ejemplos de mi trabajo.' },
    })}
    ${boton({ etiqueta: 'Si trabajas con datos de clientes', icono: '🔒', accion: { tipo: 'verDatosDeClientes' } })}
    ${/* Qué barra es esta, y si hay otra. Sale aunque la de la principal se
          apartara con «Ahora no»: aquí es donde se viene a buscarla. */''}
    ${version && version.esta ? `
      <hr class="separador">
      <h2>Esta barra</h2>
      ${loDeLaVersion(version)}` : ''}

  `;
}

// ── Esta barra: la versión, y lo que se hace con ella ────────────────────
//
// Lo enseñan Ayuda y su pantalla, a la que lleva «Barra 0.53.0» de abajo de la
// principal. Ese botón abría Más ayuda, y lo que prometía la propuesta de la barra
// sencilla era esto: Actualizar ahora y Probar las versiones nuevas antes
// (decisión 166).
function loDeLaVersion(version) {
  return `
      ${version.nueva && version.puesta === version.nueva ? `
        <p class="detalle">${texto(`Ya está puesta la ${version.nueva}. Recarga la ventana para empezar a usarla: no se pierde nada.`)}</p>
        ${boton({ etiqueta: 'Recargar ahora', icono: '🔄', accion: { tipo: 'recargar' } })}` : (version.nueva ? `
        <p class="detalle">${texto(version.deprueba ? `Tienes la ${version.esta}. Hay una de prueba más nueva: la ${version.nueva}.` : `Tienes la ${version.esta}. Hay una más nueva: la ${version.nueva}.`)}</p>
        ${boton({ etiqueta: 'Actualizar ahora', icono: '⬆️', accion: { tipo: 'ponerLaNueva' } })}` : `
        <p class="detalle">${texto(`Tienes la ${version.esta}.`)}</p>`)}
      ${/* Se pone al día sola, de fábrica; quien quiera, que pregunte antes
            (decisión 136). */''}
      ${version.sola ? `
        <p class="detalle">Se pone al día sola: cuando hay una versión nueva, la baja, la comprueba y la deja puesta.</p>
        ${boton({ etiqueta: 'Que me pregunte antes', pequeno: true, discreto: true, accion: { tipo: 'actualizarSola', cual: false } })}` : `
        ${boton({ etiqueta: 'Que se ponga al día sola', icono: '🔄', pequeno: true, discreto: true, accion: { tipo: 'actualizarSola', cual: true } })}`}
      ${/* Quien quiera, recibe también las de prueba: así el freno de la
            prerelease lo prueba alguien antes de llegar a todos (decisión 134). */''}
      ${version.probarAntes ? `
        <p class="detalle">Te llegan las versiones de prueba antes que a nadie.</p>
        ${boton({ etiqueta: 'Dejar de probarlas antes', pequeno: true, discreto: true, accion: { tipo: 'probarAntes', cual: false } })}` : `
        ${boton({ etiqueta: 'Probar las versiones nuevas antes', icono: '🧪', pequeno: true, discreto: true, accion: { tipo: 'probarAntes', cual: true } })}
        <p class="detalle">Te llegan antes que a nadie, para ver si van bien. Alguna puede fallar.</p>`}`;
}

function pantallaEstaBarra({ version = null } = {}) {
  return `
    ${migas([{ etiqueta: 'Principal', accion: { tipo: 'volver' } }, { etiqueta: 'Esta barra' }])}
    ${bloqueAviso()}
    ${volver()}

    <div class="brujula">
      <h2>Esta barra</h2>
    </div>
    ${version && version.esta ? loDeLaVersion(version) : ''}

    <hr class="separador">
    ${boton({ etiqueta: 'Más ayuda', icono: '🆘', pequeno: true, discreto: true, accion: { tipo: 'verAyuda' } })}
  `;
}

// Si trabajas con datos de clientes (decisión 153). Es para leer: la licencia y los
// ajustes de su cuenta son suyos. Todo sale de `media/datos-de-clientes.json`,
// comprobado en las páginas de Anthropic y OpenAI; aquí solo se pinta. Cada
// enlace, a la página de ajustes de su asistente o a lo que dicen ellos.
// Una línea con un interruptor de un clic (decisión 185): «Que Claude solo vea lo que
// le pegues». Dice cómo está y el botón hace lo contrario. Los dos rótulos salen de su tabla.
function interruptorDeLinea(linea, puesto) {
  if (linea.interruptor !== 'soloLoPegado') return '';
  return puesto
    ? `<p class="detalle">${texto(linea.puesto || '')}</p>${boton({ etiqueta: linea.botonQuitar, icono: '👁️', pequeno: true, discreto: true, accion: { tipo: 'soloLoQueLePegues', cual: false } })}`
    : boton({ etiqueta: linea.botonPoner, icono: '🙈', pequeno: true, accion: { tipo: 'soloLoQueLePegues', cual: true } });
}

function pantallaDatosDeClientes({ titulo = '', entradilla = '', partes = [], pie = '', fuentes = [], soloLoPegado = false } = {}) {
  const enlace = (etiqueta, url, extra = {}) => (etiqueta && url
    ? boton({ etiqueta, icono: '↗', pequeno: true, ...extra, accion: { tipo: 'abrir', url } }) : '');
  return `
    ${migas([{ etiqueta: 'Principal', accion: { tipo: 'volver' } }, { etiqueta: 'Ayuda', accion: { tipo: 'verAyuda' } }, { etiqueta: titulo }])}
    ${bloqueAviso()}
    ${volver({ tipo: 'verAyuda' })}

    <div class="brujula">
      <h2>${texto(titulo)}</h2>
      <p class="hiciste">${texto(entradilla)}</p>
    </div>
    ${partes.map((parte) => `
      <hr class="separador">
      <h2>${texto(parte.titulo)}</h2>
      ${(parte.lineas || []).map((l) => `<p class="detalle">${texto(l.texto)}</p>${enlace(l.boton, l.url)}${interruptorDeLinea(l, soloLoPegado)}`).join('')}`).join('')}

    <hr class="separador">
    <p class="detalle">${texto(pie)}</p>
    ${fuentes.map((f) => enlace(f.boton, f.url, { discreto: true })).join('')}
  `;
}

// ------------------------------------------------------------- los papeles

// Un documento: su nombre, cuándo llegó (o lo que haga falta decir de él) y, a
// la derecha, abrirlo y, si nadie lo ha leído todavía, quitarlo. Lo usan
// Documentos entregados y Documentos (decisión 151); `desde` dice a cuál volver.
function filaDePapel(d, { seQuita = false, pista = '', desde = null } = {}) {
  const debajo = pista || (d.cuando ? cuando(String(d.cuando).slice(0, 10)) : '');
  return `
      <div class="archivo">
        <div class="archivo-que">
          <p class="nombre">${texto(d.nombre)}</p>
          ${debajo ? `<p class="pista">${texto(debajo)}</p>` : ''}
        </div>
        <div class="archivo-acciones">
          ${boton({ etiqueta: `Abrir ${d.nombre}`, icono: '↗', pequeno: true, soloIcono: true, accion: { tipo: 'abrirPapel', ruta: d.ruta } })}
          ${seQuita ? boton({ etiqueta: `Quitar ${d.nombre}`, icono: '×', pequeno: true, soloIcono: true, accion: { tipo: 'quitarPapel', ruta: d.ruta, nombre: d.nombre, ...(desde ? { desde } : {}) } }) : ''}
        </div>
      </div>`;
}

// ------------------------------------------- documentos, en una pantalla

// F7 del plan de simplificar la barra (decisión 151). Era un plegable con tres
// botones que llevaban a tres pantallas; ahora es una pantalla con las tres
// cosas a la vista: darle documentos, los que tiene sin leer y los resultados.
// Arrastrar sigue valiendo en toda la barra (el `drop` de arriba del todo), y
// aquí lo soltado sale enseguida en «Sin leer todavía».
//
// Lo de antes no se borra: «Documentos entregados» sigue entero en la barra
// completa, y el plegable vuelve con `documentosPlegable` en la tabla de piezas.
const QUE_LOS_LEA = 'Lee los documentos que tienes sin leer en la bandeja de entrada, guarda lo que aprendas donde toque y cuéntame en dos líneas qué has sacado.';
// El mismo encargo que en Documentos entregados.
const QUE_LOS_COLOQUE = 'Hay documentos sueltos en la carpeta, fuera de la bandeja. Míralos, ponlos donde toque y cuéntame en dos líneas qué has sacado de ellos.';

function pantallaDocumentos({ esperando = [], sueltos = [], herramientas = [], fotos = [], hayPanel = false, aviso: avisoLocal }) {
  const sinLeer = esperando.map((d) => filaDePapel(d, { seQuita: true, desde: 'documentos' })).join('');

  return `
    ${migas([{ etiqueta: 'Principal', accion: { tipo: 'volver' } }, { etiqueta: 'Documentos' }])}
    ${bloqueAviso(avisoLocal)}
    ${volver()}
    <p class="titulo">Documentos</p>

    <div class="soltar-aqui">
      <h2>Darle documentos (inbox)</h2>
      <p class="detalle">Arrástralos aquí, o a cualquier sitio de la barra.</p>
      ${boton({ etiqueta: 'Elegirlos', icono: '📎', principal: true, accion: { tipo: 'anadirDocumentos', desde: 'documentos' } })}
    </div>

    <h2>Sin leer todavía</h2>
    ${sinLeer || nada('Ninguno esperando.')}
    ${sinLeer ? boton({ etiqueta: 'Que los lea', icono: '📥', accion: { tipo: 'pedir', prompt: QUE_LOS_LEA } }) : ''}

    ${/* Los sueltos en la carpeta, aparte y con su nombre: la fila de la
          principal cuenta los de la bandeja, y aquí «Sin leer todavía» cuenta
          lo mismo (revisión de corrección, 3). Son suyos y están donde los dejó,
          así que no se quitan desde aquí (P4). */''}
    ${sueltos.length ? `
      <h2>Sin colocar todavía</h2>
      <p class="detalle">Los dejaste en la carpeta y siguen ahí fuera. Todavía no ha sacado nada de ellos.</p>
      ${sueltos.map((d) => filaDePapel(d)).join('')}
      ${boton({ etiqueta: 'Que los coloque y los lea', icono: '📥', accion: { tipo: 'pedir', prompt: QUE_LOS_COLOQUE } })}` : ''}

    <hr class="separador">
    <h2>Resultados (out)</h2>
    ${herramientas.length || fotos.length
      ? `<p class="detalle">Ábrelo para verlo, o guárdatelo donde quieras.</p>${gruposDeResultados(herramientas, fotos)}`
      : nada('Todavía no ha preparado nada para llevarse.')}
    ${boton({ etiqueta: 'La foto del cerebro', icono: '🧠', pequeno: true, accion: { tipo: 'verLaFoto', desde: 'documentos' } })}
    ${/* El panel completo que deja RSC al repasar la wiki, junto a la foto. Está
          fuera de git y muchas veces no existe: solo sale si está. En la
          sencilla, Conocimiento está apagado, y era el único sitio donde salía. */''}
    ${hayPanel ? boton({ etiqueta: 'El panel completo', icono: '🗂️', pequeno: true, accion: { tipo: 'abrirPanelCompleto', desde: 'documentos' } }) : ''}
  `;
}

// El archivador: los documentos que han entrado. NO es lo que el arnés ha
// entendido —eso son los conceptos— sino los ficheros, en los tres estados por
// los que pasan. Hasta ahora de los tres solo se veía un número.
function pantallaPapeles({
  sueltos = [], esperando = [], leidos = [], originales = [], aviso: avisoLocal,
}) {
  // Quitar solo se ofrece en los que todavía no ha leído nadie: de esos no ha
  // salido ningún concepto, así que borrar el papel lo borra de verdad. Con los
  // demás hay un botón distinto, abajo, que se lo pide al asistente.
  const monton = (papeles, vacio, seQuitan = false) => (papeles.length
    ? papeles.map((d) => filaDePapel(d, { seQuita: seQuitan })).join('')
    : nada(vacio));

  return `
    ${migas([{ etiqueta: 'Principal', accion: { tipo: 'volver' } }, { etiqueta: 'Documentos entregados' }])}
    ${bloqueAviso(avisoLocal)}
    ${volver()}

    <div class="brujula">
      <h2>Documentos entregados</h2>
      <p class="hiciste">Los documentos que han entrado aquí. Lo que ha entendido de ellos está en Conocimiento, y lo que ha producido él, en Resultados (out).</p>
    </div>

    ${cajaDeBusqueda('papeles')}

    ${boton({ etiqueta: 'Darle documentos (inbox)', icono: '📎', principal: true, accion: { tipo: 'anadirDocumentos' } })}

    ${sueltos.length ? `
      <h2>Sin colocar todavía</h2>
      <p class="detalle">Los dejaste en la carpeta y siguen ahí fuera. Todavía no ha sacado nada de ellos.</p>
      ${monton(sueltos, '', true)}
      ${boton({
        etiqueta: 'Que los coloque y los lea',
        icono: '📥',
        accion: { tipo: 'pedir', prompt: QUE_LOS_COLOQUE },
      })}
      <hr class="separador">` : ''}

    <h2>Sin leer todavía</h2>
    ${monton(esperando, 'Ninguno esperando.', true)}

    <hr class="separador">
    <h2>Ya leídos</h2>
    ${monton(leidos, 'Todavía no ha leído ninguno.')}

    <hr class="separador">
    <h2>Originales guardados</h2>
    <p class="detalle">Tal y como llegaron. Esto no se borra nunca.</p>
    ${monton(originales, 'Ninguno guardado todavía.')}

    ${/* Aquí no borramos nosotros: de estos papeles ya salieron conceptos, y
          quitar el papel dejando lo aprendido es justo lo que quien lo quita
          quería evitar. El asistente sí sabe qué se llevó de cada uno. */''}
    <hr class="separador">
    ${boton({
      etiqueta: 'Quitar algo que ya ha leído',
      icono: '🗑️',
      discreto: true,
      accion: { tipo: 'pedir', prompt: 'Quiero quitar un documento que ya has leído. Pregúntame cuál, dime antes qué has aprendido de él y qué conceptos se quedarían cojos, y cuando te diga que sí, quita el documento y lo que salió solo de él.' },
    })}

  `;
}

// -------------------------------------------------- preguntas sin contestar

// Lo que el arnés sabe que no sabe: `gaps.md`. Estaba enterrado al final de la
// pantalla de conceptos, detrás de todo lo demás, que es donde no lo ve nadie.
// Y es de lo más accionable que hay aquí: cada línea se pulsa y se le cuenta.
function pantallaHuecos({ huecos = [] }) {
  return `
    ${migas([{ etiqueta: 'Principal', accion: { tipo: 'volver' } }, { etiqueta: 'Preguntas sin contestar' }])}
    ${bloqueAviso()}
    ${volver()}

    <div class="brujula">
      <h2>Preguntas sin contestar</h2>
      <p class="hiciste">Cosas que ha visto que le faltan. Pulsa cualquiera para contársela.</p>
    </div>

    ${huecos.length
      ? huecos.map((h) => boton({
        etiqueta: h,
        icono: '?',
        accion: { tipo: 'pedir', prompt: `Quiero contarte lo que te falta saber: ${h}. Pregúntame lo que necesites y guárdalo.` },
      })).join('')
      : nada('Ninguna por ahora. Según vaya leyendo cosas irán saliendo.')}

  `;
}

// ------------------------------------------------------ qué se ha hecho aquí

// El arnés lleva un diario y no lo veía nadie. Dos cosas, y la segunda es la
// que vale dinero: lo que se hizo cada día, y lo que se decidió y por qué.
function pantallaDiario({ sesiones = [], decisiones = [], aprendido = [] }) {
  const trabajo = sesiones.length
    ? sesiones.map((s) => `
        <div class="entrada">
          <p class="cuando">${texto(cuando(s.fecha))}</p>
          <p class="nombre">${enLinea(s.titulo)}</p>
          ${s.resumen && s.resumen !== s.titulo ? `<p class="pista">${enLinea(s.resumen)}</p>` : ''}
          ${boton({ etiqueta: 'Abrirlo', icono: '▸', pequeno: true, accion: { tipo: 'verSesion', fichero: s.fichero } })}
        </div>`).join('')
    : nada('Todavía no hay nada anotado. Se escribe solo cuando termináis de trabajar en algo.');

  // Una decisión sin el porqué es media decisión: a los tres meses, el porqué
  // es lo único que hace falta.
  const acordado = decisiones.length
    ? decisiones.map((d) => `
        <div class="entrada">
          ${d.fecha ? `<p class="cuando">${texto(cuando(d.fecha))}</p>` : ''}
          <p class="nombre">${enLinea(d.titulo)}</p>
          ${d.eleccion ? `<p class="pista">${enLinea(d.eleccion)}</p>` : ''}
          ${d.porque ? `<p class="detalle">Porque ${enLinea(d.porque.charAt(0).toLowerCase() + d.porque.slice(1))}</p>` : ''}
        </div>`).join('')
    : nada('Todavía no hay ninguna apuntada.');

  return `
    ${migas([{ etiqueta: 'Principal', accion: { tipo: 'volver' } }, { etiqueta: 'El diario' }])}
    ${bloqueAviso()}
    ${volver()}

    <div class="brujula">
      <h2>El diario</h2>
      <p class="hiciste">Lo que fuisteis haciendo, y lo que decidisteis por el camino. Se apunta solo.</p>
    </div>

    <h2>Días de trabajo</h2>
    ${trabajo}

    <hr class="separador">
    <h2>Decisiones</h2>
    ${acordado}

    ${/* Sale de `log.md`, que es el registro de operaciones del arnés. Estaba
          en la pantalla de documentos, que no es su sitio: es diario. */''}
    ${aprendido.length ? `
      <hr class="separador">
      <h2>Lo último que ha anotado</h2>
      <ul class="lista">
        ${aprendido.map((a) => `<li>${texto(a.titulo)}<span class="cuando">${texto(cuando(a.fecha))}</span></li>`).join('')}
      </ul>` : ''}

  `;
}

// ------------------------------------------------------------ cómo te habla

// Con qué palabras te habla, que solo se podía cambiar escribiéndolo en la
// conversación, cosa que no hace quien no sabe que existe. Lo guarda el arnés en
// su perfil y lo lee antes de contestar. El dial de «cuánto te explica» ya no
// está: RSC lo retiró (decisión 145). Lo que quieras que haga distinto, lo aprende
// de ti, aquí debajo.
function pantallaTrato({
  vocabularios = [], palabras, aprendido = [], comoAprende = '', aviso: avisoLocal,
}) {
  const fila = (opcion, puesta, accion) => `
    <div class="capacidad${opcion.id === puesta ? ' puesta' : ''}">
      <p class="nombre">${texto(opcion.nombre)}${opcion.id === puesta ? ' <span class="cuantos">ahora mismo</span>' : ''}</p>
      <p class="pista">${texto(opcion.frase)}</p>
      ${opcion.id === puesta ? '' : boton({ etiqueta: 'Ponme así', icono: '▸', pequeno: true, accion: { ...accion, cual: opcion.id } })}
    </div>`;

  return `
    ${migas([{ etiqueta: 'Principal', accion: { tipo: 'volver' } }, { etiqueta: 'Cómo te habla' }])}
    ${bloqueAviso(avisoLocal)}
    ${volver()}

    <div class="brujula">
      <h2>Cómo te habla</h2>
      <p class="hiciste">Se lo aplica a todo lo que te conteste, no solo aquí.</p>
    </div>

    <h2>Con qué palabras</h2>
    ${vocabularios.map((v) => fila(v, palabras, { tipo: 'ponerPalabras' })).join('')}

    <hr class="separador">
    ${/* La memoria de RSC: lecciones aprobadas una a una con `learn`. No es la
          wiki —eso es lo que sabe de tu negocio—, es cómo trabajar contigo, y
          por eso vive en esta pantalla. `lecciones.js` las leía desde hace
          tiempo y ninguna pantalla las enseñaba: era el último hueco del mapeo
          entre el arnés y la barra (decisión 101). */''}
    <h2>Lo que ha aprendido de ti</h2>
    ${aprendido.length
      ? aprendido.map((l) => `
        <div class="entrada">
          <p class="nombre">${texto(l.texto)}</p>
          <p class="pista">${texto([l.porque, l.cuando, l.donde === 'todo' ? 'Vale para todo' : 'Solo aquí'].filter(Boolean).join(' · '))}</p>
        </div>`).join('')
      : nada('Todavía nada. Cada cosa que aprende de ti la apruebas tú, una a una.')}
    ${comoAprende ? boton({ etiqueta: 'Que aprenda algo de ti', icono: '💡', pequeno: true, accion: { tipo: 'pedir', prompt: comoAprende } }) : ''}

  `;
}

// -------------------------------------------------- qué hay en esta carpeta

// Pieza por pieza, y sin esconder lo que falta. Quien abre la barra y no ve
// conexiones no sabe si es que no tiene ninguna o es que no se encuentran; esto
// lo dice con todas las letras.
// Esta pantalla listaba ocho cosas y no tenía ni un botón. Decía «se quedó a
// medias», «no lo tienes puesto», «N sin terminar» — y no se podía pulsar nada
// para ninguna. Ahora cada cosa que falta trae su salida, y la acción se coge
// **tal cual viene** de `terreno.js`: rehacerla aquí es el fallo que costó tres
// versiones (decisión 79).
function pantallaRadiografia(datos) {
  const MARCA = { si: '✓', no: '·', aMedias: '!', noAplica: '·' };

  // Al terminar de montar se entra aquí con otra cabecera: no es «qué falta»,
  // es «esto es lo que ha quedado».
  const reciénMontado = datos.origen === 'init';

  return `
    ${/* La miga dice lo mismo que el botón que trae aquí. Decía «Qué hay aquí»,
          y era el tercer nombre de la misma pantalla. */''}
    ${migas([{ etiqueta: 'Principal', accion: { tipo: 'volver' } }, { etiqueta: 'Qué falta por montar' }])}
    ${bloqueAviso()}
    ${volver()}

    <div class="brujula">
      <h2>${reciénMontado ? 'Esto es lo que ha quedado montado' : 'Qué falta por montar'}</h2>
      <p class="hiciste">${reciénMontado
        ? 'Lo que tiene una marca al lado es lo que todavía falta. Puedes dejarlo para luego.'
        : 'Todo lo que la barra enseña sale de leer esta carpeta. Esto es lo que ha encontrado.'}</p>
    </div>

    <div class="radiografia">
      ${(datos.piezas || []).map((pieza) => `
        <div class="pieza ${pieza.estado}">
          <span class="pieza-marca" aria-hidden="true">${MARCA[pieza.estado] || '·'}</span>
          <span class="pieza-nombre">${texto(pieza.nombre)}</span>
          <span class="pieza-detalle">${texto(pieza.detalle)}</span>
        </div>
        ${pieza.arreglo ? boton({
    etiqueta: pieza.arreglo.etiqueta, icono: '→', pequeno: true, accion: pieza.arreglo.accion,
  }) : ''}
        ${pieza.arreglo && pieza.ahoraNo ? boton({
    etiqueta: pieza.ahoraNo.etiqueta, pequeno: true, discreto: true, accion: pieza.ahoraNo.accion,
  }) : ''}`).join('')}
    </div>

    <hr class="separador">
    ${reciénMontado ? boton({ etiqueta: 'Empezar a trabajar', icono: '✳', principal: true, accion: { tipo: 'volver' } }) : ''}
    ${boton({ etiqueta: 'Guardar esto en un documento', icono: '📄', pequeno: true, discreto: true, accion: { tipo: 'guardarLaRevision' } })}
  `;
}

// ------------------------------------------------- la copia de fuera

// "Guardar una copia fuera" son tres cosas y se confunden entre sí: una cuenta
// donde guardar, un sitio dentro de esa cuenta, y el acto de subir. Esta
// pantalla las separa y dice en cuál estás.
//
// La guía se enseña ENTERA aunque no haga falta: quien no sabe qué es esto
// necesita entender qué va a pasar antes de pulsar, y quien ya lo sabe la
// ignora de un vistazo. Es más barato que un botón que abre un diálogo del que
// no sabes salir.
function pantallaCopiaFuera(datos) {
  const g = datos.github || {};
  const dentro = Boolean(g.conectado);
  const donde = g.remoto;

  const paso = (n, titulo, cuerpo, hecho) => `
    <div class="paso ${hecho ? 'hecho' : ''}">
      <p class="paso-titulo">${hecho ? '✓' : n} ${texto(titulo)}</p>
      <p class="paso-cuerpo">${texto(cuerpo)}</p>
    </div>`;

  return `
    ${migas([{ etiqueta: 'Principal', accion: { tipo: 'volver' } }, { etiqueta: 'La copia de fuera' }])}
    ${bloqueAviso()}
    ${volver()}

    <div class="brujula">
      <h2>Subir a GitHub</h2>
      <p class="hiciste">Lo que guardas en git vive en este ordenador. Si se rompe o se pierde, se pierde con él. Subirlo a GitHub es guardar lo mismo además en internet, en un sitio privado que solo tú ves.</p>
    </div>

    ${paso(1, 'Entrar en tu cuenta',
      dentro
        ? `Ya estás dentro${g.usuario ? ` como ${g.usuario}` : ''}. No hay que hacer nada más.`
        : 'Hace falta una cuenta gratuita en GitHub, que es donde se guardan. Al pulsar, el editor abre su ventana de siempre y tú entras ahí; aquí no se escribe ninguna contraseña.',
      dentro)}

    ${paso(2, 'El sitio donde se guarda',
      donde && donde.esGitHub
        ? `Ya tienes uno: ${donde.corto}. Las copias van ahí.`
        : 'Lo creo yo la primera vez, privado, con el nombre de tu carpeta. No tienes que preparar nada.',
      Boolean(donde && donde.esGitHub))}

    ${paso(3, 'Guardar',
      'Cada vez que pulses, se guarda primero aquí y después fuera. Puedes hacerlo tantas veces como quieras.',
      false)}

    ${dentro
      ? boton({ etiqueta: 'Subir a GitHub ahora', icono: '☁️', principal: true, accion: { tipo: 'subirCopia' } })
      : boton({ etiqueta: 'Entrar en mi cuenta', icono: '🔑', principal: true, accion: { tipo: 'conectarGitHub' } })}
    ${dentro ? '' : `<p class="detalle">¿No tienes cuenta? Se hace en dos minutos en github.com y es gratis.</p>
    ${boton({ etiqueta: 'Crear mi cuenta de GitHub', icono: '↗', pequeno: true, accion: { tipo: 'abrir', url: 'https://github.com/signup' } })}`}
  `;
}

// ---------------------------------------------------------------- pantallas

// El arnés puede tardar minutos, y una pantalla que solo dice "Un momento…"
// no se distingue de una que se ha colgado. A partir de ocho segundos empieza a
// contar en voz alta: no acelera nada, pero se nota vivo, que es lo que hace
// falta cuando no sabes si aquello sigue trabajando.
let relojDeEspera = null;

function pararElReloj() {
  if (relojDeEspera) {
    clearInterval(relojDeEspera);
    relojDeEspera = null;
  }
}

// Con salida. Esperar sin poder volver es un callejón: si lo de detrás tarda
// más de la cuenta —o se cuelga, que ya ha pasado— quedarse mirando no es una
// opción que nadie elija. Volver no cancela lo de detrás; solo te deja salir.
// Y con otra salida, si la espera la trae: mientras se pone git con las respuestas
// ya dadas, seguir sin copias (decisión 165).
function pantallaEsperando(que = 'Un momento…', otra = null) {
  return `
    ${nada(que)}
    <p class="cargando cuanto" data-cuanto></p>
    ${otra && otra.etiqueta && otra.accion ? boton({ etiqueta: otra.etiqueta, icono: '↷', discreto: true, accion: otra.accion }) : ''}
    ${boton({ etiqueta: 'Volver', icono: '←', discreto: true, accion: { tipo: 'volver' } })}
  `;
}

function arrancarElReloj() {
  pararElReloj();
  const desde = Date.now();
  relojDeEspera = setInterval(() => {
    const hueco = document.querySelector('[data-cuanto]');
    if (!hueco) return pararElReloj();

    const segundos = Math.round((Date.now() - desde) / 1000);
    if (segundos < 8) return undefined;
    hueco.textContent = segundos < 60
      ? `Llevo ${segundos} segundos. Sigo.`
      : `Llevo ${Math.floor(segundos / 60)} min ${segundos % 60} s. Sigo.`;
    return undefined;
  }, 1000);
}

// Falta git. No se enseña como un error —no lo es, es una pieza que no está—
// y sobre todo no se acaba en "díselo a tu tutor", que era un callejón: el
// botón la pone. Lo que pasará al pulsarlo cambia según el ordenador, así que
// el texto lo escribe la extensión (git.comoSeInstala) y aquí solo se pinta.
function bloqueFaltaGit() {
  return `
    <div class="aviso">
      <p>Falta una pieza para poder guardar tu trabajo.</p>
      <p>${texto(estado.comoSeInstalaGit || '')}</p>
    </div>
    ${boton({ etiqueta: 'Ponerla ahora', icono: '⬇️', principal: true, accion: { tipo: 'instalarGit' } })}
  `;
}

// Lo que se ha encontrado en una carpeta que ya es de alguien. Se enseña ANTES
// de ofrecer el botón, porque quien lo pulsa tiene derecho a saber sobre qué lo
// está pulsando. Y se promete lo que el código cumple: antes de montar se
// enseña qué de lo suyo toca el arnés y no se monta sin su sí (B4), y el
// historial de esa persona no se escribe (terreno.js). Decía «No voy a tocar
// nada de esto», y el arnés sí toca: su `.gitignore`, sus ajustes, y una
// habilidad suya que se llame como una del arnés.
function bloqueYaEmpezada() {
  const y = estado.yaEmpezada;
  const visto = [];
  if (y.parece) visto.push(`Parece ${y.parece}`);
  visto.push(plural(y.cuantos, '1 cosa dentro', '{n} cosas dentro'));
  if (y.conHistorial) visto.push('con su propio historial');
  if (y.sinGuardar) visto.push(plural(y.sinGuardar, '1 cambio sin guardar', '{n} cambios sin guardar'));
  if (y.claves) visto.push(plural(y.claves, '1 clave suelta', '{n} claves sueltas'));

  return `
    <div class="aviso">
      <p>${texto(visto.join(' · '))}</p>
      <p>Antes de tocar nada te enseño qué cambia, y no se monta sin tu sí.${y.conHistorial ? ' Tu historial lo dejo como está.' : ''}</p>
    </div>
    ${boton({ etiqueta: 'Añadir el asistente a esto', icono: '✳', principal: true, accion: { tipo: 'arrancar' } })}
  `;
}

// La carpeta personal, la raíz o una del sistema: aquí no se prepara nada, y la
// salida es una carpeta nueva dentro de la personal (B1). Los textos los
// escribe la extensión, que es donde se decide.
function pantallaNoSePrepara() {
  return `
    ${bloqueAviso()}
    ${lineaDeVarias()}
    <div class="brujula">
      <h2>Lo último</h2>
      <p class="donde">${texto(estado.donde)}</p>
      <p class="hiciste">${texto(estado.aviso)}</p>
    </div>
    ${boton({ etiqueta: estado.boton, icono: '📁', principal: true, accion: { tipo: 'crearCarpeta' } })}
    ${boton({ etiqueta: 'Elegir otra carpeta', icono: '📂', discreto: true, accion: { tipo: 'elegirCarpeta' } })}
  `;
}

// Falta git y la barra lo puede poner sola (decisión 165). Se ofrece preparar la
// carpeta igual, y debajo, en una línea, que pulsar también lo pone: ese clic es
// el sí de instalarlo (P9), y mientras se pone se hacen las preguntas. Antes
// salía «Ponerla ahora» en su lugar, y luego había que pulsar Preparar.
// Mientras se está poniendo no hay botón que pulsar: lo dice y ya.
const PONIENDO_GIT = {
  conLasRespuestas: 'Estoy poniendo git. En cuanto esté, preparo la carpeta con tus respuestas.',
  solo: 'Estoy poniendo git. En cuanto esté, puedes preparar la carpeta.',
};

function lineaDeGit() {
  // Con las respuestas guardadas no queda nada que preguntar: lo dice el aviso.
  if (!estado.faltaGit || !estado.gitAlPreparar || estado.esperandoAGit) return '';
  return `<p class="detalle">${texto(estado.gitAlPreparar)}</p>`;
}

// Lo que ya se contestó y esperaba a git (decisión 165): no se vuelve a
// preguntar, y se dice. Sin git, además, se puede seguir sin copias: es la
// salida de quien no puede ponerlo (P1).
function loYaContestado() {
  if (!estado.esperandoAGit) return '';
  return `<p class="detalle">Tus respuestas están guardadas: no te las vuelvo a preguntar.</p>
    ${estado.faltaGit ? boton({ etiqueta: 'Seguir sin copias', icono: '↷', discreto: true, accion: { tipo: 'seguirSinCopias' } }) : ''}`;
}

// Carpeta sin arnés: no está rota, es que aún no se ha montado. Si falta git y
// la barra no puede ponerlo sola, no se ofrece prepararla: sin él la
// preparación aborta a mitad, y enseñar un botón que no puede funcionar es peor
// que no enseñarlo.
function pantallaSinArnes() {
  if (estado.noSePrepara) return pantallaNoSePrepara();
  // Una carpeta a medio montar no se «prepara», se termina: decirle otra cosa
  // le haría pensar que va a empezar de cero y a perder lo que ya hay. Tampoco
  // una con las respuestas guardadas (decisión 165).
  const terminar = estado.aMedioPreparar || estado.esperandoAGit;
  // Parte de una carpeta ya preparada (decisión 195): abrir esa, y prepararla igual detrás.
  const ofrecer = estado.parteDe ? `
    ${boton({ etiqueta: `Abrir «${estado.parteDe.nombre}»`, icono: '📂', principal: true, accion: { tipo: 'abrirLaDeArriba' } })}
    ${boton({ etiqueta: 'Prepararla igual', icono: '✳', discreto: true, accion: { tipo: 'arrancar' } })}`
    : estado.yaEmpezada && !estado.esperandoAGit
    ? bloqueYaEmpezada()
    : boton({
      etiqueta: terminar ? 'Terminar de prepararla' : 'Preparar esta carpeta',
      icono: '✳',
      principal: true,
      accion: { tipo: 'arrancar' },
    });
  let loQueToca = `${ofrecer}${lineaDeGit()}${loYaContestado()}`;
  if (estado.faltaGit && estado.poniendoGit) {
    // Esperando con lo contestado, también aquí se puede dejar de esperar.
    loQueToca = `<p class="detalle">${texto(PONIENDO_GIT[estado.poniendoGit] || PONIENDO_GIT.solo)}</p>
      ${estado.poniendoGit === 'conLasRespuestas' && estado.esperandoAGit ? boton({ etiqueta: 'Seguir sin copias', icono: '↷', discreto: true, accion: { tipo: 'seguirSinCopias' } }) : ''}`;
  } else if (estado.faltaGit && !estado.sigueSinCopias && !estado.gitAlPreparar) {
    // Sin git, lo primero es ponerlo; salvo si ya eligió seguir sin copias
    // (decisión 164): entonces se prepara sin ellas.
    loQueToca = bloqueFaltaGit();
  }

  // «Lo último» encabezaba también una carpeta vacía, donde no hay nada que
  // contar (decisión 164): solo sale si ya había algo.
  const hayAlgo = Boolean(estado.yaEmpezada || estado.aMedioPreparar);
  return `
    ${bloqueAviso()}
    ${lineaDeVarias()}
    <div class="brujula">
      ${hayAlgo ? '<h2>Lo último</h2>' : ''}
      <p class="donde">${texto(estado.donde)}</p>
      <p class="hiciste">${texto(estado.aviso)}</p>
    </div>
    ${loQueToca}
    ${/* La lista de piezas solo se alcanzaba desde pantallas que exigen tener
          el arnés montado — o sea, nunca cuando hace falta. Aquí es donde
          alguien se pregunta qué pasa. */''}
    ${boton({ etiqueta: 'Qué falta por montar', icono: '🔎', pequeno: true, discreto: true, accion: { tipo: 'verRadiografia' } })}
    ${boton({ etiqueta: 'Elegir otra carpeta', icono: '📂', discreto: true, accion: { tipo: 'elegirCarpeta' } })}
  `;
}

// Sin carpeta abierta no hay nada que enseñar salvo la puerta de entrada.
function pantallaSinCarpeta() {
  return `
    ${bloqueAviso()}
    <div class="brujula">
      <h2>Por dónde empezamos</h2>
      <p class="donde">Elige con qué quieres trabajar</p>
      <p class="hiciste">Una carpeta cualquiera: la contabilidad, el personal, un proyecto. Si no tienes ninguna, te creo una nueva. Si está vacía, la preparo.</p>
    </div>
    ${boton({ etiqueta: 'Elegir una carpeta', icono: '📂', principal: true, accion: { tipo: 'elegirCarpeta' } })}
    ${boton({ etiqueta: 'Crear una carpeta nueva', icono: '📁', discreto: true, accion: { tipo: 'crearCarpeta' } })}
  `;
}

// ── La principal ────────────────────────────────────────────────────────
//
// Dos pantallas (decisión 138). La sencilla, que es la de todos: arriba una sola
// tarjeta con lo que toca; debajo Documentos, Acciones (solo lo que hay) y
// Ayuda; la línea de las copias, si las hay; y abajo, en pequeño, la versión y
// Cambiar de carpeta. Y la completa de antes, entera, con
// `executiveLab.barraCompleta`. Un estado que no dice cuál —el de una prueba
// que pinta a mano— es la completa, como hasta ahora.
function pantallaPrincipal() {
  if (!estado) return pantallaEsperando();
  if (estado.sinCarpeta) return pantallaSinCarpeta();
  if (estado.sinArnes) return pantallaSinArnes();
  return estado.barraCompleta === false ? pantallaPrincipalSencilla() : pantallaPrincipalCompleta();
}

// Una pieza sale si la tabla la enciende.
const encendida = (id) => Boolean(estado && estado.piezas && estado.piezas[id] === true);

function pantallaPrincipalSencilla() {
  const t = lasTarjetas();
  // Una sola, la que toca, por este orden: lo que impide trabajar, lo que acaba
  // de pasar y lo que se puede dejar para luego. Con «Ahora no» o «Entendido»
  // sale la siguiente. Apagada la pieza, salen todas, como en la completa.
  const recargar = estado.versionPuesta && estado.versionPuesta === estado.hayVersionNueva;
  const enOrden = [
    // Sin git, arriba; salvo si eligió seguir sin copias: entonces está en
    // Sugerencias, con su botón, y no tapa lo demás (decisión 164).
    estado.faltaGit && !estado.sigueSinCopias ? bloqueFaltaGit() : '',
    t.sinAsistente, t.primerPaso, t.sinAjustar,
    t.elRecordatorio,
    recargar ? t.versionNueva : '',
    // Las claves, después de lo urgente y antes que todo lo demás (decisión 167).
    t.lasClavesEnLasCopias, t.lasClavesFueraDeSitio,
    t.losDatos,
    // Lo de Codex, junto a lo demás que pide un gesto una vez (decisión 178).
    t.losEnganchesDeCodex,
    t.loNuevo, t.laCostumbre, t.loQueParece,
    // Lo de la última vez, al empezar el día (decisión 160): detrás de lo que impide
    // trabajar, de lo que toca a esta hora, de los datos de clientes y de lo que
    // acaba de pasar, que sale una vez; delante del consejo y de las ideas.
    t.laUltimaVez,
    t.elConsejo, t.elAvisoQueEspera, t.loQueContaste,
    recargar ? '' : t.versionNueva,
    t.laIdea,
  ].filter(Boolean);
  const tarjeta = encendida('tarjetaUnica') ? (enOrden[0] || '') : enOrden.join('');
  // Tras «Actualizar ahora» llegan el aviso y la tarjeta, los dos con «Recargar
  // ahora». Si la tarjeta ya lo dice, el aviso sobra; si delante hay otra que
  // va antes, el aviso se queda, para que «Recargar ahora» no desaparezca.
  const seVeLaDeRecargar = Boolean(recargar && t.versionNueva && tarjeta.includes(t.versionNueva));
  const repetido = seVeLaDeRecargar && aviso && aviso.boton && aviso.boton.accion && aviso.boton.accion.tipo === 'recargar';

  const descubiertos = accionesDescubiertas
    .map((a, i) => boton({ etiqueta: a.etiqueta, icono: a.icono, principal: i === 0, accion: a.accion }))
    .join('');

  return `
    ${repetido ? '' : bloqueAviso()}
    ${lineaDeVarias()}
    ${encendida('pulso') && pulso.length ? `<p class="pulso">${texto(pulso.join(' · '))}</p>` : ''}
    ${tarjeta}
    ${encendida('accionesRapidas') ? accionesRapidas(descubiertos) : ''}
    ${encendida('documentos') ? filaDeDocumentos() : ''}
    ${encendida('documentosPlegable') ? grupoDocumentosSencillo() : ''}
    ${encendida('conocimiento') ? grupoConocimiento() : ''}
    ${encendida('acciones') ? grupoAccionesSencillo() : ''}
    ${encendida('enQueEstamos') ? grupoEnQueEstamos() : ''}
    ${encendida('proyectos') ? grupoProyectosDeDentro() : ''}
    ${encendida('ayuda') ? grupoAyudaSencillo() : ''}
    ${encendida('ajustes') ? grupoAjustes() : ''}
    ${encendida('copias') ? lineaDeLasCopias() : ''}
    ${encendida('pie') ? pieDeLaBarra() : ''}
  `;
}

// Documentos, en una pantalla (F7, decisión 151): una fila como las otras, que
// en vez de desplegarse abre su pantalla, con cuántos esperan al lado. El rótulo
// es el título de lo que abre.
function filaDeDocumentos() {
  const cuantos = estado.esperando ? plural(estado.esperando, '1 sin leer', '{n} sin leer') : '';
  return `
    <button class="fila-de-pantalla" data-accion="${atributo(JSON.stringify({ tipo: 'verDocumentos' }))}">
      <span class="texto">Documentos</span>
      ${cuantos ? `<span class="cuantos">${texto(cuantos)}</span>` : ''}
    </button>`;
}

// Documentos, como estaba en la F2: plegable, con los tres botones. Apagado en
// la tabla (`documentosPlegable`) desde la F7, no borrado.
function grupoDocumentosSencillo() {
  return grupo({
    id: 'sencilla:documentos',
    etiqueta: 'Documentos',
    cuantos: estado.esperando ? plural(estado.esperando, '1 sin leer', '{n} sin leer') : '',
    abiertoDeEntrada: !estado.sabe && !estado.conectados,
    dentro: `
      ${boton({ etiqueta: 'Darle documentos (inbox)', icono: '📎', pequeno: true, accion: { tipo: 'anadirDocumentos' } })}
      ${boton({ etiqueta: 'Documentos entregados', icono: '📁', pequeno: true, accion: { tipo: 'verPapeles' } })}
      ${boton({ etiqueta: 'Resultados (out)', icono: '📤', pequeno: true, accion: { tipo: 'verSalidas' } })}`,
  });
}

// Acciones: solo lo que hay. Conexiones sale siempre, porque desde ella se
// conecta la primera; lo demás, cuando exista.
function grupoAccionesSencillo() {
  return grupo({
    id: 'sencilla:acciones',
    etiqueta: 'Acciones',
    cuantos: estado.conectados ? plural(estado.conectados, '1 programa', '{n} programas') : '',
    dentro: `
      ${boton({ etiqueta: 'Conexiones (tools)', icono: '🔌', pequeno: true, accion: { tipo: 'verConexiones' } })}
      ${boton({ etiqueta: 'Conectar algo nuevo', icono: '➕', pequeno: true, accion: CONECTAR_ALGO_NUEVO })}
      ${/* Los comandos son habilidades (decisión 141): salen dentro de
            Habilidades. La fila de Comandos queda apagada en la tabla, no borrada. */''}
      ${encendida('comandos') && estado.comandos ? boton({ etiqueta: 'Comandos', icono: '🔖', pequeno: true, accion: { tipo: 'verComandos' } }) : ''}
      ${estado.habilidades || estado.comandos ? boton({ etiqueta: 'Habilidades (skills)', icono: '✨', pequeno: true, accion: { tipo: 'verSaberes' } }) : ''}
      ${estado.hayRecordatorios ? boton({ etiqueta: 'Recordatorios', icono: '🕑', pequeno: true, accion: { tipo: 'verRecordatorios' } }) : ''}
      ${estado.hayAgentes ? boton({ etiqueta: 'Agentes', icono: '🤖', pequeno: true, accion: { tipo: 'verAgentes' } }) : ''}`,
  });
}

// Por dónde ibas, si hay algo en marcha (decisión 160). La frase y el encargo los
// arma la extensión, que es quien lee el disco: aquí se pintan tal cual (P6).
const porDondeIbas = () => {
  const ibas = estado && estado.ibasPor;
  return ibas && ibas.texto && ibas.accion ? ibas : null;
};

// «Volver a la última conversación» (decisión 191): solo si la extensión dice que
// sabe cuál fue. La acción viene hecha de allí (P6): aquí no hay id.
const botonVolver = (pequeno) => {
  const v = estado && estado.volverALaUltima;
  return v && v.accion ? boton({ etiqueta: 'Volver a la última conversación', icono: '💬', pequeno, accion: v.accion }) : '';
};

// Ayuda, para cuando no se sabe ni qué escribir. Lo demás de Ayuda sigue entero
// detrás de «Más ayuda».
function grupoAyudaSencillo() {
  // Sin nada en marcha, «Seguir donde lo dejé» se queda como estaba (P1).
  const ibas = porDondeIbas();
  return grupo({
    id: 'sencilla:ayuda',
    etiqueta: 'Ayuda',
    dentro: `
      ${boton({ etiqueta: 'Seguir donde lo dejé', icono: '↩️', pequeno: true, accion: ibas ? ibas.accion : { tipo: 'pedir', prompt: 'Sigue donde lo dejamos la última vez: mira lo último que hicimos, dime en qué punto estamos y qué sería lo siguiente.' } })}
      ${ibas ? `<p class="pista ibas-por">${texto(ibas.texto)}</p>` : ''}
      ${botonVolver(true)}
      ${boton({ etiqueta: 'Conversación nueva', icono: '💬', pequeno: true, accion: { tipo: 'conversacionNueva' } })}
      ${boton({ etiqueta: 'Dime qué hago ahora', icono: '🧭', pequeno: true, accion: { tipo: 'pedir', prompt: 'Mira cómo está esto y dime qué hago ahora: qué tengo a medias, qué sería lo siguiente y por qué. Dame dos o tres opciones concretas, no una lista larga.' } })}
      ${boton({ etiqueta: 'Pedir ayuda en el foro', icono: '🙋', pequeno: true, accion: { tipo: 'pedirAyudaEnElForo' } })}
      ${boton({ etiqueta: 'Sugerencias', icono: '✨', pequeno: true, accion: { tipo: 'verSugerencias' } })}
      ${boton({ etiqueta: 'Si trabajas con datos de clientes', icono: '🔒', pequeno: true, accion: { tipo: 'verDatosDeClientes' } })}
      ${boton({ etiqueta: 'Más ayuda', icono: '🆘', pequeno: true, discreto: true, accion: { tipo: 'verAyuda' } })}`,
  });
}

// «✓ Todo guardado»: solo si la carpeta tiene copias. Ver que todo está
// guardado quita el miedo; dentro, lo de git.
//
// En un monorepo, los proyectos de dentro tienen su propio git: «Todo guardado»
// vale para todos, y uno con cambios lleva aquí su botón (decisión 195).
function lineaDeLasCopias() {
  const c = estado.copias;
  if (!c) return '';
  const deDentro = c.proyectosSinGuardar || [];
  const soloDentro = deDentro.length && c.raizSinGuardar === false;
  const enCual = deDentro.length === 1 ? `en «${deDentro[0].nombre}»` : `en ${deDentro.length} proyectos`;
  return grupo({
    id: 'grupo:copias',
    // `null`: no se ha podido mirar. No se dice «Todo guardado» sin saberlo (decisión 189).
    etiqueta: c.sinGuardar === null ? 'No he podido mirar si hay cambios sin guardar'
      : soloDentro ? `Hay cambios sin guardar ${enCual}`
        : c.sinGuardar ? 'Hay cambios sin guardar' : `✓ Todo guardado, ${c.hace}`,
    dentro: `
      ${boton({ etiqueta: 'Guardar en git', icono: '💾', pequeno: true, accion: { tipo: 'guardarCopia' } })}
      ${deDentro.filter((p) => p.boton).map((p) => boton({ ...p.boton, pequeno: true })).join('')}
      ${boton({ etiqueta: 'Ver las copias guardadas', icono: '🕑', pequeno: true, accion: { tipo: 'verCopias' } })}
      ${c.subir ? boton({ etiqueta: 'Subir a GitHub', icono: '☁️', pequeno: true, accion: { tipo: 'verCopiaFuera' } }) : ''}
      ${deDentro.length ? `<p class="pista">${texto('Cada proyecto se guarda aparte, con su botón. «Guardar en git» guarda el resto de la carpeta.')}</p>` : ''}`,
  });
}

// Los proyectos de dentro de un monorepo (decisión 195), solo si los hay: cómo
// está cada uno y sus botones, que llegan hechos (P6).
function grupoProyectosDeDentro() {
  const lista = estado.proyectosDeDentro || [];
  if (!lista.length) return '';
  const sinGuardar = lista.filter((p) => p.sinGuardar === true).length;
  return grupo({
    id: 'grupo:proyectos-de-dentro',
    etiqueta: 'Proyectos',
    cuantos: sinGuardar ? plural(sinGuardar, '1 sin guardar', '{n} sin guardar') : '',
    // Sin confianza no se mira cómo está ninguno, y se dice una vez, con su salida (183).
    dentro: (lista.some((p) => p.sinConfianza) ? `
      <p class="pista">${texto('El editor no confía en esta carpeta, y no miro cómo está cada proyecto.')}</p>
      ${boton({ etiqueta: 'Confiar en esta carpeta', icono: '🔓', pequeno: true, accion: { tipo: 'confiarEnLaCarpeta' } })}` : '') + lista.map((p) => `
      <h3>${texto(p.nombre)}</h3>
      ${p.estado ? `<p class="pista">${texto(p.estado)}</p>` : ''}
      ${(p.botones || []).map((b) => boton({ ...b, pequeno: true })).join('')}`).join(''),
  });
}

// Abajo y en pequeño: qué barra es, y Cambiar de carpeta, que se deja a la
// vista porque con el editor en modo sencillo no hay menús.
function pieDeLaBarra() {
  return `
    <div class="fila pie">
      ${/* Lleva a lo de la versión, no a Más ayuda (decisión 166). */''}
      ${estado.versionDeLaBarra ? boton({ etiqueta: `Barra ${estado.versionDeLaBarra}`, pequeno: true, discreto: true, accion: { tipo: 'verEstaBarra' } }) : ''}
      ${boton({ etiqueta: 'Cambiar de carpeta', icono: '📂', pequeno: true, discreto: true, accion: { tipo: 'elegirCarpeta' } })}
    </div>`;
}

// La de antes, entera: la de `executiveLab.barraCompleta` (decisión 138). No se
// ha borrado nada; sus tarjetas y sus grupos son ahora piezas que también usa la
// sencilla.
function pantallaPrincipalCompleta() {
  // Cuántas conexiones y cuántas cosas sabe ya no se cuentan aquí: van en la
  // fila plegada de cada uno, que es donde se puede hacer algo con ese número.

  // Los botones no están predefinidos: son los comandos que tenga esta
  // empresa, y el asistente va creando más conforme se repiten tareas.
  //
  // La acción se coge TAL CUAL viene, sin rehacerla aquí. Rehacerla era el
  // fallo que tuvo a Jose tres versiones viendo conversaciones vacías: esto
  // ponía `prompt: a.prompt` y lo que manda `fijadas.js` es `a.accion.prompt`,
  // así que cada botón mandaba `undefined` y acabó escrito, literalmente, en
  // su caja de Claude. Y de paso convertía en 'pedir' las consultas de los
  // programas, que son 'hacerCosita' y no llevan prompt ninguno.
  const descubiertos = accionesDescubiertas
    .map((a, i) => boton({ etiqueta: a.etiqueta, icono: a.icono, principal: i === 0, accion: a.accion }))
    .join('');

  const {
    versionNueva, sinAsistente, sinAjustar, primerPaso, elConsejo, elAvisoQueEspera, loNuevo, loQueContaste, documentos,
    elRecordatorio, laCostumbre, losDatos, losEnganchesDeCodex,
  } = lasTarjetas();

  return `
    ${/* Aquí había un bloque que contaba dónde estabas y qué hiciste lo último.
          Fuera: `orient`, la habilidad que RSC trae siempre puesta, es
          exactamente eso y vive en la conversación, donde además puede
          contestar preguntas. Repetirlo aquí era ocupar lo más alto de la barra
          con algo que se pregunta mejor hablando. Lo que se queda es lo que no
          es narración: los avisos y el consejo, que llevan botón. */''}
    ${bloqueAviso()}
    ${lineaDeVarias()}
    ${pulso.length ? `<p class="pulso">${texto(pulso.join(' · '))}</p>` : ''}

    ${sinAsistente}
    ${sinAjustar}
    ${primerPaso}
    ${elRecordatorio}
    ${losDatos}
    ${losEnganchesDeCodex}
    ${loNuevo}
    ${laCostumbre}
    ${elConsejo}
    ${loQueContaste}
    ${elAvisoQueEspera}
    ${versionNueva}
    ${documentos}
    ${accionesRapidas(descubiertos)}

    ${/* Seis apartados, y el criterio es de qué van, no dónde caían: papeles ·
          lo que ha entendido · lo que ha pasado · actuar · ayuda · configurar.
          Lo de antes eran cajones —"Tu trabajo", "Ajustes y ayuda"— y por eso
          las habilidades acabaron flotando arriba sin casa. */''}
    ${grupoDocumentos()}

    ${grupoConocimiento()}

    ${grupoHistorico()}

    ${grupoEnQueEstamos()}

    ${grupoProyectosDeDentro()}

    ${grupoAccionesCompleto()}

    ${grupoAyudaCompleto()}

    ${grupoAjustes()}
  `;
}

// ── Las piezas de la principal ──────────────────────────────────────────
//
// Las usan las dos: la completa, todas y en su orden de siempre; la sencilla,
// las que diga `piezas.json` (decisión 138).

// Las tarjetas que pueden salir arriba, cada una ya pintada o vacía.
function lasTarjetas() {
  // Recién montado: lo primero es tener cuenta y sesión. Sin eso, el chat no
  // responde y el alumno se queda mirando una caja muda sin saber por qué.
  // Sin el asistente instalado, todo lo demás de esta pantalla es decorado: los
  // botones mandan texto a algo que no está. Se dice arriba del todo y en
  // cuanto pasa, no solo el primer día.
  // Hay algo mejor y quien lo usa no se ha enterado. Iba discreto y abajo, al
  // final de Ajustes, plegado: con eso no se enteraba nadie, y la barra no está
  // en la tienda del editor, que la pondría al día sola. Ahora va arriba, como el
  // consejo, con su «Ahora no»; y lo pone ella con un clic (decisión 132).
  const laNueva = estado.hayVersionNueva;
  const versionNueva = !laNueva ? '' : (estado.versionPuesta === laNueva ? `
    <div class="consejo">
      <p class="que">${texto(`Ya está puesta la ${laNueva}. Recarga la ventana para empezar a usarla: no se pierde nada.`)}</p>
      ${boton({ etiqueta: 'Recargar ahora', icono: '🔄', principal: true, accion: { tipo: 'recargar' } })}
    </div>` : `
    <div class="consejo">
      <p class="que">${texto(estado.versionDePrueba ? `Hay una versión de prueba de la barra: la ${laNueva}.` : `Hay una versión nueva de la barra: la ${laNueva}.`)}</p>
      ${boton({ etiqueta: 'Actualizar ahora', icono: '⬆️', principal: true, accion: { tipo: 'ponerLaNueva' } })}
      ${boton({ etiqueta: 'Ahora no', discreto: true, accion: { tipo: 'ahoraNo', id: `version:${laNueva}` } })}
    </div>`);

  // Y se pone desde aquí: decía «Díselo a tu tutor», y es una extensión del
  // editor que la barra ya sabe poner con un clic (decisión 166). El botón va
  // dentro de la tarjeta: es una cosa, no dos.
  const ponerlo = (principal) => (estado.ponerElAsistente && estado.ponerElAsistente.accion
    ? boton({ etiqueta: estado.ponerElAsistente.etiqueta, icono: '⬇️', principal, accion: estado.ponerElAsistente.accion }) : '');
  const sinAsistente = estado.faltaElAsistente && !estado.primerPaso ? `
    <div class="aviso malo">
      <p>Falta ${texto(estado.faltaElAsistente)} en este ordenador, y sin él no puedo hablar con nadie.</p>
      <p>Es lo único que falta.</p>
      ${ponerlo(true)}
    </div>` : '';

  // ── Montado, pero sin ajustar a esta barra ────────────────────────────
  //
  // Dos casos y un solo botón, porque para quien lo lee es lo mismo: esto
  // funciona, pero le falta algo de lo nuestro y no hace falta saber qué.
  // Lo que cambia es la frase, porque el motivo sí es distinto.
  const SIN_AJUSTAR = {
    adoptar: 'Esto ya está montado, pero todavía no está ajustado a esta barra.',
    ponerAlDia: 'Esto se montó con una versión anterior a la que trae esta barra.',
  };
  const sinAjustar = estado.sinAjustar ? `
    <div class="aviso">
      <p>${texto(SIN_AJUSTAR[estado.sinAjustar])}</p>
      <p>Puedo dejarlo al día sin tocar nada de lo que ya tienes.</p>
    </div>
    ${boton({ etiqueta: 'Ajustarlo ahora', icono: '✳', principal: true, accion: { tipo: 'arrancar' } })}` : '';

  // Con el primer encargo esperando (decisión 186): primero la cuenta, y el encargo
  // sale con un botón en cuanto está dentro.
  const esperaElEncargo = Boolean(estado.primerPaso && estado.primerPaso.esperaElEncargo);
  const yaEntro = esperaElEncargo && estado.primerPaso.sesion === 'si';
  const primerPaso = estado.primerPaso ? `
    <h2>Empieza por aquí</h2>
    <div class="conexion">
      <p class="nombre">${texto(yaEntro
        ? 'Ya has entrado: te mando el primer encargo'
        : (estado.primerPaso.instalado
          ? `Abre ${estado.primerPaso.asistente} y entra con tu cuenta`
          : `Falta ${estado.primerPaso.asistente} en este ordenador`))}</p>
      <p class="pista">${texto(yaEntro
        ? 'Estaba esperando a que entraras.'
        : (estado.primerPaso.instalado
          ? (esperaElEncargo
            ? 'Hace falta una cuenta de pago. Cuando hayas entrado, pulsa «Ya he entrado» y le paso el primer encargo.'
            : 'Hace falta una cuenta de pago. Sin ella no te va a contestar.')
          : 'Sin él no puedo hablar con nadie. Es lo único que falta.'))}</p>
      ${yaEntro
        ? boton({ etiqueta: 'Mandar el primer encargo', icono: '▸', principal: true, accion: { tipo: 'mandarElPrimerEncargo' } })
        : (estado.primerPaso.instalado
          ? boton({ etiqueta: `Abrir ${estado.primerPaso.asistente}`, icono: '▸', principal: true, accion: { tipo: 'abrirAsistente' } })
            + (esperaElEncargo ? boton({ etiqueta: 'Ya he entrado', discreto: true, accion: { tipo: 'mandarElPrimerEncargo' } }) : '')
          : ponerlo(true))}
    </div>
    <hr class="separador">` : '';

  // Como mucho una, y siempre con un botón que la resuelve ahí mismo. Un
  // aviso que solo informa de un problema es un aviso que estorba.
  const elConsejo = estado.consejo ? `
    <div class="consejo">
      <p class="que">${texto(estado.consejo.texto)}</p>
      ${boton({ etiqueta: estado.consejo.boton, icono: '✨', principal: true, accion: estado.consejo.accion })}
      ${boton({ etiqueta: 'Ahora no', discreto: true, accion: { tipo: 'ahoraNo', id: estado.consejo.id } })}
    </div>` : '';

  // Un aviso para Executive Lab que espera a que esta persona diga si se manda
  // (decisión 131). Como el consejo: uno, con su botón y su «Ahora no», y
  // diciendo cuántos más hay.
  const avisoQueEspera = estado.avisoParaExecutiveLab;
  const QUE_AVISO = {
    asistente: (a) => `Tu asistente ha preparado un aviso para Executive Lab: «${a.titulo}».`,
    barra: () => 'Algo de la barra ha fallado por dentro. Lo tengo apuntado para Executive Lab.',
    alumno: (a) => `Tienes un aviso para Executive Lab sin mandar: «${a.titulo}».`,
  };
  const elAvisoQueEspera = avisoQueEspera ? `
    <div class="consejo">
      <p class="que">${texto((QUE_AVISO[avisoQueEspera.origen] || QUE_AVISO.asistente)(avisoQueEspera))}</p>
      ${avisoQueEspera.cuantos > 1 ? `<p class="detalle">${texto(plural(avisoQueEspera.cuantos - 1, 'Y 1 más en Ayuda.', 'Y {n} más en Ayuda.'))}</p>` : ''}
      ${boton({ etiqueta: 'Verlo antes de mandarlo', icono: '📣', principal: true, accion: { tipo: 'verElAviso', fichero: avisoQueEspera.fichero } })}
      ${boton({ etiqueta: 'Ahora no', discreto: true, accion: { tipo: 'ahoraNo', id: `aviso:${avisoQueEspera.nombre}` } })}
    </div>` : '';

  // Lo nuevo de la versión que acaba de poner, una vez (decisión 134): un botón
  // nuevo que nadie ve es un botón que no existe.
  const nuevo = estado.queTrae;
  const loNuevo = nuevo ? `
    <div class="consejo">
      <p class="que">${texto(nuevo.cosas && nuevo.cosas.length ? `Ya tienes la ${nuevo.version}. Esto es lo nuevo:` : `Ya tienes la ${nuevo.version}.`)}</p>
      ${nuevo.cosas && nuevo.cosas.length ? `<ul class="lo-nuevo">${nuevo.cosas.map((c) => `<li>${texto(c)}</li>`).join('')}</ul>`
        : boton({ etiqueta: 'Ver qué trae', icono: '📰', accion: { tipo: 'verLaRelease' } })}
      ${boton({ etiqueta: 'Entendido', discreto: true, accion: { tipo: 'yaLoHeVisto' } })}
    </div>` : '';

  // Y lo que pasó con algo que contó: quien no sabe si sirvió de algo, deja de
  // contar cosas (decisión 134).
  const contado = estado.arreglado;
  // Lo que se dice depende de lo que se contó: una pregunta contestada no «está
  // arreglada» ni «llega con la próxima versión» (revisión).
  const HECHO = {
    falla: (t) => `Lo que contaste ya está arreglado: «${t}». Te llega con la próxima versión de la barra, si no la tienes ya.`,
    mejora: (t) => `Lo que propusiste ya está hecho: «${t}». Te llega con la próxima versión de la barra, si no la tienes ya.`,
    'no-se-entiende': (t) => `Executive Lab ha contestado a lo que contaste: «${t}». Lo tienes en GitHub.`,
  };
  const leido = (t) => `Executive Lab ha leído lo que contaste: «${t}». De momento se queda como está.`;
  const queLePaso = contado ? (contado.como === 'hecho' ? (HECHO[contado.tipo] || HECHO.falla) : leido)(contado.titulo) : '';
  const loQueContaste = contado ? `
    <div class="consejo">
      <p class="que">${texto(queLePaso)}</p>
      ${boton({ etiqueta: 'Verlo en GitHub', icono: '↗', pequeno: true, accion: { tipo: 'abrir', url: contado.enlace } })}
      ${boton({ etiqueta: 'Entendido', discreto: true, accion: { tipo: 'yaLoSe', numero: contado.numero } })}
    </div>` : '';

  const documentos = estado.esperando
    ? boton({
      etiqueta: plural(estado.esperando, 'Tienes 1 documento sin leer', 'Tienes {n} documentos sin leer'),
      icono: '📥',
      accion: { tipo: 'verCerebro' },
    })
    : '';

  // Lo que toca a esta hora (decisión 144). Hacerlo lo decide el alumno: puede
  // salir de su ordenador o costar algo, y ni Claude ni Codex dejan mandarlo
  // por él. «Ahora no» lo deja hasta la próxima vez que toque.
  const r = estado.recordatorio;
  // Si lo que toca es «Seguir donde lo dejé», también dice por dónde ibas (decisión 160).
  const ibas = r && r.nombre === 'seguir' ? porDondeIbas() : null;
  const elRecordatorio = !r ? '' : `
    <div class="consejo">
      <p class="que">${texto(`Toca: ${r.etiqueta} (${r.enPalabras}).`)}</p>
      ${ibas ? `<p class="detalle ibas-por">${texto(ibas.texto)}</p>` : ''}
      ${boton({ etiqueta: 'Hacerlo ahora', icono: '▸', principal: true, accion: { tipo: 'hacerElRecordatorio', nombre: r.nombre } })}
      ${boton({ etiqueta: 'Ahora no', discreto: true, accion: { tipo: 'ahoraNoRecordatorio', nombre: r.nombre } })}
    </div>`;
  // Y la costumbre que la barra ha visto: se le propone el recordatorio, y no se
  // pone sin su sí (decisión 187: cuándo hace algo es cómo trabaja él). Las que una
  // barra de antes ya puso sola se dicen una vez, y se pueden deshacer.
  const c = estado.costumbrePuesta;
  const laCostumbre = !c ? '' : c.propuesta ? `
    <div class="consejo">
      <p class="que">${texto(`Sueles pulsar «${c.etiqueta}» ${c.enPalabras.replace(' a las ', ' hacia las ')}. ¿Te lo recuerdo a esa hora?`)}</p>
      ${boton({ etiqueta: 'Sí, recuérdamelo', icono: '✓', principal: true, accion: { tipo: 'ponerLaCostumbre', nombre: c.nombre } })}
      ${boton({ etiqueta: 'No hace falta', discreto: true, accion: { tipo: 'noHaceFaltaLaCostumbre', nombre: c.nombre } })}
    </div>` : `
    <div class="consejo">
      <p class="que">${texto(`Sueles pulsar «${c.etiqueta}» ${c.enPalabras.replace(' a las ', ' hacia las ')}, así que te lo recordaré a esa hora.`)}</p>
      ${boton({ etiqueta: 'Entendido', icono: '✓', principal: true, accion: { tipo: 'entendidaLaCostumbre', nombre: c.nombre } })}
      ${boton({ etiqueta: 'No hace falta', discreto: true, accion: { tipo: 'noHaceFaltaLaCostumbre', nombre: c.nombre } })}
    </div>`;

  // Se adapta y da ideas (decisión 152). La primera vez, en una carpeta que ya
  // tenía cosas, lo que la barra sabe leer de ella y, si el arnés guardó una
  // copia de lo suyo al montarse, eso y el botón para verla. Las acciones,
  // tal cual vienen (P6).
  const p = estado.seAdapta && estado.seAdapta.parece;
  const loQueParece = !p ? '' : `
    <div class="consejo">
      ${p.texto ? `<p class="que">${texto(p.texto)}</p>` : ''}
      ${p.copia ? `<p class="detalle">${texto(p.copia.texto)}</p>` : ''}
      ${p.copia ? boton({ etiqueta: 'Ver la copia', icono: '🗂️', principal: true, accion: p.copia.accion }) : ''}
      ${boton({ etiqueta: 'Entendido', icono: p.copia ? '' : '✓', principal: !p.copia, discreto: Boolean(p.copia), accion: p.entendido })}
    </div>`;
  // Y después, de una en una, las ideas de lo que hay: la última de la fila,
  // con su botón y su «Ahora no».
  const idea = estado.seAdapta && estado.seAdapta.idea;
  const laIdea = !idea ? '' : `
    <div class="consejo">
      <p class="que">${texto(idea.texto)}</p>
      ${boton({ etiqueta: idea.boton, icono: '💡', principal: true, accion: idea.accion })}
      ${boton({ etiqueta: 'Ahora no', discreto: true, accion: { tipo: 'ahoraNo', id: idea.id } })}
    </div>`;

  // Los datos de clientes, dichos a tiempo y una vez (decisión 153): al entrar los
  // primeros datos de verdad. Lleva al texto de Ayuda, y leerlo o «Entendido» no
  // la deja volver en esta carpeta. La frase sale de su tabla.
  const d = estado.datosDeClientes;
  const losDatos = !d ? '' : `
    <div class="consejo">
      <p class="que">${texto(d.texto)}</p>
      ${d.detalle ? `<p class="detalle">${texto(d.detalle)}</p>` : ''}
      ${boton({ etiqueta: 'Leerlo', icono: '🔒', principal: true, accion: { tipo: 'verDatosDeClientes' } })}
      ${boton({ etiqueta: 'Entendido', discreto: true, accion: { tipo: 'entendidoLoDeLosDatos' } })}
    </div>`;

  // Codex pide confiar una vez en lo que el arnés le monta (decisión 178). Su botón deja
  // el paso listo; no confía por la persona. «Entendido» no la deja volver en esta carpeta.
  const delArnes = estado.enganchesDeCodex;
  const losEnganchesDeCodex = !delArnes ? '' : `
    <div class="consejo">
      <p class="que">${texto(delArnes.texto)}</p>
      ${delArnes.detalle ? `<p class="detalle">${texto(delArnes.detalle)}</p>` : ''}
      ${boton({ etiqueta: 'Dejarlo listo en Codex', icono: '🔑', principal: true, accion: { tipo: 'dejarListoLoDeCodex' } })}
      ${boton({ etiqueta: 'Entendido', discreto: true, accion: { tipo: 'entendidoLoDeCodex' } })}
    </div>`;

  // Las claves, en la tarjeta (decisión 167): las filas 3 y 4 de «La tarjeta que
  // toca». Van antes que lo nuevo y las ideas porque es lo único que puede costar
  // dinero si se deja: una clave dentro de las copias sube a GitHub con ellas.
  // Las dos con su «Ahora no»: puede que estén bien donde están, y la tarjeta no
  // puede quedarse para siempre tapando las demás.
  const cuantasClaves = (c) => [
    c.claves ? plural(c.claves, '1 clave', '{n} claves') : '',
    c.deAcceso ? plural(c.deAcceso, '1 fichero de acceso', '{n} ficheros de acceso') : '',
  ].filter(Boolean).join(' y ');
  const enLasCopias = estado.clavesEnLasCopias;
  const lasClavesEnLasCopias = enLasCopias && cuantasClaves(enLasCopias) ? `
    <div class="consejo">
      <p class="que">${texto(`Hay ${cuantasClaves(enLasCopias)} de ${enLasCopias.aplicaciones > 1 ? 'tus aplicaciones' : 'tu aplicación'} dentro de tus copias.`)}</p>
      ${boton({ etiqueta: 'Que deje de guardarlas', icono: '🔒', principal: true, accion: { tipo: 'pedir', prompt: enLasCopias.prompt } })}
      ${boton({ etiqueta: 'Ahora no', discreto: true, accion: { tipo: 'ahoraNo', id: 'claves:en-las-copias' } })}
    </div>` : '';
  const fueraDeSitio = estado.clavesFueraDeSitio;
  const lasClavesFueraDeSitio = fueraDeSitio && cuantasClaves(fueraDeSitio) ? `
    <div class="consejo">
      <p class="que">${texto(`Hay ${cuantasClaves(fueraDeSitio)} fuera de sitio.`)}</p>
      ${boton({ etiqueta: 'Que las ordene', icono: '🧹', principal: true, accion: { tipo: 'pedir', prompt: fueraDeSitio.prompt } })}
      ${boton({ etiqueta: 'Ahora no', discreto: true, accion: { tipo: 'ahoraNo', id: 'claves:fuera-de-sitio' } })}
    </div>` : '';

  // La primera vez de cada día, dónde lo dejó (decisión 160). Las acciones, tal
  // cual vienen (P6); las dos la quitan hasta mañana.
  const u = estado.laUltimaVez;
  const laUltimaVez = !(u && u.texto && u.accion && u.ahoraNo) ? '' : `
    <div class="consejo">
      <p class="que ibas-por">${texto(u.texto)}</p>
      ${boton({ etiqueta: 'Seguir donde lo dejé', icono: '↩️', principal: true, accion: u.accion })}
      ${botonVolver(false)}
      ${boton({ etiqueta: 'Ahora no', discreto: true, accion: u.ahoraNo })}
    </div>`;

  return { versionNueva, sinAsistente, sinAjustar, primerPaso, elConsejo, elAvisoQueEspera, loNuevo, loQueContaste, documentos, elRecordatorio, laCostumbre, loQueParece, laIdea, losDatos, losEnganchesDeCodex, laUltimaVez, lasClavesEnLasCopias, lasClavesFueraDeSitio };
}

function accionesRapidas(descubiertos) {
  return `
    ${/* Lo más alto de la barra, para lo que esa persona use de verdad. Lo
          elige ella entre sus botones, las consultas de sus programas y sus
          habilidades: nosotros no sabemos cuáles son. */''}
    ${/* Solo lo que esa persona haya fijado. Antes, sin fijar nada, salían aquí
          los comandos — y entonces este apartado y el de comandos enseñaban lo
          mismo. Los comandos tienen su sitio; esto es para lo que se elige. */''}
    <h2>Acciones rápidas</h2>
    ${descubiertos || nada(puedeTenerBotones
      ? 'Elige hasta cinco cosas para tenerlas aquí arriba.'
      : 'Tu asistente no trabaja con botones. Pídele las cosas escribiéndolas en la conversación.')}
    ${boton({ etiqueta: 'Elegir cuáles', icono: '☆', pequeno: true, discreto: true, accion: { tipo: 'verFijadas' } })}
    ${/* Las consultas de cada programa estaban aquí arriba, desplegadas. No son
          botones que haya creado nadie ni habilidades: son los scripts que RSC
          mete dentro de cada herramienta, y aquí competían con lo que sí es un
          botón. Vuelven a su programa, que es donde se entienden. */''}
    ${descubiertos ? '<hr class="separador">' : ''}`;
}

function grupoDocumentos() {
  return `
    ${grupo({
      id: 'grupo:documentos',
      etiqueta: 'Documentos',
      // En una carpeta recién montada, lo primero que hay que hacer es darle
      // documentos. Si todo está plegado, eso no se ve. En cuanto ya sabe algo
      // o hay conexiones, se pliega como los demás.
      abiertoDeEntrada: !estado.sabe && !estado.conectados,
      dentro: `
        ${/* Tres cosas distintas que se llamaban casi igual: lo que entra, lo
              que guarda y lo que produce. Nombradas por el verbo —"ver los
              documentos", "llevarte un archivo"— no se distinguían. Nombradas
              por de quién son, sí. */''}
        ${boton({ etiqueta: 'Darle documentos (inbox)', icono: '📎', pequeno: true, accion: { tipo: 'anadirDocumentos' } })}
        ${boton({ etiqueta: 'Documentos entregados', icono: '📁', pequeno: true, accion: { tipo: 'verPapeles' } })}
        ${boton({ etiqueta: 'Resultados (out)', icono: '📤', pequeno: true, accion: { tipo: 'verSalidas' } })}`,
    })}`;
}

function grupoConocimiento() {
  return `
    ${grupo({
      id: 'grupo:saber',
      etiqueta: 'Conocimiento (wiki)',
      // El número dice de qué es. Un "4" a secas al lado de un rótulo no se
      // sabe si son cuatro botones dentro, cuatro conceptos o cuatro de otra
      // cosa; y al lado de otro rótulo significaba algo distinto.
      cuantos: estado.sabe ? plural(estado.sabe, '1 concepto', '{n} conceptos') : '',
      dentro: `
        ${boton({ etiqueta: 'Ver los conceptos', icono: '📚', pequeno: true, accion: { tipo: 'verCerebro' } })}
        ${boton({ etiqueta: 'Preguntas sin contestar', icono: '❓', pequeno: true, accion: { tipo: 'verHuecos' } })}
        ${boton({ etiqueta: 'Cómo te habla', icono: '🗣️', pequeno: true, accion: { tipo: 'verTrato' } })}`,
    })}`;
}

function grupoHistorico() {
  return `
    ${estado.faltaGit ? bloqueFaltaGit() : grupo({
      id: 'grupo:historico',
      etiqueta: 'Histórico',
      dentro: `
        ${boton({ etiqueta: 'Guardar en git', icono: '💾', pequeno: true, accion: { tipo: 'guardarCopia' } })}
        ${boton({ etiqueta: 'Subir a GitHub', icono: '☁️', pequeno: true, accion: { tipo: 'verCopiaFuera' } })}
        ${/* Este botón no deshace nada: enseña la lista de copias. Se llamó
              "Volver a como estaba antes" y luego "Volver a un punto anterior",
              y los dos sonaban a que al pulsarlos ya no hay marcha atrás.
              Nombrar la lista y no la acción quita ese miedo, que es lo que
              hace que alguien no se atreva ni a mirar. */''}
        ${boton({ etiqueta: 'Ver las copias guardadas', icono: '🕑', pequeno: true, accion: { tipo: 'verCopias' } })}
        ${boton({ etiqueta: 'El diario', icono: '🗓️', pequeno: true, accion: { tipo: 'verDiario' } })}
        ${boton({ etiqueta: 'Apuntar lo de hoy', icono: '✍️', pequeno: true, accion: { tipo: 'pedir', prompt: 'Apunta en el diario lo que hemos hecho hoy: qué hicimos, por qué, qué quedó tocado y cómo quedó. Y si hemos decidido algo que importe, déjalo también en el registro de decisiones con su porqué.' } })}`,
    })}`;
}

function grupoEnQueEstamos() {
  return `
    ${/* Aparece solo si esa carpeta construye algo con SDD. Una de contabilidad
          no tendrá specs nunca; una donde se monte una web, sí. */''}
    ${estado.hayProyectos ? grupo({
      id: 'grupo:proyectos',
      etiqueta: 'En qué estamos',
      dentro: boton({ etiqueta: 'Qué queremos y cómo', icono: '🧩', pequeno: true, accion: { tipo: 'verProyectos' } }),
    }) : ''}`;
}

function grupoAccionesCompleto() {
  return `
    ${grupo({
      id: 'grupo:acciones',
      etiqueta: 'Acciones',
      cuantos: estado.conectados ? plural(estado.conectados, '1 programa', '{n} programas') : '',
      dentro: `
        ${/* Todo lo que es actuar, junto: lo que ya está guardado para pedirlo
              de una vez, lo que sabe hacer, y con qué está conectado. */''}
        ${boton({ etiqueta: 'Comandos', icono: '🔖', pequeno: true, accion: { tipo: 'verComandos' } })}
        ${boton({ etiqueta: 'Habilidades (skills)', icono: '✨', pequeno: true, accion: { tipo: 'verSaberes' } })}
        ${estado.hayRecordatorios ? boton({ etiqueta: 'Recordatorios', icono: '🕑', pequeno: true, accion: { tipo: 'verRecordatorios' } }) : ''}
        ${/* Los ayudantes estaban en un apartado suyo, arriba, con un solo
              botón dentro: un desplegable entero para llegar a una cosa. Y son
              lo mismo que los otros dos —algo que esta carpeta sabe hacer—, así
              que van donde están sus hermanos. Siguen sin salir hasta que hay
              al menos uno: un rótulo con nada detrás es peor que no tenerlo. */''}
        ${estado.hayAgentes ? boton({ etiqueta: 'Agentes', icono: '🤖', pequeno: true, accion: { tipo: 'verAgentes' } }) : ''}
        ${boton({ etiqueta: 'Conexiones (tools)', icono: '🔌', pequeno: true, accion: { tipo: 'verConexiones' } })}
        ${boton({ etiqueta: 'Conectar algo nuevo', icono: '➕', pequeno: true, accion: CONECTAR_ALGO_NUEVO })}
`,
    })}`;
}

function grupoAyudaCompleto() {
  return `
    ${grupo({
      id: 'grupo:ayuda',
      etiqueta: 'Ayuda',
      dentro: boton({ etiqueta: 'Estoy atascado', icono: '🆘', pequeno: true, accion: { tipo: 'verAyuda' } })
        + boton({ etiqueta: 'Qué falta por montar', icono: '🔎', pequeno: true, accion: { tipo: 'verRadiografia' } }),
    })}`;
}

function grupoAjustes() {
  return `
    ${grupo({
      id: 'grupo:ajustes',
      etiqueta: 'Ajustes',
      dentro: `
        ${boton({ etiqueta: 'Cómo quieres que trabaje', icono: '🎛️', pequeno: true, accion: { tipo: 'verComoTrabaja' } })}
        ${boton({ etiqueta: 'Las reglas', icono: '📜', pequeno: true, accion: { tipo: 'verReglas' } })}
        ${boton({ etiqueta: 'Tu asistente', icono: '💬', pequeno: true, accion: { tipo: 'verAsistente' } })}
        ${boton({
          etiqueta: marcaPuesta ? 'Cambiar el tema de mi empresa' : 'Poner el tema de mi empresa',
          icono: '🎨',
          pequeno: true,
          accion: { tipo: 'verLaCara' },
        })}
        ${boton({ etiqueta: 'Cambiar de carpeta', icono: '📂', pequeno: true, accion: { tipo: 'elegirCarpeta' } })}
        ${modo === 'avanzado'
          ? boton({ etiqueta: 'Volver al modo sencillo', icono: '◂', pequeno: true, accion: { tipo: 'modoSencillo' } })
          : boton({ etiqueta: 'Ver el editor completo', icono: '▸', pequeno: true, accion: { tipo: 'verEditorCompleto' } })}`,
    })}`;
}

// ------------------------------------------------------------- conexiones

// Las de una aplicación están en su sitio y no salen en la tarjeta de fuera de
// sitio (decisión 135). Pero si ya se guardaron en git viajan con cada copia y
// con «Subir a GitHub». No se mueven: se dejan de guardar, y eso se dice aparte.
function tarjetaDeLasAppsEnLasCopias(enLasCopias, { principal }) {
  if (!enLasCopias) return '';
  const { claves, deAcceso, carpetas, prompt } = enLasCopias;
  const cuanto = [
    claves ? plural(claves, '1 clave', '{n} claves') : '',
    deAcceso ? plural(deAcceso, '1 fichero de acceso', '{n} ficheros de acceso') : '',
  ].filter(Boolean).join(' y ');
  const una = carpetas.length < 2;
  // La de la raíz, cuando la carpeta entera es la aplicación, es la principal (decisión 167).
  const nombres = carpetas.map((c) => c || 'principal');
  const donde = una
    ? `la aplicación de la carpeta ${nombres[0]}`
    : `cada aplicación de las carpetas ${nombres.slice(0, -1).join(', ')} y ${nombres[nombres.length - 1]}`;
  return `
    <div class="conexion">
      <p class="nombre">${texto(`Hay ${cuanto} de ${una ? 'tu aplicación' : 'tus aplicaciones'} dentro de tus copias`)}</p>
      <p class="pista">${texto(`Están bien donde están: es donde las lee ${donde}. Pero se guardaron en git, y cada copia se las lleva, también si la subes a GitHub.`)}</p>
      <p class="pista malo">Lo seguro es dejar de guardarlas y cambiarlas donde las sacaste. Pídeselo y te lo explica.</p>
      ${boton({ etiqueta: 'Que deje de guardarlas', icono: '🔒', principal, accion: { tipo: 'pedir', prompt } })}
    </div>`;
}

// «Conectadas por MCP» (decisión 175): lo que los asistentes tienen conectado por
// su cuenta, fuera de esta barra. Solo nombres, de quién es, de dónde sale y qué
// es; nunca un valor. Sin ninguna, no sale nada.
function conectadasPorMcp(mcp, noLeido = []) {
  const lista = Array.isArray(mcp) ? mcp : [];
  // Un fichero que hay y no se ha podido leer se dice, en vez de callar (revisión de la 175).
  const DE = { claude: 'Claude', codex: 'Codex' };
  const DONDE = { carpeta: 'de esta carpeta', usuario: 'de tu usuario', tuyoAqui: 'de tu usuario' };
  const sinLeer = [...new Set((Array.isArray(noLeido) ? noLeido : []).filter((n) => DE[n.asistente] && DONDE[n.origen]).map((n) => `No he podido leer lo de ${DE[n.asistente]} ${DONDE[n.origen]}.`))];
  if (!lista.length && !sinLeer.length) return '';
  const CABEN_MCP = 8;
  const ORIGEN = { carpeta: 'de esta carpeta', tuyoAqui: 'solo tuya, en esta carpeta', usuario: 'de tu usuario' };
  const TIPO = { programa: 'programa de tu ordenador', web: 'dirección web' };
  const ASISTENTE = { claude: 'Claude', codex: 'Codex' };
  const linea = (s) => `${s.nombre} — ${ASISTENTE[s.asistente] || ''} · ${ORIGEN[s.origen] || ''} · ${TIPO[s.tipo] || ''}${s.herramienta ? (s.esSuya ? ` · es tu conexión ${s.herramienta}, la de arriba` : ` · se llama como tu conexión ${s.herramienta}`) : ''}${s.sinAprobar ? ' · sin aprobar todavía' : ''}`;
  return `
    <hr class="separador">
    <h2>Conectadas por MCP</h2>
    <p class="detalle">Lo que tus asistentes tienen conectado por su cuenta, fuera de esta barra. Solo veo cómo se llama y de dónde sale, nunca sus claves.</p>
    ${sinLeer.map((t) => `<p class="pista malo">${texto(t)}</p>`).join('')}
    ${lista.slice(0, CABEN_MCP).map((s) => `<p class="pista">· ${texto(linea(s))}</p>`).join('')}
    ${lista.length > CABEN_MCP ? `<p class="pista">· ${texto(plural(lista.length - CABEN_MCP, 'Y 1 más', 'Y {n} más'))}.</p>` : ''}`;
}

function pantallaConexiones({ proveedores, sueltas, enLasCopias = null, mcp = [], mcpNoLeido = [] }) {
  // Caso brownfield: el arnés se montó sobre algo que ya existía y las claves
  // están donde estuvieran. El alumno vería "no hay conexiones" teniendo seis.
  // Y se dice a quién va cada una, que es lo que el inventario ya sabe por el
  // nombre (decisión 104): la de Replicate a Replicate, y las de un proveedor
  // sin carpeta —Pexels, Drive— como conexiones por montar. Así nada queda
  // invisible: lo que existe por sus claves sale aunque no tenga carpeta.
  const reparto = (sueltas && sueltas.reparto) || [];
  const deAcceso = (sueltas && sueltas.ficherosDeAcceso) || [];
  // Dos clases de credencial y una sola frase: las claves son líneas, los
  // ficheros de acceso son ficheros enteros (una cuenta de servicio, un
  // certificado). Se cuentan aparte porque se mueven distinto (decisión 105).
  const cuantoHay = [
    sueltas && sueltas.claves ? plural(sueltas.claves, '1 clave', '{n} claves') : '',
    deAcceso.length ? plural(deAcceso.length, '1 fichero de acceso', '{n} ficheros de acceso') : '',
  ].filter(Boolean).join(' y ');
  // Un `.env` de 120 claves existe, y pintaba 121 líneas y 123 botones: 104 KB
  // de pantalla que nadie lee. Se enseñan las primeras y se dice cuántas
  // quedan — el botón las ordena todas igual (decisión 107).
  const CABEN = 6;
  const lineasDelReparto = [
    ...reparto.map((g) => `${g.herramienta}${g.existe ? '' : ' — sin conexión todavía, por montar'}: ${plural(g.claves.length, '1 clave', '{n} claves')}`),
    ...deAcceso.map((f) => (f.herramienta
      ? `${f.herramienta}${f.existe ? '' : ' — sin conexión todavía, por montar'}: ${f.queEs.toLowerCase()}`
      : `${f.queEs}, y no sé de quién: se lo pregunto al asistente`)),
  ];
  const desordenadas = sueltas ? `
    <div class="conexion">
      <p class="nombre">${texto(`Hay ${cuantoHay} fuera de sitio`)}</p>
      <p class="pista">De cuando este trabajo se llevaba sin esto. Por el nombre de cada una sé de quién es:</p>
      ${lineasDelReparto.slice(0, CABEN).map((l) => `<p class="pista">· ${texto(l)}</p>`).join('')}
      ${lineasDelReparto.length > CABEN ? `<p class="pista">· Y ${texto(plural(lineasDelReparto.length - CABEN, '1 más', '{n} más'))}. Las ordena todas de una vez.</p>` : ''}
      ${sueltas.sinDueno && sueltas.sinDueno.length ? `<p class="pista">· ${texto(plural(sueltas.sinDueno.length, '1 clave sin dueño claro', '{n} claves sin dueño claro'))}: se lo pregunto al asistente.</p>` : ''}
      ${sueltas.subidas ? `<p class="pista malo">Y están dentro de tus copias de seguridad, así que ponerlas en su sitio no las saca de ahí. Si alguna es importante, lo seguro es cambiarla donde la sacaste. Pídeselo y te lo explica.</p>` : ''}
      ${boton({ etiqueta: 'Que las ordene', icono: '🧹', principal: true, accion: { tipo: 'pedir', prompt: sueltas.prompt } })}
      ${/* Esto lo he deducido yo del nombre de cada clave, y puedo haberme
            equivocado. Decirlo y dar la salida es la diferencia entre una
            barra que se equivoca y una que además no te deja corregirla. */''}
      <p class="pista">Esto lo saco del nombre de cada una, así que puedo equivocarme.</p>
      ${/* Dos correcciones distintas y un solo botón, porque para quien lo
            pulsa son la misma frase: «eso no es así». Una es que la clave sea
            de otra herramienta; la otra, que estén bien donde están — un
            proyecto puede leerlas de la raíz a propósito, y sin esta salida la
            barra se lo diría para siempre sin poder rebatirlo. */''}
      ${boton({
    etiqueta: 'Esto no está bien',
    icono: '✏️',
    pequeno: true,
    discreto: true,
    accion: {
      tipo: 'pedir',
      prompt: 'La barra dice que tengo credenciales fuera de sitio y algo no encaja. '
        + `Esto es lo que dice: ${lineasDelReparto.join('; ')}. `
        + 'Pregúntame qué falla, que puede ser una de dos: que alguna sea de otra herramienta distinta de la que dice, '
        + 'o que estén bien donde están porque algo de este proyecto las lee de ahí a propósito. '
        + 'Compruébalo mirando qué las carga antes de darme la razón. '
        + 'Si es lo primero, ordénalas con el dueño correcto. Si es lo segundo, no muevas nada y déjalo escrito en el registro de decisiones, '
        + 'con el porqué, para que no volvamos a esto cada semana.',
    },
  })}
    </div>` : '';

  // Las que existen por sus claves y todavía no tienen carpeta. Hasta hoy no
  // salían por ningún lado: el alumno tenía Pexels conectado de hecho y la
  // barra decía que no había nada (decisión 104).
  // Lo mismo aquí: con 120 proveedores sueltos esto eran 120 botones. Se
  // enseñan los primeros y el resto se cuenta; el de arriba los monta todos.
  const TOPE_POR_MONTAR = 8;
  const todasPorMontar = (sueltas && sueltas.porMontar) || [];
  const porMontar = todasPorMontar.length ? `
    <hr class="separador">
    <h2>Por montar</h2>
    <p class="detalle">Por tus claves veo que ya usas esto, pero todavía no tiene su sitio aquí.</p>
    ${todasPorMontar.slice(0, TOPE_POR_MONTAR).map((p) => boton({
    etiqueta: p.conFichero
      ? `${p.herramienta} — con un fichero de acceso suelto`
      : `${p.herramienta} — ${plural(p.claves, '1 clave suelta', '{n} claves sueltas')}`,
    icono: '◌',
    accion: {
      tipo: 'pedir',
      prompt: `Veo claves de ${p.herramienta} guardadas fuera de sitio en esta carpeta y no tiene conexión montada. `
        + `Móntala con el protocolo de harness: copia 01-TOOLS/_TEMPLATE a 01-TOOLS/${p.herramienta}, `
        + 'lleva ahí sus claves, escribe su .env.example, su CREDENTIALS.md con dónde se saca cada una, los pasos en el README y su prueba de conexión. '
        + 'No imprimas ningún valor, y antes de mover nada mira qué lo está leyendo ahora.',
    },
  })).join('')}
    ${todasPorMontar.length > TOPE_POR_MONTAR
    ? `<p class="detalle">${texto(plural(todasPorMontar.length - TOPE_POR_MONTAR, 'Y 1 más', 'Y {n} más'))}. Con "Que las ordene" se montan todas de una vez.</p>`
    : ''}` : '';

  const deApps = tarjetaDeLasAppsEnLasCopias(enLasCopias, { principal: !sueltas });

  if (!proveedores.length) {
    return `
      <p class="titulo">Conexiones (tools)</p>
      ${desordenadas}
      ${deApps}
      ${porMontar}
      ${conectadasPorMcp(mcp, mcpNoLeido)}
      ${nada('Todavía no hay ninguna puesta en su sitio. Cuando le pidas al asistente que conecte tu correo, tu facturación o lo que uses, aparecerán aquí.')}
      ${boton({ etiqueta: 'Conectar algo nuevo', icono: '➕', principal: !sueltas && !enLasCopias, accion: CONECTAR_ALGO_NUEVO })}
      ${volver()}`;
  }

  return `
    ${bloqueAviso()}
    ${volver()}
    <p class="titulo">Conexiones (tools)</p>
    ${desordenadas}
    ${deApps}
    ${proveedores.map((p) => boton({
      // Una que el asistente ha empezado y no ha terminado se dice, no se
      // disfraza de conexión con claves que no se pueden rellenar. Y una cuyas
      // claves están, pero en otro sitio, tampoco se disfraza de «le faltan»:
      // no le falta nada, le falta orden.
      etiqueta: loQuePideSuAcceso(p) || (p.aMedioHacer
        ? `${p.etiqueta} — sin preparar`
        : (p.faltan
          ? `${p.etiqueta} — ${plural(p.faltan, 'falta una clave', 'faltan {n} claves')}`
          : (p.fueraDeSitio
            ? `${p.etiqueta} — puesta, pero fuera de su sitio`
            // Lo que dijo su última prueba, mientras sus claves sigan igual
            // (decisión 146): «conectada», o por qué falla, en una frase.
            // Conecta con una clave que puede escribir y no ha dicho qué hace: primero
            // eso, que es una pregunta. Después, una clave que caduca esta semana o
            // que ya caducó (decisión 149).
            : (p.prueba && p.prueba.ok && p.prueba.puedeEscribir ? `${p.etiqueta} — conecta, pero puede cambiar y borrar`
            : (p.caduca ? `${p.etiqueta} — ${p.caduca.texto}` : (p.prueba
              ? (p.prueba.ok
                // Conecta con una clave que puede escribir, y no ha dicho qué hace con ella.
                ? (p.prueba.puedeEscribir ? `${p.etiqueta} — conecta, pero puede cambiar y borrar` : `${p.etiqueta} — conectada · probada ${p.prueba.cuando}`)
                : `${p.etiqueta} — falla: ${laPrimeraFrase(p.prueba.mensaje)}`)
              // Se autentica con un fichero y no con claves: decir su nombre a
              // secas dejaría pensando que no tiene nada puesto (decisión 105).
              : (p.conFichero ? `${p.etiqueta} — con su fichero de acceso` : p.etiqueta))))))),
      icono: loQuePideSuAcceso(p) ? '○' : p.aMedioHacer ? '◌' : (p.faltan ? '○' : (p.caduca && p.caduca.caducada ? '✕' : (p.fueraDeSitio || p.caduca || (p.prueba && p.prueba.puedeEscribir) ? '◐' : (p.prueba && !p.prueba.ok ? '✕' : '●')))),
      accion: { tipo: 'verConexion', proveedor: p.id },
    })).join('')}
    ${porMontar}
    ${conectadasPorMcp(mcp, mcpNoLeido)}
  `;
}

// «Conectar algo nuevo» (decisiones 146, 156, 159 y 167). Un solo botón con un
// solo nombre, en Acciones y en Conexiones: antes, en Conexiones vacía, el mismo
// se llamaba «Conectar algo» (decisión 101). Qué programa se pregunta en el
// editor, y el encargo lo arma la extensión con el nombre (`conectar.js`).
const CONECTAR_ALGO_NUEVO = { tipo: 'conectarAlgoNuevo' };

// Lo que le falta a una conexión según su clase de acceso (decisión 156): entrar
// con su cuenta, o su fichero de acceso. Null si no es eso: se dice lo de siempre.
function loQuePideSuAcceso(p) {
  const clases = p.acceso || [];
  if (p.aMedioHacer || p.fueraDeSitio || (p.prueba && p.prueba.ok)) return null;
  // Con claves por poner, «falta una clave» dice más; y si ya se probó, lo que dijo la prueba.
  if (!p.faltan && !p.prueba && clases.length && clases.every((c) => c === 'cuenta')) return `${p.etiqueta} — falta entrar con tu cuenta`;
  // Antes que «falta una clave», si de verdad lo pide: sin el fichero no hay nada que probar.
  if (p.pideFichero && !p.conFichero) return `${p.etiqueta} — le falta su fichero de acceso`;
  return null;
}

// «Esa clave no vale. Cópiala otra vez entera.» → «esa clave no vale».
const laPrimeraFrase = (t) => {
  const frase = String(t || '').split(/(?<=[.:])\s/)[0].replace(/[.:]$/, '');
  return frase.charAt(0).toLowerCase() + frase.slice(1);
};

// Una herramienta: cómo se conecta, sus claves, su prueba y sus cositas.
// Cuándo caduca su clave (decisión 149): con las claves puestas, la pregunta con
// sus opciones, una vez por clave; después, lo apuntado, con «Cambiar».
const CUANDO_CADUCA = [['nunca', 'No caduca'], ['30', 'En 30 días'], ['90', 'En 90 días'], ['365', 'En un año'], ['noSe', 'No lo sé']];
function bloqueCaduca(caduca, proveedor) {
  if (!caduca) return '';
  if (caduca.pregunta) {
    return `<p class="detalle">${texto('¿Cuándo caduca esta clave? Así te aviso antes.')}</p>`
      + CUANDO_CADUCA.map(([en, etiqueta]) => boton({ etiqueta, icono: '▸', pequeno: true, accion: { tipo: 'cuandoCaduca', proveedor: proveedor.id, en, huella: caduca.huella } })).join('');
  }
  return `<p class="detalle">${texto(caduca.texto)}</p>`
    + boton({ etiqueta: 'Cambiar', icono: '✎', pequeno: true, discreto: true, accion: { tipo: 'cuandoCaduca', proveedor: proveedor.id, en: 'otraVez' } });
}

function pantallaConexion({ proveedor, claves, cositas, ordenar = null, aviso: avisoLocal, paso = 0, todosLosPasos = false, caduca = null, prepararLaGuia = null, noVale = false }) {
  // La clase de acceso que dejó escrita el asistente (decisión 156). Sin ella,
  // todo como antes (P1).
  const clases = proveedor.acceso || [];
  const pide = (clase) => clases.includes(clase);
  // «Solo entrar» es cuando no queda ninguna clave por poner: con un ID y un
  // secreto que pegar, se enseñan con su campo (revisión de corrección de la 156).
  const soloEntrar = clases.length > 0 && clases.every((c) => c === 'cuenta') && !claves.some((c) => !c.puesta);
  const faltaAlguna = claves.some((c) => !c.puesta) || (proveedor.pideFichero && !proveedor.conFichero);
  const algunaFuera = claves.some((c) => !c.puesta && c.fuera);
  // Puesta, pero la última prueba dijo que no vale (decisión 167): hay que sacarla
  // otra vez, así que la guía sigue como si faltara.
  const porSacar = faltaAlguna || noVale;

  // Los pasos los escribe el asistente al investigar la herramienta. Se
  // enseñan mientras falte alguna clave, o mientras la que hay no valga: cuando
  // ya está todo puesto y funciona, estorban.
  //
  // Y de uno en uno (decisión 146): una lista de diez pasos con tres campos
  // debajo es una pared. «No lo encuentro» le pasa al asistente la herramienta
  // y el paso, para que lo busque; y la lista entera sigue a un clic.
  const pasos = proveedor.pasos || [];
  const ir = (n, todos = false) => ({ tipo: 'pasoDeLaGuia', proveedor: proveedor.id, paso: n, todos });
  const unPaso = () => {
    const n = Math.min(paso, pasos.length - 1);
    const ultimo = n === pasos.length - 1;
    // Qué se hace abajo, según lo que pide y de qué habla el paso (decisión 156).
    // Con el fichero ya puesto, no se dice que se suelte.
    const sinFichero = pide('fichero') && !proveedor.conFichero;
    const deFichero = sinFichero && /fichero|archivo|descarg/i.test(pasos[n]);
    // Solo en el paso donde se saca la clave, que lo sabe la extensión (decisión
    // 167). Buscar «contrase» en cada paso hacía que «Entra con el usuario y la
    // contraseña», el primero, ya dijera «pégala abajo». Sin saberlo, en el último.
    const enElDeLaClave = Number.isInteger(proveedor.pasoDeLaClave) ? n === proveedor.pasoDeLaClave : ultimo;
    const yAbajo = soloEntrar ? 'Cuando lo tengas, pulsa «Entrar» abajo: el asistente te abre el navegador.'
      : (deFichero || (sinFichero && !claves.some((c) => !c.puesta)) ? 'Cuando lo tengas, suéltalo abajo: lo pongo en su sitio y lo pruebo yo.'
        : (pide('usuario') ? 'Cuando los tengas, pégalos abajo y pulsa «Guardar»: los pruebo yo.'
          : 'Cuando la tengas, pégala abajo y pulsa «Guardar»: la pruebo yo.'));
    return `
      <div class="conexion guia-paso">
        <p class="pista">${texto(`Paso ${n + 1} de ${pasos.length}`)}</p>
        <p class="nombre">${texto(pasos[n])}</p>
        ${enElDeLaClave ? `<p class="pista">${texto(yAbajo)}</p>` : ''}
        <div class="fila">
          ${proveedor.ayuda ? boton({ etiqueta: 'Abrir su página', icono: '↗', pequeno: true, accion: { tipo: 'abrir', url: proveedor.ayuda } }) : ''}
          ${!ultimo ? boton({ etiqueta: 'Hecho, siguiente', icono: '▸', principal: true, pequeno: true, accion: ir(n + 1) }) : ''}
          ${n > 0 ? boton({ etiqueta: 'Atrás', pequeno: true, discreto: true, accion: ir(n - 1) }) : ''}
        </div>
        ${boton({ etiqueta: 'No lo encuentro', icono: '💬', pequeno: true, discreto: true, accion: { tipo: 'pedir', prompt: `Estoy conectando ${proveedor.etiqueta} y me he atascado en el paso ${n + 1} de ${pasos.length}: «${pasos[n]}». No lo encuentro. Búscalo en su ayuda de hoy y dime exactamente dónde está, con lo que voy a ver en la pantalla. Si los pasos ya no son así, corrígelos en su README.` } })}
        ${boton({ etiqueta: 'Ver todos los pasos', pequeno: true, discreto: true, accion: ir(n, true) })}
      </div>`;
  };
  const guia = !pasos.length || !porSacar ? ''
    : (todosLosPasos
      ? `<ol class="guia">${pasos.map((p) => `<li>${texto(p)}</li>`).join('')}</ol>${boton({ etiqueta: 'De uno en uno', pequeno: true, discreto: true, accion: ir(paso) })}`
      : unPaso());

  // Cada clase de acceso, su forma (decisión 156). Entrar con tu cuenta: no hay
  // nada que pegar. Usuario y contraseña: juntos, con un solo «Guardar». Una
  // dirección que te dan: como dirección, con dónde sale. Lo demás, como siempre.
  const visibles = soloEntrar ? [] : claves;
  const juntas = visibles.filter((c) => c.forma === 'usuario' || c.forma === 'contrasena');
  const agrupar = juntas.length >= 2;
  const sueltasDeUna = agrupar ? visibles.filter((c) => !juntas.includes(c)) : visibles;
  const queSePega = agrupar && !sueltasDeUna.length ? 'Escribe el usuario y la contraseña tal cual te los dieron.'
    : (visibles.length && visibles.every((c) => c.forma === 'direccion') ? 'Pega la dirección entera. Los espacios y las comillas los quito yo.'
      : 'Pega la clave entera. Los espacios y las comillas los quito yo.');
  // Un secreto nunca se pinta como texto, sea de la forma que sea.
  const comoSeEscribe = (c) => {
    const tipo = c.secreta || c.forma === 'contrasena' ? 'password' : 'text';
    if (c.forma === 'usuario') return [tipo, 'Escribe aquí el usuario'];
    if (c.forma === 'contrasena') return [tipo, 'Escribe aquí la contraseña'];
    if (c.forma === 'direccion') return [tipo, 'Pega aquí la dirección entera'];
    return [tipo, c.secreta ? 'Pega aquí la clave entera' : 'Escribe aquí el valor'];
  };
  const usuarioYContrasena = agrupar ? `
        <div class="conexion" data-proveedor="${atributo(proveedor.id)}">
          <p class="nombre">Usuario y contraseña</p>
          ${juntas.map((c) => `
          <p class="pista">${texto(`${c.etiqueta}: ${c.puesta ? c.pista : (c.fuera || 'todavía sin poner')}`)}</p>
          ${c.donde ? `<p class="donde">${texto(c.donde)}</p>` : ''}
          <input type="${comoSeEscribe(c)[0]}" placeholder="${atributo(comoSeEscribe(c)[1])}" data-clave="${atributo(c.clave)}">`).join('')}
          <div class="fila">
            ${boton({ etiqueta: 'Guardar', principal: true, accion: { tipo: 'guardarClaves', proveedor: proveedor.id } })}
          </div>
        </div>` : '';
  const elFichero = pide('fichero') ? `
        <div class="conexion soltar-aqui">
          <p class="nombre">Fichero de acceso</p>
          ${proveedor.conFichero
    ? `<p class="pista">Puesto en su sitio.</p>
             ${boton({ etiqueta: 'Cambiarlo', icono: '✎', pequeno: true, discreto: true, accion: { tipo: 'elegirFicheroDeAcceso', proveedor: proveedor.id } })}`
    : `<p class="soltar">Suéltalo aquí</p>
             <p class="pista">Arrástralo encima de la barra, o elígelo: lo pongo en su sitio y no sale de este ordenador.</p>
             ${boton({ etiqueta: 'Elegir el fichero', icono: '📄', principal: true, accion: { tipo: 'elegirFicheroDeAcceso', proveedor: proveedor.id } })}`}
        </div>` : '';
  const entrar = pide('cuenta') ? `
        <div class="conexion">
          <p class="nombre">Entrar con tu cuenta</p>
          <p class="pista">${texto(soloEntrar
    ? `No hay nada que pegar: entras con tu cuenta de ${proveedor.etiqueta} en el navegador, y el asistente hace el resto.`
    : `Además, entras con tu cuenta de ${proveedor.etiqueta} en el navegador, y el asistente hace el resto.`)}</p>
          ${boton({ etiqueta: 'Entrar', icono: '↗', principal: soloEntrar, accion: { tipo: 'pedir', prompt: `Quiero conectar ${proveedor.etiqueta} entrando con mi cuenta (01-TOOLS/${proveedor.id}/). Sigue lo que dicen su README y su CREDENTIALS.md: ábreme el navegador para que entre y dé permiso, guarda lo que devuelva donde lo busca su prueba sin enseñármelo, y prueba la conexión. Si antes hace falta algo de mi informático, dímelo.` } })}
        </div>` : '';

  const formularios = visibles.length
    ? usuarioYContrasena + sueltasDeUna.map((c) => `
        <div class="conexion" data-proveedor="${atributo(proveedor.id)}">
          <p class="nombre">${texto(c.etiqueta)}</p>
          ${c.donde ? `<p class="donde">${texto(c.donde)}</p>` : ''}
          ${c.forma === 'direccion' && !c.donde ? `<p class="donde">${texto(`Te la da ${proveedor.etiqueta}: cópiala entera de su página.`)}</p>` : ''}
          <p class="pista">${c.puesta
    ? `Puesta: ${texto(c.pista)}`
    : (c.fuera ? `Ya la tienes, ${texto(c.fuera)}. Pulsa «Que las ordene» y aparecerá aquí.` : 'Todavía sin poner')}</p>
          <input type="${comoSeEscribe(c)[0]}" placeholder="${atributo(comoSeEscribe(c)[1])}" data-clave="${atributo(c.clave)}">
          <div class="fila">
            ${boton({ etiqueta: 'Guardar', principal: true, accion: { tipo: 'guardarClave', proveedor: proveedor.id, clave: c.clave } })}
          </div>
        </div>`).join('')
    // Con un fichero o entrando con tu cuenta, que no haya claves no hay que decirlo.
    : (pide('fichero') || pide('cuenta')) && !proveedor.aMedioHacer ? ''
    // Sin claves puede significar dos cosas muy distintas, y decir la que no es
    // manda al alumno a esperar algo que no va a pasar. Si el asistente copió
    // la plantilla y no la ha terminado, no hay nada que rellenar todavía: se
    // dice, y se le ofrece pedírselo, que es lo único que lo desbloquea.
    : (proveedor.aMedioHacer
      ? `${nada('El asistente ha empezado esta conexión y no la ha terminado: todavía no se sabe qué claves pide. Pídeselo y te las deja listas para rellenar.')}
         ${boton({ etiqueta: 'Que la termine', icono: '▸', principal: true, accion: { tipo: 'pedir', prompt: `Empezaste a conectar ${proveedor.etiqueta} y se quedó a medias: en 01-TOOLS/${proveedor.id}/ siguen los marcadores de la plantilla. Averigua qué claves pide de verdad esa herramienta, déjalas escritas y explícame de dónde saco cada una.` } })}`
      : nada('Esta conexión no pide ninguna clave.'));

  const lasCositas = cositas.length
    ? `<hr class="separador"><h2>Consultas</h2>` +
      cositas.map((c) => boton({
        etiqueta: c.etiqueta,
        icono: c.pideDatos ? '✎' : '▸',
        accion: { tipo: 'hacerCosita', proveedor: proveedor.id, fichero: c.fichero, etiqueta: c.etiqueta, pideDatos: c.pideDatos },
      })).join('')
    : '';

  return `
    ${bloqueAviso(avisoLocal)}
    ${volver({ tipo: 'verConexiones' })}
    <p class="titulo">${texto(proveedor.etiqueta)}</p>
    ${guia ? `<h2>Cómo conectarla</h2>${guia}` : ''}
    ${proveedor.ayuda && porSacar && !guia ? boton({ etiqueta: 'Abrir su página para sacar la clave', icono: '↗', principal: true, accion: { tipo: 'abrir', url: proveedor.ayuda } }) : ''}
    ${porSacar ? '<hr class="separador">' : ''}
    ${algunaFuera && ordenar ? boton({ etiqueta: 'Que las ordene', icono: '🧹', principal: true, accion: { tipo: 'pedir', prompt: ordenar } }) : ''}
    ${entrar}
    ${elFichero}
    ${visibles.length ? `<p class="detalle">${texto(queSePega)}</p>` : ''}
    ${formularios}
    ${bloqueCaduca(caduca, proveedor)}
    ${proveedor.ayuda && !porSacar ? boton({ etiqueta: '¿Dónde consigo la clave?', icono: '❓', accion: { tipo: 'abrir', url: proveedor.ayuda } }) : ''}
    ${!proveedor.pasos.length ? boton({ etiqueta: 'Explícame cómo conectarla', icono: '💬', accion: { tipo: 'pedir', prompt: `Explícame paso a paso cómo conectar ${proveedor.etiqueta}: dónde entro, dónde saco cada clave y qué pego dónde. Y deja los pasos escritos para la próxima vez.` } }) : ''}
    ${/* La guía para sacar la clave, en PDF (decisión 159). Sin pasos, no hay
          PDF que hacer: se le pide al asistente que la prepare (P1). */''}
    ${proveedor.pasos.length
    ? boton({ etiqueta: 'La guía, en PDF', icono: '📄', accion: { tipo: 'guiaEnPdf', proveedor: proveedor.id } })
    : (prepararLaGuia ? boton({ etiqueta: 'Que el asistente prepare la guía', icono: '📄', accion: { tipo: 'pedir', prompt: prepararLaGuia } }) : '')}
    ${/* Muchas veces la clave la tiene otra persona (decisión 156). */''}
    ${boton({ etiqueta: 'Pídeselo a tu informático', icono: '✉️', accion: { tipo: 'verParaElInformatico', proveedor: proveedor.id } })}
    ${boton({ etiqueta: 'Probar la conexión', icono: '🔎', accion: { tipo: 'probar', proveedor: proveedor.id } })}
    ${lasCositas}
  `;
}

// «Pídeselo a tu informático» (decisión 156). El mensaje lo arma la extensión
// con lo que dejó escrito el asistente y la parte de seguridad de la barra. Los
// botones solo dicen de qué conexión es: el texto no vuelve desde aquí.
function pantallaInformatico({ proveedor, asunto, cuerpo, deLaCarpeta, paginasAjenas = [], tieneSuPagina = false, aviso: avisoLocal }) {
  // Lo que preparó el asistente puede llevar páginas que no son de la
  // herramienta: se enseñan antes de mandarlo (revisión de seguridad de la 156).
  const paginas = paginasAjenas.length ? `
    <p class="pista malo">${texto(tieneSuPagina
    ? `Lleva páginas que no son de ${proveedor.etiqueta}. Mira que sean de fiar antes de mandarlo:`
    : 'Lleva estas páginas. Mira que sean de fiar antes de mandarlo:')}</p>
    ${paginasAjenas.map((u) => `<p class="pista">· ${texto(u)}</p>`).join('')}` : '';
  return `
    ${bloqueAviso(avisoLocal)}
    ${volver({ tipo: 'verConexion', proveedor: proveedor.id })}
    <p class="titulo">Para tu informático</p>
    <p class="detalle">${texto('Mándaselo a quien te lleve los ordenadores y las cuentas. Lo he revisado para quitar las claves: léelo antes de mandarlo.')}</p>
    ${paginas}
    <p class="pista">${texto(asunto)}</p>
    <pre class="salida">${texto(cuerpo)}</pre>
    <div class="fila">
      ${boton({ etiqueta: 'Copiarlo', icono: '📋', principal: true, accion: { tipo: 'copiarParaElInformatico', proveedor: proveedor.id } })}
      ${boton({ etiqueta: 'Mandarlo por correo', icono: '✉️', accion: { tipo: 'mandarAlInformatico', proveedor: proveedor.id } })}
    </div>
    ${deLaCarpeta ? '' : `
      <p class="detalle">${texto(`Lo he armado con lo que sé de ${proveedor.etiqueta}. El asistente puede dejarlo escrito con los permisos exactos.`)}</p>
      ${boton({ etiqueta: 'Que lo escriba el asistente', icono: '💬', accion: { tipo: 'pedir', prompt: `Escribe en el README de 01-TOOLS/${proveedor.id}/ una sección «## Para tu informático», como dice tu habilidad executive-lab: para qué es, qué acceso exactamente y con qué permisos mínimos, si basta con solo leer, la página donde se hace y qué preguntarle si no está claro. Investiga ${proveedor.etiqueta} de verdad antes de escribirla, y no pongas ninguna clave.` } })}`}
  `;
}

function pantallaResultado({ titulo, texto: salida, proveedor }) {
  return `
    <p class="titulo">${texto(titulo)}</p>
    <pre class="salida">${texto(salida)}</pre>
    ${boton({ etiqueta: 'Pregúntale por esto', icono: '💬', principal: true, accion: { tipo: 'pedir', prompt: `Acabo de ver el resultado de "${titulo}". Explícamelo y dime si hay algo que deba hacer.` } })}
    ${/* Volver llevaba a la pantalla de las claves del programa, que es lo
          último que quiere ver quien acaba de mirar sus facturas. Se vuelve a
          la lista de programas, que es de donde se venía. */''}
    ${volver({ tipo: 'verConexiones' })}
    ${boton({ etiqueta: 'Otra consulta de este programa', icono: '▸', discreto: true, pequeno: true, accion: { tipo: 'verConexion', proveedor } })}
  `;
}

// ---------------------------------------------------------------- cerebro

function pantallaCerebro({ temas, sinOrdenar = [], cuantosSinOrdenar, esperando, yaLeidos, hayPanel, aviso: avisoLocal }) {
  const porTemas = temas.length
    ? temas.map((t) => `
        <div class="conexion">
          <p class="nombre">${texto(t.descripcion || t.etiqueta)}</p>
          <p class="pista">${texto(plural(t.articulos.length, '1 cosa que sabe', '{n} cosas que sabe'))}</p>
          ${boton({ etiqueta: 'Verlo', icono: '▸', accion: { tipo: 'verTema', tema: t.id } })}
        </div>`).join('')
    : nada('Todavía no sabe nada. Dale documentos o cuéntaselo en la conversación.');

  // Lo que está escrito pero el índice no menciona. Hasta ahora no había forma
  // de llegar a ello desde aquí: existía en el disco y punto.
  const sueltos = sinOrdenar.length
    ? `<hr class="separador"><h2>Sin ordenar todavía</h2>` +
      `<p class="detalle">${texto(plural(cuantosSinOrdenar || sinOrdenar.length,
        'Hay 1 documento escrito que aún no está en su tema.',
        'Hay {n} documentos escritos que aún no están en su tema.'))}</p>` +
      sinOrdenar.map((d) => boton({
        etiqueta: d.titulo,
        icono: '▸',
        accion: { tipo: 'leerArticulo', ruta: d.ruta },
      })).join('') +
      boton({
        etiqueta: 'Que los ordene',
        icono: '🗂️',
        discreto: true,
        accion: { tipo: 'pedir', prompt: 'Hay documentos en la wiki que no están en el índice. Ponlos en su tema, con su resumen y su fecha, y deja el índice al día. Lo que esté en proyectos/<proyecto>/ es la documentación de cada proyecto: déjalo donde está.' },
      })
    : '';

  return `
    ${bloqueAviso(avisoLocal)}
    ${volver()}
    <p class="titulo">Conocimiento de ${texto(comoSeLlama)}</p>
    ${cajaDeBusqueda('conceptos')}
    ${porTemas}

    <hr class="separador">
    ${boton({ etiqueta: 'Darle documentos (inbox)', icono: '📎', principal: true, accion: { tipo: 'anadirDocumentos' } })}
    ${esperando ? `<p class="detalle">${texto(plural(esperando, 'Hay 1 documento esperando a que lo lea.', 'Hay {n} documentos esperando a que los lea.'))}</p>` : ''}
    ${yaLeidos ? `<p class="detalle">${texto(plural(yaLeidos, 'Ya ha leído 1 documento.', 'Ya ha leído {n} documentos.'))}</p>` : ''}
    ${hayPanel ? boton({ etiqueta: 'Ver el panel completo', icono: '🗂️', accion: { tipo: 'abrirPanelCompleto' } }) : ''}
    ${boton({ etiqueta: 'La foto del cerebro', icono: '🧠', accion: { tipo: 'verLaFoto', desde: 'cerebro' } })}
    ${sueltos}

  `;
}

// ------------------------------------------------------- la foto del cerebro

// El punto 11 de la decisión 142 (decisión 151). En clase, Eric mandó instalar
// Obsidian para hacerle una foto al cerebro; esto es esa foto, sin instalar
// nada: un punto por concepto y una línea por enlace, como su vista de grafo.
// Dónde va cada punto lo calcula la extensión (`foto.js`, puro y probado);
// aquí solo se pinta.
//
// En SVG dentro de la página y sin un solo estilo en línea: la política de
// contenido de la barra no deja otra cosa, y así cada punto es un elemento con
// su `data-accion`, que se pulsa como cualquier botón y abre su concepto. La
// foto que se guarda sale de un lienzo dibujado a mano con lo mismo: nada que
// cargar de fuera, ni una imagen `data:`.
let laFotoDeAhora = null;
// De dónde se llegó a la foto, para volver ahí desde un concepto.
let fotoDesde = 'documentos';
// En la barra, que es estrecha, el nombre de los diez que más enlazan; en la
// foto que se guarda, que es grande, el de los cuarenta.
const NOMBRES_EN_LA_BARRA = 10;
const corto = (t, cuanto = 28) => (String(t).length > cuanto ? `${String(t).slice(0, cuanto - 1)}…` : String(t));
const numero = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0);
const QUE_LOS_ENLACE = 'Repasa los conceptos de la wiki y enlaza entre sí los que tengan que ver, como pide el protocolo de la wiki. No cambies lo que dicen.';
const conceptosYEnlaces = (nodos, enlaces) => `${plural(nodos, '1 concepto', '{n} conceptos')} · ${plural(enlaces, '1 enlace', '{n} enlaces')}`;
// Los nombres que caben sin pisarse, de los que más enlazan a los que menos:
// uno que se montaría encima de otro ya puesto no se escribe. `letra` es el
// tamaño de la letra en las unidades del dibujo; el ancho se calcula a ojo.
function nombresQueCaben(f, cuantos, letra, hueco) {
  const puestos = [];
  for (const i of f.rotulos.slice(0, cuantos)) {
    const n = f.nodos[i];
    if (!n) continue;
    const nombre = corto(n.titulo, 28);
    const sitio = dondeVaElNombre(n, f.lado, hueco);
    const ancho = nombre.length * letra * 0.55;
    const x0 = sitio.ancla === 'start' ? sitio.x : (sitio.ancla === 'end' ? sitio.x - ancho : sitio.x - ancho / 2);
    const caja = { x0, x1: x0 + ancho, y0: sitio.y - letra, y1: sitio.y + letra * 0.3 };
    if (puestos.some(({ caja: o }) => caja.x0 < o.x1 && o.x0 < caja.x1 && caja.y0 < o.y1 && o.y0 < caja.y1)) continue;
    puestos.push({ nombre, sitio, caja });
  }
  return puestos;
}

// Dónde va el nombre de un punto: debajo, y encima si está abajo del todo; y
// hacia dentro si está en un borde, para que no se corte.
function dondeVaElNombre(n, lado, hueco = 34) {
  const x = numero(n.x);
  const y = numero(n.y);
  const r = numero(n.r);
  const ancla = x < lado * 0.3 ? 'start' : (x > lado * 0.7 ? 'end' : 'middle');
  return {
    x: ancla === 'start' ? x - r : (ancla === 'end' ? x + r : x),
    y: y > lado * 0.85 ? y - r - hueco / 3 : y + r + hueco,
    ancla,
  };
}

function pantallaFoto({ nodos = [], enlaces = [], total = 0, rotulos = [], lado = 1000, entera = true, desde = 'documentos', aviso: avisoLocal }) {
  fotoDesde = desde === 'cerebro' ? 'cerebro' : 'documentos';
  const deDonde = fotoDesde === 'cerebro'
    ? { etiqueta: 'Conocimiento', accion: { tipo: 'verCerebro' } }
    : { etiqueta: 'Documentos', accion: { tipo: 'verDocumentos' } };
  laFotoDeAhora = nodos.length ? { nodos, enlaces, rotulos, lado: numero(lado) || 1000 } : null;

  const cabecera = `
    ${migas([deDonde, { etiqueta: 'La foto del cerebro' }])}
    ${bloqueAviso(avisoLocal)}
    ${volver(deDonde.accion)}
    <p class="titulo">La foto del cerebro</p>`;

  // Sin conceptos no hay foto, pero sí salida (P1): darle documentos.
  if (!nodos.length) {
    return `${cabecera}
      ${nada('Todavía no hay conceptos que fotografiar. Dale documentos y los irá escribiendo.')}
      ${boton({ etiqueta: 'Darle documentos (inbox)', icono: '📎', principal: true, accion: { tipo: 'anadirDocumentos', desde: 'documentos' } })}`;
  }

  const punto = (i) => nodos[i] || { x: 0, y: 0, r: 0 };
  const lineas = enlaces.map(([a, b]) => `<line x1="${numero(punto(a).x)}" y1="${numero(punto(a).y)}" x2="${numero(punto(b).x)}" y2="${numero(punto(b).y)}"/>`).join('');
  // Cada punto se alcanza con el tabulador y se abre con Intro, como un botón
  // (revisión de corrección, 5).
  const puntos = nodos.map((n) => `<g class="nodo" tabindex="0" role="button" aria-label="${atributo(n.titulo)}" data-accion="${atributo(JSON.stringify({ tipo: 'leerArticulo', ruta: n.ruta, desde: 'foto' }))}"><circle cx="${numero(n.x)}" cy="${numero(n.y)}" r="${numero(n.r)}"/><title>${texto(n.titulo)}</title></g>`).join('');
  const nombres = nombresQueCaben(laFotoDeAhora, NOMBRES_EN_LA_BARRA, 30, 34)
    .map(({ nombre, sitio }) => `<text x="${sitio.x}" y="${sitio.y}" text-anchor="${sitio.ancla}">${texto(nombre)}</text>`).join('');
  const cuenta = conceptosYEnlaces(nodos.length, enlaces.length);
  const ladoDeVerdad = numero(lado) || 1000;

  return `${cabecera}
    <p class="detalle">${texto(cuenta)}</p>
    ${total > nodos.length ? `<p class="detalle">${texto(`Tiene ${total} conceptos: para que se vea, la foto enseña los ${nodos.length} con más enlaces.`)}</p>` : ''}
    ${entera === false ? '<p class="detalle">Hay tantos enlaces que no los he leído todos: la foto no está entera.</p>' : ''}
    <div class="foto">
      <svg viewBox="0 0 ${ladoDeVerdad} ${ladoDeVerdad}" role="group" aria-label="${atributo(`La foto del cerebro: ${cuenta}`)}">
        <g class="enlaces">${lineas}</g>
        <g class="nodos">${puntos}</g>
        <g class="rotulos">${nombres}</g>
      </svg>
    </div>
    <p class="detalle">Un punto por concepto y una línea por enlace. Pulsa un punto para leerlo.</p>
    ${enlaces.length ? '' : `
      <p class="detalle">Todavía ningún concepto enlaza con otro.</p>
      ${boton({ etiqueta: 'Que los enlace', icono: '🔗', accion: { tipo: 'pedir', prompt: QUE_LOS_ENLACE } })}`}
    ${boton({ etiqueta: 'Guardar la foto', icono: '📸', principal: true, accion: { tipo: 'guardarLaFoto' } })}
  `;
}

// Los colores de la barra, para que la foto se parezca a lo que se ve. Sin
// poderlos leer, los de Executive Lab.
function coloresDeLaFoto() {
  const de = (nombre, siNo) => {
    try {
      const valor = getComputedStyle(document.body).getPropertyValue(nombre).trim();
      return valor || siNo;
    } catch {
      return siNo;
    }
  };
  return {
    fondo: de('--fondo', '#f4eee6'),
    texto: de('--texto', '#1a1a1a'),
    apagado: de('--apagado', '#6b6b6b'),
    acento: de('--acento', '#ec4429'),
    letra: de('--sans', 'sans-serif'),
  };
}

// La foto que se guarda: el mismo dibujo en un lienzo de 1.600 puntos de lado,
// con de quién es y el día arriba, para que se entienda fuera de aquí. Devuelve
// el PNG en base64, o null si no hay lienzo: entonces la extensión dice que no
// ha podido, en vez de guardar nada a medias.
function laFotoEnPng(f = laFotoDeAhora) {
  if (!f) return null;
  try {
    const lienzo = document.createElement('canvas');
    const c = lienzo && typeof lienzo.getContext === 'function' ? lienzo.getContext('2d') : null;
    if (!c) return null;
    const LADO = 1600;
    const ARRIBA = 150;
    const e = LADO / f.lado;
    lienzo.width = LADO;
    lienzo.height = LADO + ARRIBA;
    const color = coloresDeLaFoto();

    c.fillStyle = color.fondo;
    c.fillRect(0, 0, lienzo.width, lienzo.height);
    c.textAlign = 'left';
    c.fillStyle = color.texto;
    c.font = `600 44px ${color.letra}`;
    c.fillText(corto(`Conocimiento de ${comoSeLlama}`, 60), 64, 78);
    c.fillStyle = color.apagado;
    c.font = `28px ${color.letra}`;
    const hoy = new Intl.DateTimeFormat('es-ES', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date());
    c.fillText(`${hoy} · ${conceptosYEnlaces(f.nodos.length, f.enlaces.length)}`, 64, 122);

    c.translate(0, ARRIBA);
    c.strokeStyle = color.apagado;
    c.globalAlpha = 0.45;
    c.lineWidth = 2;
    c.beginPath();
    for (const [a, b] of f.enlaces) {
      if (!f.nodos[a] || !f.nodos[b]) continue;
      c.moveTo(numero(f.nodos[a].x) * e, numero(f.nodos[a].y) * e);
      c.lineTo(numero(f.nodos[b].x) * e, numero(f.nodos[b].y) * e);
    }
    c.stroke();
    c.globalAlpha = 1;
    c.fillStyle = color.acento;
    for (const n of f.nodos) {
      c.beginPath();
      c.arc(numero(n.x) * e, numero(n.y) * e, numero(n.r) * e, 0, Math.PI * 2);
      c.fill();
    }
    c.font = `24px ${color.letra}`;
    c.lineWidth = 6;
    c.lineJoin = 'round';
    c.strokeStyle = color.fondo;
    c.fillStyle = color.texto;
    for (const { nombre, sitio } of nombresQueCaben(f, f.rotulos.length, 24 / e, 20)) {
      c.textAlign = { start: 'left', end: 'right', middle: 'center' }[sitio.ancla];
      c.strokeText(nombre, sitio.x * e, sitio.y * e);
      c.fillText(nombre, sitio.x * e, sitio.y * e);
    }

    const url = String(lienzo.toDataURL('image/png'));
    return url.startsWith('data:image/png;base64,') ? url.slice(url.indexOf(',') + 1) : null;
  } catch {
    return null;
  }
}

// Lo que ha salido de buscar. La caja se repinta con lo escrito dentro, así
// que se puede seguir tecleando y los resultados se van afinando solos.
function pantallaResultados({ texto: consulta, cuantos, grupos }) {
  const vacio = `
    ${nada(`No he encontrado nada con "${consulta}".`)}
    ${boton({
      etiqueta: 'Pregúntaselo al asistente',
      icono: '💬',
      principal: true,
      accion: { tipo: 'pedir', prompt: `He buscado "${consulta}" y no aparece nada. ¿Sabes algo de esto? Si no, dime qué necesitas para aprenderlo.` },
    })}`;

  const listas = grupos.map((g) => `
    <h2>${texto(g.titulo)}</h2>
    ${g.aciertos.map((a) => `
      <div class="conexion resultado">
        <p class="nombre">${resaltar(a.titulo, a.resaltar)}</p>
        ${a.frase ? `<p class="pista">${resaltar(a.frase, a.resaltar)}</p>` : ''}
        ${boton({ etiqueta: 'Verlo', icono: a.icono || '▸', accion: { ...a.accion, desde: 'buscar' } })}
      </div>`).join('')}`).join('');

  return `
    <p class="titulo">Conocimiento de ${texto(comoSeLlama)}</p>
    ${volver({ tipo: 'verCerebro' })}
    ${cajaDeBusqueda(ultimoBuscado, consulta)}
    ${/* «Coincidencias», no «resultados»: Resultados (out) es otra pantalla, la
          de lo que producen las conexiones, y la misma palabra para dos cosas
          es el fallo que este diccionario existe para evitar. */''}
    <p class="detalle">${texto(cuantos ? plural(cuantos, '1 coincidencia', '{n} coincidencias') : '')}</p>
    ${cuantos ? listas : vacio}
  `;
}

// Marcar lo buscado dentro de un texto, sin que marcarlo pueda convertirlo en
// etiquetas: se localiza sobre el texto crudo y se escapa cada trozo al
// pegarlo. Lo que se busca viene ya sin tildes y en minúsculas, así que hace
// falta un mapa de posiciones para saber a qué letra del original corresponde
// cada letra pelada (una "é" pelada ocupa una y en el original también, pero
// hay letras que al pelarse cambian de tamaño).
function pelarConMapa(valor) {
  let pelado = '';
  const mapa = [];
  for (let i = 0; i < valor.length; i += 1) {
    const trozo = valor[i].normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
    for (const letra of trozo) { pelado += letra; mapa.push(i); }
  }
  mapa.push(valor.length);
  return { pelado, mapa };
}

function resaltar(valor, terminos = []) {
  const crudo = valor == null ? '' : String(valor);
  // Si llega una palabra suelta en vez de una lista, recorrerla daría letra a
  // letra y se marcaría medio texto.
  const lista = Array.isArray(terminos) ? terminos : [terminos];
  const { pelado, mapa } = pelarConMapa(crudo);

  const rangos = [];
  for (const termino of lista) {
    if (!termino) continue;
    let donde = pelado.indexOf(termino);
    while (donde !== -1) {
      rangos.push([mapa[donde], mapa[donde + termino.length]]);
      donde = pelado.indexOf(termino, donde + termino.length);
    }
  }
  if (!rangos.length) return texto(crudo);

  rangos.sort((a, b) => a[0] - b[0]);
  const limpios = [];
  for (const rango of rangos) {
    const ultimo = limpios[limpios.length - 1];
    if (ultimo && rango[0] <= ultimo[1]) ultimo[1] = Math.max(ultimo[1], rango[1]);
    else limpios.push([...rango]);
  }

  let salida = '';
  let cursor = 0;
  for (const [desde, hasta] of limpios) {
    salida += `${texto(crudo.slice(cursor, desde))}<mark>${texto(crudo.slice(desde, hasta))}</mark>`;
    cursor = hasta;
  }
  return salida + texto(crudo.slice(cursor));
}

function pantallaTema({ tema }) {
  return `
    ${migas([
      { etiqueta: 'Conocimiento', accion: { tipo: 'verCerebro' } },
      { etiqueta: tema.etiqueta },
    ])}
    ${volver({ tipo: 'verCerebro' })}
    <p class="titulo">${texto(tema.descripcion || tema.etiqueta)}</p>
    ${tema.articulos.map((a) => `
      <div class="conexion">
        <p class="nombre">${texto(a.titulo)}</p>
        ${a.resumen ? `<p class="pista">${texto(a.resumen)}</p>` : ''}
        ${boton({
          etiqueta: 'Leerlo',
          icono: '▸',
          accion: a.ruta.endsWith('.md')
            ? { tipo: 'leerArticulo', ruta: a.ruta, tema: tema.id }
            : { tipo: 'abrirFuera', ruta: a.ruta },
        })}
      </div>`).join('')}
  `;
}

// El artículo, dentro del panel. La vista previa de VS Code enseñaría primero
// su cabecera técnica, que es justo lo que aquí no se enseña nunca.
function pantallaArticulo({ titulo, cuerpo, tema, enlaces, hermanos, desde }) {
  // Desde la foto del cerebro se vuelve a la foto, también tras seguir un
  // enlace de dentro del artículo (decisión 151).
  const aLaFoto = { tipo: 'verLaFoto', desde: fotoDesde };
  enlacesDesde = desde === 'foto' ? 'foto' : null;
  const atras = desde === 'buscar'
    ? { tipo: 'buscar', texto: ultimaBusqueda }
    : (desde === 'foto' ? aLaFoto : (tema ? { tipo: 'verTema', tema } : { tipo: 'verCerebro' }));

  const rastro = migas(desde === 'foto' ? [{ etiqueta: 'La foto del cerebro', accion: aLaFoto }, { etiqueta: titulo }] : [
    { etiqueta: 'Conocimiento', accion: { tipo: 'verCerebro' } },
    desde === 'buscar' ? { etiqueta: `Buscando "${ultimaBusqueda}"`, accion: { tipo: 'buscar', texto: ultimaBusqueda } } : null,
    tema && desde !== 'buscar' ? { etiqueta: tema, accion: { tipo: 'verTema', tema } } : null,
    { etiqueta: titulo },
  ]);

  // Leer una cosa y tener que volver dos pantallas para leer la siguiente del
  // mismo tema era una tontería.
  const seguir = hermanos && (hermanos.anterior || hermanos.siguiente)
    ? `<div class="hermanos">
        ${hermanos.anterior ? boton({ etiqueta: hermanos.anterior.titulo, icono: '←', discreto: true, accion: { tipo: 'leerArticulo', ruta: hermanos.anterior.ruta, tema } }) : ''}
        ${hermanos.siguiente ? boton({ etiqueta: hermanos.siguiente.titulo, icono: '→', discreto: true, accion: { tipo: 'leerArticulo', ruta: hermanos.siguiente.ruta, tema } }) : ''}
      </div>`
    : '';

  return `
    ${rastro}
    ${volver(atras)}
    <p class="titulo">${texto(titulo)}</p>
    <div class="articulo">${comoMarkdown(cuerpo, enlaces)}</div>
    ${seguir}
    <hr class="separador">
    ${boton({ etiqueta: 'Pídele que lo cambie', icono: '✎', accion: { tipo: 'cambiarArticulo', titulo } })}
  `;
}

// ----------------------------------------------------------------- resto

function pantallaCopias({ copias, delMontaje = null }) {
  // Y la que guardó el arnés de lo suyo al montarse, que no es de git y no se
  // veía por ningún lado (decisión 152).
  const delArnes = delMontaje ? `
    <hr class="separador">
    <h2>Copias que guarda el arnés</h2>
    <p class="detalle">${texto(delMontaje.texto)}</p>
    ${boton({ etiqueta: 'Ver la copia', icono: '🗂️', pequeno: true, accion: delMontaje.accion })}
    ${boton({ etiqueta: 'Recuperar lo que había', icono: '↩️', pequeno: true, discreto: true, accion: { tipo: 'recuperarLoQueHabia' } })}` : '';

  if (!copias.length) {
    return `<p class="titulo">Volver atrás</p>${nada('Todavía no has guardado ninguna copia.')}${delArnes}${volver()}`;
  }

  return `
    ${volver()}
    <p class="titulo">Volver atrás</p>
    <p class="detalle">Antes de mover nada guardo una copia de lo de ahora, así que esto también se puede deshacer.</p>
    ${copias.map((c) => boton({ etiqueta: c.etiqueta, icono: '↩️', accion: { tipo: 'volverA', id: c.id } })).join('')}
    ${delArnes}
  `;
}

// ── Contárselo a Executive Lab ──────────────────────────────────────────
//
// Qué se quiere contar, con tres opciones hechas: una caja vacía delante de
// alguien que no sabe qué escribir es una pared (regla 5 del diccionario). Los
// rótulos vienen de `avisos.js`, que es de donde salen también en GitHub.
function pantallaContar({ tipos = [] }) {
  return `
    <p class="titulo">Contárselo a Executive Lab</p>
    ${volver({ tipo: 'verAyuda' })}
    <p>Lo lee quien hace esta barra, para arreglarla o mejorarla. ¿Qué le quieres contar?</p>
    ${tipos.map((t) => boton({ etiqueta: t.etiqueta, icono: t.icono, accion: { tipo: 'contar', cual: t.id } })).join('')}
  `;
}

// Lo que se va a mandar, entero, antes de mandarlo. La caja se puede cambiar, y
// lo que va debajo se ve en «Qué más va con esto»: es lo mismo que sale, ya
// limpio. Y se dice dónde va y quién lo puede leer, porque eso es lo que se le
// está pidiendo que decida (decisión 131).
function pantallaElAviso({ etiqueta, icono, ejemplo, origen, texto: loQueDice = '', titulo = null, datos = '', nota = null, guardado = false, hayQueEscribir = false }) {
  const QUIEN = {
    alumno: 'Cuéntalo con tus palabras. Lo demás lo pongo yo.',
    asistente: 'Lo ha preparado tu asistente. Léelo y cámbialo si quieres.',
    barra: 'Lo ha apuntado la barra al fallar. Si sabes qué estabas haciendo, añádelo; si no, mándalo tal cual.',
  };
  return `
    <p class="titulo">Contárselo a Executive Lab</p>
    ${volver()}
    ${nota ? `<div class="aviso">${texto(nota)}</div>` : ''}
    <p class="que">${icono ? `<span aria-hidden="true">${icono}</span> ` : ''}${texto(etiqueta)}</p>
    <p class="detalle">${texto(QUIEN[origen] || QUIEN.alumno)}</p>
    ${/* El título es lo primero que se ve en GitHub. El del alumno sale de lo
          que escribe; el que puso otro, se enseña y se puede cambiar. */''}
    ${titulo !== null && titulo !== undefined ? `
      <p class="detalle">Va con este título:</p>
      <input type="text" data-aviso-titulo value="${atributo(titulo)}">` : ''}
    <textarea class="caja" data-aviso rows="7"${hayQueEscribir ? ' data-hace-falta' : ''} placeholder="${atributo(ejemplo || '')}">${texto(loQueDice)}</textarea>
    <details class="acordeon">
      <summary>Qué más va con esto</summary>
      <p class="detalle">Va debajo de lo que escribas. Antes de mandarlo quito de todo tus claves de acceso, el nombre de tu empresa y las carpetas de tu ordenador.</p>
      <pre class="datos">${texto(datos)}</pre>
    </details>
    <p class="detalle">Se publica en GitHub con tu cuenta, y lo puede leer cualquiera. No pongas nada de tu empresa.</p>
    ${boton({ etiqueta: 'Mandarlo', icono: '📨', principal: true, accion: { tipo: 'mandarElAviso' } })}
    ${guardado ? boton({ etiqueta: 'No mandarlo', discreto: true, accion: { tipo: 'noMandarElAviso' } }) : ''}
  `;
}

function pantallaIncidencia({ codigo, fichero, sano, desconocido, hayQueTocarAlgo, faltaGit, comoSeInstalaGit }) {
  // Si lo que falta es git, arreglar el arnés no sirve de nada: la pieza no
  // está. Se dice eso y se ofrece ponerla, en vez de un botón que no puede.
  //
  // Sin el diagnóstico del arnés no se sabe, y no se dice «He encontrado algo»
  // ni se ofrece arreglar lo que no se ha visto. Y nada de «tu empresa»: esto
  // puede ser un departamento (revisión de F7, m4).
  //
  // Lo que se dice y lo que se ofrece salen de lo mismo: si hay algo que el
  // arreglo puede tocar, se dice que se ha encontrado algo. Antes una carpeta sana
  // decía «He mirado y está todo bien.» y ofrecía «Arreglarlo ahora» (decisión 166).
  const arreglable = !faltaGit && ((!sano && !desconocido) || hayQueTocarAlgo);
  const todoBien = !faltaGit && !arreglable && sano;
  const queDigo = faltaGit
    ? 'Falta una pieza en este ordenador, y sin ella no puedo hacer casi nada.'
    : (arreglable ? 'He encontrado algo y puedo intentar arreglarlo.'
      : (sano ? 'He mirado y está todo bien.' : 'No he podido revisarlo entero.'));

  return `
    <p class="titulo">Algo va mal</p>
    ${volver()}
    <p>${texto(queDigo)}</p>
    ${faltaGit ? `<p class="detalle">${texto(comoSeInstalaGit || '')}</p>` : ''}
    <p class="detalle">Si hablas con tu tutor, dale este código:</p>
    <span class="codigo">${texto(codigo)}</span>
    ${faltaGit ? boton({ etiqueta: 'Ponerla ahora', icono: '⬇️', principal: true, accion: { tipo: 'instalarGit' } }) : ''}
    ${arreglable ? boton({ etiqueta: 'Arreglarlo ahora', icono: '🛠️', principal: true, accion: { tipo: 'arreglar' } }) : ''}
    ${/* Con todo sano, lo que no va no es la carpeta: lo mira el asistente, con
          este informe delante (decisión 166). */''}
    ${todoBien ? `
      <p class="detalle">Si algo no te va, cuéntaselo al asistente: le paso este informe y lo repasa todo.</p>
      ${boton({ etiqueta: 'Contárselo al asistente', icono: '🩺', principal: true, accion: { tipo: 'resolverIncidencia', cual: 'algoVaMal' } })}` : ''}
    ${fichero ? boton({ etiqueta: 'Enseñar el informe', icono: '📄', accion: { tipo: 'verElInforme', fichero } }) : ''}
    ${/* Y que le llegue a quien hace la barra, con el informe y su código:
          así Jose y el tutor hablan de lo mismo (decisión 131). Con todo sano,
          solo si lo que falla es la barra (decisión 166). */''}
    ${todoBien ? '<p class="detalle">Si lo que falla es esta barra, cuéntaselo a quien la hace.</p>' : ''}
    ${boton({ etiqueta: 'Contárselo a Executive Lab', icono: '📣', discreto: todoBien, accion: { tipo: 'contarLaIncidencia' } })}
  `;
}

// ------------------------------------------------------------------ pintado

function pintar(html) {
  // Salvo la de la marca, que lo pone justo antes de pintar.
  if (!/El tema de mi empresa/.test(html)) dondeCaeLoQueSueltas = 'documentos';
  // La de un fichero de acceso la pone su pantalla, después de pintarse.
  conexionQueRecibe = null;
  // Cualquier pantalla que no sea la de esperar para el reloj.
  if (!html.includes('data-cuanto')) pararElReloj();
  // Repintar tira el scroll al principio. Si se está en la misma pantalla —el
  // vigía repinta sola cuando el arnés escribe— se repone donde estaba.
  const desplazado = document.scrollingElement ? document.scrollingElement.scrollTop : 0;
  const mismaPantalla = html.slice(0, 200) === ultimoPintado.slice(0, 200);
  ultimoPintado = html;

  app.innerHTML = html;

  app.querySelectorAll('[data-accion]').forEach((b) => {
    const alPulsar = () => {
      const accion = JSON.parse(b.dataset.accion);
      if (accion.tipo === 'guardarClave') {
        const campo = b.closest('.conexion').querySelector('input[data-clave]');
        if (!campo.value.trim()) return;
        accion.valor = campo.value;
      }
      // El usuario y la contraseña van juntos, con un solo «Guardar» (decisión 156).
      if (accion.tipo === 'guardarClaves') {
        const valores = {};
        b.closest('.conexion').querySelectorAll('input[data-clave]').forEach((campo) => {
          if (campo.value.trim()) valores[campo.dataset.clave] = campo.value;
        });
        if (!Object.keys(valores).length) return;
        accion.valores = valores;
      }
      // Lo que diga la caja en el momento de pulsar, que es lo que ha leído.
      // Si lo cuenta el alumno y está vacía, no se manda: se le pone ahí.
      if (accion.tipo === 'mandarElAviso') {
        const caja = app.querySelector('textarea[data-aviso]');
        const escrito = caja ? caja.value : '';
        if (caja && caja.hasAttribute('data-hace-falta') && !escrito.trim()) {
          caja.focus();
          return;
        }
        accion.texto = escrito;
        const campoDelTitulo = app.querySelector('input[data-aviso-titulo]');
        if (campoDelTitulo) accion.titulo = campoDelTitulo.value;
      }
      // La foto se dibuja aquí, que es donde está el dibujo, y viaja en PNG.
      if (accion.tipo === 'guardarLaFoto') {
        const png = laFotoEnPng();
        if (png) accion.png = png;
      }
      aviso = null;
      pedir(accion.tipo, accion);
    };
    b.addEventListener('click', alPulsar);
    // Lo que no es un botón pero hace de botón (los puntos de la foto) se pulsa
    // también con Intro o con la barra espaciadora (revisión de corrección, 5).
    if (b.getAttribute && b.getAttribute('role') === 'button') {
      b.addEventListener('keydown', (e) => {
        if (e.key !== 'Enter' && e.key !== ' ') return;
        e.preventDefault();
        alPulsar();
      });
    }
  });

  engancharLasInfos();
  engancharLaBusqueda();

  if (mismaPantalla && document.scrollingElement) document.scrollingElement.scrollTop = desplazado;
}

// La (i) de cada fila. Abre y cierra ahí mismo, sin pedirle nada a la
// extensión y sin repintar: repintar tiraría el scroll al principio, que en una
// lista de veinticinco cosas es perder el sitio cada vez que miras una.
function engancharLasInfos() {
  app.querySelectorAll('[data-info]').forEach((b) => {
    b.addEventListener('click', () => {
      const cual = app.querySelector(`#${b.dataset.info}`);
      if (!cual) return;
      const seVe = !cual.hidden;
      cual.hidden = seVe;
      b.setAttribute('aria-expanded', String(!seVe));
      if (seVe) b.classList.remove('abierta');
      else b.classList.add('abierta');
    });
  });
}

// La caja de buscar: se escribe y los resultados se van afinando solos, sin
// pulsar nada. Cada resultado repinta la pantalla entera —así es todo este
// panel— así que hay que devolver el cursor a donde estaba.
function engancharLaBusqueda() {
  const caja = app.querySelector('input[data-buscar]');
  if (!caja) return;

  if (caja.value) {
    caja.focus();
    caja.setSelectionRange(caja.value.length, caja.value.length);
  }

  // Cada caja busca en lo suyo y, al vaciarse, vuelve a su propia pantalla.
  const donde = caja.dataset.donde || 'conceptos';
  const aSuSitio = donde === 'papeles' ? 'verPapeles' : 'verCerebro';
  ultimoBuscado = donde;

  let reloj = null;
  caja.addEventListener('input', () => {
    clearTimeout(reloj);
    const loEscrito = caja.value;
    // Un cuarto de segundo: lo justo para no buscar a cada tecla y que siga
    // pareciendo instantáneo.
    reloj = setTimeout(() => {
      ultimaBusqueda = loEscrito;
      aviso = null;
      if (loEscrito.trim()) pedir('buscar', { texto: loEscrito, donde });
      else pedir(aSuSitio);
    }, 250);
  });

  caja.addEventListener('keydown', (evento) => {
    if (evento.key !== 'Escape') return;
    clearTimeout(reloj);
    ultimaBusqueda = '';
    pedir(aSuSitio);
  });
}

// Si pintar revienta, ANTES no pasaba nada visible: se quedaba la pantalla
// anterior puesta y la barra parecía colgada. Eso ha pasado dos veces y las dos
// hubo que descubrirlas mirando. Ahora un fallo se ve, y con salida.
function pintarElFallo(error) {
  pintar(`
    <p class="titulo">Algo no se ha podido pintar</p>
    <p>Se me ha atragantado esta pantalla. Pulsa «Algo va mal» y pásale el código a tu tutor.</p>
    ${boton({ etiqueta: 'Algo va mal', icono: '🆘', principal: true, accion: { tipo: 'algoVaMal' } })}
    ${boton({ etiqueta: 'Volver', icono: '←', accion: { tipo: 'volver' } })}
  `);
  // El motivo técnico, en inglés, no se enseña: se apunta para el informe.
  try { pedir('falloAlPintar', { mensaje: String((error && error.message) || error).slice(0, 500) }); } catch { /* sin extensión no hay a quién decírselo */ }
}

window.addEventListener('message', ({ data }) => {
  try {
    return atender(data);
  } catch (error) {
    pintarElFallo(error);
    return undefined;
  }
});

function atender(data) {
  switch (data.tipo) {
    case 'cargando': return pintar(pantallaEsperando());
    case 'esperando':
      pintar(pantallaEsperando(data.que, data.boton));
      return arrancarElReloj();
    case 'estado':
      // Lo que la extensión manda al lado del estado y esta pantalla lee
      // dentro de él. Se leía solo `data.estado`, así que el consejo, el aviso
      // de versión nueva, «En qué estamos» y el botón de Agentes no salían
      // nunca, y ninguna prueba lo veía: las del panel les pasaban el estado ya
      // con todo dentro (decisión 131).
      estado = data.estado ? { ...data.estado } : data.estado;
      if (estado) {
        for (const campo of ['consejo', 'hayVersionNueva', 'versionPuesta', 'versionDePrueba', 'hayProyectos', 'hayAgentes', 'hayRecordatorios', 'avisoParaExecutiveLab', 'arreglado', 'queTrae',
          'barraCompleta', 'piezas', 'comandos', 'habilidades', 'copias', 'versionDeLaBarra', 'recordatorio', 'costumbrePuesta', 'datosDeClientes', 'enganchesDeCodex',
          'seAdapta', 'sigueSinCopias', 'laUltimaVez', 'clavesEnLasCopias', 'clavesFueraDeSitio', 'proyectosDeDentro']) {
          if (data[campo] !== undefined) estado[campo] = data[campo];
        }
      }
      accionesDescubiertas = data.acciones || [];
      puedeTenerBotones = data.puedeTenerBotones !== false;
      pulso = data.pulso || [];
      modo = data.modo || 'sencillo';
      marcaPuesta = data.marcaPuesta !== false;
      comoSeLlama = data.comoSeLlama || 'tu trabajo';
      return pintar(pantallaPrincipal());
    case 'conexiones': return pintar(pantallaConexiones(data));
    case 'conexion':
      pintar(pantallaConexion(data));
      // Si pide un fichero de acceso, lo que se suelta encima va a ella (decisión 156).
      if (data.proveedor && (data.proveedor.acceso || []).includes('fichero')) {
        dondeCaeLoQueSueltas = 'acceso';
        conexionQueRecibe = data.proveedor.id;
      }
      return undefined;
    case 'informatico': return pintar(pantallaInformatico(data));
    case 'resultado': return pintar(pantallaResultado(data));
    case 'cerebro':
      ultimaBusqueda = '';
      return pintar(pantallaCerebro(data));
    case 'resultados':
      ultimaBusqueda = data.texto;
      return pintar(pantallaResultados(data));
    case 'tema': return pintar(pantallaTema(data));
    case 'articulo': return pintar(pantallaArticulo(data));
    case 'copias': return pintar(pantallaCopias(data));
    case 'copiaFuera': return pintar(pantallaCopiaFuera(data));
    case 'radiografia': return pintar(pantallaRadiografia(data));
    case 'saberes': return pintar(pantallaSaberes(data));
    case 'recordatorios': return pintar(pantallaRecordatorios(data));
    case 'salidas': return pintar(pantallaSalidas(data));
    case 'papeles': return pintar(pantallaPapeles(data));
    case 'documentos': return pintar(pantallaDocumentos(data));
    case 'foto': return pintar(pantallaFoto(data));
    case 'fijadas': return pintar(pantallaFijadas(data));
    case 'ayuda': return pintar(pantallaAyuda(data));
    case 'estaBarra': return pintar(pantallaEstaBarra(data));
    case 'datosDeClientes': return pintar(pantallaDatosDeClientes({ ...data.tabla, soloLoPegado: data.soloLoPegado === true }));
    case 'reglas': return pintar(pantallaReglas(data));
    case 'asistente': return pintar(pantallaAsistente(data));
    case 'comoTrabaja': return pintar(pantallaComoTrabaja(data));
    case 'proyectos': return pintar(pantallaProyectos(data));
    case 'comandos':
      // Se puede llegar aquí sin pasar por la principal (desde la paleta del
      // editor), y es la principal la que fija esto. Si el mensaje lo trae, manda.
      if (data.puedeTenerBotones !== undefined) puedeTenerBotones = data.puedeTenerBotones;
      return pintar(pantallaComandos(data));
    case 'sugerencias': return pintar(pantallaSugerencias(data));
    case 'agentes': return pintar(pantallaAgentes(data));
    case 'laCara':
      dondeCaeLoQueSueltas = 'marca';
      return pintar(pantallaLaCara(data));
    case 'huecos': return pintar(pantallaHuecos(data));
    case 'diario': return pintar(pantallaDiario(data));
    case 'trato': return pintar(pantallaTrato(data));
    case 'incidencia': return pintar(pantallaIncidencia(data));
    case 'contar': return pintar(pantallaContar(data));
    case 'elAviso': return pintar(pantallaElAviso(data));
    case 'aviso':
      // Con varios botones si es una pregunta o tiene más de una salida: git que no
      // se ha puesto se puede volver a intentar o seguir sin copias (decisión 165).
      aviso = { texto: data.texto, malo: data.malo, boton: data.boton, ...(Array.isArray(data.botones) && data.botones.length ? { botones: data.botones } : {}) };
      return pintar(pantallaPrincipal());
    default:
      // Un mensaje que no conocemos no puede dejar la pantalla congelada: eso
      // fue exactamente lo que pasó cuando un campo `tipo` de los datos pisó el
      // del mensaje.
      return pintarElFallo(`No sé qué hacer con "${data.tipo}".`);
  }
}

pedir('listo');
