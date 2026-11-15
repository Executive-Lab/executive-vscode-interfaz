#!/usr/bin/env node
// El freno ante órdenes peligrosas de Executive Lab (C1, decisión 1 de Jose).
//
// RSC 2.0.15 solo enganchaba su freno cuando el plan practicaba la cadena SDD.
// Con «Llevar el día a día», «Crear cosas», «Estudiar un tema» o algo pequeño
// que construir, nada paraba un `rm -rf`, aunque su habilidad `init` lo
// prometiera por nivel técnico. Desde la 2.0.16 lo pone a los no técnicos
// (#273), y entonces este deja pasar sin decir nada (abajo).
//
// Esto no es un freno nuevo: es el suyo. `freno-rsc-4.1.7.mjs`, aquí al lado,
// es su `targets/danger-guard.mjs` copiado byte a byte, con el `shell-unwrap.mjs`
// que carga para mirar dentro de `bash -c` (MIT, con la licencia al lado), con su misma lista, su mismo interruptor (`.rsc/.no-danger-guard`)
// y su misma regla de nivel técnico. Una prueba lo compara con el del paquete.
//
// Se engancha siempre y decide al ejecutarse. Si el de RSC está puesto y
// enganchado, manda el suyo y este deja pasar sin decir nada: dos frenos
// dirían lo mismo dos veces. Decidirlo al montar dependería de qué orden de
// RSC corrió la última vez (C6).
//
// La orden que lo engancha no lleva `.rsc/`: RSC quita todo enganche con esa
// aguja cuando reescribe los suyos.
//
//   argv[2] = la carpeta del proyecto   stdin = el JSON del enganche (PreToolUse)
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const raiz = process.argv[2] || process.cwd();

// Puesto es enganchado de verdad antes de cada orden de Bash: una entrada de
// `hooks.PreToolUse` cuyo `matcher` alcanza a Bash, con una orden que lleva el
// suyo. Con su nombre en una nota, o enganchado a otra herramienta, este se
// apartaba sin que frenara nadie (revisión final, crítico). La barra decide con
// la misma regla (`reglas.enganchadoAntesDeBash`), y una prueba mira que coincidan.
function alcanzaABash(matcher) {
  if (matcher === undefined || matcher === null || matcher === '' || matcher === '*') return true;
  if (typeof matcher !== 'string') return false;
  try {
    return new RegExp(`^(?:${matcher})$`).test('Bash');
  } catch {
    return matcher === 'Bash';
  }
}

function elDeRscEstaPuesto() {
  if (!existsSync(join(raiz, '.rsc', 'danger-guard.mjs'))) return false;
  try {
    const entradas = (JSON.parse(readFileSync(join(raiz, '.claude', 'settings.json'), 'utf8')).hooks || {}).PreToolUse;
    return Array.isArray(entradas) && entradas.some((e) => e && Array.isArray(e.hooks) && alcanzaABash(e.matcher)
      && e.hooks.some((h) => h && typeof h.command === 'string' && h.command.includes('.rsc/danger-guard.')));
  } catch {
    return false;
  }
}

if (elDeRscEstaPuesto()) process.exit(0);

try {
  await import('./freno-rsc-4.1.7.mjs');
} catch {
  // Como el de RSC: un fallo por dentro nunca bloquea una orden.
  process.exit(0);
}
