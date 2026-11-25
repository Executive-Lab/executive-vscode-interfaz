// Monta una empresa de mentira con la forma que deja RSC: una herramienta con
// sus claves y sus scripts, una wiki con temas e historial, documentos sin
// leer y comandos con y sin botón. La usan la prueba de humo y `demo.sh`.

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const HOY = new Date().toISOString().slice(0, 10);

// Sembrar sobre una carpeta que ya pasó por el arnés no debe pisar lo que RSC
// escribió allí: su declaración y el perfil del alumno mandan.
const escribirSiFalta = (raiz, relativa, contenido) => {
  if (!fs.existsSync(path.join(raiz, relativa))) escribir(raiz, relativa, contenido);
};

const escribir = (raiz, relativa, contenido, modo) => {
  const destino = path.join(raiz, relativa);
  fs.mkdirSync(path.dirname(destino), { recursive: true });
  fs.writeFileSync(destino, contenido);
  if (modo) fs.chmodSync(destino, modo);
};

function montar(raiz = fs.mkdtempSync(path.join(os.tmpdir(), 'empresa-falsa-'))) {
  fs.mkdirSync(raiz, { recursive: true });

  // Con el recibo del onboarding, como lo deja RSC al aceptar el plan: de ahí
  // sale PARA QUÉ se montó esta carpeta, y de eso depende qué se le ofrece
  // aprender. Sin él, la barra no podía distinguir una gestoría de un repo.
  // La versión que declara es la que la barra lleva dentro, leída y no escrita
  // a mano: si no, el día que se suba de versión la empresa de mentira se
  // clasificaría como «montada con un arnés viejo» y media suite tomaría la
  // rama de ponerla al día. Pasó al subir a la 2.0.5.
  const laQueTraemos = JSON.parse(
    fs.readFileSync(path.join(__dirname, '..', 'media', 'harness', 'package.json'), 'utf8'),
  ).dependencies['@ericrisco/rsc'];

  escribirSiFalta(raiz, '.rsc.json', JSON.stringify({
    version: 1,
    catalogVersion: laQueTraemos,
    targets: ['claude'],
    skills: [],
    ownSkills: ['executive-lab'],
    // Algo apagado a propósito, como el guardián de gitmoji en este mismo
    // repositorio: la radiografía tiene que decirlo (decisión 101).
    optOuts: ['gitmoji'],
    onboarding: {
      schemaVersion: 1,
      acceptedPlanId: 'f'.repeat(64),
      plan: { record: { projectKind: 'operations', technicalLevel: 'non-technical', accompaniment: 'L3' } },
    },
  }, null, 2));

  // --- las habilidades, EN DISCO y no solo declaradas ---
  //
  // Esto faltaba y no se notaba. `.rsc.json` declaraba `executive-lab` y nadie
  // la escribía, así que en cuanto la barra aprendió a mirar el disco —para
  // distinguir un repositorio clonado de uno montado— la empresa de mentira
  // pasó a clasificarse como **clon**, y con ella media suite habría tomado la
  // rama equivocada sin que fallara ni una comprobación.
  //
  // Un fixture que declara lo que no tiene no es un atajo: es una carpeta que
  // no existe en la realidad.
  escribirSiFalta(raiz, '.claude/skills/executive-lab/SKILL.md', '---\nname: executive-lab\ndescription: "Los raíles de la barra."\ntags: [executive-lab]\n---\n\n# Raíles\n');

  // Y lo que RSC apunta en cada máquina de lo que ha instalado. No viaja por
  // git: es justo lo que diferencia «declarado» de «montado aquí».
  escribirSiFalta(raiz, '.claude/skills/.rsc-state.json', JSON.stringify({
    skills: { 'executive-lab': { files: ['SKILL.md'], base: null } },
    agents: {},
    commands: {},
    version: '1.4.1',
  }, null, 2));

  // --- comandos: tres con botón, dos sin él (uno nuestro, uno de RSC) ---
  const comando = (nombre, cabecera) => escribir(raiz, `.claude/commands/${nombre}.md`, `---\n${cabecera}---\n\nInstrucciones.\n`);
  const comandoSiFalta = (nombre, cabecera) => escribirSiFalta(raiz, `.claude/commands/${nombre}.md`, `---\n${cabecera}---\n\nInstrucciones.\n`);
  comandoSiFalta('seguir', 'description: Seguir donde lo dejé\nboton: Seguir donde lo dejé\ngrupo: diario\nicono: ▸\n');
  comandoSiFalta('empezar', 'description: Empezar algo nuevo\nboton: Empezar algo nuevo\ngrupo: diario\nicono: ✳\n');
  comando('resumen-mes', 'description: Resumen del mes\nboton: Preparar el resumen del mes\ngrupo: aprendido\nicono: 📈\n');
  comandoSiFalta('guardar', 'description: Guardar una copia\n');
  comando('checkpoint', 'description: Freeze the current candidate for review.\n');

  // --- una herramienta, como la deja el protocolo de harness ---
  escribir(raiz, '01-TOOLS/_TEMPLATE/README.md', '# <TOOL_NAME>\n\n| Script | Qué hace | Ejemplo |\n|---|---|---|\n| `<verb_object>.sh` | <descripción> | `./<verb_object>.sh <args>` |\n');
  // La plantilla entera, como la deja RSC: el suelo pide sus ficheros (G7).
  escribir(raiz, '01-TOOLS/_TEMPLATE/.env.example', '# <TOOL_NAME>\n<TOOL>_API_KEY=\n');
  escribir(raiz, '01-TOOLS/_TEMPLATE/CREDENTIALS.md', '# <TOOL_NAME> — credenciales\n');
  escribir(raiz, '01-TOOLS/_TEMPLATE/.gitignore', '.env\nkeys/\nout/\n');
  escribir(raiz, '01-TOOLS/_TEMPLATE/test_connection.sh', '#!/usr/bin/env bash\necho "OK"\n');
  escribir(raiz, '01-TOOLS/HOLDED/.env.example', '# HOLDED\n# Generate at: https://app.holded.com/api\n\nHOLDED_API_KEY=\nHOLDED_ENV=test\n');
  escribir(raiz, '01-TOOLS/HOLDED/.env', 'HOLDED_API_KEY=abcd1234efgh5678\nHOLDED_ENV=test\n');
  escribir(raiz, '01-TOOLS/HOLDED/CREDENTIALS.md', `# Credenciales — Holded

## Provider dashboard

- URL: https://app.holded.com/api

## Variables

| Variable | Tipo | Dónde se saca | Rotación |
|---|---|---|---|
| \`HOLDED_API_KEY\` | secreta | Configuración → Desarrolladores → API | Si se filtra, bórrala y crea otra |
| \`HOLDED_ENV\` | ajuste | Escribe \`test\` para probar y \`production\` cuando vaya en serio | — |
`);
  escribir(raiz, '01-TOOLS/HOLDED/README.md', `# Holded

Facturación de la empresa.

## Cómo conectarla

1. Entra en app.holded.com con el usuario y la contraseña de la empresa.
2. Arriba a la derecha, pulsa tu nombre y luego "Configuración".
3. En el menú de la izquierda, baja hasta "Desarrolladores" y entra en "API".
4. Pulsa "Crear clave nueva" y ponle de nombre "Executive Lab".
5. Cópiala entera antes de cerrar la ventana: no se puede volver a ver.

## Scripts

| Script | Qué hace | Ejemplo |
|--------|----------|---------|
| \`test_connection.sh\` | Comprueba que la clave vale | \`./test_connection.sh\` |
| \`listar_facturas.sh\` | Lista las facturas del mes en curso | \`./listar_facturas.sh\` |
| \`crear_factura.sh\` | Crea una factura nueva | \`./crear_factura.sh <cliente> <importe>\` |
`);
  const guion = (cuerpo) => `#!/usr/bin/env bash\nset -euo pipefail\nSCRIPT_DIR="$(cd "$(dirname "\${BASH_SOURCE[0]}")" && pwd)"\n[ -f "$SCRIPT_DIR/.env" ] || { echo "ERROR: missing $SCRIPT_DIR/.env" >&2; exit 1; }\nset -a; source "$SCRIPT_DIR/.env"; set +a\n: "\${HOLDED_API_KEY:?HOLDED_API_KEY not set}"\n${cuerpo}\n`;
  escribir(raiz, '01-TOOLS/HOLDED/test_connection.sh', guion('echo "OK — credenciales válidas."'), 0o755);
  escribir(raiz, '01-TOOLS/HOLDED/listar_facturas.sh', guion('echo "F-2026-001  Ferretería Soler   1.210,00 €"\necho "F-2026-002  Talleres Ruiz        847,50 €"'), 0o755);
  escribir(raiz, '01-TOOLS/HOLDED/crear_factura.sh', guion('echo "creada"'), 0o755);

  // --- la wiki, con su índice, su historial y sus huecos ---
  escribir(raiz, '02-DOCS/wiki/index.md', `# Knowledge Base Index

## facturacion

Cómo se factura en esta empresa.

| Article | Summary | Updated | Score |
|---------|---------|---------|-------|
| [Ciclo de facturación](facturacion/ciclo.md) | De presupuesto a cobro, paso a paso | ${HOY} | 7.4 |
| [Clientes que pagan tarde](facturacion/morosos.md) | Quiénes y cuánto se retrasan | ${HOY} | 6.1 |

## clientes

Quién es quién.

| Article | Summary | Updated | Score |
|---------|---------|---------|-------|
| [Ferretería Soler](clientes/ferreteria-soler.md) | Cliente desde 2019, paga a 30 días | ${HOY} | 8.0 |
| [{Article Title}]({topic}/{file}.md) | {One-line summary} | {YYYY-MM-DD} | {N.N} |
`);
  const articulo = (titulo, cuerpo) => `---
type: article
title: ${titulo}
topic: facturacion
status: draft
score: 7.0
---

# ${titulo}

${cuerpo || 'Contenido de mentira.'}
`;
  escribir(raiz, '02-DOCS/wiki/facturacion/ciclo.md', articulo('Ciclo de facturación', `De presupuesto a cobro, tal y como se hace aquí.

## Cuándo se factura

A final de mes, **todas de golpe**. Las de obra, cuando el cliente firma el parte.

## Plazos de cobro

| Cliente | Plazo | Cómo paga |
|---|---|---|
| Ferretería Soler | 30 días | Transferencia |
| Talleres Ruiz | 60 días | Pagaré |

> Si pasan 15 días del plazo, se llama por teléfono antes de mandar nada por escrito.

## Lo que hay que tener a mano

- El número de pedido del cliente
- El albarán firmado, si es obra
- Ver [el contrato marco](../contratos/marco.md) cuando haya dudas
- Y lo que sabemos de [Ferretería Soler](../clientes/ferreteria-soler.md)`));
  escribir(raiz, '02-DOCS/wiki/facturacion/morosos.md', articulo('Clientes que pagan tarde'));
  escribir(raiz, '02-DOCS/wiki/clientes/ferreteria-soler.md', articulo('Ferretería Soler'));
  // Escrito pero sin entrar en el índice: el panel tiene que enseñarlo igual,
  // que si no existe en el disco y no hay forma de llegar a ello.
  escribir(raiz, '02-DOCS/wiki/clientes/talleres-ruiz.md', articulo('Talleres Ruiz', 'Paga a 60 días con pagaré.'));
  escribir(raiz, '02-DOCS/wiki/log.md', `# Wiki Log

## [${HOY}] ingest | Ciclo de facturación

Tres fuentes leídas.

## [${HOY}] sweep | Ferretería Soler

Una fuente leída.

## [{YYYY-MM-DD}] ingest | {primary article title}
`);
  // Como lo escribe RSC (`wiki-gaps-template.md`): un bloque por pregunta, con su
  // estado. Una contestada no cuenta, y el ejemplo de la plantilla tampoco (G6).
  const hueco = (fecha, concepto, estado) => `## [${fecha}] gap | ${concepto}\n\nSource: una consulta sin respuesta\n\nSuggested topic: facturacion\n\nStatus: ${estado}\n`;
  escribir(raiz, '02-DOCS/wiki/gaps.md', [
    '# Knowledge Gaps\n\nAppend-only log of wanted-but-missing topics.\n',
    '```markdown\n## [YYYY-MM-DD] gap | {concept}\n\nStatus: open\n```\n',
    hueco('2026-09-18', 'Cómo se calculan los recargos por demora', 'open'),
    hueco('2026-09-19', 'Qué condiciones tiene el contrato marco con Talleres Ruiz', 'open'),
    hueco('2026-09-17', 'Los plazos de cobro', '[FILLED 2026-09-20]'),
  ].join('\n'));
  escribirSiFalta(raiz, '02-DOCS/wiki/harness/user-profile.md', `---
technical_level: non-technical
accompaniment: L3
language: es
arnes: Facturación
empresa: Ferretería Soler
---

# User profile

Goal: organizar mis facturas
`);

  // --- un ayudante, para que la pantalla tenga algo que enseñar ---
  escribir(raiz, '.claude/agents/cobros-atrasados.md', `---
name: cobros atrasados
description: Repasa cada lunes las facturas que se han pasado de plazo y prepara el aviso.
model: sonnet
---

Mira las facturas vencidas y prepara el aviso de cobro, sin mandarlo.
`);

  // --- SDD: lo que se escribe cuando se construye algo. Una carpeta de
  //     contabilidad no tiene nada de esto; una donde se monte una web, sí ---
  escribir(raiz, '02-DOCS/wiki/sdd/specs/tienda-de-recambios.md', `---
type: spec
title: Vender recambios por internet
status: accepted
---

# Vender recambios por internet

## Qué queremos

Que un cliente pueda pedir un recambio sin llamar por teléfono.

## Por qué

La mitad de las llamadas son para preguntar si hay stock.
`);
  escribir(raiz, '02-DOCS/wiki/sdd/plans/tienda-de-recambios.md', `---
type: plan
title: Plan de la tienda de recambios
status: draft
---

# Plan de la tienda de recambios

## Tareas

| ID | P | Qué | Hecho cuando | Depende | De |
|---|---|---|---|---|---|
| T001 |  | Catálogo con stock | Se ve el stock de verdad | — | spec §3 |
| T002 | [P] | Carrito | Se puede pedir | T001 | spec §4 |
| T003 |  | Cobro | Llega el dinero | T002 | spec §5 |
`);

  // --- las reglas: los tres sitios donde RSC las pone. La constitución solo
  //     aparece si el arnés se montó con SDD; los otros dos van siempre ---
  escribir(raiz, '02-DOCS/wiki/sdd/constitution.md', `---
type: concept
title: Constitution
---

# Constitution

## Nunca se factura sin albarán firmado

Es lo que nos ha salvado dos veces en una inspección.

## Los precios no se cambian sin pasar por Marta

## {Principio de ejemplo}
`);
  escribir(raiz, 'CLAUDE.md', `# CLAUDE.md — Ferretería Soler

## Knowledge map

| Area | Article |
|------|---------|
| User profile | \`02-DOCS/wiki/harness/user-profile.md\` |

## Working rules

- No se manda nada a un cliente sin que lo lea una persona antes.
- Los datos del banco no salen de esta carpeta.
- {Regla de ejemplo de la plantilla}

## Main commands

- \`npm test\`
`);
  escribir(raiz, 'AGENTS.md', `# AGENTS.md — Ferretería Soler

## Working rules

- No se manda nada a un cliente sin que lo lea una persona antes.
`);

  // --- el diario: lo que RSC escribe solo al terminar un rato de trabajo,
  //     y el registro de decisiones con sus dos formatos a la vez ---
  escribir(raiz, '02-DOCS/raw/worklog/2026-09-15-cobro-talleres-ruiz.md', `---
type: worklog
title: Reclamado el pago a Talleres Ruiz
description: Repasadas las facturas vencidas y enviado el aviso.
timestamp: 2026-09-15T10:00:00Z
topic: facturacion
status: processed
---

## Qué hicimos

- Repasadas las tres facturas vencidas.
- Enviado el aviso de cobro.

## Por qué

Llevaban 75 días y el contrato dice 60.
`);
  escribir(raiz, '02-DOCS/raw/worklog/2026-09-16-alta-ferreteria.md', `---
type: worklog
title: Dada de alta Ferretería Soler
description: Ficha nueva de cliente con sus condiciones.
timestamp: 2026-09-16T09:00:00Z
topic: clientes
status: unprocessed
---

## Qué hicimos

- Ficha del cliente con sus condiciones de pago.
`);
  escribir(raiz, '02-DOCS/raw/worklog/2026-09-17-plantilla.md', `---
type: worklog
title: {What we did, one line}
description: {One-sentence summary of the session.}
status: unprocessed
---
`);
  escribir(raiz, '02-DOCS/wiki/harness/decisions.md', `# Decisions Log (append-only)

- Project kind: non-code-harness.
- SDD: deferred.
- Los avisos de cobro no se mandan en viernes.
- SDD: no, aquí no construimos nada.

---
## D-0001 — Dónde se guardan las facturas
- date: 2026-09-14
- context: Dos personas, mucho papel, nada de presupuesto.
- options considered:
  1. Carpetas en el ordenador de siempre.
  2. Un programa de facturación de pago.
- decision: Carpetas en el ordenador, con copia en git.
- why: No hay presupuesto y el volumen es bajo.
- supersedes: none
---
## D-0002 — Plazo de cobro
- date: 2026-09-16
- decision: 60 días para los clientes de siempre.
- why: Es lo que ya se venía haciendo y nadie se quejó.
`);

  // --- documentos: uno esperando, uno ya leído ---
  escribir(raiz, '02-DOCS/inbox/README.md', '# Inbox\n\nSuelta aquí lo que quieras.\n');
  escribir(raiz, '02-DOCS/inbox/contrato-talleres-ruiz.txt', 'Contrato marco de mentira.\n');
  escribir(raiz, '02-DOCS/inbox/_processed/2026-09-16/albaran-viejo.txt', 'Albarán de mentira.\n');
  escribir(raiz, '02-DOCS/raw/facturacion/_originals/factura.txt', 'Original de mentira.\n');

  return raiz;
}

