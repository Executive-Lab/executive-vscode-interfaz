// La barra lateral Executive Lab.
//
// Una sola vista. Nada de lo que enseña está predefinido: sale de lo que el
// arnés tenga montado en esta carpeta — las herramientas de `01-TOOLS/`, los
// comandos de `.claude/commands/`, la wiki de `02-DOCS/`. Una gestoría y una
// empresa de contratos ven cosas distintas porque tienen cosas distintas.
//
// Todo lo que se enseña está en docs/diccionario.md; si hace falta una palabra
// que no esté, se añade allí primero.

const vscode = require('vscode');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');

const proyecto = require('./proyecto');
const brujula = require('./brujula');
const identidad = require('./identidad');
const puente = require('./puente');
const acciones = require('./acciones');
const conexiones = require('./conexiones');
const mcp = require('./mcp');
const informatico = require('./informatico');
// La guía para sacar la clave, en PDF (decisión 159). `guia` a secas ya es el paso de la guía de la barra.
const guiaPdf = require('./guia');
const sueltas = require('./sueltas');
// Sin confianza en la carpeta no se corre `git` en ella (revisión de la 167).
sueltas.ponerConfianza(() => vscode.workspace.isTrusted !== false);
// Los encargos con su diagnóstico: «Resolver una incidencia» los usaba sin traerlos, y reventaba siempre (G1).
const encargos = require('./encargos');
const cerebro = require('./cerebro');
const buscador = require('./buscar');
const consejos = require('./consejos');
// Se adapta y da ideas (F6, decisión 152): «Esto parece …» y las ideas de lo que hay.
const ideas = require('./ideas');
const recordatorios = require('./recordatorios');
const rutinas = require('./rutinas');
const cuando = require('./cuando');
const copias = require('./guardar');
const soporte = require('./soporte');
const { avisarConSalida } = require('./salida-del-aviso');
// Lo que falla, lo que no se entiende y lo que se echa en falta, para Jose (decisión 131).
const avisos = require('./avisos');
const rsc = require('./rsc');
const disfraz = require('./disfraz');
const arrancar = require('./arrancar');
const git = require('./git');
const github = require('./github');
const terreno = require('./terreno');
const saberes = require('./saberes');
const deshacer = require('./deshacer');
const salidas = require('./salidas');
// La foto del cerebro (decisión 151): el dibujo es puro; aquí solo se lee y se guarda.
const foto = require('./foto');
// Donde quedan las fotos (por qué ahí, en `foto.js`).
const LAS_FOTOS = foto.CARPETA;
const version = require('./version');
const diario = require('./diario');
const papeles = require('./papeles');
const reglas = require('./reglas');
const ajustes = require('./ajustes');
const donde = require('./donde');
const solo = require('./solo');

// P9: la carpeta que este ordenador ya conoce, los botones que corren el arnés o
// tocan sus copias, y lo que se dice si se pulsan mientras la barra arregla sola.
const CLAVE_CONOCIDA = 'executiveLab.carpetaConocida';
const LOS_DEL_ARNES = new Set(['arrancar', 'seguirSinCopias', 'arreglar', 'ponerCopias', 'ponerElFreno', 'ponerElBloque', 'elegirAsistente', 'prepararTambien', 'aprenderCapacidad', 'quitarHabilidad', 'quitarAgente', 'recuperarLoQueHabia']);
const OCUPADA = 'Estoy arreglando esta carpeta. Pulsa otra vez en un momento.';
// En una carpeta que va por delante, lo que escribe con el arnés espera a que la
// barra se ponga al día (P7, decisión 145; `rsc.correr`). Mientras, el asistente.
const ESCRIBEN_CON_EL_ARNES = new Set(['arrancar', 'seguirSinCopias', 'arreglar', 'aprenderCapacidad', 'cambiarInterruptor', 'quitarHabilidad', 'quitarAgente', 'recuperarLoQueHabia']);
const POR_DELANTE = 'Esta carpeta lleva una versión del arnés más nueva que la de la barra. Hasta que la barra se ponga al día, pídeselo al asistente.';
// Lo que el asistente le pide a la barra (decisión 150).
const pedidos = require('./pedidos');
const conectar = require('./conectar');
// Lo de la carpeta que entra en un encargo, en una línea y sin comillas (`limpio.js`).
const { etiqueta: unRotulo } = require('./limpio');
const nombres = require('./nombres');
const pulso = require('./pulso');
const fijadas = require('./fijadas');
const tema = require('./tema');
const proyectos = require('./proyectos');
const subproyectos = require('./subproyectos');
const agentes = require('./agentes');
const asistentes = require('./asistentes');
const trato = require('./trato');
const lecciones = require('./lecciones');
const marca = require('./marca');
const web = require('./web');
const rastro = require('./rastro');
const entorno = require('./entorno');
const relevo = require('./relevo');
const clientes = require('./clientes');
const sitio = require('./sitio');
const ajustesLocales = require('./ajustes-locales');
const deAlguien = require('./de-alguien');
const procesos = require('./procesos');
const retirados = require('./retirados');
const sesionDelAsistente = require('./sesion-del-asistente');
const avisoDeCodex = require('./aviso-de-codex');
const enganchesDeCodex = require('./enganches-de-codex');
const loDelEditor = require('./lo-del-editor');
const loNuevoDeClaude = require('./lo-nuevo-de-claude');
const lasRespuestas = require('./respuestas');
const porDondeIbas = require('./por-donde-ibas');
const ultimaConversacion = require('./ultima-conversacion');

// Lo que la barra recuerda de esta carpeta, y que nadie más ve: las últimas
// peticiones (para detectar la que se repite) y los consejos que el alumno
// apartó con "ahora no".
// Qué se le dice a esa persona cuando el arranque NO ha montado nada nuevo.
// Cada rama hizo una cosa distinta y decir «ya está listo» en las cuatro sería
// no decir nada.
// El botón que va con lo que la barra dejó en los ajustes de Claude (decisión 157):
// es local y se deshace, y lo quitado no vuelve. Al montar se quita todo, que se
// puso a la vez; al abrir, lo que cuenta ese aviso y nada más (decisión 162): el
// de los avisos del sistema no se lleva el español que se puso otro día.
const QUITAR_LO_DE_CLAUDE = { etiqueta: 'Quitarlo', accion: { tipo: 'quitarLoDeClaude' } };
const QUITAR_EL_AVISO_DE_CODEX = { etiqueta: 'Quitarlo', accion: { tipo: 'quitarElAvisoDeCodex' } };
const quitarSoloEsto = (que) => ({ etiqueta: 'Quitarlo', accion: { tipo: 'quitarLoDeClaude', que } });

// Lo que se dice cuando un texto ha quedado escrito en la caja del asistente:
// escrito, no enviado (`asistentes.js`). Lo dicen `pedir` y lo que manda algo
// detrás de hacer otra cosa, como darle documentos (decisión 166).
// Lo que el montaje hace solo (decisión 181), cada cosa con su «Quitarlo». Con una
// sola sale «Quitarlo»; con varias, cada una dice qué quita.
const QUITAR_EL_GUARDADO_SOLO = { etiqueta: 'Quitarlo', etiquetaConVarios: 'Quitar las copias solas', accion: { tipo: 'quitarElGuardadoSolo' } };
const QUITAR_LO_DE_CLAUDE_DEL_MONTAJE = { ...QUITAR_LO_DE_CLAUDE, etiquetaConVarios: 'Quitar lo de Claude' };
const DALE_A_ENVIAR = 'Te lo he dejado escrito en la conversación. Dale a enviar.';

// Lo que se dice al dejar la cuenta de GitHub para más tarde, al montar: dónde
// queda, con su botón (decisión 164).
// Sin sesión en el asistente, el primer encargo espera (decisión 186).
const PRIMERO_LA_CUENTA = 'Antes de nada, entra con tu cuenta en el asistente. El primer encargo te espera: en cuanto entres, lo mando.';
// Cuánto vale el «Sí, ahora» para subir la copia al volver del acceso del editor.
const VIGENCIA_DEL_SI_AHORA = 30 * 60 * 1000;
const GITHUB_MAS_TARDE = 'Cuando quieras preparar la cuenta de GitHub, la tienes en Ayuda › Sugerencias.';

const LO_QUE_SE_HIZO = {
  traer: 'Ya tienes aquí lo que esta carpeta traía puesto.',
  completar: 'He terminado de prepararlo. Ya está entero.',
  sinRecibo: 'Lo he puesto al día con lo que esta carpeta declaraba.',
  adoptar: 'Le he puesto lo que le faltaba de la barra.',
  ponerAlDia: 'Lo he puesto al día con la versión que trae la barra.',
};

// Lo que se le pide al asistente para el foro (decisión 139): un mensaje que se
// entienda sin estar aquí, y nada que no deba salir del ordenador.
const PEDIR_AYUDA_EN_EL_FORO = 'Quiero pedir ayuda en el foro de Executive Lab. Escríbeme el mensaje para publicarlo: qué intento hacer, qué ha pasado y qué he probado ya, en pocas líneas y en un bloque que pueda copiar de una vez. Que se entienda sin estar aquí, y sin claves, contraseñas ni datos de clientes. Si no sabes qué me pasa, pregúntamelo antes de escribirlo.';
const CLAVE_PETICIONES = 'executiveLab.peticiones';
// Los recordatorios (decisión 144): cuándo se pulsó cada botón, cuándo se hizo
// o se dejó para luego cada recordatorio, de cuál se avisó ya, y las costumbres
// que la barra convirtió en recordatorio (para decirlo una vez y no repetirlo).
// Lo que dijo la última prueba de cada conexión, con la huella de sus claves
// (decisión 146): la lista lo enseña mientras las claves sigan igual.
const CLAVE_PRUEBAS = 'executiveLab.pruebasDeConexion';
// Las conexiones cuya clave puede escribir y que esa persona eligió dejar así, con
// la huella de sus claves: con otra clave se pregunta otra vez (punto 7 de la 142).
const CLAVE_PUEDEN_ESCRIBIR = 'executiveLab.clavesQuePuedenEscribir';
// Cuándo caduca la clave de cada conexión, con la huella de sus claves (con otra
// clave, se pregunta otra vez), y de qué fecha se avisó ya (decisión 149).
const CLAVE_CADUCAN = 'executiveLab.cuandoCaducanLasClaves';
const CLAVE_CADUCAN_AVISADAS = 'executiveLab.caducidadesAvisadas';
const CADUCA_EN = { 30: 30, 90: 90, 365: 365 };
// «el 21 de octubre», y con el año si no es este.
const elDia = (cuando, ahora = Date.now()) => `el ${new Intl.DateTimeFormat('es-ES', { day: 'numeric', month: 'long', ...(new Date(cuando).getFullYear() !== new Date(ahora).getFullYear() ? { year: 'numeric' } : {}) }).format(new Date(cuando))}`;
const CLAVE_USOS = 'executiveLab.usosDeBotones';
const CLAVE_RECORDATORIOS = 'executiveLab.recordatoriosHechos';
const CLAVE_AVISADOS = 'executiveLab.recordatoriosAvisados';
const CLAVE_COSTUMBRES = 'executiveLab.costumbresPuestas';
const CLAVE_RECORDATORIOS_VISTOS = 'executiveLab.recordatoriosVistos';
const CLAVE_SILENCIADOS = 'executiveLab.consejosApartados';
const CLAVE_CONSEJOS_RECHAZADOS = 'executiveLab.consejosDeClaudeRechazados';
// Las tarjetas de las claves (decisión 167), apartadas con «Ahora no»: vuelven a
// la semana, antes que un consejo, porque una clave mal guardada puede costar dinero.
const CLAVES_APARTADAS_DURANTE = 7 * 24 * 60 * 60 * 1000;
// Si ya se dijo «Esto parece …» en esta carpeta, o si la primera vez no había
// nada que decir (decisión 152).
const CLAVE_LO_QUE_PARECE = 'executiveLab.loQueParece';
// La última versión de la barra que se abrió aquí, para saber si hay que decir
// qué trae la de ahora; y cuándo se miró en GitHub lo que pasó con los avisos
// mandados de esta carpeta (decisión 134).
const CLAVE_VERSION_VISTA = 'executiveLab.versionVista';
const CLAVE_ARREGLADOS_MIRADOS = 'executiveLab.arregladosMirados';
const CLAVE_MANDADOS = 'executiveLab.avisosMandados';
const UN_DIA = 24 * 60 * 60 * 1000;
// Una versión nueva apartada con «Ahora no» vuelve a salir a los tres días: no
// es urgente, pero quedarse atrás tampoco es gratis (decisión 132).
const VERSION_APARTADA_DURANTE = 3 * 24 * 60 * 60 * 1000;

class Panel {
  constructor(contexto, salida) {
    this.contexto = contexto;
    this.salida = salida;
    this.vista = null;
    // Si esta barra ya se usaba antes de abrirse ahora: una de antes dejó
    // apuntado cuándo miró si había versión nueva. Se mira al arrancar, antes
    // de que Ayuda o la principal lo apunten ellas (revisión de la decisión 134).
    this.yaSeUsaba = Boolean(contexto.globalState && contexto.globalState.get(version.CLAVE));
    // En qué pantalla está el alumno. Cuando el arnés cambia algo por detrás
    // se repinta la que tiene delante, no se le devuelve a la principal: que
    // te saquen de donde estabas mientras rellenas una clave es peor que no
    // enterarte del cambio.
    this.donde = { tipo: 'principal' };
  }

  resolveWebviewView(vista) {
    this.vista = vista;
    this.ponerleElNombre();
    this.pintarPagina();
    vista.webview.onDidReceiveMessage((m) => this.manejar(m));

    // Al volver a mirar la barra lateral, la brújula se pone al día sola.
    // Si mientras estaba escondida cambió algo (decisión 188), se repinta lo que
    // tenía delante con lo de ahora; si no, la brújula de siempre.
    vista.onDidChangeVisibility(() => {
      if (!vista.visible) return;
      if (this.sucio) { this.sucio = false; this.repintarLoQueHaya().catch(() => {}); } else this.refrescar();
    });
  }

  // La página entera. Se rehace solo cuando cambia la marca de la empresa,
  // porque eso cambia los colores y el logotipo; lo demás va por mensajes.
  pintarPagina() {
    if (!this.vista) return;
    const medios = vscode.Uri.joinPath(this.contexto.extensionUri, 'media');
    const suya = marca.leer();

    // Al logotipo de la empresa se le da acceso de lectura a su carpeta, y a
    // esa sola: no hace falta abrirle el resto del trabajo del alumno.
    const raices = [medios];
    if (suya && suya.carpeta) raices.push(vscode.Uri.file(suya.carpeta));

    this.vista.webview.options = { enableScripts: true, localResourceRoots: raices };
    this.vista.webview.html = this.html(this.vista.webview, medios, suya);
  }

  // ── Nuestro logotipo, teñido ─────────────────────────────────────────
  //
  // Va escrito en negro. Sobre un tema oscuro del editor eso es un logotipo
  // negro sobre fondo negro: no se ve. Como imagen no hay forma de arreglarlo
  // —una `<img>` no se puede repintar desde la hoja de estilo— así que se mete
  // el dibujo dentro de la página y sus dos colores pasan a ser los de la
  // barra: el nombre toma el color del texto y el asterisco el del acento.
  //
  // Solo el nuestro. El logotipo de una empresa es suyo y se pinta como ella lo
  // hizo; teñirlo sería cambiarle la marca.
  nuestroLogo(medios) {
    try {
      const dibujo = fs.readFileSync(path.join(medios.fsPath, 'logo.svg'), 'utf8');
      // El fichero puede venir en su versión negra o en la blanca, y con los
      // colores escritos en hexadecimal o en `rgb()`. Se aceptan las cuatro
      // formas: así da igual cuál de los dos ficheros esté puesto.
      return `<div class="marca marca--nuestra" role="img" aria-label="Executive Lab">${dibujo
        .replace(/fill="(#0a0a0a|#fefefe|rgb\(\s*10\s*,\s*10\s*,\s*10\s*\)|rgb\(\s*254\s*,\s*254\s*,\s*254\s*\))"/gi, 'fill="currentColor"')
        .replace(/fill="(#EC4429|rgb\(\s*231\s*,\s*60\s*,\s*35\s*\))"/gi, 'fill="var(--acento)"')}</div>`;
    } catch {
      // Si no se puede leer, la imagen de siempre: mejor un logotipo que no se
      // ve en oscuro que una cabecera vacía.
      const uri = (f) => this.vista.webview.asWebviewUri(vscode.Uri.joinPath(medios, f));
      return `<img class="marca" src="${uri('logo.svg')}" alt="Executive Lab">`;
    }
  }

