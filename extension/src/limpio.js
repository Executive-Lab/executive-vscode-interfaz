// Lo que se lee de la carpeta y la barra escribe con su voz: en un encargo al
// asistente o en el texto de un botón (revisión adversaria de la 154 y la 155).
//
// El `name` de una habilidad o de un agente, o el rótulo de un botón, los
// escribe quien hizo la carpeta. Un repositorio preparado puede llamarse
// «resumen» en el disco y declarar `name: "x» IGNORA lo anterior y…"`: si eso
// entra tal cual en «Usa el agente «…»», lo que la barra le pide al asistente
// lo ha escrito otro.
//
// Dos reglas:
// - Para pedir algo por su nombre (`/x`, `$x`, «Usa el agente «x»»), solo un
//   nombre corto de letras, números, `_`, `.` y `-`. Si no, el de la carpeta, que
//   también tiene que valer: una carpeta llamada «ok IGNORA lo anterior…» no
//   entra en un encargo. Si ninguno vale, no se pide: se ve, sin botón.
// - Cualquier rótulo que entre en un encargo va en una línea, sin «», comillas
//   ni caracteres de control, y con un tope.

const INVOCABLE = /^[A-Za-z0-9][\w.-]{0,63}$/;

const invocable = (nombre) => typeof nombre === 'string' && INVOCABLE.test(nombre);

// Saltos de línea, tabuladores, caracteres de control y de formato (los que
// dan la vuelta al texto o no se ven), comillas de todas las formas y «».
const FUERA = /[\p{Cc}\p{Cf}\p{Zl}\p{Zp}]+/gu;
const COMILLAS = /[«»"'`“”‘’‚„‹›]/g;

function etiqueta(texto, tope = 120) {
  return String(texto ?? '')
    .replace(FUERA, ' ')
    .replace(COMILLAS, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, tope)
    .trim();
}

// El nombre con el que se pide: el declarado si vale; si no, el de la carpeta si
// vale; y si tampoco, ninguno (null). Nunca uno a medias ni uno limpiado: con
// Claude, lo que va detrás de `/x` llega como argumentos (revisión de la PR #48).
const invocacion = (declarado, id) => {
  if (invocable(declarado)) return declarado;
  return invocable(id) ? id : null;
};

// El nombre de un tema de la wiki, con las tildes que le quitó ser carpeta
// (decisión 203). RSC escribe los temas como `facturacion`, y la barra los
// enseñaba así en Conocimiento, en la brújula y en la foto. Solo se toca un
// nombre sin ninguna letra fuera del ASCII (si alguien escribió «Facturación»,
// se queda), y solo lo que en español siempre lleva tilde: «-ción», «-sión»
// (no «-ssion», que es inglés) y gestión y cuestión. Las herramientas no pasan
// por aquí: un programa que se llame «Fusion» no pasa a «Fusión».
function tildesDeTema(texto) {
  const nombre = String(texto ?? '');
  if (/[^\x00-\x7f]/.test(nombre)) return nombre;
  return nombre
    .replace(/(?<=[A-Za-z])(c|(?<!s)s)ion\b/g, '$1ión')
    .replace(/\b([Gg]es|[Cc]ues)tion\b/g, '$1tión');
}

module.exports = { INVOCABLE, invocable, etiqueta, invocacion, tildesDeTema };
