// La barra entera, contra empresas que no se parecen en nada.
//
// ── Por qué esto además de `humo.js` ─────────────────────────────────────
//
// `humo.js` prueba módulo a módulo contra UNA empresa de mentira. Eso coge
// mucho, pero no coge lo que solo se ve de lejos: que en una carpeta recién
// montada no haya un apartado con un hueco dentro, que en un arnés de Codex no
// se enseñen cero botones sin decir por qué, que un despacho sin conexiones no
// enseñe la pantalla de una gestoría.
//
// Aquí se montan tres carpetas distintas y se pasan las diecinueve pantallas por
// cada una. Lo que se comprueba no es el contenido —eso es de `humo.js`— sino
// que **ninguna revienta y ninguna cae en la pantalla de fallo**, que es la red
// de seguridad y no un aprobado. Y que la principal sencilla, plegada, no pasa
// de seis cosas a la vista (el plan de simplificar la barra, y `TOPE` abajo).
//
// Al final, una cuarta: una carpeta vacía montada de verdad, con el montaje de la
// barra y el arnés de la clase, que tiene que acabar en la principal y no en la
// lista de lo que falta (decisión 164).
//
//   node prueba/empresas-distintas.js <raíz del repositorio>

const path = require('node:path');
const fs = require('node:fs');
const os = require('node:os');
const Module = require('node:module');

const RAIZ = process.argv[2] || path.resolve(__dirname, '..', '..');
const vscode = require(path.join(RAIZ, 'extension/prueba/vscode-falso.js'));
const original = Module._load;
Module._load = (p, ...r) => (p === 'vscode' ? vscode : original(p, ...r));

const { montarPanel } = require(path.join(RAIZ, 'extension/prueba/panel-falso.js'));
const cargar = (n) => {
  const f = path.join(RAIZ, 'extension/src', `${n}.js`);
  delete require.cache[require.resolve(f)];
  return require(f);
};

function escribir(raiz, rel, texto) {
  const f = path.join(raiz, rel);
  fs.mkdirSync(path.dirname(f), { recursive: true });
  fs.writeFileSync(f, texto);
}

// ---- tres empresas que no se parecen en nada -----------------------------

function gestoria() {
  const r = fs.mkdtempSync(path.join(os.tmpdir(), 'gestoria-'));
  escribir(r, '.rsc.json', JSON.stringify({ version: 1, targets: ['claude'], skills: ['bro'], ownSkills: [], catalogVersion: '1.4.1' }, null, 2));
  escribir(r, '01-TOOLS/_TEMPLATE/.env.example', 'X=\n');
  escribir(r, '01-TOOLS/HOLDED/.env.example', 'HOLDED_API_KEY=\n');
  escribir(r, '01-TOOLS/HOLDED/README.md', '# Holded\n\n| Script | Qué hace |\n|---|---|\n| `ver_facturas.sh` | Las facturas del mes |\n');
  escribir(r, '01-TOOLS/HOLDED/ver_facturas.sh', '#!/bin/sh\necho ok\n');
  escribir(r, '02-DOCS/wiki/harness/user-profile.md', '---\ntechnical_level: non-technical\naccompaniment: L3\narnes: Contabilidad\nempresa: Gestoría Pérez\n---\n\n# User profile\n\nGoal: llevar la contabilidad de mis clientes\n');
  escribir(r, '02-DOCS/wiki/index.md', '# Knowledge Base Index\n\n## contabilidad\n\n| Artículo | Resumen |\n|---|---|\n| [Cierre de mes](contabilidad/cierre.md) | Cómo se cierra el mes |\n');
  escribir(r, '02-DOCS/wiki/contabilidad/cierre.md', '---\ntype: article\ntitle: Cierre de mes\n---\n\n# Cierre de mes\n\nSe cierra el día 5.\n');
  escribir(r, '02-DOCS/inbox/README.md', '# Inbox\n');
  // El panel completo que deja el asistente al repasar la wiki: sale en Documentos.
  escribir(r, '02-DOCS/wiki/dashboard.html', '<!doctype html><title>Panel</title>\n');
  escribir(r, '.claude/commands/cerrar-el-mes.md', '---\ndescription: "Cierra el mes"\nboton: "Cerrar el mes"\nicono: "📊"\n---\nCierra el mes.\n');
  // Un cierre a medias: «Seguir donde lo dejé» dice por dónde iba (decisión 160).
  escribir(r, '02-DOCS/wiki/ftd/cierre-de-septiembre.md', '---\nstatus: in-progress\n---\n\n# Cierre de septiembre\n\n- [x] Bajar los extractos\n- [ ] Cuadrar el banco\n\n## Next\n\nCuadrar el banco\n');
  return r;
}

