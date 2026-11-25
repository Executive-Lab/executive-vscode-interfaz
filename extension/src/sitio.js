// Dónde vive la barra en GitHub, y quién publica sus versiones (decisión 140).
//
// El repositorio pasa de la cuenta de Jose a la organización Executive-Lab.
// GitHub redirige la dirección vieja, así que se puede seguir preguntando a
// `REPO`; pero lo que contesta ya trae la nueva: el paquete se baja de
// `github.com/Executive-Lab/…` y las incidencias se enlazan allí. Una barra que
// solo diera por buena una de las dos dejaría de ponerse al día sola el día del
// traslado, sin decir nada. Por eso se acepta cualquiera de `SITIOS`.
//
// Quién publica no sale de la dirección: la dueña de un repositorio de una
// organización no es una persona, y las versiones las sigue publicando
// `minarkap`. Antes salía de `REPO`, y con la dirección nueva no habría cuadrado
// ninguna.
//
// El traslado se hizo el 14 de octubre de 2026, con la 0.49.0 ya publicada: desde
// la 0.50.0 se pregunta a la organización. La de antes se queda en `SITIOS`, por
// los enlaces que ya estaban guardados.
//
// Después, ya en la organización, el repositorio cambió de nombre: de
// `executive-lab-interfaz` a `executive-vscode-interfaz`. Pasó justo lo que se
// quería evitar: ninguna barra puesta daba por bueno el paquete y ninguna se
// ponía al día (incidencia GR4ZCV del 15 de octubre, decisión 148). Por eso, para el paquete, ya
// no hace falta que el nombre esté en esta lista: basta con que sea el del
// repositorio de su versión y esté en una de nuestras `CUENTAS` (ver
// `version.js`).

const REPO = 'Executive-Lab/executive-vscode-interfaz';
const SITIOS = ['minarkap/executive-lab-interfaz', 'Executive-Lab/executive-lab-interfaz', 'Executive-Lab/executive-vscode-interfaz'];
const QUIEN_PUBLICA = 'minarkap';
// Cómo se llama la barra (`publisher.name` de su `package.json`). Cada uno puede
// hacerse la suya a partir de esta, y una copia con otro nombre no tiene que
// preguntar aquí: pondría la nuestra al lado de la suya (decisión 204). Quien
// haga la suya cambia esto, `REPO`, `SITIOS` y `QUIEN_PUBLICA`.
const ID = 'executivelab.arnes-ui';

// En GitHub, `Executive-Lab` y `executive-lab` son el mismo sitio.
const mismoSitio = (a, b) => String(a || '').toLowerCase() === String(b || '').toLowerCase();
const esNuestro = (sitio) => SITIOS.some((s) => mismoSitio(s, sitio));

// Las cuentas donde ha vivido: la de Jose y la de la organización. En la
// organización también están los repositorios de los alumnos, así que esto
// solo no basta para fiarse de un sitio.
const CUENTAS = [...new Set(SITIOS.map((s) => s.split('/')[0].toLowerCase()))];
const enNuestrasCuentas = (sitio) => CUENTAS.includes(String(sitio || '').split('/')[0].toLowerCase());

// ¿Es esta barra la que vive en `REPO`? Sin saber cómo se llama, se da por
// buena: así ha sido siempre, y en las pruebas no se sabe.
const esLaDeAqui = (contexto) => {
  const id = contexto && contexto.extension && contexto.extension.id;
  return !id || mismoSitio(id, ID);
};

module.exports = { REPO, SITIOS, CUENTAS, QUIEN_PUBLICA, ID, esLaDeAqui, esNuestro, enNuestrasCuentas, mismoSitio };
