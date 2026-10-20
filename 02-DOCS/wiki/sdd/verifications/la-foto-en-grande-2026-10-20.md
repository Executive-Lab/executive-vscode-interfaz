---
type: verification
title: Verificación — la-foto-en-grande — 2026-10-20
description: La batería entera tras el último cambio, la lista de la vía rápida punto por punto, y las 26 mutaciones.
tags: [sdd, verification, ftd]
timestamp: 2026-10-20T00:00:00Z
topic: sdd
slug: la-foto-en-grande
ftd: 02-DOCS/wiki/ftd/la-foto-en-grande.md
source_state: 5d97cfc (dirty: los cambios de la rama la-foto-en-grande, que van en su primer commit)
veredicto: pasa, con lo de VS Code de verdad pendiente
---

# Verificación — la-foto-en-grande — 2026-10-20

Vía rápida, sin spec: se verifica contra la lista del documento de la feature y la decisión 197.

## La batería (`verificar` de `sdd/config.yaml`), una pasada después del último cambio

Con el arnés del paquete (`npm ci --prefix extension/media/harness`) y los módulos comunes
(`node extension/preparar-paquete.js`) en su sitio. Ninguno de los dos se versiona.

- `node extension/prueba/humo.js` → salida 0, «569 comprobaciones pasadas»
- `node extension/prueba/contrato.js` → salida 0, «15 comprobaciones pasadas»
- `node extension/prueba/empresas-distintas.js` → salida 0, «las tres empresas y la recién montada, enteras»
- `node docs/comprobar-diccionario.js` → salida 0, «Todo el texto de pantalla respeta el diccionario.»
- `node herramientas/revisar-powershell.js` → salida 0, «5 ficheros revisados, sin pegas.»

Antes de tocar nada, en la misma copia sin el arnés ni los módulos: 541 pasadas y 24 caídas, todas por esas dos
carpetas (`media/harness/node_modules`, `media/comun`). Con ellas, ninguna.

## La lista de la vía rápida

- [x] Disposición sin mancha · «la foto del cerebro de una wiki de verdad no sale en una mancha»: con el `foto.js` de
      `main`, «1812 parejas de puntos, una encima de otra»; con el nuevo, ninguna, y el grande ocupa 499 de 860.
- [x] Grupos con color · «los tres grupos con más puntos, cada uno con su color, y el resto en gris».
- [x] Moverse por la foto · «moverse por la foto: acercar, alejar, arrastrar, pasar por un punto…», con la foto de
      mentira que se mide (`panel-con-clics.js`, `dibujo`).
- [x] La foto guardada con colores y leyenda · «la foto del cerebro: se ve, se pulsa un punto y se lee…», con el
      lienzo de mentira, que ahora apunta el color de cada punto y los cuadraditos de la leyenda.
- [x] La pestaña grande · «la foto en grande: una pestaña sola…», con `createWebviewPanel` en el `vscode` de mentira.
- [x] La marca pone los colores de los grupos · «la marca trae todos los colores que las reglas piden» y «ninguna
      regla del panel lleva un color escrito a fuego».
- [x] Paleta · validador de la skill `dataviz`, `--pairs all`: claro y oscuro pasan; en claro, verde y gris por debajo
      de 3:1, con la leyenda y los nombres al lado.
- [x] Textos en el diccionario · fila de la decisión 197; el comprobador, limpio.
- [ ] **Vista en VS Code de verdad** · no hecha. Ver abajo.

## Las pruebas nuevas saben fallar

26 mutaciones a mano, una línea cada una, con `HUMO_SOLO='foto|…'`: las 26 tumbadas (lista en la decisión 197).
Y saben pasar: las mismas pruebas, con el código sin mutar, en verde en la batería de arriba. Lo que no prueban: que
en el editor de verdad la foto se mida igual que la de mentira; para eso está lo visto en Chrome.

## Capas no ejecutadas

- **SUSTITUIDA** — la barra y la pestaña en VS Code: se han visto en Chrome sin ventana, con `panel.css` y `panel.js`
  de verdad y la wiki del monorepo (barra a 300 de ancho, pestaña a 1.400, claro y oscuro, acercando, pasando por un
  punto y la foto guardada). No puede ver: lo que añade el editor a la página (sus clases y variables de tema reales),
  `createWebviewPanel` de verdad, el pellizco de un ratón táctil, ni Windows.
- **NO-APLICA** — `npm run probar-en-vscode`: ejecuta los comandos de la barra en un editor de verdad, pero no abre
  pestañas desde la barra ni mira cómo se ve; no cubre nada de esto.
- **NO-APLICA** — el asistente de montar (`humo.js --con-arnes`): no se ha tocado.

## Hallazgos descartados

- «Sin la pasada final que separa puntos pisados, quedarían puntos encima de otros» — descartado y la pasada quitada:
  con 300 sueltos, una estrella de 300, dos índices sobre 298, una cadena de 300 y 40 todos con todos, 0 parejas
  pisadas con ella y sin ella (guion de la sesión sobre `foto.disponer`).

## Veredicto: pasa, con un punto abierto

Todo lo que se puede comprobar aquí tiene su prueba en verde. Queda verlo en VS Code de verdad: lo hace Jose antes
de fusionar la PR.