function despacho() {
  const r = fs.mkdtempSync(path.join(os.tmpdir(), 'despacho-'));
  escribir(r, '.rsc.json', JSON.stringify({ version: 1, targets: ['codex'], skills: ['bro'], ownSkills: ['executive-lab'], catalogVersion: '1.4.1' }, null, 2));
  escribir(r, '01-TOOLS/_TEMPLATE/.env.example', 'X=\n');
  escribir(r, '02-DOCS/wiki/harness/user-profile.md', '---\narnes: Contratos\nempresa: Despacho Ruiz\n---\n\n# User profile\n\nGoal: revisar contratos\n');
  escribir(r, 'contrato-sin-firmar.pdf', 'un contrato');
  escribir(r, 'AGENTS.md', '# AGENTS.md\n\n## Working rules\n\n- Nada sale del despacho sin que lo lea un abogado.\n');
  // Con Codex todo lo suyo vive en `.codex/`: las habilidades en `rsc/` y los
  // ayudantes en TOML. Mientras esta carpeta estuvo vacía, ese camino no lo
  // probaba nadie y la barra podía enseñar cero sin que saltara nada.
  escribir(r, '.codex/rsc/bro/SKILL.md', '---\nname: bro\ndescription: Rewrites text so it sounds human.\n---\n');
  escribir(r, '.codex/rsc/executive-lab/SKILL.md', '---\nname: executive-lab\ndescription: "Siempre activa: fija el español y el vocabulario de negocio."\n---\n');
  escribir(r, '.codex/agents/plazos.toml', 'name = "vigilante de plazos"\ndescription = "Avisa del contrato que se acerca a su fecha."\n');
  // Con Codex, igual; y uno terminado, que no se ofrece aunque siga «in-progress».
  escribir(r, '02-DOCS/wiki/ftd/contrato-de-alquiler.md', '---\nstatus: in-progress\n---\n\n# Contrato de alquiler\n\n- [ ] Revisar la cláusula de fianza\n- [ ] Mandarlo a firmar\n');
  escribir(r, '02-DOCS/wiki/ftd/contrato-viejo.md', '---\nstatus: in-progress\n---\n\n# Contrato viejo\n\n- [x] Firmado\n');
  return r;
}

function reciencita() {
  const r = fs.mkdtempSync(path.join(os.tmpdir(), 'recien-'));
  escribir(r, '.rsc.json', JSON.stringify({ version: 1, targets: ['claude'], skills: [], ownSkills: [], catalogVersion: '1.4.1' }, null, 2));
  escribir(r, '01-TOOLS/_TEMPLATE/.env.example', 'X=\n');
  escribir(r, '02-DOCS/wiki/harness/user-profile.md', '---\narnes: Marketing\n---\n\n# User profile\n');
  return r;
}

