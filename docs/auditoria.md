# Auditoría — 17 de septiembre de 2026

Revisión completa del prototipo, desde las decisiones de arquitectura hasta cada fichero. Método: se
instaló RSC 1.4.1 en este mismo repo en modo desarrollador y se contrastó **cada suposición** contra
lo que el CLI acepta, lo que escribe en disco y lo que hay en el código del paquete. Lo que no cuadró
se corrigió aquí mismo; lo que no se pudo corregir sin una máquina limpia queda abierto y dicho.

**Resultado en una línea:** las decisiones de fondo se sostienen; la implementación tenía siete
defectos que la habrían tumbado en Windows (la plataforma mayoritaria) en el primer uso, y dos
decisiones del plan original no sobrevivieron al contacto con la realidad. Todo eso está corregido y
verificado en la medida en que un Mac permite verificarlo.

---

## Las decisiones de arquitectura

| # | Decisión | Veredicto |
|---|---|---|
| 1 | Motor = Claude Code oficial, interactivo, en VS Code. Nada de cliente propio | **Se sostiene.** Recontrastado con las tres fuentes: el artículo de soporte separa los usos en dos cubos y solo el interactivo en IDE queda fuera del crédito del SDK; la doc del SDK prohíbe ofrecer login de claude.ai a terceros sin aprobación; la extensión oficial es una GUI nativa con Focus view y login sin clave de API. El riesgo residual (la política del crédito quedó pausada en junio y puede volver) es justamente la razón de la decisión |
| 2 | La brújula se deriva del disco, no de la conversación | **Se sostiene**, y ahora con el formato real de `rsc memory resume` (líneas `clave: valor`; `files:` traducido a zonas del diccionario, nunca rutas) |
| 3 | Vocabulario cerrado | **Se sostiene.** El comprobador automático pilló dos incumplimientos reales en la primera pasada |
| 4 | Instalación por usuario, sin administrador | **Se sostiene** y se amplía: no solo sin admin, sino sin depender de nada del sistema (ver 6) |
| 5 | El disfraz vía perfil `.code-profile` importado por el instalador | **Cayó.** No se puede importar sin interfaz; `code --install-extension` va al perfil por defecto; hay ajustes de ámbito de aplicación. Ahora lo aplica la extensión por la API de configuración |
| 6 | `npx @ericrisco/rsc@X` en tiempo de uso | **Cayó.** Node rechaza lanzar `.cmd` sin shell; Windows limpio no tiene git ni bash; los hooks de RSC llaman a `node` por nombre. Ahora el instalador lleva Node, MinGit y el arnés dentro y los pone en el PATH |

Las dos que cayeron están razonadas en [decisiones.md](decisiones.md) (§5 y §6).

---

## Hallazgos

Severidad: **crítico** = el alumno no puede usar el producto · **alto** = funciona mal en un caso
habitual · **medio** = calidad, mantenimiento o afirmación falsa · **abierto** = no se pudo cerrar
desde un Mac.

### Críticos — todos corregidos

| | Dónde | Qué pasaba | Qué se hizo |
|---|---|---|---|
| C1 | `preparar.js`, `spike.md` | `--project-kind ops` no existe. RSC acepta `software\|operations\|research\|content\|mixed`. El instalador habría fallado en el primer paso | `operations` |
| C2 | `procesos.js`, `preparar.js` | `spawn('npx.cmd')` y `spawnSync('code.cmd')` sin shell. Node ≥ 18.20 / 20.12 lo rechaza con `EINVAL`. Habría roto cada botón de la barra y la instalación entera, en Windows | Nuevo `entorno.js` localiza ejecutables de verdad; `procesos.delPath` pasa por `cmd.exe /d /s /c` con la línea citada cuando no hay otra |
| C3 | `preparar.js`, `guardar.js` | Un Windows limpio no tiene git. Y aunque lo tuviera, sin identidad configurada `commit` falla | MinGit en el instalador; `prepararHistorial` falla en alto si no hay git; `asegurarIdentidad()` antes de cada copia |
| C4 | `.iss`, `perfil/` | El acceso directo abría con `--profile "Executive Lab"`: un perfil **vacío**, sin Claude ni nuestra barra, y sin los ajustes (nadie los importaba) | Sin perfil. `disfraz.js` aplica `media/disfraz.json` en el primer arranque; comandos *modo avanzado* / *modo sencillo* |
| C5 | `.iss`, `postinstall` | `.claude/settings.json` de RSC lanza `node …/rsc-bootstrap.mjs` por nombre. Sin Node en el PATH del usuario, cada sesión arranca con errores de hook delante del alumno | Inno escribe `runtime` y `git\cmd` en el PATH de usuario (`ChangesEnvironment=yes`) y `EXECUTIVE_LAB_HOME`; macOS enlaza en `/usr/local/bin` |
| C6 | `conexiones.js` | Leía un `.env` en la raíz. RSC guarda credenciales **por proveedor** en `01-TOOLS/<id>/.env`, con las claves esperadas en `.env.example`, y su `test_connection.sh` exige **bash** | Reescrito: lista de proveedores con claves que faltan, formulario por proveedor desde `.env.example`, escritura con `chmod 600`, prueba con bash, enlace "¿dónde consigo la clave?" desde `CREDENTIALS.md` |
| C7 | `skills/aplicar.js`, `perfil-de-usuario.md`, `SKILL.md` | RSC **siempre** crea `user-profile.md` en el onboarding, y `aplicar.js` lo saltaba si existía: los diales nunca se habrían aplicado a un alumno real. Además usaba `accompaniment_level`; RSC escribe `accompaniment` en frontmatter | Ajusta los diales dentro del frontmatter real, respeta el objetivo, marca con `executive_lab_rails` y no vuelve a tocarlos sin `--forzar` (el alumno puede haber bajado el dial a propósito) |

