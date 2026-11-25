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

1. *«Creo que lo de la marca no se aplica. Digo que es stratton apps y stratonapps.com y no se pone.»*
2. *«Tengo ya el github conectado y aun así me dice esto»* (el aviso «Te queda una cosa: una cuenta de GitHub…»).
3. *«Lo de codex nueva ventana no me refiero a que despliegues terminal, sino esto de codex new agent que permite dos
   ventanas en vscode.»* Eligió probar «el panel con el encargo ya hecho».

Lo que se vio al mirarlo:

- La pregunta de GitHub salía antes de la marca y del primer mensaje, y el montaje la esperaba: sin contestarla, ni
  marca ni primer mensaje.
- `stratonapps.com` no se abre, y la barra no decía nada.
- El nombre se tomaba de la parte más larga del título: el lema, no «Stratton Apps».
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
- [ ] 8. Batería entera, `--con-arnes`, mapeos y VS Code de verdad, sobre el código final.
- [ ] 9. Jose lo prueba en la ventana de prueba: la marca, y si el panel de Codex va enseñando lo que hace.
- [ ] 10. PR abierta, con GitHub en verde.

## Evidence

- **1.** En «al terminar de preparar la carpeta, la principal…», el orden marca → primer mensaje → GitHub.
- **2.** «207: una web que no se abre se dice…»: el aviso exacto y su botón.
- **3 y 4.** «207: el nombre de la marca es la parte del título que dice el dominio…»: «Stratton Apps», no su lema; el
  icono para móvil, sin placa.
- **5.** Con el Codex de Jose (su sí del 25-11): `codex exec --json` da `thread.started` con el número, y su panel
  abre esa conversación con el texto del encargo («ahora ha funcionado el texto!»). En `humo.js`, «207: con Codex…»:
  la orden, la carpeta, un panel por encargo, sin terminal ni portapapeles.
- **6.** En la misma prueba: sin número, la pestaña con `--no-daemon`; sin Codex en el editor, la pestaña con el del
  ordenador y nada por detrás. Esta última se vio fallar antes del cambio («sin su panel, lo arranca por detrás y no
  se ve», 4 !== 3) y pasar después. En el VS Code de verdad (1.148.0, en el Mac), antes de ese último cambio: «todo
  bien», con la prueba de Codex en sus dos caminos.
- **7.** `comprobar-diccionario.js`: 27 palabras, 94 ficheros, 806 rótulos, todo bien.

## Next

- Pasar la batería entera y el VS Code de verdad sobre el código final.
- Jose: probarlo en la ventana de prueba, mirar «Guardar una copia fuera» y decir si el panel de Codex se movía.
- Si el panel no se mueve mientras trabaja, abrirlo al acabar, no al empezar.
- PR, y con el sí de Jose, fusionar y publicar la 0.65.0.
