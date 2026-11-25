---
type: ftd
title: La 0.65, RSC 4.2.0, el freno que se dice como es, y Codex que trabaja él
date: 2026-11-25
author: Jose Sanchis
branch: la-0.65
status: in-progress
---

# La 0.65, RSC 4.2.0, el freno que se dice como es, y Codex que trabaja él

## Intent

Jose, 25-11-2026, tras publicar la 0.64.0: *«sigue dándole a la barra. Qué queda pendiente? está actualizada a la
ultima versión de rsc?»*

No lo estaba. La barra lleva RSC 4.1.9, y el 24 y el 25 de noviembre salieron la 4.1.10, la 4.1.11 y la 4.2.0. Una
carpeta que se pone sola en una versión más nueva que la de la barra va por delante, y entonces «Añadir», «Arreglar» y
«Poner al día» dejan de actuar en ella (decisión 201). El vigía no avisó: pasa los lunes, y el último fue el 23.

Lo que se vio al comparar la 4.1.9 con la 4.2.0, y al repasar lo que quedaba pendiente:

1. **Las órdenes de RSC no cambian.** Mismas 273 habilidades y 53 atajos. Cambian los textos de unas 145
   habilidades, los modelos que se ponen a los agentes de Cursor y Copilot, el texto de cuatro atajos y el freno.
2. **El freno de RSC frena también PowerShell.** En Windows, Claude corre órdenes con PowerShell, y un
   `Remove-Item -Recurse -Force` no pasaba por ningún freno, ni el de RSC ni el de la barra.
3. **La barra dice que el freno no actúa con quien es técnico, y no es verdad.** Desde la serie 3 (la 3.0.22 ya lo hace), el freno de
   RSC no le bloquea nada a un técnico, pero le pide confirmación antes de lo que no tiene vuelta atrás: forzar una
   subida, `reset --hard`, borrar el proyecto, la carpeta personal o la raíz, formatear un disco. La barra dice
   «Contigo no actúa», le dice al asistente que no hay freno y no ofrece ponerlo.
4. **La 0.64 sigue «pendiente» en sus documentos.** La decisión 204 y su FTD.
5. **El nombre de un cliente** sale en decisiones y comentarios del repositorio, que es público.
6. **La copia de las reglas del asistente de `.claude/skills/executive-lab/`** se ha quedado atrás de las otras dos.
7. **Tres specs dicen `approved` y están hechas hace tiempo.**

Y con la 0.65 en marcha, tres peticiones más de Jose (decisión 206):

8. *«Quiero que aquí en estos onboarding puedas meter tu propia respuesta personalizada, que puedas escribir y puedas
   decirle tú tus cosas.»*
9. *«Quiero también que se puedan añadir los dos agentes. Tanto Claude como Codex en el onboarding. Quiero que revises
   cómo se abre una sesión nueva, que se puedan abrir en paralelo. En Codex, por ejemplo, hacer el truco del new agent
   para que puedas abrir al menos 2 versiones en paralelo.»*
10. *«Quiero que en codex también lo puedas ejecutar tú y abrirlo tú, no que copies un mensaje en el portapapeles.»*
    Su barra no deja escribirle desde fuera, y su enlace tira el texto (probado: Codex abierto, la caja vacía). Pero
    su extensión trae su propio programa, que acepta un encargo al arrancar.

## Scope

**Dentro**

- RSC 4.2.0 en la barra: el paquete, sus sitios, la copia del freno (`freno-rsc-4.2.0.mjs`) y `.rsc.json` con el
  `sync` de la propia barra.
- El freno de la barra, enganchado a Bash y a PowerShell, como el de RSC.
- El freno con un perfil técnico: «puesto, y pregunta antes de lo que no tiene vuelta atrás», en «Las reglas», en el
  primer mensaje y en lo que falta por poner.
