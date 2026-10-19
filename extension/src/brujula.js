// La brújula: dónde estás, qué acabas de hacer, qué sabe ya de tu empresa.
//
// Decisión importante: esto NO se lee de la conversación de Claude. Se deriva
// del disco — el checkpoint de RSC, el historial de la wiki, la última copia
// de seguridad y lo que haya montado en el arnés. Así la barra lateral no
// depende de la interfaz de Anthropic y sigue funcionando cuando ellos cambien
// su panel.
//
// La skill `orient` de RSC hace lo mismo dentro de la conversación. Aquí se
// repite fuera, en forma de pantalla, porque leer un párrafo y ver un botón no
// cuestan lo mismo cuando no sabes qué estás haciendo.
//
// Los botones ya no están aquí: los descubre `acciones.js` de los comandos del
// proyecto, porque el arnés de una gestoría no lleva los mismos que el de una
// empresa de contratos.

const proyecto = require('./proyecto');
const rsc = require('./rsc');
const guardar = require('./guardar');
const sesionDelAsistente = require('./sesion-del-asistente');
const git = require('./git');
const terreno = require('./terreno');
const rumbo = require('./rumbo');
const conexiones = require('./conexiones');
const cerebro = require('./cerebro');
const asistentes = require('./asistentes');
const porDondeIbas = require('./por-donde-ibas');
const ultimaConversacion = require('./ultima-conversacion');

// Git, para la pantalla sin arnés (decisión 165): si falta; si se puede poner al
// pulsar Preparar, la línea que lo dice; si se está poniendo, y si sigue el
// montaje cuando acabe o ya no; y si hay respuestas guardadas esperándolo.
async function loDeGit() {
  const falta = !(await guardar.hayGit());
  const poniendo = falta && git.seEstaPoniendo();
  return {
    faltaGit: falta,
    comoSeInstalaGit: git.comoSeInstala(),
    gitAlPreparar: falta && git.sePuedeInstalarSolo() ? git.AL_PREPARAR : null,
    poniendoGit: poniendo ? (require('./arrancar').estaEnMarcha() ? 'conLasRespuestas' : 'solo') : null,
    esperandoAGit: Boolean(require('./respuestas').leer()),
  };
}

// Con las respuestas guardadas no se promete preguntar: ya se preguntó.
const YA_CONTESTADO = {
  conGit: 'Ya me has contestado lo que hacía falta. Al pulsar la termino de preparar.',
  sinGit: 'Ya me has contestado lo que hacía falta. Al pulsar pongo git y la termino de preparar.',
};
const conLoContestado = (estado) => (estado.esperandoAGit
  ? { ...estado, donde: 'Tu carpeta está a medio preparar', aviso: estado.faltaGit ? YA_CONTESTADO.sinGit : YA_CONTESTADO.conGit }
  : estado);

// Nombres del diccionario para las dos carpetas del arnés.
const ZONAS = { '02-DOCS': 'Conocimiento', '01-TOOLS': 'Conexiones' };

function humanizar(texto) {
  const limpio = texto.replace(/[-_]+/g, ' ').trim().toLowerCase();
  return limpio.charAt(0).toUpperCase() + limpio.slice(1);
}

// RSC manda las rutas tal y como se las da git, y git las marca: `M `, `A `,
// `D `, `?? `… Una ruta marcada no empieza por `02-DOCS`, empieza por
// `M 02-DOCS`, así que dejaba de reconocerse como zona.
//
// Eso vaciaba la brújula justo en el caso normal: en cuanto la wiki está
// guardada en git —o sea, en todo alumno a partir del primer guardado— todas
// llegan con `M ` delante y no salía ninguna zona. La pantalla principal dejaba
// de decir dónde se había trabajado, sin que nada fallara.
//
// Quitar la marca es seguro: abajo solo se reconocen `02-DOCS` y `01-TOOLS`, así
// que esto no puede devolver la basura de antes («M 01 tools»), solo recuperar
// las dos que sí valen. Un renombrado viene como `old -> new`: vale la nueva.
function sinLaMarcaDeGit(ruta) {
  return String(ruta)
    .replace(/^\s*[MADRCU?!]{1,2}\s+/, '')
    .replace(/^.*\s->\s/, '')
    .trim();
}