### Altos — todos corregidos

| | Dónde | Qué pasaba | Qué se hizo |
|---|---|---|---|
| A1 | `rsc.js`, `brujula.js` | `memory resume` sin sesión devuelve `(no local continuation for this branch/worktree)` **con código 0**: la brújula lo habría enseñado en inglés como "dónde estás" | Se filtra; la continuación real se interpreta por campos y las rutas se traducen a zonas |
| A2 | `guardar.js` | `git restore --source` no quita lo creado después de la copia: "volver a como estaba" no era verdad | `read-tree -m -u --reset` tras una copia previa, y la vuelta atrás queda registrada como copia: también se puede deshacer |
| A3 | `extension.js` | El disfraz se habría aplicado sobre el VS Code real de quien desarrolla (barra de actividad, menú, zoom…) | No se aplica en `ExtensionMode.Development`; ahí se pone a mano |
| A4 | `.iss` | Constante `array[0..5] of String` en Pascal Script, que no la admite: no habría compilado | Función `Objetivo(i)` con `case` |
| A5 | `.iss`, `preparar.js` | Inno crea los accesos directos **antes** del `[Run]`, y cada lado adivinaba la carpeta de Documentos por su cuenta | Ya corregido en la primera pasada: `--destino` explícito |
| A6 | `preparar.js` | `code` no está en el PATH del proceso recién instalado VS Code | Ruta completa (`…\Microsoft VS Code\bin\code.cmd`, `…/app/bin/code`) |

### Medios — corregidos

| | Dónde | Qué pasaba | Qué se hizo |
|---|---|---|---|
| M1 | `puente.js` | Caché de comandos llenada una vez: si Claude aún no estaba activa, quedaba vacía para siempre | Sin caché |
| M2 | `guardar.js` | "hoy/ayer" por milisegundos: a las 00:10 lo de las 23:50 era "hoy" | Por día de calendario |
| M3 | `brujula.js` | Un `npx` (segundos) en cada parpadeo de la barra | Memo de 20 s, y ya sin `npx` |
| M4 | `skills/README.md` | Afirmaba que `rsc doctor` avisa de `ownSkills` ausentes. En 1.4.1 no hay rastro de ello en `scripts/doctor.js` | Texto corregido; la declaración es constancia |
| M5 | `preparar.js` | Aceptaba el plan re-pasando `--goal` en texto; RSC imprime la aceptación con `--goal-base64` | Reutiliza literalmente la línea `Accept exactly this plan:` |
| M6 | `extension/` | `vsce` rechazaba el README por enlaces relativos sin repositorio | Sin enlaces; `npm run empaquetar` con los flags |
| M7 | `.gitignore` | RSC no pudo añadir sus ignores (no era repo git) | Añadidos a mano |

### Abiertos — dichos, no cerrados

