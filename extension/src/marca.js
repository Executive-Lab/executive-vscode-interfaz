// La marca de la empresa del alumno, no la nuestra.
//
// Cuando el alumno dice cuál es la web de su empresa, el asistente la mira y
// deja el récord en `02-DOCS/wiki/brand/marca.md` — que es donde RSC guarda la
// identidad visual de un proyecto (la misma carpeta que usan `design`,
// `design-dna` y `brand-voice`). El panel lo lee y se pinta con sus colores y
// su logotipo.
//
// Mientras no exista ese fichero, la marca es la de Executive Lab. Es el
// default correcto: durante el curso, hasta que cuente de qué va su empresa.
//
// Aquí no se cambia la tipografía ni los tamaños. Los colores de una web se
// pueden adoptar sin romper nada; una tipografía ajena, no — y el público de
// esto no puede permitirse una interfaz que de pronto no se lee.

const fs = require('node:fs');
const path = require('node:path');
const proyecto = require('./proyecto');
const rutas = require('./rutas');
const frontmatter = require('./frontmatter');
const color = require('./color');
const medidas = require('./medidas');

const CARPETA = ['02-DOCS', 'wiki', 'brand'];
const FICHERO = 'marca.md';
const LOGOS = /\.(svg|png|jpe?g|webp)$/i;

function carpeta() {
  return proyecto.ruta(...CARPETA);
}

// El logotipo vive junto al récord. Se comprueba que no se salga de ahí: el
// nombre viene de un fichero que escribe el asistente.
//
// Y si no hay logotipo utilizable no pasa nada: el panel escribe el nombre de
// la empresa con la tipografía y los colores de la marca. Es la salida buena
// para el caso más común — un logotipo blanco sobre transparente, que sobre
// fondo claro desaparece— y para las muchas pymes que no tienen logotipo
// en un fichero a mano.
function logoDe(campos, donde) {
  if (typeof campos.logo !== 'string' || !LOGOS.test(campos.logo)) return null;
  const completa = path.resolve(donde, campos.logo);
  if (!rutas.estaDentro(donde, completa) || !fs.existsSync(completa)) return null;
  return completa;
}

// ¿El logotipo lleva el nombre de la empresa dentro, o es solo el símbolo?
//
// Importa porque un símbolo suelto en lo alto de la barra no dice de quién es
// esto. El de Nexus Consulting es una ene de puntos: preciosa, y no se sabe de
// quién es. Si el logotipo no trae el nombre, el nombre se escribe al lado.
//
// Dos maneras de saberlo, en este orden:
//
//   1. **Que lo diga el récord.** Quien miró la web vio la imagen y lo sabe.
//      Se aceptan varias formas de escribirlo porque el récord lo redacta el
//      asistente, no un formulario.
//   2. **La proporción.** Un logotipo con el nombre es una tira de letras, y
//      sale ancho; un símbolo es más o menos cuadrado. Desde tres veces más
//      ancho que alto se da por hecho que el nombre va dentro.
//
// Y si no se puede saber, se escribe el nombre. Repetirlo queda redundante;
// no ponerlo deja un dibujo anónimo, que es peor.
const SI = /^(s[ií]|yes|true|1)$/i;
const NO = /^(no|false|0)$/i;
const DICEN_QUE_SI = ['logo_lleva_el_nombre', 'logo_con_nombre', 'logotipo_con_nombre', 'logo_incluye_el_nombre'];
const DE_TIRA_PARA_ARRIBA = 3;

function llevaElNombre(campos, fichero) {
  for (const clave of DICEN_QUE_SI) {
    const dicho = campos[clave];
    if (typeof dicho !== 'string') continue;
    if (SI.test(dicho.trim())) return true;
    if (NO.test(dicho.trim())) return false;
  }

  const medida = medidas.medir(fichero);
  if (!medida) return false;
  return medida.ancho / medida.alto >= DE_TIRA_PARA_ARRIBA;
}

// Un apagado que se lea sobre los dos fondos en los que va a salir. Se empieza
// por el que peor lo pone y se comprueba en el otro.
function masApagadoQueSeLea(texto, fondo, superficie) {
  const contra = color.contraste(texto, fondo) <= color.contraste(texto, superficie) ? fondo : superficie;
  const candidato = color.apagadoSobre(texto, contra);
  const otro = contra === fondo ? superficie : fondo;
  return color.contraste(candidato, otro) >= 4.5 ? candidato : texto;
}

