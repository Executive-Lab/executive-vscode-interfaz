// "Empezar una empresa aquí": el wizard, dentro del editor.
//
// Este es **el único** onboarding que hay. El instalador ya no monta nada: deja
// las piezas —editor, Node, git y las dos extensiones— y se acaba ahí. Antes
// montaba también un arnés en `Documentos/Mi Empresa IA`, con las mismas seis
// preguntas hechas dos veces, y había que mantener las dos a la par.
//
// El diccionario manda que ninguna pregunta se haga sin opciones: un campo de
// texto vacío delante de quien no sabe qué escribir es una pared.

const vscode = require('vscode');
const path = require('node:path');
const fs = require('node:fs');
const os = require('node:os');

const proyecto = require('./proyecto');
const { avisarConSalida } = require('./salida-del-aviso');
const procesos = require('./procesos');
const entorno = require('./entorno');
const git = require('./git');
const terreno = require('./terreno');
const rsc = require('./rsc');
const guardar = require('./guardar');
const identidad = require('./identidad');
const asistentes = require('./asistentes');
const rumbo = require('./rumbo');
const trato = require('./trato');
const ajena = require('./ajena');
const encargosDelAsistente = require('./encargos');
const ajustesLocales = require('./ajustes-locales');
const lasRespuestas = require('./respuestas');

// Las preguntas que hace RSC, en cristiano. Antes se daban por supuestas tres
// —siempre operaciones, siempre no técnico, siempre L3— y eso está mal: un
// arnés puede ser para llevar facturas o para montar una web, y quien lo usa
// puede ser el de administración o alguien que programó hace años.
//
// El orden importa: primero de qué va, porque de ahí sale todo lo demás.

const DE_QUE_VA = [
  { etiqueta: 'Llevar el día a día', detalle: 'Facturas, clientes, papeleo, proveedores', kind: 'operations' },
  { etiqueta: 'Crear cosas', detalle: 'Textos, vídeos, redes, presentaciones', kind: 'content' },
  { etiqueta: 'Construir algo', detalle: 'Una web, una automatización, una herramienta', kind: 'software' },
  { etiqueta: 'Estudiar un tema a fondo', detalle: 'Un sector, una competencia, una normativa', kind: 'research' },
  { etiqueta: 'Un poco de todo', detalle: 'Todavía no lo tengo claro', kind: 'mixed' },
];

// Las tres que se preguntan en vez de «¿es algo pequeño o va para largo?», que
// para quien empieza es difícil de decidir (C-21, decisión de Jose del
// 25-09-2026). Cada una contesta una sola cosa, y con un dato, no con una
// opinión:
//
//   · qué lleva la carpeta — de una tarea suelta a la empresa entera;
//   · cuánta gente hay detrás — no es lo mismo un departamento de tres que
//     uno de cincuenta;
//   · qué se va a construir — una landing no es una plataforma con usuarios.
//
// Solo la tercera va a RSC, como el tamaño del software: una empresa entera
// puede querer una landing. Las otras dos van al perfil, al nombre que se
// sugiere y al primer mensaje. Son información suya (decisión 187, que
// devuelve lo que la 184 había quitado): se le pregunta, no se adivina.
const QUE_LLEVA = [
  { etiqueta: 'Una tarea concreta', detalle: 'Preparar un informe, ordenar unos papeles, una web de una página', alcance: 'tarea' },
  { etiqueta: 'Un proyecto', detalle: 'Algo con principio y fin: un lanzamiento, una web con reservas, un estudio', alcance: 'proyecto' },
  { etiqueta: 'Un departamento o un área', detalle: 'Lo de todos los días de un equipo: facturación, personal, marketing', alcance: 'departamento' },
  { etiqueta: 'La empresa entera', detalle: 'Todas las áreas a la vez: ventas, facturas, personal, clientes', alcance: 'empresa' },
];

const CUANTAS_PERSONAS = [
  { etiqueta: 'Solo yo', personas: 'solo-yo' },
  { etiqueta: 'De 2 a 10', personas: '2-10' },
  { etiqueta: 'De 11 a 50', personas: '11-50' },
  { etiqueta: 'Más de 50', personas: 'mas-de-50' },
];

// Cada respuesta, con el tamaño que le toca en RSC. RSC solo distingue pequeño
// de no pequeño, y sube solo si el objetivo habla de pagos, cobros, bases de
// datos o integraciones: «No lo sé» empieza pequeño sin atar nada. «Nada, o casi
// nada» solo sale con «Un poco de todo»: con «Construir algo», algo se
// construye.
const QUE_VAS_A_CONSTRUIR = [
  { etiqueta: 'Nada, o casi nada', detalle: 'Aquí no voy a hacer webs ni automatizaciones', tamano: 'small', soloCon: 'mixed' },
  { etiqueta: 'Una cosa concreta', detalle: 'Una landing, una web de una página, un aviso por correo', tamano: 'small' },
  { etiqueta: 'Algo que irá sumando piezas', detalle: 'Una web con reservas, automatizaciones que se hablan entre sí', tamano: 'growing' },
  { etiqueta: 'Una plataforma completa', detalle: 'Con usuarios, varios idiomas y panel de administración', tamano: 'complex' },
  { etiqueta: 'No lo sé todavía', detalle: 'Empiezo sencillo, y si crece ya se ajusta', tamano: 'small' },
];

const COMO_TE_MANEJAS = [
  { etiqueta: 'Lo justo', detalle: 'El correo, Word y poco más', nivel: 'non-technical' },
  { etiqueta: 'Me defiendo', detalle: 'Me apaño con casi todo, pero no programo', nivel: 'mixed' },
  { etiqueta: 'Programo, o he programado', detalle: 'He escrito código alguna vez', nivel: 'technical' },
];

const OBJETIVOS_POR_TIPO = {
  operations: ['Poner orden en mis facturas', 'Atender mejor a mis clientes', 'Organizar el papeleo', 'Vender más y hacer seguimiento', 'Quitarme tareas repetitivas'],
  content: ['Escribir para mi web o mi blog', 'Llevar las redes sociales', 'Preparar presentaciones', 'Hacer vídeos'],
  software: ['Montar una web sencilla', 'Automatizar algo que hago a mano', 'Conectar dos herramientas que ya uso'],
  research: ['Entender a mi competencia', 'Estudiar una normativa que me afecta', 'Buscar oportunidades en mi sector'],
  mixed: ['Poner orden en mis facturas', 'Atender mejor a mis clientes', 'Escribir para mi web', 'Automatizar algo que hago a mano'],
};

// Un elegir con descripción debajo de cada opción: en una lista pelada, la
// mitad de las opciones no se entienden sin un ejemplo.
async function elegir(titulo, pregunta, opciones, extra = []) {
  const elegida = await vscode.window.showQuickPick(
    [...opciones.map((o) => ({ label: o.etiqueta, detail: o.detalle, valor: o })), ...extra],
    { title: titulo, placeHolder: pregunta, ignoreFocusOut: true, matchOnDetail: true },
  );
  return elegida ? (elegida.valor !== undefined ? elegida.valor : elegida) : null;
}

// En una carpeta que ya tiene algo, lo primero que se sugiere es seguir con lo
// que hay (A5): los objetivos de una carpeta vacía no hablan de ella.
const SEGUIR_CON_LO_QUE_HAY = 'Seguir con lo que ya hay';

async function preguntarObjetivo(kind, { empezada = false } = {}) {
  const OTRA = { label: 'Otra cosa — te la cuento yo', otra: true };
  const deSuTipo = OBJETIVOS_POR_TIPO[kind] || OBJETIVOS_POR_TIPO.mixed;
  const sugeridos = (empezada ? [SEGUIR_CON_LO_QUE_HAY, ...deSuTipo] : deSuTipo).map((e) => ({ etiqueta: e }));

  const elegido = await elegir('Para empezar', '¿Qué te gustaría resolver primero?', sugeridos, [OTRA]);
  if (!elegido) return null;
  if (!elegido.otra) return elegido.etiqueta;

  const escrito = await vscode.window.showInputBox({
    title: 'Para empezar',
    prompt: 'Cuéntamelo con tus palabras. Da igual si luego cambias de idea.',
    placeHolder: 'Por ejemplo: llevar los contratos de mis proveedores',
    ignoreFocusOut: true,
  });
  return escrito && escrito.trim() ? escrito.trim() : null;
}

// Con qué asistente va a trabajar. Solo se pregunta si hay más de uno
// instalado: si solo tiene uno, preguntarlo es una pantalla de más. Y si ya lo
// dijo en los ajustes, no se pregunta (decisión 158).
async function preguntarAsistente() {
  const ajuste = asistentes.elAjuste();
  if (ajuste !== 'automatico') return conElAjuste(ajuste);
  const puestos = asistentes.ASISTENTES.filter(asistentes.estaInstalado);
  if (puestos.length === 1) return puestos[0].id;
  if (!puestos.length) return ponerUnAsistente();

  const elegido = await vscode.window.showQuickPick(
    puestos.map((a) => ({ label: a.nombre, id: a.id })),
    { title: 'Con quién vas a trabajar', placeHolder: 'Tienes los dos instalados: elige uno', ignoreFocusOut: true },
  );
  return elegido ? elegido.id : null;
}

// Sin ningún asistente en el ordenador no se monta para uno que no está: se
// pregunta cuál y se pone con un botón (A9). Antes se montaba para Claude en
// silencio, y después la barra decía «díselo a tu tutor».
async function ponerUnAsistente() {
  const opciones = asistentes.ASISTENTES.map((a) => ({ boton: `Poner ${a.nombre}`, asistente: a }));
  const elegido = await vscode.window.showWarningMessage(
    'No tienes ningún asistente en este ordenador. ¿Cuál pongo?',
    { modal: true },
    ...opciones.map((o) => o.boton),
  );
  const cual = opciones.find((o) => o.boton === elegido);
  if (!cual) return null;
  if (!(await ponerElAsistente(cual.asistente))) return null;
  puestosSolos.push(cual.asistente.nombre);
  return cual.asistente.id;
}

// Ponerlo en el ordenador, con su botón ya pulsado. Si no se puede, se dice, salvo
// que lo diga quien llama (`callado`).
async function ponerElAsistente(asistente, { callado = false } = {}) {
  try {
    await vscode.commands.executeCommand('workbench.extensions.installExtension', asistente.extension);
    return true;
  } catch {
    if (!callado) await avisarConSalida(`No he podido poner ${asistente.nombre}. Pulsa «Algo va mal» y pásale el código a tu tutor.`);
    return false;
  }
}

// Los asistentes que la barra ha puesto sola en este ordenador al montar, para
// decirlo al terminar (decisión 181). Se vacía al darlos (`losQueSePusieron`).
const puestosSolos = [];
const losQueSePusieron = () => puestosSolos.splice(0);

// Lo que dice el ajuste (decisión 158): para uno, o para los dos, sin preguntar.
// Si falta alguno en este ordenador se pone sin preguntar (decisión 181): es una
// extensión del editor, gratis y se quita cuando se quiera, y lo pidió la persona
// en los ajustes. Se dice al terminar el montaje. Si no se puede, se dice con un
// botón para intentarlo otra vez, y con el que sí está se puede seguir. Devuelve
// lo que va a `--target`: un asistente, o los dos separados por una coma, que RSC
// acepta así.
async function conElAjuste(ajuste) {
  const queridos = ajuste === 'losDos' ? asistentes.ASISTENTES : [asistentes.porId(ajuste)].filter(Boolean);
  const losIds = (cuales) => cuales.map((a) => a.id).join(',');
  const faltan = queridos.filter((a) => !asistentes.estaInstalado(a));
  if (!faltan.length) return losIds(queridos);

  const ponerLos = async (cuales) => {
    const fallan = [];
    for (const asistente of cuales) {
      if (await ponerElAsistente(asistente, { callado: true })) puestosSolos.push(asistente.nombre);
      else fallan.push(asistente);
    }
    return fallan;
  };
  let fallan = await ponerLos(faltan);
  if (fallan.length) {
    const sigue = queridos.filter((a) => !fallan.includes(a));
    const noSePuso = `No he podido poner ${fallan.map((a) => a.nombre).join(' ni ')}`;
    const texto = sigue.length
      ? `${noSePuso}: sigo solo con ${sigue[0].nombre}. Si quieres, lo intento otra vez.`
      : `${noSePuso}. Si quieres, lo intento otra vez.`;
    const ahora = fallan.length > 1 ? 'Ponerlos ahora' : 'Ponerlo ahora';
    if (await vscode.window.showWarningMessage(texto, ahora) === ahora) fallan = await ponerLos(fallan);
  }
  const hay = queridos.filter((a) => !fallan.includes(a));
  if (!hay.length) {
    await avisarConSalida(`No he podido poner ${fallan.map((a) => a.nombre).join(' ni ')}. Pulsa «Algo va mal» y pásale el código a tu tutor.`);
    return null;
  }
  return losIds(hay);
}