| | Qué | Por qué queda abierto |
|---|---|---|
| B1 | `soporte.js` decide "hay que tocar algo" con una regex sobre la salida de `repair --dry-run` | `doctor` emite JSON con `missing` y `hookWired`; parsearlo sería más fiable. No bloquea |
| B2 | `probar()` con `test_connection.py` usa `python3` / `python` | Un Windows limpio no tiene Python. La plantilla de RSC prioriza `.sh`, que sí cubrimos con bash |
| B3 | macOS: el `.pkg` no pregunta objetivo, y sin `carga/git` depende de las herramientas de Xcode | Documentado en `instalador/README.md` |
| B4 | El desinstalador no limpia el PATH | Prototipo |
| B5 | Tres claves del disfraz dudosas | Ahora la propia extensión dice cuáles rechaza VS Code |
| B6 | **Este repo no es git.** La memoria de RSC no ancla a rama/HEAD y RSC no pudo tocar `.gitignore` | Recomiendo `git init`; no lo hice porque es una decisión de proyecto |
| B7 | **Focus view por defecto** | Sigue siendo la pregunta 2 del spike y la que más importa |
| B8 | Los hooks de RSC no han anotado esta sesión | Se cargan al arrancar; empezarán en la siguiente |

---

## Verificación ejecutada

| Prueba | Resultado |
|---|---|
| `rsc onboard` real en este repo (preview → huella → aceptación) | `RSC_ONBOARDING_READY`; confirma flags, formato de huella y de línea de aceptación |
| `rsc doctor` tras todos los cambios | 8 skills, `missing: []`, `hookWired: true`, memoria `ready/full` |
| Extensión cargada y `activate()` ejercitado contra un `vscode` de mentira | 11 módulos cargan; 9 comandos registrados = manifiesto; vista forzada; disfraz escribe 29 ajustes y deja pendientes exactamente las 3 de Claude; brújula traduce `02-DOCS/wiki/facturacion/…, 01-TOOLS/holded/…` → "Lo que sabe de tu empresa (Facturacion) · Conexiones (Holded)"; puente sin comando → portapapeles + foco |
| `npm run empaquetar` (`vsce`) | `executive-lab.vsix`, 19 ficheros, 29 KB, `src/` y `media/` completos |
| `node docs/comprobar-diccionario.js` | 28 palabras prohibidas, 12 ficheros, sin incumplimientos |
| `skills/aplicar.js` contra un perfil con el formato real de RSC | 1ª pasada pone los diales y respeta el objetivo; 2ª respeta el dial que bajó el alumno; `--forzar` lo repone; `ownSkills` sin duplicar |
| `node --check` sobre todo el `.js`, `bash -n` sobre los `.sh`, JSON validado | Todo compila |

## Lo que sigue sin probar

La extensión dentro de un VS Code real; el `.iss` compilado; `preparar.js` de principio a fin; MinGit
con bash; el PATH visto desde el editor. Es exactamente [spike.md](spike.md). **Orden recomendado:**
pregunta 4 (el bundle sin administrador) → 3 (`rsc onboard` en Windows) → 6 (los hooks ven `node`)
→ 1 y 2 (el puente y Focus view) → 5 (SmartScreen). Las tres primeras se responden en una tarde con
una VM; si alguna es "no", el plan cambia antes de gastar más.

---

## Addendum — misma tarde, con la extensión de Claude a mano

Leyendo el `package.json` y el código compilado de `anthropic.claude-code` 2.1.273 instalada en el Mac de Jose:

- **B5 cerrado a medias.** `claudeCode.hideOnboarding`, `useTerminal`, `disableLoginPrompt` y `focusView` existen. Siguen sin confirmar dos
  claves de VS Code, `workbench.secondarySideBar.defaultVisibility` y `problems.visibility`; la propia extensión dirá si las rechaza.
- **B7 cerrado.** Focus view es el ajuste `claudeCode.focusView`. Está en el disfraz.
- **Nuevo, y grave si no se hubiera visto:** el comando de foco que había supuesto (`claude-code.focusInput`) no existe; el real es
  `claude-vscode.focus`. El plan B del puente no habría enfocado nada. Corregido, y con dos puentes directos delante (§ spike 1).
- **Nuevo:** MinGit no trae `bash.exe`; su `sh.exe` es GNU bash. `entorno.bash()` lo usa como último candidato.
- **Nuevo:** `preparar.js` dejaba la carpeta sin ninguna copia inicial, así que *Volver a como estaba antes* no tenía a dónde. Ahora hace
  una primera copia, *Punto de partida*.
- **Nuevo:** el chat de Claude no se abría solo al arrancar; el alumno se encontraba el centro vacío. La extensión lo abre 1,5 s después
  de activarse.