// ¿Se va a ver el logotipo de la empresa sobre el fondo que le toca?
//
// El nuestro se tiñe y asunto resuelto. El suyo no se toca: es su marca. Lo que
// sí se puede es ponerle una plaquita detrás cuando no se lea — que es lo que
// hace cualquiera al meter un logotipo ajeno sobre un fondo que no es el suyo.
//
// Tres casos, y el tercero importa:
//
//   · Es un SVG y alguno de sus colores contrasta con el fondo → se ve, nada
//     que hacer. Es el caso de la ene de Nexus Consulting sobre su azul marino.
//   · Es un SVG y ninguno contrasta → plaquita.
//   · No se puede medir (un PNG, un JPG) → plaquita **solo si el fondo es
//     oscuro**. Un logotipo se diseña para papel y para webs blancas, así que
//     sobre oscuro es donde desaparece; sobre claro casi siempre se ve. Es una
//     apuesta, pero es la que falla menos.
const SE_DISTINGUE = 3;

// Devuelve el color de la plaquita, o null si no hace falta ninguna. La plaquita
// se elige **contra el logotipo**, no contra el fondo: un logotipo oscuro
// necesita una clara y uno claro una oscura, y da igual de qué color sea la
// página.
function placaPara(fichero, fondo) {
  if (!fichero) return null;

  const CLARA = '#ffffff';
  const OSCURA = '#101114';

  const colores = (medidas.coloresDe(fichero) || []).filter((c) => color.esColor(c));
  if (!colores.length) {
    // No se puede medir (un PNG, un JPG). Sobre claro casi siempre se ve —los
    // logotipos se hacen para papel y para webs blancas— así que solo se pone
    // plaquita sobre oscuro, que es donde desaparecen.
    return color.luz(fondo) <= 0.5 ? CLARA : null;
  }

  if (colores.some((c) => color.contraste(c, fondo) >= SE_DISTINGUE)) return null;

  // Ninguno se distingue del fondo. La plaquita va del lado contrario al
  // logotipo: se mira el más claro que tenga, que es el que manda para verlo.
  const masClaro = colores.reduce((a, b) => (color.luz(a) >= color.luz(b) ? a : b));
  return color.luz(masClaro) > 0.5 ? OSCURA : CLARA;
}