// Cómo se llama esto. Dos nombres, y los pone el alumno: para qué es esta
// carpeta, y de quién es. Un arnés no es "una empresa" — una empresa puede
// tener cuatro, uno para contabilidad, otro para el personal, otro para
// marketing.
//
// La pregunta sale de lo que lleva la carpeta: una tarea se llama como la
// tarea, y un departamento, como el departamento. Con «La empresa entera» los
// dos nombres son el mismo, así que se pregunta una vez.
const COMO_SE_LLAMA = {
  tarea: { prompt: '¿Cómo llamamos a esta tarea?', placeHolder: 'El informe de ventas · La mudanza de la oficina' },
  proyecto: { prompt: '¿Cómo se llama el proyecto?', placeHolder: 'Lanzamiento de otoño · Web nueva' },
  departamento: { prompt: '¿Cómo se llama el departamento o el área?', placeHolder: 'Contabilidad · Personal · Marketing · Clientes' },
};
const COMO_SE_LLAMA_SIN_ALCANCE = { prompt: '¿Cómo llamamos a esto?', placeHolder: 'Contabilidad · Personal · Marketing · Clientes · el proyecto que sea' };

async function preguntarNombres(objetivo, alcance) {
  if (alcance === 'empresa') {
    const suya = await vscode.window.showInputBox({
      title: 'Ponle nombre',
      prompt: '¿Cómo se llama tu empresa? Es el nombre que verás arriba cada vez que lo abras.',
      placeHolder: 'Nexus Consulting',
      ignoreFocusOut: true,
    });
    if (!suya || !suya.trim()) return null;
    return { arnes: suya.trim(), empresa: suya.trim() };
  }

  const como = COMO_SE_LLAMA[alcance] || COMO_SE_LLAMA_SIN_ALCANCE;
  const arnes = await vscode.window.showInputBox({
    title: 'Ponle nombre',
    prompt: `${como.prompt} Es el nombre que verás arriba cada vez que lo abras.`,
    placeHolder: como.placeHolder,
    // Lo que sale del objetivo son nombres de área —Facturación, Clientes—. A
    // una tarea o a un proyecto no les valen, y una caja vacía es mejor que un
    // nombre equivocado.
    // Viene rellenado con el de la carpeta (decisión 184): quien no quiera
    // pensar le da a Intro, y quien quiera otro lo cambia.
    value: nombreDeLaCarpeta() || (!alcance || alcance === 'departamento' ? sugerirNombre(objetivo) : ''),
    ignoreFocusOut: true,
  });
  if (!arnes || !arnes.trim()) return null;

  const empresa = await vscode.window.showInputBox({
    title: 'Ponle nombre',
    prompt: '¿Y cómo se llama tu empresa? Para saber de quién es todo esto.',
    placeHolder: 'Nexus Consulting — o déjalo en blanco',
    ignoreFocusOut: true,
  });

  return { arnes: arnes.trim(), empresa: (empresa || '').trim() || null };
}

// El nombre de la carpeta, dicho como una persona: sin guiones ni subrayados,
// con la primera en mayúscula. «mi-tienda_2026» sale «Mi tienda 2026». Vacío si
// no hay carpeta o no queda nada legible.
function nombreDeLaCarpeta(raiz = proyecto.raiz()) {
  if (!raiz) return '';
  const limpio = path.basename(raiz).replace(/[-_.]+/g, ' ').replace(/\s+/g, ' ').trim();
  return limpio ? `${limpio.charAt(0).toUpperCase()}${limpio.slice(1)}` : '';
}

// Del objetivo elegido sale un nombre razonable, para no dejar la caja vacía.
function sugerirNombre(objetivo) {
  const porObjetivo = [
    [/factur|cobr/i, 'Facturación'],
    [/client/i, 'Clientes'],
    [/document/i, 'Documentos'],
    [/vender|venta|seguimiento/i, 'Ventas'],
    [/repetitiv|tarea/i, 'Operativa'],
    [/contrat|papeleo|gente|personal/i, 'Personal'],
  ];
  const [, nombre] = porObjetivo.find(([patron]) => patron.test(objetivo)) || [];
  return nombre || '';
}

// La web de la empresa. Es opcional y se puede dejar en blanco: de ella salen
// los colores y el logotipo del panel, y lo primero que el asistente sabrá de
// a qué se dedica. Quien no tenga web, sigue sin ella.
async function preguntarWeb() {
  const escrito = await vscode.window.showInputBox({
    title: 'Para empezar',
    prompt: '¿Tiene web tu empresa? Así cojo sus colores y su logotipo, y me entero de a qué os dedicáis.',
    placeHolder: 'ferreteriasoler.es — o déjalo en blanco si no tenéis',
    ignoreFocusOut: true,
  });

  const limpio = (escrito || '').trim();
  if (!limpio) return null;
  return /^https?:\/\//i.test(limpio) ? limpio : `https://${limpio}`;
}

// El arnés, en los dos pasos que RSC exige: primero enseña el plan y su
// huella, y solo escribe cuando se le devuelve esa misma huella. La línea de
// aceptación se reutiliza tal cual la imprime RSC —con el objetivo en base64 y
// los mismos flags— para que la huella no pueda dejar de coincidir.
// El parte de un intento fallido, entero y en un solo sitio.
//
// Antes se guardaba `error || salida`: cuando el arnés escribía el motivo en
// la salida normal y dejaba el canal de errores vacío —que es lo que hace, por
// ejemplo, cuando el suelo se queda a medias— el parte se quedaba con lo que
// no servía. Y nunca llevaba el código de salida, que es lo primero que mira
// quien lo lee. Van las dos cosas y las dos salidas, siempre.
function loQuePaso(cuando, intento) {
  return [
    `${cuando}: el arnés terminó con el código ${intento.codigo}`,
    `  lo que escribió:  ${(intento.salida || '(nada)').trim() || '(nada)'}`,
    `  y como error:     ${(intento.error || '(nada)').trim() || '(nada)'}`,
  ].join('\n');
}

// Lo que se le manda a RSC, sacado de las respuestas. Va aparte para que la
// prueba de contrato le pase a RSC exactamente lo mismo que le pasa el montaje.
//
// El objetivo va en base64, como lo escribe el propio RSC en su línea de
// aceptación. Escrito a mano puede llevar cualquier cosa, y en el camino de
// reserva de Windows pasa por cmd.exe, donde `& | ^ %` significan algo (A10).
function flagsDelMontaje(respuestas) {
  const flags = [
    '--technical-level', respuestas.nivel,
    '--project-kind', respuestas.kind,
    '--goal-base64', Buffer.from(String(respuestas.objetivo || ''), 'utf8').toString('base64url'),
    '--target', respuestas.asistente,
  ];
  // RSC pide el tamaño cuando se trata de construir algo, del todo o en parte, y
  // con él cómo entran los cambios: en las carpetas de la barra, siempre a `main`,
  // como se dijo en clase. Si no se le dice, con «Una plataforma completa» elige
  // ramas y cierra `main` al asistente (decisión 145).
  if (rumbo.CON_TAMANO.includes(respuestas.kind)) flags.push('--software-scope', respuestas.tamano || 'small', '--workflow', 'main');
  return flags;
}

// Lo que se cuenta en el parte según cómo acabó. `Listo` y `SueloAMedias` no
// llegan aquí: los dos son un arnés montado.
const CUANDO_FALLO = {
  Deshecho: 'el arnés falló a mitad y lo deshizo',
  PlanCambiado: 'el plan cambió entre que se vio y se aceptó',
  Invalido: 'el arnés no aceptó lo que se le mandó',
};

// En una carpeta de alguien, antes de aceptar el plan se enseña qué de lo suyo
// va a tocar, y se pregunta por lo que se llame igual que algo del arnés (B4).
async function montarElArnes(respuestas, { ajenaCarpeta = false, reciboAnterior = null } = {}) {
  const flags = flagsDelMontaje(respuestas);
  const perfilAntes = leerElPerfil();
  const pedirElPlan = async () => {
    const previo = await rsc.correr(['onboard', ...flags], { tiempoMaximo: 600000 });
    return { previo, plan: rsc.leerElPlanEnSeco(previo.salida) };
  };

  let { previo, plan } = await pedirElPlan();
  if (!plan.planId) return { ok: false, forma: 'SinPlan', detalle: loQuePaso('al pedir el plan', previo) };

  let renombrados = [];
  if (ajenaCarpeta) {
    const decidido = await confirmarLoQueSeToca(plan);
    if (!decidido.seguir) return { ok: false, forma: 'SinPermiso', cancelado: true, detalle: 'no quiso montar sobre lo suyo' };
    if (decidido.fallo) {
      return {
        ok: false,
        forma: 'NoSeRenombro',
        detalle: `no se pudo renombrar ${decidido.fallo.fichero}: ${decidido.error}`, // diccionario: interno
        mensaje: `No he podido cambiarle el nombre a «${decidido.fallo.id}», así que no he montado nada. Pulsa «Algo va mal» y pásale el código a tu tutor.`,
      };
    }
    renombrados = decidido.renombrados;
    // Lo que hay en disco ha cambiado, y la huella del plan depende de ello:
    // se vuelve a pedir antes de firmar.
    if (renombrados.length) {
      ({ previo, plan } = await pedirElPlan());
      if (!plan.planId) return { ok: false, forma: 'SinPlan', detalle: loQuePaso('al pedir el plan otra vez', previo) };
    }
  }

  // Volver a montar no firma por nadie (A12, decisión 95): si el plan nuevo
  // cambia lo que se instala, se enseña y se pide el sí. Si solo cambia la
  // huella, se acepta.
  if (reciboAnterior && !(await confirmarLoQueCambia(plan, reciboAnterior))) {
    return { ok: false, forma: 'SinPermiso', cancelado: true, detalle: 'no quiso cambiar lo montado' };
  }

  // Se reutiliza la línea de aceptación tal cual la imprime RSC —con el
  // objetivo en base64 y los mismos flags— para que la huella no pueda dejar
  // de coincidir.
  const huella = plan.planId;
  const aceptar = plan.aceptar.length ? plan.aceptar : [...flags, '--accept-plan', huella];

  const aplicado = await rsc.correr(['onboard', ...aceptar], { tiempoMaximo: 900000 });

  // Montado es montado aunque falte el suelo: con la cadena SDD siempre faltan
  // los innegociables, que no escribe RSC sino el asistente. Lo que falta se
  // devuelve para levantarlo después, sin dejar de poner lo nuestro. La huella
  // tiene que ser la que se enseñó y la que RSC dejó en el recibo.
  const recibo = (proyecto.declaracion() || {}).onboarding || {};
  const como = rsc.comoAcaboElMontaje(aplicado, { planId: huella, aceptado: recibo.acceptedPlanId });
  if (como.forma === 'Listo' || como.forma === 'SueloAMedias') devolverAlPerfil(perfilAntes);
  if (como.forma === 'Listo') return { ok: true, forma: 'Listo', renombrados };
  if (como.forma === 'SueloAMedias') return { ok: true, forma: 'SueloAMedias', faltan: como.faltan, renombrados };
  return { ok: false, forma: como.forma, detalle: loQuePaso(CUANDO_FALLO[como.forma] || 'al aplicar el plan', aplicado) };
}

// ── Lo de alguien, antes de firmar ──────────────────────────────────────

const CADA_UNA = {
  habilidad: { una: 'una habilidad', la: 'la habilidad', igual: 'igual que una del arnés' },
  comando: { una: 'un comando', la: 'el comando', igual: 'igual que uno del arnés' },
  agente: { una: 'un agente', la: 'el agente', igual: 'igual que uno del arnés' },
};

// «a, b y c»
const enLista = (cosas) => (cosas.length < 2 ? cosas.join('') : `${cosas.slice(0, -1).join(', ')} y ${cosas[cosas.length - 1]}`);
const cualEs = (choque) => `${CADA_UNA[choque.que].la} «${choque.id}»`;