- **Verificado además:** `preparar.js` de punta a punta en macOS (`--sin-editor`), 0,6 s, `RSC_ONBOARDING_READY`, diales y raíles correctos.

### Cierre de la tarde

- **Instalador de Windows compilado** con Inno Setup bajo Wine (Docker, `amake/innosetup`): 336 s, 291 MB. Valida el `.iss` entero —
  Pascal Script, `[Registry]`, `CurStepChanged`, `Spanish.isl`, UTF-8—. Falta ejecutarlo en Windows.
- **Demo en el Mac** (`./demo.sh`): VS Code aislado con las dos extensiones instaladas de verdad y una empresa preparada por `preparar.js`.
  El log del extension host confirma la activación de `executivelab.panel` y el canal de salida no registra ningún ajuste rechazado.
  Dos trampas encontradas al montarla, ya blindadas en el script: el entorno del extension host lleva `ELECTRON_RUN_AS_NODE=1` (el binario
  de VS Code arranca como Node y muere con `bad option`), y la ruta del directorio de datos dentro del repo supera los ~104 caracteres que
  admite un socket Unix en macOS (se usa un enlace corto en `/tmp/executive-lab-demo`).
- **B5 matiz:** con el disfraz pre-escrito, la extensión no vuelve a escribir las claves, así que las dos de VS Code que quedaban
  dudosas siguen sin confirmar por esa vía. Se confirman mirando la interfaz de la demo: sin barra de estado, sin barra de actividad,
  título propio.

---

# Fase 2 — el panel como espejo del arnés (17 de septiembre, tarde)

Tres peticiones de Jose: ajustarlo a RSC (claves y botones por herramienta, poder revisar los archivos
y la wiki), un interruptor por ventana, y el diseño de executivelab.ai. La regla que lo gobierna todo
es suya: *no predefinido, porque a lo mejor el arnés no es de facturas sino de contratos y recursos
humanos*.

## Qué se leyó antes de escribir nada

La skill `harness` de RSC, instalada en este mismo repo, y sus referencias: `wiki-protocol.md`,
`providers.yaml`, `tools-readme-template.md`, `wiki-index-template.md`. De ahí salen las estructuras
que el panel lee: la tabla de scripts del README de cada herramienta, el índice por temas de
`wiki/index.md`, el historial de `log.md`, los huecos de `gaps.md`, la bandeja de `inbox/`. **No se ha
inventado ninguna forma nueva**; si RSC cambia la suya, se cambia aquí y no al revés.

## Lo que se construyó

| Módulo | Qué hace |
|---|---|
| `acciones.js` | Los botones de "Qué quieres hacer", leídos de `.claude/commands/*.md` con `boton:` |
| `cerebro.js` | Temas, artículos, historial, huecos, bandeja de documentos y panel de RSC |
| `arrancar.js` | El wizard dentro del editor para una carpeta que aún no es una empresa |
| `frontmatter.js` | Lo justo para leer cabeceras YAML; un YAML de verdad sería dependencia para nada |
| `conexiones.js` | Ampliado: la tabla de scripts de cada herramienta y el modo mixto |
| `disfraz.js` | Rehecho: base en ajustes de usuario, interruptor en ajustes de carpeta |
| `brujula.js` | Lee el historial de la wiki; las sugerencias fijas se van a `acciones.js` |

Más la marca (fuentes empaquetadas, logotipo recoloreado, paleta, colores de toda la ventana) y una
prueba de humo de 25 comprobaciones que ahora vive en el repo (`extension/prueba/`), con un `vscode`
de mentira y una empresa de mentira con la forma que deja RSC.

## Hallazgos de esta fase

