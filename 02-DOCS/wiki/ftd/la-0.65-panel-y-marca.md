---
type: ftd
title: La 0.65, segunda parte — la marca que se pone, GitHub que no corta, y Codex en su panel
date: 2026-11-25
author: Jose Sanchis
branch: la-0.65-panel-y-marca
status: in-progress
---

# La 0.65, segunda parte — la marca que se pone, GitHub que no corta, y Codex en su panel

## Intent

Jose, 25-11-2026, con la 0.65.0 fusionada (PR #116) y sin publicar, probándola en una ventana de prueba:

1. *«Creo que lo de la marca no se aplica. Digo que es [la empresa] y [su web, con una letra de menos] y no se pone.»*
2. *«Tengo ya el github conectado y aun así me dice esto»* (el aviso «Te queda una cosa: una cuenta de GitHub…»).
3. *«Lo de codex nueva ventana no me refiero a que despliegues terminal, sino esto de codex new agent que permite dos
   ventanas en vscode.»* Eligió probar «el panel con el encargo ya hecho».

Lo que se vio al mirarlo:

- La pregunta de GitHub salía antes de la marca y del primer mensaje, y el montaje la esperaba: sin contestarla, ni
  marca ni primer mensaje.
- `taleresbonet.com` no se abre, y la barra no decía nada.
- El nombre se tomaba de la parte más larga del título: el lema, no «Talleres Bonet».
- El icono para móvil, que ya trae su fondo, salía encima de una placa blanca.
- El panel de Codex no deja que nadie le escriba, pero abre una conversación ya empezada por su número, y su programa
  sin pantalla empieza una y da ese número (decisión 207).

## Scope

**Dentro**

- La pregunta de GitHub, al final del montaje.
- La web que no se abre, dicha, con su botón.
- El nombre de la marca por el dominio; el icono para móvil sin placa.
- Codex: el encargo por detrás y la conversación en su panel; la pestaña de la 206 de repuesto.
- Pruebas, diccionario, decisión 207. La versión sigue en 0.65.0, sin publicar.

**Fuera**

- Por qué el editor no ve la sesión de GitHub de Jose: hasta que Jose mire «Guardar una copia fuera», no se toca
  `github.js`.
- Publicar la 0.65.0: con el sí de Jose.
- Contestar la revisión de enganches del Codex de Jose: es su configuración.

## Checklist

- [x] 1. La pregunta de GitHub, después de la marca y del primer mensaje.
- [x] 2. Una web que no se abre se dice, con «Escribir la web otra vez».
- [x] 3. El nombre de la marca es la parte del título que dice el dominio.
- [x] 4. El icono para móvil va sin placa.
- [x] 5. Con Codex en el editor, el encargo empieza por detrás y su conversación se abre en su panel, una por encargo.
- [x] 6. Sin número, o sin Codex en el editor, la pestaña de la 206.
- [x] 7. Diccionario y decisión 207.
- [x] 8. Batería entera, `--con-arnes`, mapeos y VS Code de verdad, sobre el código final.
- [ ] 9. Jose lo prueba en la ventana de prueba: la marca, y si el panel de Codex va enseñando lo que hace.
- [ ] 10. PR abierta, con GitHub en verde.

## Evidence

- **1.** En «al terminar de preparar la carpeta, la principal…», el orden marca → primer mensaje → GitHub. La
  primera pasada entera dio un fallo: «al montar, las copias solas se dicen…» pide que el aviso acabe en «Dale a
  enviar», y con la pregunta movida acababa en «Cuando quieras preparar la cuenta de GitHub…». Ahora lo que hay que
  hacer se dice lo último (`mandarElPrimero(…, { sinDecirlo: true })`), y la prueba pasa.
- **2.** «207: una web que no se abre se dice…»: el aviso exacto y su botón. Y al montar, en «al montar, las copias
  solas se dicen…»: va en el aviso del final, con «Escribir la web otra vez» junto a «Quitar las copias solas», y lo
  mismo «Ya lleva la cara de…». Se vio fallar antes del arreglo («el aviso del final tapa lo de la web»), y enseñó
  que con web el aviso del final perdía también «Guardo una copia sola…».
- **3 y 4.** «207: el nombre de la marca es la parte del título que dice el dominio…»: «Talleres Bonet», no su lema; el
  icono para móvil, sin placa; `logo_es_icono: logo.png`, y otro logotipo puesto después lleva su placa (se vio
  fallar con el «si» de antes: «no apunta qué fichero es el icono»).
- **5.** Con el Codex de Jose (su sí del 25-11): `codex exec --json` da `thread.started` con el número, y su panel
  abre esa conversación con el texto del encargo («ahora ha funcionado el texto!»). En `humo.js`, «207: con Codex…»:
  la orden, la carpeta, un panel por encargo, sin terminal ni portapapeles.
- **6.** En la misma prueba: sin número, la pestaña con `--no-daemon`; sin Codex en el editor, la pestaña con el del
  ordenador y nada por detrás. Esta última se vio fallar antes del cambio («sin su panel, lo arranca por detrás y no
  se ve», 4 !== 3) y pasar después. En el VS Code de verdad (1.148.0, en el Mac), antes de ese último cambio: «todo
  bien», con la prueba de Codex en sus dos caminos.
- **7.** `comprobar-diccionario.js`: 27 palabras, 94 ficheros, 806 rótulos, todo bien (también después de la última
  edición del diccionario).
- **8.** Sobre el código final, en una sola pasada después del último cambio de código (la de antes de la revisión ya
  no vale): `humo.js` 602 de 602, `contrato.js` 15 de 15, las tres empresas y la recién montada, `mapeos-codex.js` 31
  de 31, `humo.js --con-arnes` 612 de 612, el diccionario y `revisar-powershell.js` (5 ficheros, sin pegas) y, en un
  VS Code de verdad (1.148.0, en el Mac), «todo bien», con la prueba de Codex en sus tres caminos (con número, sin
  número, sin su panel). Es la batería de `02-DOCS/wiki/sdd/config.yaml` entera, más la manual.
- **No se corrió aquí.** `windows.js`, el `.exe` y el `.dmg`: los corre GitHub en la PR. El panel de Codex con un
  encargo lanzado por la barra: lo verá Jose.
- **Revisión.** `rsc risk --base origin/main`: nivel 1, un revisor. Hecha en línea, fichero por fichero, sin
  revisores en segundo plano. Dejó los dos arreglos de arriba (el icono atado a su fichero, y lo de la web en el aviso
  del final del montaje). Sin arreglar, por menor: si dos partes del título contienen el dominio, gana la primera,
  no la que coincide entera.
- **Privacidad.** El repositorio es público. La empresa que escribió Jose al probar se cambió, antes de subir nada,
  por una inventada («Talleres Bonet», `talleresbonet.com`, y `taleresbonet.com` con la letra de menos).
  `git grep -i` de los dos nombres: había coincidencias antes del cambio, y después ninguna (salida 1). Después del
  cambio, `humo.js` 602 de 602 y el diccionario, bien.
- **Cómo se deshace.** `git revert` del commit de la fusión. Nada nuevo se guarda, salvo `logo_es_icono` en
  `marca.md`, que una barra anterior ignora.

## Next

- Jose: probarlo en la ventana de prueba, mirar «Guardar una copia fuera» y decir si el panel de Codex se movía.
- Si el panel no se mueve mientras trabaja, abrirlo al acabar, no al empezar.
- PR, y con el sí de Jose, fusionar y publicar la 0.65.0.