// Las rutas que tocó la última sesión, traducidas a zonas del diccionario. Una
// ruta en crudo no aparece nunca en pantalla.
function zonasTocadas(rutas) {
  const zonas = new Set();
  for (const cruda of rutas) {
    const ruta = sinLaMarcaDeGit(cruda);
    const partes = ruta.split('/').filter(Boolean);
    if (!partes.length || partes[0].startsWith('.')) continue;

    if (partes[0] === '02-DOCS') {
      // El andamio del arnés no es un tema: tocar un documento de trabajo salía
      // «Conocimiento (Ftd)», y desde la decisión 160 eso se ve en la tarjeta del día.
      const tema = partes[1] === 'wiki' && partes[2] && !partes[2].includes('.') && !cerebro.esAndamio(partes[2]);
      zonas.add(tema ? `${ZONAS['02-DOCS']} (${humanizar(partes[2])})` : ZONAS['02-DOCS']);
    } else if (partes[0] === '01-TOOLS') {
      // Un fichero suelto en 01-TOOLS no es una herramienta. Sin esto, tocar
      // `01-TOOLS/README.md` salía como "Conexiones (Readme.md)", que no
      // significa nada para nadie.
      const proveedor = partes[1] && !partes[1].startsWith('_') && !partes[1].includes('.');
      zonas.add(proveedor ? `${ZONAS['01-TOOLS']} (${humanizar(partes[1])})` : ZONAS['01-TOOLS']);
    }
    // Cualquier otra carpeta NO es una zona. Antes lo era, y salían rótulos sin
    // sentido: Jose vio "Tus programas (Odoo) · M 01 tools" en su barra. Un
    // nombre de carpeta cualquiera humanizado no le dice nada a nadie, y la
    // brújula es justo el sitio donde no se puede escribir ruido.
  }
  return [...zonas];
}

// La continuación de RSC llega como líneas "clave: valor". Solo nos interesa
// por dónde andaba la persona.
function interpretar(continuacion) {
  if (!continuacion) return null;
  const campos = {};
  for (const linea of continuacion.split('\n')) {
    const corte = linea.indexOf(': ');
    if (corte > 0) campos[linea.slice(0, corte).trim()] = linea.slice(corte + 2).trim();
  }
  const rutas = campos.files && campos.files !== 'none' ? campos.files.split(', ') : [];
  const zonas = zonasTocadas(rutas);
  if (!zonas.length) return null;

  // Dos zonas informan más, pero en una barra estrecha y en serif grande se
  // comen tres líneas y dejan de leerse. Si no cabe, una.
  const dos = juntarLasIguales(zonas.slice(0, 2));
  return dos.length <= 42 ? dos : zonas[0];
}

// "Tus programas (Holded) · Tus programas (Gmail)" repite el rótulo dos veces
// y se sale de la línea. Dicho como lo diría una persona —"Tus programas
// (Holded, Gmail)"— cabe, y se lee mejor.
function juntarLasIguales(zonas) {
  const porRotulo = new Map();
  for (const zona of zonas) {
    const parte = zona.match(/^(.*?) \((.+)\)$/);
    const rotulo = parte ? parte[1] : zona;
    const detalle = parte ? parte[2] : null;
    if (!porRotulo.has(rotulo)) porRotulo.set(rotulo, []);
    if (detalle) porRotulo.get(rotulo).push(detalle);
  }
  return [...porRotulo]
    .map(([rotulo, detalles]) => (detalles.length ? `${rotulo} (${detalles.join(', ')})` : rotulo))
    .join(' · ');
}

// Calcular el estado lanza procesos; no hace falta repetirlo cada vez que la
// barra parpadea. Veinte segundos de memoria bastan.
let ultimo = { cuando: 0, estado: null };

async function estado({ fresco = false } = {}) {
  if (!fresco && ultimo.estado && Date.now() - ultimo.cuando < 20000) return ultimo.estado;
  // Con varias carpetas abiertas, en todas las pantallas se dice con cuál (B9).
  const calculado = { ...(await calcular()), conVarias: proyecto.conVarias() };
  ultimo = { cuando: Date.now(), estado: calculado };
  return calculado;
}

// Olvidar es olvidar del todo: la continuación se recuerda aparte —cuesta un
// proceso y cambia mucho más despacio— y si no cayera aquí, cambiar de carpeta
// dejaría en pantalla el rótulo de la anterior hasta un minuto.
const olvidar = () => {
  ultimo = { cuando: 0, estado: null };
  rsc.olvidarLaContinuacion();
};