| | Qué | Cómo salió |
|---|---|---|
| F1 | **El enlace profundo se tragaba el mensaje en silencio.** `openExternal` devuelve `true` en cuanto entrega la URI, mire o no si alguien la recoge: sin la extensión de Claude instalada, el puente creía haber enviado y el portapapeles no entraba nunca | Lo pilló la prueba de humo al quitar el comando interno. Ahora se comprueba `extensions.getExtension` antes |
| F2 | **Blanco sobre el rojo de marca da 3,87:1**, no los 4,6 que yo había escrito en el plan. AA solo en texto grande | Calculado antes de escribir el CSS. Relleno de botón a `#e03014` (4,56:1); el rojo de marca se queda en todo lo demás |
| F3 | **El título de pantalla salía como etiqueta diminuta en mayúsculas** — "HOLDED" — porque reusaba el estilo de las etiquetas de sección | Se vio al renderizar el panel con Chrome sin interfaz. Clase `.titulo` aparte |
| F4 | **"Dónde estás" con dos zonas ocupaba tres líneas** en serif de 21 px sobre una barra estrecha | Lo mismo. Si no cabe en 42 caracteres, una sola zona |
| F5 | La prueba de humo **no esperaba a las comprobaciones asíncronas**, así que se solapaban y los fallos salían en la comprobación equivocada | Un fallo aparecía en la barra de estado y venía del interruptor |
| F6 | La empresa de mentira **pisaba `.rsc.json` y el perfil del alumno** al sembrar sobre una carpeta ya preparada | Se vio al montar `demo.sh --con-datos`. Ahora esas dos no se sobrescriben |
| F7 | **`entorno.js` elegía un ejecutable de otro sistema.** Probaba `git/cmd/git.exe` antes que `git/bin/git` sin mirar la plataforma: en un Mac con la carga de Windows delante, intentaba lanzar el `.exe` y fallaba con un error indescifrable | Lo pilló la prueba del wizard al ejecutarse de verdad. Ahora los candidatos se filtran por sistema, y la prueba lo comprueba |
| F8 | **El arreglo de F7 rompía Windows**, que es lo que venía a proteger: el filtro descartaba también las rutas de script, y el punto de entrada del arnés (`rsc.js`) no lleva `.exe` en ningún sistema. En Windows se habría perdido el arnés preinstalado y habría caído a `npx` — justo lo que la decisión §6 existe para evitar | Se vio al repasar qué cambiaba el arreglo antes de recompilar el instalador. El filtro es ahora `binarioDelSistema` y solo lo usan node, git y bash; la prueba comprueba las dos mitades |

## Verificación ejecutada

| Prueba | Resultado |
|---|---|
| `npm run probar` (25 comprobaciones) | Botones descubiertos y orden; herramientas y claves enmascaradas; modo mixto; ejecución real de un script y negativa del otro; escritura de clave sin pisar las demás; wiki, historial, huecos y recuento de documentos; ruta fuera de la wiki rechazada; copia de documentos sin sobrescribir; los tres caminos del puente; disfraz base y interruptor por ventana; comandos = manifiesto |
| `node docs/comprobar-diccionario.js` | 16 ficheros, sin incumplimientos, con 16 palabras nuevas en el diccionario |
| `npm run empaquetar` | 36 ficheros, 103 KB, sin la carpeta de pruebas |
| `./demo.sh --con-datos` | La extensión se activa sin errores y el canal de salida no registra ningún ajuste rechazado |
| Renderizado del panel con Chrome sin interfaz | Cuatro pantallas revisadas a ojo: principal, una conexión, el cerebro y la carpeta sin arnés |
| Contraste de la paleta | Tinta sobre crema 15,1:1 · botón 4,56:1 · enlace 5,57:1 · todo AA |

| F9 | **El interruptor no habría desocultado los ficheros.** VS Code *fusiona* los ajustes de tipo objeto entre ámbitos en vez de sustituirlos, así que escribir el `files.exclude` de fábrica (vacío) dejaba puestas las exclusiones del usuario | Revisando qué cambiaba cada clave antes de recompilar. Ahora se apaga cada patrón a `false`, y la prueba comprueba que se apagan exactamente los que esconde la base |

## El wizard, probado de verdad

`node extension/prueba/humo.js --con-arnes` lo ejecuta entero contra una carpeta vacía, con el arnés
preinstalado como lo tendrá el alumno (sin `npx`, sin red): elige objetivo, monta el arnés en los dos
pasos, comprueba el suelo, pone los raíles y guarda el punto de partida. Después comprueba que el
perfil lleva los diales `non-technical` + `L3`, que la habilidad está puesta, que hay un commit
*Punto de partida* al que volver, y que **los tres botones ya aparecen sin que nadie haya tocado el
código**. Tarda unos segundos y por eso no va en la pasada normal.

## Lo que sigue sin probar

**El interruptor por ventana no se ha visto con dos ventanas abiertas a la vez** — la prueba confirma
que escribe en el ámbito de carpeta y no en el de usuario, pero verlo es cosa de mirar.