// Cuántas cosas se ven en la principal con todo plegado: la tarjeta, cada fila
// plegada y lo que quede suelto. Lo de abajo, en pequeño —la versión y Cambiar de
// proyecto—, no cuenta (propuesta de simplificar la barra: «5 cosas a la vista
// como mucho»).
//
// Seis desde la 0.62 (decisión 202): «Conversación nueva» sale a la vista, debajo
// de la tarjeta, porque se usa a diario y plegada en Ayuda no se encontraba. Jose:
// «queremos mantenerla simple pero que sea útil». Es una cosa más, y ninguna otra.
const TOPE = 6;
function cosasALaVista(html) {
  let resto = html.replace(/<div class="fila pie">[\s\S]*?<\/div>/g, '');
  const filas = (resto.match(/<details/g) || []).length;
  resto = resto.replace(/<details[\s\S]*?<\/details>/g, '');
  const tarjetas = (resto.match(/<div class="(consejo|aviso)/g) || []).length;
  resto = resto.replace(/<div class="(consejo|aviso)[^"]*">[\s\S]*?<\/div>/g, '');
  return filas + tarjetas + (resto.match(/<button/g) || []).length;
}

// ---- probar cada una -----------------------------------------------------

const TODAS = [['Gestoría Pérez', gestoria], ['Despacho Ruiz (Codex)', despacho], ['recién montada', reciencita]];
let mal = 0;

for (const [nombre, montar] of TODAS) {
  vscode.guion.raiz = montar();
  vscode.guion.extensionesInstaladas = ['anthropic.claude-code', 'openai.chatgpt'];
  const panel = montarPanel();
  const ext = path.join(RAIZ, 'extension');

  const mensajes = [];
  const anadir = (tipo, datos, espera) => mensajes.push([tipo, datos, espera]);

  anadir('papeles', { ...cargar('papeles').queHay() }, null);
  anadir('cerebro', {
    temas: cargar('cerebro').catalogo(),
    sinOrdenar: cargar('cerebro').sinOrdenar().slice(0, 8),
    esperando: cargar('cerebro').esperandoLectura(),
    yaLeidos: cargar('cerebro').yaLeidos(),
    hayPanel: cargar('cerebro').hayPanel(),
    aviso: null,
  }, null);
  anadir('huecos', { huecos: cargar('cerebro').loQueAunNoSabe(4) }, null);
  anadir('comandos', { comandos: cargar('acciones').todos() }, null);
  anadir('saberes', cargar('saberes').queSabe(ext, 'contabilidad facturas contratos'), null);
  anadir('recordatorios', {
    horarios: [],
    hayHabilidades: cargar('recordatorios').disponibles().length > 0,
    queSeHagaSola: cargar('rutinas').explicacion(cargar('asistentes').elDeAhora().nombre),
  }, 'Recordatorios');
  anadir('conexiones', { proveedores: cargar('conexiones').proveedores(), sueltas: [] }, null);
  anadir('agentes', { agentes: cargar('agentes').queHay() }, null);
  anadir('proyectos', { montones: cargar('proyectos').queHay() }, null);
  anadir('reglas', cargar('reglas').queHay(), null);
  anadir('asistente', { ...cargar('asistentes').comoEstamos(), aviso: null }, null);
  anadir('comoTrabaja', { ...cargar('ajustes').comoEstamos(), aviso: null }, null);
  anadir('laCara', { ...cargar('tema').comoEstamos(), aviso: null }, null);
  anadir('salidas', { herramientas: cargar('salidas').loQueHaProducido() }, null);
  // Documentos en una pantalla y la foto del cerebro (decisión 151), con lo que
  // mandaría la extensión en esta carpeta.
  const fotoM = cargar('foto');
  const wiki = path.join(vscode.guion.raiz, '02-DOCS', 'wiki');
  anadir('documentos', {
    ...cargar('papeles').sinLeerTodavia(),
    herramientas: cargar('salidas').loQueHaProducido(),
    fotos: fotoM.lasFotos(path.join(vscode.guion.raiz, ...fotoM.CARPETA), vscode.guion.raiz),
    hayPanel: cargar('cerebro').hayPanel(),
    aviso: null,
  }, null);
  anadir('foto', { ...fotoM.laFoto(wiki, cargar('cerebro').todosLosDocumentos()), desde: 'documentos', aviso: null }, null);
  anadir('diario', { sesiones: cargar('diario').sesiones(), decisiones: cargar('diario').decisiones(), aprendido: [] }, null);
  anadir('sugerencias', { ahora: [], hayAgentes: cargar('agentes').hayAlguno(), hayProyectos: cargar('proyectos').hayAlgo() }, null);
  // La de la versión, a la que lleva «Barra x» de abajo (decisión 166).
  anadir('estaBarra', { version: { esta: '0.0.0', nueva: '9.9.9', deprueba: false, puesta: null, probarAntes: false, sola: true } }, null);
  // Por dónde ibas, como lo lee la brújula, sin continuación (decisión 160).
  const ibasPor = cargar('por-donde-ibas').porDondeIbas(vscode.guion.raiz, null);
  anadir('estado', {
    estado: {
      listo: true,
      ibasPor,
      sabe: cargar('cerebro').cuantoSabe(),
      conectados: cargar('conexiones').proveedores().length,
      comandos: cargar('acciones').todos().length,
      habilidades: cargar('rsc').habilidadesPuestas().length,
      hayAgentes: cargar('agentes').hayAlguno(),
      hayProyectos: cargar('proyectos').hayAlgo(),
      puedeTenerBotones: cargar('donde').puedeTenerBotones(),
    },
    // Recordatorios sale solo si hay algo: una habilidad con botón o un recordatorio.
    hayRecordatorios: cargar('recordatorios').hayAlgo(),
    acciones: cargar('fijadas').puestas({ get: () => undefined, update: async () => {} }, ext),
    modo: 'sencillo',
    marcaPuesta: false,
    comoSeLlama: cargar('identidad').deQuien(),
    pulso: [],
    puedeTenerBotones: cargar('donde').puedeTenerBotones(),
  }, null);

  // La principal sencilla con lo de esta carpeta (decisión 152): «Esto parece»
  // y las ideas, más un consejo y una versión nueva que también quieren salir.
  // Sale una tarjeta, y no más de `TOPE` cosas a la vista.
  const visto = cargar('ideas').queSeVe({ carpetaDeLaExtension: ext });
  const seAdapta = { parece: visto.parece, idea: visto.ideas[0] || null };
  const conLasDos = {
    estado: {
      listo: true,
      ibasPor,
      sabe: cargar('cerebro').cuantoSabe(),
      conectados: cargar('conexiones').proveedores().length,
    },
    barraCompleta: false,
    piezas: JSON.parse(fs.readFileSync(path.join(ext, 'media', 'piezas.json'), 'utf8')),
    consejo: { id: 'x', texto: 'Un consejo que también quiere salir.', boton: 'Hacerlo', accion: { tipo: 'verSugerencias' } },
    hayVersionNueva: '9.9.9',
    copias: { hace: 'hace un momento', sinGuardar: false, subir: false },
    versionDeLaBarra: '0.0.0',
    seAdapta,
    // Y la de la última vez, la primera vez del día, si hay algo hecho (decisión 160).
    laUltimaVez: (() => {
      const t = cargar('por-donde-ibas').laTarjeta({ listo: true, ibasPor, laUltimaZona: null });
      return t && { ...t, ahoraNo: { tipo: 'ahoraNoLaUltimaVez' } };
    })(),
    modo: 'sencillo',
    pulso: [],
  };
  // Y después de «Entendido», sin nada más delante: la idea, sola. Y con las
  // claves dentro de las copias y fuera de sitio (decisión 167), que van delante.
  const lasClaves = {
    clavesEnLasCopias: { claves: 2, deAcceso: 0, aplicaciones: 1, prompt: 'Que deje de guardarlas.' },
    clavesFueraDeSitio: { claves: 3, deAcceso: 1, prompt: 'Que las ordene.' },
  };
  const variantes = [
    ['con todo', conLasDos],
    ['después de «Entendido»', { ...conLasDos, consejo: null, hayVersionNueva: null, seAdapta: { parece: null, idea: seAdapta.idea } }],
    ['con las claves', { ...conLasDos, ...lasClaves }],
    ['después de «Ahora no» a la última vez', { ...conLasDos, consejo: null, hayVersionNueva: null, laUltimaVez: null, seAdapta: { parece: null, idea: seAdapta.idea } }],
  ];
  const rotas = [];
  const vistas = [];
  for (const [cual, datos] of variantes) {
    try {
      const pintada = panel.mandar({ tipo: 'estado', ...datos });
      const tarjetas = (pintada.match(/<div class="(consejo|aviso)/g) || []).length;
      const aLaVista = cosasALaVista(pintada);
      const enLaTarjeta = (pintada.match(/<div class="consejo">\s*<p class="que[^"]*">([^<]*)</) || [])[1] || '';
      if (datos.seAdapta.idea || datos.consejo || datos.laUltimaVez || datos.clavesEnLasCopias) {
        if (tarjetas !== 1) rotas.push(`la principal sencilla, ${cual}: ${tarjetas} tarjetas a la vez`);
      } else if (tarjetas > 1) rotas.push(`la principal sencilla, ${cual}: ${tarjetas} tarjetas a la vez`);
      if (aLaVista > TOPE) rotas.push(`la principal sencilla, ${cual}: ${aLaVista} cosas a la vista`);
      // La que toca: las claves antes que todo, «Esto parece» antes que la última vez, la
      // última vez antes que el consejo, y el consejo antes que la idea.
      const primera = (datos.clavesEnLasCopias && 'Hay 2 claves de tu aplicación dentro de tus copias.')
        || (datos.seAdapta.parece && datos.seAdapta.parece.texto)
        || (datos.laUltimaVez && datos.laUltimaVez.texto)
        || (datos.consejo && datos.consejo.texto)
        || (datos.seAdapta.idea && datos.seAdapta.idea.texto);
      if (primera && !enLaTarjeta.startsWith(primera.slice(0, 20))) rotas.push(`la principal sencilla, ${cual}: no sale la que toca`);
      vistas.push(`${cual}, ${aLaVista} cosas a la vista y en la tarjeta «${enLaTarjeta || 'nada'}»`);
    } catch (e) {
      rotas.push(`la principal sencilla, ${cual}: ${e.message}`);
    }
  }
  for (const [tipo, datos] of mensajes) {
    let pintado;
    try {
      pintado = panel.mandar({ tipo, ...datos });
    } catch (e) {
      rotas.push(`${tipo}: ${e.message}`);
      continue;
    }
    if (!pintado || pintado.length < 20) rotas.push(`${tipo}: no pinta nada`);
    else if (/no se ha podido pintar/.test(pintado)) rotas.push(`${tipo}: cae en la pantalla de fallo`);
  }

  // Sin el asistente, la tarjeta que lo dice va delante de todo, con el botón que
  // lo pone dentro: sigue siendo una tarjeta, y `TOPE` cosas como mucho (decisión 166).
  try {
    const quien = cargar('asistentes').elDeAhora();
    const sinEl = panel.mandar({
      tipo: 'estado',
      ...conLasDos,
      estado: { ...conLasDos.estado, faltaElAsistente: quien.nombre, ponerElAsistente: cargar('asistentes').falta(quien).boton },
    });
    const tarjetas = (sinEl.match(/<div class="(consejo|aviso)/g) || []).length;
    if (tarjetas !== 1) rotas.push(`sin el asistente: ${tarjetas} tarjetas a la vez`);
    if (cosasALaVista(sinEl) > TOPE) rotas.push(`sin el asistente: ${cosasALaVista(sinEl)} cosas a la vista`);
    const laTarjeta = (sinEl.match(/<div class="aviso malo">[\s\S]*?<\/div>/) || [''])[0];
    if (!laTarjeta.includes(`Poner ${quien.nombre}`) || !laTarjeta.includes('ponerElAsistente')) rotas.push('sin el asistente: la tarjeta no trae el botón que lo pone');
    vistas.push(`sin ${quien.nombre}, ${cosasALaVista(sinEl)} cosas a la vista y en la tarjeta «Poner ${quien.nombre}»`);
  } catch (e) {
    rotas.push(`sin el asistente: ${e.message}`);
  }

  // La principal sencilla, plegada: como mucho cinco tarjetas y filas (la
  // tarjeta, tres filas y la línea de las copias), con todo lo que pueda salir.
  // «Conversación nueva» es un botón suelto y no entra en esta cuenta; sí en
  // `cosasALaVista`, con su tope de seis (decisión 202).
  const [, delEstado] = mensajes.find(([tipo]) => tipo === 'estado');
  const sencilla = panel.mandar({
    tipo: 'estado',
    ...delEstado,
    barraCompleta: false,
    piezas: JSON.parse(fs.readFileSync(path.join(ext, 'media', 'piezas.json'), 'utf8')),
    consejo: { id: 'x', texto: 'Un consejo.', boton: 'Hacerlo', accion: { tipo: 'verDocumentos' } },
    copias: { hace: 'hace 5 minutos', sinGuardar: false, subir: true },
    versionDeLaBarra: '0.0.0',
  });
  const aLaVista = ['class="consejo"', 'class="aviso', 'class="acordeon grupo"', 'class="fila-de-pantalla"']
    .reduce((n, marca) => n + sencilla.split(marca).length - 1, 0);
  if (aLaVista > 5 || aLaVista < 4) rotas.push(`principal sencilla: ${aLaVista} cosas a la vista`);
  // «Seguir donde lo dejé» dice por dónde ibas dentro de Ayuda, plegada, y solo
  // con algo en marcha: no suma nada a la vista.
  const ayuda = (sencilla.match(/<details[^>]*data-abrir="sencilla:ayuda"[\s\S]*?<\/details>/) || [''])[0];
  const quiero = { 'Gestoría Pérez': 'Ibas por: Cuadrar el banco, y te queda 1 paso de «Cierre de septiembre».',
    'Despacho Ruiz (Codex)': 'Ibas por: Revisar la cláusula de fianza, y te quedan 2 pasos de «Contrato de alquiler».' }[nombre] || null;
  const dice = (ayuda.match(/<p class="pista ibas-por">([^<]*)<\/p>/) || [])[1] || null;
  if (dice !== quiero) rotas.push(`principal sencilla: por dónde ibas dice «${dice}» y debería decir «${quiero}»`);
  if ((sencilla.match(/Ibas por:/g) || []).length !== (quiero ? 1 : 0)) rotas.push('principal sencilla: por dónde ibas sale fuera de Ayuda');
  // Recordatorios, dentro de Acciones, solo con algo que recordar o a lo que
  // ponérselo. En una carpeta recién montada no hay nada: la fila no sale.
  const conLaFila = sencilla.includes('verRecordatorios');
  if (conLaFila !== cargar('recordatorios').hayAlgo()) rotas.push(`principal sencilla: la fila de Recordatorios ${conLaFila ? 'sale sin nada' : 'no sale con algo'}`);
  if (nombre === 'recién montada' && conLaFila) rotas.push('recién montada: sale la fila de Recordatorios sin nada que recordar');

  const q = cargar;
  const resumen = [
    `${q('conexiones').proveedores().length} conexiones`,
    `${q('acciones').todos().length} comandos`,
    `${q('rsc').habilidadesPuestas().length} habilidades`,
    `${q('agentes').queHay().length} ayudantes`,
    `${q('papeles').queHay().sueltos.length} sin colocar`,
    `botones: ${q('donde').puedeTenerBotones() ? 'sí' : 'no'}`,
  ].join(' · ');

  if (rotas.length) {
    mal += rotas.length;
    console.log(`✗ ${nombre}\n    ${rotas.join('\n    ')}`);
  } else {
    console.log(`✓ ${nombre} — ${mensajes.length} pantallas · ${aLaVista} cosas a la vista · ${resumen}${ibasPor ? ` · ${ibasPor.texto}` : ''}`);
    for (const vista of vistas) console.log(`    ${vista}`);
  }
}

// ---- y una recién montada de verdad, que acaba en la principal -------------
//
// Decisión 164. Al terminar de preparar una carpeta salía «Qué falta por montar»,
// una lista técnica de catorce filas, porque sin conexiones, sin conocimiento y
// sin copia fuera —como queda toda carpeta recién montada— contaba como «falta».
// Aquí se monta una carpeta vacía con el montaje de la barra y el arnés de la
// clase, como en clase, y se mira lo que se ve al terminar: la principal, con
// una tarjeta —la de la cuenta— y `TOPE` cosas a la vista como mucho.
async function laRecienMontada() {
  const ext = path.join(RAIZ, 'extension');
  if (!fs.existsSync(path.join(ext, 'media', 'harness', 'node_modules', '@ericrisco', 'rsc', 'scripts', 'rsc.js'))) {
    console.log('· recién montada de verdad: SALTADA, sin el arnés de dentro');
    return [];
  }
  const temporal = (nombre) => fs.mkdtempSync(path.join(os.tmpdir(), nombre));
  // Ni los ajustes de Claude ni los de Codex ni el git de quien corre esto.
  const antes = { claude: process.env.CLAUDE_CONFIG_DIR, codex: process.env.CODEX_HOME, git: process.env.GIT_CONFIG_GLOBAL };
  process.env.CLAUDE_CONFIG_DIR = temporal('claude-de-mentira-');
  process.env.CODEX_HOME = temporal('codex-de-mentira-');
  const casa = temporal('git-de-mentira-');
  fs.writeFileSync(path.join(casa, '.gitconfig'), '');
  process.env.GIT_CONFIG_GLOBAL = path.join(casa, '.gitconfig');
  const rotas = [];
  try {
    const vacia = temporal('recien-de-verdad-');
    vscode.guion.raiz = vacia;
    vscode.guion.extensionesInstaladas = ['anthropic.claude-code'];
    // Lo primero, con quién: desde la 206 se pregunta también con uno puesto.
    vscode.guion.respuestas = ['Claude', 'Llevar el día a día', 'La empresa entera', 'De 2 a 10', 'Poner orden en mis facturas', 'Lo justo', 'Ferretería Soler', ''];
    cargar('rsc').saberDondeEstamos(ext);
    cargar('terreno').saberDondeEstamos(ext);
    const memoria = new Map();
    const contexto = { extensionPath: ext, workspaceState: { get: (k) => memoria.get(k), update: async (k, v) => memoria.set(k, v) } };
    const hecho = await cargar('arrancar').arrancar(contexto, { appendLine() {} });
    vscode.guion.respuestas = null;
    if (!hecho.ok) return [`recién montada: no se ha montado (${hecho.mensaje || 'cancelado'})`];

    // Lo que decide si se enseña la lista o la principal (`siFaltaAlgoDecirlo`).
    const revision = await cargar('terreno').radiografia();
    const faltan = revision.piezas.filter((p) => p.estado === 'no' || p.estado === 'aMedias');
    if (revision.algoRoto) rotas.push(`recién montada: se enseña la lista por ${faltan.filter((p) => !p.porHacer).map((p) => p.nombre).join(', ')}`);
    if (!faltan.length) rotas.push('recién montada: no falta nada, y la prueba no mira nada');

    // La principal, como la pinta la barra al terminar.
    const estado = await cargar('brujula').estado({ fresco: true });
    if (!estado.primerPaso) rotas.push('recién montada: no sale la tarjeta de la cuenta');
    const visto = cargar('ideas').queSeVe({ carpetaDeLaExtension: ext });
    if (!visto.idea || visto.idea.id !== 'capacidad-invoicing') rotas.push(`recién montada: la idea del primer día no es Facturación (${visto.idea && visto.idea.id})`);
    const pintada = montarPanel().mandar({
      tipo: 'estado',
      estado: { ...estado, habilidades: cargar('rsc').habilidadesPuestas().length },
      hayRecordatorios: cargar('recordatorios').hayAlgo(),
      barraCompleta: false,
      piezas: JSON.parse(fs.readFileSync(path.join(ext, 'media', 'piezas.json'), 'utf8')),
      seAdapta: { parece: visto.parece, idea: visto.idea },
      hayVersionNueva: '9.9.9',
      copias: { hace: 'hace un momento', sinGuardar: false, subir: false },
      versionDeLaBarra: '0.0.0',
      modo: 'sencillo',
      pulso: [],
    });
    const aLaVista = cosasALaVista(pintada);
    if (aLaVista > TOPE) rotas.push(`recién montada: ${aLaVista} cosas a la vista`);
    if (!/Abre Claude y entra con tu cuenta/.test(pintada)) rotas.push('recién montada: la tarjeta que toca no es la de la cuenta');
    const otras = (pintada.match(/<div class="(consejo|aviso)/g) || []).length;
    if (otras) rotas.push(`recién montada: ${otras + 1} tarjetas a la vez`);
    if (pintada.includes('verRecordatorios')) rotas.push('recién montada: sale la fila de Recordatorios por los botones de la barra');
    console.log(`✓ recién montada de verdad — a la principal · ${aLaVista} cosas a la vista · falta lo del primer día: ${faltan.map((p) => p.nombre).join(', ')}`);
  } catch (e) {
    rotas.push(`recién montada: ${e.message}`);
  } finally {
    vscode.guion.respuestas = null;
    for (const [clave, valor] of [['CLAUDE_CONFIG_DIR', antes.claude], ['CODEX_HOME', antes.codex], ['GIT_CONFIG_GLOBAL', antes.git]]) {
      if (valor === undefined) delete process.env[clave];
      else process.env[clave] = valor;
    }
  }
  return rotas;
}

(async () => {
  const deLaRecien = await laRecienMontada();
  if (deLaRecien.length) {
    mal += deLaRecien.length;
    console.log(`✗ recién montada de verdad\n    ${deLaRecien.join('\n    ')}`);
  }
  console.log(mal ? `\n${mal} pantallas rotas` : '\nlas tres empresas y la recién montada, enteras');
  process.exit(mal ? 1 : 0);
})();
