---
type: verification
title: Verificación — el-pie-y-la-foto — 2026-10-20
description: Lo que vio Jose en el editor con la 197 puesta: «Verla entera» quitado, y el pie, la leyenda y los nombres de la foto a anchos estrechos.
tags: [sdd, verification, ftd]
timestamp: 2026-10-20T00:00:00Z
topic: sdd
slug: el-pie-y-la-foto
ftd: 02-DOCS/wiki/ftd/la-foto-en-grande.md
source_state: 8bdb375 (dirty: los cambios de la rama el-pie-y-la-foto, que van en su commit)
veredicto: pasa
---

# Verificación — el-pie-y-la-foto — 2026-10-20

Vía rápida, seguimiento de `la-foto-en-grande` (decisión 197, nota del 20-10, y decisión 198).

## La batería (`verificar` de `sdd/config.yaml`), una pasada después del último cambio

Con el arnés del paquete y los módulos comunes en su sitio, que no se versionan.

- `node extension/prueba/humo.js` → salida 0, «569 comprobaciones pasadas»
- `node extension/prueba/contrato.js` → salida 0, «15 comprobaciones pasadas»
- `node extension/prueba/empresas-distintas.js` → salida 0, «las tres empresas y la recién montada, enteras»
- `node docs/comprobar-diccionario.js` → salida 0, «Todo el texto de pantalla respeta el diccionario.»
- `node herramientas/revisar-powershell.js` → salida 0, «5 ficheros revisados, sin pegas.»

## Lo pedido

- [x] Quitar «Verla entera» · en la barra y en grande: la pantalla de la foto y la pestaña lo miran
      («sale «Verla entera», que se quitó»); la prueba de moverse por la foto deja la foto entera con el 0 y alejando
      del todo, que ahora además la centra.
- [x] El pie, sin letras en columna · Chrome con `panel.css` de verdad a 120, 160, 200, 240 y 300 de ancho: antes, a
      200, «Barra 0.58.0» letra a letra (como la captura de Jose); ahora nunca, y a 120 se corta con puntos suspensivos.
- [x] La leyenda, a 200 y 260 de ancho · antes, el nombre largo y «20 conceptos» en dos columnas; ahora un solo texto.
- [x] Los nombres con la foto entera · a 200 de ancho, dos en vez de cinco.

## Capas no ejecutadas

- **SUSTITUIDA** — cómo se ve el pie, la leyenda y los nombres: en Chrome, no en el editor. El panel de mentira de
  `humo.js` no mide nada: si vuelve el fallo del pie, ninguna prueba lo verá. Se decidió no escribir una que busque la
  regla en el CSS, porque miraría cómo se escribe y no cómo se ve.
- **NO-APLICA** — mutaciones: lo nuevo es CSS y quitar un botón; el botón quitado lo cubren dos aserciones.

## Hallazgos descartados

- ninguno

## Veredicto: pasa

Queda que Jose lo vea en el editor con el `.vsix` de esta rama.
