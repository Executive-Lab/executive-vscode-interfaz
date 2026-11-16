# Diez cosas para Eric

Salieron montando esta barra sobre RSC, y las nueve son de RSC, no nuestras. Están
contra la **2.0.5** y comprobadas leyendo el paquete publicado, no deducidas. Las rutas
son relativas al paquete (`node_modules/@ericrisco/rsc/`).

Ninguna nos bloquea: todas tienen rodeo y lo hemos puesto, menos la tercera, que es
cosmética. Van por si sirven. Con la clase ya en la **2.0.15**, dos están arregladas y seis siguen, abiertas
como issues: el estado de cada una, al final.

> **La primera está abierta como issue**:
> [ericrisco/rsc-harness#258](https://github.com/ericrisco/rsc-harness/issues/258),
> el 21 de septiembre de 2026. La segunda no: es más discutible —respetar el
> `.gitignore` cambiaría la identidad del plan de todo el mundo— y el rodeo de
> no descargar nada dentro de la carpeta es bueno de todas formas.
>
> **De la cuarta a la novena** salieron de la auditoría del 25 de septiembre
> (decisión 116) y están sin abrir. Al final hay un borrador de cada una, en inglés
> como el repositorio, para que Jose las abra. No están miradas contra la 2.0.15.

---

## 1. `optOuts` se escribe en `.rsc.json` y no lo lee nadie

**Qué pasa.** `install-apply.js:135` recorre `.rsc/` buscando ficheros `.no-*` y
guarda sus nombres en `.rsc.json → optOuts`:

```js
optOuts = readdirSync(dir).filter((f) => f.startsWith('.no-')).map((f) => f.slice(4)).sort();
```

`.rsc.json` se comitea, así que la decisión viaja con el repositorio. Pero
**ningún guardián la lee**. Los once deciden con el fichero local:

```js
// targets/gitmoji-guard.mjs:229
if (existsSync(join(root, '.rsc', '.no-gitmoji'))) allow();
```

Y `.rsc/` es exactamente lo que `install-apply.js:301` añade al `.gitignore`:

```js
const wanted = ['.rsc/'];
```

`optOuts` aparece nueve veces en todo el paquete —`scripts/install-apply.js`,
`scripts/rsc.js`, `scripts/lib/manifest-file.js`— y **las nueve son escrituras o
valores por defecto**. Cero lecturas.

**Qué se ve.** Un equipo decide que aquí no se escriben commits con gitmoji y
crea `.rsc/.no-gitmoji`. El siguiente `sync` lo recoge y `.rsc.json` pasa a decir
`optOuts: ["gitmoji"]`, comiteado. Alguien clona. `.rsc.json` sigue diciendo que
el equipo lo descartó, el fichero local no viajó, y **el primer `git commit -m`
del recién llegado sale denegado** por una convención que ya estaba decidida.

Con `gitmoji-guard` duele más que con los otros porque bloquea la orden más
frecuente que hay, y porque el mensaje de recuperación le dice que cree un
fichero que su equipo ya creó.

**Rodeo que hemos puesto.** Sacar esa línea del `.gitignore`:

```gitignore
.rsc/*
!.rsc/.no-gitmoji
```

Funciona, pero con una pega más: `ignoreLocalState` (`install-apply.js:301`) busca la línea
exacta `.rsc/` —normalizando barras, no comodines— y al no encontrarla **vuelve a añadirla al final
cada vez que se aplica un plan**. Y una `.rsc/` al final anula el `!.rsc/.no-gitmoji` de arriba,
porque git no entra en un directorio excluido. Así que después de cada `onboard` hay que quitarla a
mano. Y es una excepción a mano por cada interruptor, y hay once:
`.no-audit`, `.no-claudemd-check`, `.no-context7`, `.no-danger-guard`,
`.no-feature-gate`, `.no-git`, `.no-gitmoji`, `.no-harness`, `.no-scope-check`,
`.no-ship-guard`, `.no-worktree-cleanup`.

**Lo que parece que falta.** Que el guardián mire las dos: el fichero local
—que es la decisión de esta máquina— y `optOuts` del manifiesto —que es la del
equipo—.

```js
const apagado = existsSync(join(root, '.rsc', '.no-gitmoji'))
  || (readManifest(root)?.optOuts || []).includes('gitmoji');
```

El campo ya existe, ya se rellena solo y ya viaja. Solo falta leerlo.

---

## 2. `scanProject` no lee el `.gitignore`, y el plan se construye sobre lo que
   haya dentro

**Qué pasa.** `scanProject` (`scripts/lib/onboarding.js:64`) recorre la carpeta
entera para construir la evidencia del plan, saltando una lista fija:

```js
const ignored = new Set(['.git', '.rsc', 'node_modules', '.venv', '.next',
  'dist', 'build', 'coverage', '__pycache__', '.dart_tool', /* …los asistentes… */]);
```

Lo que no esté en esa lista cuenta, esté o no en el `.gitignore`.

**Qué se ve.** Este proyecto descargaba dos copias de VS Code para probar:
`extension/.vscode-test/` (901 MB, lo pone `@vscode/test-electron` por defecto)
y una carpeta de demo (729 MB). Las dos gitignoradas desde el primer día. RSC las
leyó enteras, y entre las dependencias de la extensión de Copilot que VS Code
trae dentro está `react`.

Resultado: el plan de una barra lateral escrita en JavaScript plano traía
`skill/react`, los ayudantes `react-build-resolver` y `react-reviewer`, y los
comandos `react-build` y `react-review`. Y `reassess` recomendaba las cuatro
cosas aplazadas con la explicación *«the project added authentication,
external-integrations, persistence evidence»* — señales que salen de
`scanProject:118-121`, que casa `auth`, `session`, `payment`, `migration` contra
**la ruta** de cada fichero. Las rutas eran las del propio editor.

La evidencia congelada decía `sourceFileCount: 14` cuando el plan se aceptó y el
proyecto tenía 14 ficheros de verdad; después el ruido la llevó por otro lado. Al
sacar las dos carpetas fuera quedó en **81 ficheros, `node`, sin señales de
complejidad**, que es lo que hay.

**Rodeo que hemos puesto.** Que no se descarguen dentro: `cachePath` en
`@vscode/test-electron` y `$HOME/.cache` para la demo. Lo hemos subido a regla
del proyecto, porque vale para cualquiera con arnés: *lo que se descarga no entra
en la carpeta*.

**Lo que parece que falta.** Respetar el `.gitignore` sería lo más fiel a lo que
alguien espera —lo que no versiono no me define— pero cambia la identidad del
plan de todo el mundo, así que entendemos que no sea gratis. Con dos cosas más
pequeñas se habría evitado esto:

- añadir `.vscode-test` a la lista de ignorados, que es tan estándar como
  `coverage` o `dist`;
- y, sobre todo, **decir en el plan sobre cuántos ficheros se ha decidido**.
  `renderPlan` imprime las decisiones pero no la evidencia; un
  `Evidence: 81 source files · node` habría cantado a la primera, porque nadie
  mira un `sourceFileCount` dentro de un JSON de 300 líneas.

---

## 3. El adaptador de memoria contesta a `PreCompact` con un campo que Claude Code no acepta

**Qué pasa.** `.rsc/session-memory-adapter.mjs` se engancha a `PreCompact` y devuelve:

```json
{ "hookSpecificOutput": { "hookEventName": "PreCompact", "additionalContext": "rsc memory: …" } }
```

Claude Code (2.1.x) valida la salida de cada hook contra su esquema, y `hookSpecificOutput` solo
admite `PreToolUse`, `UserPromptSubmit`, `PostToolUse`, `Stop`… **`PreCompact` no está**. Así que
cada compactación imprime en la terminal del alumno un bloque rojo de «Hook JSON output validation
failed» con el esquema entero, y el mensaje que RSC quería dar no llega.

**Lo que parece que falta.** Para `PreCompact`, el campo que sí se acepta es `systemMessage` (o no
devolver nada). El contenido es el mismo; cambia la envoltura.

**Rodeo.** Ninguno: es cosmético y no rompe nada. Pero es lo primero que un alumno no técnico ve en
rojo, y es de RSC.

---

## 4. El freno que promete `init` solo se engancha si el plan practica SDD

**Qué pasa.** `skills/init/SKILL.md:167-171` le pide al asistente que avise: con un
`technical_level` `non-technical` o `mixed`, o sin perfil, hay un freno en `PreToolUse`
que para `rm -rf`, `git push --force`, `DROP`… El guion lo cumple:
`targets/danger-guard.mjs:36-44` lee el perfil y solo deja pasar a un `technical`.
Pero el guion solo se engancha cuando el plan practica SDD:

```js
// scripts/lib/onboarding.js:201
const practisesSdd = isSoftware && (normalized.softwareScope !== 'small' || complexitySignals.length > 0);
// :230 y :277
const hooks = practisesSdd;
codeHooks: practisesSdd,
```

`targets/claude.js:164` engancha los cuatro —`ship-guard`, `danger-guard`,
`gitmoji-guard` y `userprompt-gate`— solo si `codeHooks !== false`. Si no,
`:227-241` los desengancha y borra sus ficheros.

**Qué se ve.** Una persona no técnica que monta una carpeta de `operations`, de
contenido o de estudio, o un software pequeño sin señales de complejidad, se queda sin
freno. `init` le ha dicho que lo tiene. El guion que decide por nivel técnico no llega
a correr, porque no está enganchado.

**Rodeo que hemos puesto.** Un freno propio (decisión 119). Los raíles enganchan en
`PreToolUse(Bash)` un envoltorio, `.claude/skills/executive-lab/freno.mjs`. Si el
vuestro está enganchado, deja pasar; si no, carga una copia de `danger-guard.mjs` de la
2.0.5, idéntica byte a byte, con vuestra licencia MIT al lado. La orden no nombra
`.rsc/`, para que `unwireHook` no la quite.

**Lo que parece que falta.** Sacar el freno de órdenes peligrosas de `codeHooks`. El
guion ya decide solo por nivel técnico, así que puede ir enganchado siempre, y los otros
tres seguir con el plan.

---

## 5. `repair` engancha los frenos sin mirar el plan

**Qué pasa.** Para `duplicate-hooks` y `dangling-links`, `scripts/lib/repair.js:141-142`
llama a `applyInstall` sin `policy`. `applyInstall` le pasa ese `undefined` a
`wireHook` (`scripts/install-apply.js:192`), que lo recibe como `policy = {}`
(`targets/claude.js:112`). Y `policy.codeHooks !== false` sale verdadero (`:164`).

**Qué se ve.** En una carpeta cuyo plan dice `codeHooks: false`, un `repair` escribe los
cuatro guiones y los engancha, y el siguiente `sync` los vuelve a quitar. Que haya frenos
depende de la última orden que corrió, no del plan aceptado.

**Rodeo que hemos puesto.** Después de cada `repair`, la barra corre `sync`, que aplica la
política del plan (decisión 119).

**Lo que parece que falta.** Que `repair` le pase a `applyInstall` la política del recibo
(`.rsc.json → onboarding`), como hace `sync`.

---

## 6. `onboard` y `add` sustituyen la habilidad del usuario que se llame como una vuestra

**Qué pasa.** `linkOrCopy` (`targets/index.js:19-22`) es idempotente a propósito:
*«replaces any existing link/dir at toPath»*. Nadie mira antes si lo que hay en
`.claude/skills/review/` es vuestro o del usuario. La copia de seguridad sí lo guarda,
porque la carpeta está entre las rutas gestionadas (`scripts/install-apply.js:111-113`,
copiadas en `:173`), pero no se dice.

**Qué se ve.** Quien ya tenía su `review`, su `plan` o su `debug` monta el arnés, y su
habilidad desaparece: en su sitio queda el enlace a la vuestra. El plan no lo avisa.

**Rodeo que hemos puesto.** Antes de aceptar, la barra pide el plan en seco, cruza los ids
de «Selected:» con lo que hay en disco y pregunta por cada choque: sobrescribir la suya
(queda en `.rsc/backups/`, y se dice dónde) o cambiarle el nombre (decisión 118).

**Lo que parece que falta.** Mirar el estado antes de sustituir: una carpeta que no está
en `state.skills` de `.rsc-state.json` no es vuestra. Con eso, el plan en seco puede
listar los choques y `onboard` puede pedir confirmación.

---

## 7. El dial se llama de dos maneras

**Qué pasa.** El perfil que escribe `onboard` lleva `accompaniment:`
(`scripts/lib/onboarding-apply.js:69`). Las habilidades leen otro campo,
`accompaniment_level`:
- `skills/orient/SKILL.md:41`;
- `skills/harness/SKILL.md:50`;
- `skills/constitution/SKILL.md:24`;
- `skills/orient/references/orientation-contract.md:22`;
- y la plantilla del perfil de `init` (`skills/init/references/accompaniment-and-profile.md:76`).

Y `skills/orient/SKILL.md:55` lo **escribe** cuando alguien pide más o menos detalle.

**Qué se ve.** Tras un «explícamelo más», el perfil tiene dos diales: el de `onboard`,
que es el del plan, y el de `orient`, que es el que lee el asistente. Pueden no coincidir.

**Rodeo que hemos puesto.** La barra (`trato.js`) lee los dos y, al cambiarlo, escribe los
dos con el mismo valor (decisión 120).

**Lo que parece que falta.** Un solo nombre. Como `onboard` y `--accompaniment` ya dicen
`accompaniment`, lo barato es cambiar las cinco lecturas.

---

## 8. `doctor` sale siempre con 0

**Qué pasa.** `scripts/rsc.js:707-711` imprime el informe y vuelve, falte lo que falte.
Y lo que falta llega en tres formas:
- `missing` son cadenas `"id:/ruta/absoluta"` (`scripts/doctor.js:236`);
- `missingAgents` son `{ id, action }` (`:190-193`);
- `missingCommands` son `{ id, path, action }` (`:186`).

`hookWired: false` (`:199`) tampoco cambia el código.

**Qué se ve.** Un guion o una CI que pregunte por el código de salida si el arnés está
sano oye siempre que sí. Nosotros lo hacíamos así, y «Algo va mal» decía «sano» con
habilidades ausentes. Y quien pinte el informe tiene que conocer las tres formas: la
barra enseñaba `[object Object]` donde faltaba un agente.

**Rodeo que hemos puesto.** La barra decide por el contenido de `doctor --json`: las tres
listas vacías y `hookWired` distinto de `false` (decisión 123).

**Lo que parece que falta.** Salir con un código distinto de 0 cuando falta algo, y una
forma común para las tres listas, `{ id, path?, action }`.

---

## 9. Aceptar un plan reescribe el perfil entero

**Qué pasa.** `writeOnboardingDocuments` (`scripts/lib/onboarding-apply.js:76-81`) escribe
`user-profile.md` de cero con cuatro campos: nivel técnico, dial, tipo de proyecto y
objetivo (`:69`). Y `:173-175` desinstala todo asistente que no esté en el plan nuevo.

**Qué se ve.** `init` va apuntando el descubrimiento en ese fichero: *«Record everything to
`02-DOCS/wiki/harness/user-profile.md` as you learn it»*
(`skills/init/references/discovery.md:3`). A qué se dedica, qué herramientas usa, qué no se
puede tocar. Todo eso se pierde la próxima vez que se acepta un plan, que es lo que pasa al
subir de versión. El dial cambiado después vuelve al del recibo. Y el asistente añadido
con `sync --target` se desinstala si la orden no lo repite.

**Rodeo que hemos puesto.** Al volver a montar, la barra manda el dial y los asistentes de
hoy, no los del recibo, y vuelve a poner en el perfil lo nuestro: nombres, alcance y
personas (decisión 118). Y lee el perfil antes de aceptar el plan y devuelve después lo que
había: los campos de la cabecera que el plan no escribe, con sus listas y sus bloques, y el
cuerpo, con el dial y las palabras al día (decisión 124).

**Lo que parece que falta.** Tocar solo lo que es del plan: reescribir la cabecera y dejar
el cuerpo. O, si se reescribe entero, conservar lo que había debajo de `Goal:`.

---

## Borradores de las issues (de la 4 a la 9)

Uno por punto, para abrirlos por separado. Se abrieron en español y con gitmoji en el título, como la #258: es lo que se hace en ese repositorio. Cómo quedó cada uno, abajo.

**4 · `init` promises the danger guard by technical level, but it is only wired when the plan practises SDD.**
`skills/init/SKILL.md:167-171` tells a non-technical user that a `PreToolUse` guard blocks
irreversible commands, and `targets/danger-guard.mjs:36-44` already gates itself on
`technical_level`. But `scripts/lib/onboarding.js:230,277` sets `codeHooks: practisesSdd`, and
`targets/claude.js:164,227-241` unwires and deletes the guard otherwise. Operations, content,
research and small software harnesses end up with no guard. Suggestion: wire `danger-guard`
regardless of `codeHooks`; keep ship/gitmoji/userprompt under it.

**5 · `repair` wires the code hooks without the accepted plan's policy.**
`scripts/lib/repair.js:141-142` calls `applyInstall` with no `policy`, which reaches
`wireHook` as `policy = {}` (`scripts/install-apply.js:192`, `targets/claude.js:112`), so
`codeHooks !== false` is true and the four guards are written. The next `sync` removes them.
Suggestion: pass the receipt's policy, as `sync` does.

**6 · `onboard`/`add` silently replace a user-authored skill with the same id.**
`linkOrCopy` (`targets/index.js:19-22`) removes whatever is at the destination. The folder is
in the backup (`scripts/install-apply.js:111-113,173`), but nothing tells the user. Suggestion:
treat a folder that is not in `state.skills` (`.rsc-state.json`) as the user's, list it in the
dry-run plan and ask before replacing it.

**7 · The accompaniment dial has two names.**
`onboard` writes `accompaniment:` (`scripts/lib/onboarding-apply.js:69`); `orient`, `harness`,
`constitution`, the orientation contract and `init`'s profile template read
`accompaniment_level`, and `orient/SKILL.md:55` writes it. A profile can end up with two dials
that disagree. Suggestion: one name; `accompaniment` is what the CLI already uses.

**8 · `doctor` always exits 0, and "missing" comes in three shapes.**
`scripts/rsc.js:707-711` returns without an exit code, whatever the report says. `missing` is
`"id:/abs/path"` (`scripts/doctor.js:236`), `missingAgents` is `{id, action}` (`:190-193`),
`missingCommands` is `{id, path, action}` (`:186`), and `hookWired: false` (`:199`) changes
nothing. Suggestion: a non-zero exit when something is missing, and one shape for the three lists.

**9 · Accepting a plan rewrites `user-profile.md` from scratch.**
`writeOnboardingDocuments` (`scripts/lib/onboarding-apply.js:69,76-81`) writes four fields and
drops the rest, although `init` records its discovery there
(`skills/init/references/discovery.md:3`). Re-accepting a plan (for instance, after an upgrade)
loses it, resets the dial to the receipt's, and `:173-175` uninstalls any assistant added
later with `sync --target`. Suggestion: rewrite the frontmatter fields the plan owns and keep the
body.

---

## Cómo está cada una en la 2.0.15 (28-09-2026)

La clase subió a la 2.0.15 (decisión 127). Cada punto de arriba se volvió a mirar contra ese paquete, y
los seis que quedaban se reprodujeron con él antes de abrirlos:

| # | Qué | En la 2.0.15 | Issue |
|---|---|---|---|
| 1 | `optOuts` no viaja en un clon | **Arreglado en la 2.0.6**, a su manera: los guardianes siguen mirando `.rsc/.no-*`, y la instalación los reconstruye desde `.rsc.json` cuando `.rsc/` no existe. Solo los del equipo; los de cada máquina no salen de ella. El rodeo del `.gitignore` de este repositorio se quitó | [#258](https://github.com/ericrisco/rsc-harness/issues/258), cerrada |
| 2 | `scanProject` no lee el `.gitignore` | Sigue igual. No se abrió: es discutible | — |
| 3 | La memoria contesta a `PreCompact` con un campo que Claude Code no acepta | **Arreglado en la 2.0.11**: lo que es para la persona va por `systemMessage` | la #269, de otra persona |
| 4 | El freno de `init` solo con SDD | Sigue: reproducido | [#273](https://github.com/ericrisco/rsc-harness/issues/273) |
| 5 | `repair` engancha los frenos sin el plan | Sigue: reproducido | [#274](https://github.com/ericrisco/rsc-harness/issues/274) |
| 6 | `onboard` sustituye una habilidad del usuario | Sigue: reproducido | [#275](https://github.com/ericrisco/rsc-harness/issues/275) |
| 7 | El dial con dos nombres | Sigue: nueve ficheros leen `accompaniment_level` | [#276](https://github.com/ericrisco/rsc-harness/issues/276) |
| 8 | `doctor` sale siempre con 0 | Sigue: reproducido | [#277](https://github.com/ericrisco/rsc-harness/issues/277) |
| 9 | Aceptar un plan reescribe el perfil | Sigue: reproducido. Lo de los asistentes, corregido al reproducirlo: no se desinstalan, salen de la declaración | [#278](https://github.com/ericrisco/rsc-harness/issues/278) |

Se abrieron en español y con gitmoji en el título, como la #258: es lo que se hace en ese repositorio. La
nota de los borradores que decía «en inglés» estaba equivocada.

---

## 10. La oferta de MemSlop acaba en el freno, con quien no es técnico (4.1.7, 16-11-2026)

Sin abrir: es un borrador para que Jose decida si se abre (decisión 200).

`targets/memslop-offer.mjs` le pide al asistente, al empezar la conversación en un Mac, que ofrezca MemSlop y que,
con un sí, lo instale bajando su `install.sh` y pasándoselo a `bash`. Con `technical_level: non-technical`,
`targets/danger-guard.mjs` le para justo esa orden («pipes a downloaded script straight into a shell»). La persona
dice que sí y lo siguiente que ve es un bloqueo, con un aviso que le pide que decida si apagar el freno. Lo hemos
reproducido sin querer: el freno paró hasta un `heredoc` que solo citaba la orden.

**Lo que parece que falta.** Que la oferta mire el mismo `technical_level` que el freno y no se haga a quien no puede
aceptarla, o que se instale por un camino que el freno deje pasar. Y una forma de callarla por proyecto o por
entorno: hoy solo se calla con `~/.rsc/.no-memslop`, que es de toda la máquina.

**Nuestro rodeo.** La barra pone `~/.rsc/.no-memslop` al abrirse, solo en un Mac.

**Borrador:**

> 🐛 La oferta de MemSlop acaba bloqueada por danger-guard con usuarios no técnicos. `memslop-offer.mjs` ofrece
> instalarlo con `curl … | bash`; con `technical_level: non-technical`, `danger-guard.mjs` deniega esa orden. Propuesta:
> no ofrecerlo (o no proponer esa orden) cuando el perfil no es técnico, y un opt-out por proyecto además del de máquina.

### Y el salto de la 3.0.22 a la 4.1.7 tampoco rompió nada

Comprobado con los dos paquetes, uno al lado del otro: los marcadores que parseamos, `doctor --json`, `repair
--dry-run`, `reassess`, `memory resume` y `sync --dry-run` dicen lo mismo, y `danger-guard.mjs` y `shell-unwrap.mjs`
son idénticos byte a byte. Una carpeta montada con la 3.0.22 pasa a la 4.1.7 con un `sync` y conserva cada decisión.

---

## Lo que sí funcionó, por si vale como señal

El salto de la 1.4.1 a la 2.0.5 no nos rompió nada, y eso no es lo normal en un
mayor. Copiamos tres tablas vuestras (`targets/index.js`, `commands.js`,
`agents.js`) porque la barra no puede depender de los interiores de un paquete
que puede no estar — y las tres estaban **idénticas byte a byte**. El esquema de
`.rsc.json` también. Y ninguno de los marcadores que parseamos
(`Plan id:`, `Accept exactly this plan`, `RSC_ONBOARDING_READY`,
`RSC_PLAN_CHANGED`, `RSC_REASSESSMENT_*`, `Nothing to repair`, `[fix]`/`[ask]`)
había cambiado.

El protocolo de dos pasadas con huella es lo que nos deja montar sin terminal:
enseñamos el plan, lo acepta una persona, y si el árbol cambió entre medias
`RSC_PLAN_CHANGED` lo para. Y `RSC_ONBOARDING_INCOMPLETE` saliendo por la salida
normal con código 0 —instalado pero sin suelo— es exactamente la distinción que
necesitábamos para no llamar «error» a lo que no lo es.