- Cierre de la 204. El nombre del cliente fuera. La copia vieja de las reglas, al día. El estado de las tres specs.
- Con tus palabras: la última opción de cada pregunta del montaje, y lo escrito, entero al asistente.
- Claude y Codex al montar: con uno puesto, con los dos y sin ninguno.
- Con Codex, el encargo lo empieza su programa en una pestaña del editor, una por encargo; sin programa, el portapapeles.
- «Conversación nueva»: «New Codex Agent» primero; con los dos, se elige con cuál.
- Un encargo de verdad en el Codex de Jose, con su sí (25-11), y arreglar lo que salga.
- Pruebas, decisiones 205 y 206, versión 0.65.0.

**Fuera**

- Las carpetas de trabajo viejas de la barra: Jose dijo que no se tocan.
- Publicar la 0.65.0: con el sí de Jose.
- Contestar la revisión de enganches que pide el Codex de Jose: es su configuración.
- El historial de git: el nombre del cliente sigue en los commits viejos. Reescribirlo rompería todas las copias.

## Checklist

- [x] 1. RSC 4.2.0 en el paquete y en todos sus sitios; la copia del freno, la de la 4.2.0 byte a byte.
- [x] 2. El freno de la barra, enganchado a Bash y a PowerShell; una carpeta con el enganche de antes se pone al día.
- [x] 3. Con un perfil técnico, el freno sale puesto y diciendo cómo actúa; el primer mensaje lo dice; se ofrece si falta.
- [x] 4. Cierre de la 204.
- [x] 5. Ningún nombre de cliente en el texto del repositorio.
- [x] 6. La copia de las reglas de `.claude/skills/executive-lab/`, igual que la de `skills/`.
- [x] 7. Las tres specs, con su estado de verdad.
- [x] 8. Diccionario, decisiones 205 y 206, versión 0.65.0.
- [x] 9. Batería entera, contrato, empresas, `--con-arnes`, mapeos, PowerShell y VS Code de verdad.
- [ ] 10. PR abierta, con GitHub en verde.
- [x] 11. Con tus palabras, en cada pregunta del montaje, hasta el asistente.
- [x] 12. Claude y Codex al montar, con uno, con los dos y sin ninguno.
- [x] 13. Con Codex, el encargo lo empieza él en su pestaña; uno por encargo; sin programa, como antes.
- [x] 14. «Conversación nueva» de Codex en un panel nuevo cada vez; con los dos, se elige.
- [x] 15. Un encargo de verdad en el Codex de Jose; el programa de su extensión arranca con `--no-daemon`.

## Evidence

- **1.** El paquete en `4.2.0` (`require(...).version` del instalado: 4.2.0). `cmp` del `danger-guard.mjs` de la 4.2.0 con
  las tres copias `freno-rsc-4.2.0.mjs`: iguales. La única «4.1.9» que queda en el README es la del historial, que ahora
  sigue hasta la 4.2.0. `.rsc.json` con el `sync` de la propia barra.
- **2.** «205: el freno de la barra se engancha a Bash y a PowerShell…»: `Remove-Item -Recurse -Force` denegado,
  `Get-ChildItem` no, y el enganche de antes, al día y uno solo.
- **3.** «205: con un perfil técnico, el freno pregunta…», con el freno de verdad: tres preguntadas, dos en silencio. «Las
  reglas», el freno que se ofrece y el primer mensaje (`hayFreno` mira `armado`).
- **4.** Decisión 204: «hecho, publicado en la 0.64.0». `la-0.64.md`: `done`, con la release del 25-11 a las 13:19 UTC.
- **5.** `git grep -nia` con el nombre del cliente: nada (salida 1), y nada en los ficheros nuevos. En 15 ficheros,
  «Asesoría Norte». Ojo: el commit `4015f53` lo nombraba aquí mismo, en esta prueba, y la «salida 1» era falsa en él;
  se vio al releer y se quitó en el commit siguiente. Si la PR se fusiona en un solo commit, como las anteriores, no
  llega a `main`.
- **6.** `diff -r skills/executive-lab .claude/skills/executive-lab`: iguales.
- **7.** Las tres, `shipped`, con su versión (0.27.0, 0.41.0 y 0.61.0, por `git tag --contains`).
- **8.** `comprobar-diccionario.js`: 27 palabras, 94 ficheros, 806 rótulos, todo bien. Decisiones 205 y 206. 0.65.0 en
  `package.json` y en el instalador de Windows.