// Un choque, de uno en uno: 'renombrar', 'dejar' o null (no montar nada).
async function preguntarPorUnChoque(choque) {
  const habilidad = choque.que === 'habilidad';
  const renombrar = habilidad ? 'Cambiarle el nombre a la mía' : 'Cambiarle el nombre al mío';
  const dejar = habilidad ? 'Que la del arnés ocupe su sitio' : 'Dejar el mío';
  const detail = habilidad
    ? `Si le cambias el nombre, la tuya pasa a llamarse ${choque.sugerido}. Si la del arnés ocupa su sitio, la tuya queda en las copias que guarda el arnés.`
    : `Si le cambias el nombre, el tuyo pasa a llamarse ${choque.sugerido} y se pone también el del arnés. Si lo dejas, el tuyo se queda como está y el del arnés no se pone.`;
  const elegido = await vscode.window.showWarningMessage(
    `Ya tienes ${CADA_UNA[choque.que].una} que se llama «${choque.id}», ${CADA_UNA[choque.que].igual}.`,
    { modal: true, detail },
    renombrar,
    dejar,
    'No montar nada',
  );
  if (elegido === renombrar) return 'renombrar';
  if (elegido === dejar) return 'dejar';
  return null;
}

// El resumen y el sí, y después los choques. Devuelve si se sigue, y lo que se
// renombró, o el fallo.
async function confirmarLoQueSeToca(plan) {
  // Sin nadie delante no se monta encima de lo suyo (P4, P9).
  if (momento.nadieDelante) return { seguir: false };
  const raiz = proyecto.raiz();
  const { tocados, choques } = ajena.resumen(plan, raiz);

  // Sin nada más que tocar, lo que choca es lo que se toca: la suya puede
  // acabar en las copias del arnés (revisión de F2, m10).
  const loQueToco = tocados.length ? tocados.map((t) => t.enCristiano) : choques.map(cualEs);
  const mensaje = loQueToco.length
    ? `Aquí ya hay cosas tuyas. Para montar el arnés voy a tocar esto: ${enLista(loQueToco)}. No borro nada tuyo.`
    : 'Aquí ya hay cosas tuyas. Para montar el arnés solo añado cosas: no toco nada tuyo.';
  const detail = !choques.length ? undefined : (choques.length === 1
    ? `Y hay una cosa tuya que se llama igual que una del arnés: ${cualEs(choques[0])}. Ahora te pregunto qué hago con ella.`
    : `Y hay ${choques.length} cosas tuyas que se llaman igual que unas del arnés: ${enLista(choques.map(cualEs))}. Ahora te pregunto qué hago con ellas.`);

  const si = 'Sí, móntalo encima';
  const conSi = await vscode.window.showInformationMessage(mensaje, { modal: true, ...(detail ? { detail } : {}) }, si, 'No, déjalo');
  if (conSi !== si) return { seguir: false };
  if (!choques.length) return { seguir: true, renombrados: [] };

  // Varios a la vez: lo mismo para todas, o una a una (C-3).
  const elecciones = {};
  if (choques.length > 1) {
    const todas = 'Cambiarles el nombre a todas';
    const unaAUna = 'Elegir una a una';
    const global = await vscode.window.showWarningMessage(
      `Tienes ${choques.length} cosas tuyas que se llaman igual que unas del arnés: ${enLista(choques.map(cualEs))}.`,
      { modal: true },
      todas,
      unaAUna,
      'No montar nada',
    );
    if (global === todas) choques.forEach((c) => { elecciones[c.fichero] = 'renombrar'; });
    else if (global !== unaAUna) return { seguir: false };
  }
  for (const choque of choques) {
    if (elecciones[choque.fichero]) continue;
    const eleccion = await preguntarPorUnChoque(choque);
    if (!eleccion) return { seguir: false };
    elecciones[choque.fichero] = eleccion;
  }

  const hecho = ajena.resolver(choques, elecciones, raiz);
  if (!hecho.ok) return { seguir: true, fallo: hecho.fallo, error: hecho.error };
  return { seguir: true, renombrados: hecho.renombrados };
}

// Las piezas de un plan, dichas en cristiano, y en este orden. Las claves son
// las de RSC 2.0.5, medidas con el paquete (revisión de F2, C2): la cadena SDD
// llega como `skill/sdd`, y los agentes, uno a uno. `workflow/sdd` y
// `agent/base-agents` solo salen aplazadas, pero un recibo de antes puede
// traerlas.
const PIEZAS_DEL_PLAN = {
  'skill/sdd': 'trabajar por pasos (especificar, planificar y hacer)',
  'workflow/sdd': 'trabajar por pasos (especificar, planificar y hacer)',
  'hook/code-hooks': 'las comprobaciones antes de cada orden',
  'agent/base-agents': 'los agentes que revisan',
  'guard/gitmoji-guard': 'Formato al guardar en git',
  'capability/memory': 'La memoria entre conversaciones',
  'route/harness-documents': 'el perfil y las decisiones del arnés',
};

// Lo que cambia, en frases: lo de la tabla de arriba, cada cosa una vez; las
// habilidades y los agentes, juntos y cada uno por su nombre. Los agentes se
// buscan entre los agentes: buscados entre las habilidades salían en inglés.
function comoSeDiceLoQueCambia(claves) {
  const nombres = require('./nombres');
  const dichas = [...new Set(Object.keys(PIEZAS_DEL_PLAN).filter((k) => claves.includes(k)).map((k) => PIEZAS_DEL_PLAN[k]))];
  const habilidades = [];
  const agentes = [];
  for (const clave of claves) {
    if (PIEZAS_DEL_PLAN[clave]) continue;
    const [kind, id] = clave.split('/');
    if (kind === 'agent') agentes.push(`«${nombres.comoSeLlama('ayudantes', id, {}).nombre}»`);
    else habilidades.push(`«${nombres.comoSeLlama(kind === 'skill' ? 'habilidades' : 'automatismos', id, {}).nombre}»`);
  }
  return [
    ...dichas,
    ...(habilidades.length ? [`${habilidades.length === 1 ? 'la habilidad' : 'las habilidades'} ${enLista(habilidades)}`] : []),
    ...(agentes.length ? [`${agentes.length === 1 ? 'el agente' : 'los agentes'} ${enLista(agentes)}`] : []),
  ];
}

async function confirmarLoQueCambia(plan, recibo) {
  const cambios = rsc.cambiosDePolitica(plan.seleccionados, recibo.decisions);
  // Sin nadie delante, solo se firma lo que se puede comparar y no cambia nada:
  // un recibo que no se puede comparar no es un plan sin cambios (A12, P9;
  // revisión de corrección, 2).
  if (momento.nadieDelante) return Boolean(cambios) && !cambios.entran.length && !cambios.salen.length;
  if (!cambios || (!cambios.entran.length && !cambios.salen.length)) return true;
  const partes = [
    ...(cambios.entran.length ? [`añadir ${enLista(comoSeDiceLoQueCambia(cambios.entran))}`] : []),
    ...(cambios.salen.length ? [`quitar ${enLista(comoSeDiceLoQueCambia(cambios.salen))}`] : []),
  ];
  const si = 'Sí, acéptalo';
  const elegido = await vscode.window.showWarningMessage(
    `El arnés quiere cambiar lo que tiene montado: ${partes.join('; ')}. ¿Lo acepto?`,
    { modal: true },
    si,
    'No, déjalo como está',
  );
  return elegido === si;
}

// Lo que se renombró, dicho al terminar: con su nombre nuevo es como se pide.
const loQueSeRenombro = (renombrados = []) => renombrados
  .map((r) => ` Tu ${r.que === 'habilidad' ? 'habilidad' : r.que} «${r.id}» ahora se llama «${r.ahora}».`)
  .join('');

// Los raíles viajan dentro de la extensión: mismo `aplicar.js` que usa el
// instalador, así que no hay dos versiones de lo que significa "poner los
// raíles".
// `ajena`: el historial de esta carpeta no lo creó la barra, y lo que toca
// ficheros suyos se queda pendiente (C-4). `ponerFreno` y `ponerBloque`: el
// sí a cada una de esas piezas.
//
// Y, con sí o sin él, si su historial no lo creó la barra (decisión 161): los
// raíles no apagan lo que RSC apunta en `.rsc.json` como decisión de su equipo.
// El sí a montar encima es a tocar sus ficheros, no a decidir por su equipo, y
// con él `ajena` llega a falso. `aplicar.js` lo mira también, con el mismo
// código (`historial-ajeno.js`) y el git de la barra; esto es el refuerzo, y que no
// se lo salte ningún camino que pone los raíles.
async function ponerLosRailes(contexto, { ajena = false, ponerFreno = false, ponerBloque = false } = {}) {
  const aplicar = path.join(contexto.extensionPath, 'media', 'railes', 'aplicar.js');
  if (!fs.existsSync(aplicar)) return false;
  const historialAjeno = !(await terreno.podemosGuardarElPuntoDePartida());
  const banderas = [...(ajena ? ['--ajena'] : []), ...(historialAjeno ? ['--historial-ajeno'] : []), ...(ponerFreno ? ['--poner-freno'] : []), ...(ponerBloque ? ['--poner-bloque'] : []), '--git', entorno.git()];
  const { codigo } = await procesos.node([aplicar, proyecto.raiz(), ...banderas], { tiempoMaximo: 60000 });
  return codigo === 0;
}

// Lo de esta persona en los ajustes de Claude de esta carpeta (decisión 157): que
// le hable en español, que le pregunte antes de subir a GitHub y, desde la 162, que
// le avise cuando termina o le necesita. Al montar y, en
// las carpetas que ya estaban montadas, al abrir. Solo en una carpeta cuyo
// historial creó la barra, como la rama principal abierta (P4), y que se montó en
// este ordenador (`terreno.montadaAqui`): en la de alguien, o en un clon, sus
// ajustes y su forma de trabajar son suyos. Si el fichero está en git, lo mira
// el git de la barra, y solo si se puede usar (en un Mac sin las herramientas de
// Apple, `git` a secas abre su diálogo).
async function estaEnGitConLaBarra(donde, relativo) {
  if (!fs.existsSync(path.join(donde, '.git'))) return false;
  if (!(await git.hay())) return null;
  const { codigo, salida } = await procesos.git('ls-files', '--', relativo);
  return codigo === 0 ? Boolean(salida.trim()) : null;
}

async function ponerLoDeClaude() {
  const raiz = proyecto.raiz();
  if (!raiz) return { hecho: 'sinCarpeta' };
  if (!(await terreno.montadaAqui())) return { hecho: 'noSeMontoAqui' };
  return ajustesLocales.ponerLosDeLaBarra({ raiz, estaEnGit: estaEnGitConLaBarra });
}

// «Quitarlo», desde el aviso que lo cuenta: es local y se deshace. Lo quitado no
// vuelve a ponerse al abrir. `que`: lo que cuenta ese aviso, o todo (decisión 162).
async function quitarLoDeClaude(que = null) {
  const raiz = proyecto.raiz();
  if (!raiz) return { hecho: 'sinCarpeta' };
  return ajustesLocales.quitarLosDeLaBarra({ raiz, estaEnGit: estaEnGitConLaBarra, que });
}

// Si lo que toca ficheros de esta persona tiene que esperar a su sí (C-4): el
// historial no lo creó la barra, y en este montaje no se enseñó qué se tocaba.
// Al montar encima de lo que había, ese sí ya se dio con el resumen (B4).
async function sinSuSi(parte) {
  if (parte && ['empezada', 'otroArnes'].includes(parte.estado)) return false;
  return !(await terreno.podemosGuardarElPuntoDePartida());
}

// Los nombres van al frontmatter del perfil del arnés, junto a los diales:
// es el fichero que RSC ya usa para el perfil y el que leen `orient` y la
// barra lateral. Con ellos, qué lleva la carpeta y cuánta gente hay detrás,
// que no los pide RSC y el asistente sí necesita saber.
const elSaltoDe = (texto) => (/\r\n/.test(String(texto)) ? '\r\n' : '\n');

function ponerEnElPerfil(campos) {
  const perfil = proyecto.ruta(...identidad.PERFIL);
  if (!perfil || !fs.existsSync(perfil)) return false;

  let texto = fs.readFileSync(perfil, 'utf8');
  const bloque = texto.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!bloque) return false;

  // Los reemplazos van con función y no con texto: en un texto de reemplazo,
  // `$&` o `$'` quieren decir «lo encontrado» o «lo que viene detrás», y un
  // nombre como «Soler $& Hijos» rompía la cabecera del perfil.
  // El salto que ya tenía el fichero (en Windows, «\r\n»): mezclar los dos deja el perfil a medias.
  const salto = elSaltoDe(texto);
  let cabecera = bloque[1];
  for (const [clave, valor] of Object.entries(campos)) {
    if (!valor) continue;
    const linea = new RegExp(`^${clave}:.*$`, 'm');
    const puesta = `${clave}: ${valor}`;
    cabecera = linea.test(cabecera) ? cabecera.replace(linea, () => puesta) : `${cabecera}${salto}${puesta}`;
  }

  fs.writeFileSync(perfil, texto.replace(bloque[0], () => `---${salto}${cabecera}${salto}---`));
  return true;
}

