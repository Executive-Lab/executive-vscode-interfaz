// Las cuentas de color, para no tener que fiarse de la web de nadie.
//
// La marca del alumno sale de su propia web, y la web de una pyme casi nunca
// cumple contraste. Como el público de esto puede tener poca vista, aquí se
// comprueba y se corrige antes de pintar nada: el acento se oscurece hasta que
// se pueda leer encima, y si el texto sobre el fondo no hay quien lo lea, se
// descarta la marca entera y se usa la de Executive Lab.

const HEX = /^#[0-9a-f]{6}$/i;

function aRgb(hex) {
  return [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
}

const aHex = (rgb) => `#${rgb.map((c) => Math.round(Math.max(0, Math.min(1, c)) * 255).toString(16).padStart(2, '0')).join('')}`;

// Luminancia relativa de la WCAG 2.1.
function luz(hex) {
  const lineal = (c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  const [r, g, b] = aRgb(hex).map(lineal);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contraste(a, b) {
  const [alta, baja] = [luz(a), luz(b)].sort((x, y) => y - x);
  return (alta + 0.05) / (baja + 0.05);
}

// Mezcla dos colores. Sirve para sacar bordes y textos apagados del propio par
// fondo/texto de la empresa, en vez de fijarlos a ojo.
function mezclar(a, b, parte) {
  const [ra, rb] = [aRgb(a), aRgb(b)];
  return aHex(ra.map((c, i) => c * (1 - parte) + rb[i] * parte));
}

const esColor = (valor) => typeof valor === 'string' && HEX.test(valor.trim());

// Oscurece o aclara un color hasta que el texto de encima se lea. Devuelve
// null si no se consigue, que con un color válido no debería pasar.
function hastaQueSeLea(color, encima, minimo = 4.5) {
  if (contraste(color, encima) >= minimo) return color;

  const haciaNegro = luz(encima) > luz(color) ? '#000000' : '#ffffff';
  let candidato = color;
  for (let paso = 1; paso <= 20; paso += 1) {
    candidato = mezclar(color, haciaNegro, paso * 0.05);
    if (contraste(candidato, encima) >= minimo) return candidato;
  }
  return null;
}

// ─────────────────────────────────────────────────── paletas tonales (M3)
//
// Jose pidió que la marca se adapte siguiendo Material Design. Esto es lo que
// hay debajo de eso: una **paleta tonal**.
//
// La idea de Material 3 es que de un color de marca no se saca "ese color y ya",
// sino una escala de trece tonos del mismo matiz, del 0 (negro) al 100
// (blanco). Después, cada sitio de la interfaz usa un tono FIJO de esa escala:
// el fondo siempre el 98 en claro y el 6 en oscuro, el texto encima siempre el
// 10 o el 90. Como la distancia entre esos tonos está elegida para que cumpla
// contraste, sale bien con cualquier marca sin tener que ir corrigiendo a mano
// color por color, que es lo que hacíamos antes.
//
// Los tonos se calculan en OKLab, que es un espacio donde la misma diferencia
// de número es la misma diferencia vista. En sRGB no lo es: el 50 % de gris no
// se ve a medio camino entre el negro y el blanco. Material usa un espacio
// parecido (CAM16); OKLab da prácticamente lo mismo y cabe en veinte líneas,
// que aquí importa porque no se traen dependencias.

const aLineal = (c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const aGamma = (c) => (c <= 0.0031308 ? c * 12.92 : 1.055 * c ** (1 / 2.4) - 0.055);

function aOklab(hex) {
  const [r, g, b] = aRgb(hex).map(aLineal);
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  return {
    L: 0.2104542553 * l + 0.7936177850 * m - 0.0040720468 * s,
    a: 1.9779984951 * l - 2.4285922050 * m + 0.4505937099 * s,
    b: 0.0259040371 * l + 0.7827717662 * m - 0.8086757660 * s,
  };
}

function deOklab({ L, a, b }) {
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (L - 0.0894841775 * a - 1.2914855480 * b) ** 3;
  return aHex([
    +4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s,
  ].map(aGamma));
}

// La escala de un color: `tono(40)` devuelve ese mismo matiz con la claridad
// del tono 40. El croma se limita porque un tono muy claro o muy oscuro no
// puede sostener un color saturado: al pedírselo, sRGB lo recorta y el matiz se
// tuerce. Material hace lo mismo por la misma razón.
function paletaTonal(hex, cromaMaximo = null) {
  const { L, a, b } = aOklab(hex);
  const croma = Math.hypot(a, b);
  const angulo = Math.atan2(b, a);
  const tope = cromaMaximo === null ? croma : Math.min(croma, cromaMaximo);

  return function tono(n) {
    const pedido = Math.max(0, Math.min(100, n));
    // Cerca del blanco y del negro se baja el croma con una curva suave, que es
    // lo que evita que el tono 95 salga "sucio" y el 10 salga morado.
    const margen = Math.min(pedido, 100 - pedido) / 50;
    const c = tope * Math.min(1, margen * 1.4);

    // El tono de Material se mide en L* (CIELAB), no en la L de OKLab. Se
    // parecen por el medio y se separan en los extremos: pidiendo el tono 7 por
    // la vía corta salía casi negro puro, así que un fondo negro se quedaba sin
    // tarjetas que se vieran. Se busca la L de OKLab cuyo resultado tiene el L*
    // que se ha pedido, que es barato y sale exacto.
    let baja = 0;
    let alta = 1;
    let hex = deOklab({ L: pedido / 100, a: Math.cos(angulo) * c, b: Math.sin(angulo) * c });
    for (let vuelta = 0; vuelta < 24; vuelta += 1) {
      const medio = (baja + alta) / 2;
      hex = deOklab({ L: medio, a: Math.cos(angulo) * c, b: Math.sin(angulo) * c });
      if (comoLoVeLaVista(hex) < pedido) baja = medio;
      else alta = medio;
    }
    return hex;
  };
}

// L* de CIELAB, que es la escala en la que Material numera sus tonos: 0 negro,
// 100 blanco, y el 50 justo a medio camino para la vista.
function comoLoVeLaVista(hex) {
  const y = luz(hex);
  return y <= 0.008856 ? y * 903.3 : 116 * y ** (1 / 3) - 16;
}

// Los tres matices que Material saca de una marca: el del acento, y dos casi
// grises que se tiñen de él lo justo para que todo parezca de la misma familia.
// El croma de los neutros es más alto que el de Material a propósito: con el
// suyo, el azul marino de Asesoría Norte salía negro, y eso no es adaptar los
// colores de alguien, es perderlos.
const CROMA_NEUTRO = 0.016;
const CROMA_NEUTRO_VARIANTE = 0.035;

// El tono de un color en la escala 0-100, que es lo que Material llama "tone".
const tonoDe = (hex) => Math.round(comoLoVeLaVista(hex));

// Lo lejos que está un color del gris, en OKLab: 0 es un gris; un amarillo
// vivo pasa de 0,15.
function cromaDe(hex) {
  const { a, b } = aOklab(hex);
  return Math.hypot(a, b);
}

// El esquema, con los papeles y las distancias de Material 3.
//
// Una desviación, y conviene saber cuál: Material fija el fondo en el tono 98
// en claro y el 6 en oscuro, vengas de donde vengas. Aquí el fondo es **el que
// eligió la empresa**, y el resto de tonos se coloca a las distancias de
// Material contando desde él. Si no, un azul marino acaba en negro y un crema
// en blanco: cumpliría contraste y no sería la marca de nadie.
//
// Lo que sí se respeta tal cual son los tonos del texto y del acento con el que
// se escribe, que son los que garantizan que se lea sin ir comprobando color por
// color. El relleno del botón principal es aparte: lleva el color de la empresa
// tal cual siempre que su letra se lea encima (decisión 204).
function esquemaMaterial({ acento, fondo, oscura }) {
  const P = paletaTonal(acento, 0.16);
  const N = paletaTonal(fondo, CROMA_NEUTRO);
  const NV = paletaTonal(fondo, CROMA_NEUTRO_VARIANTE);

  const suyo = tonoDe(fondo);
  const dentro = (n) => Math.max(0, Math.min(100, n));

  // Apartarse del fondo un número de tonos, y si por ese lado no queda sitio,
  // apartarse por el otro. Sin esto, una marca de fondo blanco se quedaba con
  // las tarjetas también blancas —tono 100 más tres sigue siendo 100— y no se
  // veía dónde empezaba y acababa cada una.
  const apartado = (paso) => {
    const ida = suyo + paso;
    return dentro(ida > 100 || ida < 0 ? suyo - paso : ida);
  };

  // El tono del texto NO es negociable en Material: 90 en oscuro, 10 en claro.
  // Pero Material nunca tiene un fondo a media luz, y una marca sí puede
  // traerlo — un gris medio, un azul a medio camino. Ahí el tono 90 se queda
  // en 3:1 y no se lee. Se baja por la escala hasta que cumple en la página y
  // en las tarjetas, que son los dos sitios donde va a salir.
  const queSeLea = (escala, tonos, contra) => {
    for (const t of tonos) {
      const candidato = escala(t);
      if (contra.every((f) => contraste(candidato, f) >= 4.5)) return candidato;
    }
    return escala(tonos[tonos.length - 1]);
  };

  // El botón principal, con el color de la empresa tal cual (decisión 204).
  // Llevaba el tono 40 de su paleta (el 80 en oscuro), con la saturación
  // recortada: un amarillo salía mostaza, y un cian, azul pastel. Se queda el
  // suyo si se distingue de la página, por luz o por color, y si encima se lee
  // una letra: blanca, o muy oscura de su mismo matiz. Si no, el tono de antes.
  const tarjeta = oscura ? N(apartado(7)) : N(apartado(-4));
  const elSuyo = (() => {
    const suyoExacto = aHex(aRgb(acento));
    const seVe = [fondo, tarjeta].every((f) => contraste(suyoExacto, f) >= 1.5) || cromaDe(suyoExacto) >= 0.1;
    if (!seVe) return null;
    const letra = [P(10), '#ffffff'].reduce((a, b) => (contraste(b, suyoExacto) > contraste(a, suyoExacto) ? b : a));
    return contraste(letra, suyoExacto) >= 4.5 ? { relleno: suyoExacto, sobre: letra } : null;
  })();
  // Lo que va escrito con el acento —un enlace, una fila al pasar por encima—
  // tiene que leerse en la página y en las tarjetas: se baja por la escala hasta
  // que se lee, como el texto.
  const acentoDeLetra = oscura
    ? queSeLea(P, [80, 85, 90, 95, 100], [fondo, tarjeta])
    : queSeLea(P, [40, 35, 30, 25, 20, 0], [fondo, tarjeta]);

  return oscura
    ? {
      superficie: fondo,
      // Las tarjetas suben, no bajan: en oscuro una tarjeta más oscura que la
      // página se hunde en ella. Lo vio Jose con la marca de Norte.
      tarjeta: N(apartado(7)),
      texto: queSeLea(N, [90, 94, 97, 100], [fondo, N(apartado(7))]),
      apagado: queSeLea(NV, [78, 84, 90, 95, 100], [fondo, N(apartado(7))]),
      borde: NV(apartado(20)),
      acento: acentoDeLetra,
      acentoRelleno: elSuyo ? elSuyo.relleno : P(80),
      sobreAcento: elSuyo ? elSuyo.sobre : P(20),
    }
    : {
      superficie: fondo,
      tarjeta: N(apartado(-4)),
      texto: queSeLea(N, [10, 6, 3, 0], [fondo, N(apartado(-4))]),
      apagado: queSeLea(NV, [32, 26, 20, 12, 0], [fondo, N(apartado(-4))]),
      borde: NV(apartado(-16)),
      acento: acentoDeLetra,
      acentoRelleno: elSuyo ? elSuyo.relleno : P(40),
      sobreAcento: elSuyo ? elSuyo.sobre : P(100),
    };
}

// El mismo color con transparencia, para sombras y resaltados. En CSS se podría
// hacer con `color-mix`, pero se escribe aquí para que el valor viaje ya
// resuelto y la hoja de estilo no dependa de lo que soporte cada editor.
function conAlfa(hex, alfa) {
  const [r, g, b] = aRgb(hex).map((c) => Math.round(c * 255));
  return `rgba(${r}, ${g}, ${b}, ${alfa})`;
}

// El verde de "bien" y el rojo de "mal" no son de la marca: un aviso tiene que
// parecer un aviso aunque la empresa sea verde lima. Pero sí se llevan al tono
// que toca, para que se vean sobre su fondo en vez de quedarse en verde oscuro
// sobre azul marino, que es lo que pasaba.
const VERDE = '#2e7d32';
const ROJO = '#c62828';
const deAviso = (base, oscura) => paletaTonal(base, 0.12)(oscura ? 75 : 40);

module.exports = {
  esColor, luz, contraste, mezclar, hastaQueSeLea, aHex, conAlfa, deAviso, VERDE, ROJO,
  aOklab, deOklab, paletaTonal, esquemaMaterial,
};
