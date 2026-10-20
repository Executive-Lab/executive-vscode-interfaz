// Un panel falso que además deja pulsar: lee los data-accion de lo pintado,
// guarda los manejadores de clic y deja escribir en la caja y en el título.
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const deshacer = (s) => s.replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');

// Una foto del cerebro que se puede medir y mover (decisión 197): lo justo para
// `engancharLaFoto`. Mide `ancho` × `alto`, apunta el `viewBox` que se le pone y
// lo que escucha, y cada punto y cada línea llevan sus clases. Los eventos se
// disparan a mano, con lo que traerían en un navegador.
function fotoDeMentira(pintado, { ancho = 300, alto = 300 } = {}) {
  const clases = () => {
    const hay = new Set();
    return { add: (c) => hay.add(c), remove: (c) => hay.delete(c), contains: (c) => hay.has(c) };
  };
  const oyentes = { svg: {}, caja: {}, mandos: {} };
  const escuchar = (donde) => (ev, fn, opciones) => {
    (donde[ev] = donde[ev] || []).push({ fn, captura: opciones === true || Boolean(opciones && opciones.capture) });
  };
  const puntos = [...pintado.matchAll(/<g class="nodo"[^>]*data-accion="([^"]*)"/g)].map((m) => {
    const punto = { classList: clases(), accion: JSON.parse(deshacer(m[1])) };
    punto.closest = (sel) => (sel === '.nodo' ? punto : null);
    punto.contains = (otro) => otro === punto;
    return punto;
  });
  const lineas = [...pintado.matchAll(/<line /g)].map(() => ({ classList: clases() }));
  const rotulos = { atributos: {}, innerHTML: '', setAttribute(n, v) { this.atributos[n] = String(v); } };
  const svg = {
    atributos: {},
    classList: clases(),
    getBoundingClientRect: () => ({ width: ancho, height: alto, left: 0, top: 0 }),
    setAttribute(n, v) { this.atributos[n] = String(v); },
    setPointerCapture() {},
    addEventListener: escuchar(oyentes.svg),
    querySelectorAll: (sel) => (sel === '.nodo' ? puntos : (sel === '.enlaces line' ? lineas : [])),
    querySelector: (sel) => (sel === '.rotulos' ? rotulos : null),
  };
  const caja = { querySelector: (sel) => (sel === 'svg' ? svg : null), addEventListener: escuchar(oyentes.caja) };
  const mandos = [...pintado.matchAll(/data-foto="([a-z]+)"/g)].map((m) => ({
    dataset: { foto: m[1] },
    addEventListener: (ev, fn) => { if (ev === 'click') oyentes.mandos[m[1]] = fn; },
  }));
  return {
    svg, caja, puntos, lineas, rotulos, mandos,
    // Un evento sobre el dibujo o sobre su caja; devuelve si se paró lo de siempre.
    disparar(donde, ev, datos = {}) {
      let parado = false;
      let cortado = false;
      const evento = { button: 0, pointerId: 1, clientX: 0, clientY: 0, ...datos, preventDefault() { parado = true; }, stopPropagation() { cortado = true; } };
      for (const { fn } of oyentes[donde][ev] || []) fn(evento);
      return { parado, cortado };
    },
    // Acercar, alejar o verla entera.
    mando(que) { oyentes.mandos[que](); },
    viewBox: () => (svg.atributos.viewBox || '').split(' ').map(Number),
  };
}