// RSC reescribe el perfil entero al aceptar un plan (`onboarding-apply.js:69,76-81`):
// tres campos en la cabecera y, debajo, «# User profile» y «Goal:». Lo que el
// asistente fue apuntando ahí al conocer a la persona —`init` lo pide así— se
// perdía cada vez que se volvía a montar, que es lo que pasa al subir de
// versión (T078). Se lee antes de montar y se devuelve después: los campos de
// la cabecera que RSC ya no escribe, y el cuerpo sin su título ni su objetivo,
// que son del plan nuevo. El dial y las palabras de lo devuelto quedan como
// los acaba de escribir RSC: el asistente y «Cómo te habla» leen primero
// `accompaniment_level`, y se quedarían con el de antes.
function leerElPerfil() {
  const perfil = proyecto.ruta(...identidad.PERFIL);
  try {
    return perfil ? fs.readFileSync(perfil, 'utf8') : null;
  } catch {
    return null;
  }
}

const partesDelPerfil = (texto) => {
  const bloque = texto.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  return bloque ? { cabecera: bloque[1], cuerpo: texto.slice(bloque[0].length) } : { cabecera: null, cuerpo: texto };
};
// Una clave de la cabecera, con tildes o sin ellas: el asistente escribe en
// español, y `dirección:` se perdía (revisión de F8, I4).
const claveDe = (linea) => (linea.match(/^([\p{L}_][\p{L}\p{N}_-]*)\s*:/u) || [])[1];

// Las entradas de una cabecera: cada clave con lo que cuelga de ella, una lista
// de YAML o un bloque de varias líneas, que volvían vacíos (I4).
const entradasDe = (cabecera) => {
  const entradas = [];
  for (const linea of cabecera.split(/\r?\n/)) {
    const clave = claveDe(linea);
    if (clave) entradas.push({ clave, lineas: [linea] });
    else if (entradas.length && (/^\s/.test(linea) || /^-(\s|$)/.test(linea) || !linea.trim())) entradas[entradas.length - 1].lineas.push(linea);
  }
  return entradas;
};

