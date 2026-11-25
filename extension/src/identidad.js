// Cómo se llama esto y de quién es.
//
// Dos nombres, y los pone el alumno cuando dice para qué va a ser:
//
//   · el ARNÉS  — para qué es esta carpeta: Contabilidad, Personal, Marketing,
//                 Clientes, el proyecto que sea. Un arnés no es "una empresa":
//                 una empresa puede tener cuatro, cada uno para lo suyo.
//   · la EMPRESA — de quién es todo esto: Asesoría Norte.
//
// Viven en el frontmatter de `02-DOCS/wiki/harness/user-profile.md`, que es el
// fichero donde RSC guarda el perfil del arnés y donde ya escribimos los
// diales. Sin ellos se tira del nombre de la carpeta, que casi siempre dice
// algo, y si no, de nada: la interfaz funciona igual.

const proyecto = require('./proyecto');
const frontmatter = require('./frontmatter');

const PERFIL = ['02-DOCS', 'wiki', 'harness', 'user-profile.md'];

function humanizar(texto) {
  const limpio = texto.replace(/[-_]+/g, ' ').replace(/\s+/g, ' ').trim();
  return limpio.charAt(0).toUpperCase() + limpio.slice(1);
}

function leer() {
  const ruta = proyecto.ruta(...PERFIL);
  const campos = ruta ? frontmatter.leer(ruta) : {};

  const texto = (valor) => (typeof valor === 'string' && valor.trim() ? valor.trim() : null);
  const raiz = proyecto.raiz();
  const porLaCarpeta = raiz ? humanizar(raiz.split(/[\\/]/).filter(Boolean).pop() || '') : null;

  return {
    arnes: texto(campos.arnes) || porLaCarpeta,
    empresa: texto(campos.empresa),
    // Lo puso el alumno, o lo hemos deducido de la carpeta.
    puesto: Boolean(texto(campos.arnes)),
    // Qué lleva la carpeta y cuánta gente hay detrás. Los escribe la barra y
    // no RSC, que reescribe el perfil entero en cada plan aceptado: se leen
    // aquí para poder volver a escribirlos.
    alcance: texto(campos.alcance),
    personas: texto(campos.personas),
  };
}

// Para qué dijo el alumno que era esto, cuando montó la carpeta. RSC lo deja
// en el cuerpo del perfil, no en el frontmatter: `Goal: organizar mis
// facturas`. Se usa para saber qué le vendría bien, y no sale en pantalla.
function objetivo() {
  const ruta = proyecto.ruta(...PERFIL);
  if (!ruta) return '';
  try {
    const cuerpo = require('node:fs').readFileSync(ruta, 'utf8').replace(/^---\r?\n[\s\S]*?\r?\n---/, '');
    return (cuerpo.match(/^\s*(?:Goal|Objetivo):\s*(.+)$/mi) || [])[1] || '';
  } catch {
    return '';
  }
}

// El rótulo de la ventana: "Contabilidad · Asesoría Norte", o lo que haya.
// Con «La empresa entera» los dos nombres son el mismo, y se dice una vez.
function titulo() {
  const { arnes, empresa } = leer();
  if (arnes && empresa && arnes !== empresa) return `${arnes} · ${empresa}`;
  return arnes || empresa || 'Executive Lab';
}

// De quién se habla cuando el panel dice "lo que sabe de…".
const deQuien = () => leer().arnes || 'tu trabajo';

module.exports = { leer, titulo, deQuien, objetivo, PERFIL };