// Devuelve los colores ya comprobados, o null si no hay marca utilizable.
function leer() {
  const donde = carpeta();
  if (!donde) return null;

  const registro = path.join(donde, FICHERO);
  if (!fs.existsSync(registro)) return null;

  const campos = frontmatter.leer(registro);
  const fondo = color.esColor(campos.fondo) ? campos.fondo.trim() : null;
  const texto = color.esColor(campos.texto) ? campos.texto.trim() : null;
  const acento = color.esColor(campos.acento) ? campos.acento.trim() : null;
  if (!fondo || !texto || !acento) return null;

  // ── De tres colores a una paleta entera, con Material Design ───────────
  //
  // Antes cada token se sacaba a mano mezclando y comprobando, y cada caso raro
  // —un fondo oscuro, uno a media luz, un blanco puro— había que arreglarlo por
  // separado. Ahora se construye la paleta tonal de Material 3 y cada sitio usa
  // el tono que le toca. Sale bien con cualquier marca sin ir color por color,
  // que es justo lo que pedía Jose.
  //
  // El `texto` del récord ya no pinta letras: solo dice si la marca es clara o
  // oscura. Las letras las pone la escala, que es la que garantiza que se lean.
  const esOscura = color.luz(fondo) <= color.luz(texto);
  const esquema = color.esquemaMaterial({ acento, fondo, oscura: esOscura });

  // Hay fondos que no admiten texto encima, ni blanco ni negro: un gris medio
  // da 3,9:1 con blanco y 4,4:1 con negro, y no hay nada que hacer. No es un
  // fallo del cálculo, es el color. Se descarta la marca entera y se dice por
  // qué, porque quedarse con la nuestra sin explicar nada es lo que hacía que
  // "poner el tema" pareciera roto.
  const seLee = (a, b) => color.contraste(a, b) >= 4.5;
  if (!seLee(esquema.texto, esquema.superficie) || !seLee(esquema.texto, esquema.tarjeta)) {
    return {
      descartada: 'con ese fondo no se lee nada encima. Pídele al asistente uno más claro o más oscuro',
      nombre: campos.empresa || campos.title || null,
    };
  }

  // El nombre a secas, para poder escribirlo cuando no haya logotipo usable.
  // El título del artículo suele ser "Marca de X", que como rótulo no sirve.
  const nombre = (typeof campos.empresa === 'string' && campos.empresa.trim())
    || (typeof campos.title === 'string' ? campos.title.replace(/^marca de\s+/i, '').trim() : null);

  const logo = logoDe(campos, donde);

  return {
    nombre: nombre || null,
    web: typeof campos.resource === 'string' ? campos.resource : null,
    // Un primer intento sacado de la web por la propia barra (`web.js`), que
    // el asistente todavía no ha mirado. Se dice, para no venderlo como final.
    provisional: String(campos.provisional || '').trim().toLowerCase() === 'si',
    logo,
    // Solo tiene sentido preguntárselo si hay logotipo y hay nombre que poner.
    logoSinNombre: Boolean(logo && nombre && !llevaElNombre(campos, logo)),
    // Si hace falta plaquita detrás del logotipo para que se vea.
    placa: Boolean(logo && placaPara(logo, esquema.superficie)),
    carpeta: donde,
    oscura: esOscura,
    tipografia: typeof campos.tipografia === 'string' ? campos.tipografia.trim() : null,
    tokens: {
      // Los de significado, que son los que pintan. Los crudos de `panel.css`
      // se quedan sin tocar a propósito: son la paleta de Executive Lab.
      '--fondo': esquema.superficie,
      '--superficie': esquema.tarjeta,
      '--superficie-2': esquema.tarjeta,
      '--texto': esquema.texto,
      '--texto-fuerte': esquema.texto,
      '--apagado': esquema.apagado,
      '--borde': esquema.borde,
      '--acento': esquema.acento,
      '--acento-relleno': esquema.acentoRelleno,
      '--sobre-acento': esquema.sobreAcento,
      // La sombra del botón principal llevaba el rojo de Executive Lab escrito
      // a fuego, así que un botón cian salía con un halo rojo debajo.
      '--acento-sombra': color.conAlfa(esquema.acentoRelleno, 0.28),
      // Lo resaltado al buscar era un amarillo fijo: sobre fondo oscuro, una
      // mancha crema.
      '--resaltado': color.conAlfa(esquema.acento, esOscura ? 0.3 : 0.35),
      // Un aviso tiene que parecer un aviso aunque la empresa sea verde lima,
      // pero llevado al tono que se ve sobre SU fondo.
      '--bien': color.deAviso(color.VERDE, esOscura),
      '--mal': color.deAviso(color.ROJO, esOscura),
      // Siempre, aunque no haga falta plaquita: la regla que la usa solo se
      // aplica cuando el logotipo la lleva, y así se mantiene la regla de que
      // la marca calcula TODOS los colores que la hoja de estilo nombra.
      '--placa': (logo && placaPara(logo, esquema.superficie)) || '#ffffff',
      // Nuestro logotipo, cuando lo que hay es la marca de una empresa y no
      // hay logotipo suyo: blanco puro sobre su fondo oscuro, negro sobre el
      // claro. El del texto no vale — es un gris, y el logotipo salía gris.
      '--logo': esOscura ? '#ffffff' : '#0a0a0a',
      // Los grupos de la foto del cerebro (decisión 197) no siguen al acento:
      // uno cian chocaría con el azul. Son la paleta validada, con los pasos que
      // se ven sobre SU fondo, claro u oscuro.
      ...(esOscura ? GRUPOS_EN_OSCURO : GRUPOS_EN_CLARO),
    },
  };
}

// Los de `panel.css`, los mismos: pasados por el validador de la paleta con todas
// las parejas, en claro sobre blanco y en oscuro sobre el fondo del editor.
const GRUPOS_EN_CLARO = { '--grupo-1': '#ec4429', '--grupo-2': '#2a78d6', '--grupo-3': '#1baf7a', '--grupo-resto': '#a29d95' };
const GRUPOS_EN_OSCURO = { '--grupo-1': '#ec4429', '--grupo-2': '#3987e5', '--grupo-3': '#199e70', '--grupo-resto': '#77736d' };

// El bloque que se cuela en la página para que mande sobre los valores por
// defecto de panel.css.
//
// ── Y el caso del tema oscuro ────────────────────────────────────────────
//
// `panel.css` tiene una regla que, con un tema oscuro del editor, le quita a la
// marca el fondo y se queda solo con los acentos. Se puso por una razón buena:
// una isla color crema dentro de un editor negro queda fatal.
//
// Pero esa razón no vale cuando **la marca ya es oscura**. La de Nexus
// Consulting es azul marino con cian: ahí la regla estaba tirando a la basura
// justo los colores que encajaban. Así que si el fondo de la empresa es oscuro,
// manda su fondo también con tema oscuro.
//
// El alto contraste se queda fuera a propósito: quien lo usa lo usa porque lo
// necesita, y ninguna marca vale eso.
function estilo(marca) {
  if (!marca || !marca.tokens) return '';
  const lineas = Object.entries(marca.tokens).map(([k, v]) => `  ${k}: ${v};`).join('\n');

  // La marca manda también con un tema oscuro del editor.
  //
  // Antes esto solo se hacía si la marca era oscura, para no dejar una isla
  // color crema dentro de un editor negro. Con la paleta de Material ese
  // problema desaparece: sea clara u oscura, la de la empresa es una paleta
  // completa y coherente, no tres colores sueltos. Así que manda siempre, y la
  // barra se ve igual en las dos ventanas de al lado.
  //
  // El alto contraste se queda fuera a propósito: quien lo usa lo necesita, y
  // ninguna marca vale eso.
  const tipo = tipografiaDe(marca);

  return `<style>
:root {
${lineas}${tipo}
}
body.vscode-dark {
${lineas}
}
</style>`;
}