function devolverAlPerfil(antes) {
  const ahora = leerElPerfil();
  if (!antes || !ahora || ahora === antes) return false;
  const viejo = partesDelPerfil(antes);
  const nuevo = partesDelPerfil(ahora);
  const salto = elSaltoDe(ahora);

  const suValor = (clave) => ((nuevo.cabecera || '').match(new RegExp(`^${clave}\\s*:\\s*(.+)$`, 'm')) || [])[1];
  const alDia = { accompaniment_level: suValor('accompaniment'), technical_level: suValor('technical_level') };
  const conLoDeHoy = (texto) => texto.replace(
    /^(\s*-?\s*)(accompaniment_level|technical_level)(\s*:\s*)([^<\n]*?)(\s*(?:<!--.*)?)$/gm,
    (todo, delante, clave, dos, valor, cola) => (alDia[clave] ? `${delante}${clave}${dos}${alDia[clave].trim()}${cola}` : todo),
  );

  let cabecera = nuevo.cabecera;
  if (cabecera !== null && viejo.cabecera) {
    const tiene = new Set(entradasDe(cabecera).map((e) => e.clave));
    const faltan = entradasDe(viejo.cabecera).filter((e) => !tiene.has(e.clave)).flatMap((e) => e.lineas);
    if (faltan.length) cabecera = `${cabecera}${salto}${conLoDeHoy(faltan.join(salto).replace(/\s+$/, ''))}`;
  }

  // Lo suyo se busca tal cual estaba: un RSC que ya conserve el cuerpo lo trae
  // con el dial de antes, y buscarlo ya al día lo duplicaría.
  const suyo = viejo.cuerpo.replace(/^#\s+User profile\s*$/im, '').replace(/^Goal:.*$/m, '').trim();
  let cuerpo = nuevo.cuerpo;
  if (suyo && !cuerpo.includes(suyo)) cuerpo = `${cuerpo.replace(/\s*$/, '')}${salto}${salto}${suyo}${salto}`;
  cuerpo = conLoDeHoy(cuerpo);

  const escrito = cabecera === null ? cuerpo : `---${salto}${cabecera}${salto}---${salto}${cuerpo}`;
  if (escrito === ahora) return false;
  fs.writeFileSync(proyecto.ruta(...identidad.PERFIL), escrito);
  return true;
}

// Los enganches que RSC deja escritos llaman a `node` por su nombre, y así se
// quedan: a ese `node` lo encuentra el relevo de la barra, por el PATH
// (`relevo.js`, C2).
//
// Hasta la decisión 119 aquí se escribía la ruta del Node de este ordenador en
// `.claude/settings.json`, que viaja en git: entraba en el punto de partida,
// cada clon heredaba la de otro, y la marca que la escondía de git paraba los
// `git pull` (C3, F5). Ahora se deshace lo que se escribió, al montar y al
// abrir la carpeta. La marca se quita solo con un git que se pueda usar: en un
// Mac sin las herramientas de Apple, `git` a secas abre su diálogo.
async function apuntarLosEnganches(salida) {
  const raiz = proyecto.raiz();
  const donde = entorno.moduloComun('enganches');
  if (!raiz || !donde) return false;

  try {
    const { devolverElNodeASecas } = require(donde);
    // La copia que dejó un instalador de antes no lo trae, y hoy manda sobre la
    // del paquete (G2, que arregla F7). Mientras, no se hace nada, pero se apunta
    // para «Algo va mal» (revisión de F3, M2).
    if (typeof devolverElNodeASecas !== 'function') {
      salida.appendLine(`[arrancar] los enganches no se revisan: el módulo es de un instalador de antes (${donde})`); // diccionario: interno
      return false;
    }
    const hecho = devolverElNodeASecas(raiz, {
      git: (await git.hay()) ? entorno.git() : null,
      anotar: (que) => salida.appendLine(`[arrancar] ${que}`),
    });
    return hecho.devueltos > 0 || hecho.desmarcados > 0;
  } catch {
    return false;
  }
}

// Lo de siempre, pedido con su botón (C-4): el sí ya se ha dado, y se trata como
// carpeta de alguien solo si lo es. Se pasaba siempre como de alguien, y el
// freno se quedaba esperando también en una nuestra (revisión de F4, m5).
async function ponerElBloque(contexto) {
  return ponerLosRailes(contexto, { ajena: await sinSuSi(null), ponerBloque: true });
}

// Preparar la carpeta también para otro asistente (E1): el `sync --target` del
// arnés de dentro, que suma ese asistente a los declarados y no quita al que
// había (medido con el paquete: con Codex, sus 32 habilidades en `.codex/rsc/`,
// y las de Claude donde estaban), y después los raíles, que se ponen para todos.
//
// Con tres cuidados que faltaban (revisión de F5):
//   · en una carpeta que va por delante, `rsc.correr` usa su versión y no la de
//     la barra, que se la bajaría (I2; P7, decisión 145);
//   · antes, en seco, se mira qué tocaría. Una habilidad, un comando o un agente
//     suyo que se llama como uno del arnés se pregunta como al montar, y en una
//     carpeta de alguien se enseña además lo suyo que se toca (I1);
//   · lo que dice el arnés cuando falla vuelve en `detalle`, para el registro (I3).
//
// `sinNadieDelante`: la barra lo hace sola, por el ajuste de los dos asistentes
// (decisión 158). Entonces lo que toca algo suyo no se pregunta ni se hace:
// vuelve con `esperaASuBoton`, sin haber escrito nada (P4, P9).
async function prepararTambienPara(id, contexto, { sinNadieDelante = false } = {}) {
  if (rsc.vaPorDelante()) return { ok: false, porDelante: true };
  const enSeco = await rsc.correr(['sync', '--target', id, '--dry-run'], { tiempoMaximo: 300000 });
  if (enSeco.codigo !== 0) return { ok: false, detalle: loQuePaso('al mirar qué se toca', enSeco) };
  const plan = { gestionados: rsc.loQueTocaElSync(enSeco.salida, proyecto.raiz()) };
  const { tocados, choques } = ajena.resumen(plan, proyecto.raiz());
  let renombrados = [];
  if (choques.length || (tocados.length && await sinSuSi(null))) {
    if (sinNadieDelante) return { ok: false, esperaASuBoton: true };
    const decidido = await confirmarLoQueSeToca(plan);
    if (!decidido.seguir) return { ok: false, cancelado: true };
    if (decidido.fallo) {
      return {
        ok: false,
        detalle: `no se pudo renombrar ${decidido.fallo.fichero}: ${decidido.error}`, // diccionario: interno
        mensaje: `No he podido cambiarle el nombre a «${decidido.fallo.id}», así que no he montado nada. Pulsa «Algo va mal» y pásale el código a tu tutor.`,
      };
    }
    renombrados = decidido.renombrados;
  }

  const hecho = await rsc.correr(['sync', '--target', id], { tiempoMaximo: 300000 });
  if (hecho.codigo !== 0) return { ok: false, detalle: loQuePaso('al preparar la carpeta', hecho) };
  if (!(await ponerLosRailes(contexto, { ajena: await sinSuSi(null) }))) {
    return { ok: false, detalle: 'preparada, pero los raíles no se han podido poner' }; // diccionario: interno
  }
  return { ok: true, renombrados };
}

// Hace falta para que "Guardar copia de seguridad" tenga dónde guardar, y para
// que la memoria del arnés se ancle a una rama.
//
// Con la identidad de la barra puesta solo aquí, y con una marca de que el
// historial nació aquí: es lo que dice después que es nuestro, pase lo que
// pase con los autores (B6). Antes era un `git init` pelado, y con la
// identidad de la persona en el ordenador el punto de partida salía con su
// nombre y el historial se tomaba por ajeno.
async function prepararHistorial() {
  if (proyecto.existe('.git')) return true;
  const hecho = await guardar.iniciar();
  if (!hecho.ok) return false;
  const marca = await procesos.git('config', '--local', terreno.MARCA_DEL_HISTORIAL, 'nuestro');
  return marca.codigo === 0;
}

// ─────────────────────────────────────────────────────────────────────────
//                              LAS PREGUNTAS
// ─────────────────────────────────────────────────────────────────────────
//
// Se hacen de una en una y **solo las que hagan falta**. Cuál hace falta lo
// decide `rumbo.js` restando lo que el recibo de RSC ya contesta: cuando hay
// arnés, seis de las nueve ya están escritas en `.rsc.json` y hasta ahora se
// volvían a preguntar igual.

// Lo que ya se ve en la carpeta: si parece un proyecto de software (un
// `package.json`, un `requirements.txt`, una web), «Construir algo» va primero
// (A5). Todas las pistas de `terreno.deQueParece` son de construir algo.
const loQueSeVe = (parte) => Boolean(parte && parte.carpeta && parte.carpeta.parece);
const esDeAlguien = (parte) => Boolean(parte) && ['empezada', 'otroArnes'].includes(parte.estado);

function deQueVaPorLoQueSeVe(parte) {
  if (!loQueSeVe(parte)) return DE_QUE_VA;
  const construir = DE_QUE_VA.find((o) => o.kind === 'software');
  return [
    { ...construir, detalle: `Lo que parece que hay aquí · ${construir.detalle}` },
    ...DE_QUE_VA.filter((o) => o !== construir),
  ];
}

const COMO_SE_PREGUNTA = {
  asistente: () => preguntarAsistente(),
  deQueVa: (yaDicho, parte) => elegir('Para empezar', '¿De qué va esto?', deQueVaPorLoQueSeVe(parte)),
  alcance: () => elegir('Para empezar', '¿Qué vas a llevar en esta carpeta?', QUE_LLEVA),
  personas: () => elegir('Para empezar', '¿Cuántas personas están metidas en esto?', CUANTAS_PERSONAS),
  queConstruir: (yaDicho) => elegir('Para empezar', '¿Qué vas a construir?',
    QUE_VAS_A_CONSTRUIR.filter((o) => !o.soloCon || o.soloCon === yaDicho.kind)),
  objetivo: (yaDicho, parte) => preguntarObjetivo(yaDicho.kind, { empezada: esDeAlguien(parte) }),
  nivel: () => elegir('Sobre ti', '¿Qué tal te manejas con el ordenador?', COMO_TE_MANEJAS),
  nombres: (yaDicho) => preguntarNombres(yaDicho.objetivo, yaDicho.alcance),
};

// Dónde se guarda cada respuesta, en la forma que espera `montarElArnes`.
const LO_QUE_SE_GUARDA = {
  deQueVa: (r, o) => { r.kind = o.kind; },
  alcance: (r, o) => { r.alcance = o.alcance; },
  personas: (r, o) => { r.personas = o.personas; },
  queConstruir: (r, o) => { r.tamano = o.tamano; },
  nivel: (r, o) => { r.nivel = o.nivel; },
  nombres: (r, o) => { r.nombres = o; },
};

// Lo que el recibo ya contesta, en la forma que espera `montarElArnes`.
function loQueYaSeSabe(recibo) {
  const r = recibo ? recibo.record : null;
  if (!r) return {};
  return {
    asistente: (r.targets || [])[0],
    kind: r.projectKind,
    objetivo: r.goal,
    tamano: r.softwareScope,
    nivel: r.technicalLevel,
  };
}

// Dónde va cada pregunta en las respuestas, para saber si ya está contestada.
const DONDE_SE_GUARDA = {
  asistente: 'asistente', deQueVa: 'kind', alcance: 'alcance', personas: 'personas',
  queConstruir: 'tamano', objetivo: 'objetivo', nivel: 'nivel', nombres: 'nombres',
};
const yaContestada = (que, respuestas) => Boolean(DONDE_SE_GUARDA[que] && respuestas && respuestas[DONDE_SE_GUARDA[que]]);

// La web se pregunta al montar de cero. Si se dejó en blanco queda `null`, que
// también es una respuesta: por eso se mira si está, no si tiene algo.
const tocaLaWeb = (plan, parte) => plan.pasos.some((p) => p.id === 'montarElArnes') && !parte.recibo;

// Lo que este plan pregunta y las respuestas guardadas no contestan (decisión
// 165). El permiso de montar encima de otro montaje no se guarda nunca.
function faltanPorContestar(plan, parte, respuestas) {
  const faltan = plan.preguntar.filter((que) => {
    if (que === 'permiso') return true;
    const pregunta = rumbo.PREGUNTAS.find((p) => p.id === que);
    if (pregunta && pregunta.soloSi && respuestas && respuestas.kind && !pregunta.soloSi({ deQueVa: respuestas.kind })) return false;
    return !yaContestada(que, respuestas);
  });
  if (tocaLaWeb(plan, parte) && !(respuestas && 'web' in respuestas)) faltan.push('web');
  return faltan;
}

// Devuelve las respuestas completas, o null si alguien canceló. `guardadas` son
// las de una vez anterior que no llegó a montar (decisión 165): lo que ya
// contestan no se pregunta otra vez.
async function entrevistar(plan, parte, guardadas = null) {
  const sabido = loQueYaSeSabe(parte.recibo);

  // Lo de hoy manda sobre el recibo, que es lo que se firmó el primer día
  // (B11): las palabras que la persona cambió después en «Cómo te habla», y los
  // asistentes que tiene declarados ahora. Lo que se conteste en este mismo
  // montaje manda sobre todo, porque se escribe después.
  if (parte.recibo) {
    const hoy = trato.leer();
    if (hoy.palabras) sabido.nivel = hoy.palabras;
    const declarados = ((proyecto.declaracion() || {}).targets || []).filter((t) => typeof t === 'string' && t);
    if (declarados.length) sabido.asistente = declarados.join(',');
  }

  const respuestas = { ...sabido, ...(guardadas || {}) };
  const nombres = parte.railes.nombres || null;

  for (const que of plan.preguntar) {
    if (que === 'permiso') continue; // se pide aparte, antes de todo
    if (guardadas && yaContestada(que, guardadas)) continue;

    // Lo que solo se pregunta en ciertos casos: qué va a construir, solo si hay
    // algo que construir. Sin recibo no se sabe el tipo hasta que se contesta
    // la anterior, así que se mira aquí y no al calcular la lista.
    const pregunta = rumbo.PREGUNTAS.find((p) => p.id === que);
    if (pregunta && pregunta.soloSi && !pregunta.soloSi({ deQueVa: respuestas.kind })) continue;

    const contestada = await COMO_SE_PREGUNTA[que](respuestas, parte);
    if (!contestada) return null;

    if (LO_QUE_SE_GUARDA[que]) LO_QUE_SE_GUARDA[que](respuestas, contestada);
    else respuestas[que] = contestada;
  }

  // La web no se pregunta nunca dos veces ni bloquea: es opcional.
  const yaDicha = guardadas && 'web' in guardadas;
  const web = !tocaLaWeb(plan, parte) ? null : (yaDicha ? guardadas.web : await preguntarWeb());

  // Lo que ya estaba en el perfil vuelve a él: RSC lo reescribe entero en cada
  // plan aceptado, y alcance y personas no se vuelven a preguntar.
  return {
    ...respuestas,
    nombres: respuestas.nombres || nombres,
    alcance: respuestas.alcance || parte.railes.alcance || null,
    personas: respuestas.personas || parte.railes.personas || null,
    web,
  };
}

// ─────────────────────────────────────────────────────────────────────────
//                               LOS PASOS
// ─────────────────────────────────────────────────────────────────────────
//
// Uno por identificador del catálogo de `rumbo.js`. Si allí aparece uno que
// aquí no está, la prueba lo caza antes que nadie.
//
// Cada uno devuelve `{ ok, detalle }`. Un paso que falla NO para el arranque
// salvo que sea el montaje: es mejor un arnés con los raíles a medias, y
// decirlo, que ninguno.

async function arreglarLoQueSePuedaSolo(salida) {
  const queHay = rsc.queHayQueArreglar(await rsc.arreglarEnSeco());

  if (!queHay.sabemos) return { ok: true, detalle: 'no se ha podido revisar' };
  if (queHay.sano) return { ok: true, detalle: 'nada que arreglar' };

  // Lo que el arnés pregunta antes de tocar no se contesta por nadie: uno de
  // esos hallazgos mueve el arnés a otro asistente.
  if (queHay.aDecidir.length) {
    const n = queHay.aDecidir.length;
    return { ok: true, detalle: `${n} ${n === 1 ? 'cosa' : 'cosas'} que tiene que decidir una persona`, aDecidir: queHay.aDecidir };
  }

  const hecho = await rsc.arreglarSolo();
  const n = queHay.solas.length;
  return { ok: hecho.codigo === 0, detalle: n === 1 ? '1 arreglada' : `${n} arregladas` };
}

const COMO_SE_HACE = {
  ponerGit: async () => ({ ok: await prepararHistorial() }),

  // En una carpeta que ya era de alguien se enseña lo que se toca antes de
  // firmar (B4). Una vacía no tiene nada suyo que enseñar.
  montarElArnes: async ({ respuestas, parte }) => {
    // RSC solo deja al asistente guardar y subir sin preguntar cuando la carpeta no
    // tenía arnés (`gitPermissions: true` en un proyecto nuevo). Eso sale del
    // ordenador en su nombre y espera a un sí (P9, decisión 145). Si ya lo tenía
    // decidido el equipo, se respeta (revisión de corrección del paso a la 3, 3).
    const nueva = !proyecto.declaracion();
    const hecho = await montarElArnes(respuestas, {
      ajenaCarpeta: Boolean(parte) && ['empezada', 'otroArnes'].includes(parte.estado),
      // Si ya había un plan aceptado, el nuevo se compara con él (A12).
      reciboAnterior: (parte && parte.recibo) || null,
    });
    if (nueva && hecho.ok) {
      const sinPermisos = await rsc.correr(['git-permissions', 'off'], { tiempoMaximo: 300000 });
      // Que falle no tumba el montaje, pero se dice: es un permiso que queda dado.
      if (sinPermisos.codigo !== 0) {
        return {
          ...hecho,
          detalle: [hecho.detalle, `git-permissions off falló: ${(sinPermisos.error || sinPermisos.salida || '').trim().split('\n').pop()}`].filter(Boolean).join(' · '), // diccionario: interno
          pega: 'No he podido quitarle al asistente el permiso de subir sin preguntar. Pulsa «Algo va mal» y pásale el código a tu tutor.',
          imprescindible: true,
        };
      }
    }
    return { ...hecho, imprescindible: true };
  },

  // Traer a esta máquina lo que el repositorio ya declaraba. No se vuelve a
  // montar nada: `sync` reconstruye desde el plan que alguien ya aceptó. Si la
  // carpeta pasa de la 2 a la 3, `rsc.correr` decide antes lo que la 3 trae
  // encendido (`decidir.js`).
  traerLasHabilidades: async () => {
    const hecho = await rsc.sincronizar();
    return { ok: hecho.codigo === 0, detalle: (hecho.salida || '').trim().split('\n').pop(), imprescindible: true };
  },

  arreglarLoRoto: ({ salida }) => arreglarLoQueSePuedaSolo(salida),
  // Y con ellos, lo de esta persona en los ajustes de Claude (decisión 157). Que
  // no salga no tumba los raíles: se apunta, y al abrir se vuelve a intentar.
  // Lo que se puso se dice una vez al terminar (`dicho`), con su «Quitarlo».
  ponerLosRailes: async ({ contexto, parte }) => {
    const ok = await ponerLosRailes(contexto, { ajena: await sinSuSi(parte) });
    const deClaude = await ponerLoDeClaude().catch((error) => ({ hecho: 'fallo', error: error.message }));
    return {
      ok,
      detalle: `ajustes de Claude de esta carpeta: ${deClaude.hecho}${deClaude.error ? ` (${deClaude.error})` : ''}`, // diccionario: interno
      ...(deClaude.hecho === 'puesto' ? { dicho: ajustesLocales.laFrase(deClaude) } : {}),
    };
  },
  ponerLosNombres: ({ respuestas }) => {
    const campos = { ...(respuestas.nombres || {}), alcance: respuestas.alcance, personas: respuestas.personas };
    return { ok: Object.values(campos).some(Boolean) ? ponerEnElPerfil(campos) : true };
  },
  // El detalle de cada paso va al canal de salida, para el tutor.
  apuntarLosEnganches: async ({ salida }) => ({ ok: true, detalle: (await apuntarLosEnganches(salida)) ? 'devueltos a node' : 'no hacía falta' }), // diccionario: interno

  puntoDePartida: async () => {
    // El historial de alguien no se escribe. Se comprueba aquí y no solo en
    // `rumbo`, porque una carpeta «vacía» puede tener un `.git` con commits.
    if (!(await terreno.podemosGuardarElPuntoDePartida())) {
      return { ok: true, detalle: 'historial de alguien: no se toca' };
    }
    // Se mira si se guardó (B10). Si no, se dice: sin él, «Volver a como estaba»
    // no tiene adónde volver. Lo demás del montaje sí está.
    const hecho = await guardar.guardar(`Punto de partida — ${guardar.fechaLarga()}`);
    if (!hecho.ok) {
      return {
        ok: false,
        detalle: hecho.mensaje,
        // Con demasiado peso nuevo, el motivo de verdad y no «Algo va mal» (decisión 147).
        pega: hecho.demasiado ? hecho.mensaje : 'No he podido guardar el punto de partida. Lo demás está listo. Pulsa «Algo va mal» y pásale el código a tu tutor.',
        ...(hecho.boton ? { boton: hecho.boton } : {}),
      };
    }
    return { ok: true };
  },

  // Los dos encargos no los hace la barra: los hace el asistente. Aquí solo se
  // anotan para que quien llama sepa qué pedirle al terminar.
  ordenarLasClaves: () => ({ ok: true, encargo: 'ordenarLasClaves' }),
  ordenarLaCarpeta: () => ({ ok: true, encargo: 'ordenarLaCarpeta' }),
};

// ─────────────────────────────────────────────────────────────────────────
//                              EL ENRUTADOR
// ─────────────────────────────────────────────────────────────────────────

// Un pestillo, porque ahora se llega aquí desde tres sitios y algunas ramas
// empiezan a escribir sin abrir ningún diálogo antes. Dos pulsaciones seguidas
// lanzarían dos montajes a la vez sobre la misma carpeta.
let enMarcha = false;

// ── Sin nadie delante (P9, decisión 142) ────────────────────────────────
//
// Al abrir la carpeta, la barra sigue sola lo que solo devuelve lo ya
// decidido: traer un clon, ponerlo al día, poner lo de la barra o terminar un
// montaje a medias con lo que ya se contestó. Lo demás —preguntas, una carpeta
// delicada, otro proyecto encima, otro montaje, lo suyo que se toca, un plan
// que cambia— pide el sí de esa persona, y entonces no se abre ninguna ventana:
// se para sin tocar nada y la pieza se queda con su botón.
const RAMAS_SIN_NADIE = ['traer', 'ponerAlDia', 'adoptar', 'completar'];
// En un objeto, para que la prueba pueda mirar las dos confirmaciones sin
// montar nada.
// `alEsperar` lo pone quien llama: la barra cuenta el tiempo mientras se espera
// a git con las respuestas ya dadas (decisión 165).
const momento = { nadieDelante: false, alEsperar: () => {} };

// Y nunca crear el historial: `git init` es poner copias, y poner copias es
// suyo si eligió no tenerlas, y guardaría la carpeta entera aunque no (revisión
// de corrección de P9, 1).
const SIN_NADIE_NO = ['ponerGit', 'puntoDePartida'];

// Retomar lo que se contestó mientras se ponía git (decisión 165). Esa persona
// ya pulsó «Preparar esta carpeta», con las copias, y contestó: su sí está dado
// y ya no queda nada que decidir. Así que se termina solo, si la carpeta sigue
// como estaba (la misma rama) y no es de alguien, que pide su sí dentro del
// montaje (B4).
//
// En una carpeta vacía, también el historial y el punto de partida: lo único
// que guardan es lo que acaba de poner la barra, y eligió tenerlas al pulsar. Es
// lo mismo que ya hace sola «Copias de seguridad aquí» al abrir (decisión 147).
// En las demás, como siempre sin nadie: sin historial.
const RAMAS_QUE_SE_RETOMAN = ['desdeCero', ...RAMAS_SIN_NADIE];

function sePuedeRetomar(plan, parte, guardadas) {
  return Boolean(guardadas && guardadas.respuestas)
    && guardadas.rama === plan.rama
    && RAMAS_QUE_SE_RETOMAN.includes(plan.rama)
    && (plan.rama === 'desdeCero' || !(plan.pasos || []).some((p) => SIN_NADIE_NO.includes(p.id)))
    && !faltanPorContestar(plan, parte, guardadas.respuestas).length;
}

function sePuedeSinNadie(plan, parte, guardadas = null) {
  if ((parte.carpeta && parte.carpeta.delicada) || parte.dentroDeOtro) return false;
  if (sePuedeRetomar(plan, parte, guardadas)) return true;
  return RAMAS_SIN_NADIE.includes(plan.rama)
    && !(plan.pasos || []).some((p) => SIN_NADIE_NO.includes(p.id))
    && !plan.preguntar.length;
}

const CLAVE_SIN_GIT = 'executiveLab.sigueSinCopias';

// Dónde se recuerda lo que esa persona ya decidió. Se pide con cuidado: un
// contexto sin memoria —una prueba, o una versión de VS Code que cambie la
// forma— no puede tumbar el arranque entero.
const loQueDecidio = (contexto) => (contexto && contexto.workspaceState)
  || { get: () => undefined, update: async () => {} };

async function arrancar(contexto, salida, { sinNadieDelante = false, alEsperar = null } = {}) {
  // Ya hay uno en marcha: se dice, en vez de callar (revisión de corrección, 5).
  if (enMarcha) return { ok: false, enMarcha: true };
  enMarcha = true;
  momento.nadieDelante = sinNadieDelante;
  momento.alEsperar = typeof alEsperar === 'function' ? alEsperar : () => {};
  try {
    return await elCamino(contexto, salida);
  } finally {
    enMarcha = false;
    momento.nadieDelante = false;
    momento.alEsperar = () => {};
  }
}

const estaEnMarcha = () => enMarcha;

// `yaConfirmado`: se vuelve aquí después de esperar a git mientras se
// preguntaba (decisión 165), con git puesto o sin copias. Lo que se confirma
// antes de tocar nada ya se confirmó, y las respuestas están guardadas.
// `permisoDado`: el de montar encima de otro montaje, si se pidió entonces.
async function elCamino(contexto, salida, { yaConfirmado = false, permisoDado = false } = {}) {
  const visto = await terreno.reconocer();
  const parte = {
    ...visto,
    git: { ...visto.git, sigueSinCopias: Boolean(loQueDecidio(contexto).get(CLAVE_SIN_GIT)) },
  };
  let plan = rumbo.elegirRama(parte);
  salida.appendLine(`[arrancar] ${plan.rama}: ${plan.porQue}`); // diccionario: interno
  const memoria = loQueDecidio(contexto);
  let guardadas = lasRespuestas.leer(memoria);
  // Ya montada por otro camino: lo guardado no espera nada.
  if (guardadas && plan.rama === 'yaEstaba') {
    await lasRespuestas.olvidar(memoria);
    guardadas = null;
  }

  if (momento.nadieDelante && !sePuedeSinNadie(plan, parte, guardadas)) {
    salida.appendLine(`[solo] ${plan.rama}: espera a su botón`); // diccionario: interno
    return { ok: false, esperaASuBoton: true };
  }

  if (plan.rama === 'sinCarpeta') {
    return { ok: false, mensaje: 'Abre primero la carpeta que quieres preparar.' };
  }

  // Un `.rsc.json` ilegible no se pisa. Es un fichero que viaja por git y esto
  // suele ser un conflicto sin resolver: montar encima borraría el arnés que
  // esa persona ya tenía.
  if (plan.rama === 'reciboRoto') {
    return {
      ok: false,
      mensaje: 'El fichero que dice cómo está montado esto no se puede leer. No voy a tocar nada. Pulsa «Algo va mal» y pásale el código a tu tutor.',
    };
  }

  // La carpeta personal, la raíz o una del sistema: no se prepara (B1).
  if (plan.rama === 'noSePrepara') return noSePrepara(parte, salida);

  // Documentos, el Escritorio o las Descargas enteras: se pregunta antes de
  // escribir nada, también antes de poner git.
  if (!yaConfirmado && parte.carpeta && parte.carpeta.delicada && plan.pasos.some((p) => p.escribe)) {
    if ((await confirmarLaCarpeta(parte, salida)) !== 'seguir') return { ok: false, cancelado: true };
  }

  // Dentro de otro proyecto: se dice antes de escribir nada (B9).
  if (!yaConfirmado && parte.dentroDeOtro && plan.pasos.some((p) => p.escribe)) {
    if ((await confirmarDentroDeOtro(parte)) !== 'seguir') return { ok: false, cancelado: true };
  }

  // «Seguir sin copias» es seguir (decisión 164): se monta ya, sin ellas, con las
  // preguntas de siempre. Ponerlas queda en Ayuda › Sugerencias, y se dice al
  // terminar (`sinCopias`).
  let sinCopias = false;
  if (plan.rama === 'sinGit') {
    // Dicho que estaba y sin verlo: no se vuelve a empezar, que sería un bucle.
    if (yaConfirmado) return noSePusoGit({ mensaje: 'git dice que está, y no lo encuentro' }, salida); // diccionario: interno
    // Si se puede poner solo, pulsar era el sí (decisión 165).
    if (parte.git.sePuedeInstalarSolo) return prepararMientrasSePoneGit(contexto, parte, salida, guardadas);
    // Sin poder ponerlo solo, se pregunta como siempre.
    const decidido = await decidirSobreGit(contexto, parte);
    if (!decidido.sigueSinCopias) return decidido;
    parte.git = { ...parte.git, sigueSinCopias: true };
    plan = rumbo.elegirRama(parte);
    salida.appendLine(`[arrancar] sin copias, porque lo eligió: ${plan.rama}`); // diccionario: interno
    sinCopias = true;
  }

  if (plan.rama === 'yaEstaba') {
    return { ok: true, yaEstaba: true, mensaje: 'Esto ya estaba montado y entero.' };
  }

  if (plan.rama === 'otroArnes' && !permisoDado && !(await pedirPermiso(parte))) {
    // Jose: «si el usuario dice que no quiere implementarlo, entonces
    // directamente no se ejecuta la instalación ni de RSC ni de la extensión».
    await lasRespuestas.olvidar(memoria);
    return { ok: false, cancelado: true, sinPermiso: true };
  }

  const respuestas = await entrevistar(plan, parte, guardadas && guardadas.respuestas);
  if (!respuestas) return { ok: false, cancelado: true };

  await recordarSiSeMontaAqui(plan);
  const hecho = await hacerLosPasos(plan, parte, respuestas, contexto, salida);
  // Montado, o con un no a montar encima de lo suyo: lo guardado ya no sirve.
  if (guardadas && (hecho.ok || hecho.sinPermiso)) await lasRespuestas.olvidar(memoria);
  return sinCopias ? { ...hecho, sinCopias: true } : hecho;
}

// ── Git, con un solo sí (decisión 165) ──────────────────────────────────
//
// Antes, sin git, la carpeta enseñaba «Ponerla ahora» en vez de «Preparar esta
// carpeta». Pulsar Preparar sacaba «Ponerlo primero», que devolvía a la misma
// pantalla; al terminar, «Ya está. Puedes preparar la carpeta.», y otra vez a
// pulsar. Dos síes a lo mismo y una espera parado, que en un Mac podía llegar a
// 45 minutos. Casi ningún alumno tiene git.
//
// Ahora pulsar Preparar es el sí de instalarlo (P9), y la pantalla lo dice
// debajo del botón. Se pone a instalar y, mientras tanto, se hacen las
// preguntas, las de la carpeta tal y como quedará con git. Las respuestas se
// guardan (`respuestas.js`) y, en cuanto git aparece, se monta con ellas sin
// otro clic. Si git falla o tarda demasiado, se dice en una frase con su salida,
// y lo contestado no se vuelve a preguntar.
async function prepararMientrasSePoneGit(contexto, parte, salida, guardadas) {
  const memoria = loQueDecidio(contexto);
  const plan = rumbo.elegirRama({ ...parte, git: { ...parte.git, hay: true } });
  salida.appendLine(`[arrancar] falta git: se pone mientras se pregunta (${plan.rama})`); // diccionario: interno

  // Montar encima de otro montaje se pregunta antes de todo, también de git.
  if (plan.rama === 'otroArnes' && !(await pedirPermiso(parte))) {
    await lasRespuestas.olvidar(memoria);
    return { ok: false, cancelado: true, sinPermiso: true };
  }

  let puesto = null;
  const poniendo = ponerGit().then((hecho) => { puesto = hecho; return hecho; });

  // Si deja las preguntas a medias, git se sigue poniendo: ese sí ya lo dio.
  const respuestas = await entrevistar(plan, parte, guardadas && guardadas.respuestas);
  if (!respuestas) return { ok: false, cancelado: true };
  await lasRespuestas.guardar({ respuestas, rama: plan.rama }, memoria);

  // Mientras espera, se puede seguir sin copias: en un Mac, si se le dice que
  // no al diálogo de Apple, git no aparece, y esperar los 45 minutos sería
  // esperar parado. Se monta ya, con lo contestado.
  if (!puesto) momento.alEsperar(ESPERANDO_A_GIT, SEGUIR_SIN_COPIAS);
  const sinEsperar = new Promise((sigue) => { esperandoAGit.dejar = () => sigue({ ok: false, sinCopias: true }); });
  let hecho;
  try {
    hecho = await Promise.race([poniendo, sinEsperar]);
  } finally {
    esperandoAGit.dejar = null;
  }
  const despues = { yaConfirmado: true, permisoDado: plan.rama === 'otroArnes' };
  if (hecho.sinCopias) {
    salida.appendLine('[arrancar] deja de esperar a git: sigue sin copias'); // diccionario: interno
    await memoria.update(CLAVE_SIN_GIT, true);
    momento.alEsperar('Preparando la carpeta con tus respuestas, sin copias…');
    return elCamino(contexto, salida, despues);
  }
  guardar.olvidarSiHayGit();
  if (!hecho.ok) return noSePusoGit(hecho, salida);

  momento.alEsperar('Ya está puesto git. Preparando la carpeta con tus respuestas…');
  return elCamino(contexto, salida, despues);
}

// Quien deja de esperar a git: «Seguir sin copias» mientras se espera. Dice si
// había algo esperando.
const esperandoAGit = { dejar: null };
function dejarDeEsperarAGit() {
  if (!esperandoAGit.dejar) return false;
  esperandoAGit.dejar();
  return true;
}

const ESPERANDO_A_GIT = 'Estoy poniendo git. En cuanto esté, preparo la carpeta con tus respuestas.';

// El instalador del sistema, con su barra de progreso. Una sola vez a la vez
// (`git.instalar`). No revienta nunca: un fallo vuelve como un no.
function ponerGit() {
  return Promise.resolve()
    .then(() => vscode.window.withProgress(
      { location: vscode.ProgressLocation.Notification, title: 'Poniendo git', cancellable: false },
      (progreso) => git.instalar((que) => progreso.report({ message: que })),
    ))
    .then((hecho) => hecho || { ok: false, mensaje: 'el instalador no ha contestado' }) // diccionario: interno
    .catch((error) => ({ ok: false, mensaje: error.message }));
}

// Lo que se dice si git no queda puesto: una frase y su salida (P1). Lo
// contestado está guardado, y la pantalla lo dice debajo del botón.
const VOLVER_A_INTENTARLO = { etiqueta: 'Volver a intentarlo', accion: { tipo: 'arrancar' } };
const SEGUIR_SIN_COPIAS = { etiqueta: 'Seguir sin copias', accion: { tipo: 'seguirSinCopias' } };

function noSePusoGit(hecho, salida) {
  salida.appendLine(`[arrancar] git no ha quedado puesto: ${hecho.mensaje || '(sin motivo)'}${hecho.detalle ? ` · ${hecho.detalle}` : ''}`); // diccionario: interno
  if (hecho.tarda) {
    return {
      ok: false,
      gitNoSePuso: true,
      mensaje: 'Poner git está tardando mucho: cuando acabe, pulsa «Terminar de prepararla» y sigo con tus respuestas.',
      botones: [{ ...VOLVER_A_INTENTARLO, etiqueta: 'Terminar de prepararla' }, SEGUIR_SIN_COPIAS],
    };
  }
  const mensaje = hecho.sinPermiso
    ? 'No se ha puesto git porque Windows necesitaba tu permiso: pulsa «Volver a intentarlo» y dile que sí.'
    : (hecho.sinDescargar
      ? 'No he podido descargar git: mira que haya conexión y pulsa «Volver a intentarlo».'
      : 'No he podido poner git: pulsa «Volver a intentarlo», o sigue sin copias.');
  return { ok: false, gitNoSePuso: true, mensaje, botones: [VOLVER_A_INTENTARLO, SEGUIR_SIN_COPIAS] };
}

// Un montaje que empieza aquí, en una carpeta sin historial, se apunta en el
// estado del editor para esta carpeta, que un clon no trae (decisión 157): es lo
// que dice después que la barra la montó en este ordenador. Con historial lo dice
// la marca que deja la barra al crearlo (`prepararHistorial`).
async function recordarSiSeMontaAqui(plan) {
  if (!plan.pasos.some((p) => p.id === 'montarElArnes') || proyecto.existe('.git')) return false;
  return terreno.recordarQueSeMontoAqui();
}

const SIN_COPIAS_HASTA_QUE_QUIERAS = 'Sigo sin copias. Puedes ponerlas cuando quieras desde Ayuda › Sugerencias.';

// Sin git no hay copias de seguridad. Se explica qué se pierde y se deja
// elegir: Jose lo quiso así, y hasta ahora esto era un callejón — la pantalla
// se quedaba sin ofrecer nada.
//
// Desde la decisión 165, solo donde la barra no puede ponerlo sola (fuera de
// Mac y de Windows, o sin el módulo de git). Donde puede, pulsar Preparar ya es
// el sí, y esto le hacía decir que sí dos veces.
async function decidirSobreGit(contexto) {
  const ponerlo = 'Ponerlo primero';
  const seguir = 'Seguir sin copias';

  const elegido = await vscode.window.showWarningMessage(
    'Falta una pieza para poder guardar tu trabajo. Sin ella todo funciona, pero no podrás guardar copias ni volver atrás si algo sale mal.',
    { modal: true, detail: git.comoSeInstala() },
    ponerlo,
    seguir,
  );

  if (elegido === seguir) {
    await loQueDecidio(contexto).update(CLAVE_SIN_GIT, true);
    // Decía «desde Histórico», que en la barra sencilla no existe: están en
    // Sugerencias, con su botón (decisión 164).
    return { ok: false, sigueSinCopias: true, mensaje: SIN_COPIAS_HASTA_QUE_QUIERAS };
  }
  if (elegido === ponerlo) return { ok: false, faltaGit: true };
  return { ok: false, cancelado: true };
}

// ── Las carpetas que no se preparan enteras ─────────────────────────────
//
// La salida es una carpeta nueva: dentro de la personal si la de ahora no se
// puede preparar, y dentro de la de ahora si solo era Documentos o el
// Escritorio. Nunca en la raíz ni en una del sistema, que pedirían
// administrador (B1).
const NO_SE_PREPARA = {
  personal: {
    donde: 'Esta es tu carpeta personal',
    aviso: 'Esta es tu carpeta personal: si la preparo, el asistente tendría a mano todo tu ordenador. Crea una carpeta aquí dentro y trabaja en ella.',
    boton: 'Crear una carpeta aquí dentro',
  },
  otra: {
    donde: 'Esta carpeta es del sistema',
    aviso: 'Esta carpeta es del sistema: aquí no preparo nada. Crea una carpeta en tu carpeta personal y trabaja en ella.',
    boton: 'Crear una carpeta en tu carpeta personal',
  },
};
const comoSeDiceQueNo = (prohibida) => (prohibida === 'personal' ? NO_SE_PREPARA.personal : NO_SE_PREPARA.otra);

const NOMBRE_DE_LA_DELICADA = { escritorio: 'Escritorio', documentos: 'Documentos', descargas: 'Descargas' };

async function noSePrepara(parte, salida) {
  const dicho = comoSeDiceQueNo(parte.carpeta.prohibida);
  const elegido = await vscode.window.showWarningMessage(dicho.aviso, { modal: true }, dicho.boton);
  if (elegido === dicho.boton) await crearUnaCarpetaDentro(os.homedir(), salida);
  return { ok: false, cancelado: true, noSePrepara: parte.carpeta.prohibida };
}

// 'seguir', 'crear' (ya se ha abierto la nueva) o null, si no contesta.
async function confirmarLaCarpeta(parte, salida) {
  const crear = 'Crear una carpeta aquí dentro';
  const entera = 'Prepararla entera';
  const elegido = await vscode.window.showWarningMessage(
    `Vas a preparar tu carpeta de ${NOMBRE_DE_LA_DELICADA[parte.carpeta.delicada]} entera. Mejor una carpeta dentro, solo para esto.`,
    { modal: true },
    crear,
    entera,
  );
  if (elegido === entera) return 'seguir';
  if (elegido !== crear) return null;
  await crearUnaCarpetaDentro(proyecto.raiz(), salida);
  return 'crear';
}

// 'seguir' o null. Elegir otra abre el mismo diálogo que «Elegir otra carpeta».
async function confirmarDentroDeOtro(parte) {
  const igual = 'Prepararla igual';
  const otra = 'Elegir otra carpeta';
  const elegido = await vscode.window.showWarningMessage(
    // Sin «proyecto»: desde la 195 nombra a los de dentro de un monorepo, no a lo de arriba.
    `Esta carpeta está dentro de «${parte.dentroDeOtro.nombre}». Si la preparo, sus copias irán aparte.`,
    { modal: true },
    igual,
    otra,
  );
  if (elegido === igual) return 'seguir';
  if (elegido === otra) await elegirOtraCarpeta();
  return null;
}

// ── Elegir la carpeta ya es decir «quiero trabajar aquí» (decisión 184) ────
//
// Abrir una carpeta recarga la ventana y la barra arranca de nuevo, así que lo
// que se eligió desde la barra se apunta antes de abrirla, en el almacén del
// editor, y la barra nueva lo recoge: la ruta y la hora. Solo vale unos
// minutos, y se borra al recogerlo, lo coja o no: abrir cualquier carpeta por
// otro camino no empieza nada.
const CLAVE_ELEGIDA = 'executiveLab.carpetaElegida';
const VIGENCIA_DE_LA_ELECCION = 5 * 60 * 1000;
let almacenDeLaEleccion = null;

function saberDondeRecordarLaEleccion(almacen) {
  almacenDeLaEleccion = almacen || null;
}

const esaRuta = (ruta) => {
  const limpia = path.resolve(String(ruta || ''));
  try { return fs.realpathSync(limpia); } catch { return limpia; }
};

async function apuntarLaEleccion(ruta) {
  if (!almacenDeLaEleccion || !ruta) return;
  await almacenDeLaEleccion.update(CLAVE_ELEGIDA, { ruta: esaRuta(ruta), hora: Date.now() });
}

// Devuelve true si esta carpeta es la que se acaba de elegir desde la barra.
async function tomarLaEleccion(raiz) {
  if (!almacenDeLaEleccion) return false;
  const apuntada = almacenDeLaEleccion.get(CLAVE_ELEGIDA);
  if (!apuntada) return false;
  await almacenDeLaEleccion.update(CLAVE_ELEGIDA, undefined);
  return Boolean(raiz) && typeof apuntada.ruta === 'string'
    && Date.now() - apuntada.hora < VIGENCIA_DE_LA_ELECCION
    && apuntada.ruta === esaRuta(raiz);
}

// ¿Se puede empezar a preparar sola? Solo una carpeta nueva o vacía, que no es
// delicada ni prohibida, que no va dentro de otro proyecto y que no tiene ya su
// `.rsc.json`. Cualquier otra se queda con su botón, como siempre.
function sePuedePrepararAlElegirla(parte) {
  const c = parte && parte.carpeta;
  return Boolean(c) && c.vacia && !c.delicada && !c.prohibida
    && !parte.dentroDeOtro && parte.declarada === 'no' && !parte.recibo;
}

async function elegirOtraCarpeta() {
  const elegida = await vscode.window.showOpenDialog({
    canSelectFolders: true,
    canSelectFiles: false,
    canSelectMany: false,
    openLabel: 'Trabajar aquí',
    title: 'Elige la carpeta con la que quieres trabajar',
  });
  if (!elegida || !elegida.length) return;
  await apuntarLaEleccion(elegida[0].fsPath);
  await vscode.commands.executeCommand('vscode.openFolder', elegida[0], { forceNewWindow: false });
}

const NOMBRE_QUE_NO_VALE = 'Ese nombre no vale para una carpeta: sin barras ni símbolos.';
const nombreQueVale = (nombre) => Boolean(nombre) && !/[\\/:*?"<>|]/.test(nombre) && !nombre.startsWith('.');

// Se abre en esta misma ventana, como al elegir carpeta: dos ventanas dejan al
// alumno sin saber cuál es la suya.
async function crearUnaCarpetaDentro(base, salida) {
  const escrito = await vscode.window.showInputBox({
    title: 'Crear una carpeta',
    prompt: '¿Cómo se llama la carpeta nueva? Es donde vas a trabajar.',
    placeHolder: 'Contabilidad · Marketing · el proyecto que sea',
    ignoreFocusOut: true,
    validateInput: (v) => (!v || nombreQueVale(v.trim()) ? null : NOMBRE_QUE_NO_VALE),
  });
  const nombre = (escrito || '').trim();
  if (!nombre) return { ok: false, cancelado: true };
  if (!nombreQueVale(nombre)) {
    await vscode.window.showWarningMessage(NOMBRE_QUE_NO_VALE);
    return { ok: false };
  }

  const nueva = path.join(base, nombre);
  try {
    fs.mkdirSync(nueva, { recursive: true });
  } catch (error) {
    if (salida) salida.appendLine(`[arrancar] no se pudo crear ${nueva}: ${error.message}`); // diccionario: interno
    await avisarConSalida('No he podido crear la carpeta. Pulsa «Algo va mal» y pásale el código a tu tutor.');
    return { ok: false };
  }
  await apuntarLaEleccion(nueva);
  await vscode.commands.executeCommand('vscode.openFolder', vscode.Uri.file(nueva), { forceNewWindow: false });
  return { ok: true, nueva };
}

// «Ponerlas ahora»: las copias de una carpeta que se montó sin ellas (B3). Se
// olvida la respuesta de seguir sin copias, se prepara el historial y se deja
// el punto de partida, que aquí es nuestro: no había ninguno.
async function ponerLasCopias(contexto) {
  if (!(await git.hay())) return { ok: false, faltaGit: true };
  await loQueDecidio(contexto).update(CLAVE_SIN_GIT, undefined);
  const habia = proyecto.existe('.git');
  if (!(await prepararHistorial())) {
    return { ok: false, mensaje: 'No he podido preparar las copias. Pulsa «Algo va mal» y pásale el código a tu tutor.' };
  }
  const partida = await COMO_SE_HACE.puntoDePartida();
  if (!partida.ok) {
    // El historial que se acaba de crear, sin ninguna copia, se quita: con él, la
    // pieza decía «Listas» sin haber copias, y no quedaba botón (revisión de la 147).
    if (!habia && !(await procesos.git('rev-parse', '--verify', '-q', 'HEAD')).salida.trim()) {
      try { fs.rmSync(path.join(proyecto.raiz(), '.git'), { recursive: true, force: true }); } catch { /* se queda: lo dice la pieza */ }
    }
    return { ok: false, mensaje: partida.pega, ...(partida.boton ? { boton: partida.boton } : {}) };
  }
  return { ok: true, mensaje: 'Ya hay copias. La primera es el punto de partida.' };
}

// Aquí ya había un montaje de asistente. No se decide por nadie: se le enseña
// lo que tiene y se le pregunta, y lo suyo no se borra pase lo que pase.
async function pedirPermiso(parte) {
  const suyo = parte.otroMontaje.asistentes
    .map((a) => [
      a.habilidades && `${a.habilidades} ${a.habilidades === 1 ? 'habilidad' : 'habilidades'}`,
      a.comandos && `${a.comandos} ${a.comandos === 1 ? 'comando' : 'comandos'}`,
      a.agentes && `${a.agentes} ${a.agentes === 1 ? 'agente' : 'agentes'}`,
    ].filter(Boolean).join(', '))
    .filter(Boolean);
  const ficheros = parte.otroMontaje.ficheros;

  const visto = [...suyo, ...(ficheros.length ? [ficheros.join(', ')] : [])].join(' · ');

  const si = 'Sí, móntalo encima';
  const elegido = await vscode.window.showInformationMessage(
    'Aquí ya tienes un asistente montado a mano. Puedo poner el arnés encima sin quitarte nada de lo que ya tienes.',
    { modal: true, detail: `He encontrado: ${visto}.\n\nAntes de tocar nada te enseño qué cambia, y no se monta sin tu sí. Si algo tuyo se llama igual que algo del arnés, te pregunto qué hago con ello.` },
    si,
  );
  return elegido === si;
}

// Ejecutar el plan, con barra de progreso y sin tragarse ningún fallo.
async function hacerLosPasos(plan, parte, respuestas, contexto, salida) {
  const queEscriben = plan.pasos.filter((paso) => paso.escribe);
  if (!queEscriben.length) return { ok: true, yaEstaba: true, mensaje: 'No hacía falta tocar nada.' };

  return vscode.window.withProgress(
    { location: vscode.ProgressLocation.Notification, title: 'Preparando esta carpeta', cancellable: false },
    async (progreso) => {
      const avisos = [];
      const encargos = [];
      // Lo que RSC dijo que falta del suelo al aplicar: con la cadena SDD, los
      // innegociables. El arnés está montado y lo nuestro se sigue poniendo.
      const dijoRsc = [];
      const renombrados = [];
      // Lo que salió mal y hay que decir, aunque el montaje siga.
      const pegas = [];
      // Y lo que se hizo solo y hay que decir una vez (decisión 157).
      const dichos = [];

      for (const paso of plan.pasos) {
        if (paso.escribe) progreso.report({ message: `${paso.etiqueta}…` });

        const hecho = await COMO_SE_HACE[paso.id]({ respuestas, parte, contexto, salida, progreso });
        if (hecho.encargo) encargos.push(hecho.encargo);
        if (hecho.faltan) dijoRsc.push(...hecho.faltan);
        if (hecho.renombrados) renombrados.push(...hecho.renombrados);
        if (hecho.dicho) dichos.push(hecho.dicho);
        if (hecho.detalle) salida.appendLine(`[arrancar] ${paso.id}: ${hecho.detalle}`); // diccionario: interno

        // Una pega en un paso que sale bien también se dice: el montaje sigue, y la
        // persona sabe qué ha quedado a medias (decisión 145, `git-permissions`).
        if (hecho.ok && hecho.pega) pegas.push(hecho.pega);
        if (hecho.ok) continue;

        // Dijo que no a montar sobre lo suyo: no es un fallo, y no se toca nada.
        if (hecho.cancelado) return { ok: false, cancelado: true, sinPermiso: true };
        if (hecho.forma === 'NoSeRenombro') return { ok: false, mensaje: hecho.mensaje };

        // Sin arnés no hay nada que hacer: se para y se cuenta.
        if (hecho.imprescindible) {
          return { ok: false, mensaje: 'No he podido montar el arnés. Pulsa "Algo va mal" y pásale el código a tu tutor.' };
        }
        // Lo demás se apunta y se sigue: media cosa puesta y dicha vale más que
        // ninguna y callada. Antes estos fallos se tiraban sin mirarlos.
        salida.appendLine(`[arrancar] ${paso.id} no ha salido bien`); // diccionario: interno
        avisos.push(paso.id);
        if (hecho.pega) pegas.push(hecho.pega);
      }

      // El suelo, después de montar, desde dos sitios: lo que RSC dijo que
      // falta y lo que ve la barra, que son sus tres piezas. RSC puede decir
      // que terminó y dejarlo a medias, o decir que está a medias con el plan
      // aplicado. En los dos casos lo que falta lo levanta el asistente.
      const montado = plan.pasos.some((p) => p.id === 'montarElArnes');
      const veLaBarra = montado ? Object.entries(proyecto.sueloDelArnes()).filter(([, hay]) => !hay).map(([que]) => que) : [];
      const faltan = [...new Set([...dijoRsc, ...veLaBarra])];
      const sueloAMedias = faltan.length > 0;
      if (sueloAMedias) {
        salida.appendLine(`[arrancar] el arnés quedó montado y falta el suelo: ${faltan.join(', ')}`); // diccionario: interno
        encargos.push('levantarElSuelo');
      }

      // Lo que va en el primer mensaje, con su contrato entero. Se calcula ahora,
      // que todavía se sabe cómo era la carpeta: después de montar ya no es
      // «empezada» (A7).
      const paraElMensaje = encargos
        .filter((nombre) => COMO_SE_ENTREGA[nombre] === 'mensaje')
        .map((nombre) => encargosDelAsistente.traer(nombre, parte))
        .filter(Boolean)
        .map((encargo) => encargo.prompt);

      return {
        ok: true,
        rama: plan.rama,
        avisos,
        pegas,
        encargos,
        paraElMensaje,
        sueloAMedias,
        faltan,
        objetivo: respuestas.objetivo,
        alcance: respuestas.alcance || null,
        personas: respuestas.personas || null,
        web: respuestas.web,
        nombres: respuestas.nombres || { arnes: null, empresa: null },
        // «Listo» solo cuando el arnés también lo daría por listo (G7). Con el
        // suelo a medias está montado, y lo que falta sale al terminar.
        mensaje: (sueloAMedias
          ? `${(respuestas.nombres && respuestas.nombres.arnes) || 'Tu arnés'} ya está montado. Al terminar te enseño lo que falta.`
          : `${(respuestas.nombres && respuestas.nombres.arnes) || 'Tu arnés'} ya está listo.`) + loQueSeRenombro(renombrados),
        renombrados,
        dichos,
        // Los asistentes que se pusieron solos en este ordenador (decisión 181).
        puestos: losQueSePusieron(),
      };
    },
  );
}

// Lo que lleva la carpeta y cuánta gente hay detrás, dicho para el asistente
// en el primer mensaje. Es lo que el `init` de RSC pregunta en su
// descubrimiento, y aquí ya se sabe.
const EN_EL_MENSAJE = {
  alcance: { tarea: 'una tarea concreta', proyecto: 'un proyecto', departamento: 'un departamento o un área', empresa: 'la empresa entera' },
  personas: { 'solo-yo': 'solo estoy yo', '2-10': 'somos de 2 a 10 personas', '11-50': 'somos de 11 a 50 personas', 'mas-de-50': 'somos más de 50 personas' },
};

function loQueLlevaLaCarpeta({ alcance, personas } = {}) {
  const que = EN_EL_MENSAJE.alcance[alcance];
  const quienes = EN_EL_MENSAJE.personas[personas];
  if (que && quienes) return `En esta carpeta llevo ${que}, y ${quienes}.`;
  if (que) return `En esta carpeta llevo ${que}.`;
  if (quienes) return `${quienes.charAt(0).toUpperCase()}${quienes.slice(1)}.`;
  return '';
}

// Por dónde le llega al asistente cada encargo del arranque (A7). Ninguno se
// queda solo en el registro, que es donde se quedaban:
//   mensaje  en el primer mensaje, con su contrato entero;
//   pieza    en «Qué falta por montar», con su botón.
const COMO_SE_ENTREGA = {
  ordenarLaCarpeta: 'mensaje',
  ordenarLasClaves: 'mensaje',
  levantarElSuelo: 'pieza',
};

// Si en esta carpeta hay freno ante órdenes peligrosas, leído como lo lee «Las
// reglas»: armado, sin apagar, y con un perfil que no es técnico.
function hayFreno() {
  return require('./reglas').losGuardianes().some((g) => g.id === 'danger-guard' && g.estado === 'armado');
}

// El primer mensaje al asistente, al terminar de montar. Sale en la caja del
// chat antes de mandarse, así que es texto de pantalla como cualquier otro.
//
// Hace lo que el `init` de RSC espera al empezar (A6): que se complete el perfil
// —a qué se dedica, qué herramientas usa, qué no se puede tocar—, que se sepa
// si hay freno, y que se pregunte de una en una. En una carpeta de alguien,
// además, que mire antes de tocar. Los encargos que van en el mensaje,
// después del objetivo, cada uno en su párrafo.
function primerMensaje(hecho, { comoSeLlama, conWeb = '', conFreno = false }) {
  const { empresa } = hecho.nombres || {};
  const deQuien = empresa && empresa !== comoSeLlama ? ` Es para ${empresa}.` : '';
  const queLleva = loQueLlevaLaCarpeta(hecho);
  const deAlguien = ['encimaDeLoQueHay', 'otroArnes'].includes(hecho.rama)
    ? ' La carpeta ya tenía cosas de antes: mira qué hay antes de tocar nada.'
    : '';
  const encargos = (hecho.paraElMensaje || []).map((prompt) => `\n\n${prompt}\n\n`).join('');
  // Lo de la web y los encargos van en párrafo aparte; sin ellos, un espacio.
  // Antes salía «facturas.Después» pegado.
  const enMedio = conWeb || encargos ? `${conWeb}${encargos}` : ' ';
  const freno = conFreno
    ? 'En esta carpeta hay freno ante órdenes peligrosas.'
    : 'En esta carpeta no hay freno ante órdenes peligrosas: antes de una orden que borre o deshaga algo, pregúntame.';
  return `Acabo de montar aquí un arnés que he llamado "${comoSeLlama}".${deQuien}${queLleva ? ` ${queLleva}` : ''}${deAlguien}`
    + ` Lo primero que quiero resolver: ${hecho.objetivo}.${enMedio}`
    + `Completa conmigo el perfil: a qué me dedico, qué herramientas uso y qué no se puede tocar. ${freno} Pregúntame de una en una.`;
}

module.exports = {
  estaEnGitConLaBarra, ponerLoDeClaude, quitarLoDeClaude, recordarSiSeMontaAqui, hacerLosPasos,
  arrancar, estaEnMarcha, dejarDeEsperarAGit, sePuedeSinNadie, sePuedeRetomar, faltanPorContestar, RAMAS_SIN_NADIE, RAMAS_QUE_SE_RETOMAN, momento, ESPERANDO_A_GIT, CLAVE_SIN_GIT, confirmarLoQueSeToca, confirmarLoQueCambia, entrevistar, ponerLosRailes, flagsDelMontaje, loQueLlevaLaCarpeta, primerMensaje,
  saberDondeRecordarLaEleccion, apuntarLaEleccion, tomarLaEleccion, sePuedePrepararAlElegirla,
  nombreDeLaCarpeta, confirmarLaCarpeta, confirmarDentroDeOtro, crearUnaCarpetaDentro, comoSeDiceQueNo, ponerLasCopias, apuntarLosEnganches,
  prepararTambienPara, ponerElBloque, preguntarAsistente, ponerElAsistente, losQueSePusieron,
  COMO_SE_ENTREGA, hayFreno, PIEZAS_DEL_PLAN, comoSeDiceLoQueCambia,
  COMO_SE_HACE, COMO_SE_PREGUNTA, DE_QUE_VA, QUE_LLEVA, CUANTAS_PERSONAS, QUE_VAS_A_CONSTRUIR,
  COMO_TE_MANEJAS, OBJETIVOS_POR_TIPO, SIN_COPIAS_HASTA_QUE_QUIERAS,
};