La pregunta que quedaba para esa mirada **ya está contestada** (24-09-2026), leyendo el código en vez
de mirando: los colores de la marca **no** se quedan puestos en modo avanzado. `workbench.colorCustomizations`
se escribe solo en el ámbito de la carpeta —`aplicar()` usa `ConfigurationTarget.Workspace` y nada
más—, el instalador nunca lo toca (`SOLO_DEL_EDITOR` son cinco claves y ninguna es visual), y
`verEditorCompleto` limpia exactamente ese ámbito. La fusión entre ámbitos que mordió en F9 no
aplica aquí porque no hay valor global que fusionar. Y está vigilado: la prueba del interruptor
exige que la carpeta se quede **solo** con el interruptor apagado, así que si alguien escribiera
esos colores en otro sitio, se pondría roja.

Sigue pendiente el `.exe` en un Windows limpio, que es lo que de verdad bloquea sentar alumnos. Y
cuando esa máquina aparezca, **hay una cosa concreta que probar ahí y solo ahí** (medida el
24-09-2026):

El puente manda el texto al asistente metiéndolo en una URL —
`vscode://anthropic.claude-code/open?prompt=…`— y algunos de nuestros encargos son largos. Medido:
el de ordenar las claves de una carpeta con 120 claves ocupa 5.654 caracteres, que codificados dan
una **URL de 8.448**. En macOS pasa sin problema. En Windows, `ShellExecute` corta alrededor de los
2.048, y `openExternal` devuelve que sí en cuanto entrega la URI, mire o no si alguien la recoge —
que es el fallo F1 de esta misma auditoría.

Si ahí se corta, el alumno recibe **medio encargo** y el asistente hace medio trabajo sin que nada
lo diga. No se ha tocado por no degradar el camino bueno de macOS adivinando un límite: lo que hay
que hacer en Windows es pulsar *Que las ordene* en una carpeta con muchas claves y mirar si llega
entero. Si no llega, la salida ya existe y no hay que inventarla: el portapapeles, que no tiene
límite.

---

## Addendum — la marca de la empresa y el ajuste automático

Dos peticiones de Jose al ver la demo: que el panel se ajuste al arnés conforme se monta, y que los
colores y el logotipo sean los de la web de la empresa que se pregunta al principio. Decisiones §11 y
§12.

Antes de escribir nada se comprobó dónde guarda RSC la identidad visual: `design-dna` escribe el
récord como artículo bajo `02-DOCS/wiki/brand/`, con `palette.colors: [{role, hex, name}]`. Se escribe
en esa carpeta, no en una nueva.

**Lo que se añadió:** `color.js` (luminancia, contraste y mezcla de la WCAG 2.1), `marca.js` (lee el
récord, deriva superficie, línea y texto apagado del propio par fondo/texto, corrige el acento y
descarta la marca si no hay quien la lea), el vigía del arnés en `extension.js`, la pregunta por la web
en el wizard y la cuarta regla de la habilidad.

**Comprobado** (32 comprobaciones, seis nuevas): sin récord manda la nuestra; con récord se pintan sus
colores y su logotipo; un acento flojo (`#7bb8ff`, 1,9:1 con blanco) se oscurece hasta `#5078a6`
(4,6:1); un texto que no se lee sobre el fondo descarta la marca entera; un logotipo que apunta fuera
de su carpeta se ignora; y un comando recién creado aparece en la barra sin cerrar nada.

**Sin probar:** que el asistente rellene bien el récord mirando una web de verdad. Es cosa de la
habilidad, no del código, y se ve en la primera clase.

### Addendum — conectar una herramienta, guiado

Dos peticiones más de Jose sobre las herramientas: campos con etiqueta por variable, y guías de cómo
conectarlas escritas por el arnés al investigarlas. Decisión §13.

Nada de esto es código nuevo que adivine: sale de `README.md` y `CREDENTIALS.md` de cada herramienta,
que es donde el protocolo de `harness` dice que viva, y la habilidad `executive-lab` le dice al
asistente cómo escribirlo para quien lo va a leer. 35 comprobaciones; dos nuevas cubren que los pasos
salen del README y que cada clave trae su pista, y que los pasos técnicos de la plantilla (copiar el
`.env`, permisos) **no** se enseñan.

### Addendum — cómo se presenta 02-DOCS

Pregunta de Jose. Al renderizar la pantalla para enseñársela salió **F10: *Leerlo* abría la vista
previa de VS Code y el alumno veía el frontmatter del artículo antes que el texto** (`type: article`,
`score: 7.0`). Corregido: se lee dentro del panel, con un markdown mínimo propio. Decisión §14.

Con ello, tres mejoras que se veían pobres al lado de la pantalla de conexiones: descripción por tema
en vez del nombre de carpeta sin tildes, fecha en el historial, y huecos pulsables para contárselos.