// La marca de la empresa, como la dejaría el asistente tras mirar su web.
// Aparte de `montar` porque el caso por defecto —sin marca todavía, con la de
// Executive Lab— también hay que poder probarlo.
function montarMarca(raiz, {
  acento = '#0057b8', texto = '#1a1a1a', fondo = '#f7f5f2', logo = true,
  // Un logotipo que es solo el símbolo, sin el nombre dentro: cuadrado, como
  // la ene de puntos de Nexus Consulting. El de por defecto es una tira de
  // letras, que sí lo lleva.
  simbolo = false,
  tipografia = null,
  // El fichero de su tipografía (decisión 204), en la carpeta de la marca. Uno
  // que intenta salirse de ella se escribe en el récord, pero no en el disco.
  fuente = null,
  // Lo que diga el récord, cuando lo diga: 'si', 'no', o nada.
  dice = null,
} = {}) {
  // Sin logotipo utilizable, el récord no lo declara: es lo que debe hacer el
  // asistente cuando el de la empresa no se lee sobre su propio fondo.
  const viejo = path.join(raiz, '02-DOCS/wiki/brand/logo.svg');
  if (!logo && fs.existsSync(viejo)) fs.unlinkSync(viejo);

  escribir(raiz, '02-DOCS/wiki/brand/marca.md', `---
type: concept
title: Marca de Ferretería Soler
description: Los colores y el logotipo de la empresa, tomados de su web.
resource: https://ferreteriasoler.es
tags: [brand, marca]
fondo: "${fondo}"
texto: "${texto}"
acento: "${acento}"
${logo ? 'logo: logo.svg' : ''}
${dice ? `logo_lleva_el_nombre: ${dice}` : ''}
${tipografia ? `tipografia: ${tipografia}` : ''}
${fuente ? `fuente: ${fuente}` : ''}
---

# Marca de Ferretería Soler

Tomada de su web el ${HOY}.
`);
  if (fuente && !fuente.includes('..')) {
    // Basta con que exista: la barra no la abre, solo le da la dirección a la página.
    fs.writeFileSync(path.join(raiz, '02-DOCS/wiki/brand', fuente), Buffer.from('wOF2-de-mentira'));
  }
  if (logo && simbolo) {
    escribir(raiz, '02-DOCS/wiki/brand/logo.svg',
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="48" height="48">\n  <circle cx="24" cy="24" r="20" fill="${acento}"/>\n</svg>\n`);
  } else if (logo) {
    escribir(raiz, '02-DOCS/wiki/brand/logo.svg',
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 40" width="200" height="40">\n  <text x="0" y="28" font-family="serif" font-size="26" fill="${texto}">Ferretería <tspan fill="${acento}">Soler</tspan></text>\n</svg>\n`);
  }
  return path.join(raiz, '02-DOCS/wiki/brand');
}

module.exports = { montar, montarMarca };

if (require.main === module) {
  const destino = process.argv[2];
  console.log(montar(destino ? path.resolve(destino) : undefined));
}