// `lienzo`: lo que devuelve `createElement('canvas')`, para probar la foto del
// cerebro (decisión 151). Sin él, no hay lienzo, como en este navegador de mentira.
// `dibujo`: `{ ancho, alto }` de la foto, para poder moverse por ella (decisión 197).
// Sin él, no hay nada que medir y la foto no se mueve, como hasta ahora.
function montarPanelConClics(fichero = path.join(__dirname, '..', 'media', 'panel.js'), { lienzo = null, dibujo = null } = {}) {
  const oyentes = {};
  const enviados = [];
  let pintado = '';
  let clics = [];
  let teclas = [];
  let escrito = {};
  let foto = null;

  const campo = (selector) => {
    if (selector === 'textarea[data-aviso]') {
      const m = pintado.match(/<textarea([^>]*\bdata-aviso(?=[\s>])[^>]*)>([\s\S]*?)<\/textarea>/);
      if (!m) return null;
      return {
        get value() { return selector in escrito ? escrito[selector] : deshacer(m[2]); },
        hasAttribute: (a) => new RegExp(`(^|\\s)${a}(?=[\\s=>]|$)`).test(m[1]),
        focus() {},
      };
    }
    if (selector === 'input[data-aviso-titulo]') {
      const m = pintado.match(/<input([^>]*\bdata-aviso-titulo\b[^>]*)>/);
      if (!m) return null;
      const valor = (m[1].match(/value="([^"]*)"/) || [])[1] || '';
      return { get value() { return selector in escrito ? escrito[selector] : deshacer(valor); } };
    }
    return null;
  };
  // La foto de lo pintado, una por pintado, y solo si se ha pedido poder medirla.
  const laFoto = () => {
    if (!dibujo || !pintado.includes('data-foto-lienzo')) return null;
    if (!foto) foto = fotoDeMentira(pintado, dibujo);
    return foto;
  };
  const otro = () => ({ set innerHTML(v) {}, addEventListener() {}, querySelectorAll: () => [], querySelector: () => null, classList: { add() {}, remove() {} }, dataset: {}, focus() {} });
  const app = {
    set innerHTML(v) { pintado = v; clics = []; teclas = []; escrito = {}; foto = null; },
    get innerHTML() { return pintado; },
    addEventListener() {},
    // Cada elemento con `data-accion`, con sus atributos (para `role`) y lo que
    // escucha: el clic y, en lo que hace de botón, la tecla.
    querySelectorAll: (sel) => (sel === '[data-foto]' ? (laFoto() ? laFoto().mandos : []) : sel === '[data-accion]'
      ? [...pintado.matchAll(/<[a-zA-Z]+\b([^>]*\bdata-accion="([^"]*)"[^>]*)>/g)].map((m) => ({
        dataset: { accion: deshacer(m[2]) },
        getAttribute: (nombre) => ((m[1].match(new RegExp(`\\s${nombre}="([^"]*)"`)) || [])[1] ?? null),
        addEventListener: (ev, fn) => {
          if (ev === 'click') clics.push({ accion: JSON.parse(deshacer(m[2])), fn });
          if (ev === 'keydown') teclas.push({ accion: JSON.parse(deshacer(m[2])), fn });
        },
        closest: () => otro(),
      }))
      : []),
    querySelector: (sel) => (sel === '[data-foto-lienzo]' ? (laFoto() ? laFoto().caja : null) : campo(sel)),
    classList: { add() {}, remove() {} },
    dataset: {},
    focus() {},
  };
  const contexto = {
    acquireVsCodeApi: () => ({ postMessage: (m) => enviados.push(m), getState: () => undefined, setState() {} }),
    document: {
      getElementById: (id) => (id === 'app' ? app : otro()),
      createElement: (que) => (que === 'canvas' && lienzo ? lienzo() : otro()),
      addEventListener(que, fn) { oyentes[que] = fn; },
      querySelector: () => null,
      querySelectorAll: () => [],
      scrollingElement: { scrollTop: 0 },
      body: { classList: { add() {}, remove() {} } },
    },
    window: { addEventListener(que, fn) { oyentes[que] = fn; } },
    FileReader: class { readAsDataURL() {} },
    setInterval: () => 0,
    clearInterval() {},
    setTimeout: () => 0,
    console,
  };
  contexto.globalThis = contexto;
  vm.createContext(contexto);
  vm.runInContext(fs.readFileSync(fichero, 'utf8'), contexto, { filename: 'panel.js' });
  return {
    mandar(mensaje) { oyentes.message({ data: mensaje }); return pintado; },
    escribir(selector, valor) { escrito[selector] = valor; },
    // `cual`: con varios botones del mismo tipo, el que cumple esto (p. ej. `(a) => a.en === 'noSe'`).
    pulsar(tipo, cual = () => true) {
      const b = clics.find((c) => c.accion.tipo === tipo && cual(c.accion));
      if (!b) throw new Error(`no hay botón ${tipo}`);
      b.fn();
    },
    // Una tecla sobre lo que hace de botón: devuelve si se dejó de hacer lo de siempre.
    teclear(tipo, tecla) {
      const b = teclas.find((c) => c.accion.tipo === tipo);
      if (!b) throw new Error(`nada que se pulse con el teclado: ${tipo}`);
      let parado = false;
      b.fn({ key: tecla, preventDefault() { parado = true; } });
      return parado;
    },
    // La foto pintada, para moverse por ella; y pulsar uno de sus puntos como se
    // pulsa de verdad: primero lo oye el dibujo, que puede cortarlo.
    foto: laFoto,
    // Devuelve si llegó al punto.
    pulsarEnLaFoto(ruta) {
      const f = laFoto();
      if (f && f.disparar('svg', 'click').cortado) return false;
      const b = clics.find((c) => c.accion.tipo === 'leerArticulo' && c.accion.ruta === ruta);
      if (!b) throw new Error(`no hay punto para ${ruta}`);
      b.fn();
      return true;
    },
    enviados,
  };
}

module.exports = { montarPanelConClics };