// La tipografía, de una lista corta. Nada de traerse una fuente de la red: el
// panel no pide nada fuera a propósito, y una que no carga deja la barra en lo
// que decida el sistema.
const TIPOGRAFIAS = {
  sistema: {
    sans: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    serif: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
  },
  clasica: { sans: "Georgia, 'Times New Roman', serif", serif: "Georgia, 'Times New Roman', serif" },
  grande: { sans: "Verdana, Tahoma, -apple-system, sans-serif", serif: "Verdana, Tahoma, Georgia, serif" },
};

function tipografiaDe(marca) {
  const cual = TIPOGRAFIAS[marca.tipografia];
  return cual ? `\n  --sans: ${cual.sans};\n  --serif: ${cual.serif};` : '';
}

// Lo que se le pide al asistente cuando el alumno da su web.
//
// ── Por qué está escrito con este detalle ────────────────────────────────
//
// Antes se le decía «mira la web y ponle a esto la cara de mi empresa», sin
// decirle dónde escribirlo ni con qué nombres. Si acertaba era por suerte, y
// cuando no acertaba **no fallaba nada**: el récord quedaba escrito, el panel no
// encontraba los campos que sabe leer y la barra se quedaba con los colores de
// Executive Lab. Nadie se enteraba de que había pasado algo.
// `yaHayPrimerIntento`: la barra ya sacó una cara provisional de la web
// (`web.js`), así que no se le pide hacerla desde cero sino revisarla.
function queLePedimos(web, yaHayPrimerIntento = false) {
  return [
    yaHayPrimerIntento && web
      ? `Ya he sacado un primer intento de la cara de mi empresa desde ${web} y lo he dejado en \`${CARPETA.join('/')}/${FICHERO}\` marcado como provisional. Mira la web con calma y corrige lo que no sea de verdad —colores, logotipo, nombre—; al reescribirlo, quita la línea \`provisional\`.`
      : web
        ? `Mira ${web} y ponle a esto la cara de mi empresa.`
        : 'Ponle a esto la cara de mi empresa, con el material que te he dejado.',
    '',
    `Déjalo en \`${CARPETA.join('/')}/${FICHERO}\`, con estos campos en la cabecera y escritos así:`,
    '',
    '- `empresa:` cómo se llama.',
    '- `fondo:`, `texto:` y `acento:` en formato `#rrggbb`.',
    web
      ? '  El `fondo` y el `acento` son los de su web de verdad: si la web es oscura, el fondo va oscuro.'
      : '  Sácalos del material. Si su marca es oscura, el fondo va oscuro: esto se pinta igual de bien de las dos maneras.',
    '  El `texto` solo se usa para saber si la marca es clara u oscura; las letras las calculo yo.',
    '  Evita un fondo a media luz (un gris medio): encima de eso no se lee nada y tendría que descartarlo.',
    '- `logo:` el nombre del fichero del logotipo, guardado en esa misma carpeta.',
    '- `logo_lleva_el_nombre:` `si` si el logotipo trae dentro el nombre escrito, `no` si es solo el símbolo.',
    web ? '- `resource:` la web.' : null,
    '',
    'Con esos tres colores construyo la paleta entera siguiendo Material Design, así que no hace falta que me des más.',
  ].filter((l) => l !== null).join('\n');
}

// ¿Es de la marca lo que ha cambiado? Con «/» siempre: en Windows `fsPath` va con
// «\\» (decisiones 167 y 189), y comparado con «/» el logotipo no repintaba.
function esDeLaMarca(rutaDelFichero) {
  const ruta = String(rutaDelFichero || '').replace(/\\/g, '/');
  return ruta.includes(`${CARPETA.join('/')}/`) || ruta.includes(FICHERO);
}

module.exports = { leer, estilo, queLePedimos, esDeLaMarca, TIPOGRAFIAS, CARPETA, FICHERO };