async function calcular() {
  if (!proyecto.raiz()) {
    return { listo: false, sinCarpeta: true, donde: 'Elige con qué quieres trabajar', hiciste: null };
  }

  // Sin arnés hay dos carpetas muy distintas, y antes se trataban igual: una
  // vacía, donde se puede montar sin pensar, y una que ya es de alguien. En la
  // segunda hay que decir qué se ha visto antes de ofrecer nada (terreno.js).
  if (!proyecto.existe('.rsc.json')) {
    // La carpeta personal, la raíz o una del sistema no se preparan (B1). Se
    // dice aquí, antes de ofrecer nada, y la salida es una carpeta nueva.
    const { prohibida, delicada } = terreno.comoEsEstaCarpeta(proyecto.raiz());
    if (prohibida) {
      const dicho = require('./arrancar').comoSeDiceQueNo(prohibida);
      return { listo: false, sinArnes: true, noSePrepara: prohibida, hiciste: null, donde: dicho.donde, aviso: dicho.aviso, boton: dicho.boton };
    }

    const hay = await terreno.queHay();

    // Un montaje nuestro a medias, sin su `.rsc.json` (B8): se ofrece
    // terminarlo, como cuando falta el suelo.
    if (hay.tipo === 'aMedias') {
      return conLoContestado({
        listo: false,
        sinArnes: true,
        aMedioPreparar: true,
        donde: 'Tu carpeta está a medio preparar',
        hiciste: null,
        aviso: 'Se quedó algo sin montar, seguramente porque se cerró antes de tiempo. Se termina en un momento y no se pierde nada de lo que ya haya.',
        ...(await loDeGit()),
      });
    }

    const comun = {
      listo: false,
      sinArnes: true,
      hiciste: null,
      ...(await loDeGit()),
    };

    // Dentro de una carpeta ya preparada, como un proyecto de un monorepo, no se
    // ofrece montar otro arnés: se trabaja desde la de arriba (decisión 195).
    // Prepararla igual sigue a un clic, detrás.
    const arriba = terreno.queHayEncima(proyecto.raiz());
    if (arriba && arriba.conArnes) {
      return conLoContestado({
        ...comun,
        donde: `Esta carpeta es parte de «${arriba.nombre}»`,
        aviso: `«${arriba.nombre}» ya está preparada. Ábrela y trabaja desde allí: esta carpeta está dentro.`,
        parteDe: { nombre: arriba.nombre },
      });
    }

    if (hay.tipo !== 'empezada') {
      return conLoContestado({
        ...comun,
        donde: 'Aquí todavía no hay nada',
        // Cuántas se preguntan de verdad, contadas por `rumbo` (A8): prometía una.
        aviso: (({ min, max }) => `Puedo preparar esta carpeta. Tarda unos minutos, y antes te hago entre ${min} y ${max} preguntas, de una en una.`)(rumbo.cuantasPreguntas({ recibo: null, railes: null, carpeta: { delicada }, dentroDeOtro: terreno.queHayEncima(proyecto.raiz()) })),
      });
    }

    return conLoContestado({
      ...comun,
      donde: 'Aquí ya hay trabajo tuyo',
      yaEmpezada: {
        cuantos: hay.cuantos,
        parece: hay.parece,
        conHistorial: hay.conHistorial,
        sinGuardar: hay.sinGuardar,
        claves: hay.claves ? hay.claves.claves : 0,
      },
      aviso: 'Puedo añadir el asistente a lo que ya tienes, sin tocar nada de lo que hay.',
    });
  }

  // ── A medio preparar: se manda a terminarlo, no a "Algo va mal" ────────
  //
  // Esto decía «Pulsa "Algo va mal" y lo dejo listo». Se probó con una carpeta
  // a medias de verdad —como queda si se cierra el editor a mitad del montaje—
  // y ese botón **no lo arregla**: hace `repair`, que repara lo que el arnés
  // gobierna (habilidades, enganches) y no el suelo que crea el montaje. La
  // respuesta era «this harness is healthy» con `01-TOOLS` y `02-DOCS` sin
  // estar.
  //
  // O sea que el alumno pulsaba lo que se le decía, le contestaban que todo
  // estaba bien, y su espacio seguía a medias. Un callejón, y encima con un
  // mensaje tranquilizador.
  //
  // Lo que sí lo restaura es volver a pasar el montaje, que es lo que hace
  // «Preparar esta carpeta» — comprobado: vuelve a dejar el suelo entero.
  if (!proyecto.arnesCompleto()) {
    return conLoContestado({
      listo: false,
      sinArnes: true,
      aMedioPreparar: true,
      donde: 'Tu carpeta está a medio preparar',
      hiciste: null,
      aviso: 'Se quedó algo sin montar, seguramente porque se cerró antes de tiempo. Se termina en un momento y no se pierde nada de lo que ya haya.',
      ...(await loDeGit()),
    });
  }

  const [continuacion, copias] = await Promise.all([rsc.retomarSinEsperar(), guardar.copias(1)]);
  const [ultimoAprendido] = cerebro.aprendidoUltimamente(1);
  const sabe = cerebro.cuantoSabe();
  const conectados = conexiones.proveedores().length;
  const esperando = cerebro.esperandoLectura();

  const hiciste = ultimoAprendido
    ? `Aprendió sobre ${ultimoAprendido.titulo}`
    : (copias.length ? `Guardaste una copia ${guardar.haceCuanto(copias[0].cuando)}` : null);

  // Recién montado y sin nada hecho: lo primero es la cuenta. No se puede
  // saber desde aquí si ha iniciado sesión —la credencial vive en el llavero
  // del sistema— así que no se adivina: se convierte en el primer paso, y
  // desaparece en cuanto haya pasado algo.
  //
  // El punto de partida no es que haya pasado algo: lo guarda la barra al
  // terminar de montar. Contándolo, esta tarjeta no salía nunca, justo el
  // primer día (decisión 164). Una copia suya, o una que la barra guarda sola
  // porque ha cambiado algo, sí cuenta.
  const quien = asistentes.elDeAhora();
  const copiasSuyas = copias.filter((c) => !guardar.esElPuntoDePartida(c));
  const sinEmpezar = !continuacion && !sabe && !conectados && !copiasSuyas.length;

  // Decisión 186: lo que se puede saber de la sesión, sin adivinar. Con `si`, la
  // tarjeta de «entra con tu cuenta» sobra; con `no`, va antes que el primer
  // encargo, que se queda esperando; sin saberlo, como siempre. Solo se mira
  // cuando la tarjeta podría salir: el de Claude lanza un proceso.
  const aplazado = Boolean(sesionDelAsistente.loAplazado());
  const sesion = sinEmpezar || aplazado ? await sesionDelAsistente.haySesion(quien) : null;
  const conTarjeta = (sinEmpezar && sesion !== 'si') || (aplazado && asistentes.estaPuesto(quien));

  // Que falte el asistente no es solo un problema del primer día: si alguien lo
  // desinstala, o abre esta carpeta en otro ordenador, la barra sigue pintando
  // botones que no van a contestar. Antes esto solo se decía cuando no se había
  // empezado nada, así que a partir del segundo día se callaba.
  const faltaElAsistente = !asistentes.estaPuesto(quien);
  const conGit = await guardar.hayGit();

  // ── Montado, pero sin ajustar ─────────────────────────────────────────
  //
  // Un arnés puede estar entero para RSC y no tener nada de la barra: le falta
  // la habilidad que fija el español y el vocabulario, o los nombres del
  // perfil, o se montó con una versión anterior a la que la barra lleva dentro.
  // Pasa en cuanto alguien monta el arnés por su cuenta con `npx rsc`, o cuando
  // el repositorio viene de otro sitio, o —esto le va a pasar a todo el
  // mundo— cuando la barra sube de versión mayor.
  //
  // Hasta ahora esto solo se veía entrando en «Qué falta por montar», que es
  // justo donde no entra quien no sabe que le falta algo. La pantalla decía
  // «listo» y los botones hablaban con un arnés a medio ajustar.
  //
  // Quién decide es `rumbo`, el mismo que decide el arranque: una sola verdad.
  // Y sale gratis, porque `mirarYClasificar()` no lanza ni un proceso.
  const rama = rumbo.elegirRama({ ...terreno.mirarYClasificar(), git: { hay: conGit } }).rama;
  const sinAjustar = rama === 'adoptar' || rama === 'ponerAlDia' ? rama : null;

  // Dónde tocó la última sesión, según la memoria del arnés.
  const laUltimaZona = interpretar(continuacion);

  return {
    listo: true,
    sinAjustar,
    donde: laUltimaZona || (conectados === 0 && sabe === 0 ? 'Acabas de empezar' : 'Tu trabajo'),
    laUltimaZona,
    hiciste,
    // Por dónde ibas, para «Seguir donde lo dejé» (decisión 160): lo que dice
    // `next:` o el documento de trabajo en marcha más reciente, leído del disco.
    // Sin nada en marcha, null, y el botón se queda como estaba.
    ibasPor: porDondeIbas.porDondeIbas(proyecto.raiz(), continuacion),
    // «Volver a la última conversación» (decisión 191): solo con Claude, que es el
    // que documenta cómo abrir una conversación por su id, y solo si el enganche de
    // avisos apuntó una. Va el hecho, no el id: el id no sale de la extensión.
    volverALaUltima: quien.id === 'claude' && ultimaConversacion.laUltima(proyecto.raiz()) ? { accion: { tipo: 'volverALaConversacion' } } : null,
    sabe,
    conectados,
    esperando,
    faltaGit: !conGit,
    comoSeInstalaGit: git.comoSeInstala(),
    faltaElAsistente: faltaElAsistente ? quien.nombre : null,
    // Y el botón que lo pone, hecho aquí, que es quien sabe cuál (decisión 166).
    ponerElAsistente: faltaElAsistente ? asistentes.falta(quien).boton : null,
    primerPaso: conTarjeta ? {
      asistente: quien.nombre,
      instalado: asistentes.estaPuesto(quien),
      // Solo cuando hay algo esperando: así la forma de antes no cambia.
      ...(aplazado ? { esperaElEncargo: true, sesion } : {}),
    } : null,
  };
}

module.exports = { estado, olvidar, interpretar, zonasTocadas };
