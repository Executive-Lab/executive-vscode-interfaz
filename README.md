# Executive Lab — interfaz sin fricción sobre el arnés RSC

Una capa sobre VS Code para que alguien que **no programa** pueda trabajar con un agente de IA sin
ver nunca una terminal, una ruta de fichero ni la palabra «commit».

El motor es **Claude Code (o Codex) oficial**, interactivo, dentro de VS Code. Esto no es un chat:
es el instalador, el disfraz y los raíles que lo rodean. Por debajo, quien monta y gobierna el
espacio de trabajo es el arnés [RSC](https://github.com/ericrisco/rsc-harness).

> **¿Eres un agente de IA y te han pedido instalar esto?**
> Salta directo a **[Para agentes: instrucciones ejecutables](#-para-agentes-instrucciones-ejecutables)**.
> Está escrito para que lo sigas sin interpretar nada.

**Última release:** en [Releases](https://github.com/Executive-Lab/executive-vscode-interfaz/releases/latest), con su
`.vsix`. La versión de la barra es la de `extension/package.json`.

---

## Qué ve quien lo usa

Una barra lateral con una brújula —dónde estás, qué acabas de hacer, qué puedes hacer ahora— y
botones en lenguaje de negocio.

![Las cuatro pantallas del panel](docs/panel.png)

Lo que el arnés va aprendiendo del trabajo se lee **dentro** del panel, sin rutas, sin markdown y sin
la cabecera técnica del artículo:

![Lo que sabe de tu empresa, y un artículo leído dentro](docs/docs.png)

Conectar una herramienta es un formulario guiado: los pasos que escribió el propio asistente al
investigarla, y debajo de cada campo, de dónde se saca esa clave en concreto:

![La pantalla de una conexión, con su guía](docs/conexion.png)

Y cuando la persona dice cuál es la web de su empresa, el panel deja de llevar nuestra marca y lleva
la suya — mismos botones, sus colores, su logotipo:

![El mismo panel con la marca de Executive Lab y con la de la empresa del alumno](docs/marca.png)

Y si la carpeta guarda varios proyectos, cada uno con su propio git —un monorepo como el de Executive
Lab, con el arnés en la raíz y los proyectos en `03-PROYECTOS/`—, la barra los enseña en **Proyectos**.
Dice cómo está cada uno: cambios sin guardar, copias sin subir y la rama. Trae un botón para trabajar en
él y otro para ver su conocimiento, y guardarlo o subirlo se le encarga al asistente, que sigue las
reglas de ese proyecto (decisión 195).

### La regla que ordena el panel

**No hay ni una herramienta, ni una tarea, ni un tema escritos en el código.** Todo lo que se ve sale
de leer lo que RSC tenga montado en esa carpeta: las conexiones de `01-TOOLS/`, los comandos de
`.claude/commands/` que lleven `boton:`, los temas de `02-DOCS/wiki/`.

Una gestoría acaba con botones de facturación y una empresa de contratos con botones de contratos,
sin que nadie toque el código. Y aparecen solos: la barra vigila lo que el arnés escribe.

---

## Cómo se instala

Tres caminos. **El primero es el bueno**; los otros dos existen para casos concretos.

### 1. La extensión de VS Code — el camino principal

Sirve para quien ya tiene VS Code y una cuenta de pago de Claude Code o de Codex.

1. Descarga `executive-lab-<version>.vsix` de
   [la última release](https://github.com/Executive-Lab/executive-vscode-interfaz/releases/latest).
2. Arrástralo sobre la ventana de VS Code. (O `Ctrl+Shift+P` → *Extensions: Install from VSIX…*)
3. Abre la carpeta con la que quieras trabajar y pulsa **Preparar esta carpeta** en la barra de la
   izquierda. Te hará unas preguntas en lenguaje llano, de una en una, y montará el arnés con tus respuestas. Cuántas,
según lo que respondas: la barra lo dice antes de empezar.

**No hace falta instalar Node ni npm:** la barra usa el Node que lleva VS Code, también para lo que el
arnés hace solo (el relevo, decisión 119), y el arnés viaja dentro del `.vsix`. En Windows, el relevo
está por medir.
Tampoco hace falta ningún permiso de administrador, y no hay aviso de SmartScreen ni de Gatekeeper
porque no es un ejecutable.

Requisitos: **VS Code 1.98 o más nuevo**, y **Claude Code o Codex** con cuenta de pago del que uses.

**git hace falta sí o sí**, y si no está, se pone con el mismo clic de «Preparar esta carpeta»,
mientras el panel hace las preguntas (decisión 165): en Windows descarga y lanza el instalador oficial de
Git, que con una cuenta de administrador pide permiso; en macOS lanza el de Apple. No lo repartimos
nosotros. El porqué está en la decisión 26: el arnés usa git por su cuenta, y sin él funciona a medias y
sin decirlo.

### 2. El instalador de escritorio — para el portátil virgen

Para quien llega sin nada. Pone **las piezas**: VS Code, Node, git y las dos extensiones, todo
dentro de la carpeta del usuario y sin pedir administrador. El arnés no lo monta él: eso lo hace el
panel cuando esa persona elige carpeta, igual que por el camino de la extensión (decisión 27).

- **Windows:** `ExecutiveLab-Setup.exe`, **29 MB**. `instalador/windows/preparar-carga.sh` y luego
  Inno Setup (ver [instalador/README.md](instalador/README.md)).
- **macOS:** `Executive Lab <version>.dmg`, **6,8 MB**. Node y el editor se descargan al instalar.

⚠️ **Hoy no se reparten.** Ninguno de los dos está firmado, así que macOS los bloquea con Gatekeeper
y Windows enseña *«Windows protegió tu PC»*. Antes de repartir cualquiera de los dos hay que
firmarlo.

### 3. Solo los raíles — sobre un RSC que ya existe

Los raíles son configuración sobre RSC: fijan el español, el vocabulario de negocio y la habilidad
`executive-lab`. No dependen ni del instalador ni de la extensión.

```bash
node skills/aplicar.js "~/Documentos/Mi Empresa IA"
```

No pisa nada de lo que haya escrito la persona y se puede repetir las veces que haga falta.

Mira solo, con git, de quién es el historial de esa carpeta. Si no lo creó la barra, no apaga nada
de lo que decide su equipo (las marcas que RSC apunta en su `.rsc.json`), y si git no se puede usar la
trata como de alguien (decisión 161).

---

## 🤖 Para agentes: instrucciones ejecutables

Si eres un agente (Claude Code, Codex, Cursor…) y te han pedido instalar Executive Lab en la máquina
de alguien, esto es el procedimiento completo. Sigue el orden.

### Antes de empezar

**Pregunta y espera respuesta. No asumas.** Las respuestas del paso 3 son de esa persona, no tuyas:
condicionan cómo se comporta su arnés durante meses.

Comprueba las condiciones previas:

```bash
code --version          # debe existir y ser >= 1.98.0
git --version           # hace falta; si no está, el panel lo instala con un botón
```

⚠️ **En macOS no ejecutes `git --version` para comprobarlo** si puede no estar instalado:
`/usr/bin/git` existe siempre y es un señuelo que abre el diálogo de Apple. Usa `xcode-select -p`,
que responde sin abrir nada.

Si `code` no está en el `PATH` pero VS Code sí está instalado: en VS Code,
`Ctrl+Shift+P` → *Shell Command: Install 'code' command in PATH*.

Si **no hay VS Code**, no sigas por aquí: instálalo desde <https://code.visualstudio.com> (instalador
oficial y firmado) y vuelve a este paso.

También hace falta que esa persona tenga **Claude Code o Codex con una cuenta de pago**. Si no la
tiene, díselo ahora: sin ella, el panel se instala pero no hay agente detrás y se queda parado en la
pantalla de inicio de sesión.

### Paso 1 — instalar la extensión

```bash
# Descarga el .vsix de la última release
gh release download --repo Executive-Lab/executive-vscode-interfaz \
  --pattern '*.vsix' --dir /tmp --clobber

# Instálalo
code --install-extension /tmp/executive-lab-*.vsix --force
```

Sin `gh`:

```bash
curl -fL -o /tmp/executive-lab.vsix \
  "$(curl -fsSL https://api.github.com/repos/Executive-Lab/executive-vscode-interfaz/releases/latest \
     | grep -o 'https://[^"]*\.vsix')"
code --install-extension /tmp/executive-lab.vsix --force
```

### Paso 2 — comprobar que quedó puesta

```bash
code --list-extensions | grep executivelab.arnes-ui   # debe imprimir: executivelab.arnes-ui
```

Si no imprime nada, la instalación falló: mira la salida del paso 1 y **no sigas**.

### Paso 3 — el arnés, con las respuestas de esa persona

**Lo normal: no lo montes tú.** Dile que abra en VS Code la carpeta con la que quiere trabajar y que
pulse **Preparar esta carpeta** en la barra de la izquierda. El asistente de la extensión le hace unas
preguntas en lenguaje llano, de una en una, y monta el arnés con sus respuestas. Es el camino probado.

Solo si te pide expresamente que lo hagas tú, pregúntale lo que RSC necesita —una cosa cada vez, sin
sugerir la respuesta—: qué tal se maneja, de qué va la carpeta, qué quiere conseguir, con qué asistente trabaja y, si va a construir algo (`software` o `mixed`), de qué
tamaño. Luego:

```bash
cd "<su carpeta de trabajo>"

npx @ericrisco/rsc@3.0.22 onboard \
  --technical-level <non-technical|mixed|technical> \
  --project-kind <software|operations|research|content|mixed> \
  --goal "<lo que quiera conseguir, en sus palabras>" \
  --software-scope <small|growing|complex> --workflow main \
  --target <claude|codex>
```

El tamaño y `--workflow main` solo los usa RSC con `software` y `mixed`, y con esos dos son
obligatorios; con los demás tipos no cambian nada. `main`, porque así se dijo en clase: sin decírselo,
con un tamaño `complex` RSC cierra la rama principal al asistente. Ese comando **imprime un plan y una huella, y no monta nada todavía**. Enséñale el plan. Solo cuando
lo acepte, repite el mismo comando con los mismos flags y añade la huella **tal cual la imprimió**:

```bash
npx @ericrisco/rsc@3.0.22 onboard ...los mismos flags... --accept-plan <huella>
```

Y deja la carpeta como la deja la barra (decisión 145): la rama principal abierta, y nada que salga
del ordenador sin preguntar.

```bash
npx @ericrisco/rsc@3.0.22 main unlock
npx @ericrisco/rsc@3.0.22 knowledge-sync off
npx @ericrisco/rsc@3.0.22 git-permissions off
```

Por último, los raíles de Executive Lab (idioma y vocabulario), que viajan dentro de la extensión:

```bash
node ~/.vscode/extensions/executivelab.arnes-ui-*/media/railes/aplicar.js "<su carpeta>"
```

Mira solo, con git, de quién es el historial de esa carpeta. Si no lo creó la barra, no apaga nada
de lo que decide su equipo (las marcas que RSC apunta en su `.rsc.json`), y si git no se puede usar la
trata como de alguien (decisión 161).

### Paso 4 — verificar

```bash
cd "<su carpeta de trabajo>"
ls .rsc.json 01-TOOLS 02-DOCS .claude/settings.json   # los cuatro deben existir
ls .claude/skills/executive-lab/SKILL.md              # los raíles
```

### Lo que NO debes hacer

- **No enciendas la vista sencilla por tu cuenta.** Es un ajuste **por carpeta**
  (`executiveLab.vistaSencilla`) que reconfigura todo el editor. Lo decide esa persona, desde el
  botón de la barra o cuando el asistente se lo pregunte al terminar. Su editor es suyo.
- **No uses `@latest` para RSC.** La barra trae la **3.0.22**, de la serie de la clase (decisión 145).
  Subir de versión es una decisión que se toma, se contrasta y se escribe, nunca un efecto
  secundario de un `npm install`. Una carpeta que va por delante se trabaja con su versión, no se baja.
- **No inventes las respuestas del onboarding.** Definen el tono, el idioma y las palabras con que el
  asistente le habla a esa persona durante meses.
- **No toques sus ajustes de usuario de VS Code.** La extensión escribe en `.vscode/settings.json`
  de la carpeta, precisamente para no alterar las demás ventanas.

### Si algo va mal

| Síntoma | Qué es | Qué hacer |
|---|---|---|
| `code: command not found` | El comando no está en el `PATH` | *Shell Command: Install 'code' command in PATH* desde VS Code |
| La barra lateral no aparece | La extensión no arrancó | Reinicia VS Code; comprueba el paso 2 |
| «Preparar esta carpeta» falla a mitad | El arnés quedó a medias | Vuelve a pulsar: termina lo que se quedó a medias. No borres `.rsc.json`, que es lo que dice cómo está montado. Si sigue, «Algo va mal»: deja un informe con un código para el tutor, y lo que fue pasando está en el panel de salida «Executive Lab» |
| Dice que falta una pieza | No hay `git` en el sistema | Pulsa el botón: lo instala. O instálalo tú |
| El panel no responde | Falta iniciar sesión en Claude Code o Codex | Que inicie sesión en la extensión del asistente |

Dentro del panel hay un botón **Algo va mal** que revisa, arregla lo que puede y da un código de seis
letras para el tutor.

Y en Ayuda, **Contárselo a Executive Lab** abre una incidencia en este repositorio con la cuenta de GitHub
del alumno: un fallo, algo que no se entiende o una mejora. El asistente del alumno también las deja
preparadas, y la barra cuando un botón le falla por dentro, pero ninguna sale sin que el alumno la vea y
pulse «Mandarlo». Llegan con las etiquetas `aviso de alumno` y `por revisar` (decisión 131).

---

## Qué lleva cada forma de distribución

Las tres no son equivalentes. Esto es lo que hay **hoy**:

Las tres llevan lo mismo, porque el arnés viaja en un solo sitio: dentro del `.vsix`.

| | `.vsix` (extensión) | `.dmg` (macOS) | `.exe` (Windows) |
|---|---|---|---|
| Versión del panel | la de la release | la misma, dentro | la misma, dentro |
| Tamaño | 6 MB | **6,8 MB** | **29 MB** |
| Arnés RSC 3.0.22 | ✅ dentro del paquete | ✅ (dentro del `.vsix`) | ✅ (dentro del `.vsix`) |
| Raíles | ✅ `media/railes/` | ✅ (dentro del `.vsix`) | ✅ (dentro del `.vsix`) |
| Módulos compartidos | ✅ `media/comun/` | ✅ | ✅ |
| Disfraz (`disfraz.json`) | ✅ | ✅ | ✅ |
| git | ✅ obligatorio; lo instala el panel | ✅ lo instala el de Apple | ✅ lo instala el oficial de Git |
| Node | El que trae VS Code | Se descarga al instalar | `runtime/` dentro |
| Instala VS Code | ❌ | ✅ (lo descarga) | ✅ (lo lleva dentro) |
| Monta el arnés | El panel | El panel | El panel |
| Firmado | No hace falta | ❌ pendiente | ❌ pendiente |

Las tres se ponen al día igual, porque las tres acaban siendo el mismo `.vsix` instalado en el editor.
Cuando hay una release más nueva, la barra lo dice arriba y **Actualizar ahora** la baja de GitHub,
comprueba que es la de esa release y que llegó entera (tamaño y `sha256`), y se la da al editor. Nada se
instala sin ese clic (decisión 132).

---

## Cómo está hecho

| Carpeta | Qué es |
|---|---|
| [extension/](extension/) | La barra lateral: brújula, conexiones, wiki, marca y los botones que el arnés tenga |
| [instalador/](instalador/) | El doble clic: Node, VS Code, extensiones, perfil, RSC y la carpeta de trabajo |
| [skills/](skills/) | Los raíles conversacionales sobre RSC — configuración, no código |
| [perfil/](perfil/) | El disfraz como `.code-profile`, para probarlo a mano |
| [docs/](docs/) | Decisiones, auditoría, fricción y el diccionario |

[docs/diccionario.md](docs/diccionario.md) gobierna **todos** los textos: nada aparece en pantalla si
no está ahí, y hay un comprobador que lo verifica.

### Por qué no hay un cliente propio

Se evaluó y se descartó, con pruebas, por dos razones:

- **Facturación.** `claude -p` (no interactivo) y las apps de terceros que se autentican con la
  suscripción del usuario a través del Agent SDK consumen un crédito mensual aparte. Claude Code
  interactivo en terminal o IDE, no.
- **Términos.** *«Unless previously approved, Anthropic does not allow third party developers to
  offer claude.ai login or rate limits for their products.»*

Y el remate: la extensión `anthropic.claude-code` **ya es** una interfaz gráfica nativa sobre Claude
Code, gratis y mantenida por Anthropic, con *Focus view* — que esconde llamadas a herramientas,
resultados y razonamiento. La vista para no técnicos, ya construida.

Todas las decisiones, con lo que se descartó y por qué, están en
[docs/decisiones.md](docs/decisiones.md).

---

## Trabajar en esto

```bash
git clone git@github.com:Executive-Lab/executive-vscode-interfaz.git
cd executive-vscode-interfaz

# El arnés que viaja dentro de la extensión NO está versionado. Antes de empaquetar:
npm install --prefix extension/media/harness @ericrisco/rsc@3.0.22
```

### Probarlo

```bash
cd extension && npm run probar          # 80 comprobaciones, con un vscode y un navegador de mentira
node extension/prueba/humo.js --con-arnes   # + monta un arnés de verdad (tarda minutos)
node docs/comprobar-diccionario.js      # ningún texto de pantalla usa palabra prohibida
node herramientas/revisar-powershell.js # los .ps1, antes de llevarlos a Windows
cd instalador/mac && ./probar.sh --casa /tmp/casa-falsa   # 14 comprobaciones, sin tocar tu Mac
```

### Verlo funcionando

```bash
./demo.sh --con-datos
```

Abre un VS Code **aislado** —sus propios ajustes y extensiones, dentro de `.demo/`, sin tocar los
tuyos— con la extensión de Claude y la nuestra instaladas de verdad, sobre una empresa de mentira ya
preparada con el arnés. Es lo que ve alguien tras el instalador, disfraz incluido. La primera vez
tarda un par de minutos. `rm -rf .demo` para empezar de cero.

### Empaquetar y publicar

```bash
cd extension && npm run empaquetar   # valida el manifiesto y genera el .vsix
./publicar.sh                        # todas las comprobaciones + .vsix + notas, en publicacion/
./publicar-tiendas.sh                # dice qué falta para publicar en Marketplace y Open VSX
./publicar.sh --rapido               # sin montar un arnés de verdad (minutos menos)
```

`publicar.sh` no publica nada: deja los ficheros listos y dice qué hacer con cada uno. Y corre las
comprobaciones **con un arnés de verdad**, que tarda minutos: es lo que habría pillado tres semanas
antes que la prueba del wizard estaba rota (auditoría, F26).

Para los instaladores de escritorio hay que montar antes la carpeta `carga/` con los binarios de
terceros, que no se versionan. Está explicado en [instalador/README.md](instalador/README.md).

---

## Estado

**Prototipo usable.** Auditado el 17 de septiembre de 2026.

**Probado de verdad:**

- El arnés montado desde cero en una carpeta vacía **con solo el Node que lleva VS Code** y la copia
  de RSC que viaja en la extensión: `RSC_ONBOARDING_READY` con el suelo completo.
- El instalador de Windows **ejecutado en una máquina real**: instaló, montó el arnés y se trabajó
  con ello. De esa tarde salieron doce fallos que ninguna prueba automática habría visto.
- 79 comprobaciones con un `vscode` de mentira y una empresa con la forma que deja RSC, más el
  asistente completo con `--con-arnes`.

**Lo que sigue sin probarse:** la extensión instalada desde el `.vsix` en una máquina limpia, el
`.dmg` y el `.exe` nuevos —construidos pero nunca ejecutados—, si los instaladores de git piden
administrador (decisión 26) y una sesión con alguien real de principio a fin.

Dónde queda fricción, ordenada por cuánta gente pierde cada punto:
[docs/friccion.md](docs/friccion.md). Los hallazgos de la auditoría, qué se corrigió y qué queda:
[docs/auditoria.md](docs/auditoria.md).

---

## Este repo también lleva el arnés

Está equipado con RSC en modo desarrollador. Se versionan `.rsc.json`, `.claude/settings.json`,
`.claude/rsc-bootstrap.mjs` y lo nuestro de `.claude/` (la habilidad de la casa, sus comandos y sus
agentes); lo que monta RSC está en `.gitignore`. Lo que el equipo apagó (el formato de gitmoji, entre
otros) viaja en `.rsc.json`, y RSC lo vuelve a poner al montarlo en otra máquina. Para retomarlo:

```bash
npx @ericrisco/rsc@3.0.22 sync
```

> La versión va fijada exacta a propósito, y está escrita en varios sitios —el paquete de la barra,
> `.rsc.json`, `rsc.js`, `preparar-paquete.js` y la copia fijada del freno— que una prueba obliga a
> decir lo mismo. Se subió de la 1.4.1 a la 2.0.5 el 21 de septiembre de 2026, después de leer las
> dos enteras: las tres tablas de `targets/` que copiamos estaban idénticas byte a byte y ningún
> marcador que la barra lee había cambiado. Lo que sí cambió está en la decisión 91. Y de la 2.0.5 a la
> 2.0.15 el 28 de septiembre, con las habilidades idénticas byte a byte: por qué, y lo que cambió, en la
> decisión 127. Y de la 2.0.15 a la 3.0.22 el 14 de octubre, porque la clase ya iba en la 3: P7 pasó a
> ser «la serie de la clase», y lo que cambió está en la decisión 145.

---

## Licencia

[MIT](LICENSE), de Executive Lab: se puede usar, copiar, cambiar y repartir, también para vender, siempre
que vaya con el aviso de la licencia.

El arnés que viaja dentro es [RSC](https://www.npmjs.com/package/@ericrisco/rsc), de Eric Risco, también
MIT. La copia de su freno que llevan los raíles va con su aviso (`skills/executive-lab/LICENCIA-RSC.txt`).