- **9.** Sobre el código final: `humo.js` 599 de 599, `humo.js --con-arnes` 609 de 609, `contrato.js` 15 de 15, las tres
  empresas y la recién montada, `mapeos-codex.js` 31 de 31, PowerShell sin pegas y, en un VS Code de verdad (1.148.0,
  en el Mac), 10 de 10. La primera pasada de `humo.js` dio 7 fallos: cuatro pruebas que contestaban el montaje sin la
  pregunta nueva (y `ponerGit`, que arrancaba después de ella), una versión de ejemplo que ahora es la de la barra, y
  dos por `media/comun` sin preparar en este worktree. Arreglados y vistos en verde.
- **11.** «206: en cada pregunta del montaje se puede contestar con tus palabras…».
- **12.** «206: al montar se puede elegir trabajar con los dos…»: con uno, con los dos, sin ninguno, sin contestar. Que RSC acepta
  `--target claude,codex` ya lo probaba `contrato.js` (decisión 158), y pasa.
- **13.** «206: con Codex, el encargo lo empieza él…», «206: el programa de Codex se busca…», «206: cuando Codex ya está
  con ello…» y, en el VS Code de verdad, la pestaña en el editor y el encargo intacto. Se vio fallar sin el `--` («el
  encargo no le llega tal cual») y con la pestaña abajo («la pestaña no va en el editor»), y `puente.js` volvió a estar
  igual byte a byte.
- **14.** «206: una conversación nueva de Codex va en su propia pestaña…», y `mapeos-codex.js` con el orden nuevo.
- **Riesgo.** `rsc risk --base origin/main`: nivel 2, por los ficheros del arnés (`.claude/`), como la 0.63 y la 0.64.
  Revisión en línea, fichero por fichero, sin revisores en segundo plano. La PR la fusiona Jose.
- **15.** Con el sí de Jose, su Codex (0.171.0-alpha.13.2, el de su extensión) en una terminal propia como la de la
  pestaña, con un encargo inofensivo en una carpeta de pruebas. Como lo abría la barra (`-- encargo`): la caja y, al
  momento, «this CLI has no complete local package… rerun the same command with --no-daemon». Con `--no-daemon`:
  arranca y pide revisar los enganches de Jose (no se contestó). Con `--no-daemon` y `--disable hooks`, solo en esa
  ejecución: `hola.txt` con «hola» en 7 segundos, y «Hecho.». El `config.toml` de Jose, con la misma fecha antes y
  después. Luego las pruebas: «206: con Codex…» y «206: el programa de Codex se busca…» en `humo.js` y la del encargo
  largo en `mapeos-codex.js` piden `--no-daemon` en el de su extensión y nada en el del ordenador; se vieron fallar
  («se cae al arrancar», «arranqueDeCodex is not a function», «expected: '--no-daemon'») y, con el código, en verde.
  Las cifras del 9 son de una pasada entera después de este cambio, VS Code de verdad incluido.
- **No se corrió aquí.** `windows.js`, el `.exe` y el `.dmg`: los corre GitHub en la PR. La pestaña con el Codex de
  verdad dentro del editor, y si el encargo sigue solo después de contestar la revisión de enganches: lo verá Jose.
- **10.** PR #116. Con `4015f53`, GitHub en verde: `windows`, `el-exe`, `el-dmg` y `vscode-de-verdad`. Con el arreglo
  del 15, en marcha.
- **Cómo se deshace.** `git revert` del commit de la fusión. Lo guardado de más (`conSusPalabras` en las respuestas)
  lo ignora una barra anterior.

## Next

- Jose: fusionar la PR y publicar la 0.65.0.
- Jose: decidir si la barra avisa antes de que, la primera vez, Codex pide en la pestaña (en inglés) confiar en los
  enganches, o si «Dejarlo listo en Codex» (decisión 178) pasa a abrir esa pestaña.