36 comprobaciones; tres nuevas cubren que el frontmatter no llega al alumno, que el título no se
repite y que la descripción del tema no se confunde con un artículo.

### Addendum — la primera prueba con un usuario de verdad

Jose montó un arnés desde cero en una carpeta vacía —objetivo: *llevar la operativa de mi empresa con
mi ERP*— y el asistente conectó Odoo. Primera vez que alguien que no soy yo usa esto. Tres hallazgos,
y los tres son míos:

| | Qué | Cómo se arregló |
|---|---|---|
| F11 | **La guía no aparecía.** La habilidad dice que se titule `## Cómo conectarla`; el asistente escribió `## Qué hace falta`, en prosa, y el contenido era el bueno. Decirle cómo titularla no basta: hay que aceptar lo que escribe de verdad | Se aceptan varios títulos naturales, y si no hay lista numerada valen los párrafos de esa sección |
| F12 | **`ODOO_DB` salía como «Db».** Las siglas cortas no se pueden humanizar | Etiquetas nuevas (base de datos, puerto, dirección, espacio de trabajo) y las siglas de tres letras o menos se dejan como están |
| F13 | **Los raíles de su carpeta eran los viejos.** El wizard copia los que llevara la extensión instalada, así que una carpeta montada ayer no conoce las reglas de hoy | `aplicar.js` los actualiza sin tocar los diales. Queda pendiente decidir si el panel debe hacerlo solo al detectar raíles atrasados |

**Lo que salió bien, y es lo que importa:** lo que el asistente escribió en `CREDENTIALS.md` es mejor
que mi fixture. La ruta exacta dentro de Odoo, que la clave se ve una sola vez, que hereda los
permisos del usuario, y que si se pierde no pasa nada. Las cuatro pistas de los campos salieron
exactas sin tocar nada, y los cuatro scripts se clasificaron bien: tres de solo mirar y uno que pide
datos. La apuesta de §7 —que el panel refleje lo que el arnés escriba— se sostiene con un caso real.

### Addendum — la tarde con Jose probando en Windows

Instaló el `.exe` en un Windows real y trabajó con ello: la captura mostraba 5 conexiones y 7 cosas
aprendidas, con el rótulo y el disfraz puestos. Eso responde de hecho las preguntas 3, 4 y 6 del
spike, aunque falten los dos datos que solo se ven mirando (SmartScreen y si pidió administrador).

Seis fallos más, todos míos:

| | Qué | Cómo se arregló |
|---|---|---|
| F14 | **El disfraz le cambió todo VS Code.** La base iba a los ajustes de usuario | Un interruptor por carpeta (§15), tras dos intentos fallidos |
| F15 | **El desinstalador no quitaba la extensión ni los ajustes**, así que la barra seguía saliendo después de desinstalar | Ahora quita las dos extensiones y las 34 claves, con copia antes |
| F16 | **Coma colgando en el array de PowerShell**: el script no llegaba ni a arrancar | Arrays separados por salto de línea, y un `revisar-powershell.js` que pilla esa clase de fallo aquí |
| F17 | **El vigía devolvía al alumno a la pantalla principal** cada vez que el asistente tocaba un fichero — por eso «no detectaba» las claves que sí estaban | Repinta la pantalla que tienes delante; en una de lectura no toca nada |
| F18 | **`ODOO_DB` salía como «Db»** y la guía no aparecía porque el asistente tituló la sección a su manera | Etiquetas nuevas y títulos naturales aceptados (F11, F12) |
| F19 | **La interfaz llamaba «empresa» a todo** | Dos nombres que pone el alumno (§16) |

43 comprobaciones. El instalador compila con la página de nombres nueva.

### Addendum — el reparto de ámbitos, cerrado

Tres pasadas hicieron falta para que el disfraz no se comiera el VS Code de quien lo instala. El
reparto final, que es el que va en el `.exe` de las 17:21:

| Qué | Dónde se escribe | Por qué |
|---|---|---|
| Lo que se ve (28 ajustes) y el interruptor | `.vscode/settings.json` **de la carpeta** | Otra ventana con cualquier otra cosa no se entera |
| El rótulo | La misma, con los nombres que puso el alumno | «Contabilidad · Asesoría Norte», no un genérico |
| Confianza, actualizaciones, telemetría, recomendaciones | Los ajustes del editor | VS Code no admite otro ámbito, y ninguno cambia el aspecto |
| **El zoom** | **En ningún sitio** | Es de ámbito de programa: agrandaría todas las ventanas. La letra grande la pone el panel en su CSS |