  html(webview, medios, suya) {
    const nonce = crypto.randomBytes(16).toString('base64');
    const uri = (fichero) => webview.asWebviewUri(vscode.Uri.joinPath(medios, fichero));
    // Las fuentes y el logotipo viajan dentro de la extensión: la interfaz no
    // pide nada a la red, así que funciona igual sin conexión o con el IT de
    // la empresa bloqueando dominios.
    const csp = [
      "default-src 'none'",
      `style-src ${webview.cspSource}`,
      `font-src ${webview.cspSource}`,
      `img-src ${webview.cspSource}`,
      `script-src 'nonce-${nonce}'`,
    ].join('; ');

    // Si el alumno ha contado cuál es la web de su empresa, manda su marca.
    // Sin logotipo utilizable, su nombre escrito: siempre se lee, y en muchas
    // pymes es lo único que hay.
    const escapar = (v) => String(v).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
    // Una plaquita detrás del logotipo cuando no se vea sobre su propio fondo.
    // No se tiñe: el logotipo de una empresa es suyo. El color va en el estilo
    // de la página, junto al resto de la marca.
    const placa = suya && suya.placa ? ' con-placa' : '';

    let cabecera;
    if (suya && suya.logo && suya.logoSinNombre) {
      // El logotipo es solo el símbolo: una ene de puntos preciosa que no dice
      // de quién es esto. El nombre va al lado, como en su propia web.
      cabecera = `<div class="marca-fila">
  <img class="marca marca--simbolo${placa}" src="${webview.asWebviewUri(vscode.Uri.file(suya.logo))}" alt="">
  <p class="marca--nombre">${escapar(suya.nombre)}</p>
</div>`;
    } else if (suya && suya.logo) {
      cabecera = `<img class="marca${placa}" src="${webview.asWebviewUri(vscode.Uri.file(suya.logo))}" alt="${escapar(suya.nombre || 'Tu empresa')}">`;
    } else if (suya && suya.nombre) {
      cabecera = `<p class="marca marca--nombre">${escapar(suya.nombre)}</p>`;
    } else {
      cabecera = this.nuestroLogo(medios);
    }

    return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta http-equiv="Content-Security-Policy" content="${csp}">
<link rel="stylesheet" href="${uri('panel.css')}">
${marca.estilo(suya)}
</head>
<body>
${cabecera}
<div id="app" aria-live="polite"></div>
<script nonce="${nonce}" src="${uri('panel.js')}"></script>
</body>
</html>`;
  }

  // El rótulo de la barra, con el nombre que puso el alumno.
  //
  // El del contenedor ("Mi Empresa") es estático y VS Code no deja cambiarlo,
  // pero el de la vista sí. Y hacía falta: llamarle "empresa" al departamento
  // de marketing de alguien es justo lo que la decisión 16 dice que no se
  // haga —"puede ser un arnés para llevar contabilidad, o solo rrhh"— y
  // llevaba desde entonces sin aplicarse aquí.
  ponerleElNombre() {
    if (!this.vista) return;
    const { arnes, empresa } = identidad.leer();
    this.vista.title = arnes || 'Tu trabajo';
    // El segundo nombre va de subtítulo, en gris y a la derecha.
    this.vista.description = arnes && empresa ? empresa : undefined;
  }

  enviar(mensaje) {
    if (this.vista) this.vista.webview.postMessage(mensaje);
  }

  // El aviso de lo que se hizo solo al abrir sale en la principal, con la barra
  // a la vista. Si no, espera: cada vez que se pinta la principal se mira, y se
  // pinta al cargar el panel y al volver a mirarlo (revisión de corrección, 4 y 8).
  soltarElAviso() {
    if (!this.avisoPendiente || !this.vista || this.vista.visible === false || this.donde.tipo !== 'principal') return;
    const aviso = this.avisoPendiente;
    this.avisoPendiente = null;
    this.enviar(aviso);
  }

  // Lo que se hizo solo al abrir, en una sola frase aunque lo hagan dos sitios: el
  // segundo se suma al primero si todavía no ha salido, en vez de taparlo.
  // Con su botón, si lo trae. Con un solo botón, el suyo («Quitarlo»); con varios
  // distintos salen todos, cada uno con el rótulo que dice qué quita
  // (`etiquetaConVarios`, decisión 181), porque tres «Quitarlo» seguidos no dicen
  // cuál es cuál.
  dejarElAviso(texto, boton = null) {
    if (!texto) return;
    const antes = this.avisoPendiente && this.avisoPendiente.tipo === 'aviso' ? this.avisoPendiente : null;
    const losBotones = [...(antes ? (antes.botonesDe || (antes.boton ? [antes.boton] : [])) : [])];
    // Uno que no trae su rótulo para cuando hay varios sigue como antes: el primero
    // que llegue es el que sale.
    const sePuedeSumar = !losBotones.length || (boton && boton.etiquetaConVarios && losBotones.every((b) => b.etiquetaConVarios));
    if (boton && sePuedeSumar && !losBotones.some((b) => JSON.stringify(b.accion) === JSON.stringify(boton.accion))) losBotones.push(boton);
    const limpio = (b) => ({ etiqueta: losBotones.length > 1 && b.etiquetaConVarios ? b.etiquetaConVarios : b.etiqueta, accion: b.accion });
    this.avisoPendiente = {
      tipo: 'aviso',
      texto: antes ? `${antes.texto} ${texto}` : texto,
      botonesDe: losBotones,
      ...(losBotones.length === 1 ? { boton: limpio(losBotones[0]) } : {}),
      ...(losBotones.length > 1 ? { botones: losBotones.map(limpio) } : {}),
    };
  }

  // Una carpeta que este ordenador ya conoce: alguien ha pulsado aquí un botón
  // que corre el arnés. Va en el estado del editor para esta carpeta, que un
  // repositorio no puede traer escrito.
  carpetaConocida() {
    return Boolean(this.contexto.workspaceState && this.contexto.workspaceState.get(CLAVE_CONOCIDA));
  }

  async darPorConocida() {
    if (this.contexto.workspaceState && !this.carpetaConocida()) await this.contexto.workspaceState.update(CLAVE_CONOCIDA, true);
  }

  // ── Lo que debe hacerse solo, se hace solo (P9, decisiones 142 y 187) ─────────
  //
  // Al abrir la carpeta, lo que «Qué falta por montar» marca `alAbrir` se hace
  // sin esperar a nadie, y se cuenta en una frase. Lo que falla se queda en su
  // pieza, con su botón, y apuntado para «Algo va mal».
  //
  // Solo con la carpeta de confianza: arreglar corre el arnés, y en una sin
  // confianza la barra hace solo lo que dice su `package.json`. El examen es a
  // fondo —tres procesos del arnés—, y se paga una vez, al abrir.
  async hacerSoloLoQueSePuede() {
    if (vscode.workspace.isTrusted === false || !proyecto.raiz()) return [];
    // Solo en una carpeta que este ordenador ya conoce. Con el instalador, la
    // confianza del editor va apagada y vale para todas, así que no distingue un
    // repositorio recién traído de fuera (revisión de seguridad, H2). La primera
    // vez, con su botón; pulsarlo la da por conocida.
    if (!this.carpetaConocida()) {
      this.salida.appendLine('[solo] carpeta que este ordenador no conoce todavía: espera a un clic'); // diccionario: interno
      return [];
    }
    // Montada con un arnés más nuevo que el de la clase: correr encima el de la
    // barra la bajaría sin su sí (revisión de seguridad, M1).
    if (rsc.comoEsLaVersion(proyecto.versionDelCatalogo()) === 'nueva') {
      this.salida.appendLine('[solo] carpeta de un arnés más nuevo que el de la clase: no se toca sola'); // diccionario: interno
      return [];
    }
    const mirar = async () => (await terreno.radiografia({
      aFondo: (await terreno.reconocer({ profundo: true })).arnes,
      sigueSinCopias: this.eligioSinCopias(),
    })).piezas;
    const tareas = solo.queSeHaceSolo(await mirar());
    if (!tareas.length) return [];

    // Si un pedido del asistente o un botón está corriendo el arnés, se espera a que
    // termine (decisión 150; revisión de corrección, 4).
    const vueltas = this.vueltasDeEspera === undefined ? 360 : this.vueltasDeEspera; // tres minutos
    for (let i = 0; i < vueltas && this.conElArnes(); i += 1) await new Promise((r) => setTimeout(r, 500));
    if (this.conElArnes()) {
      this.salida.appendLine('[solo] el arnés sigue ocupado: se deja para otra vez'); // diccionario: interno
      return [];
    }
    // Mientras dura, los botones que corren el arnés esperan (ver `manejar`).
    this.arreglandoSolo = true;
    let hechas = [];
    try {
      hechas = await solo.hacerloSolo(tareas, {
        // `yaEstaba` es que no había nada que hacer: no se cuenta como arreglado.
        arrancar: async () => {
          const hecho = await arrancar.arrancar(this.contexto, this.salida, { sinNadieDelante: true });
          return hecho.ok && !hecho.yaEstaba;
        },
        arreglar: async () => {
          const { ok, detalle } = await soporte.arreglar();
          if (detalle) this.salida.appendLine(detalle);
          if (ok) await this.losRailesDetras();
          return ok;
        },
        // Sin git no se instala nada solo: eso abre el instalador del sistema. Y con
        // demasiado peso no se guarda (decisión 147): no queda historial a medias, y la
        // pieza sigue con su botón, que lo dice.
        ponerCopias: async () => {
          const hecho = await arrancar.ponerLasCopias(this.contexto);
          if (!hecho.ok && hecho.mensaje) this.salida.appendLine(`[solo] copias: ${hecho.mensaje}`); // diccionario: interno
          return hecho.ok;
        },
      }, (linea) => this.salida.appendLine(linea));
      // Lo que se va a decir arreglado se mira otra vez: un `repair` que no
      // encuentra nada sale bien igual, y la frase diría algo que no ha pasado
      // (revisión de corrección, 3). Solo cuenta lo que ya no sale como pendiente.
      if (hechas.length) {
        const siguen = new Set((await mirar()).filter((p) => p.estado === 'no' || p.estado === 'aMedias').map((p) => p.nombre));
        hechas = hechas.filter((nombre) => !siguen.has(nombre));
      }
    } finally {
      this.arreglandoSolo = false;
    }

    // Lo que trae o arregla el arnés lo lee Claude al empezar una conversación.
    const frase = solo.laFrase(hechas, hechas.length > 0 && ((asistentes.porId(donde.paraQuien()) || {}).nombre || false));
    this.dejarElAviso(frase);
    // Sin sacar a nadie de donde está: se repinta lo que tenga delante, y la
    // frase sale cuando esté en la principal.
    await this.repintarLoQueHaya();
    this.soltarElAviso();
    return hechas;
  }

  // ── Los dos asistentes, por el ajuste (decisión 158) ────────────────────
  //
  // Con «Los dos» en los ajustes, una carpeta montada para uno se prepara sola
  // también para el otro: es de este ordenador y se deshace (P9). Con las guardas
  // de lo que se hace solo —confianza, una carpeta que este ordenador conoce y un
  // arnés que no va por delante— y esperando a que nada más esté corriendo el
  // arnés. Lo que tocaría algo suyo no se hace solo (P4): se deja a un clic. Sin
  // el otro en el ordenador, se ofrece ponerlo. Y los botones siguen hablando con
  // el de antes: preparar no es cambiar de asistente.
  //
  // Una sola a la vez: la del arranque y la de cambiar el ajuste podían correr
  // juntas y preparar dos veces. La segunda se queda con la que ya está en marcha.
  prepararParaLosDos() {
    if (!this.preparando) this.preparando = this.prepararParaLosDosYa().finally(() => { this.preparando = null; });
    return this.preparando;
  }

  // Para cuáles falta prepararla ahora mismo, con las guardas de lo que se hace
  // solo. Vacío si no toca.
  faltaParaLosDos() {
    if (asistentes.elAjuste() !== 'losDos') return [];
    if (vscode.workspace.isTrusted === false || !proyecto.raiz()) return [];
    const declarados = (proyecto.declaracion() || {}).targets;
    // Sin montar no hay nada que preparar: el montaje ya va para los dos.
    if (!Array.isArray(declarados) || !declarados.length) return [];
    const faltan = asistentes.ASISTENTES.filter((a) => !declarados.includes(a.id));
    if (!faltan.length) return [];
    if (!this.carpetaConocida()) {
      this.salida.appendLine('[losDos] carpeta que este ordenador no conoce todavía: espera a un clic'); // diccionario: interno
      return [];
    }
    if (rsc.vaPorDelante()) {
      this.salida.appendLine('[losDos] carpeta de un arnés más nuevo que el de la clase: no se toca sola'); // diccionario: interno
      return [];
    }
    return faltan;
  }

  async prepararParaLosDosYa() {
    const faltan = this.faltaParaLosDos();
    for (const otro of faltan.filter((a) => !asistentes.estaInstalado(a))) {
      // Se pone sola (decisión 181): lo pidió en los ajustes, es una extensión del
      // editor, gratis y se quita cuando quiera. Si no se puede, un botón para
      // intentarlo otra vez.
      this.unaVez(`poner:${otro.id}`, async () => {
        let puesto = await arrancar.ponerElAsistente(otro, { callado: true });
        if (!puesto) {
          const ahora = 'Ponerlo ahora';
          const quiere = await vscode.window.showWarningMessage(`En los ajustes elegiste los dos asistentes, y no he podido poner ${otro.nombre} en este ordenador. Si quieres, lo intento otra vez.`, ahora);
          if (quiere !== ahora) return;
          puesto = await arrancar.ponerElAsistente(otro, { callado: true });
          if (!puesto) return avisarConSalida(`No he podido poner ${otro.nombre}. Pulsa «Algo va mal» y pásale el código a tu tutor.`);
        }
        this.dejarElAviso(`He puesto ${otro.nombre} en este ordenador, porque en los ajustes elegiste los dos asistentes.`);
        // Después de la que esté en marcha, que no lo contaba.
        await this.preparando;
        await this.prepararParaLosDos();
        // Si no había nada más que preparar, la frase se dice igual.
        if (this.avisoPendiente) { await this.repintarSinMover(); this.soltarElAviso(); }
        return undefined;
      });
    }
    if (!faltan.some(asistentes.estaInstalado)) return [];

    const vueltas = this.vueltasDeEspera === undefined ? 360 : this.vueltasDeEspera; // tres minutos
    for (let i = 0; i < vueltas && this.conElArnes(); i += 1) await new Promise((r) => setTimeout(r, 500));
    if (this.conElArnes()) {
      this.salida.appendLine('[losDos] el arnés sigue ocupado: se deja para otra vez'); // diccionario: interno
      return [];
    }
    // Mientras esperaba ha podido cambiar todo: el ajuste, la confianza, lo
    // montado o la carpeta. Se mira otra vez.
    const listos = this.faltaParaLosDos().filter(asistentes.estaInstalado);
    if (!listos.length) return [];
    const conQuienAntes = asistentes.conQuien();
    const hechos = [];
    this.arreglandoSolo = true;
    try {
      for (const otro of listos) {
        let hecho;
        try {
          hecho = await arrancar.prepararTambienPara(otro.id, this.contexto, { sinNadieDelante: true });
        } catch (error) {
          hecho = { ok: false, detalle: error.message };
        }
        this.salida.appendLine(`[losDos] ${otro.id}: ${hecho.ok ? 'preparada' : (hecho.esperaASuBoton ? 'espera a su sí' : 'no')}${hecho.detalle ? ` · ${hecho.detalle}` : ''}`); // diccionario: interno
        if (hecho.ok) hechos.push(otro);
        else if (hecho.esperaASuBoton) {
          const preparar = `Prepararla también para ${otro.nombre}`;
          this.unaVez(`si:${otro.id}`, async () => {
            const quiere = await vscode.window.showInformationMessage(`En los ajustes elegiste los dos asistentes. Para preparar esta carpeta también para ${otro.nombre} tengo que tocar cosas tuyas.`, preparar);
            if (quiere === preparar) await this.manejar({ tipo: 'prepararTambien', cual: otro.id });
          });
        } else {
          // Nunca un fallo callado (P3): lo que dijo el arnés ya va en el registro.
          this.unaVez(`fallo:${otro.id}`, () => avisarConSalida(`No he podido preparar esta carpeta también para ${otro.nombre}. Pulsa «Algo va mal» y pásale el código a tu tutor.`));
        }
      }
      if (hechos.length && asistentes.conQuien().id !== conQuienAntes.id) await asistentes.seguirCon(conQuienAntes.id);
    } finally {
      this.arreglandoSolo = false;
    }
    if (!hechos.length) return [];

    vigilarOtraVez();
    this.dejarElAviso(`He preparado esta carpeta también para ${hechos.map((a) => a.nombre).join(' y ')}, como pide el ajuste de los dos asistentes.`);
    await this.repintarSinMover();
    this.soltarElAviso();
    return hechos.map((a) => a.id);
  }

  // Lo que la barra no hizo sola porque tocaba algo suyo, con su botón: se le
  // enseña qué se toca, como al montar (decisión 158). Tampoco cambia con quién
  // se habla.
  async prepararTambien(cual) {
    const otro = asistentes.porId(cual);
    const declarados = (proyecto.declaracion() || {}).targets;
    if (!otro || !Array.isArray(declarados) || !declarados.length || declarados.includes(cual)) return undefined;
    const conQuienAntes = asistentes.conQuien();
    const hecho = await arrancar.prepararTambienPara(cual, this.contexto);
    this.salida.appendLine(`[losDos] ${cual}, con su botón: ${hecho.ok ? 'preparada' : (hecho.cancelado ? 'sin su sí' : 'no')}${hecho.detalle ? ` · ${hecho.detalle}` : ''}`); // diccionario: interno
    if (hecho.porDelante) return vscode.window.showWarningMessage(POR_DELANTE);
    if (hecho.cancelado) return vscode.window.showInformationMessage('No he tocado nada. Te lo vuelvo a proponer la próxima vez que abras esta carpeta.');
    if (!hecho.ok) return avisarConSalida(hecho.mensaje || `No he podido prepararla para ${otro.nombre}. Pulsa «Algo va mal» y pásale el código a tu tutor.`);
    if (asistentes.conQuien().id !== conQuienAntes.id) await asistentes.seguirCon(conQuienAntes.id);
    vigilarOtraVez();
    await this.repintarSinMover();
    const conOtroNombre = (hecho.renombrados || [])
      .map((r) => ` Tu ${r.que === 'habilidad' ? 'habilidad' : r.que} «${r.id}» ahora se llama «${r.ahora}».`)
      .join('');
    return vscode.window.showInformationMessage(`He preparado esta carpeta también para ${otro.nombre}.${conOtroNombre}`);
  }

  // Una oferta por carpeta y por sesión: cerrarla es un «ahora no» hasta que se
  // vuelva a abrir, o hasta que cambie el ajuste.
  unaVez(clave, ofrecer) {
    if (!this.ofrecidos) this.ofrecidos = new Set();
    const llave = `${proyecto.raiz()}:${clave}`;
    if (this.ofrecidos.has(llave)) return;
    this.ofrecidos.add(llave);
    return Promise.resolve().then(ofrecer).catch((error) => this.salida.appendLine(`[losDos] ${error.message}`)); // diccionario: interno
  }

  // El ajuste del asistente, cambiado con la barra abierta (decisión 158): se nota
  // sin recargar. El vigía mira lo del de ahora, se repinta lo que tiene delante
  // sin sacarle de ahí, y con «Los dos» se prepara la carpeta para el que falte.
  async alCambiarElAjuste() {
    this.ofrecidos = new Set();
    vigilarOtraVez();
    await this.repintarSinMover();
    return this.prepararParaLosDos();
  }

  // Lo que tiene delante, también si es «Tu asistente», que dice el ajuste.
  async repintarSinMover() {
    return this.donde.pantalla === 'asistente' ? this.verAsistente() : this.repintarLoQueHaya();
  }

  // Lo de esta persona en los ajustes de Claude (decisión 157), en las carpetas que
  // ya estaban montadas: en las nuevas lo pone el montaje. Como lo que se hace
  // solo (P9): con confianza, en una carpeta que este ordenador ya conoce, y se
  // dice en una frase. Qué carpeta y qué se pone, en `arrancar.ponerLoDeClaude`.
  async ponerLoDeClaudeAlAbrir() {
    if (vscode.workspace.isTrusted === false || !proyecto.raiz() || !this.carpetaConocida()) return null;
    const hecho = await arrancar.ponerLoDeClaude();
    this.salida.appendLine(`[claude] ajustes de esta carpeta: ${hecho.hecho}${hecho.error ? ` (${hecho.error})` : ''}`); // diccionario: interno
    if (hecho.hecho !== 'puesto') return hecho;
    // Se deja, y sale una sola vez al final de lo que se hace al abrir, junto con
    // lo demás: soltarla ya hacía que la siguiente frase la tapara (revisión de
    // corrección de la 157, B5).
    this.dejarElAviso(ajustesLocales.laFrase(hecho), quitarSoloEsto(ajustesLocales.loQueSePuso(hecho)));
    return hecho;
  }

  // Los consejos de Claude, preguntados (decisión 187). Claude enseña bajo el indicador
  // un consejo suelto sobre sí mismo, y salen en inglés: quitarlos es de lo que
  // enseña algo, así que lo decide la persona. Una vez por carpeta: «No, déjalos» no
  // vuelve a salir; cerrarlo sin contestar, hasta la próxima vez que se abra.
  async preguntarLosConsejos({ soltar = true } = {}) {
    const raiz = proyecto.raiz();
    if (vscode.workspace.isTrusted === false || !raiz) return null;
    const memoria = this.contexto.workspaceState;
    if (memoria && memoria.get(CLAVE_CONSEJOS_RECHAZADOS)) return null;
    if (!(await terreno.montadaAqui())) return null;
    const mirado = await ajustesLocales.ponerLosDeLaBarra({ raiz, estaEnGit: arrancar.estaEnGitConLaBarra, soloMirar: true, conConsejos: true }).catch(() => null);
    if (!mirado || mirado.hecho !== 'sePuede' || !mirado.consejos) return null;
    const quitar = 'Sí, quitarlos';
    const dejar = 'No, déjalos';
    const quiere = await vscode.window.showInformationMessage(
      'Mientras trabaja, Claude enseña consejos sueltos, y salen en inglés. ¿Los quito?', quitar, dejar,
    );
    if (quiere === dejar && memoria) await memoria.update(CLAVE_CONSEJOS_RECHAZADOS, true);
    if (quiere !== quitar) return null;
    const hecho = await ajustesLocales.ponerLosDeLaBarra({ raiz, estaEnGit: arrancar.estaEnGitConLaBarra, conConsejos: true });
    this.salida.appendLine(`[claude] consejos, con su sí: ${hecho.hecho}${hecho.error ? ` (${hecho.error})` : ''}`); // diccionario: interno
    if (hecho.hecho !== 'puesto') return hecho;
    this.dejarElAviso(ajustesLocales.laFrase(hecho), quitarSoloEsto(ajustesLocales.loQueSePuso(hecho)));
    if (soltar) this.soltarElAviso();
    return hecho;
  }

  // «Quitarlo» (decisión 157): solo lo que puso la barra, y no vuelve a ponerse.
  // `que`, lo que trae el botón: sin nada, todo.
  async quitarLoDeClaude(que = null) {
    const hecho = await arrancar.quitarLoDeClaude(que);
    this.salida.appendLine(`[claude] quitar lo de esta carpeta: ${hecho.hecho}`); // diccionario: interno
    const bien = ['quitado', 'yaNoEstaba'].includes(hecho.hecho);
    return this.enviar(bien
      ? { tipo: 'aviso', texto: 'Quitado. No lo vuelvo a poner.' }
      : { tipo: 'aviso', texto: 'No he podido quitarlo. Pulsa «Algo va mal» y pásale el código a tu tutor.', malo: true });
  }

  // «Quitarlo» de las copias solas (decisión 181): el ajuste a «Solo cuando yo lo
  // diga», que es lo que ya ofrece Ajustes. Lo hecho no se borra.
  async quitarElGuardadoSolo() {
    const hecho = await ajustes.ponerCadaCuanto(0);
    this.salida.appendLine(`[guardarSolo] quitado: ${hecho.ok ? 'sí' : hecho.mensaje}`); // diccionario: interno
    return this.enviar(hecho.ok
      ? { tipo: 'aviso', texto: 'Quitado. Solo guardo una copia cuando pulses el botón.' }
      : { tipo: 'aviso', texto: hecho.mensaje, malo: true });
  }

  // Codex con una versión retirada (decisión 157), arreglado solo si la persona
  // usa Codex: lo tiene en el editor o la carpeta está montada para él. El suyo de
  // usuario, como el control remoto, al abrir; el de la carpeta, como lo demás que
  // se hace solo: con confianza, en una carpeta conocida y que la barra montó en
  // este ordenador (P4). Se dice con un aviso del editor, que sale aunque no se vea
  // la barra.
  async arreglarCodex() {
    const codex = asistentes.porId('codex');
    if (!asistentes.estaInstalado(codex) && !asistentes.losDelArnes().includes(codex)) return [];
    const laCarpeta = vscode.workspace.isTrusted !== false && Boolean(proyecto.raiz()) && this.carpetaConocida()
      && await terreno.montadaAqui();
    const hechos = retirados.arreglar({ raiz: laCarpeta ? proyecto.raiz() : null });
    for (const h of hechos) {
      this.salida.appendLine(`[codex] ${h.hecho} ${h.fichero}${h.copia ? ` · copia en ${h.copia}` : ''}${h.error ? ` (${h.error})` : ''}`); // diccionario: interno
    }
    const frase = retirados.laFrase(hechos);
    if (frase) vscode.window.showInformationMessage(frase);
    return hechos;
  }

  // Avisarte cuando Codex termine (decisión 171). Es su configuración de usuario y
  // vale para todas sus conversaciones: no se pone solo (P9), se ofrece una vez con
  // su botón. Solo con un `node` de verdad, y sin un `notify` suyo.
  async ofrecerElAvisoDeCodex() {
    const codex = asistentes.porId('codex');
    if (vscode.workspace.isTrusted === false || !proyecto.raiz()) return null;
    if (!asistentes.estaInstalado(codex) && !asistentes.losDelArnes().includes(codex)) return null;
    const fuente = path.join(this.contexto.extensionPath, 'media', 'railes', 'executive-lab', 'avisar.mjs');
    const oferta = avisoDeCodex.queSeOfrece({ fuente, node: avisoDeCodex.nodeDeVerdad({ propio: entorno.node() }) });
    this.salida.appendLine(`[codex] aviso al terminar: ${oferta.ofrecer ? 'se ofrece' : `no se ofrece (${oferta.motivo})`}`); // diccionario: interno
    if (!oferta.ofrecer) return oferta;
    const si = 'Avisarme cuando Codex termine';
    const no = 'No, gracias';
    this.ofertaDeCodex = this.unaVez('avisoDeCodex', async () => {
      const quiere = await vscode.window.showInformationMessage(
        'Si quieres, te aviso cuando Codex termine, aunque estés en otra ventana. Saldrá un aviso al acabar cada respuesta, solo en tus carpetas de Executive Lab. Cambia la configuración de Codex de tu ordenador, y puedes quitarlo cuando quieras.',
        si, no,
      );
      if (quiere === no) {
        this.salida.appendLine(`[codex] aviso al terminar: ${avisoDeCodex.noGracias().hecho}`); // diccionario: interno
        return;
      }
      if (quiere !== si) return;
      const hecho = avisoDeCodex.ponerlo({ fuente, node: oferta.node });
      this.salida.appendLine(`[codex] aviso al terminar: ${hecho.hecho}${hecho.error ? ` (${hecho.error})` : ''}`); // diccionario: interno
      if (hecho.hecho !== 'puesto') {
        avisarConSalida('No he podido dejar el aviso de Codex. Pulsa «Algo va mal» y pásale el código a tu tutor.');
        return;
      }
      this.dejarElAviso(avisoDeCodex.FRASE, QUITAR_EL_AVISO_DE_CODEX);
      this.soltarElAviso();
    });
    return oferta;
  }

  // «Quitarlo», del aviso de Codex: solo lo que puso la barra, y no se vuelve a ofrecer.
  async quitarElAvisoDeCodex() {
    const hecho = avisoDeCodex.quitarlo();
    this.salida.appendLine(`[codex] quitar el aviso al terminar: ${hecho.hecho}`); // diccionario: interno
    const bien = ['quitado', 'yaNoEstaba'].includes(hecho.hecho);
    return this.enviar(bien
      ? { tipo: 'aviso', texto: 'Quitado. No lo vuelvo a poner.' }
      : { tipo: 'aviso', texto: 'No he podido quitarlo. Pulsa «Algo va mal» y pásale el código a tu tutor.', malo: true });
  }

  // Codex no corre lo que el arnés le monta en la carpeta hasta que la persona confía
  // (decisión 178). La barra solo lee el `config.toml` de Codex para saber si falta, y
  // lo dice una vez por carpeta, con Codex en uso y enganches suyos montados aquí. Ni
  // confía por la persona ni escribe en esa configuración (P9).
  laTarjetaDeLosEnganchesDeCodex() {
    try {
      const codex = asistentes.porId('codex');
      if (vscode.workspace.isTrusted === false || !proyecto.raiz()) return null;
      if (!asistentes.estaInstalado(codex) && !asistentes.losDelArnes().includes(codex)) return null;
      if (this.almacen().get(enganchesDeCodex.CLAVE)) return null;
      const info = enganchesDeCodex.queSabe({ raiz: proyecto.raiz() });
      if (info.hay) this.salida.appendLine(`[codex] confianza en lo del arnés: ${info.estado}${info.motivo ? ` (${info.motivo})` : ''}`); // diccionario: interno
      return enganchesDeCodex.laTarjeta(info);
    } catch (error) {
      this.salida.appendLine(`[codex] ${error.stack || error.message}`); // diccionario: interno
      return null;
    }
  }

  // Codex no deja pasarle texto desde fuera (`asistentes.js`): se copia `/hooks` al
  // portapapeles, se abre Codex y se dice que se pega. Solo copia y abre.
  async dejarListoLoDeCodex() {
    const codex = asistentes.porId('codex');
    await vscode.env.clipboard.writeText(enganchesDeCodex.PASO);
    const abierto = await puente.abrirEste(codex);
    this.salida.appendLine(`[codex] /hooks copiado${abierto ? ' y Codex abierto' : ''}`); // diccionario: interno
    const pegar = process.platform === 'darwin' ? 'Cmd+V' : 'Ctrl+V';
    return vscode.window.showInformationMessage(`Te he copiado ${enganchesDeCodex.PASO} y he abierto Codex. Pégalo con ${pegar} en su caja, dale a enviar y confía en lo de esta carpeta.`); // diccionario: interno
  }

  async entendidoLoDeCodex() {
    await this.almacen().update(enganchesDeCodex.CLAVE, Date.now());
    return this.refrescar(true);
  }

  // Lo del asistente que deja el instalador en los ajustes de usuario, si falta
  // (decisión 163): para quien solo instaló la barra. Es de esta persona y no de
  // la carpeta, así que no espera a la confianza, como el control remoto. Una
  // vez por ordenador, sin pisar lo suyo, y se dice en una frase si cambió algo.
  async ponerLoDelEditor() {
    const hecho = await loDelEditor.ponerLoQueFalta(this.contexto, this.salida);
    if (!hecho) return null;
    this.salida.appendLine(`[editor] ${hecho.hecho}${hecho.puestas.length ? `: ${hecho.puestas.join(', ')}` : ''}${hecho.respetadas.length ? ` · suyas: ${hecho.respetadas.join(', ')}` : ''}`); // diccionario: interno
    this.dejarElAviso(loDelEditor.laFrase(hecho.puestas));
    return hecho;
  }

  // Repinta lo que el alumno tenga delante. Lo llama el vigía del arnés.
  //
  // Decisión 188: un repintado con una carpeta grande dura segundos, y el vigía
  // sigue avisando mientras el asistente escribe. Sin freno, se solapaban —cada
  // uno con sus lecturas y sus procesos— y la barra se atascaba. Ahora:
  //  - con la barra escondida no se repinta: se apunta que está «sucia» y se
  //    repinta al volver a verse (`resolveWebviewView`);
  //  - si ya hay uno en marcha, no se lanza otro: se apunta que falta uno, y al
  //    acabar se hace uno solo, con lo último que haya, por muchos avisos que
  //    hayan llegado entre medias.
  async repintarLoQueHaya() {
    if (this.vista && this.vista.visible === false) { this.sucio = true; return undefined; }
    if (this.repintando) { this.repintadoEnCola = true; return this.repintando; }
    this.repintando = (async () => {
      try {
        do {
          this.repintadoEnCola = false;
          await this.repintarAhora();
        } while (this.repintadoEnCola && !(this.vista && this.vista.visible === false));
        if (this.repintadoEnCola) this.sucio = true;
      } finally {
        this.repintando = null;
        this.repintadoEnCola = false;
      }
    })();
    return this.repintando;
  }

  async repintarAhora() {
    const d = this.donde;
    if (d.tipo === 'conexiones') return this.verConexiones();
    // Con el aviso que se queda (el de la guía en PDF, que escribe en `out/` y despierta al vigía).
    if (d.tipo === 'conexion') return this.verConexion(d.proveedor, d.aviso || null);
    if (d.tipo === 'cerebro') return this.verCerebro();
    if (d.tipo === 'tema') return this.verTema(d.tema);
    // Documentos y la foto del cerebro se repintan con lo nuevo, y con el aviso
    // que tenían: guardar la foto o soltar un documento es lo que despierta al vigía.
    if (d.tipo === 'documentos') return this.verDocumentos(d.aviso);
    if (d.tipo === 'foto') return this.verLaFoto(d.desde, d.aviso);
    if (d.tipo === 'recordatorios') return this.verRecordatorios(d.aviso);
    // La de la versión, con lo que haya ahora: una puesta sola se ve ahí (decisión 166).
    if (d.tipo === 'estaBarra') return this.verEstaBarra();
    // En una pantalla de lectura o de resultado no se toca nada: está leyendo.
    if (d.tipo === 'quieto') return undefined;
    return this.refrescar(true);
  }

  async refrescar(fresco = false) {
    this.donde = { tipo: 'principal' };
    this.ponerleElNombre();
    this.enviar({ tipo: 'cargando' });
    const suya = marca.leer();
    // Una vez por repintado: lo usan Proyectos y la línea de las copias (decisión 195).
    const deDentro = await this.losProyectosDeDentro();
    this.enviar({
      tipo: 'estado',
      estado: await brujula.estado({ fresco }),
      // Lo más alto de la barra: hasta cinco cosas que elige quien la usa, de
      // entre sus botones, sus consultas y sus habilidades. Sin elegir nada,
      // los botones que el asistente ha creado.
      acciones: fijadas.puestas(this.almacen(), this.contexto.extensionPath),
      // Cuatro datos de hoy en una línea, en vez de la tarjeta que contaba
      // dónde estabas: eso ya lo hace `orient` en la conversación, y mejor.
      pulso: await pulso.deHoy(),
      // Codex también tiene botones: salen de sus habilidades nativas.
      puedeTenerBotones: donde.puedeTenerBotones(),
      // Cuántos hay de cada cosa, para que el rótulo de su fila lo diga.
      comandos: acciones.todos().length,
      // El apartado de SDD sale solo si esa carpeta construye algo.
      hayProyectos: proyectos.hayAlgo(),
      // Los ayudantes tampoco salen hasta que hay uno.
      hayAgentes: agentes.hayAlguno(),
      // Ni Recordatorios, hasta que hay una habilidad con botón o un recordatorio.
      hayRecordatorios: recordatorios.hayAlgo(),
      modo: disfraz.modoDeEstaVentana(),
      // Si la empresa aún no tiene cara puesta, el panel la ofrece en vez de
      // esperar a que el alumno caiga en contarlo.
      marcaPuesta: Boolean(suya && suya.tokens),
      // Cómo llama el alumno a esto: sale en "lo que sabe de…".
      comoSeLlama: identidad.deQuien(),
      // Como mucho uno, y siempre con un botón que lo resuelve ahí mismo.
      consejo: await this.elConsejoQueToca(),
      // «Esto parece …» la primera vez, y la idea que toca (decisión 152).
      seAdapta: await this.loQueSeAdapta(),
      // Lo que toca a esta hora, con su botón; y la costumbre que la barra
      // acaba de convertir en recordatorio, dicha una vez (decisión 144).
      recordatorio: await this.elRecordatorioQueToca(),
      costumbrePuesta: await this.ponerLasCostumbres(),
      // Los datos de clientes, dichos una vez al empezar a entrar (decisión 153).
      datosDeClientes: this.laTarjetaDeLosDatos(),
      // Codex pide confiar una vez en lo que el arnés le monta (decisión 178).
      enganchesDeCodex: this.laTarjetaDeLosEnganchesDeCodex(),
      // Las claves de una aplicación dentro de las copias, y las que están fuera
      // de sitio: en la tarjeta, con su botón (decisión 167).
      ...this.lasClavesQueTocan(),
      // La primera vez de cada día, dónde lo dejó la última vez (decisión 160).
      laUltimaVez: await this.laUltimaVezQueToca(),
      // Un aviso para Executive Lab que espera a que la persona diga si se
      // manda: lo ha preparado su asistente, la barra al fallar, o ella misma
      // sin poder mandarlo. Como mucho uno; los demás, en Ayuda.
      avisoParaExecutiveLab: this.elAvisoQueToca(),
      // Y lo que pasó con uno que ya mandó: arreglado, o leído (decisión 134).
      arreglado: this.elArregladoQueToca(),
      // La sencilla o la completa de antes, y qué piezas salen en la sencilla
      // (decisión 138). Nada se ha borrado: está apagado.
      barraCompleta: vscode.workspace.getConfiguration().get('executiveLab.barraCompleta') === true,
      piezas: this.lasPiezas(),
      // Si aquí se eligió seguir sin copias: sin git, se prepara igual, y ponerlo
      // no tapa la tarjeta que toca (decisión 164).
      sigueSinCopias: this.eligioSinCopias(),
      // Para la sencilla: lo que hay en Acciones, la línea de las copias y la versión.
      habilidades: this.habilidadesSuyas(),
      copias: await this.lasCopias(deDentro),
      // En un monorepo, sus proyectos: cómo está cada uno y sus botones (decisión 195).
      proyectosDeDentro: deDentro,
      versionDeLaBarra: this.versionDeLaBarra(),
      // Lo nuevo de la versión que acaba de poner. Antes de mirar si hay otra:
      // mirar deja escrito en el almacén que esta barra ya se usaba.
      queTrae: await this.queTraeLaDeAhora(),
      // Con la sesión de GitHub del editor basta; si no la hay, el botón no
      // desaparece — lleva a la guía, que es lo que hace falta cuando no sabes
      // qué es una cuenta de esas.
      puedeSubir: await copias.puedeSubir(),
      // La barra no está en la tienda del editor, y nadie se enteraría de que
      // hay algo mejor. Se mira una vez al día, y se pone solo si la persona
      // pulsa «Actualizar ahora» (decisión 132).
      ...(await this.laVersionQueToca()),
    });
    this.soltarElAviso();
    // Sin esperar: si hay algo que decir, repinta ella sola.
    this.mirarLosArregladosSiToca().catch((error) => this.salida.appendLine(`[avisos] ${error.stack || error.message}`)); // diccionario: interno
    this.ponerLaNuevaSolaSiToca().catch((error) => this.salida.appendLine(`[version] sola: ${error.stack || error.message}`)); // diccionario: interno
  }

  // ── La barra sencilla (decisión 138) ─────────────────────────────────

  // Qué sale en la sencilla. La tabla viaja con la barra; si no se puede leer,
  // todo lo de la sencilla sale y lo demás no: mejor de más que una pantalla vacía.
  lasPiezas() {
    try {
      return JSON.parse(fs.readFileSync(path.join(this.contexto.extensionPath, 'media', 'piezas.json'), 'utf8'));
    } catch (error) {
      this.salida.appendLine(`[piezas] ${error.message}`); // diccionario: interno
      return { tarjetaUnica: true, documentos: true, acciones: true, ayuda: true, copias: true, pie: true };
    }
  }

  // Las suyas: las del catálogo que ha añadido y las que ha escrito; no las
  // que el arnés monta para funcionar.
  habilidadesSuyas() {
    try {
      return rsc.habilidadesEnDisco().filter((id) => !nombres.esFontaneria(id)).length;
    } catch {
      return 0;
    }
  }

  // La línea de las copias: solo si la carpeta las tiene.
  //
  // En un monorepo, «✓ Todo guardado» tiene que valer también para sus proyectos,
  // que tienen su propio git y el de la raíz deja fuera (decisión 195). Los que
  // tienen cambios van con su botón; uno que no se pudo mirar no deja decir
  // «Todo guardado».
  async lasCopias(deDentro = []) {
    try {
      const [ultima] = await copias.copias(1);
      if (!ultima) return null;
      const hace = copias.haceUnRato(ultima.cuando);
      const subir = Boolean(await copias.puedeSubir()) || Boolean(await github.remoto());
      const cambios = await copias.cambiosSinGuardar();
      const proyectosSinGuardar = deDentro.filter((p) => p.sinGuardar === true)
        .map((p) => ({ nombre: p.nombre, boton: p.guardar }));
      const sinMirar = cambios === null || deDentro.some((p) => p.sinGuardar === null);
      // `null`: no se pudo mirar, y la barra no dice «todo guardado» (decisión 189).
      return {
        hace,
        sinGuardar: cambios > 0 ? true : proyectosSinGuardar.length ? true : sinMirar ? null : false,
        raizSinGuardar: cambios === null ? null : cambios > 0,
        proyectosSinGuardar,
        subir,
      };
    } catch (error) {
      this.salida.appendLine(`[copias] ${error.message}`); // diccionario: interno
      return null;
    }
  }

  // Los proyectos de dentro, si esto es un monorepo (decisión 195). Vacío si no.
  async losProyectosDeDentro() {
    try {
      return (await subproyectos.comoEstan(subproyectos.cuales(), { conConfianza: vscode.workspace.isTrusted !== false })).map(subproyectos.enPantalla);
    } catch (error) {
      this.salida.appendLine(`[proyectos de dentro] ${error.message}`); // diccionario: interno
      return [];
    }
  }

  // ------------------------------------------------------- la versión

  // La nueva, si la hay y no se apartó con «Ahora no» hace poco; y si ya se
  // puso y falta recargar, eso, que si no el aviso seguiría diciendo que hay una
  // nueva cuando ya está bajada.
  async laVersionQueToca() {
    const laNueva = await version.laNuevaSiHay(this.contexto, this.versionDeLaBarra());
    const nueva = laNueva && laNueva.version;
    const apartada = (this.almacen().get(CLAVE_SILENCIADOS) || {})[`version:${nueva}`];
    const hacePoco = apartada && Date.now() - apartada < VERSION_APARTADA_DURANTE;
    return {
      hayVersionNueva: nueva && (!hacePoco || this.versionPuesta === nueva) ? nueva : null,
      // Una de prueba, para quien se ofreció a probarlas antes (decisión 134).
      versionDePrueba: Boolean(laNueva && laNueva.deprueba),
      versionPuesta: this.versionPuesta || null,
    };
  }

  // ── Lo que trae la que acaba de poner ─────────────────────────────────
  //
  // Una vez, al abrir una versión más nueva que la última que vio (decisión
  // 134). La primera vez que se abre la barra no hay nada con qué comparar: si
  // ya se usaba antes —una de antes de esto dejó apuntado cuándo miró si había
  // versión nueva—, viene de una más vieja y se le enseña; si no, es una
  // instalación nueva y se calla.
  async queTraeLaDeAhora() {
    try {
      const actual = this.versionDeLaBarra();
      if (!actual) return null;
      const almacen = this.contexto.globalState;
      let vista = almacen.get(CLAVE_VERSION_VISTA);
      if (!vista) {
        vista = this.yaSeUsaba ? '0.0.0' : actual;
        await almacen.update(CLAVE_VERSION_VISTA, vista);
      }
      if (!version.esMasNueva(actual, vista)) return null;
      return { version: actual, cosas: await version.queTrae(this.contexto, actual) };
    } catch (error) {
      this.salida.appendLine(`[version] qué trae: ${error.stack || error.message}`); // diccionario: interno
      return null;
    }
  }

  async yaLoHeVisto() {
    await this.contexto.globalState.update(CLAVE_VERSION_VISTA, this.versionDeLaBarra());
    return this.refrescar(true);
  }

  // Quien quiera, recibe también las de prueba. Lo recordado del otro canal no
  // vale: se vuelve a mirar al pintar.
  async probarAntes(si) {
    try {
      await vscode.workspace.getConfiguration().update(version.AJUSTE_PROBAR_ANTES, si === true, vscode.ConfigurationTarget.Global);
    } catch (error) {
      // Unos ajustes del editor rotos, o de solo lectura (revisión).
      this.salida.appendLine(`[version] no se guarda probar antes: ${error.message}`); // diccionario: interno
      return this.enviar({ tipo: 'aviso', texto: 'No he podido guardar el ajuste. Pulsa «Algo va mal» y pásale el código a tu tutor.', malo: true });
    }
    await this.contexto.globalState.update(version.CLAVE, undefined);
    return this.volverALaVersion();
  }

  // ── Sola (decisión 136) ───────────────────────────────────────────────
  //
  // Con «Que se ponga al día sola» encendido, que es como viene: al ver que hay
  // una más nueva, se baja, se comprueba y se pone, sin esperar a nadie y sin
  // pantalla de espera. Al terminar, la tarjeta dice que ya está puesta, con
  // «Recargar ahora». Si no se puede, se queda el botón de siempre y no se
  // vuelve a intentar sola hasta la próxima vez que se abra el editor.
  async ponerLaNuevaSolaSiToca() {
    if (!version.actualizarSola() || this.poniendoLaNueva) return;
    const actual = this.versionDeLaBarra();
    if (!actual) return;
    const laNueva = await version.laNuevaSiHay(this.contexto, actual);
    if (!laNueva || laNueva.version === this.versionPuesta || laNueva.version === this.solaNoPudo) return;
    this.poniendoLaNueva = true;
    let hecho;
    try {
      hecho = await version.ponerLaNueva(this.contexto, actual);
    } finally {
      this.poniendoLaNueva = false;
    }
    this.salida.appendLine(`[version] sola: ${hecho.ok ? `puesta la ${hecho.version}` : `no se ha puesto${hecho.version ? ` la ${hecho.version}` : ''}: ${hecho.motivo}${hecho.detalle ? ` (${hecho.detalle})` : ''}`}`); // diccionario: interno
    if (hecho.ok) {
      this.versionPuesta = hecho.version;
      await this.repintarLoQueHaya();
    } else if (hecho.motivo !== 'yaEstaAlDia') {
      this.solaNoPudo = laNueva.version;
    }
  }

  async actualizarSola(si) {
    try {
      await vscode.workspace.getConfiguration().update(version.AJUSTE_SOLA, si === true, vscode.ConfigurationTarget.Global);
    } catch (error) {
      this.salida.appendLine(`[version] no se guarda actualizar sola: ${error.message}`); // diccionario: interno
      return this.enviar({ tipo: 'aviso', texto: 'No he podido guardar el ajuste. Pulsa «Algo va mal» y pásale el código a tu tutor.', malo: true });
    }
    return this.volverALaVersion();
  }

  // Desde el botón: bajarla, comprobarla e instalarla es de `version.js`.
  async ponerLaNueva() {
    // Un doble clic serían dos descargas escribiendo en el mismo fichero.
    if (this.poniendoLaNueva) return undefined;
    this.poniendoLaNueva = true;
    try {
      return await this.ponerLaNuevaYa();
    } finally {
      this.poniendoLaNueva = false;
    }
  }

  async ponerLaNuevaYa() {
    this.enviar({ tipo: 'esperando', que: 'Bajando la versión nueva…' });
    const hecho = await version.ponerLaNueva(this.contexto, this.versionDeLaBarra());
    this.salida.appendLine(`[version] ${hecho.ok ? `puesta la ${hecho.version}` : `no se ha puesto${hecho.version ? ` la ${hecho.version}` : ''}: ${hecho.motivo}${hecho.detalle ? ` (${hecho.detalle})` : ''}`}`); // diccionario: interno
    if (hecho.ok) {
      this.versionPuesta = hecho.version;
      await this.refrescar(true);
      return this.enviar({
        tipo: 'aviso',
        texto: `Ya está puesta la ${hecho.version}. Recarga la ventana para empezar a usarla: no se pierde nada.`,
        boton: { etiqueta: 'Recargar ahora', accion: { tipo: 'recargar' } },
      });
    }
    await this.refrescar(true);
    if (hecho.motivo === 'yaEstaAlDia') return this.enviar({ tipo: 'aviso', texto: 'Ya tienes la última.' });
    // De repuesto, la página: es lo que había antes, y con un fallo de aquí
    // sigue sirviendo a quien le ayude.
    return this.enviar({
      tipo: 'aviso',
      texto: 'No he podido ponerla. Pulsa «Algo va mal» y pásale el código a tu tutor.',
      malo: true,
      boton: { etiqueta: 'Abrir su página', accion: { tipo: 'bajarLaNueva' } },
    });
  }

  // ------------------------------------------------------- los consejos

  // El almacén de esta carpeta: lo que se ha ido pidiendo y lo que el alumno
  // apartó con "ahora no". No se ve, no se versiona y no sale de aquí.
  almacen() {
    return this.contexto.workspaceState || this.contexto.globalState;
  }

  // Lo que el alumno ya tiene escrito, todo junto: de ahí se saca qué le
  // vendría bien. No se manda a ninguna parte; se lee aquí y se tira.
  corpus() {
    return [
      identidad.objetivo(),
      identidad.deQuien(),
      cerebro.catalogo().map((t) => `${t.etiqueta} ${t.descripcion || ''} ${t.articulos.map((a) => `${a.titulo} ${a.resumen}`).join(' ')}`).join(' '),
      acciones.acciones().map((a) => a.etiqueta).join(' '),
      conexiones.proveedores().map((p) => p.etiqueta).join(' '),
      cerebro.loQueAunNoSabe(5).join(' '),
    ].join(' ');
  }

  // Lo que la barra puede ver por sí misma leyendo el disco. Lo usan dos: el
  // consejo suelto de la pantalla principal —como mucho uno— y la pantalla de
  // sugerencias, que los enseña todos. Antes esto vivía dentro del primero, así
  // que el segundo no habría podido existir sin copiarlo.
  async queVeoYo() {
    const [ultima] = await copias.copias(1);
    return {
      esperando: cerebro.esperandoLectura(),
      esperandoDesdeHace: cerebro.esperandoDesdeHace(),
      conexionesAMedias: conexiones.proveedores().filter((p) => p.faltan > 0),
      diasSinCopia: ultima ? Math.floor((Date.now() - new Date(ultima.cuando).getTime()) / 86400000) : null,
      cambiosSinGuardar: (await copias.cambiosSinGuardar()) || 0,
      peticiones: this.almacen().get(CLAVE_PETICIONES) || [],
      corpus: this.corpus(),
      yaInstaladas: rsc.habilidadesPuestas(),
      catalogo: consejos.capacidades(this.contexto.extensionPath),
      // Uno basta para el consejo suelto; la pantalla de sugerencias los
      // enseña todos, así que aquí se piden unos cuantos.
      huecos: cerebro.loQueAunNoSabe(4),
      silenciados: this.almacen().get(CLAVE_SILENCIADOS) || {},
      // Lo que el asistente apuntó tras trabajar y nadie leía (decisión 102).
      huecosDeAutomatizacion: consejos.huecosDeAutomatizacion(),
    };
  }

  async elConsejoQueToca() {
    try {
      if (!proyecto.arnesCompleto()) return null;
      return consejos.elQueToca(await this.queVeoYo());
    } catch (error) {
      // Un consejo es un extra: si falla, la barra sigue funcionando igual.
      this.salida.appendLine(`[consejos] ${error.stack || error.message}`);
      return null;
    }
  }

  // Lo que la tarjeta dice de las claves (decisión 167). Solo con el arnés
  // montado, y nada de lo apartado con «Ahora no» hace menos de una semana. Sin
  // nombres de fichero ni valores: cuántas, y el encargo, que ya lleva lo suyo.
  lasClavesQueTocan() {
    try {
      if (!proyecto.arnesCompleto()) return {};
      const apartadas = this.almacen().get(CLAVE_SILENCIADOS) || {};
      const apartada = (id) => Boolean(apartadas[id]) && Date.now() - apartadas[id] < CLAVES_APARTADAS_DURANTE;
      const enLasCopias = apartada('claves:en-las-copias') ? null : sueltas.deLasAppsEnLasCopias();
      const fuera = apartada('claves:fuera-de-sitio') ? null : sueltas.resumen();
      return {
        clavesEnLasCopias: enLasCopias
          ? { claves: enLasCopias.claves, deAcceso: enLasCopias.deAcceso, aplicaciones: enLasCopias.carpetas.length, prompt: enLasCopias.prompt }
          : null,
        clavesFueraDeSitio: fuera
          ? { claves: fuera.claves, deAcceso: (fuera.ficherosDeAcceso || []).length, prompt: fuera.prompt }
          : null,
      };
    } catch (error) {
      // Como el consejo: si falla, la barra sigue igual, sin la tarjeta.
      this.salida.appendLine(`[claves] ${error.stack || error.message}`); // diccionario: interno
      return {};
    }
  }

  async ahoraNo(id) {
    const silenciados = { ...(this.almacen().get(CLAVE_SILENCIADOS) || {}), [id]: Date.now() };
    await this.almacen().update(CLAVE_SILENCIADOS, silenciados);
    return this.refrescar(true);
  }

  // ── Se adapta y da ideas (decisión 152) ──────────────────────────────

  // «Esto parece …», la primera vez, y la idea que toca. Si la primera vez no
  // hay nada —una carpeta nueva—, ya no se dirá: lo que crezca aquí después lo
  // ha hecho ella, y «esto parece» le contaría lo que ya sabe. Pero si hay algo
  // suyo que la barra todavía no sabe decir, se espera (revisión de corrección, 8).
  async loQueSeAdapta() {
    try {
      if (!proyecto.arnesCompleto()) return null;
      const visto = ideas.queSeVe({
        carpetaDeLaExtension: this.contexto.extensionPath,
        corpus: this.corpus(),
        silenciados: this.almacen().get(CLAVE_SILENCIADOS) || {},
      });
      const yaSeDijo = this.almacen().get(CLAVE_LO_QUE_PARECE);
      if (!yaSeDijo && !visto.parece && !visto.hayAlgoSuyo) await this.almacen().update(CLAVE_LO_QUE_PARECE, 'nada');
      return { parece: yaSeDijo ? null : visto.parece, idea: visto.idea };
    } catch (error) {
      // Como el consejo: es un extra, y si falla la barra sigue igual.
      this.salida.appendLine(`[ideas] ${error.stack || error.message}`); // diccionario: interno
      return null;
    }
  }

  async entendidoLoQueParece() {
    await this.almacen().update(CLAVE_LO_QUE_PARECE, Date.now());
    return this.refrescar(true);
  }

  // La copia que guardó el arnés al montarse, en una ventana del sistema. La
  // ruta no viene del panel: se vuelve a buscar en el disco.
  async verLaCopiaDelMontaje() {
    const copia = ideas.laCopiaDelMontaje(proyecto.raiz());
    if (!copia) return this.enviar({ tipo: 'aviso', texto: 'Esa copia ya no está.', malo: true });
    await vscode.env.openExternal(vscode.Uri.file(copia.carpeta));
    return undefined;
  }

  // ── Lo que pide el asistente (decisión 150) ──────────────────────────
  //
  // La regla 7 decía «dile que la busque en la barra y la pulse»: el alumno, que
  // estaba hablando con el asistente, tenía que irse a otra pantalla a buscar un
  // botón. Ahora el asistente le pregunta, y con su sí deja el pedido escrito; la
  // barra lo ve (el vigía, y el reloj de los recordatorios por si acaso) y la añade
  // como el botón: con su arnés, la versión de la clase, sin npx y con lo que el
  // equipo apagó (`rsc.correr`). Solo del catálogo de la clase.
  //
  // Sola, con las guardas de lo que se hace solo (P9): carpeta de confianza, que
  // este ordenador conoce y con un arnés que no va por delante. Si no, no se
  // queda esperando: se pregunta a la persona, con su botón, una vez por pedido.
  //
  // Si el arnés de la carpeta va por delante, la barra no puede (P7): se le dice al
  // asistente, que sí puede, con la versión que la carpeta declara. Dónde está la
  // carpeta, qué pedidos hay y cómo se contesta sin seguir enlaces: `pedidos.js`.
  //
  // Un pedido que llega mientras se atiende otro no espera al minuto: se da otra
  // vuelta al terminar.
  async atenderLosPedidos() {
    if (this.atendiendo) {
      this.otraVuelta = true;
      return;
    }
    this.atendiendo = true;
    try {
      do {
        this.otraVuelta = false;
        await this.unaVueltaDePedidos();
      } while (this.otraVuelta);
    } finally {
      this.atendiendo = false;
    }
  }

  async unaVueltaDePedidos() {
    const raiz = proyecto.raiz();
    this.preguntados = this.preguntados || new Set();
    this.aceptados = this.aceptados || new Set();
    // Lo que espera a que la persona conteste no ocupa sitio: los demás se atienden
    // (revisión de corrección, 2 y 6).
    const hay = pedidos.losQueHay(raiz).filter((id) => !this.preguntados.has(id) && !(this.sinRespuesta && this.sinRespuesta.has(`${raiz}:${id}`))).slice(0, pedidos.POR_VEZ);
    if (!hay.length) return;
    for (const id of hay) pedidos.olvidarLaRespuesta(raiz, id);
    const catalogo = consejos.capacidades(this.contexto.extensionPath);
    const contestar = (id, que, mas = {}) => this.dejarLaRespuesta(raiz, id, pedidos.respuesta(que, { id, comoSePide: saberes.comoSePide(id), ...mas }));
    const confianza = vscode.workspace.isTrusted !== false;
    const porDelante = rsc.vaPorDelante();
    let anadidas = 0;
    for (const id of hay) {
      // Con el sí de la persona a la pregunta, como si pudiera sola.
      const dijoQueSi = this.aceptados.has(id);
      const sola = dijoQueSi || (confianza && this.carpetaConocida() && proyecto.arnesCompleto() && (this.anadidasSolas || 0) < pedidos.POR_SESION);
      const { que, nombre, parecidas } = pedidos.queHacer(id, { catalogo, enDisco: rsc.habilidadesEnDisco(), sola });
      if (que === 'noEsta' || que === 'yaEstaba') {
        this.aceptados.delete(id);
        contestar(id, que, { parecidas });
        continue;
      }
      if (porDelante || !confianza) {
        this.aceptados.delete(id);
        contestar(id, porDelante ? 'porDelante' : 'sinConfianza');
        continue;
      }
      if (que === 'preguntar') {
        this.preguntarElPedido(id, nombre);
        continue;
      }
      // Con el arnés ocupado, al minuto siguiente; los que no lo necesitan, ya.
      if (this.conElArnes()) continue;
      this.arreglandoSolo = true;
      let ok = false;
      try {
        ({ ok } = await rsc.anadir(id));
      } catch (error) {
        // Contestado igual: si no, se reintentaría cada minuto (revisión de corrección, 5).
        this.salida.appendLine(`[pedidos] ${id}: ${error.message}`); // diccionario: interno
      } finally {
        this.arreglandoSolo = false;
      }
      this.aceptados.delete(id);
      if (!dijoQueSi) this.anadidasSolas = (this.anadidasSolas || 0) + 1;
      contestar(id, ok ? 'anadida' : 'noSePudo');
      this.salida.appendLine(`[pedidos] ${id}: ${ok}`); // diccionario: interno
      if (ok) {
        anadidas += 1;
        vscode.window.showInformationMessage(`He añadido ${nombre}, que te ha pedido el asistente. ${pedidos.sePide(id, saberes.comoSePide(id))}`);
      }
    }
    if (anadidas) await this.refrescar(true);
  }

  // Contestarle al asistente, y si no se puede escribir la respuesta, decirlo
  // (decisión 189): el pedido se queda, el asistente sigue esperando y la persona
  // tiene que saberlo. Una vez por pedido, y no se reintenta cada minuto.
  dejarLaRespuesta(raiz, id, texto) {
    if (pedidos.contestar(raiz, id, texto)) return true;
    if (!this.sinRespuesta) this.sinRespuesta = new Set();
    this.sinRespuesta.add(`${raiz}:${id}`);
    this.salida.appendLine(`[pedidos] ${id}: no se pudo escribir la respuesta`); // diccionario: interno
    this.unaVez(`sinRespuesta:${id}`, () => avisarConSalida('No he podido contestarle al asistente, y se queda esperando. Pulsa «Algo va mal» y pásale el código a tu tutor.'));
    return false;
  }

  // Sin poder hacerlo sola, se pregunta, una vez por pedido. Con «Añadirla» se
  // añade como si pudiera sola, en la vuelta siguiente y con las mismas guardas: si
  // el arnés está ocupado, espera, y si va por delante, se le dice al asistente
  // (revisión de corrección, 3). No da la carpeta por conocida: la pregunta la
  // puede haber traído el repositorio (revisión de seguridad, 3). Si cierra la
  // pregunta, se le dice al asistente, que si no se quedaría esperando.
  // Una vez por pedido: la vuelta ya aparta los que esperan respuesta.
  preguntarElPedido(id, nombre) {
    this.preguntados.add(id);
    Promise.resolve(vscode.window.showInformationMessage(`El asistente quiere añadir ${nombre}. ¿La añado?`, 'Añadirla')).then((quiere) => {
      this.preguntados.delete(id);
      const raiz = proyecto.raiz();
      if (!pedidos.sigue(raiz, id)) return undefined;
      if (quiere !== 'Añadirla') return this.dejarLaRespuesta(raiz, id, pedidos.respuesta('noQuiere'));
      this.aceptados.add(id);
      return this.atenderLosPedidos();
    }).catch((error) => this.salida.appendLine(`[pedidos] ${error.message}`)); // diccionario: interno
  }

  // Si algo está corriendo el arnés ahora: un arreglo solo, o un botón que lo usa.
  // Dos a la vez escribirían los mismos ficheros (revisión de corrección, 4).
  conElArnes() {
    return Boolean(this.arreglandoSolo || this.botonesDelArnes);
  }

  // Añadir una habilidad del catálogo (`rsc add`), sin que el alumno vea nada
  // de esto. Se nombra por su nombre —«Facturación»— y se le dice cómo se
  // invoca, que con Claude es escribir `/su-identificador`.
  async aprenderCapacidad(id, nombre) {
    this.enviar({ tipo: 'esperando', que: `Añadiendo ${nombre}…` });
    const { ok } = await rsc.anadir(id);
    await this.refrescar(true);
    this.enviar({
      tipo: 'aviso',
      texto: ok
        ? `${nombre} ya está puesta. Se pide con ${saberes.comoSePide(id)}.`
        : 'No he podido añadirla. Pulsa «Algo va mal» y pásale el código a tu tutor.',
      malo: !ok,
    });
  }

  // ── Deshacer con RSC (decisión 173) ──────────────────────────────────
  //
  // Quitar una habilidad o un agente que se añadió, y volver a la copia que guardó
  // RSC al montar. Las dos cosas borran o sustituyen ficheros: con el clic de la
  // persona y una pregunta que dice qué se va a quitar, nunca solas (P9). Lo que se
  // ofrece se vuelve a decidir aquí, con lo que hay en el disco: el panel solo dice
  // qué botón se pulsó.
  async quitarHabilidad(id) {
    const ella = saberes.queSabe(this.contexto.extensionPath, this.corpus()).sabe.find((c) => c.id === id && c.quitable);
    if (!ella) return this.enviar({ tipo: 'aviso', texto: 'Esa habilidad no se puede quitar desde aquí.', malo: true });
    const seguro = await vscode.window.showWarningMessage(
      `Voy a quitar «${ella.nombre}» de esta carpeta: se borran sus ficheros y queda apuntada como no puesta. Se puede volver a añadir desde el catálogo.`,
      { modal: true },
      'Sí, quítala',
    );
    if (seguro !== 'Sí, quítala') return undefined;
    this.enviar({ tipo: 'esperando', que: `Quitando ${ella.nombre}…` });
    const hecho = await deshacer.quitar(id);
    this.salida.appendLine(`[quitar] ${id}: ${hecho.ok}${hecho.dijo ? ` · ${hecho.dijo}` : ''}`); // diccionario: interno
    await this.refrescar(true);
    await this.verSaberes();
    return this.enviar({
      tipo: 'aviso',
      texto: hecho.ok
        ? `${ella.nombre} ya no está puesta.`
        : `No he podido quitar ${ella.nombre}.${hecho.dijo ? ` El arnés ha dicho: «${hecho.dijo}».` : ''} Pulsa «Algo va mal» y pásale el código a tu tutor.`,
      malo: !hecho.ok,
    });
  }

  async quitarAgente(fichero) {
    const el = agentes.queHay().find((a) => a.fichero === fichero && a.quitable);
    const donde2 = el && agentes.dondeVive(fichero);
    if (!el || !donde2) return this.enviar({ tipo: 'aviso', texto: 'Ese agente no se puede quitar desde aquí.', malo: true });
    const nombre = el.nombre.charAt(0).toUpperCase() + el.nombre.slice(1);
    const seguro = await vscode.window.showWarningMessage(
      `Voy a quitar el agente «${nombre}» de esta carpeta: se borra su fichero y queda apuntado como no puesto.`,
      { modal: true },
      'Sí, quítalo',
    );
    if (seguro !== 'Sí, quítalo') return undefined;
    this.enviar({ tipo: 'esperando', que: `Quitando ${nombre}…` });
    const hecho = await deshacer.quitarAgente(el.id, [donde2]);
    this.salida.appendLine(`[quitar] agente ${el.id}: ${hecho.ok}${hecho.dijo ? ` · ${hecho.dijo}` : ''}`); // diccionario: interno
    await this.refrescar(true);
    await this.verAgentes();
    let texto = `${nombre} ya no está puesto.`;
    // Si el fichero sigue, se dice eso y no se inventa por qué.
    if (hecho.siguePuesto) texto = `No se ha podido quitar ${nombre}: sigue puesto.`;
    else if (!hecho.ok) texto = `No he podido quitar ${nombre}.${hecho.dijo ? ` El arnés ha dicho: «${hecho.dijo}».` : ''} Pulsa «Algo va mal» y pásale el código a tu tutor.`;
    return this.enviar({ tipo: 'aviso', texto, malo: !hecho.ok });
  }

  // Por qué no se ha podido mirar qué cambiaría; en ningún caso se ha tocado nada.
  noSePuedeMirar(toca) {
    this.salida.appendLine(`[recuperar] ${toca.motivo || toca.dijo || ''}`); // diccionario: interno
    if (toca.motivo === 'vacia') return 'No he tocado nada: no he podido saber qué cambiaría.';
    if (toca.motivo === 'ajenas') return 'No he tocado nada: el arnés ha nombrado sitios que no reconozco en esta carpeta.';
    return `No he podido mirar qué cambiaría.${toca.dijo ? ` El arnés ha dicho: «${toca.dijo}».` : ''} No he tocado nada.`;
  }

  async recuperarLoQueHabia() {
    const copia = ideas.laCopiaDelMontaje(proyecto.raiz());
    if (!copia) return this.enviar({ tipo: 'aviso', texto: 'Esa copia ya no está.', malo: true });
    // Lo que RSC tocaría, sin tocar nada: para decirle a la persona cuántos sitios son.
    const toca = await deshacer.loQueTocaria(copia.id);
    if (!toca.ok) return this.enviar({ tipo: 'aviso', texto: this.noSePuedeMirar(toca), malo: true });
    const sitios = toca.rutas.length === 1 ? '1 sitio' : `${toca.rutas.length} sitios`;
    const seguro = await vscode.window.showWarningMessage(
      `Voy a devolver esta carpeta a como estaba antes de montar el arnés: lo tuyo vuelve a lo de antes, lo que puso el arnés se quita, y lo que hayas cambiado desde entonces en esos ${sitios} se pierde. Antes guardo una copia de lo de ahora.`,
      { modal: true },
      'Sí, recupéralo',
    );
    if (seguro !== 'Sí, recupéralo') return undefined;
    // Otra vez, justo antes: la copia de lo de ahora tiene que cubrir exactamente lo que se va a tocar.
    const otra = await deshacer.loQueTocaria(copia.id);
    if (!otra.ok) return this.enviar({ tipo: 'aviso', texto: this.noSePuedeMirar(otra), malo: true });
    if ([...otra.rutas].sort().join('\n') !== [...toca.rutas].sort().join('\n')) {
      return this.enviar({ tipo: 'aviso', texto: 'No he tocado nada: lo que iba a cambiar ya no es lo mismo. Vuelve a pulsar «Recuperar lo que había».', malo: true });
    }
    this.enviar({ tipo: 'esperando', que: 'Recuperando lo que había…' });
    const hecho = await deshacer.recuperar(copia.id, otra.rutas);
    this.salida.appendLine(`[recuperar] ${copia.id}: ${hecho.ok}${hecho.dijo ? ` · ${hecho.dijo}` : ''}`); // diccionario: interno
    await this.refrescar(true);
    await this.verCopias();
    const dondeLoDeAhora = hecho.guardado ? path.relative(proyecto.raiz(), hecho.guardado).split(path.sep).join('/') : null;
    let texto;
    if (!hecho.guardado) texto = 'No he tocado nada: no he podido guardar antes una copia de lo de ahora.';
    else if (hecho.ok) texto = `Hecho: la carpeta está como antes de montar el arnés. Lo de antes de recuperar está en ${dondeLoDeAhora}.`;
    else texto = `No he podido recuperarlo, y puede haber quedado a medias.${hecho.dijo ? ` El arnés ha dicho: «${hecho.dijo}».` : ''} Lo de antes está en ${dondeLoDeAhora}. Pulsa «Algo va mal» y pásale el código a tu tutor.`;
    return this.enviar({ tipo: 'aviso', texto, malo: !hecho.ok });
  }

  async manejar(mensaje) {
    const rutas = {
      listo: () => this.refrescar(),
      refrescar: () => this.refrescar(true),
      volver: () => this.refrescar(),
      pedir: () => this.pedir(mensaje.prompt),
      // Decisión 183: el botón de un aviso que decía «pídeselo al asistente». El
      // texto viene de la pantalla y puede traer nombres de la carpeta: va en una
      // línea y sin comillas, como todo rótulo que entra en un encargo.
      queLoMireElAsistente: () => this.pedir(`En la barra me ha salido este aviso y no sé cómo seguir: ${unRotulo(mensaje.texto, 300)}. Mira qué pasa y arréglalo, o dime qué tengo que hacer.`),
      dejarLaClaveAsi: () => this.dejarLaClaveAsi(mensaje.proveedor, mensaje.huella),
      cuandoCaduca: () => this.apuntarCuandoCaduca(mensaje.proveedor, mensaje.en, mensaje.huella),
      hacerElRecordatorio: () => this.hacerElRecordatorio(mensaje.nombre),
      ahoraNoRecordatorio: () => this.dejarElRecordatorio(mensaje.nombre),
      seguirDondeLoDeje: () => this.seguirDondeLoDeje(mensaje.prompt, mensaje.dia),
      ahoraNoLaUltimaVez: () => this.ahoraNoLaUltimaVez(mensaje.dia),
      volverALaConversacion: () => this.volverALaConversacion(),
      quitarRecordatorio: () => this.quitarRecordatorio(mensaje.nombre),
      verRecordatorios: () => this.verRecordatorios(),
      crearRecordatorio: () => this.pedir(rutinas.CREAR_RECORDATORIO),
      ponerHorario: () => this.ponerHorario(mensaje.nombre),
      queSeHagaSola: () => this.queSeHagaSola(),
      entendidaLaCostumbre: () => this.dejarDeDecirLaCostumbre(mensaje.nombre, false),
      noHaceFaltaLaCostumbre: () => {
        const c = (this.almacen().get(CLAVE_COSTUMBRES) || {})[mensaje.nombre];
        return c && c.propuesta ? this.rechazarLaCostumbre(mensaje.nombre) : this.dejarDeDecirLaCostumbre(mensaje.nombre, true);
      },
      ponerLaCostumbre: () => this.aceptarLaCostumbre(mensaje.nombre),
      conversacionNueva: () => this.conversacionNueva(),
      pedirAyudaEnElForo: () => this.pedirAyudaEnElForo(),
      abrir: () => this.abrirUnaPagina(mensaje.url),
      // Decisión 183: el motivo técnico de una pantalla que no se pudo pintar va al
      // registro, que es lo que lee el informe de «Algo va mal»; a la vista, no.
      falloAlPintar: () => this.salida.appendLine(`[panel] no se pudo pintar: ${unRotulo(mensaje.mensaje, 300)}`), // diccionario: interno
      bajarLaNueva: () => vscode.env.openExternal(version.dondeBajarla()),
      verLaRelease: () => vscode.env.openExternal(version.dondeVerla(this.versionDeLaBarra())),
      yaLoHeVisto: () => this.yaLoHeVisto(),
      probarAntes: () => this.probarAntes(mensaje.cual),
      actualizarSola: () => this.actualizarSola(mensaje.cual),
      yaLoSe: () => this.yaLoSe(mensaje.numero),
      ponerLaNueva: () => this.ponerLaNueva(),
      recargar: () => vscode.commands.executeCommand('workbench.action.reloadWindow'),

      verConexiones: () => this.verConexiones(),
      verConexion: () => this.verConexion(mensaje.proveedor),
      // Decisión 167: qué conectar se pregunta aquí, y el encargo sale con el nombre.
      conectarAlgoNuevo: () => this.conectarAlgoNuevo(),
      guardarClave: () => this.guardarClave(mensaje.proveedor, mensaje.clave, mensaje.valor),
      pasoDeLaGuia: () => this.pasoDeLaGuia(mensaje.proveedor, mensaje.paso, mensaje.todos),
      // Decisión 156: cada clase de acceso, su forma, y lo que pedirle al informático.
      guardarClaves: () => this.guardarClaves(mensaje.proveedor, mensaje.valores),
      soltarFicheroDeAcceso: () => this.ponerFicheroDeAcceso(mensaje.proveedor, mensaje.ficheros),
      elegirFicheroDeAcceso: () => this.elegirFicheroDeAcceso(mensaje.proveedor),
      verParaElInformatico: () => this.verParaElInformatico(mensaje.proveedor),
      copiarParaElInformatico: () => this.copiarParaElInformatico(mensaje.proveedor),
      mandarAlInformatico: () => this.mandarAlInformatico(mensaje.proveedor),
      // Decisión 159: la guía para sacar la clave, en PDF.
      guiaEnPdf: () => this.guiaEnPdf(mensaje.proveedor),
      probar: () => this.probar(mensaje.proveedor),
      hacerCosita: () => this.hacerCosita(mensaje.proveedor, mensaje.fichero, mensaje.etiqueta, mensaje.pideDatos),

      buscar: () => this.buscar(mensaje.texto, mensaje.donde),
      verCerebro: () => this.verCerebro(),
      verTema: () => this.verTema(mensaje.tema),
      leerArticulo: () => this.leerArticulo(mensaje.ruta, mensaje.tema, mensaje.desde),
      abrirFuera: () => this.abrirFuera(mensaje.ruta),
      cambiarArticulo: () => this.pedir(`Quiero cambiar lo que sabes sobre «${unRotulo(mensaje.titulo)}». Ábrelo, enséñame qué dice y pregúntame qué hay que corregir.`),
      anadirDocumentos: () => this.anadirDocumentos(mensaje.desde),
      soltarDocumentos: () => this.soltarDocumentos(mensaje.ficheros, mensaje.para),
      abrirPanelCompleto: () => this.abrirPanelCompleto(mensaje.desde),
      verDocumentos: () => this.verDocumentos(),
      verLaFoto: () => this.verLaFoto(mensaje.desde),
      guardarLaFoto: () => this.guardarLaFoto(mensaje.png),
      abrirLaFoto: () => this.abrirLaFoto(mensaje.fichero),
      llevarteLaFoto: () => this.llevarteLaFoto(mensaje.fichero),

      verCopias: () => this.verCopias(),
      guardarCopia: () => this.guardarCopia(),
      subirCopia: () => this.subirCopia(),
      volverA: () => this.volverA(mensaje.id),

      algoVaMal: () => this.algoVaMal(),
      verContar: () => this.verContar(),
      contar: () => this.contar(mensaje.cual),
      contarLaIncidencia: () => this.contarLaIncidencia(),
      verElAviso: () => this.verElAviso(mensaje.fichero),
      mandarElAviso: () => this.mandarElAviso(mensaje.texto, mensaje.titulo),
      noMandarElAviso: () => this.noMandarElAviso(),
      resolverIncidencia: () => this.resolverIncidencia(mensaje.cual),
      verElInforme: () => this.verElInforme(mensaje.fichero),
      arreglar: () => this.arreglar(),
      arrancar: () => this.arrancar(),
      seguirSinCopias: () => this.seguirSinCopias(),
      instalarGit: () => this.instalarGit(),
      ponerCopias: () => this.ponerCopias(),
      arreglarElRelevo: () => this.arreglarElRelevo(),
      ponerElFreno: () => this.ponerElFreno(),
      ponerLoDeClaudeAqui: () => this.ponerLoDeClaudeAqui(),
      arreglarCodexAqui: () => this.arreglarCodexAqui(),
      volverAEncender: () => this.volverAEncender(),
      noOfrecerMas: () => this.noOfrecerMas(mensaje.cual),
      ponerElBloque: () => this.ponerElBloque(),
      conectarGitHub: () => this.conectarGitHub(),
      mandarElPrimerEncargo: () => this.mandarElPrimerEncargo(),
      verCopiaFuera: () => this.verCopiaFuera(),
      verRadiografia: () => this.verRadiografia(),
      guardarLaRevision: () => this.guardarLaRevision(),
      verSaberes: () => this.verSaberes(),
      verSalidas: () => this.verSalidas(),
      verHuecos: () => this.verHuecos(),
      verPapeles: () => this.verPapeles(),
      abrirPapel: () => this.abrirPapel(mensaje.ruta),
      quitarPapel: () => this.quitarPapel(mensaje.ruta, mensaje.nombre, mensaje.desde),
      verAyuda: () => this.verAyuda(),
      verEstaBarra: () => this.verEstaBarra(),
      verDatosDeClientes: () => this.verDatosDeClientes(),
      soloLoQueLePegues: () => this.soloLoQueLePegues(mensaje.cual),
      entendidoLoDeLosDatos: () => this.entendidoLoDeLosDatos(),
      dejarListoLoDeCodex: () => this.dejarListoLoDeCodex(),
      entendidoLoDeCodex: () => this.entendidoLoDeCodex(),
      verReglas: () => this.verReglas(),
      abrirReglas: () => this.abrirReglas(mensaje.cual),
      cambiarInterruptor: () => this.cambiarInterruptor(mensaje.cual),
      abrirRevision: () => this.abrirRevision(mensaje.fichero),
      ponerLosRailesAlDia: () => this.ponerLosRailesAlDia(),
      // Sin `que`, todo lo de la barra; con una lista, solo eso; con otra cosa, nada.
      quitarLoDeClaude: () => mensaje.que === undefined ? this.quitarLoDeClaude()
        : Array.isArray(mensaje.que) ? this.quitarLoDeClaude(mensaje.que.filter((q) => typeof q === 'string')) : undefined,
      quitarElAvisoDeCodex: () => this.quitarElAvisoDeCodex(),
      verAsistente: () => this.verAsistente(),
      verComoTrabaja: () => this.verComoTrabaja(),
      verFijadas: () => this.verFijadas(),
      verLaCara: () => this.verLaCara(),
      verProyectos: () => this.verProyectos(),
      verSugerencias: () => this.verSugerencias(),
      verComandos: () => this.verComandos(),
      verAgentes: () => this.verAgentes(),
      verAgente: () => this.verAgente(mensaje.fichero),
      verProyecto: () => this.verProyecto(mensaje.fichero),
      materialDeMarca: () => this.materialDeMarca(),
      quitarLaCara: () => this.quitarLaCara(),
      fijar: () => this.cambiarFijada(fijadas.fijar, mensaje.cual),
      soltar: () => this.cambiarFijada(fijadas.soltar, mensaje.cual),
      ponerPermiso: () => this.cambiarAjuste(ajustes.ponerPermiso, mensaje.cual),
      ponerCadaCuanto: () => this.cambiarAjuste(ajustes.ponerCadaCuanto, mensaje.cual),
      elegirAsistente: () => this.elegirAsistente(mensaje.cual),
      ponerElAsistente: () => this.ponerElAsistente(mensaje.cual, mensaje.desde),
      prepararTambien: () => this.prepararTambien(mensaje.cual),
      abrirElAjuste: () => vscode.commands.executeCommand('workbench.action.openSettings', asistentes.AJUSTE),
      verDiario: () => this.verDiario(),
      verSesion: () => this.verSesion(mensaje.fichero),
      verTrato: () => this.verTrato(),
      ponerPalabras: () => this.ponerPalabras(mensaje.cual),
      abrirSalida: () => this.abrirSalida(mensaje.herramienta, mensaje.fichero),
      guardarSalida: () => this.guardarSalida(mensaje.herramienta, mensaje.fichero),
      abrirCarpetaDeSalida: () => salidas.abrirLaCarpeta(mensaje.herramienta),
      ponerLaCara: () => this.ponerLaCara(),
      elegirCarpeta: () => this.elegirCarpeta(),
      abrirLaDeArriba: () => this.abrirLaDeArriba(),
      // La salida de una carpeta que no se prepara: una nueva, dentro de la
      // personal (B1).
      crearCarpeta: () => arrancar.crearUnaCarpetaDentro(os.homedir(), this.salida),
      abrirAsistente: () => puente.abrirConversacion(),
      ahoraNo: () => this.ahoraNo(mensaje.id),
      entendidoLoQueParece: () => this.entendidoLoQueParece(),
      verLaCopiaDelMontaje: () => this.verLaCopiaDelMontaje(),
      aprenderCapacidad: () => this.aprenderCapacidad(mensaje.capacidad, mensaje.nombre),
      // Decisión 173: quitar lo que se añadió y volver a la copia, con la pregunta delante.
      quitarHabilidad: () => this.quitarHabilidad(mensaje.habilidad),
      quitarAgente: () => this.quitarAgente(mensaje.fichero),
      recuperarLoQueHabia: () => this.recuperarLoQueHabia(),
      verEditorCompleto: () => this.verEditorCompleto(),
      quitarElGuardadoSolo: () => this.quitarElGuardadoSolo(),
      modoSencillo: () => this.modoSencillo(),
    };

    const accion = rutas[mensaje.tipo];
    if (!accion) return;
    // En Recordatorios, lo que se dijo vale hasta la siguiente cosa que se pulsa,
    // como en la principal: después ya no se repinta con ello (revisión
    // adversaria de la 155).
    if (this.donde && this.donde.tipo === 'recordatorios' && this.donde.aviso) this.donde = { ...this.donde, aviso: null };

    if (ESCRIBEN_CON_EL_ARNES.has(mensaje.tipo) && rsc.vaPorDelante()) return this.enviar({ tipo: 'aviso', texto: POR_DELANTE });
    if (LOS_DEL_ARNES.has(mensaje.tipo)) {
      // Mientras la barra arregla sola, un segundo arreglo pisaría al primero
      // sobre los mismos ficheros (revisión de corrección, 5 y 6).
      if (this.arreglandoSolo) return this.enviar({ tipo: 'aviso', texto: OCUPADA });
      // Y quien pulsa uno da la carpeta por conocida: desde ahí, lo que se
      // pueda se hace solo al abrirla (P9; revisión de seguridad, H2).
      await this.darPorConocida();
    }

    const delArnes = LOS_DEL_ARNES.has(mensaje.tipo);
    if (delArnes) this.botonesDelArnes = (this.botonesDelArnes || 0) + 1;
    try {
      await accion();
    } catch (error) {
      // Nada de excepciones en crudo: el alumno ve una frase y una salida.
      this.salida.appendLine(`[${mensaje.tipo}] ${error.stack || error.message}`);
      // Esto es un fallo de la barra, no del alumno, y a Jose no le llegaba
      // nunca. Se deja apuntado para Executive Lab; sale solo si la persona
      // lo ve y dice que sí (decisión 131).
      avisos.apuntarUnFallo({ accion: mensaje.tipo, error, lineas: this.salida.ultimas ? this.salida.ultimas() : [] });
      this.enviar({ tipo: 'aviso', texto: 'Algo no ha ido bien. Pulsa «Algo va mal» y pásale el código a tu tutor.', malo: true });
    } finally {
      if (delArnes) this.botonesDelArnes -= 1;
    }
  }

  async pedir(prompt) {
    // Un botón sin texto no se manda. Parece de cajón y no lo era: un botón mal
    // montado le escribió a Jose la palabra "undefined" en su conversación,
    // porque `encodeURIComponent(undefined)` es la cadena "undefined" y el
    // enlace la entregó tan contento. Lo que llegue vacío se queda aquí, se
    // apunta con nombre y apellidos, y se dice que algo va mal.
    if (typeof prompt !== 'string' || !prompt.trim()) {
      this.salida.appendLine(`[pedir] un botón ha mandado un texto que no vale: ${JSON.stringify(prompt)}`); // diccionario: interno
      this.avisarAqui({ texto: 'Ese botón está mal montado. Pulsa «Algo va mal» y pásale el código a tu tutor.', malo: true });
      return;
    }

    // Sin el asistente en el ordenador no hay caja donde dejarlo: iba al
    // portapapeles con «pégalo en su caja» (decisión 166). Se dice que falta, con
    // el botón que lo pone.
    const quien = asistentes.elDeAhora();
    if (!asistentes.estaInstalado(quien)) return this.sinAsistente(quien);

    await this.anotarLaPeticion(prompt);
    await this.anotarElUso(prompt);
    const como = await puente.enviar(prompt, this.salida);
    // No se dice "se lo he pedido": los dos comandos de Claude dejan el texto
    // escrito en su caja y no lo envían (asistentes.js lo documenta). Decir que
    // ya se lo hemos pedido dejaba a la persona esperando una respuesta que no
    // iba a llegar hasta que ella misma le diera a enviar.
    if (como === 'directo') this.avisarAqui({ texto: DALE_A_ENVIAR });
    return undefined;
  }

  // Lo que se le pasa detrás de algo que la barra ya ha hecho —darle documentos,
  // el material de la marca—, y la frase de las dos cosas, tal y como han pasado
  // (decisión 166). Decía «Se lo paso» y el encargo se quedaba escrito en su caja
  // sin enviar, o en el portapapeles con Codex, y nadie miraba si había llegado.
  // Ahora dice lo mismo que `pedir`: escrito en la caja, «Dale a enviar»; copiado,
  // lo dice el aviso del portapapeles; y sin el asistente, que falta, con su botón.
  //
  // No se deja de mandar aunque el raíl le diga que lea la bandeja (§4 de
  // `SKILL.md`): el raíl solo actúa cuando le escriben, y entre mensaje y mensaje
  // no mira la carpeta. Sin el encargo, los documentos esperarían a que la persona
  // le escribiera algo, sin saber qué; con él, es un clic.
  async pasarleYDecir(hecho, encargo) {
    const quien = asistentes.elDeAhora();
    if (!asistentes.estaInstalado(quien)) return { ...asistentes.falta(quien), texto: `${hecho} ${asistentes.falta(quien).texto}` };
    let como;
    try {
      como = await puente.enviar(encargo, this.salida);
    } catch (error) {
      // El portapapeles o la conversación pueden rechazar: el hecho se dice igual
      // y se dice que el encargo no ha llegado (decisión 166, la revisión).
      this.salida.appendLine(`[asistente] el encargo no ha llegado: ${error && error.message}`); // diccionario: interno
      return { texto: `${hecho} No he podido pasarle el encargo a ${quien.nombre}. Pulsa «Algo va mal» y pásale el código a tu tutor.`, malo: true };
    }
    if (como === 'directo') return { texto: `${hecho} ${DALE_A_ENVIAR}`, malo: false };
    return { texto: hecho, malo: false };
  }

  // Ayuda › Conversación nueva. Con Codex no hay comando para eso: se abre su
  // barra y se dice dónde está el botón.
  async conversacionNueva() {
    const quien = asistentes.elDeAhora();
    if (!asistentes.estaInstalado(quien)) return this.sinAsistente(quien);
    if (await puente.conversacionNueva()) return this.enviar({ tipo: 'aviso', texto: 'Te he abierto una conversación nueva.' });
    if (!await puente.abrirConversacion()) {
      return this.enviar({ tipo: 'aviso', texto: `No he podido abrir ${quien.nombre}. Pulsa «Algo va mal» y pásale el código a tu tutor.`, malo: true });
    }
    return this.enviar({ tipo: 'aviso', texto: `Te he abierto ${quien.nombre}. Para empezar una conversación nueva, pulsa el «+» de arriba de su ventana.` });
  }

  // Sin el asistente no hay con quién hablar: ni se abre nada ni se manda
  // esperar una respuesta que no va a llegar. Y se pone con un clic: decía
  // «Díselo a tu tutor» y la barra ya sabía ponerlo (decisión 166).
  sinAsistente(quien) {
    return this.avisarAqui(asistentes.falta(quien));
  }

  // «Poner Claude», «Poner Codex» (decisión 166): instalar una extensión del
  // editor es un clic suyo, y es lo que ya hacía el montaje (`arrancar`). Lo que se
  // dice puesto se mira otra vez: hasta que el editor lo ve, no se puede hablar con
  // él, y entonces se dice que hay que recargar.
  async ponerElAsistente(cual, desde = null) {
    // Un segundo clic mientras se pone no lo instala dos veces (como `poniendoLaNueva`).
    if (this.poniendoElAsistente) return undefined;
    this.poniendoElAsistente = true;
    try {
      return await this.ponerElAsistenteDeVerdad(cual, desde);
    } finally {
      this.poniendoElAsistente = false;
    }
  }

  async ponerElAsistenteDeVerdad(cual, desde) {
    const quien = asistentes.porId(cual);
    if (!quien) {
      this.salida.appendLine(`[asistente] poner uno que no existe: ${JSON.stringify(cual)}`); // diccionario: interno
      return this.avisarAqui({ texto: 'Ese botón está mal montado. Pulsa «Algo va mal» y pásale el código a tu tutor.', malo: true });
    }
    if (!asistentes.estaInstalado(quien)) {
      this.enviar({ tipo: 'esperando', que: `Poniendo ${quien.nombre}…` });
      const puesto = await arrancar.ponerElAsistente(quien, { callado: true });
      this.salida.appendLine(`[asistente] poner ${quien.id}: ${puesto ? 'puesto' : 'no'}`); // diccionario: interno
      if (!puesto) {
        const noSePudo = { texto: `No he podido poner ${quien.nombre}. Pulsa «Algo va mal» y pásale el código a tu tutor.`, malo: true };
        if (desde === 'asistente') return this.verAsistente(noSePudo);
        await this.refrescar(true);
        return this.enviar({ tipo: 'aviso', ...noSePudo });
      }
      // El editor tarda un poco en verlo. Diez segundos, y si no, a recargar.
      const vueltas = this.vueltasAlPoner === undefined ? 20 : this.vueltasAlPoner;
      for (let i = 0; i < vueltas && !asistentes.estaInstalado(quien); i += 1) await new Promise((r) => setTimeout(r, 500));
    }
    const loVe = asistentes.estaInstalado(quien);
    const dicho = !loVe
      ? { texto: `Ya está puesto ${quien.nombre}. Recarga la ventana para empezar a usarlo: no se pierde nada.`, boton: { etiqueta: 'Recargar ahora', accion: { tipo: 'recargar' } } }
      : (asistentes.elDeAhora().id === quien.id
        ? { texto: `Ya está puesto ${quien.nombre}. Ábrelo y entra con tu cuenta.`, boton: { etiqueta: `Abrir ${quien.nombre}`, accion: { tipo: 'abrirAsistente' } } }
        : { texto: `Ya está puesto ${quien.nombre}.` });
    if (desde === 'asistente') return this.verAsistente(dicho);
    await this.refrescar(true);
    return this.enviar({ tipo: 'aviso', ...dicho });
  }

  // Ayuda › Pedir ayuda en el foro. El foro tiene muchas puertas, así que no se
  // abre ninguna: el asistente escribe el mensaje y se dice dónde pegarlo
  // (Jose: «solo copiar el mensaje y decir que hay que ir a Resolver dudas en
  // Circle»).
  async pedirAyudaEnElForo() {
    const quien = asistentes.elDeAhora();
    if (!asistentes.estaInstalado(quien)) return this.sinAsistente(quien);
    const como = await puente.enviar(PEDIR_AYUDA_EN_EL_FORO, this.salida);
    const donde = 'Cuando te conteste, copia el mensaje y pégalo en «Resolver dudas», en Circle.';
    if (como === 'directo') return this.enviar({ tipo: 'aviso', texto: `Te lo he dejado escrito en la conversación: dale a enviar. ${donde}` });
    if (como === 'copiado') return this.enviar({ tipo: 'aviso', texto: donde });
    return this.enviar({ tipo: 'aviso', texto: 'No he podido hablar con el asistente. Pulsa «Algo va mal» y pásale el código a tu tutor.', malo: true });
  }

  // ── Los recordatorios (decisión 144) ──────────────────────────────────

  // Cuándo se pulsó cada botón (una habilidad o un comando, `/x` o `$x`): de ahí
  // sale la costumbre. Solo el nombre y la hora, en su ordenador.
  async anotarElUso(prompt) {
    const boton = acciones.acciones().find((b) => b.prompt === String(prompt || '').trim());
    if (!boton) return;
    const antes = this.almacen().get(CLAVE_USOS) || [];
    await this.almacen().update(CLAVE_USOS, [...antes, { nombre: boton.nombre, t: Date.now() }].slice(-200));
  }

  // Recordatorios (decisiones 144 y 155): los de esta carpeta, los pendientes
  // primero, y cada uno con lo que se puede hacer con él de verdad.
  async verRecordatorios(avisoLocal = null) {
    this.donde = { tipo: 'recordatorios', aviso: avisoLocal };
    const pendientes = new Set((await this.losRecordatoriosQueTocan()).map((r) => r.nombre));
    const ahora = Date.now();
    const horarios = recordatorios.conHorario().map((r) => {
      const proxima = cuando.proximaVez(r.cuando, ahora);
      const puedeQuitar = recordatorios.puedeQuitar(r);
      return { nombre: r.nombre, etiqueta: r.etiqueta, enPalabras: cuando.enPalabras(r.cuando),
        pendiente: pendientes.has(r.nombre), proxima: rutinas.fecha(proxima), proximaHora: proxima,
        // Una compartida con otra carpeta se lee aquí y se cambia allí: sin
        // botones que fallarían al pulsarlos.
        puedeCambiar: recordatorios.puedeCambiar(r), puedeQuitar, compartida: !puedeQuitar };
    }).sort((a, b) => Number(b.pendiente) - Number(a.pendiente)
      || (a.proximaHora ?? Infinity) - (b.proximaHora ?? Infinity) || a.etiqueta.localeCompare(b.etiqueta, 'es'));
    this.enviar({
      tipo: 'recordatorios', horarios,
      hayHabilidades: recordatorios.disponibles().some((b) => recordatorios.puedeCambiar(b)),
      queSeHagaSola: rutinas.explicacion(asistentes.elDeAhora().nombre),
      aviso: avisoLocal,
    });
  }

  // Al terminar algo que empezó en Recordatorios: si sigue allí, en la pantalla;
  // si se ha ido a otra mientras elegía, no se le devuelve: se le dice con un
  // aviso del editor (revisión adversaria de la 155).
  avisarDeLosRecordatorios(aviso) {
    if (this.donde && this.donde.tipo === 'recordatorios') return this.verRecordatorios(aviso);
    const mandaAlInforme = /Algo va mal/.test(aviso.texto || '');
    const delEditor = (texto) => (mandaAlInforme ? avisarConSalida(texto) : vscode.window.showWarningMessage(texto));
    return aviso.malo ? delEditor(aviso.texto) : vscode.window.showInformationMessage(aviso.texto);
  }

  async ponerHorario(nombre) {
    if (this.eligiendoHorario) return;
    this.eligiendoHorario = true;
    const raiz = proyecto.raiz();
    const quien = asistentes.elDeAhora().id;
    try {
      // Solo las que se pueden cambiar desde aquí: una compartida se cambia allí.
      const disponibles = recordatorios.disponibles().filter((b) => recordatorios.puedeCambiar(b));
      let boton;
      if (nombre) boton = disponibles.find((b) => b.nombre === nombre);
      else {
        if (!disponibles.length) return this.pedir(rutinas.CREAR_RECORDATORIO);
        // Y si no es ninguna de las que hay, se le pide al asistente.
        const opciones = [...disponibles.map((b) => ({ label: b.etiqueta,
          description: b.cuando ? cuando.enPalabras(b.cuando) || 'Hay que revisar el horario' : 'Sin recordatorio', boton: b })),
        { label: 'Crear un recordatorio nuevo', description: 'Se lo pido al asistente', crear: true }];
        const elegida = await vscode.window.showQuickPick(opciones, {
          title: 'Poner un recordatorio', placeHolder: '¿Qué habilidad quieres que te recuerde?',
        });
        if (!elegida) return;
        if (elegida.crear) return this.pedir(rutinas.CREAR_RECORDATORIO);
        boton = elegida.boton;
      }
      if (!boton) return this.avisarDeLosRecordatorios({ texto: 'Esa habilidad ya no está en esta carpeta.', malo: true });
      const cron = await rutinas.elegirHorario(boton.etiqueta, boton.cuando || '');
      // Mientras elegía ha podido cambiar de carpeta o de asistente: entonces no
      // se escribe nada, que ese botón ya no es de lo que tiene delante.
      if (!cron || proyecto.raiz() !== raiz || asistentes.elDeAhora().id !== quien) return;
      const hecho = recordatorios.ponerCuando(boton.nombre, cron);
      if (!hecho.ok) return this.avisarDeLosRecordatorios({ texto: 'No he podido cambiar ese horario. Pídele al asistente que revise esa habilidad.', malo: true });
      // Contar desde ahora, incluso al volver a poner la misma hora. Un aviso
      // anterior no puede reaparecer después de haberlo quitado y vuelto a poner.
      await this.marcarHecho(boton.nombre);
      await this.almacen().update(CLAVE_RECORDATORIOS_VISTOS, { ...(this.almacen().get(CLAVE_RECORDATORIOS_VISTOS) || {}), [boton.nombre]: cron });
      const puestas = { ...(this.almacen().get(CLAVE_COSTUMBRES) || {}) };
      if (puestas[boton.nombre]) {
        puestas[boton.nombre] = { ...puestas[boton.nombre], porDecir: false };
        await this.almacen().update(CLAVE_COSTUMBRES, puestas);
      }
      return this.avisarDeLosRecordatorios({ texto: `Te recordaré «${hecho.boton.etiqueta}» ${hecho.enPalabras}.` });
    } finally {
      this.eligiendoHorario = false;
    }
  }

  // «Que se haga sola»: se elige la habilidad, y se prepara el encargo para el
  // gestor del asistente, donde de verdad puede ir (`rutinas.queSeHagaSola`).
  async queSeHagaSola() {
    const raiz = proyecto.raiz();
    const quien = asistentes.elDeAhora().id;
    const disponibles = recordatorios.disponibles().filter((b) => recordatorios.dentroDeLaCarpeta(b.fichero));
    if (!disponibles.length) return undefined;
    // Con alguna conexión en la carpeta, la nube de Claude no: ante la duda, escritorio.
    const conConexiones = recordatorios.tieneConexiones();
    const dondeIria = rutinas.dondeSeHaceSola(quien, conConexiones).descripcion;
    const opciones = disponibles.map((b) => ({ label: b.etiqueta, description: dondeIria, boton: b }));
    const elegida = await vscode.window.showQuickPick(opciones, { title: 'Que se haga sola', placeHolder: '¿Qué habilidad?' });
    if (!elegida || proyecto.raiz() !== raiz || asistentes.elDeAhora().id !== quien) return undefined;
    const { boton } = elegida;
    return this.pedir(rutinas.queSeHagaSola({
      quien, etiqueta: boton.etiqueta, invocacion: boton.prompt, enPalabras: boton.cuando ? cuando.enPalabras(boton.cuando) : null, conConexiones,
    }));
  }

  actualizarRecordatorios() {
    return this.donde && this.donde.tipo === 'recordatorios' ? this.verRecordatorios(this.donde.aviso) : this.refrescar(true);
  }

  // Los que tocan, del más antiguo al más nuevo. La principal enseña uno; el
  // aviso del editor sale para cada uno, una vez.
  async losRecordatoriosQueTocan() {
    try {
      const hechos = { ...(this.almacen().get(CLAVE_RECORDATORIOS) || {}) };
      const vistos = { ...(this.almacen().get(CLAVE_RECORDATORIOS_VISTOS) || {}) };
      const { tocan, nuevos } = recordatorios.losQueTocan(hechos, vistos);
      if (nuevos.length) {
        for (const { nombre, cuando: cron } of nuevos) {
          hechos[nombre] = Date.now();
          vistos[nombre] = cron;
        }
        await this.almacen().update(CLAVE_RECORDATORIOS, hechos);
        await this.almacen().update(CLAVE_RECORDATORIOS_VISTOS, vistos);
      }
      return tocan.map((t) => ({ nombre: t.nombre, etiqueta: t.etiqueta, enPalabras: t.enPalabras, ultima: t.ultima }));
    } catch (error) {
      this.salida.appendLine(`[recordatorios] ${error.message}`); // diccionario: interno
      return [];
    }
  }

  async elRecordatorioQueToca() {
    return (await this.losRecordatoriosQueTocan())[0] || null;
  }

  // Si un botón se pulsa con costumbre, se le propone su recordatorio: cuándo se
  // hace algo es cómo trabaja él, y la barra no lo decide (decisión 187; la 144 lo
  // ponía sola). Una costumbre que dijo que no hacía falta no vuelve a proponerse.
  // Las que una barra de antes ya puso se dicen una vez, como entonces.
  async ponerLasCostumbres() {
    try {
      const puestas = { ...(this.almacen().get(CLAVE_COSTUMBRES) || {}) };
      for (const c of recordatorios.costumbres(this.almacen().get(CLAVE_USOS) || [])) {
        if (puestas[c.nombre]) continue;
        puestas[c.nombre] = { cron: c.cron, etiqueta: c.etiqueta, enPalabras: c.enPalabras, porDecir: true, propuesta: true };
        this.salida.appendLine(`[recordatorios] costumbre propuesta: ${c.nombre} (${c.cron})`); // diccionario: interno
      }
      await this.almacen().update(CLAVE_COSTUMBRES, puestas);
      const [nombre, dicha] = Object.entries(puestas).find(([, p]) => p.porDecir) || [];
      return nombre ? { nombre, etiqueta: dicha.etiqueta, enPalabras: dicha.enPalabras, propuesta: dicha.propuesta === true } : null;
    } catch (error) {
      this.salida.appendLine(`[recordatorios] ${error.message}`); // diccionario: interno
      return null;
    }
  }

  async marcarHecho(nombre) {
    await this.almacen().update(CLAVE_RECORDATORIOS, { ...(this.almacen().get(CLAVE_RECORDATORIOS) || {}), [nombre]: Date.now() });
  }

  async hacerElRecordatorio(nombre) {
    const uno = recordatorios.losQueHay().find((r) => r.nombre === nombre);
    await this.marcarHecho(nombre);
    if (!uno) return this.actualizarRecordatorios();
    await this.pedir(await this.elEncargoDe(uno));
    return this.actualizarRecordatorios();
  }

  // El de «Seguir donde lo dejé», con por dónde ibas si se sabe: es lo que dice
  // su tarjeta (revisión de la PR #55, decisión 160).
  async elEncargoDe(uno) {
    if (uno.nombre !== 'seguir') return uno.prompt;
    try {
      const { ibasPor } = await brujula.estado();
      return (ibasPor && ibasPor.accion && ibasPor.accion.prompt) || uno.prompt;
    } catch (error) {
      this.salida.appendLine(`[la última vez] ${error.stack || error.message}`); // diccionario: interno
      return uno.prompt;
    }
  }

  async dejarElRecordatorio(nombre) {
    await this.marcarHecho(nombre);
    return this.actualizarRecordatorios();
  }

  async quitarRecordatorio(nombre) {
    const hecho = recordatorios.ponerCuando(nombre, null);
    if (!hecho.ok) return this.avisarAqui({ texto: 'No he podido quitar ese recordatorio. Pídele al asistente que revise esa habilidad.', malo: true });
    // Lo que se quita no vuelve por costumbre, venga de donde venga; y si se
    // vuelve a poner, empieza a contar desde entonces.
    const puestas = { ...(this.almacen().get(CLAVE_COSTUMBRES) || {}) };
    puestas[nombre] = { ...(puestas[nombre] || {}), quitado: true, porDecir: false };
    await this.almacen().update(CLAVE_COSTUMBRES, puestas);
    const vistos = { ...(this.almacen().get(CLAVE_RECORDATORIOS_VISTOS) || {}) };
    delete vistos[nombre];
    await this.almacen().update(CLAVE_RECORDATORIOS_VISTOS, vistos);
    if (this.donde && this.donde.tipo === 'recordatorios') return this.verRecordatorios({ texto: `Ya no te recordaré «${hecho.boton.etiqueta}».` });
    await this.refrescar(true);
    return this.enviar({ tipo: 'aviso', texto: hecho.ok ? `Ya no te recordaré «${hecho.boton.etiqueta}».` : 'No he podido quitar ese recordatorio. Pulsa «Algo va mal» y pásale el código a tu tutor.', malo: !hecho.ok });
  }

  // «Sí, recuérdamelo» (decisión 187): ahora sí se pone su recordatorio, y empieza a
  // contar desde ahora, porque hoy ya lo ha hecho él.
  async aceptarLaCostumbre(nombre) {
    const puestas = { ...(this.almacen().get(CLAVE_COSTUMBRES) || {}) };
    const c = puestas[nombre];
    if (!c || !c.propuesta) return this.refrescar(true);
    const hecho = recordatorios.ponerCuando(nombre, c.cron);
    if (!hecho.ok) return this.enviar({ tipo: 'aviso', texto: 'No he podido ponerte ese recordatorio. Pulsa «Algo va mal» y pásale el código a tu tutor.', malo: true });
    puestas[nombre] = { ...c, porDecir: false, propuesta: false };
    await this.almacen().update(CLAVE_COSTUMBRES, puestas);
    await this.almacen().update(CLAVE_RECORDATORIOS, { ...(this.almacen().get(CLAVE_RECORDATORIOS) || {}), [nombre]: Date.now() });
    this.salida.appendLine(`[recordatorios] puesto con su sí: ${nombre} (${c.cron})`); // diccionario: interno
    await this.refrescar(true);
    return this.enviar({ tipo: 'aviso', texto: `Hecho. Te recordaré «${c.etiqueta}» ${c.enPalabras}.` });
  }

  // «No hace falta» a una propuesta: no se ha puesto nada, y no vuelve.
  async rechazarLaCostumbre(nombre) {
    const puestas = { ...(this.almacen().get(CLAVE_COSTUMBRES) || {}) };
    puestas[nombre] = { ...(puestas[nombre] || {}), quitado: true, porDecir: false, propuesta: false };
    await this.almacen().update(CLAVE_COSTUMBRES, puestas);
    return this.refrescar(true);
  }

  async dejarDeDecirLaCostumbre(nombre, quitarla) {
    const puestas = { ...(this.almacen().get(CLAVE_COSTUMBRES) || {}) };
    if (puestas[nombre]) puestas[nombre] = { ...puestas[nombre], porDecir: false };
    await this.almacen().update(CLAVE_COSTUMBRES, puestas);
    if (quitarla) return this.quitarRecordatorio(nombre);
    return this.refrescar(true);
  }

  // Cada minuto, desde `activate`: si ha llegado la hora de uno, se dice una vez
  // aunque la barra esté cerrada, y la principal lo enseña con su botón.
  async mirarLosRecordatorios() {
    // Los pedidos del asistente, por si el vigía no los vio (decisión 150).
    await this.atenderLosPedidos().catch((error) => this.salida.appendLine(`[pedidos] ${error.message}`)); // diccionario: interno
    await this.mirarLasCaducidades().catch((error) => this.salida.appendLine(`[caducidades] ${error.message}`)); // diccionario: interno
    const avisados = { ...(this.almacen().get(CLAVE_AVISADOS) || {}) };
    const sinAvisar = (await this.losRecordatoriosQueTocan()).filter((t) => avisados[t.nombre] !== t.ultima);
    if (!sinAvisar.length) return;
    for (const t of sinAvisar) avisados[t.nombre] = t.ultima;
    await this.almacen().update(CLAVE_AVISADOS, avisados);
    if (!this.donde || this.donde.tipo === 'principal') await this.refrescar(true);
    else if (this.donde.tipo === 'recordatorios') await this.verRecordatorios(this.donde.aviso);
    // Sin esperar a uno para enseñar el siguiente: cada aviso, con su botón.
    await Promise.all(sinAvisar.map(async (t) => {
      const quiere = await vscode.window.showInformationMessage(`Toca: ${t.etiqueta}.`, 'Hacerlo ahora');
      if (quiere === 'Hacerlo ahora') await this.hacerElRecordatorio(t.nombre);
    }));
  }

  // Se guardan las últimas peticiones para poder ver cuál se repite y ofrecer
  // dejarla como botón. Solo el texto que el alumno ya ha mandado, aquí, en su
  // ordenador: ni se envía ni se versiona.
  async anotarLaPeticion(prompt) {
    if (!prompt || prompt.startsWith('/')) return; // un botón ya es un botón
    const antes = this.almacen().get(CLAVE_PETICIONES) || [];
    await this.almacen().update(CLAVE_PETICIONES, [...antes, prompt].slice(-20));
  }

  // ------------------------------------------------------- conexiones

  // Las conexiones MCP de los asistentes de esta carpeta (decisión 175): nombre,
  // asistente, de dónde sale y qué tipo es, nunca un valor. Solo se lee.
  lasDeMcp(proveedores) {
    try {
      let quienes = asistentes.losDelArnes().map((a) => a.id);
      if (!quienes.length) quienes = [asistentes.conQuien().id];
      const visto = mcp.leer({ raiz: proyecto.raiz(), asistentes: quienes });
      const servidores = mcp.conLaConfianza(mcp.conLasConocidas(visto.servidores, proveedores), vscode.workspace.isTrusted !== false);
      return { servidores, noLeidos: visto.noSeEntendio };
    } catch (error) {
      this.salida.appendLine(`[mcp] ${error.message}`); // diccionario: interno
      return { servidores: [], noLeidos: [] };
    }
  }

  verConexiones() {
    this.donde = { tipo: 'conexiones' };
    const lista = conexiones.proveedores();
    const deMcp = this.lasDeMcp(lista);
    this.enviar({
      tipo: 'conexiones',
      mcp: deMcp.servidores,
      mcpNoLeido: deMcp.noLeidos,
      // Cada una, con cómo fue su última prueba, si sus claves no han cambiado.
      proveedores: lista.map((p) => ({ ...p, prueba: this.laUltimaPrueba(p.id), caduca: this.loQueCaduca(p.id) })),
      // Si el arnés se montó sobre un proyecto que ya existía, puede haber
      // claves guardadas donde estuvieran. Aquí no se leen: se avisa.
      sueltas: sueltas.resumen(),
      // Las de una aplicación están en su sitio, pero si ya se guardaron en git
      // viajan con cada copia: eso se dice aparte (decisión 135).
      enLasCopias: sueltas.deLasAppsEnLasCopias(),
    });
  }

  // «Conectar algo nuevo» (decisión 167): qué programa, en el propio editor, con
  // lo que ya se ve en sus claves y en su perfil, y «Otro» para escribirlo. Sin
  // nada que ofrecer, directamente la caja. Si cancela, no se pide nada.
  async conectarAlgoNuevo() {
    const raiz = proyecto.raiz();
    let candidatos = [];
    try {
      candidatos = conectar.queSePuedeConectar({ catalogo: consejos.capacidades(this.contexto.extensionPath) });
    } catch (error) {
      this.salida.appendLine(`[conectar] ${error.message}`); // diccionario: interno
    }
    let nombre = null;
    if (candidatos.length) {
      const DE_DONDE = { claves: 'Sus claves ya están en esta carpeta', perfil: 'Sale en tu perfil' };
      const elegida = await vscode.window.showQuickPick([
        ...candidatos.map((c) => ({ label: c.nombre, description: DE_DONDE[c.deDonde], nombre: c.nombre })),
        { label: 'Otro', description: 'Lo escribes tú', otro: true },
      ], { title: 'Conectar algo nuevo', placeHolder: '¿Qué programa quieres conectar?' });
      if (!elegida || proyecto.raiz() !== raiz) return undefined;
      if (!elegida.otro) nombre = elegida.nombre;
    }
    if (!nombre) {
      const escrito = await vscode.window.showInputBox({ title: 'Conectar algo nuevo', prompt: '¿Qué programa quieres conectar?', placeHolder: 'Tu programa de facturas, tu correo, tu tienda online…' });
      if (proyecto.raiz() !== raiz) return undefined;
      nombre = escrito;
    }
    // Limpio, o null si no queda nada: lo escrito entra en el encargo (`conectar.encargo`).
    const pedido = conectar.encargo(nombre);
    return pedido ? this.pedir(pedido) : undefined;
  }

  verConexion(proveedor, aviso = null) {
    // Lo que escribió el asistente (los pasos, de dónde se saca cada clave y el
    // nombre), tapado como en el PDF: con ello arma el panel lo que «No lo
    // encuentro» le pasa al asistente.
    const datos = informatico.conexionALaVista(conexiones.claves(proveedor));
    if (!datos) return this.verConexiones();
    // Un aviso con `seQueda` sobrevive al repintado del vigía: el de la guía en PDF
    // se escribe en `01-TOOLS/`, y sin esto se borraba al momento (decisión 159).
    this.donde = { tipo: 'conexion', proveedor, ...(aviso && aviso.seQueda ? { aviso } : {}) };
    // Conecta con una clave que puede escribir y no ha dicho qué hace: la pregunta
    // sigue aquí, también si se fue mientras se probaba (revisión del punto 7).
    // Y por delante del aviso que se queda, que es solo decir algo (revisión de corrección de la 159).
    const ultima = this.laUltimaPrueba(proveedor);
    if ((!aviso || aviso.seQueda) && ultima && ultima.puedeEscribir) {
      aviso = this.loQueDijoLaPrueba(proveedor, { ok: true, puedeEscribir: true, mensaje: ultima.mensaje, huella: conexiones.huella(proveedor) });
    }
    // La última prueba dijo que esta clave no vale (decisión 167): la guía sigue,
    // y si no se ha movido por ella desde entonces, en el paso donde se saca.
    const noVale = Boolean(ultima && ultima.noVale);
    const desordenadas = sueltas.resumen();
    const guia = (this.guias || {})[proveedor] || (noVale ? { paso: datos.proveedor.pasoDeLaClave } : {});
    return this.enviar({
      tipo: 'conexion',
      ...datos,
      noVale,
      // Cuándo caduca: se pregunta con las claves puestas, una vez por clave, y no
      // mientras haya otra pregunta en pantalla (decisión 149). Y si trae prueba,
      // solo después de una buena: de una clave que no vale no se pregunta (decisión 167).
      caduca: this.queDecirDeCuandoCaduca(proveedor, datos, aviso, ultima),
      // Por qué paso de la guía va, o si quiere verlos todos (decisión 146).
      paso: Math.min(Math.max(Number(guia.paso) || 0, 0), Math.max(datos.proveedor.pasos.length - 1, 0)),
      todosLosPasos: Boolean(guia.todos),
      cositas: conexiones.scripts(proveedor),
      // Si alguna clave de esta conexión está en otro sitio, el botón que lo
      // arregla va aquí mismo, que es donde se ve el problema (decisión 104).
      ordenar: desordenadas ? desordenadas.prompt : null,
      // Sin pasos no hay guía en PDF: lo que se le pide al asistente para que la
      // prepare, armado aquí, que es quien tiene los datos (P6, decisión 159).
      prepararLaGuia: datos.proveedor.pasos.length ? null : guiaPdf.loQueSeLePide(datos.proveedor.etiqueta, proveedor),
      aviso,
    });
  }

  // ── La guía para sacar la clave, en PDF (decisión 159) ─────────────────
  //
  // Se escribe en Resultados (out) de esa conexión, sin pisar ninguna, se abre con
  // el programa de siempre y se dice en una frase (P9). Sin pasos, no se escribe
  // un PDF vacío: se ofrece pedírselos al asistente (P1).
  async guiaEnPdf(proveedor) {
    const hecho = guiaPdf.guardar(proveedor);
    if (hecho.motivo === 'noEsta') return this.verConexiones();
    if (hecho.motivo === 'sinPasos') {
      return this.verConexion(proveedor, {
        texto: 'Todavía no hay pasos escritos para hacer la guía.',
        malo: false,
        boton: { etiqueta: 'Que el asistente prepare la guía', accion: { tipo: 'pedir', prompt: hecho.prompt } },
      });
    }
    if (!hecho.ok) {
      this.salida.appendLine(`[guiaEnPdf] ${hecho.motivo}${hecho.detalle ? `: ${hecho.detalle}` : ''}`); // diccionario: interno
      return this.verConexion(proveedor, { texto: 'No he podido guardar la guía. Pulsa «Algo va mal» y pásale el código a tu tutor.', malo: true });
    }
    try {
      await papeles.abrirFichero(hecho.completa);
    } catch (error) {
      this.salida.appendLine(`[guiaEnPdf] no se abre: ${error.message}`); // diccionario: interno
      return this.verConexion(proveedor, {
        texto: `He guardado la guía, pero no he podido abrirla. La tienes en Resultados (out), dentro de Documentos: «${hecho.fichero}».`,
        malo: true,
        seQueda: true,
      });
    }
    return this.verConexion(proveedor, {
      texto: `Te he abierto la guía, y la tienes en Resultados (out), dentro de Documentos: «${hecho.fichero}».`,
      malo: false,
      seQueda: true,
    });
  }

  // Guardar, y si ya están todas, probarla sin que nadie lo pida (P9): lo
  // siguiente que haría el alumno es pulsar «Probar», y lo que necesita saber
  // es si funciona (decisión 146).
  async guardarClave(proveedor, clave, valor) {
    const { ok, mensaje } = conexiones.escribir(proveedor, clave, valor);
    if (!ok) return this.verConexion(proveedor, { texto: mensaje, malo: true });
    return this.yaEstaPuesto(proveedor, 'Guardada.', mensaje);
  }

  // Lo de después de poner algo, una clave o un fichero de acceso: si ya está
  // todo, se prueba sola; si no, se dice qué falta (decisiones 146 y 156).
  async yaEstaPuesto(proveedor, dicho, sinPrueba) {
    const datos = conexiones.claves(proveedor);
    const faltan = datos ? datos.claves.filter((c) => !c.puesta).length : 0;
    // Pide su fichero de acceso y todavía no está. No para la prueba: si trae una,
    // ella dirá si falta (revisión de corrección de la 156); si no, se dice aquí.
    const faltaElFichero = Boolean(datos) && datos.proveedor.pideFichero && !datos.proveedor.conFichero;
    if (faltan || !conexiones.tienePrueba(proveedor)) {
      const queFalta = faltan ? (faltan === 1 ? 'Falta 1 por poner.' : `Faltan ${faltan} por poner.`) : (faltaElFichero ? 'Falta su fichero de acceso.' : '');
      return this.verConexion(proveedor, { texto: queFalta ? `${dicho} ${queFalta}` : sinPrueba, malo: false });
    }
    this.enviar({ tipo: 'esperando', que: `${dicho} Probando la conexión…` });
    const prueba = await this.probarYApuntar(proveedor);
    // Si mientras tanto se fue a otra pantalla, no se le devuelve: lo que salió
    // ya está apuntado y la lista lo dice.
    const sigueAqui = this.donde && this.donde.tipo === 'conexion' && this.donde.proveedor === proveedor;
    if (!sigueAqui) return this.donde && this.donde.tipo === 'conexiones' ? this.verConexiones() : undefined;
    const aviso = this.loQueDijoLaPrueba(proveedor, prueba);
    return this.verConexion(proveedor, { ...aviso, texto: `${dicho} ${aviso.texto}` });
  }

  // El usuario y la contraseña, con un solo «Guardar» (decisión 156): si cada uno
  // llevara el suyo, se escribirían los dos y se pulsaría solo el de abajo, y el
  // de arriba se perdería al repintar. Se guardan todos y el último hace lo de
  // siempre: probarla si ya está todo.
  async guardarClaves(proveedor, valores) {
    const pares = Object.entries(valores && typeof valores === 'object' ? valores : {})
      .filter(([clave, valor]) => typeof clave === 'string' && typeof valor === 'string' && valor.trim())
      .slice(0, 10);
    if (!pares.length) return this.verConexion(proveedor);
    for (const [clave, valor] of pares.slice(0, -1)) {
      const { ok, mensaje } = conexiones.escribir(proveedor, clave, valor);
      if (!ok) return this.verConexion(proveedor, { texto: mensaje, malo: true });
    }
    const [clave, valor] = pares[pares.length - 1];
    return this.guardarClave(proveedor, clave, valor);
  }

  // Un fichero de acceso, soltado encima de la barra o elegido (decisión 156): a
  // su sitio, y si con eso ya está todo, se prueba sola, como una clave (P9).
  async ponerFicheroDeAcceso(proveedor, ficheros) {
    const hecho = await conexiones.ponerFicheroDeAcceso(proveedor, ficheros);
    if (!hecho.ok) return this.verConexion(proveedor, { texto: hecho.mensaje, malo: true, ...(hecho.boton ? { boton: hecho.boton } : {}) });
    return this.yaEstaPuesto(proveedor, hecho.mensaje, hecho.mensaje);
  }

  // Con el diálogo de siempre, para quien no arrastra: lo mismo que soltarlo.
  async elegirFicheroDeAcceso(proveedor) {
    const elegidos = await vscode.window.showOpenDialog({ canSelectMany: false, openLabel: 'Ponerlo en su sitio', title: 'Elige el fichero de acceso' });
    if (!elegidos || !elegidos.length) return this.verConexion(proveedor);
    const ficheros = [];
    for (const uri of elegidos) {
      try {
        // Antes de leerlo: uno de varios gigas no se sube entero a la memoria.
        if (fs.statSync(uri.fsPath).size > conexiones.CABE_UN_FICHERO_DE_ACCESO) {
          return this.verConexion(proveedor, { texto: 'Eso pesa demasiado para ser un fichero de acceso.', malo: true });
        }
        ficheros.push({ nombre: path.basename(uri.fsPath), datos: fs.readFileSync(uri.fsPath).toString('base64') });
      } catch { /* uno que no se lee no tumba los demás */ }
    }
    return this.ponerFicheroDeAcceso(proveedor, ficheros);
  }

  // ── «Pídeselo a tu informático» (decisión 156) ────────────────────────
  //
  // El mensaje se arma en `informatico.js` cada vez, del disco: los botones solo
  // dicen de qué conexión es, y el texto no viaja desde la pantalla. La barra no
  // manda nada: lo copia, o abre su correo con el mensaje puesto (P9).
  verParaElInformatico(proveedor, aviso = null) {
    const hecho = informatico.mensaje(proveedor);
    if (!hecho) return this.verConexiones();
    // Es para leer: el vigía no lo repinta debajo.
    this.donde = { tipo: 'quieto' };
    return this.enviar({ tipo: 'informatico', ...hecho, aviso });
  }

  async copiarParaElInformatico(proveedor) {
    const hecho = informatico.mensaje(proveedor);
    if (!hecho) return this.verConexiones();
    await vscode.env.clipboard.writeText(hecho.cuerpo);
    return this.verParaElInformatico(proveedor, { texto: 'Copiado. Pégalo donde se lo vayas a mandar.', malo: false });
  }

  async mandarAlInformatico(proveedor) {
    const hecho = informatico.mensaje(proveedor);
    if (!hecho) return this.verConexiones();
    let abierto = false;
    let alPortapapeles = false;
    try {
      // Dentro: codificar puede lanzar con un texto raro, y entonces se copia.
      const { enlace, alPortapapeles: copiado } = informatico.correo(hecho);
      alPortapapeles = copiado;
      if (alPortapapeles) await vscode.env.clipboard.writeText(hecho.cuerpo);
      // Como texto, no con `Uri.parse`: ver `informatico.correo`.
      abierto = await vscode.env.openExternal(enlace);
    } catch (error) {
      this.salida.appendLine(`[informatico] no se ha abierto el correo: ${error.message}`); // diccionario: interno
    }
    if (!abierto) {
      await vscode.env.clipboard.writeText(hecho.cuerpo);
      return this.verParaElInformatico(proveedor, { texto: 'No he podido abrir tu correo. Te lo he copiado: pégalo en un correo nuevo.', malo: true });
    }
    return this.verParaElInformatico(proveedor, {
      texto: alPortapapeles
        ? 'Es un texto largo: te lo he copiado para que llegue entero. Pégalo en el correo con Ctrl+V.'
        : 'Te he abierto el correo con el mensaje. Pon a quién va y mándalo tú.',
      malo: false,
    });
  }

  async probar(proveedor) {
    this.enviar({ tipo: 'esperando', que: 'Probando la conexión…' });
    const hecho = await this.probarYApuntar(proveedor);
    this.verConexion(proveedor, this.loQueDijoLaPrueba(proveedor, hecho));
  }

  // Lo que se dice de una prueba. Si conecta y la clave puede cambiar y borrar,
  // se pregunta una vez, con las dos salidas: lo decide su negocio (P9, «loDecide»).
  // Si ya eligió dejarla así, se dice sin preguntar, mientras sea esa clave.
  loQueDijoLaPrueba(proveedor, hecho) {
    if (hecho.noVale) {
      const una = this.cuandoCaduca(proveedor);
      if (una && una.hasta && Date.now() >= una.hasta) return { texto: `La clave no vale: caducó ${elDia(una.hasta)}. Saca una nueva donde te la dieron y pégala entera.`, malo: true };
    }
    if (!hecho.puedeEscribir) return { texto: hecho.mensaje, malo: !hecho.ok };
    if (this.laDejoAsi(proveedor)) return { texto: 'Conectado. Funciona. Esta clave puede cambiar y borrar, como elegiste.', malo: false };
    // Con el nombre tapado, como en su pantalla: va en lo que se le pide al asistente (decisión 167).
    const datos = informatico.conexionALaVista(conexiones.claves(proveedor));
    // Recortado: sale de la primera línea de su README, que puede escribir cualquiera.
    const nombre = String((datos && datos.proveedor && datos.proveedor.etiqueta) || proveedor).slice(0, 60);
    return {
      texto: `${hecho.mensaje} ¿La dejas así o la cambias por una de solo lectura?`,
      malo: false,
      botones: [
        // Con la huella de la clave que se probó: si cambia antes del clic, no vale.
        { etiqueta: 'Dejarla así', accion: { tipo: 'dejarLaClaveAsi', proveedor, huella: hecho.huella || conexiones.huella(proveedor) } },
        { etiqueta: 'Cambiarla por una de solo lectura', accion: { tipo: 'pedir', prompt: `La conexión con ${nombre} (01-TOOLS/${proveedor}/) funciona, pero su clave puede cambiar y borrar, y quiero una de solo lectura. Guíame paso a paso para sacarla en ${nombre}: mira su CREDENTIALS.md y la documentación oficial, y dime qué permisos marcar y cuáles no. Cuando la tenga, la pego en la barra, en esta conexión, y la barra la prueba.` } }, // diccionario: interno
      ],
    };
  }

  // ── Cuándo caduca la clave (decisión 149) ─────────────────────────────
  //
  // En la clase, Eric: las claves caducan, y cuando caduca una, la conexión deja de
  // funcionar sin avisar. La barra no puede saber la fecha, así que la pregunta una
  // vez, con opciones, al tener las claves puestas; avisa una semana antes con el
  // reloj de los recordatorios; y si la prueba dice que no vale, dice que puede
  // haber caducado, y la fecha si la sabe.
  cuandoCaduca(proveedor) {
    const una = (this.almacen().get(CLAVE_CADUCAN) || {})[proveedor];
    const huella = conexiones.huella(proveedor);
    return una && huella && una.huella === huella ? una : null;
  }

  queDecirDeCuandoCaduca(proveedor, datos, aviso, ultima = this.laUltimaPrueba(proveedor)) {
    // Y con su fichero de acceso, si lo pide: antes se preguntaba sin él (revisión de corrección de la 156).
    const puestas = (datos.claves.length ? datos.claves.every((c) => c.puesta) : Boolean(datos.proveedor.conFichero))
      && (!datos.proveedor.pideFichero || Boolean(datos.proveedor.conFichero));
    if (!puestas || datos.proveedor.aMedioHacer) return null;
    const una = this.cuandoCaduca(proveedor);
    if (!una) {
      // Con prueba, solo después de una buena (decisión 167). Con la clave mala
      // salían a la vez «La clave no vale» y cinco botones para decir cuándo
      // caduca esa misma clave. Sin prueba no hay otra forma de saberlo: como antes.
      if (conexiones.tienePrueba(proveedor) && (!ultima || ultima.noVale)) return null;
      return aviso && aviso.botones ? null : { pregunta: true, huella: conexiones.huella(proveedor) };
    }
    // También «No lo sé» se dice, para que tenga su «Cambiar» (revisión de la 149).
    const texto = una.hasta
      ? `${Date.now() < una.hasta ? 'Caduca' : 'Caducó'} ${elDia(una.hasta)}.${Date.now() < una.hasta ? ' Te aviso una semana antes.' : ''}`
      : (una.nunca ? 'No caduca.' : 'Sin fecha de caducidad.');
    return { texto };
  }

  async apuntarCuandoCaduca(proveedor, en, laVista) {
    const huella = conexiones.huella(proveedor);
    if (!huella) return this.verConexiones();
    const todas = { ...(this.almacen().get(CLAVE_CADUCAN) || {}) };
    if (en === 'otraVez') {
      delete todas[proveedor];
      await this.almacen().update(CLAVE_CADUCAN, todas);
      return this.verConexion(proveedor);
    }
    if (!['nunca', 'noSe', ...Object.keys(CADUCA_EN)].includes(String(en))) return this.verConexion(proveedor);
    // La clave cambió desde que se preguntó: la pregunta es de la nueva.
    if (laVista !== huella) return this.verConexion(proveedor);
    const hasta = CADUCA_EN[en] ? Date.now() + CADUCA_EN[en] * UN_DIA : null;
    todas[proveedor] = { huella, hasta, nunca: en === 'nunca' };
    await this.almacen().update(CLAVE_CADUCAN, todas);
    const texto = hasta
      ? `Apuntado: caduca ${elDia(hasta)}. Te aviso una semana antes.`
      : (en === 'nunca' ? 'Apuntado: no caduca.' : 'Apuntado. Si un día deja de funcionar, te diré que puede haber caducado.');
    return this.verConexion(proveedor, { texto, malo: false });
  }

  // Para la lista: solo si caduca en una semana o ya caducó.
  loQueCaduca(proveedor) {
    const una = this.cuandoCaduca(proveedor);
    if (!una || !una.hasta || Date.now() < una.hasta - 7 * UN_DIA) return null;
    return { texto: `${Date.now() < una.hasta ? 'caduca' : 'caducó'} ${elDia(una.hasta)}`, caducada: Date.now() >= una.hasta };
  }

  // Con el reloj de los recordatorios: una semana antes, una vez por fecha.
  async mirarLasCaducidades() {
    const todas = this.almacen().get(CLAVE_CADUCAN) || {};
    const avisadas = { ...(this.almacen().get(CLAVE_CADUCAN_AVISADAS) || {}) };
    const tocan = Object.keys(todas).filter((p) => avisadas[p] !== todas[p].hasta && this.loQueCaduca(p));
    if (!tocan.length) return;
    for (const p of tocan) avisadas[p] = todas[p].hasta;
    await this.almacen().update(CLAVE_CADUCAN_AVISADAS, avisadas);
    // Sin esperar a que lo cierre: los recordatorios de este minuto no esperan a nadie.
    for (const p of tocan) {
      // El nombre, tapado como en su pantalla (decisión 167).
      const datos = informatico.conexionALaVista(conexiones.claves(p));
      // Sale de la primera línea de su README: sin lo que el editor pintaría como enlace.
      const nombre = String((datos && datos.proveedor && datos.proveedor.etiqueta) || p).replace(/[[\]()<>`*_]/g, '').slice(0, 60);
      const texto = `La clave de ${nombre} ${this.loQueCaduca(p).texto}. Saca una nueva y pégala en su conexión.`;
      Promise.resolve(vscode.window.showWarningMessage(texto, 'Ver la conexión')).then(async (quiere) => {
        if (quiere !== 'Ver la conexión') return;
        await vscode.commands.executeCommand('executiveLab.panel.focus');
        this.verConexion(p);
      }).catch((error) => this.salida.appendLine(`[caducidades] ${error.message}`)); // diccionario: interno
    }
  }

  laDejoAsi(proveedor) {
    const huella = conexiones.huella(proveedor);
    return Boolean(huella) && (this.almacen().get(CLAVE_PUEDEN_ESCRIBIR) || {})[proveedor] === huella;
  }

  async dejarLaClaveAsi(proveedor, laProbada) {
    const huella = conexiones.huella(proveedor);
    if (!huella) return this.verConexiones();
    // La clave cambió entre la pregunta y el clic: esa no se ha probado.
    if (laProbada !== huella) return this.verConexion(proveedor, { texto: 'La clave ha cambiado desde la prueba. Pulsa «Probar la conexión» otra vez.', malo: false });
    await this.almacen().update(CLAVE_PUEDEN_ESCRIBIR, { ...(this.almacen().get(CLAVE_PUEDEN_ESCRIBIR) || {}), [proveedor]: huella });
    return this.verConexion(proveedor, { texto: 'Hecho. Mientras sea esta clave, no te lo vuelvo a preguntar.', malo: false });
  }

  async probarYApuntar(proveedor) {
    // La huella de las claves que se prueban, de antes: si cambian mientras la
    // prueba corre, lo que diga no es de las nuevas.
    const huella = conexiones.huella(proveedor);
    const hecho = await conexiones.probar(proveedor);
    // Lo pasajero —sin internet, no contesta— no dice nada de la conexión: no
    // se recuerda, y se queda lo que hubiera.
    if (hecho.pasajero) return hecho;
    const pruebas = { ...(this.almacen().get(CLAVE_PRUEBAS) || {}) };
    pruebas[proveedor] = { ok: hecho.ok, mensaje: hecho.mensaje, cuando: Date.now(), huella, ...(hecho.noVale ? { noVale: true } : {}), ...(hecho.puedeEscribir ? { puedeEscribir: true } : {}) };
    await this.almacen().update(CLAVE_PRUEBAS, pruebas);
    // No vale: la guía vuelve al paso donde se saca la clave (decisión 167). Se
    // olvida por qué paso iba, y `verConexion` la pone ahí.
    if (hecho.noVale && this.guias) delete this.guias[proveedor];
    // Conecta pasada la fecha apuntada: la fecha estaba mal. Se olvida, y se vuelve
    // a preguntar, en vez de dejar «caducó» en la lista de una que funciona.
    const caducaba = this.cuandoCaduca(proveedor);
    if (hecho.ok && caducaba && caducaba.hasta && Date.now() >= caducaba.hasta) {
      const todas = { ...(this.almacen().get(CLAVE_CADUCAN) || {}) };
      delete todas[proveedor];
      await this.almacen().update(CLAVE_CADUCAN, todas);
    }
    return { ...hecho, huella };
  }

  // La última prueba, si sus claves siguen como cuando se probó; si no, null.
  laUltimaPrueba(proveedor) {
    const una = (this.almacen().get(CLAVE_PRUEBAS) || {})[proveedor];
    if (!una || una.huella !== conexiones.huella(proveedor)) return null;
    return {
      ok: una.ok,
      mensaje: una.mensaje,
      // Por qué falló: solo «la clave no vale» cambia lo que se enseña (revisión de la 167).
      ...(una.noVale ? { noVale: true } : {}),
      cuando: copias.haceCuanto(new Date(una.cuando).toISOString()),
      // Conecta, pero la clave puede escribir y no ha dicho qué hace con ella.
      ...(una.puedeEscribir && !this.laDejoAsi(proveedor) ? { puedeEscribir: true } : {}),
    };
  }

  // La guía, de paso en paso. Se recuerda mientras dure la ventana.
  pasoDeLaGuia(proveedor, paso, todos = false) {
    this.guias = { ...(this.guias || {}), [proveedor]: { paso, todos } };
    return this.verConexion(proveedor);
  }

  // Modo mixto: lo que solo mira se ejecuta y se enseña; lo que pide datos o
  // toca algo se lo pedimos al asistente, que pregunta y pide permiso.
  //
  // Lo que se le pide sale del disco y no del mensaje del panel: el programa tiene
  // que estar en esa conexión, y su rótulo, que escribe quien hizo la carpeta, va
  // limpio (revisión de la 154 y la 155, `limpio.js`).
  async hacerCosita(proveedor, fichero, etiqueta, pideDatos) {
    if (pideDatos) {
      const suyo = conexiones.scripts(proveedor).find((c) => c.fichero === fichero);
      if (!suyo) return this.verConexion(proveedor, { texto: 'Ese programa ya no está en esta conexión.', malo: true });
      await this.pedir(`Quiero «${unRotulo(suyo.etiqueta)}». Usa 01-TOOLS/${unRotulo(proveedor, 80)}/${unRotulo(suyo.fichero, 80)} y pregúntame los datos que te falten.`);
      return;
    }

    this.enviar({ tipo: 'esperando', que: `${etiqueta}…` });
    const hecho = await conexiones.ejecutar(proveedor, fichero);
    if (!hecho.ok) return this.verConexion(proveedor, { texto: hecho.mensaje, malo: true, ...(hecho.boton ? { boton: hecho.boton } : {}) });
    if (!hecho.texto) return this.verConexion(proveedor, { texto: hecho.mensaje, malo: false });
    this.donde = { tipo: 'quieto' };
    return this.enviar({ tipo: 'resultado', titulo: hecho.titulo, texto: hecho.texto, proveedor });
  }

  // ---------------------------------------------------------- cerebro

  verCerebro(aviso = null) {
    this.donde = { tipo: 'cerebro' };
    this.enviar({
      tipo: 'cerebro',
      temas: cerebro.catalogo(),
      // Ocho a la vista, y cuántos son de verdad: decía «Hay 8» habiendo 402 (decisión 195).
      ...((todos) => ({ sinOrdenar: todos.slice(0, 8), cuantosSinOrdenar: todos.length }))(cerebro.sinOrdenar()),
      esperando: cerebro.esperandoLectura(),
      yaLeidos: cerebro.yaLeidos(),
      hayPanel: cerebro.hayPanel(),
      aviso,
    });
  }

  verTema(tema) {
    const encontrado = cerebro.catalogo().find((t) => t.id === tema);
    if (!encontrado) return this.verCerebro();
    this.donde = { tipo: 'tema', tema };
    return this.enviar({ tipo: 'tema', tema: encontrado });
  }

  // Buscar es mirar, no conversar: lo resuelve la barra leyendo el disco, sin
  // abrir una conversación ni hacer esperar a nadie (docs/friccion.md §4).
  buscar(texto, donde = null) {
    // Mientras se busca no se repinta por detrás: el vigía borraría lo escrito
    // en la caja a media palabra.
    this.donde = { tipo: 'quieto' };
    return this.enviar({ tipo: 'resultados', ...buscador.buscar(texto, 15, donde) });
  }

  // Se lee dentro del panel: la vista previa de VS Code enseña el frontmatter
  // antes que el texto, y eso es justo lo que aquí no se enseña nunca.
  leerArticulo(ruta, tema, desde) {
    const leido = cerebro.leerArticulo(ruta);
    if (!leido.ok) return this.avisarAqui({ texto: leido.mensaje, malo: leido.malo !== false, ...(leido.boton ? { boton: leido.boton } : {}) });
    this.donde = { tipo: 'quieto' };

    // Con qué sigue y con qué venía, dentro del mismo tema: leer una cosa y
    // tener que volver dos pantallas para leer la siguiente es una tontería.
    let hermanos = null;
    if (tema) {
      const lista = cerebro.articulos(tema);
      const i = lista.findIndex((a) => a.ruta === ruta);
      if (i !== -1) {
        hermanos = {
          anterior: i > 0 ? lista[i - 1] : null,
          siguiente: i < lista.length - 1 ? lista[i + 1] : null,
        };
      }
    }

    return this.enviar({ tipo: 'articulo', ...leido, tema, desde, hermanos, ruta });
  }

  async abrirFuera(ruta) {
    const { ok, mensaje } = await cerebro.abrirFuera(ruta);
    if (!ok) this.enviar({ tipo: 'aviso', texto: mensaje, malo: true });
  }

  // Soltados encima de la barra. Llegan ya leídos por el panel, porque el
  // editor no le da la ruta de lo que se suelta — y hace bien.
  async soltarDocumentos(ficheros, para = 'documentos') {
    // Lo que el panel no puede leer (más de 40 MB, una carpeta) llega vacío. En
    // Documentos se dice ahí mismo; antes te sacaba a la principal sin decir nada
    // (revisión de corrección, 2).
    if (!ficheros || !ficheros.length) {
      if (para !== 'marca' && this.donde && this.donde.tipo === 'documentos') {
        return this.verDocumentos({ texto: 'No he podido leer lo que has soltado. Si es un archivo muy grande, dáselo con «Elegirlos».', malo: true });
      }
      return this.refrescar();
    }

    // Arrastrado encima de la pantalla de la marca, el material va a su
    // carpeta: es lo que el asistente mira para sacar los colores, y en la
    // bandeja de documentos se mezclaría con las facturas.
    if (para === 'marca') {
      const puesto = tema.guardarSoltado(ficheros);
      if (!puesto.ok) return this.verLaCara({ texto: puesto.mensaje, malo: true });
      // Lo que ha pasado de verdad con el encargo, como al darle documentos (decisión 166).
      return this.verLaCara(await this.pasarleYDecir(puesto.mensaje, tema.queLePedimos({ web: tema.comoEstamos().web, puestos: puesto.puestos })));
    }

    // Soltado encima de Documentos, se queda en Documentos: lo que acaba de
    // soltar sale ahí mismo, en «Sin leer todavía» (F7, decisión 151).
    const enDocumentos = Boolean(this.donde && this.donde.tipo === 'documentos');
    const { ok, cuantos, mensaje } = cerebro.guardarSoltados(ficheros);
    if (!ok) return enDocumentos ? this.verDocumentos({ texto: mensaje, malo: true }) : this.enviar({ tipo: 'aviso', texto: mensaje, malo: true });

    // Primero se le pasa, y después se dice lo que ha pasado de verdad (decisión 166).
    const dicho = await this.pasarleYDecir(mensaje, cerebro.queLePedimos(cuantos));
    if (enDocumentos) return this.verDocumentos(dicho);
    await this.refrescar(true);
    return this.enviar({ tipo: 'aviso', ...dicho });
  }

  // Desde Documentos se vuelve a Documentos; desde lo demás, a Conocimiento, como antes.
  async anadirDocumentos(desde = null) {
    const volver = (aviso = null) => (desde === 'documentos' ? this.verDocumentos(aviso) : this.verCerebro(aviso));
    const { ok, cuantos, mensaje } = await cerebro.anadirDocumentos();
    if (!ok) return volver({ texto: mensaje, malo: true });
    if (!cuantos) return volver();

    const dicho = await this.pasarleYDecir(mensaje, cerebro.queLePedimos(cuantos));
    brujula.olvidar();
    return volver(dicho);
  }

  // ── Documentos, en una pantalla (F7, decisión 151) ─────────────────────
  //
  // Lo que se le da, lo que tiene sin leer y los resultados, juntos. Se repinta
  // cuando el asistente lee o produce algo, con el aviso que tuviera.
  async verDocumentos(aviso = null) {
    this.donde = { tipo: 'documentos', aviso };
    const { sueltos, esperando } = papeles.sinLeerTodavia();
    this.enviar({
      tipo: 'documentos',
      esperando,
      sueltos,
      herramientas: salidas.loQueHaProducido(),
      fotos: foto.lasFotos(proyecto.ruta(...LAS_FOTOS), proyecto.raiz()),
      // El panel completo de RSC, junto a la foto, solo si está (arreglos sueltos de la tanda).
      hayPanel: cerebro.hayPanel(),
      aviso,
    });
  }

  // El panel completo se abre en el navegador. Si ya no está, o ahora es un
  // enlace, se repinta donde estaba, sin el botón: solo sale lo que se tiene.
  abrirPanelCompleto(desde) {
    if (cerebro.abrirPanel()) return undefined;
    return desde === 'documentos' ? this.verDocumentos() : this.verCerebro();
  }

  // ── La foto del cerebro (decisión 151, punto 11 de la 142) ──────────────
  //
  // Un punto por concepto y una línea por enlace, sin instalar Obsidian. Qué es
  // un concepto lo dice `cerebro`; el dibujo y dónde va cada punto, `foto`.
  verLaFoto(desde = 'documentos', aviso = null) {
    const de = desde === 'cerebro' ? 'cerebro' : 'documentos';
    this.donde = { tipo: 'foto', desde: de, aviso };
    const wiki = proyecto.ruta('02-DOCS', 'wiki');
    const dibujo = foto.laFoto(wiki, wiki ? cerebro.todosLosDocumentos() : []);
    this.enviar({
      tipo: 'foto',
      lado: dibujo.lado,
      total: dibujo.total,
      nodos: dibujo.nodos,
      enlaces: dibujo.enlaces,
      rotulos: dibujo.rotulos,
      entera: dibujo.entera,
      desde: de,
      aviso,
    });
  }

  // El panel la dibuja y la manda en PNG; aquí se guarda, sin pisar ninguna, y
  // se dice dónde ha quedado en una frase (P9), con un botón para abrirla.
  guardarLaFoto(png) {
    const desde = this.donde && this.donde.tipo === 'foto' ? this.donde.desde : 'documentos';
    const hecho = foto.guardar(proyecto.ruta(...LAS_FOTOS), png, { raiz: proyecto.raiz() });
    if (!hecho.ok) {
      this.salida.appendLine(`[guardarLaFoto] ${hecho.motivo}${hecho.detalle ? `: ${hecho.detalle}` : ''}`); // diccionario: interno
      return this.verLaFoto(desde, { texto: 'No he podido guardar la foto. Pulsa «Algo va mal» y pásale el código a tu tutor.', malo: true });
    }
    return this.verLaFoto(desde, {
      texto: `Guardada en Resultados (out), dentro de Documentos: «${hecho.fichero}».`,
      malo: false,
      boton: { etiqueta: 'Abrirla', accion: { tipo: 'abrirLaFoto', fichero: hecho.fichero } },
    });
  }

  async abrirLaFoto(fichero) {
    const completa = foto.donde(proyecto.ruta(...LAS_FOTOS), fichero, proyecto.raiz());
    if (!completa) return this.avisarAqui({ texto: 'Esa foto ya no está.', malo: true });
    return papeles.abrirFichero(completa);
  }

  async llevarteLaFoto(fichero) {
    const completa = foto.donde(proyecto.ruta(...LAS_FOTOS), fichero, proyecto.raiz());
    if (!completa) return this.avisarAqui({ texto: 'Esa foto ya no está.', malo: true });
    const hecho = await salidas.llevarte(completa);
    if (hecho.cancelado) return undefined;
    return this.avisarAqui({ texto: hecho.mensaje, malo: !hecho.ok });
  }

  // Un aviso, en la pantalla donde se está. En Documentos y en la foto, en la
  // suya: el aviso de siempre pinta la principal, pero `donde` seguía en la otra
  // y el vigía, al repintar, te devolvía allí y se comía el aviso (revisión de
  // corrección, 1). En las demás, como siempre.
  avisarAqui(aviso) {
    const d = this.donde || {};
    if (d.tipo === 'recordatorios') return this.verRecordatorios(aviso);
    if (d.tipo === 'documentos') return this.verDocumentos(aviso);
    if (d.tipo === 'foto') return this.verLaFoto(d.desde, aviso);
    return this.enviar({ tipo: 'aviso', ...aviso });
  }

  // ----------------------------------------------------------- copias

  async verCopias() {
    // Y la copia que guardó el arnés al montarse, si guardó algo suyo (decisión 152).
    this.enviar({ tipo: 'copias', copias: await copias.copias(8), delMontaje: ideas.laCopiaEnPantalla(ideas.laCopiaDelMontaje(proyecto.raiz())) });
  }

  // La pantalla de la copia de fuera. Enseña en qué punto está esto —si ha
  // entrado en su cuenta y a dónde va la copia— antes de ofrecer nada, porque
  // "guardar fuera" son tres cosas distintas y de ahí viene la confusión: una
  // cuenta, un sitio donde guardar, y el acto de subir.
  // "¿Hasta qué punto está montada esta carpeta?", pieza por pieza. Existe
  // porque la pantalla principal solo sabe decir si hay arnés o no, y quien no
  // ve conexiones no sabe si es que no hay o es que no se encuentran.
  // "¿Esto qué sabe hacer?" — de las primeras preguntas delante de algo nuevo,
  // y hasta ahora sin respuesta: el consejero ofrecía una capacidad cuando
  // encajaba y no había forma de ver el resto.
  // Llevarte un archivo: lo que el asistente ha producido, en el `out/` que RSC
  // define en cada herramienta.
  async verSalidas() {
    this.donde = { tipo: 'quieto' };
    this.enviar({ tipo: 'salidas', herramientas: salidas.loQueHaProducido(), fotos: foto.lasFotos(proyecto.ruta(...LAS_FOTOS), proyecto.raiz()) });
  }

  async abrirSalida(herramienta, fichero) {
    const { ok, mensaje } = await salidas.abrir(herramienta, fichero);
    if (!ok) this.avisarAqui({ texto: mensaje, malo: true });
  }

  async guardarSalida(herramienta, fichero) {
    const hecho = await salidas.guardarCopia(herramienta, fichero);
    if (hecho.cancelado) return;
    this.avisarAqui({ texto: hecho.mensaje, malo: !hecho.ok });
  }

  async verSaberes() {
    this.donde = { tipo: 'quieto' };
    const sabe = saberes.queSabe(this.contexto.extensionPath, this.corpus());
    this.enviar({
      tipo: 'saberes',
      sabe: sabe.sabe,
      puedeAprender: sabe.puedeAprender,
      // Lo que no pega con este arnés: va plegado, no se tira.
      lasDemas: sabe.lasDemas,
      deQueVa: sabe.deQueVa,
      suyas: sabe.suyas,
      otras: sabe.otras,
      // Las que el arnés monta para funcionar. Plegadas, pero se ven.
      deSerie: sabe.deSerie,
      // Los recordatorios se gestionan en su pantalla, con un solo nombre; desde
      // aquí se llega a ella si hay algo (revisión adversaria de la 155).
      hayRecordatorios: recordatorios.hayAlgo(),
      // Los comandos de antes, que son habilidades (decisión 141). Si ya hay una
      // habilidad con ese nombre, manda ella, como en Claude.
      // Y por el rótulo: el «resume-session» del arnés se llama «Seguir donde lo
      // dejé», igual que la habilidad `seguir`, y hacen lo mismo.
      comandos: (() => {
        const yaSon = new Set(rsc.habilidadesEnDisco());
        const rotulos = new Set([...sabe.suyas, ...sabe.sabe, ...sabe.otras, ...sabe.deSerie].map((h) => String(h.nombre || '').toLowerCase()));
        return acciones.todos().filter((c) => !yaSon.has(c.nombre) && !rotulos.has(String(c.etiqueta || '').toLowerCase()));
      })(),
      instaladas: sabe.instaladas,
      encajan: sabe.encajan,
    });
  }

  // El archivador: los papeles que han entrado, en sus tres montones. Antes de
  // los tres solo se veía un número — "tienes 3 sin leer" y ni forma de saber
  // cuáles son.
  async verPapeles(avisoLocal = null) {
    this.donde = { tipo: 'quieto' };
    this.enviar({ tipo: 'papeles', ...papeles.queHay(), aviso: avisoLocal });
  }

  // Se pregunta antes, y con el nombre del documento dentro de la pregunta: un
  // "¿seguro?" a secas no dice qué se va a borrar.
  async quitarPapel(ruta, nombre, desde = null) {
    const seguro = await vscode.window.showWarningMessage(
      `¿Quito "${nombre}"? Todavía no lo ha leído nadie, así que no se pierde nada aprendido.`,
      { modal: true },
      'Sí, quítalo',
    );
    if (seguro !== 'Sí, quítalo') return undefined;

    const { ok, mensaje } = papeles.quitar(ruta);
    // Desde Documentos se vuelve a Documentos (F7, decisión 151).
    if (desde === 'documentos') return this.verDocumentos({ texto: mensaje, malo: !ok });
    return this.verPapeles({ texto: mensaje, malo: !ok });
  }

  async abrirPapel(ruta) {
    const { ok, mensaje } = await papeles.abrir(ruta);
    if (!ok) this.avisarAqui({ texto: mensaje, malo: true });
  }

  // Todo lo que sirve cuando alguien se atasca, junto. "¿Y ahora qué hago?" es
  // la pregunta más frecuente que hay y no tenía botón en ningún sitio.
  async verAyuda() {
    this.donde = { tipo: 'quieto' };
    this.enviar({
      tipo: 'ayuda',
      github: await github.estado(),
      avisos: this.losAvisosQueEsperan(),
      // Qué barra es esta, y si hay otra: aquí sale aunque se apartara con «Ahora no».
      version: await this.laVersionParaEnsenar(),
      // El control remoto, si Claude está puesto: cuándo no puede funcionar (decisión 185).
      controlRemoto: loNuevoDeClaude.paraAyuda({ conClaude: this.conClaudePuesto() }),
    });
  }

  conClaudePuesto() {
    return asistentes.ASISTENTES.some((a) => a.id === 'claude' && asistentes.estaInstalado(a));
  }

  async laVersionParaEnsenar() {
    const laNueva = await version.laNuevaSiHay(this.contexto, this.versionDeLaBarra());
    return {
      esta: this.versionDeLaBarra(),
      nueva: laNueva ? laNueva.version : null,
      deprueba: Boolean(laNueva && laNueva.deprueba),
      puesta: this.versionPuesta || null,
      probarAntes: version.probarAntes(),
      sola: version.actualizarSola(),
    };
  }

  // «Barra 0.53.0», abajo en la principal: la versión, con Actualizar ahora y
  // Probar las versiones nuevas antes. Abría Más ayuda (decisión 166). Se repinta
  // si se pone sola una nueva mientras se mira.
  async verEstaBarra() {
    this.donde = { tipo: 'estaBarra' };
    this.enviar({ tipo: 'estaBarra', version: await this.laVersionParaEnsenar() });
  }

  // Después de cambiar un ajuste de la versión, a la pantalla de donde se vino.
  volverALaVersion() {
    return this.donde && this.donde.tipo === 'estaBarra' ? this.verEstaBarra() : this.verAyuda();
  }

  // ── Los datos de clientes (decisión 153) ──────────────────────────────
  //
  // Para leer, en Ayuda; y dicho a tiempo, una vez por carpeta. El texto sale de su
  // tabla (`clientes.js`).

  // La tabla, o null si no se puede leer. Se apunta: un fallo no se calla (P3).
  laTablaDeLosDatos() {
    try {
      return clientes.laTabla(this.contexto.extensionPath);
    } catch (error) {
      this.salida.appendLine(`[clientes] ${error.message}`); // diccionario: interno
      return null;
    }
  }

  // ── La última vez (decisión 160) ──────────────────────────────────────
  //
  // La primera vez de cada día, en una carpeta con algo hecho, por dónde iba. Lo
  // que sabe la brújula, que se acaba de calcular y está recordado: no cuesta otro
  // proceso. Si falla, la barra sigue igual, y queda apuntado.
  async laUltimaVezQueToca() {
    try {
      return await porDondeIbas.laDeHoy(this.almacen(), await brujula.estado());
    } catch (error) {
      this.salida.appendLine(`[la última vez] ${error.stack || error.message}`); // diccionario: interno
      return null;
    }
  }

  // Sus dos botones la quitan hasta el día siguiente al de la tarjeta, que viaja
  // con ellos. «Seguir donde lo dejé» lleva el encargo que armó la extensión (P6).
  async seguirDondeLoDeje(prompt, dia) {
    await porDondeIbas.hastaManana(this.almacen(), dia);
    await this.pedir(prompt);
    return this.refrescar(true);
  }

  // «Volver a la última conversación» (decisión 191). Abre la conversación que
  // apuntó el enganche de avisos con el enlace que documenta Claude Code. Si esa
  // conversación ya no existe, Claude Code abre una nueva: se dice así. El id se lee
  // aquí, al pulsar, y no viaja por la pantalla.
  async volverALaConversacion() {
    const quien = asistentes.elDeAhora();
    if (quien.id !== 'claude' || !asistentes.estaInstalado(quien)) return this.sinAsistente(quien);
    const ultima = ultimaConversacion.laUltima(proyecto.raiz());
    const enlace = ultima && ultimaConversacion.elEnlace(ultima.id, vscode.env.uriScheme);
    if (!enlace) return this.enviar({ tipo: 'aviso', texto: 'No sé cuál fue tu última conversación. Pulsa «Seguir donde lo dejé».' });
    let abierto = false;
    try {
      abierto = await vscode.env.openExternal(vscode.Uri.parse(enlace));
    } catch (error) {
      this.salida.appendLine(`[volver] ${error.message}`); // diccionario: interno
    }
    if (!abierto) return this.enviar({ tipo: 'aviso', texto: 'No he podido abrir esa conversación. Pulsa «Seguir donde lo dejé».', malo: true });
    return this.enviar({ tipo: 'aviso', texto: 'Te he abierto tu última conversación. Si ya no existe, se abre una nueva.' });
  }

  async ahoraNoLaUltimaVez(dia) {
    await porDondeIbas.hastaManana(this.almacen(), dia);
    return this.refrescar(true);
  }

  // La tarjeta: hasta que se lee o se pulsa «Entendido», y solo si ya entran datos
  // de verdad, por una conexión puesta o por los documentos que le ha dado.
  laTarjetaDeLosDatos() {
    try {
      if (this.almacen().get(clientes.CLAVE)) return null;
      const porDonde = clientes.porDondeEntran({
        conexiones: conexiones.proveedores().map((p) => ({ ...p, claves: (conexiones.claves(p.id) || {}).claves || [] })),
        documentos: cerebro.esperandoLectura() + cerebro.yaLeidos() + cerebro.originales(),
      });
      return porDonde ? clientes.laTarjeta(this.laTablaDeLosDatos(), porDonde) : null;
    } catch (error) {
      // Es un aviso de más: si falla, la barra sigue igual, y queda apuntado.
      this.salida.appendLine(`[clientes] ${error.stack || error.message}`); // diccionario: interno
      return null;
    }
  }

  async yaSeDijoLoDeLosDatos() {
    await this.almacen().update(clientes.CLAVE, Date.now());
  }

  // Leerlo cuenta como dicho si ya entran datos, venga de Ayuda o de la tarjeta.
  // Leído antes, desde Ayuda, la tarjeta sale igual cuando entren: lo que importa
  // es el momento, y semanas antes no se tiene delante (revisión de la 153).
  async verDatosDeClientes() {
    const tabla = this.laTablaDeLosDatos();
    if (!tabla) return this.enviar({ tipo: 'aviso', texto: 'No he podido abrirlo. Pulsa «Algo va mal» y pásale el código a tu tutor.', malo: true });
    this.donde = { tipo: 'quieto' };
    if (this.laTarjetaDeLosDatos()) await this.yaSeDijoLoDeLosDatos();
    const conClaude = this.conClaudePuesto();
    return this.enviar({ tipo: 'datosDeClientes', tabla: clientes.paraLeer(tabla, { conClaude }), soloLoPegado: conClaude && loNuevoDeClaude.soloLoPegado() });
  }

  // «Que Claude solo vea lo que le pegues» (decisión 185): un clic, en los ajustes de
  // usuario del editor. Vuelve a la misma pantalla, ya cambiada.
  async soloLoQueLePegues(cual) {
    try {
      await loNuevoDeClaude.ponerSoloLoPegado(this.contexto, cual === true);
    } catch (error) {
      this.salida.appendLine(`[editor] ${loNuevoDeClaude.CLAVE_VE_LO_ABIERTO}: ${error.message}`); // diccionario: interno
      return this.enviar({ tipo: 'aviso', texto: 'No he podido cambiarlo. Pulsa «Algo va mal» y pásale el código a tu tutor.', malo: true });
    }
    return this.verDatosDeClientes();
  }

  // ── Abrir una página (revisión de seguridad de la 153) ────────────────
  //
  // La dirección llega del panel, y alguna sale de la carpeta: la página de una
  // conexión viene de su CREDENTIALS.md, que puede haber escrito cualquiera. Así
  // que solo se abre lo que va por https; y lo que no es nuestro en GitHub ni una
  // de las páginas de Anthropic y OpenAI de la tabla de los datos de clientes, se
  // pregunta antes, con el sitio a la vista.
  async abrirUnaPagina(url) {
    let direccion = null;
    try {
      direccion = new URL(String(url));
    } catch {
      direccion = null;
    }
    if (!direccion || direccion.protocol !== 'https:' || !direccion.hostname) {
      this.salida.appendLine(`[abrir] no se abre, no va por https: ${String(url).slice(0, 200)}`); // diccionario: interno
      return this.enviar({ tipo: 'aviso', texto: 'No abro esa página: no es segura. Díselo a tu tutor.', malo: true });
    }
    if (!this.esUnaPaginaNuestra(direccion)) {
      const si = await vscode.window.showWarningMessage(`Voy a abrir ${direccion.hostname}. ¿Lo abro?`, { modal: true }, 'Abrirlo');
      if (si !== 'Abrirlo') return undefined;
    }
    return vscode.env.openExternal(vscode.Uri.parse(direccion.href));
  }

  // Nuestra en GitHub (el repositorio de la barra, `sitio.js`), o de Anthropic u
  // OpenAI, de las que da la tabla de los datos de clientes.
  esUnaPaginaNuestra(direccion) {
    if (Object.values(rutinas.DONDE).some((d) => d.guia === direccion.href)) return true;
    // Donde se crea la cuenta de GitHub (decisión 183): lo pide un botón de la barra.
    if (direccion.href === 'https://github.com/signup') return true;
    if (direccion.hostname === 'github.com') {
      return sitio.esNuestro(direccion.pathname.split('/').filter(Boolean).slice(0, 2).join('/'));
    }
    const tabla = this.laTablaDeLosDatos();
    const deLaTabla = (JSON.stringify(tabla || {}).match(/https:\/\/[^"\s]+/g) || [])
      .map((u) => { try { return new URL(u).hostname; } catch { return null; } });
    return deLaTabla.includes(direccion.hostname);
  }

  async entendidoLoDeLosDatos() {
    await this.yaSeDijoLoDeLosDatos();
    return this.refrescar(true);
  }

  // ── Resolver una incidencia ────────────────────────────────────────────
  //
  // Jose: *«debería haber un botón donde ponga resolver incidencias […] y
  // entonces el asistente audita todo»*. Lo que el alumno sabe decir es el
  // síntoma; el diagnóstico lo tiene la barra. Se mandan juntos, y el
  // asistente repasa la carpeta entera antes de contestar.
  //
  // Las opciones se dan hechas porque una caja de texto vacía delante de
  // alguien atascado es una pared (regla 5 del diccionario). «Otra cosa» abre
  // la caja, con ejemplos.
  async resolverIncidencia(cual) {
    const SINTOMAS = {
      conexiones: 'No encuentro mis conexiones, o falta alguna que yo sé que tengo.',
      clave: 'Una conexión dice que le faltan claves y yo creo que ya las tengo puestas.',
      noHace: 'Le pido cosas al asistente y no hace lo que espero.',
      montar: 'Algo no se ha montado bien en esta carpeta.',
      // Desde «Algo va mal», con todo sano (decisión 166).
      algoVaMal: 'He pulsado «Algo va mal» y la barra dice que está todo bien, pero algo no me va. Pregúntame qué estaba haciendo.',
    };

    let sintoma = SINTOMAS[cual];
    if (!sintoma) {
      sintoma = (await vscode.window.showInputBox({
        title: 'Resolver una incidencia',
        prompt: 'Cuéntame qué pasa, con tus palabras. Lo demás lo mira él.',
        placeHolder: 'Por ejemplo: "no sé dónde están las claves de mis herramientas"',
        ignoreFocusOut: true,
      }) || '').trim();
      if (!sintoma) return undefined;
    }

    this.enviar({ tipo: 'esperando', que: 'Mirando cómo está todo…' });
    const queVe = await this.loQueNoCuadra();
    // Y lo que acaba de revisar «Algo va mal»: el informe, que ya va sin claves y
    // está fuera de git, para que no lo repita a ciegas (decisión 166).
    if (cual === 'algoVaMal') queVe.push(...this.elInformeDeLaRevision());
    const encargo = encargos.resolverUnaIncidencia({ sintoma, queVe });
    return this.pedir(encargo.prompt);
  }

  // Dónde está el informe de la última revisión, si está dentro de la carpeta.
  elInformeDeLaRevision() {
    const { codigo } = this.ultimaIncidencia || {};
    const raiz = proyecto.raiz();
    const fichero = this.ultimoInforme;
    if (!codigo || !raiz || !fichero) return [];
    const dentro = path.relative(raiz, fichero);
    if (!dentro || dentro.startsWith('..') || path.isAbsolute(dentro) || !fs.existsSync(fichero)) return [];
    return [`El informe de la revisión de «Algo va mal» (código ${codigo}) está en ${dentro.split(path.sep).join('/')}: léelo antes de nada.`];
  }

  // Hechos leídos del disco para acompañar a la incidencia. Nada de
  // impresiones: lo que el asistente no puede ver de un vistazo y la barra sí.
  async loQueNoCuadra() {
    const visto = [];
    try {
      const revision = await terreno.radiografia({ sigueSinCopias: this.eligioSinCopias() });
      for (const pieza of revision.piezas || []) {
        if (pieza.estado === 'no' || pieza.estado === 'aMedias') visto.push(`${pieza.nombre}: ${pieza.detalle}`);
      }
      for (const p of conexiones.proveedores()) {
        if (p.aMedioHacer) visto.push(`La conexión ${p.etiqueta} está a medio preparar (sigue con la plantilla).`);
        else if (p.fueraDeSitio) visto.push(`${p.etiqueta} tiene ${p.fueraDeSitio === 1 ? 'una clave guardada' : `${p.fueraDeSitio} claves guardadas`} fuera de su carpeta.`);
        else if (p.faltan) visto.push(`A ${p.etiqueta} ${p.faltan === 1 ? 'le falta una clave' : `le faltan ${p.faltan} claves`}.`);
      }
      const desordenadas = sueltas.resumen();
      if (desordenadas) {
        if (desordenadas.claves) {
          visto.push(`Hay ${desordenadas.claves === 1 ? 'una clave' : `${desordenadas.claves} claves`} fuera de sitio en: ${sueltas.rutas(desordenadas.ficheros)}.`);
          for (const g of desordenadas.reparto) {
            visto.push(`  · ${g.claves.join(', ')} parecen de ${g.herramienta}${g.existe ? '' : ', que no tiene carpeta en 01-TOOLS'}.`);
          }
          if (desordenadas.sinDueno.length) visto.push(`  · Sin dueño claro: ${desordenadas.sinDueno.map((x) => x.nombre).join(', ')}.`);
        }
        // Y las credenciales que son un fichero entero, que van a otro sitio.
        for (const f of desordenadas.ficherosDeAcceso) {
          visto.push(`${sueltas.rutas([f.donde])} es ${f.queEs.toLowerCase()} y está fuera de su sitio${f.herramienta ? `; parece de ${f.herramienta}` : ', y no se sabe de quién'}.`);
        }
      }
      const enLasCopias = sueltas.deLasAppsEnLasCopias();
      if (enLasCopias) visto.push(`Hay claves de una aplicación guardadas en git, en su sitio pero dentro de cada copia: ${sueltas.rutas(enLasCopias.ficheros)}.`);
      for (const g of reglas.losGuardianes()) {
        if (g.estado === 'apagado') visto.push(`El freno "${g.nombre}" está apagado.`);
      }
    } catch (error) {
      this.salida.appendLine(`[incidencia] ${error.stack || error.message}`); // diccionario: interno
    }
    return visto;
  }

  // Las reglas que el asistente respeta siempre. Son tres sitios de RSC y no se
  // veía ninguno — y uno de ellos, la constitución, es de los dos ficheros que
  // el arnés marca como "léete esto antes de cada cosa que hagas".
  async verReglas(avisoLocal = null) {
    this.donde = { tipo: 'quieto' };
    this.enviar({ tipo: 'reglas', ...reglas.queHay(), ...(avisoLocal ? { aviso: avisoLocal } : {}) });
  }

  // Los interruptores de RSC, a un clic (decisión 172): la rama principal, el
  // trabajo aparte y compartir el conocimiento. El clic es el sí de la persona (P9);
  // lo que cambia lo cambia la orden oficial del arnés, por la misma vía que todo
  // lo que la barra le manda (`rsc.correr`: nombres que salen de la carpeta, carpeta
  // que va por delante, relevo), y después se mira el disco: se dice lo que ha pasado
  // de verdad, no lo que RSC contesta.
  async cambiarInterruptor(boton) {
    const decir = (texto, malo = false) => this.verReglas({ texto, malo });
    // `boton` solo elige de una tabla de la barra: la orden no viene del panel.
    const que = reglas.elBoton(boton);
    if (!que) return decir('Eso ya no se puede cambiar desde aquí. Pídeselo al asistente.', true);
    if (vscode.workspace.isTrusted === false) return decir('Esta carpeta no es de confianza en el editor, y la barra no cambia nada en ella. Si confías en ella, dale tu confianza y vuelve a pulsar.', true);
    if (!proyecto.raiz() || !proyecto.existe('.rsc.json')) return decir('Esta carpeta todavía no está preparada. Prepárala y vuelve a pulsar.', true);
    if (this.conElArnes()) return decir(OCUPADA, true);

    this.botonesDelArnes = (this.botonesDelArnes || 0) + 1;
    let hecho;
    try {
      this.enviar({ tipo: 'esperando', que: 'Cambiándolo…' });
      hecho = await rsc.correr(que.args, { tiempoMaximo: 120000 });
    } finally {
      this.botonesDelArnes -= 1;
    }
    const salida = String(hecho.error || hecho.salida || '').trim();
    this.salida.appendLine(`[interruptor] ${que.args.join(' ')}: ${hecho.codigo}${salida ? ` · ${salida}` : ''}`); // diccionario: interno
    if (hecho.porDelante) return decir(POR_DELANTE, true);
    if (hecho.codigo !== 0) {
      // Con lo que el arnés ha dicho, sin claves y sin pasarse de largo.
      const suya = conexiones.taparClaves(salida).split('\n').filter(Boolean).slice(-3).join(' · ').slice(0, 300);
      return decir(`No he podido cambiarlo.${suya ? ` El arnés dice: «${suya}».` : ''} Pulsa «Algo va mal» y pásale el código a tu tutor.`, true);
    }
    // El arnés dijo que sí: se mira en el disco que la carpeta haya quedado como toca.
    if (reglas.estadoDe(que.cual) !== que.llega) {
      return decir('El arnés dice que lo ha hecho, pero la carpeta sigue igual. Pulsa «Algo va mal» y pásale el código a tu tutor.', true);
    }
    return decir(`Hecho. ${reglas.INTERRUPTORES[que.cual].dice[que.llega]}`);
  }

  // ── Los raíles de esta carpeta, al día ─────────────────────────────────
  //
  // Los raíles los copia el wizard al montar, con los que llevara la barra
  // ese día. Cuando la barra sube de versión, las carpetas montadas antes se
  // quedan con las reglas viejas y **nada lo dice**: el asistente sigue
  // leyendo lo de la semana pasada (F13 de la auditoría, decisión 108).
  //
  // Esto no decide nada: repone lo que esta carpeta ya declaró tener, con la
  // versión de ahora. Los raíles son nuestros y se sobrescriben enteros, así
  // que es lo mismo que hace `repair` y va sin preguntar — pero se dice.
  async ponerLosRailesAlDia(callado = false) {
    if (!callado) this.enviar({ tipo: 'esperando', que: 'Poniendo al día lo que la barra deja escrito…' });
    // En una carpeta cuyo historial no creó la barra, lo que toca ficheros suyos
    // no se repone en silencio: se ofrece con su botón (C-4).
    const ajena = !(await terreno.podemosGuardarElPuntoDePartida());
    const ok = await arrancar.ponerLosRailes(this.contexto, { ajena });
    this.salida.appendLine(`[railes] al día: ${ok}${ajena ? ' (historial de alguien: lo suyo, pendiente)' : ''}`); // diccionario: interno
    await this.refrescar(true);
    if (!ok) {
      this.enviar({ tipo: 'aviso', texto: 'No he podido ponerlo al día. Pulsa «Algo va mal» y pásale el código a tu tutor.', malo: true });
    } else if (!callado) {
      this.enviar({ tipo: 'aviso', texto: 'Ya está al día. El asistente lee las reglas de ahora.' });
    }
    return ok;
  }

  // La revisión que escribió el asistente. Es una página entera, así que se
  // abre fuera, como el panel de conocimiento: dentro del editor se vería el
  // código de la página, que no es lo que nadie quiere ver.
  async abrirRevision(fichero) {
    const donde = terreno.dondeViveLaRevision(fichero);
    if (!donde) return this.enviar({ tipo: 'aviso', texto: 'Esa revisión ya no está.', malo: true });
    await vscode.env.openExternal(vscode.Uri.file(donde));
    return undefined;
  }

  async abrirReglas(cual) {
    const donde = reglas.dondeVive(cual);
    if (!donde) return this.enviar({ tipo: 'aviso', texto: 'Eso todavía no está escrito.', malo: true });

    const uri = vscode.Uri.file(donde);
    try {
      await vscode.commands.executeCommand('markdown.showPreviewToSide', uri);
    } catch {
      await vscode.window.showTextDocument(uri, { viewColumn: vscode.ViewColumn.Beside, preview: true });
    }
    return undefined;
  }

  // Todos los comandos, no solo los que llevan botón.
  async verComandos() {
    this.donde = { tipo: 'quieto' };
    this.enviar({ tipo: 'comandos', comandos: acciones.todos(), puedeTenerBotones: donde.puedeTenerComandos() });
  }

  // Qué le vendría bien a esto: lo que ve la barra leyendo el disco, y un botón
  // para lo que solo puede ver el asistente.
  async verSugerencias() {
    this.donde = { tipo: 'quieto' };
    let ahora = [];
    try {
      ahora = consejos.consejos(await this.queVeoYo());
      // Y las ideas de lo que hay aquí, todas (decisión 152), sin repetir ninguna.
      const visto = ideas.queSeVe({
        carpetaDeLaExtension: this.contexto.extensionPath,
        corpus: this.corpus(),
        silenciados: this.almacen().get(CLAVE_SILENCIADOS) || {},
      });
      ahora = [...ahora, ...visto.ideas.filter((idea) => !ahora.some((c) => c.id === idea.id))];
      // Y lo que se dejó para más tarde al montar, las copias y GitHub, con su
      // botón, mientras siga sin hacerse (decisión 164).
      const conCopias = proyecto.existe('.git');
      ahora = [...ahora, ...ideas.loAplazado({
        conArnes: proyecto.arnesCompleto(),
        conCopias,
        sigueSinCopias: this.eligioSinCopias(),
        subeAAlgunSitio: conCopias && Boolean(await github.remoto()),
      })];
    } catch (error) {
      this.salida.appendLine(`[sugerencias] ${error.stack || error.message}`);
    }
    this.enviar({
      tipo: 'sugerencias',
      ahora,
      hayAgentes: agentes.hayAlguno(),
      hayProyectos: proyectos.hayAlgo(),
    });
  }

  // Los ayudantes. No salen en la pantalla principal hasta que hay uno.
  async verAgentes() {
    this.donde = { tipo: 'quieto' };
    this.enviar({ tipo: 'agentes', agentes: agentes.queHay() });
  }

  async verAgente(fichero) {
    const donde2 = agentes.dondeVive(fichero);
    if (!donde2) return this.enviar({ tipo: 'aviso', texto: 'Ese ayudante ya no está.', malo: true });
    return papeles.abrirFichero(donde2);
  }

  // Lo que se acordó construir. Solo existe donde se construya algo con SDD.
  async verProyectos() {
    this.donde = { tipo: 'quieto' };
    this.enviar({ tipo: 'proyectos', montones: proyectos.queHay(), deLosProyectos: proyectos.deLosProyectos() });
  }

  async verProyecto(fichero) {
    const donde = proyectos.dondeVive(fichero);
    if (!donde) return this.enviar({ tipo: 'aviso', texto: 'Eso ya no está.', malo: true });
    return papeles.abrirFichero(donde);
  }

  // ------------------------------------------------ la cara de la empresa
  //
  // El diseño lo hace el asistente. Esto solo recoge el material y se lo pasa:
  // la web, el logotipo, su manual de marca, o palabras.
  async verLaCara(avisoLocal = null) {
    this.donde = { tipo: 'quieto' };
    this.enviar({ tipo: 'laCara', ...tema.comoEstamos(), aviso: avisoLocal });
  }

  async materialDeMarca() {
    const hecho = await tema.elegirMaterial();
    if (hecho.cancelado) return this.verLaCara();
    if (!hecho.ok) return this.verLaCara({ texto: hecho.mensaje, malo: true });

    return this.verLaCara(await this.pasarleYDecir(hecho.mensaje, tema.queLePedimos({ web: tema.comoEstamos().web, puestos: hecho.puestos })));
  }

  async quitarLaCara() {
    const { ok, mensaje } = tema.quitarla();
    if (ok) this.pintarPagina();
    return this.verLaCara({ texto: mensaje, malo: !ok });
  }

  // Elegir qué va arriba del todo. Lo que use de verdad esa persona no lo
  // sabemos nosotros, así que lo elige ella.
  async verFijadas(avisoLocal = null) {
    this.donde = { tipo: 'quieto' };
    this.enviar({
      tipo: 'fijadas',
      grupos: fijadas.candidatos(this.contexto.extensionPath),
      elegidas: fijadas.elegidas(this.almacen()),
      tope: fijadas.TOPE,
      aviso: avisoLocal,
    });
  }

  async cambiarFijada(cambiar, cual) {
    const { ok, mensaje } = await cambiar(this.almacen(), cual, this.contexto.extensionPath);
    await this.verFijadas(ok ? null : { texto: mensaje, malo: true });
    if (ok) await this.refrescar(true);
  }

  // El subapartado de personalización: cuatro cosas que cambian el día a día.
  async verComoTrabaja(avisoLocal = null) {
    this.donde = { tipo: 'quieto' };
    this.enviar({ tipo: 'comoTrabaja', ...ajustes.comoEstamos(), aviso: avisoLocal });
  }

  async cambiarAjuste(poner, cual) {
    const { ok, mensaje } = await poner(cual);
    return this.verComoTrabaja({ texto: mensaje, malo: !ok });
  }

  async verAsistente(avisoLocal = null) {
    // Quieta para el vigía; el ajuste, al cambiar, sí la repinta (decisión 158).
    this.donde = { tipo: 'quieto', pantalla: 'asistente' };
    this.enviar({ tipo: 'asistente', ...asistentes.comoEstamos(), aviso: avisoLocal });
  }

  async elegirAsistente(cual) {
    const nombre = (asistentes.porId(cual) || {}).nombre || cual;
    const { ok, mensaje, detalle, cancelado, boton } = await asistentes.elegir(cual, {
      // Si la carpeta no está montada para él, se prepara también para él (E1).
      montar: async (id) => {
        this.enviar({ tipo: 'esperando', que: `Preparando esta carpeta para ${nombre}…` });
        return arrancar.prepararTambienPara(id, this.contexto);
      },
    });
    // Lo que dijo el arnés, para «Algo va mal» (revisión de F5, I3).
    this.salida.appendLine(`[asistente] con ${cual}: ${ok ? 'hecho' : (cancelado ? 'sin su sí' : 'no')}${detalle ? ` · ${detalle}` : ''}`); // diccionario: interno
    // Primero el repintado y después lo dicho: al revés, el repintado tapaba el
    // aviso de los frenos, que es el único momento en que sirve (I5).
    if (ok) {
      vigilarOtraVez();
      await this.refrescar(true);
    }
    // Si falta en el ordenador, con el botón que lo pone (decisión 166).
    await this.verAsistente({ texto: mensaje, malo: !ok && !cancelado, ...(boton ? { boton } : {}) });
  }

  // Lo que sabe que no sabe. Estaba al final de la pantalla de conceptos,
  // detrás de todo lo demás, que es donde no lo ve nadie.
  async verHuecos() {
    this.donde = { tipo: 'quieto' };
    this.enviar({ tipo: 'huecos', huecos: cerebro.loQueAunNoSabe(20) });
  }

  // El diario del arnés: lo que se hizo cada día y lo que se decidió. Las dos
  // cosas las escribe RSC solo y hasta ahora no las veía nadie.
  async verDiario() {
    this.donde = { tipo: 'quieto' };
    this.enviar({
      tipo: 'diario',
      sesiones: diario.sesiones(),
      decisiones: diario.decisiones(),
      // `log.md` es el registro de operaciones del arnés: es diario, no
      // documentación. Salía en la pantalla de documentos, que no es su sitio.
      aprendido: cerebro.aprendidoUltimamente(5),
    });
  }

  // Una anotación entera NO cabe en la barra. Se probó y se vio: media página
  // de texto en una columna de 300px, con los nombres de fichero saliéndose
  // por el lado, no hay quien la lea. Así que se abre al lado, ya compuesta,
  // que es donde se lee un documento largo.
  async verSesion(fichero) {
    const donde = diario.dondeVive(fichero);
    if (!donde) return this.enviar({ tipo: 'aviso', texto: 'Esa anotación ya no está.', malo: true });

    const uri = vscode.Uri.file(donde);
    try {
      // Compuesto, no en crudo: quien lee esto no tiene por qué ver los
      // asteriscos y las almohadillas.
      await vscode.commands.executeCommand('markdown.showPreviewToSide', uri);
    } catch {
      await vscode.window.showTextDocument(uri, { viewColumn: vscode.ViewColumn.Beside, preview: true });
    }
    return undefined;
  }

  // Cuánto te explica y con qué palabras. Lo guarda el arnés en su perfil y lo
  // lee todo lo demás antes de contestar, así que esto no es un adorno de la
  // barra: cambia cómo habla el asistente en la conversación.
  // El aviso viaja dentro del mensaje, no aparte: un `aviso` suelto repinta la
  // pantalla principal, y elegir una opción aquí te echaría de la pantalla.
  //
  // Y con lo que ha aprendido de ti: las lecciones de la memoria de RSC, que
  // son de la misma clase —cómo trabajar contigo— y no se enseñaban en ningún
  // sitio. El botón de aprender manda lo que se escribiría a mano: con Claude,
  // el comando `learn` tal cual; con los demás, la petición con palabras.
  async verTrato(avisoLocal = null) {
    this.donde = { tipo: 'quieto' };
    const como = trato.comoEstamos();
    this.enviar({
      tipo: 'trato',
      vocabularios: como.vocabularios,
      palabras: como.palabras,
      aprendido: lecciones.queHaAprendido(10),
      comoAprende: donde.paraQuien() === 'claude'
        ? '/learn'
        : 'Quiero que aprendas algo de cómo trabajo contigo. Pregúntame qué es y guárdalo como una lección tuya, con tu comando de aprender.',
      aviso: avisoLocal,
    });
  }

  async cambiarElTrato(poner, cual) {
    const { ok, mensaje } = poner(cual);
    return this.verTrato(ok
      ? { texto: 'Hecho. Se nota en la próxima cosa que le pidas.', malo: false }
      : { texto: mensaje, malo: true });
  }

  ponerPalabras(cual) { return this.cambiarElTrato(trato.ponerPalabras, cual); }

  async verRadiografia() {
    this.donde = { tipo: 'quieto' };
    this.enviar({ tipo: 'esperando', que: 'Mirando qué hay aquí…' });
    // Ojo con esparcir aquí dentro: `tipo` es el nombre del mensaje y quien
    // lo pise deja al panel sin saber qué pintar. Pasó, y la pantalla se
    // quedaba en "Mirando qué hay aquí…" para siempre.
    // A fondo: aquí sí se puede pagar. Alguien acaba de pulsar para ver esto y
    // hay una pantalla de espera delante; la principal, que se repinta sola, no
    // puede permitirse tres subprocesos del arnés cada vez.
    const aFondo = (await terreno.reconocer({ profundo: true })).arnes;
    const radio = await terreno.radiografia({ aFondo, sigueSinCopias: this.eligioSinCopias() });
    this.enviar({ tipo: 'radiografia', queEs: radio.queEs, piezas: radio.piezas });
  }

  // `delMontaje`: la pantalla que sale del «Sí, ahora» del montaje. Cualquier otra
  // entrada (Ayuda, Histórico, un comando) la suelta: ese sí no vale para otra cosa
  // (decisión 186).
  async verCopiaFuera({ delMontaje = false } = {}) {
    if (!delMontaje) this.subirAlVolver = null;
    this.donde = { tipo: 'quieto' };
    this.enviar({ tipo: 'esperando', que: 'Un momento…' });
    this.enviar({ tipo: 'copiaFuera', github: await github.estado() });
  }

  // Entrar en la cuenta. Lo hace el editor, con su propio diálogo y su
  // navegador: aquí no se pide ni se guarda ninguna clave.
  async conectarGitHub() {
    // El sí del montaje se gasta en el primer acceso que sale de su pantalla, acabe
    // como acabe, y solo vale para esta carpeta y un rato (decisión 186).
    const elSi = this.subirAlVolver;
    this.subirAlVolver = null;
    const hecho = await github.conectar();
    if (!hecho.ok) {
      if (!hecho.cancelado) this.salida.appendLine(`[conectarGitHub] ${hecho.detalle}`);
      return this.verCopiaFuera();
    }
    // Venía de «Sí, ahora» al montar: ya dijo que sí a guardarla fuera, así que
    // sigue sola hasta subirla, con las guardas y los avisos de `subirCopia`
    // (decisión 186). Dura un rato, no para siempre. Venida de otro sitio, como antes.
    const dijoQueSi = Boolean(elSi) && elSi.raiz === proyecto.raiz() && Date.now() - elSi.cuando < VIGENCIA_DEL_SI_AHORA;
    if (dijoQueSi) {
      this.enviar({ tipo: 'aviso', texto: `Ya estás dentro${hecho.usuario ? ` como ${hecho.usuario}` : ''}. Te subo la copia.` });
      return this.subirCopia();
    }
    await this.refrescar(true);
    this.enviar({ tipo: 'aviso', texto: `Ya estás dentro${hecho.usuario ? ` como ${hecho.usuario}` : ''}. Ya puedes guardar copias fuera.` });
    return undefined;
  }

  // Manda el primer mensaje del montaje a la caja del asistente. Escrito sin
  // enviar: se dice, como en `pedir` (decisión 181). Copiado, ya lo dice el
  // aviso del portapapeles.
  async mandarElPrimero(texto) {
    const como = await puente.enviar(texto);
    if (como === 'directo') this.dejarElAviso(DALE_A_ENVIAR);
    return como;
  }

  // «Ya he entrado»: lo que esperaba la cuenta, sale.
  async mandarElPrimerEncargo() {
    const texto = sesionDelAsistente.soltar();
    if (!texto) return this.refrescar(true);
    try {
      await this.mandarElPrimero(texto);
    } catch (error) {
      // Si no salió, sigue esperando, y se dice (decisiones 166 y 183).
      sesionDelAsistente.aplazar(texto);
      this.salida.appendLine(`[primer encargo] ${error && error.message}`); // diccionario: interno
      this.enviar({ tipo: 'aviso', texto: `No he podido pasarle el encargo a ${asistentes.elDeAhora().nombre}. Pulsa «Algo va mal» y pásale el código a tu tutor.`, malo: true });
      return this.refrescar(true);
    }
    await this.refrescar(true);
    return undefined;
  }

  async subirCopia() {
    this.enviar({ tipo: 'esperando', que: 'Subiendo a GitHub…' });
    const hecho = await copias.subirCopia();
    // Sin cuenta no se enseña un error: se enseña cómo entrar.
    if (hecho.faltaGitHub) return this.verCopiaFuera();
    // Por qué no subió, para «Algo va mal», sin el token (F2).
    if (hecho.detalle) this.salida.appendLine(`[subir] ${hecho.detalle}`); // diccionario: interno

    await this.refrescar(true);
    this.enviar({
      tipo: 'aviso', texto: hecho.mensaje, malo: !hecho.ok,
      // Sin internet, lo que se puede hacer es volver a intentarlo (decisión 183).
      ...(hecho.sinRed ? { boton: { etiqueta: 'Volver a intentarlo', accion: { tipo: 'subirCopia' } } } : {}),
    });
    return undefined;
  }

  async guardarCopia() {
    const { ok, mensaje, boton } = await copias.guardar();
    this.enviar({ tipo: 'aviso', texto: mensaje, malo: !ok, ...(boton ? { boton } : {}) });
    if (ok) brujula.olvidar();
  }

  async volverA(id) {
    const eleccion = await vscode.window.showWarningMessage(
      'Voy a dejar esta carpeta como estaba entonces. Guardo antes una copia de lo de ahora, por si acaso.',
      { modal: true },
      'Sí, vuelve atrás',
    );
    if (eleccion !== 'Sí, vuelve atrás') return;

    const { ok, mensaje } = await copias.volverA(id);
    this.enviar({ tipo: 'aviso', texto: mensaje, malo: !ok });
    await this.refrescar(true);
  }

  // Lo que se ve en pantalla, escrito en un documento para poder pasárselo a
  // alguien. Jose: «podemos reportarlo en un markdown y luego un botón para
  // afinar las cosas». Va donde va todo lo que se lee: la bandeja del arnés; y
  // si no hay arnés, fuera del proyecto, que es donde no estorba.
  async guardarLaRevision() {
    const { piezas, queEs } = await terreno.radiografia({ sigueSinCopias: this.eligioSinCopias() });
    const cuando = new Date().toISOString().slice(0, 10);

    const linea = (p) => `| ${{ si: '✓', aMedias: '!', no: '·' }[p.estado] || '·'} | ${p.nombre} | ${p.detalle} |`;
    const texto = [
      `# Qué hay montado en esta carpeta`,
      '',
      `Fecha: ${cuando}`,
      `Estado: ${queEs}`,
      '',
      '| | Pieza | Cómo está |',
      '|---|---|---|',
      ...piezas.map(linea),
      '',
      ...(piezas.some((p) => p.arreglo) ? [
        '## Lo que falta, y quién puede hacerlo',
        '',
        ...piezas.filter((p) => p.arreglo).map((p) => `- **${p.nombre}** — ${p.arreglo.etiqueta} (${{ solo: 'lo hace la barra', agente: 'se lo pide al asistente', persona: 'lo tienes que hacer tú' }[p.arreglo.como]})`),
      ] : ['Está todo.']),
      '',
    ].join('\n');

    const dentro = proyecto.arnesCompleto() && proyecto.ruta('02-DOCS', 'raw');
    const carpeta = dentro || (this.contexto.globalStorageUri && this.contexto.globalStorageUri.fsPath);
    if (!carpeta) {
      return this.enviar({ tipo: 'aviso', texto: 'No he podido dejarlo escrito en ningún sitio.', malo: true });
    }

    const fichero = path.join(carpeta, `que-hay-montado-${cuando}.md`);
    fs.mkdirSync(carpeta, { recursive: true });
    fs.writeFileSync(fichero, texto);
    await vscode.commands.executeCommand('markdown.showPreviewToSide', vscode.Uri.file(fichero));
    return this.enviar({ tipo: 'aviso', texto: 'Te lo he dejado escrito y abierto al lado.' });
  }

  // ---------------------------------------------------------- soporte

  async algoVaMal() {
    this.enviar({ tipo: 'esperando', que: 'Estoy mirando qué pasa. Tarda un poco.' });
    const informe = await soporte.revisar({
      lineas: this.salida.ultimas ? this.salida.ultimas() : [],
      carpetaAparte: this.contexto.globalStorageUri && this.contexto.globalStorageUri.fsPath,
      barra: this.versionDeLaBarra(),
    });
    (this.salida.sinGuardar || this.salida.appendLine).call(this.salida, informe.informe);
    this.ultimoInforme = informe.fichero;
    // Para «Contárselo a Executive Lab» desde esta misma pantalla: el informe
    // va con el aviso aunque no se haya podido dejar escrito en ningún sitio.
    this.ultimaIncidencia = { codigo: informe.codigo, informe: informe.informe };
    this.enviar({
      tipo: 'incidencia',
      codigo: informe.codigo,
      fichero: informe.fichero,
      sano: informe.sano,
      desconocido: informe.desconocido,
      hayQueTocarAlgo: informe.hayQueTocarAlgo,
      // Si lo que falta es git, `rsc repair` no lo va a arreglar: hay que
      // ponerlo. Mejor ese botón que uno que no puede funcionar.
      faltaGit: informe.faltaGit,
      comoSeInstalaGit: git.comoSeInstala(),
    });
  }

  // El informe entero, abierto en el editor. El alumno dicta el código y ya
  // está; esto es para cuando el tutor está delante —o al otro lado de una
  // pantalla compartida— y quiere leerlo sin buscar el fichero.
  async verElInforme(fichero) {
    const donde = fichero || this.ultimoInforme;
    if (!donde || !fs.existsSync(donde)) {
      this.enviar({ tipo: 'aviso', texto: 'No he podido dejarlo escrito en ningún sitio.', malo: true });
      return;
    }
    await vscode.window.showTextDocument(vscode.Uri.file(donde), { viewColumn: vscode.ViewColumn.Beside });
  }

  // ── Contárselo a Executive Lab ─────────────────────────────────────────
  //
  // Tres entradas y una sola pantalla para mandar (avisos.js): el alumno, desde
  // Ayuda o desde «Algo va mal»; su asistente, que lo deja escrito porque se lo
  // dicen los raíles; y la barra, cuando un botón revienta por dentro. En los
  // tres casos se enseña entero y se puede cambiar, y solo sale con «Mandarlo».
  // El sitio es público y la incidencia va con su cuenta: eso lo decide la
  // persona, aviso por aviso (decisión 131).

  versionDeLaBarra() {
    return this.contexto.extension ? this.contexto.extension.packageJSON.version : null;
  }

  losAvisosQueEsperan() {
    try {
      return avisos.pendientes().map((a) => ({ fichero: a.fichero, titulo: a.titulo, origen: a.origen }));
    } catch (error) {
      this.salida.appendLine(`[avisos] ${error.stack || error.message}`); // diccionario: interno
      return [];
    }
  }

  // ── Lo que pasó con lo que se mandó (decisión 134) ─────────────────────
  //
  // Se recuerda en el almacén de esta carpeta, que no ve ni toca nadie más: un
  // fichero de la carpeta lo podría escribir cualquiera, y la tarjeta diría lo
  // que él quisiera con la cara de Executive Lab (revisión de seguridad).
  async apuntarElMandado(numero, aviso) {
    if (!Number.isInteger(numero)) return;
    const mandados = { ...(this.almacen().get(CLAVE_MANDADOS) || {}) };
    mandados[numero] = { titulo: aviso.titulo, tipo: aviso.tipo, cuando: new Date().toISOString() };
    // Los cincuenta más nuevos bastan: de uno más viejo ya no se espera nada.
    const guardados = Object.entries(mandados).sort(([, a], [, b]) => String(b.cuando).localeCompare(String(a.cuando))).slice(0, 50);
    await this.almacen().update(CLAVE_MANDADOS, Object.fromEntries(guardados));
  }

  elArregladoQueToca() {
    const mandados = this.almacen().get(CLAVE_MANDADOS) || {};
    const [numero, cual] = Object.entries(mandados).find(([, m]) => m && m.cerrado && !m.avisado) || [];
    return numero ? { numero: Number(numero), titulo: cual.titulo, tipo: cual.tipo, como: cual.como, enlace: avisos.enlaceDe(numero) } : null;
  }

  // Una vez al día por carpeta, sin que nadie espere, y solo si hay algo que
  // esperar: pintar no puede depender de GitHub. La hora se apunta antes de
  // mirar, así que un fallo de red no hace que se pregunte en cada repintado.
  async mirarLosArregladosSiToca() {
    const almacen = this.almacen();
    const mandados = almacen.get(CLAVE_MANDADOS) || {};
    const abiertos = Object.entries(mandados).filter(([, m]) => m && !m.cerrado);
    if (!abiertos.length) return;
    if (Date.now() - (almacen.get(CLAVE_ARREGLADOS_MIRADOS) || 0) < UN_DIA) return;
    await almacen.update(CLAVE_ARREGLADOS_MIRADOS, Date.now());

    const desde = abiertos.map(([, m]) => m.cuando).filter(Boolean).sort()[0] || new Date(0).toISOString();
    const cerradas = await avisos.lasCerradas(abiertos.map(([n]) => Number(n)), { desde });
    if (!cerradas) {
      this.salida.appendLine('[avisos] no he podido mirar en GitHub: mañana otra vez'); // diccionario: interno
      return;
    }
    const ahora = Date.now();
    const puestos = { ...(almacen.get(CLAVE_MANDADOS) || {}) };
    let nuevas = 0;
    for (const [numero, cerrada] of Object.entries(cerradas)) {
      if (!puestos[numero]) continue;
      // Una cerrada hace más de dos meses ya no es noticia: se apunta y se calla.
      const vieja = cerrada.cuando && ahora - new Date(cerrada.cuando).getTime() > 60 * UN_DIA;
      puestos[numero] = { ...puestos[numero], cerrado: cerrada.cuando || new Date(ahora).toISOString(), como: cerrada.como, avisado: vieja ? true : undefined };
      if (!vieja) nuevas += 1;
    }
    await almacen.update(CLAVE_MANDADOS, puestos);
    this.salida.appendLine(`[avisos] mirado en GitHub: ${Object.keys(cerradas).length} cerradas, ${nuevas} por decir`); // diccionario: interno
    if (nuevas) await this.repintarLoQueHaya();
  }

  async yaLoSe(numero) {
    const mandados = { ...(this.almacen().get(CLAVE_MANDADOS) || {}) };
    if (mandados[numero]) {
      mandados[numero] = { ...mandados[numero], avisado: true };
      await this.almacen().update(CLAVE_MANDADOS, mandados);
    }
    return this.refrescar(true);
  }

  elAvisoQueToca() {
    try {
      return avisos.elQueToca(this.almacen().get(CLAVE_SILENCIADOS) || {});
    } catch (error) {
      this.salida.appendLine(`[avisos] ${error.stack || error.message}`); // diccionario: interno
      return null;
    }
  }

  verContar() {
    this.donde = { tipo: 'quieto' };
    this.enviar({
      tipo: 'contar',
      tipos: Object.entries(avisos.TIPOS).map(([id, t]) => ({ id, etiqueta: t.etiqueta, icono: t.icono })),
    });
  }

  contar(cual) {
    return this.ensenarElAviso({ tipo: avisos.TIPOS[cual] ? cual : 'falla', origen: 'alumno', titulo: '', texto: '', detalle: '' });
  }

  // Desde «Algo va mal»: con el informe y su código, que es lo que el tutor
  // tiene apuntado. Así Jose y el tutor hablan de lo mismo.
  contarLaIncidencia() {
    const hubo = this.ultimaIncidencia;
    return this.ensenarElAviso({
      tipo: 'falla',
      origen: 'alumno',
      titulo: '',
      texto: '',
      detalle: hubo ? `Código de incidencia: ${hubo.codigo}\n\n--- informe de «Algo va mal» ---\n${hubo.informe}` : '',
    });
  }

  verElAviso(fichero) {
    const aviso = fichero ? avisos.pendientes().find((a) => a.fichero === fichero) : null;
    if (!aviso) return this.enviar({ tipo: 'aviso', texto: 'Ese aviso ya no está.' });
    return this.ensenarElAviso(aviso);
  }

  async ensenarElAviso(aviso, nota = null) {
    this.donde = { tipo: 'quieto' };
    // Lo suyo que la barra sabe y no está en el perfil: su usuario de GitHub y
    // el sitio de su copia, que salen en el informe de «Algo va mal».
    const cuenta = await github.estado();
    const otros = [cuenta.usuario, cuenta.remoto && cuenta.remoto.corto].filter(Boolean);
    // Lo que se enseña es lo que se manda: los datos, el texto y el título, ya
    // limpios. Lo que la persona cambie después se vuelve a mirar al pulsar.
    const conQue = avisos.datos({
      barra: this.versionDeLaBarra(),
      editor: vscode.version,
      tipo: aviso.tipo,
      origen: aviso.origen,
      lineas: this.salida.ultimas ? this.salida.ultimas() : [],
      detalle: aviso.detalle,
      otros,
    });
    const texto = avisos.limpiar(aviso.texto || '', { otros });
    const titulo = avisos.limpiar(aviso.titulo || '', { otros });
    this.avisoDelante = { ...aviso, texto, titulo, datos: conQue, otros };
    const cual = avisos.TIPOS[aviso.tipo];
    // `cual` y no `tipo`: un `tipo` en los datos pisa el del mensaje, y el panel
    // se queda sin saber qué pintar (ya pasó una vez).
    this.enviar({
      tipo: 'elAviso',
      cual: aviso.tipo,
      etiqueta: cual.etiqueta,
      icono: cual.icono,
      ejemplo: cual.ejemplo,
      origen: aviso.origen,
      texto,
      // El título es lo primero que se ve en GitHub. El del alumno sale de lo
      // que escribe; el que puso su asistente o la barra se enseña y se puede
      // cambiar (revisión de seguridad: antes salía sin que nadie lo viera).
      titulo: aviso.origen === 'alumno' ? null : titulo,
      datos: conQue,
      nota,
      guardado: Boolean(aviso.fichero),
      hayQueEscribir: aviso.origen === 'alumno',
    });
  }

  async mandarElAviso(texto, titulo) {
    // Se coge y se suelta antes de esperar a nada: un doble clic manda dos
    // mensajes, y sin esto eran dos incidencias con su cuenta (revisión).
    const delante = this.avisoDelante;
    this.avisoDelante = null;
    if (!delante) return this.refrescar();
    const escrito = String(texto == null ? '' : texto).trim();
    const conTitulo = delante.origen === 'alumno'
      ? avisos.tituloDe(escrito)
      : String(titulo == null ? delante.titulo : titulo).replace(/\s+/g, ' ').trim();
    // El panel no deja mandarlo vacío; esto es por si algún día sí.
    if (!escrito && delante.origen === 'alumno') return this.ensenarElAviso(delante);

    // Si lo que ha escrito lleva algo que no puede salir, no se manda otra cosa
    // que lo que ha visto: se le enseña limpio, y lo manda si le parece bien.
    const limpio = avisos.limpiar(escrito, { otros: delante.otros });
    const tituloLimpio = avisos.limpiar(conTitulo, { otros: delante.otros });
    if (limpio !== escrito || tituloLimpio !== conTitulo) {
      return this.ensenarElAviso({ ...delante, texto: limpio, titulo: tituloLimpio },
        'He quitado lo que no debe salir de aquí. Míralo y, si está bien, vuelve a pulsar «Mandarlo».');
    }
    const aviso = { ...delante, texto: escrito, titulo: conTitulo || avisos.tituloDe(escrito) };

    this.enviar({ tipo: 'esperando', que: 'Mandándolo…' });
    let entrar = await copias.comoEntrar();
    if (!entrar) {
      // Ha pulsado «Mandarlo»: pedirle que entre es lo que toca, con el
      // diálogo de siempre del editor.
      const conectado = await github.conectar();
      if (conectado.ok) entrar = await copias.comoEntrar();
    }
    if (!entrar) return this.dejarloParaLuego(aviso, 'No lo he mandado: hace falta entrar en tu cuenta de GitHub. Lo dejo guardado en Ayuda para cuando quieras.');

    const hecho = await avisos.mandar(avisos.componer({ ...aviso, barra: this.versionDeLaBarra(), otros: delante.otros }), entrar.clave);
    this.salida.appendLine(`[avisos] ${hecho.ok ? `mandado: ${hecho.url || 'sin enlace'}` : `no ha salido: ${hecho.motivo}${hecho.estado ? ` (${hecho.estado})` : ''}`}`); // diccionario: interno
    if (!hecho.ok) return this.dejarloParaLuego(aviso, 'No he podido mandarlo. Lo dejo guardado en Ayuda y lo puedes volver a intentar.');

    // Se guarda en `mandados/` con su enlace: así ni la barra ni el asistente
    // vuelven a proponer lo que ya se contó.
    if (!avisos.archivar(aviso, avisos.MANDADOS, { enlace: hecho.url })) {
      this.salida.appendLine('[avisos] mandado, pero no he podido apuntarlo como mandado'); // diccionario: interno
    }
    await this.olvidarElApartado(aviso);
    // Y se recuerda aquí, para decirle lo que pase con él (decisión 134).
    await this.apuntarElMandado(hecho.numero, aviso);
    await this.refrescar(true);
    return this.enviar({
      tipo: 'aviso',
      texto: 'Mandado. Lo lee quien hace esta barra, y así se arregla para todos.',
      boton: hecho.url ? { etiqueta: 'Verlo en GitHub', accion: { tipo: 'abrir', url: hecho.url } } : null,
    });
  }

  // Lo que escribió no se pierde: se guarda en su sitio, o se deja uno nuevo,
  // y queda esperando en Ayuda y en la pantalla principal.
  async dejarloParaLuego(aviso, porQue) {
    const guardado = aviso.fichero ? avisos.reescribir(aviso) : Boolean(avisos.preparar(aviso));
    if (!guardado) this.salida.appendLine('[avisos] no he podido dejarlo guardado'); // diccionario: interno
    this.avisoDelante = null;
    await this.refrescar(true);
    return this.enviar({ tipo: 'aviso', texto: guardado ? porQue : 'No he podido mandarlo. Pulsa «Algo va mal» y pásale el código a tu tutor.', malo: true });
  }

  // Un aviso que ya no espera no tiene nada que apartar: su «Ahora no» se
  // quedaba para siempre en el almacén de la carpeta (auditoría final).
  async olvidarElApartado(aviso) {
    const id = aviso && aviso.nombre ? `aviso:${aviso.nombre}` : null;
    const apartados = this.almacen().get(CLAVE_SILENCIADOS) || {};
    if (!id || !(id in apartados)) return;
    const { [id]: _olvidado, ...resto } = apartados;
    await this.almacen().update(CLAVE_SILENCIADOS, resto);
  }

  async noMandarElAviso() {
    const delante = this.avisoDelante;
    this.avisoDelante = null;
    // Uno que ya estaba escrito va a `descartados/`: la barra no lo vuelve a
    // enseñar, y el asistente sabe que esto la persona no lo quiso contar.
    const estaba = Boolean(delante && delante.fichero);
    if (estaba && !avisos.archivar(delante, avisos.DESCARTADOS)) {
      this.salida.appendLine('[avisos] no he podido apartarlo'); // diccionario: interno
    }
    if (estaba) await this.olvidarElApartado(delante);
    await this.refrescar(true);
    if (estaba) this.enviar({ tipo: 'aviso', texto: 'No lo mando, y no te lo vuelvo a proponer.' });
  }

  async arreglar() {
    this.enviar({ tipo: 'esperando', que: 'Arreglándolo…' });
    const { ok, mensaje, detalle } = await soporte.arreglar();
    if (detalle) this.salida.appendLine(detalle);
    if (ok) await this.losRailesDetras();
    this.enviar({ tipo: 'aviso', texto: mensaje, malo: !ok });
    await this.refrescar(true);
  }

  // Detrás de «Revisar y arreglar», como en el montaje (decisión 161). `repair`
  // rehace lo del arnés y no lo nuestro: en una carpeta traída de otro ordenador,
  // `.rsc/` es nueva y le faltan las marcas de los raíles, también la que calla el
  // aviso que manda a correr `npx @ericrisco/rsc@latest`. Se reponen como al
  // abrir: solo si la carpeta ya los tiene, porque reponer no es decidir; y en una
  // carpeta de alguien, lo que toca sus ficheros sigue esperando a su sí (C-4). Que
  // no salga no tumba el arreglo: se apunta para «Algo va mal» (P3).
  async losRailesDetras() {
    if (!terreno.comoEstanLosRailes().habilidadPropia) return null;
    const ajena = !(await terreno.podemosGuardarElPuntoDePartida());
    const ok = await arrancar.ponerLosRailes(this.contexto, { ajena }).catch(() => false);
    this.salida.appendLine(`[railes] detrás de arreglar: ${ok}${ajena ? ' (historial de alguien: lo suyo, pendiente)' : ''}`); // diccionario: interno
    return ok;
  }

  // La pieza que falta es git, y sin ella no se monta nada (git.js dice por
  // qué). No la repartimos: se lanza el instalador oficial del sistema. Puede
  // tardar mucho —en un Mac limpio son uno o dos gigas—, así que va con barra
  // de progreso y contando lo que pasa.
  async instalarGit() {
    if (!git.sePuedeInstalarSolo()) {
      return this.enviar({ tipo: 'aviso', texto: git.comoSeInstala(), malo: true });
    }

    const hecho = await vscode.window.withProgress(
      { location: vscode.ProgressLocation.Notification, title: 'Poniendo lo que falta', cancellable: false },
      (progreso) => git.instalar((que) => progreso.report({ message: que })),
    );

    // La respuesta anterior está recordada; sin esto la barra seguiría
    // diciendo que falta justo después de ponerla.
    copias.olvidarSiHayGit();

    if (!hecho.ok) {
      this.salida.appendLine(`[instalarGit] ${hecho.mensaje}${hecho.detalle ? ` · ${hecho.detalle}` : ''}`);
      return this.enviar({ tipo: 'aviso', texto: hecho.mensaje, malo: true });
    }

    // Si ya pulsó «Preparar esta carpeta» y contestó, se termina con lo
    // contestado: era lo que esperaba a git (decisión 165).
    if (lasRespuestas.leer(this.contexto.workspaceState)) return this.arrancar();
    await this.refrescar(true);
    // Con la carpeta ya montada, no hay nada que preparar: decía que sí.
    return this.enviar({ tipo: 'aviso', texto: proyecto.existe('.rsc.json') ? 'Ya está puesto git.' : 'Ya está. Puedes preparar la carpeta.' });
  }

  // «Seguir sin copias», con las respuestas guardadas y sin git (decisión 165):
  // para quien no puede ponerlo —un portátil de empresa que no deja instalar—,
  // que si no se quedaría pulsando «Volver a intentarlo» para siempre. Se apunta
  // como la elección de antes (B3) y se monta con lo contestado.
  async seguirSinCopias() {
    if (this.contexto.workspaceState) await this.contexto.workspaceState.update(arrancar.CLAVE_SIN_GIT, true);
    // Si está esperando a git con lo contestado, deja de esperar y monta con ello.
    if (arrancar.dejarDeEsperarAGit()) return undefined;
    return this.arrancar();
  }

  // Lo que esperaba a git, al volver a abrir la carpeta (decisión 165): si se
  // recargó la ventana a mitad, o git acabó con la barra cerrada. Si git ya está
  // y lo contestado basta, se termina solo, como lo que se hace solo al abrir
  // (P9): con confianza y en una carpeta que este ordenador conoce. Si no, la
  // pantalla ofrece «Terminar de prepararla», con un clic y sin preguntas.
  async retomarLaPreparacion() {
    if (vscode.workspace.isTrusted === false || !proyecto.raiz() || !this.carpetaConocida()) return null;
    if (!lasRespuestas.leer(this.contexto.workspaceState)) return null;
    copias.olvidarSiHayGit();
    if (!(await git.hay())) return null;
    if (this.conElArnes()) {
      this.salida.appendLine('[retomar] el arnés está ocupado: se queda en su botón'); // diccionario: interno
      return null;
    }
    // Mientras monta, los botones que corren el arnés esperan, como con lo que
    // se hace solo (ver `manejar`).
    this.arreglandoSolo = true;
    let hecho;
    try {
      hecho = await this.montar({ sinNadieDelante: true });
    } finally {
      this.arreglandoSolo = false;
    }
    this.salida.appendLine(`[retomar] ${hecho.ok ? 'terminada con lo contestado' : (hecho.esperaASuBoton ? 'espera a su botón' : 'no ha salido')}`); // diccionario: interno
    return this.despuesDeMontar(hecho, { sinNadieDelante: true });
  }

  // Si en esta carpeta se eligió seguir sin copias. Es la misma clave que
  // guarda el arranque.
  eligioSinCopias() {
    return Boolean(this.contexto.workspaceState && this.contexto.workspaceState.get('executiveLab.sigueSinCopias'));
  }

  // El botón de «Lo que el arnés hace solo» (C2): el relevo, otra vez. El
  // proceso de Claude que ya estaba abierto no lo ve, porque el PATH se hereda
  // al arrancar, así que se dice que se abra la conversación de nuevo.
  async arreglarElRelevo() {
    const puesto = relevo.ponerAlActivar({ carpeta: dondeVaElRelevo(this.contexto), ejecutable: entorno.node() });
    this.salida.appendLine(`[relevo] ${puesto.modo}${puesto.error ? `: ${puesto.error}` : ''}`); // diccionario: interno
    await this.refrescar(true);
    return this.enviar(puesto.modo === 'ninguno'
      ? { tipo: 'aviso', texto: 'No he podido arreglarlo. Pulsa «Algo va mal» y pásale el código a tu tutor.', malo: true }
      : { tipo: 'aviso', texto: asistentes.paraQueLoCoja(donde.paraQuien()) || 'Ya está.' });
  }

  // El botón del freno pendiente (C-4): con el sí de quien lo pulsa, se engancha
  // en sus ajustes. Claude lo coge al abrir la conversación otra vez, porque lee
  // los enganches al empezar.
  async ponerElFreno() {
    // Los raíles salen con 0 aunque no puedan leer los ajustes: se mira que haya
    // quedado enganchado de verdad antes de decir que sí (revisión de F3, M1).
    const ok = await arrancar.ponerLosRailes(this.contexto, { ajena: true, ponerFreno: true })
      && terreno.comoEstaElFreno().nuestro;
    this.salida.appendLine(`[railes] el freno: ${ok}`); // diccionario: interno
    await this.refrescar(true);
    return this.enviar(ok
      ? { tipo: 'aviso', texto: `Ya está. ${asistentes.paraQueLoCoja(donde.paraQuien()) || ''}`.trim() }
      : { tipo: 'aviso', texto: 'No he podido ponerlo. Pulsa «Algo va mal» y pásale el código a tu tutor.', malo: true });
  }

  // ── En una carpeta de alguien, con su botón (decisión 177) ───────────────
  //
  // Lo que la barra no hace sola en una carpeta que no montó ella se ofrece en
  // «Qué falta por montar», cada cosa con su «Ahora no». El clic es el sí; no hay
  // más preguntas. Qué se ofrece y cómo se hace: `de-alguien.js`.
  async desdeSuBoton(que, hacer, { dicho, fallo }) {
    if (vscode.workspace.isTrusted === false || !proyecto.raiz()) {
      return this.enviar({ tipo: 'aviso', texto: 'Esta carpeta no es de confianza: no he tocado nada.', malo: true });
    }
    // Un botón viejo no vale: se mira otra vez, justo antes de actuar, si todavía se
    // ofrece (la carpeta pudo pasar a ser de la barra, o ya estar hecho, o rechazado).
    let oferta = null;
    try { oferta = (await terreno.laOfertaDeAlguien())[que]; } catch { /* se trata como que ya no */ }
    if (!oferta) {
      this.salida.appendLine(`[deAlguien] ${que}: ya no se ofrece, no se toca nada`); // diccionario: interno
      await this.verRadiografia();
      return this.enviar({ tipo: 'aviso', texto: 'Esto ya no hace falta, o ya no se puede hacer aquí. No he tocado nada.' });
    }
    let hecho;
    try { hecho = await hacer(); } catch (error) { hecho = { ok: false, detalle: error.message }; }
    this.salida.appendLine(`[deAlguien] ${que}: ${hecho.detalle}`); // diccionario: interno
    await this.verRadiografia();
    return this.enviar(hecho.ok
      ? { tipo: 'aviso', texto: dicho(hecho), ...(hecho.boton ? { boton: hecho.boton } : {}) }
      : { tipo: 'aviso', texto: fallo, malo: true });
  }

  async ponerLoDeClaudeAqui() {
    return this.desdeSuBoton('claude', async () => {
      const hecho = await deAlguien.ponerLoDeClaude({
        raiz: proyecto.raiz(), estaEnGit: arrancar.estaEnGitConLaBarra, git: procesos.git,
      });
      return {
        ok: hecho.hecho === 'puesto',
        detalle: `${hecho.hecho}${hecho.fuera ? ` · fuera de git: ${hecho.fuera}` : ''}${hecho.error ? ` (${hecho.error})` : ''}`, // diccionario: interno
        boton: quitarSoloEsto(ajustesLocales.loQueSePuso(hecho)),
        frase: ajustesLocales.laFrase(hecho),
      };
    }, {
      dicho: (hecho) => hecho.frase,
      fallo: 'No he podido ponerlo. Pulsa «Algo va mal» y pásale el código a tu tutor.',
    });
  }

  async arreglarCodexAqui() {
    return this.desdeSuBoton('codex', async () => {
      const { hechos, sinFuera } = await deAlguien.arreglarCodex({ raiz: proyecto.raiz(), git: procesos.git });
      for (const h of hechos) {
        this.salida.appendLine(`[codex] ${h.hecho} ${h.fichero}${h.copia ? ` · copia en ${h.copia}` : ''}${h.error ? ` (${h.error})` : ''}`); // diccionario: interno
      }
      // La copia lleva el fichero entero: si no ha quedado fuera de git, se dice dónde está.
      const copia = sinFuera.length ? ` He dejado una copia del fichero en ${sinFuera.join(', ')}.` : '';
      return { ok: hechos.some((h) => h.hecho === 'arreglado'), detalle: hechos.map((h) => h.hecho).join(','), frase: `${retirados.laFrase(hechos)}${copia}` };
    }, {
      dicho: (hecho) => hecho.frase,
      fallo: 'No he podido arreglarlo. Pulsa «Algo va mal» y pásale el código a tu tutor.',
    });
  }

  async volverAEncender() {
    return this.desdeSuBoton('marcas', async () => {
      const hecho = deAlguien.volverAEncender(proyecto.raiz());
      return { ok: hecho.hecho === 'encendido', detalle: `${hecho.hecho} ${hecho.quitadas.join(',')}` }; // diccionario: interno
    }, {
      dicho: () => 'Hecho. Lo que apagó una versión anterior de la barra vuelve a funcionar.',
      fallo: 'No había nada de la barra que encender: lo demás lo apagó alguien de aquí, y lo dejo como está.',
    });
  }

  // «Ahora no»: en esta carpeta no se vuelve a ofrecer, si se ha podido apuntar.
  async noOfrecerMas(cual) {
    const hecho = await deAlguien.rechazar(this.almacen(), proyecto.raiz(), cual);
    this.salida.appendLine(`[deAlguien] ahora no, ${cual}: ${hecho}`); // diccionario: interno
    await this.verRadiografia();
    return this.enviar(hecho
      ? { tipo: 'aviso', texto: 'Vale, no te lo vuelvo a proponer en esta carpeta.' }
      : { tipo: 'aviso', texto: 'No he podido apuntar que no lo quieres, así que te lo volveré a proponer. No he tocado nada.', malo: true });
  }

  // El botón del bloque de `CLAUDE.md` pendiente (C-4). Toca un fichero suyo,
  // así que antes se pregunta con la frase de cuando se monta sobre lo de alguien.
  // Ajustar lo de siempre no es montar el arnés: se pregunta con el nombre del
  // botón, y vale para cualquier asistente (revisión de F4, m5).
  async ponerElBloque() {
    const si = 'Ajustarlo ahora';
    // Lo que falta, dicho como se dice en el resumen de montar: sus instrucciones,
    // su `.gitignore` (F1), o los dos.
    const falta = terreno.loQueFaltaPorPoner();
    const lista = falta.length ? falta : ['Cómo se trabaja aquí'];
    const dicha = lista.length < 2 ? lista.join('') : `${lista.slice(0, -1).join(', ')} y ${lista[lista.length - 1]}`;
    const elegido = await vscode.window.showInformationMessage(
      `Aquí ya hay cosas tuyas. Voy a tocar esto: ${dicha}. No borro nada tuyo.`,
      { modal: true },
      si,
      'No, déjalo',
    );
    if (elegido !== si) return this.enviar({ tipo: 'aviso', texto: 'No he tocado nada. Cuando quieras, el botón sigue aquí.' });
    const ok = await arrancar.ponerElBloque(this.contexto) && terreno.tieneElBloque();
    this.salida.appendLine(`[railes] lo de siempre, a mano: ${ok}`); // diccionario: interno
    await this.refrescar(true);
    const reabrir = asistentes.paraQueLoCoja(donde.paraQuien());
    return this.enviar(ok
      ? { tipo: 'aviso', texto: reabrir ? `Ya está. ${reabrir}` : 'Ya está.' }
      : { tipo: 'aviso', texto: 'No he podido ponerlo. Pulsa «Algo va mal» y pásale el código a tu tutor.', malo: true });
  }

  // Las copias de una carpeta que se montó sin ellas. Si falta git, se pone
  // antes, con el mismo botón de siempre.
  async ponerCopias() {
    let hecho = await arrancar.ponerLasCopias(this.contexto);
    if (hecho.faltaGit) {
      await this.instalarGit();
      hecho = await arrancar.ponerLasCopias(this.contexto);
      if (hecho.faltaGit) return undefined; // lo que pasa ya lo ha dicho instalarGit
    }
    this.enviar({ tipo: 'aviso', texto: hecho.mensaje, malo: !hecho.ok, ...(hecho.boton ? { boton: hecho.boton } : {}) });
    return this.refrescar(true);
  }

  // El montaje, y aparte lo que se hace y se dice después: así quien monta solo
  // puede tener el arnés por ocupado mientras monta, y no mientras espera a que
  // conteste lo de la vista sencilla o GitHub (decisión 165).
  async arrancar(opciones = {}) {
    return this.despuesDeMontar(await this.montar(opciones), opciones);
  }

  montar({ sinNadieDelante = false } = {}) {
    return arrancar.arrancar(this.contexto, this.salida, {
      sinNadieDelante,
      // Esperando a git con las respuestas ya dadas, la barra lo dice y cuenta el
      // tiempo, en vez de quedarse como estaba (decisión 165).
      // Con su salida, si la tiene: seguir sin copias en vez de esperar.
      alEsperar: (que, boton = null) => this.enviar({ tipo: 'esperando', que, ...(boton ? { boton } : {}) }),
    });
  }

  async despuesDeMontar(hecho, { sinNadieDelante = false } = {}) {
    if (hecho.enMarcha) return sinNadieDelante ? undefined : this.enviar({ tipo: 'aviso', texto: OCUPADA });
    // Solo, y quedaba algo que pide su sí: se queda en su botón, sin decir nada.
    if (hecho.esperaASuBoton) return this.repintarLoQueHaya();

    // git no ha quedado puesto: una frase y su salida (P1). Lo contestado está
    // guardado, y la pantalla lo dice.
    if (hecho.gitNoSePuso) {
      this.enviar({ tipo: 'aviso', texto: hecho.mensaje, malo: true, botones: hecho.botones || [] });
      return this.refrescar(true);
    }

    if (hecho.cancelado) {
      // Dejó las preguntas a medias con git poniéndose: ese sí ya lo dio, y git
      // sigue. Cuando acabe, la pantalla se pone al día (decisión 165).
      const poniendoGit = git.seEstaPoniendo();
      if (poniendoGit) {
        git.instalar().then(() => { copias.olvidarSiHayGit(); return this.repintarLoQueHaya(); })
          .catch((error) => this.salida.appendLine(`[arrancar] ${error.message}`)); // diccionario: interno
      }
      // Dijo que no a montar el arnés sobre lo que ya tenía. La barra funciona
      // sobre el arnés, así que no se instala nada — y se dice, en vez de
      // dejar la pantalla igual y que parezca que no ha pasado nada.
      if (hecho.sinPermiso) {
        this.enviar({ tipo: 'aviso', texto: 'No he tocado nada. Cuando quieras, el botón sigue aquí.' });
      }
      // Fresca si git se está poniendo: la pantalla lo dice en vez del botón.
      return this.refrescar(poniendoGit);
    }

    // Falta git y ha dicho que lo pone: no es un error que mirar, es un botón
    // que pulsar, y la pantalla ya lo enseña.
    if (hecho.faltaGit) return this.refrescar(true);

    if (!hecho.ok) return this.enviar({ tipo: 'aviso', texto: hecho.mensaje, malo: true });

    // Ha elegido seguir sin copias, y se ha montado sin ellas: se dice dónde
    // quedan, al pintar la principal y después de lo demás (decisión 164).
    const sinCopias = hecho.sinCopias ? arrancar.SIN_COPIAS_HASTA_QUE_QUIERAS : null;

    // Lo que ya estaba no se celebra: no se ha montado nada.
    if (hecho.yaEstaba) {
      this.enviar({ tipo: 'aviso', texto: hecho.mensaje });
      return this.refrescar(true);
    }

    if (hecho.avisos && hecho.avisos.length) {
      this.salida.appendLine(`[arrancar] terminó con pegas: ${hecho.avisos.join(', ')}`); // diccionario: interno
    }
    // Lo que salió mal y hay que decir, aunque lo demás esté montado (B10).
    for (const pega of hecho.pegas || []) this.enviar({ tipo: 'aviso', texto: pega, malo: true });
    // Y lo que se hizo solo, una vez y con su «Quitarlo» (decisión 157).
    const dichos = (hecho.dichos || []).filter(Boolean);
    if (hecho.encargos && hecho.encargos.length) {
      this.salida.appendLine(`[arrancar] falta que el asistente haga: ${hecho.encargos.join(', ')}`); // diccionario: interno
    }

    // ── Lo que solo tiene sentido cuando se acaba de montar de cero ───────
    //
    // Traer un arnés de otro ordenador, completar un suelo o adoptar uno que ya
    // estaba no son "montar tu empresa": esa persona ya tenía esto. Preguntarle
    // por la vista sencilla y por GitHub otra vez, y decirle «acabo de montar
    // aquí un arnés», sería contarle una película que no ha pasado.
    const reciénMontado = ['desdeCero', 'encimaDeLoQueHay', 'otroArnes'].includes(hecho.rama);

    // Los asistentes que se pusieron solos, dichos con lo demás (decisión 181).
    const puestos = this.frasePuestos(hecho.puestos);

    if (!reciénMontado) {
      // El mensaje va primero: así «Dale a enviar» se dice según cómo llegó (decisión 181).
      const como = await puente.enviar('He puesto al día el arnés de esta carpeta. Mira qué hay montado y cuéntame en dos líneas por dónde seguimos.');
      this.enviar({
        tipo: 'aviso',
        texto: [LO_QUE_SE_HIZO[hecho.rama] || hecho.mensaje, puestos, ...dichos, sinCopias, como === 'directo' ? DALE_A_ENVIAR : null].filter(Boolean).join(' '),
        ...(dichos.length ? { boton: QUITAR_LO_DE_CLAUDE } : {}),
      });
      await this.siFaltaAlgoDecirlo(true);
      return undefined;
    }

    // Lo que protege o mantiene se hace solo y se dice, con su «Quitarlo»
    // (decisión 181, P9). La vista sencilla no: es una preferencia suya, y se le
    // pregunta, una vez y a un clic (decisión 187).
    await this.preguntarLaVistaSencilla(hecho);
    await this.preguntarLosConsejos({ soltar: false }).catch((e) => this.salida.appendLine(`[claude] ${e.message}`)); // diccionario: interno
    const guardado = await this.fraseDelGuardadoSolo(hecho);
    // Sale al pintar la principal, aquí abajo.
    this.dejarElAviso(puestos);
    for (const dicho of dichos) this.dejarElAviso(dicho, QUITAR_LO_DE_CLAUDE_DEL_MONTAJE);
    this.dejarElAviso(guardado, guardado ? QUITAR_EL_GUARDADO_SOLO : null);
    this.dejarElAviso(sinCopias);
    // Se pinta la principal sin soltar el aviso: va al final, junto con «Dale a enviar».
    const pendiente = this.avisoPendiente;
    this.avisoPendiente = null;
    await this.refrescar(true);
    this.avisoPendiente = pendiente;
    // La lista de lo que falta se deja para el final, después de GitHub: si
    // saliera ahora, la pregunta de la cuenta le caería encima.

    // La cuenta de GitHub, aquí y no cuando haga falta.
    //
    // Antes esto solo salía el día que alguien pulsaba "Subir a GitHub", que es
    // el peor momento: ya quiere guardar algo y se encuentra con que le toca
    // crearse una cuenta. Montar la carpeta es cuando se está montando todo, y
    // es la única vez que el alumno espera trámites.
    //
    // Se ofrece, no se impone: quien no lo quiera ahora lo tiene en Ayuda ›
    // Sugerencias, con su botón, y la carpeta funciona igual sin ello. Decía
    // «en Histórico», que en la barra sencilla no existe (decisión 164).
    // Sin copias no hay nada que subir: no se pregunta.
    let fueAGitHub = false;
    if (!hecho.sinCopias && !(await github.estado()).conectado) {
      const ahora = await vscode.window.showInformationMessage(
        'Te queda una cosa: una cuenta de GitHub para guardar tu trabajo fuera de este ordenador. Si se rompe el portátil, lo recuperas. ¿Te la preparo ahora?',
        'Sí, ahora',
        'Más tarde',
      );
      if (ahora === 'Sí, ahora') {
        fueAGitHub = true;
        // Su sí es el permiso para subir (decisión 186): al volver del acceso del
        // editor, la copia sale sola, sin otros cuatro clics.
        this.subirAlVolver = { cuando: Date.now(), raiz: proyecto.raiz() };
        await this.verCopiaFuera({ delMontaje: true });
      } else {
        this.dejarElAviso(GITHUB_MAS_TARDE);
      }
    }

    // La cara, al momento y por la barra: ya tenemos la web, así que no hay
    // que esperar a que el asistente la mire —ni a que el alumno le dé a
    // enviar—. Lo que salga es un primer intento; al asistente se le pide que
    // lo afine, no que lo haga desde cero (decisión 103).
    const cara = hecho.web ? await this.sacarLaCara(hecho.web) : null;
    const conWeb = hecho.web ? `\n\n${marca.queLePedimos(hecho.web, Boolean(cara && cara.ok))}\n\n` : '';

    // Si la carpeta ya traía claves —un `.env` de antes, un `.env.local`—, el
    // plan de a dónde va cada una viaja en este primer mensaje: es cuando el
    // asistente está montando y cuando el alumno espera trámites. Antes solo
    // salía si alguien entraba en Conexiones y pulsaba (decisión 104). Ahora
    // va con los demás encargos del arranque, en `hecho.paraElMensaje` (A7).
    const comoSeLlama = hecho.nombres.arnes || identidad.deQuien();
    const primero = arrancar.primerMensaje(hecho, { comoSeLlama, conWeb, conFreno: arrancar.hayFreno() });
    // Sin sesión, la caja del asistente iba a pedir entrar y se comía el encargo
    // (decisión 186): se guarda hasta que se diga que ya está dentro. Sin poder
    // saberlo, como antes.
    // Y este montaje manda o aplaza solo el suyo: uno aplazado de antes ya no vale
    // y no sale después del nuevo con «Ya he entrado».
    sesionDelAsistente.soltar();
    const sesion = await sesionDelAsistente.haySesion(asistentes.elDeAhora(), { fresco: true });
    if (sesion === 'no') {
      sesionDelAsistente.aplazar(primero);
      this.dejarElAviso(PRIMERO_LA_CUENTA);
    } else {
      await this.mandarElPrimero(primero);
    }
    // Al final, la principal, con la tarjeta que toca y lo aplazado dicho; o la
    // lista, si algo se ha roto. Si fue a preparar la cuenta, se queda allí.
    await this.siFaltaAlgoDecirlo(!fueAGitHub);
    return undefined;
  }

  // Jose, sobre qué ver al terminar: «si está todo bien, ¿no debería ir a la
  // pantalla principal?». Eso. La lista de piezas solo sale cuando hay algo que
  // decir — y entonces sale con un botón por cada cosa, que es lo que le
  // faltaba a esa pantalla desde el principio.
  //
  // «Algo que decir» es algo roto de verdad (decisión 164). Sin conexiones, sin
  // conocimiento y sin copia fuera es como queda toda carpeta recién montada, y
  // por eso salía siempre una lista técnica de catorce filas en vez de la
  // principal. Eso llega con el trabajo (`porHacer` en `terreno.js`).
  async siFaltaAlgoDecirlo(refrescarSiEstaTodo) {
    const revision = await terreno.radiografia({ sigueSinCopias: this.eligioSinCopias() });
    if (!revision.algoRoto) {
      if (refrescarSiEstaTodo) await this.refrescar(true);
      return;
    }
    this.donde = { tipo: 'quieto' };
    this.enviar({ tipo: 'radiografia', origen: 'init', ...revision });
  }

  // La web se pregunta aquí, en una caja nativa, no mandándole a Claude un
  // párrafo pidiéndole que la pregunte él. Un dato que el alumno tiene en la
  // cabeza no necesita una conversación de ida y vuelta.
  async ponerLaCara() {
    const escrito = await vscode.window.showInputBox({
      title: 'Ponerle la cara de tu empresa',
      prompt: '¿Cuál es la web de tu empresa? De ahí saco los colores y el logotipo.',
      placeHolder: 'nexusconsulting.com',
      ignoreFocusOut: true,
    });
    const limpio = (escrito || '').trim();
    if (!limpio) return;

    const direccion = /^https?:\/\//i.test(limpio) ? limpio : `https://${limpio}`;
    const cara = await this.sacarLaCara(direccion);
    await this.pedir(marca.queLePedimos(direccion, cara.ok));
  }

  // La barra mira la web y deja un primer intento de cara; si lo consigue, se
  // ve al momento. Si no —sin red, web caída, una web sin color de marca— no
  // pasa nada: no se escribe nada y el asistente lo hará con calma.
  async sacarLaCara(direccion) {
    this.enviar({ tipo: 'esperando', que: 'Mirando tu web…' });
    const cara = await web.sacarLaCara(direccion);
    if (!cara.ok) this.salida.appendLine(`[cara] ${direccion}: ${cara.motivo}`); // diccionario: interno
    await this.refrescar(true);
    // Una escritura que falló se dice, con cuál y por qué (decisión 189); el resto de motivos, no.
    if (!cara.ok && cara.escritura) this.enviar({ tipo: 'aviso', texto: cara.escritura, malo: true });
    if (cara.ok) {
      this.enviar({
        tipo: 'aviso',
        texto: `Ya lleva la cara de ${cara.nombre}${cara.logo ? ', con su logotipo' : ''}. Le he pedido al asistente que la afine.${cara.logoSinGuardar ? ` ${cara.logoSinGuardar}` : ''}`,
      });
    }
    return cara;
  }

  // Elegir sobre qué carpeta se trabaja. Hace falta al arrancar —quien abre
  // esto sin nada abierto no tiene por dónde empezar— y después, para cambiar
  // de sitio sin tener que saber dónde está el menú de VS Code.

  // La carpeta de arriba, ya preparada: un proyecto de un monorepo se trabaja
  // desde su raíz (decisión 195). La ruta se vuelve a mirar aquí: del panel solo
  // llega que se pulsó. En esta misma ventana, como al elegir carpeta.
  async abrirLaDeArriba() {
    const arriba = terreno.queHayEncima(proyecto.raiz());
    if (!arriba || !arriba.conArnes) {
      this.dejarElAviso('No encuentro la carpeta de arriba. Pulsa «Elegir otra carpeta» y elígela.', { etiqueta: 'Elegir otra carpeta', accion: { tipo: 'elegirCarpeta' } });
      return this.refrescar(true);
    }
    return vscode.commands.executeCommand('vscode.openFolder', vscode.Uri.file(arriba.ruta), { forceNewWindow: false });
  }
  async elegirCarpeta() {
    const elegida = await vscode.window.showOpenDialog({
      canSelectFolders: true,
      canSelectFiles: false,
      canSelectMany: false,
      openLabel: 'Trabajar aquí',
      title: 'Elige la carpeta con la que quieres trabajar',
      defaultUri: proyecto.raiz() ? vscode.Uri.file(path.dirname(proyecto.raiz())) : undefined,
    });
    if (!elegida || !elegida.length) return;

    // Se apunta que la eligió aquí: al abrirla, si es nueva o vacía, empieza a
    // prepararla sin esperar otro botón (decisión 184).
    await arrancar.apuntarLaEleccion(elegida[0].fsPath);
    // Se abre en esta misma ventana: abrir otra deja al alumno con dos y sin
    // saber cuál es la suya.
    await vscode.commands.executeCommand('vscode.openFolder', elegida[0], { forceNewWindow: false });
  }

  // Lo que se eligió desde la barra, ya abierto (decisión 184). Elegir la carpeta
  // es decir «quiero trabajar aquí»: si es nueva o vacía y no es delicada, se
  // empieza a preparar como si se pulsara «Preparar esta carpeta». Va siempre
  // por `tomarLaEleccion`, que borra el apunte: abrir cualquier otra carpeta, o
  // esta mismo otro día, no empieza nada.
  async prepararLaQueSeEligio() {
    const eraLaElegida = await arrancar.tomarLaEleccion(proyecto.raiz());
    if (!eraLaElegida || vscode.workspace.isTrusted === false) return null;
    if (lasRespuestas.leer(this.contexto.workspaceState) || this.conElArnes()) return null;
    if (!arrancar.sePuedePrepararAlElegirla(terreno.mirarYClasificar())) {
      this.salida.appendLine('[elegida] no es nueva ni está vacía, o es delicada: se queda en su botón'); // diccionario: interno
      return null;
    }
    this.salida.appendLine('[elegida] carpeta nueva elegida desde la barra: se empieza a preparar'); // diccionario: interno
    return this.manejar({ tipo: 'arrancar' });
  }

  // ------------------------------------------------------ interruptor

  async verEditorCompleto() {
    const { ok, mensaje } = await disfraz.verEditorCompleto(this.contexto, this.salida);
    this.enviar({ tipo: 'aviso', texto: mensaje, malo: !ok });
    if (ok) {
      await this.refrescar(true);
      await disfraz.proponerReabrir('Para que se vea entero, hay que cerrar y abrir esta ventana.');
    }
  }

  // Al montar, se pregunta (decisión 187): cómo quiere ver su ventana es una
  // preferencia suya, no algo que la barra deba adivinar. Se puede ser alguien que
  // solo está mirando cómo funciona esto. Sin pregunta si ya está así.
  async preguntarLaVistaSencilla(hecho) {
    try {
      if (disfraz.quiereVistaSencilla()) return;
      const sencilla = await vscode.window.showInformationMessage(
        `${hecho.mensaje} ¿Dejo esta ventana en vista sencilla, sin barras ni ficheros a la vista?`,
        'Sí, más sencillo',
        'No, déjala como está',
      );
      if (sencilla === 'Sí, más sencillo') await this.modoSencillo();
    } catch (error) {
      this.salida.appendLine(`[vistaSencilla] ${error.message}`); // diccionario: interno
    }
  }

  // La copia sola, dicha una vez al montar (decisión 181). Va encendida de fábrica
  // desde la 164: aquí solo se cuenta, y solo si de verdad va a guardar en esta
  // carpeta (con historial nuestro y sin haber elegido seguir sin copias).
  async fraseDelGuardadoSolo(hecho) {
    if (hecho.sinCopias || this.eligioSinCopias()) return null;
    const horas = ajustes.cadaCuantoGuarda();
    if (!horas) return null;
    try {
      if (!(await terreno.podemosGuardarSolo())) return null;
    } catch {
      return null;
    }
    return `Guardo una copia sola ${horas === 1 ? 'cada hora' : 'un par de veces al día'}, mientras tengas esto abierto y haya algo nuevo.`;
  }

  frasePuestos(nombres) {
    const cuales = Array.isArray(nombres) ? nombres.filter(Boolean) : [];
    return cuales.length ? `He puesto ${cuales.join(' y ')} en este ordenador.` : null;
  }

  async modoSencillo() {
    const { mensaje } = await disfraz.volverAModoSencillo(this.contexto, this.salida);
    this.enviar({ tipo: 'aviso', texto: mensaje });
    await this.refrescar(true);
    await disfraz.proponerReabrir('Para que se aplique, hay que cerrar y abrir esta ventana.');
  }
}

// Decisión 190: los `setTimeout` sueltos del arranque se guardan para poder
// cancelarlos al cerrar (`deactivate`): uno que salta con la extensión ya cerrada
// toca cosas que ya no están.
const sueltos = new Set();
function luego(fn, ms) {
  const reloj = setTimeout(() => {
    sueltos.delete(reloj);
    fn();
  }, ms);
  sueltos.add(reloj);
  if (reloj.unref) reloj.unref();
  return reloj;
}

// El disfraz base se pone en el primer arranque. Las claves de Claude solo
// existen cuando su extensión ya está activa, así que lo que no entre se
// reintenta una vez.
async function vestir(contexto, salida) {
  const { primeraVez, aplicadas, pendientes } = await disfraz.aplicar(contexto, salida);
  if (pendientes.length) luego(() => disfraz.aplicar(contexto, salida).catch(() => {}), 8000);
  if (primeraVez && aplicadas) {
    await disfraz.proponerReabrir('Ya está todo preparado. Para que se vea bien, hay que cerrar y abrir de nuevo.');
  }
}

// El panel se ajusta al arnés conforme se monta. Cuando el asistente conecta
// una herramienta, crea un comando o escribe en la wiki, eso aparece solo: sin
// esto, el alumno tendría que cerrar y abrir para ver lo que acaba de pedir.
//
// Lo que se vigila es exactamente lo que el panel lee (ver `decisiones.md` §7).
//
// Y eso había dejado de ser verdad. Aquí estaba escrito `.claude/commands/*.md`
// y nada más de lo que escribe el asistente, cuando el panel lee además sus
// habilidades y sus ayudantes. Dos consecuencias, las dos silenciosas: una
// habilidad recién puesta no aparecía hasta cerrar y abrir, y en un arnés de
// Codex **no se vigilaba nada suyo**, porque sus cosas no viven en `.claude/`.
//
// Así que las carpetas del asistente se preguntan, no se escriben. Lo fijo es
// lo que no depende de él: la declaración, las herramientas y la wiki.
// Y los avisos para Executive Lab, que deja el asistente y la barra enseña.
const LO_FIJO = ['.rsc.json', '01-TOOLS/**', '02-DOCS/wiki/**', '02-DOCS/inbox/*', '02-DOCS/raw/avisos/*', '02-DOCS/raw/pedidos/*'];

// Relativa a la raíz, que es lo que quiere `RelativePattern`.
function suCarpeta(completa) {
  const raiz = proyecto.raiz();
  if (!completa || !raiz) return null;
  return path.relative(raiz, completa).split(path.sep).join('/');
}

function loQueMira() {
  const suyas = [
    donde.carpetaDeComandos(),
    donde.carpetaDeHabilidades(),
    // Las de botón, que con Codex van aparte (decisión 141).
    donde.carpetaDeBotones(),
    donde.carpetaDeAgentes(),
  ].map(suCarpeta).filter(Boolean).map((c) => `${c}/**`);

  const reglasDelAsistente = donde.paraQuien() === 'codex'
    ? ['AGENTS.md', 'AGENTS.override.md'] : ['CLAUDE.md'];
  // Y los registros del git de cada proyecto de un monorepo (decisión 195): una copia
  // nueva o una subida cambian cómo está, y si no, la barra no se enteraba.
  return `{${[...LO_FIJO, ...reglasDelAsistente, ...new Set(suyas), ...subproyectos.LOS_REGISTROS].join(',')}}`;
}

// Volver a vigilar lo del asistente de ahora. Cambiar de asistente ya no toca
// `.rsc.json` (la elección va aparte, E1), y era lo que rearmaba el vigía: sin
// esto se seguían vigilando las carpetas del anterior (revisión de F5, I4).
let vigilarOtraVez = () => {};
// Decisión 190: al cambiar la primera carpeta se vigila la nueva.
let vigilarOtraCarpeta = () => {};

function vigilarElArnes(contexto, panel) {
  const carpetaDeAhora = () => (vscode.workspace.workspaceFolders || [])[0];

  let vigia = null;
  let mirando = null;
  let reloj = null;

  // Una tanda de cambios (RSC escribe muchos ficheros de golpe) es un solo
  // repintado, no veinte.
  const alCambiar = (uri) => {
    // Un encargo largo que acaba de dejar la barra no cambia nada de lo que se ve
    // (decisión 166): repintar ahora solo movería la pantalla.
    if (pedidos.esUnEncargo(uri.fsPath)) return;
    // Un pedido del asistente se atiende ya, no en el repintado (decisión 150).
    if (pedidos.esUnPedido(uri.fsPath)) panel.atenderLosPedidos().catch((error) => panel.salida.appendLine(`[pedidos] ${error.message}`)); // diccionario: interno
    // En Windows `fsPath` va con «\»: `marca.esDeLaMarca` la pasa a «/» antes de
    // comparar, y el logotipo repinta igual que `marca.md` (decisiones 167 y 189).
    const esMarca = marca.esDeLaMarca(uri.fsPath);
    // El índice del buscador se hizo con lo que había antes de este cambio.
    buscador.olvidar();
    // Y cómo estaba un proyecto, si se ha movido su git (decisión 195).
    if (subproyectos.esDeUnRegistro(uri.fsPath)) subproyectos.olvidar();
    // Cambiar de asistente cambia dónde vive todo lo suyo, y eso se escribe en
    // `.rsc.json`. Sin rearmar, se seguirían vigilando las carpetas del
    // anterior: la barra dejaría de enterarse de lo que pasa en las de ahora.
    //
    // Se rearma **después** de este aviso, no durante: rearmar es tirar el
    // vigía que nos está llamando ahora mismo, y deshacerse de algo desde
    // dentro de su propio manejador es de esas cosas que van bien hasta que un
    // día no. Sale gratis esperar al siguiente tick.
    if (uri.fsPath.endsWith('.rsc.json') && loQueMira() !== mirando) setTimeout(armar, 0);
    clearTimeout(reloj);
    reloj = setTimeout(() => {
      // La marca cambia los colores y el logotipo, así que hay que rehacer la
      // página entera; lo demás se actualiza por mensaje.
      if (esMarca) panel.pintarPagina();
      panel.repintarLoQueHaya().catch(() => {});
    }, 600);
  };

  function armar() {
    if (vigia) vigia.dispose();
    vigia = null;
    const carpeta = carpetaDeAhora();
    if (!carpeta) return;
    mirando = loQueMira();
    vigia = vscode.workspace.createFileSystemWatcher(new vscode.RelativePattern(carpeta, mirando));
    vigia.onDidCreate(alCambiar);
    vigia.onDidChange(alCambiar);
    vigia.onDidDelete(alCambiar);
  }

  armar();
  vigilarOtraVez = () => { if (loQueMira() !== mirando) armar(); };
  vigilarOtraCarpeta = () => { clearTimeout(reloj); armar(); };
  contexto.subscriptions.push({ dispose: () => { clearTimeout(reloj); if (vigia) vigia.dispose(); } });
}

// En modo avanzado nuestra barra puede no estar a la vista, así que la vuelta
// al modo sencillo vive en la barra de estado, que sí se ve.
function vigilarElModo(contexto) {
  const boton = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
  boton.command = 'executiveLab.modoSencillo';
  boton.text = '$(circle-filled) Modo sencillo';
  boton.tooltip = 'Volver a la vista sencilla en esta ventana';
  boton.backgroundColor = new vscode.ThemeColor('statusBarItem.warningBackground');

  const repintar = () => {
    if (disfraz.modoDeEstaVentana() === 'avanzado') boton.show();
    else boton.hide();
  };
  repintar();

  contexto.subscriptions.push(boton, vscode.workspace.onDidChangeConfiguration(repintar));
  return repintar;
}

// Guardar solo, cada tanto.
//
// ── Por qué existe ───────────────────────────────────────────────────────
//
// Guardar era siempre a mano, y quien no se acuerda de pulsar el botón no
// tiene copias. Que es exactamente el público de esto: alguien que está
// pensando en sus facturas, no en su historial.
//
// ── Las tres cosas que NO hace, que son lo importante ────────────────────
//
//   · **No toca el historial de otra persona.** Si la carpeta ya venía con
//     trabajo de alguien, no se guarda nada solo: la decisión 28 lo dice para
//     el primer guardado y aquí vale igual, o con más razón, porque aquí no
//     hay nadie mirando. Ni en una carpeta sin historial propio, que git
//     guardaría en el del proyecto de arriba (decisión 164).
//   · **No guarda si no hay nada nuevo.** Una copia idéntica a la anterior es
//     ruido en una lista que alguien tiene que poder leer.
//   · **No avisa.** Una barra que interrumpe cada hora para decir que todo va
//     bien es una barra que se acaba cerrando. Si falla, se apunta en la salida
//     y ya; es un extra, no puede estropearle el rato a nadie.
//
// Desde la decisión 164 va encendido de fábrica, cada hora: lo pedía la
// propuesta de simplificar la barra («Nada se pierde»), y lo que lo frenaba, que
// lo pesado entrara en el historial, lo resolvió la 147. Las guardias, en
// `guardar.guardarSiToca`.
function guardarSolo(panel, salida) {
  // Se mira cada cuarto de hora y se guarda cuando toque: así cambiar el ajuste
  // no obliga a reiniciar nada, y un portátil que se suspende no pierde el turno.
  const MIRAR_CADA = 15 * 60 * 1000;
  let ultima = Date.now();
  // Decisión 190: si un guardado tarda más que el intervalo, el siguiente no
  // arranca otro a la vez.
  let guardando = false;

  const reloj = setInterval(async () => {
    if (guardando) return;
    guardando = true;
    try {
      const hecho = await copias.guardarSiToca({ horas: ajustes.cadaCuantoGuarda(), desde: ultima, sigueSinCopias: panel.eligioSinCopias() });
      if (hecho.hecho !== 'guardada') return;
      ultima = Date.now();
      if (!hecho.ok) salida.appendLine(`[guardarSolo] ${hecho.mensaje}`);
      else await panel.refrescar(true);
      // Lo que se quedó fuera por ser una credencial (F1): la pieza de las claves
      // fuera de sitio ya lo enseña; aquí, para «Algo va mal».
      if (hecho.excluidos && hecho.excluidos.length) salida.appendLine(`[guardarSolo] fuera de la copia: ${hecho.excluidos.join(', ')}`); // diccionario: interno
    } catch (error) {
      salida.appendLine(`[guardarSolo] ${error.stack || error.message}`);
    } finally {
      guardando = false;
    }
  }, MIRAR_CADA);

  // Que no sea este reloj lo que mantenga vivo el proceso. En el editor da
  // igual —la ventana sigue abierta de todos modos— pero sin esto las pruebas
  // se quedan colgadas para siempre al arrancar la extensión, que es como se
  // descubrió.
  if (typeof reloj.unref === 'function') reloj.unref();

  return { dispose: () => clearInterval(reloj) };
}

// El relevo vive en el almacén de la barra, fuera de la carpeta del alumno (P8).
const dondeVaElRelevo = (contexto) => (contexto.globalStorageUri ? path.join(contexto.globalStorageUri.fsPath, 'relevo') : null);

// En los ajustes de usuario de Claude, con `instalador/comun/control-remoto.js`:
// sin tocar nada más, y respetando lo que esa persona ya hubiera decidido.
function ponerElControlRemoto(salida) {
  try {
    const modulo = entorno.moduloComun('control-remoto');
    if (!modulo) return;
    const { hecho } = require(modulo).ponerElControlRemoto();
    salida.appendLine(`[control remoto] ${hecho}`); // diccionario: interno
  } catch (error) {
    salida.appendLine(`[control remoto] ${error.message}`); // diccionario: interno
  }
}

function activate(contexto) {
  // El canal se envuelve para que todo lo que apuntemos por dentro acabe
  // también en el informe de "Algo va mal": ver rastro.js.
  const salida = rastro.envolver(
    vscode.window.createOutputChannel('Executive Lab'),
    contexto.globalStorageUri && contexto.globalStorageUri.fsPath,
  );
  rsc.saberDondeEstamos(contexto.extensionPath);
  // Sin arnés, los avisos para Executive Lab esperan en el almacén de la barra,
  // como el informe de «Algo va mal».
  avisos.dondeSinArnes(contexto.globalStorageUri && contexto.globalStorageUri.fsPath);
  // Con qué asistente se habla en esta carpeta, elegido aquí (E1).
  asistentes.saberDondeGuardar(contexto.workspaceState);
  // Y dónde se apunta que la barra montó aquí esta carpeta (decisión 157).
  terreno.saberDondeRecordar(contexto.workspaceState);
  // Y lo contestado al preparar que espera a git (decisión 165).
  lasRespuestas.saberDondeGuardar(contexto.workspaceState);
  // Y la carpeta que se eligió desde la barra, que sobrevive a recargar la ventana (decisión 184).
  arrancar.saberDondeRecordarLaEleccion(contexto.globalState);
  buscador.saberDondeEstamos(contexto.extensionPath);

  // El relevo de Node, antes de que se abra el chat del asistente: así su
  // proceso y los enganches del arnés lo heredan (C2). Vive en el almacén de
  // la barra, fuera de la carpeta del alumno.
  // Si Claude ya estaba en marcha, su proceso no ve lo que se ponga ahora: se
  // apunta, y la pieza pide abrir la conversación otra vez (revisión de F3, I3).
  const claude = vscode.extensions.getExtension('anthropic.claude-code');
  const elRelevo = relevo.ponerAlActivar({
    carpeta: dondeVaElRelevo(contexto),
    ejecutable: entorno.node(),
    yaHabiaAsistente: Boolean(claude && claude.isActive),
  });
  salida.appendLine(`[relevo] ${elRelevo.modo}${elRelevo.carpeta ? ` en ${elRelevo.carpeta}` : ''}${elRelevo.error ? `: ${elRelevo.error}` : ''}`); // diccionario: interno
  // El control remoto de Claude, para todas las sesiones (decisión 143), como lo
  // ponen los instaladores: así también lo tiene quien solo instaló el .vsix.
  if (claude) ponerElControlRemoto(salida);
  // Para poder comparar los raíles de la carpeta con los que trae la barra.
  terreno.saberDondeEstamos(contexto.extensionPath);
  const panel = new Panel(contexto, salida);
  // Los recordatorios, cada minuto, y una vez al poco de abrir por si alguno tocó
  // con el editor cerrado (decisión 144).
  const mirar = () => panel.mirarLosRecordatorios().catch((error) => salida.appendLine(`[recordatorios] ${error.message}`)); // diccionario: interno
  const relojDeRecordatorios = setInterval(mirar, 60 * 1000);
  const primeraMirada = luego(mirar, 8000);
  // Que no sean ellos los que mantengan vivo el proceso: el editor ya lo hace.
  for (const reloj of [relojDeRecordatorios, primeraMirada]) if (reloj && reloj.unref) reloj.unref();
  contexto.subscriptions.push({ dispose: () => { clearInterval(relojDeRecordatorios); clearTimeout(primeraMirada); } });
  const comando = (id, fn) => vscode.commands.registerCommand(id, fn);
  const repintarModo = vigilarElModo(contexto);

  contexto.subscriptions.push(
    salida,
    guardarSolo(panel, salida),
    vscode.window.registerWebviewViewProvider('executiveLab.panel', panel),
    comando('executiveLab.refrescar', () => panel.refrescar(true)),
    comando('executiveLab.guardar', () => panel.guardarCopia()),
    comando('executiveLab.conexiones', () => panel.verConexiones()),
    comando('executiveLab.cerebro', () => panel.verCerebro()),
    comando('executiveLab.radiografia', () => panel.verRadiografia()),
    comando('executiveLab.saberes', () => panel.verSaberes()),
    comando('executiveLab.recordatorios', () => panel.verRecordatorios()),
    comando('executiveLab.salidas', () => panel.verSalidas()),
    comando('executiveLab.huecos', () => panel.verHuecos()),
    comando('executiveLab.papeles', () => panel.verPapeles()),
    comando('executiveLab.ayuda', () => panel.verAyuda()),
    comando('executiveLab.reglas', () => panel.verReglas()),
    comando('executiveLab.asistente', () => panel.verAsistente()),
    comando('executiveLab.comoTrabaja', () => panel.verComoTrabaja()),
    comando('executiveLab.fijadas', () => panel.verFijadas()),
    comando('executiveLab.laCara', () => panel.verLaCara()),
    comando('executiveLab.proyectos', () => panel.verProyectos()),
    comando('executiveLab.sugerencias', () => panel.verSugerencias()),
    comando('executiveLab.comandos', () => panel.verComandos()),
    comando('executiveLab.agentes', () => panel.verAgentes()),
    comando('executiveLab.diario', () => panel.verDiario()),
    comando('executiveLab.trato', () => panel.verTrato()),
    comando('executiveLab.copiaFuera', () => panel.verCopiaFuera()),
    comando('executiveLab.documentos', () => panel.anadirDocumentos()),
    comando('executiveLab.algoVaMal', () => panel.algoVaMal()),
    comando('executiveLab.empezarEmpresa', () => panel.manejar({ tipo: 'arrancar' })),
    comando('executiveLab.elegirCarpeta', () => panel.elegirCarpeta()),
    comando('executiveLab.ponerLaCara', () => panel.ponerLaCara()),
    comando('executiveLab.seguir', () => panel.pedir('Recuérdame en qué estábamos y sigamos por donde lo dejamos.')),
    comando('executiveLab.empezar', () => panel.pedir('Quiero empezar algo nuevo en mi empresa. Pregúntame qué necesito.')),
    comando('executiveLab.diagnosticoPuente', () => puente.diagnostico(salida)),
    comando('executiveLab.verEditorCompleto', async () => { await panel.verEditorCompleto(); repintarModo(); }),
    comando('executiveLab.modoSencillo', async () => { await panel.modoSencillo(); repintarModo(); }),
    comando('executiveLab.quitarDeTodo', async () => {
      const seguro = await vscode.window.showWarningMessage(
        'Voy a quitar el aspecto de Executive Lab de todas las ventanas, no solo de esta. Tus ajustes propios no se tocan.',
        { modal: true },
        'Quítalo',
      );
      if (seguro !== 'Quítalo') return;
      const { quitadas } = await disfraz.quitar(contexto, salida);
      repintarModo();
      await disfraz.proponerReabrir(`Quitado de ${quitadas} ajustes. Hay que cerrar y abrir para verlo.`);
    }),
  );

  vigilarElArnes(contexto, panel);

  // Decisión 190: si cambia la primera carpeta, el vigía mira la nueva y se
  // olvida lo que se sabía de la anterior (la brújula y la continuación). Sin
  // esto la barra seguía vigilando y rotulando la carpeta de antes.
  let primeraCarpeta = proyecto.raiz();
  contexto.subscriptions.push(vscode.workspace.onDidChangeWorkspaceFolders(() => {
    const ahora = proyecto.raiz();
    if (ahora === primeraCarpeta) return undefined;
    primeraCarpeta = ahora;
    brujula.olvidar();
    rsc.olvidarLaContinuacion();
    vigilarOtraCarpeta();
    return panel.refrescar(true).catch((e) => salida.appendLine(`[carpeta] ${e.message}`)); // diccionario: interno
  }));

  // El ajuste del asistente, cambiado con la barra abierta, se nota sin recargar
  // (decisión 158). Devuelve la promesa solo para que la prueba la pueda esperar.
  contexto.subscriptions.push(vscode.workspace.onDidChangeConfiguration((cambio) => {
    if (!cambio || typeof cambio.affectsConfiguration !== 'function' || !cambio.affectsConfiguration(asistentes.AJUSTE)) return undefined;
    return panel.alCambiarElAjuste().catch((e) => salida.appendLine(`[asistente] ${e.message}`)); // diccionario: interno
  }));

  // La barra de actividad está oculta por el disfraz, así que si no forzamos
  // nuestra vista el alumno se encuentra el explorador de ficheros delante.
  vscode.commands.executeCommand('executiveLab.panel.focus');

  // Y el chat de Claude ya abierto en el centro: el alumno no tiene que
  // buscarlo. Su extensión puede tardar en activarse; se le da un momento.
  luego(() => puente.abrirConversacion().catch(() => {}), 1500);

  // El disfraz se pone solo en una instalación de verdad. Quien prueba la
  // extensión desde el código no quiere que le desaparezca su editor: ahí se
  // pone a mano con "Volver al modo sencillo".
  if (contexto.extensionMode !== vscode.ExtensionMode.Development) {
    vestir(contexto, salida).catch((e) => salida.appendLine(`[disfraz] ${e.message}`));
  }

  // Y si esta carpeta se montó con una barra anterior, sus raíles son de
  // entonces: el asistente estaría leyendo las reglas de aquel día. Se repone
  // lo que la carpeta ya declaró tener, con la versión de ahora — reponer no
  // es decidir, así que va solo y sin preguntar (decisión 108). Callado: si
  // sale bien no hay nada que contarle a nadie, y si sale mal la lista de
  // piezas lo dice con su botón.
  luego(async () => {
    // Lo que una barra anterior dejó escrito en los enganches —la ruta del Node
    // de este ordenador, y la marca que la escondía de git— se deshace al abrir.
    // Es nuestro, y deshacerlo no es decidir (C3, decisión 119).
    arrancar.apuntarLosEnganches(salida).catch((e) => salida.appendLine(`[enganches] ${e.message}`)); // diccionario: interno
    if (!terreno.comoEstanLosRailes().alDia) {
      salida.appendLine('[railes] los de esta carpeta son de una versión anterior: se reponen'); // diccionario: interno
      await panel.ponerLosRailesAlDia(true).catch((e) => salida.appendLine(`[railes] ${e.message}`)); // diccionario: interno
    }
    // Lo de esta persona en los ajustes de Claude, y Codex con una versión que ya
    // no existe (decisión 157).
    await panel.ponerLoDeClaudeAlAbrir().catch((e) => salida.appendLine(`[claude] ${e.message}`)); // diccionario: interno
    // Los consejos de Claude se preguntan, no se quitan solos (decisión 187). Sin
    // esperar: la pregunta no tiene que parar lo demás.
    panel.preguntarLosConsejos().catch((e) => salida.appendLine(`[claude] ${e.message}`)); // diccionario: interno
    await panel.arreglarCodex().catch((e) => salida.appendLine(`[codex] ${e.message}`)); // diccionario: interno
    // Y el aviso al terminar de Codex, si se quiere (decisión 171): se ofrece, no se pone solo.
    await panel.ofrecerElAvisoDeCodex().catch((e) => salida.appendLine(`[codex] ${e.message}`)); // diccionario: interno
    // Y lo demás que debe hacerse solo, después de los raíles (P9).
    await panel.hacerSoloLoQueSePuede().catch((e) => salida.appendLine(`[solo] ${e.message}`)); // diccionario: interno
    // Y con «Los dos» en los ajustes, la carpeta también para el otro (decisión 158).
    await panel.prepararParaLosDos().catch((e) => salida.appendLine(`[losDos] ${e.message}`)); // diccionario: interno
    // Lo del asistente que deja el instalador, si falta (decisión 163).
    await panel.ponerLoDelEditor().catch((e) => salida.appendLine(`[editor] ${e.message}`)); // diccionario: interno
    // Lo que se ha dicho por el camino sale una vez, junto (decisión 157).
    panel.soltarElAviso();
    // Y lo que esperaba a git, si ya está: se termina con lo contestado
    // (decisión 165). Lo último, porque al terminar pregunta lo de siempre.
    await panel.retomarLaPreparacion().catch((e) => salida.appendLine(`[retomar] ${e.message}`)); // diccionario: interno
    // Y la carpeta que se eligió desde la barra, si es nueva (decisión 184).
    await panel.prepararLaQueSeEligio().catch((e) => salida.appendLine(`[elegida] ${e.message}`)); // diccionario: interno
  }, 3000);
}

// Al cerrar (decisión 190): se cancelan los relojes sueltos del arranque y se
// terminan los procesos que lanzó la barra y siguen vivos, solo los nuestros.
function deactivate() {
  for (const reloj of sueltos) clearTimeout(reloj);
  sueltos.clear();
  try { require('./procesos').terminarLosMios(); } catch { /* cerrando */ }
}

module.exports = { activate, deactivate };
