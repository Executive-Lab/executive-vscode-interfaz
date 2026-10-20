---
type: ftd
title: La foto del cerebro, en grande y para moverse por ella
date: 2026-10-20
author: Jose Sanchis
branch: la-foto-en-grande
status: en curso
---

# La foto del cerebro, en grande y para moverse por ella

## Intent

Jose, con una captura de la foto de su monorepo (423 conceptos, 300 en la foto): *«quiero que el mapa del cerebro sea
interactivo o algo. Que puedas abrirlo en grande, que puedas moverte, no sé, que sea un poco mejor»*, y *«que se vea
bien todo»*. Decisión 197. Cambia lo que la 151 dejó para después: «no se acerca ni se arrastra», «no colorea por tema»
y «la versión grande es la foto guardada».

## Scope

- **Que se vea**: la disposición de los puntos, que con una wiki de verdad salía en una mancha (los grupos sueltos en
  los bordes y el grande encogido, con los puntos unos encima de otros).
- **Moverse**: arrastrar para moverse, acercar y alejar (botones, pellizco, y la rueda en grande), volver a verla entera.
- **Al pasar por un punto**: se encienden él, los suyos y sus líneas, con sus nombres.
- **Los nombres**, con la letra de la barra, más cuanto más se acerca.
- **Color por grupo**: los tres grupos con más puntos, el resto en gris, con su leyenda. También en la foto guardada.
- **Verla en grande**: en una pestaña del editor, con lo mismo; un punto abre su concepto en la barra.
- Fuera: arrastrar un punto suelto, buscar dentro de la foto, guardar la foto desde la grande, recordar la pestaña al
  volver a abrir el editor.

## Checklist

- [x] `foto.js`: disposición nueva, sin azar, sin pisarse y sin mandar lo suelto a las esquinas · prueba nueva «no sale en
      una mancha», que con el `foto.js` de antes falla; la de la disposición y la de 700 conceptos, en verde
- [x] `foto.js`: el grupo de cada punto y los tres con color · prueba nueva de los grupos
- [x] `panel.js`: arrastrar, acercar, alejar, verla entera, sin perder la vista al repintarse · prueba nueva «moverse por
      la foto» con una foto de mentira que se mide, y visto en Chrome con la wiki real
- [x] `panel.js`: al pasar por un punto, él y los suyos; los nombres según lo cerca · misma prueba, y visto en Chrome
- [x] Colores con el validador de la paleta, en claro y en oscuro, todas las parejas
- [x] La foto guardada con los colores y la leyenda · prueba con el lienzo de mentira
- [x] La foto en grande, en una pestaña · prueba nueva con el `vscode` de mentira, y vista en Chrome
- [x] Textos en `docs/diccionario.md`
- [x] Decisión 197 en `docs/decisiones.md`
- [x] Mutaciones a mano: 26, las 26 tumbadas
- [x] Batería: `humo.js`, `contrato.js`, `empresas-distintas.js`, diccionario, PowerShell
- [x] La marca de una empresa pone los colores de los grupos · «la marca trae todos los colores que las reglas piden»
- [ ] Vista en VS Code de verdad (solo se ha visto en Chrome, con `panel.css` y `panel.js` cargados a mano)
- [ ] PR revisada y fusionada por Jose

## Evidence

- **La mancha, reproducida**: la wiki del monorepo (`02-DOCS/wiki`, 423 documentos) por `foto.laFoto` y pintada con
  `panel.js` en Chrome sin ventana sale igual que la captura de Jose: 300 puntos, 903 enlaces, tres grupos en los bordes
  y el grande hecho un borrón.
- **Con la disposición nueva**: 300 puntos, ninguno encima de otro, en unos 150 ms. Los grupos: su proyecto más grande
  (220 conceptos), una de sus áreas (22), la documentación de esta barra (20) y Lo demás (38).
- **La prueba de la mancha** con el `foto.js` de `main`: «1812 parejas de puntos, una encima de otra». Con el nuevo: 0.
- **Paleta** (validador de la skill `dataviz`, `--pairs all`): claro `#ec4429,#2a78d6,#1baf7a` sobre `#ffffff`, peor
  pareja ΔE 9.3 daltónico y 24.0 normal; oscuro `#ec4429,#3987e5,#199e70` sobre `#1f1f1f`, 9.9 y 20.9, todos ≥ 3:1. Con
  cuatro colores fallaba (amarillo y rojo, 14.5 en oscuro; violeta y azul, 10.5 en claro). En claro, el verde (2.82:1) y
  el gris (2.69:1) no llegan a 3:1: los acompañan la leyenda y los nombres.
- **Pruebas de la foto** (`HUMO_SOLO='foto|…'`): 17 pasadas, entre ellas las cuatro nuevas.
- **Mutaciones**: 26 a mano, las 26 tumbadas (lista en la decisión 197). Dos hallazgos: la pasada final que separaba
  puntos pisados no hacía nada (quitada) y el tope de alejar estaba repetido (dejado en uno).
- **Batería entera**, con `npm ci` en `extension/media/harness/` y `preparar-paquete.js`, que no se versionan:
  `humo.js` 569 de 569 (antes 541 y 24 que fallaban solo por no tener el arnés ni los módulos comunes),
  `contrato.js` 15, `empresas-distintas.js` entera, diccionario («Todo el texto de pantalla respeta el diccionario») y
  PowerShell («5 ficheros revisados, sin pegas»).
- **Visto en Chrome** con la wiki del monorepo: la barra a 300 de ancho y la pestaña a 1.400, en claro y en oscuro;
  acercando, pasando por un punto y la foto guardada en PNG.

## Next

Jose: probarla en VS Code (la barra y «Verla en grande»), con el pellizco del ratón táctil, y revisar la PR. Los textos
nuevos están en el diccionario, en la fila de la decisión 197: si alguno no le vale, se cambia ahí primero.