F20: **`preparar.js` seguía escribiendo el disfraz en los ajustes del editor.** El arreglo de §15 se
hizo en la extensión y se me quedó el instalador atrás, así que reinstalar habría reproducido el
problema entero. Se vio al probar la instalación de punta a punta antes de dar el `.exe` por bueno.

F21: **el zoom.** Era la última fuga entre ventanas. Fuera del disfraz, y la salida de emergencia
tampoco lo borra: si alguien lo tenía puesto, es suyo.

### Addendum — el día que se ejecutaron las cosas (18-09-2026)

Siete fallos. **Ninguno lo habría encontrado leyendo el código**: salieron todos de ejecutar lo que
hasta entonces solo se había escrito — el instalador de macOS de verdad, las comprobaciones con
`--con-arnes`, y la extensión instalada desde su `.vsix`.

| | Qué | Cómo se encontró | Cómo se arregló |
|---|---|---|---|
| F22 | **`historial.js` no viajaba en el `.vsix`.** Quien instalaba solo la extensión se quedaba sin módulo y las copias de seguridad quedaban apagadas **sin avisar** | Leyendo `moduloComun()` al hilo de otra cosa | Los tres módulos comunes van dentro, y `preparar-paquete.js` grita si falta alguno o si falta el arnés |
| F23 | **Los enganches del arnés se quedaban llamando a `node` por su nombre** en el camino sin instalador. `enganches.js` decía en su cabecera que de eso ya se encargaba el wizard de la extensión; no era verdad | Ídem | El wizard los apunta, y solo cuando hay un node de verdad: si es el de VS Code, escribir su ruta rompería el enganche en vez de arreglarlo |
| F24 | **«Paso 7 de 6».** Al meter el paso de git subí los pasos y no el total. Y el aviso de «instalando git» contaba como paso propio, así que el total cambiaba según si git estaba o no | Ejecutando el instalador | El aviso pasa a ser un `detalle` dentro del paso, y `contar()` deja un AVISO si alguien se pasa |
| F25 | **Una comprobación que no comprobaba nada.** «El informe de la instalación no tiene errores» miraba en `/tmp`, y el instalador escribe en `os.tmpdir()`, que en macOS es el `$TMPDIR` privado de cada usuario. Llevaba **saltándose siempre** | Ídem: salió como SALTADA con el instalador ya ejecutado | Mira en los dos sitios. De 1 saltada a 0 |
| F26 | **La prueba del wizard llevaba rota desde el 17-09.** El `vscode` de mentira solo sabía contestar **una** pregunta, y ese día el wizard pasó a hacer **seis**. Como solo corre con `--con-arnes`, nadie lo vio | Ejecutando `--con-arnes` por primera vez en semanas | El falso sabe seguir una entrevista entera, y la prueba falla si sobran o faltan respuestas |
| F27 | **Preparar una carpeta escribía en el historial de otro.** El único guardarraíl era `.rsc.json`; en un proyecto ya empezado, el «Punto de partida» hacía `git add -A` y metía el trabajo sin guardar de esa persona en un commit nuestro | Lo preguntó Jose: *«si es brownfield… porque debe hacer eso, si no joderás los proyectos ya empezados»* | `terreno.js` y la decisión 28: el punto de partida solo se escribe si el historial es nuestro |
| F28 | **El botón de guardar fuera no existía sin un token escrito a mano.** No es que fallara: es que no aparecía, así que nadie sabía que eso se podía hacer | Lo preguntó Jose al ver el panel instalado | La sesión de GitHub del editor, y una guía en vez de un botón ausente (decisión 29) |

Y un malentendido que era culpa nuestra: *«no me aparecen las conexiones»*. No estaba roto —en esas
carpetas no hay ninguna— pero **el panel no sabía decir la diferencia entre "no tienes" y "no
encuentro"**. De ahí salió «Qué hay en esta carpeta» (decisión 30).

**Lo que esto dice del proyecto:** las pruebas que no se ejecutan en el camino normal se pudren. Dos
de los siete (F25, F26) eran comprobaciones que existían y no comprobaban nada, y las dos llevaban
así desde el día que se escribieron. Vale la pena que `--con-arnes` entre en el camino de
`publicar.sh` antes de cada release, aunque tarde minutos.

De 59 comprobaciones a **69**.
