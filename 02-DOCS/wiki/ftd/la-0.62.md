---
type: ftd
title: La 0.62
date: 2026-11-16
author: Jose Sanchis
branch: la-0.62
status: done
---

# La 0.62

## Intent

Jose, 16-11-2026, usando la 0.61 en su monorepo: *«haz la versión 62 con esos 5 puntos»*. La barra que se usa es
la sencilla. La completa sigue apagada, como copia de reserva (decisión 138).

1. **Ir y volver de la vista sencilla, a la vista.** *«Haz que se pueda hacer y deshacer el modo sencillo. Ya que
   cuando se habitúen igual es mejor que puedan usar el modo completo.»* Los dos botones estaban en Ajustes, que en
   la sencilla está apagado.
2. **«Volver» nunca al buscador de conceptos.** *«Cuando le doy a Conocimiento de X y luego atrás, me dirige al
   buscador de conceptos, que no debería salir nunca.»*
3. **La ficha de cada proyecto, una (i) al lado de Trabajar.** *«Quizá pueda ser útil modo solo lectura… ponerlo al
   lado del botón de trabajar como una (i) pequeña con hover.»* Sustituye a «Conocimiento de X».
4. **Conversación nueva, a la vista.** *«¿Meterías un botón para abrir una nueva sesión de Claude?»* Estaba, plegado
   dentro de Ayuda.
5. **Solo cuentan las conexiones de verdad.** *«La barra cuenta como conexión cualquier carpeta de 01-TOOLS… eso
   deberíamos arreglarlo.»* Acciones decía «23 programas» donde había 17.

## Scope

**Dentro**

- `panel.js`: el pie, el «Volver» y las migas del artículo, la (i) de cada proyecto, Conversación nueva debajo de la
  tarjeta y fuera de Ayuda. `panel.css`: el tamaño de la (i). `piezas.json`: la pieza `conversacionNueva`.
- `subproyectos.js`: la ficha aparte (`ficha`), fuera de los botones.
- `conexiones.js`: `esConexion` y `conectadas()`. Las usan el número de Acciones (`brujula.js`), la pantalla de
  Conexiones (`extension.js`) y Qué falta por montar (`terreno.js`).
- Pruebas, diccionario, decisión 202, la versión 0.62.0.
- Cerrar la 201: su decisión, publicada; su documento FTD, hecho.

**Fuera**

- Publicar la 0.62.0: con el sí de Jose.
- La barra completa: no se toca, salvo que la ficha de un proyecto también vuelve a la principal.
- Lo que sigue mirando todas las carpetas de `01-TOOLS`: tapar las claves, Resultados (out), lo que se mira de un
  vistazo y lo que evita ofrecer otra vez algo que ya tiene carpeta.

## Checklist

- [x] 1. El pie de la sencilla lleva «Ver el editor completo» o «Volver al modo sencillo», según la ventana; con
  Ajustes encendido, no sale dos veces.
- [x] 2. En la sencilla, lo que se lee vuelve a la principal (o a la foto, si se abrió desde ella). Con Conocimiento
  a la vista, como antes.
- [x] 3. La (i) de la ficha al lado de Trabajar, con su nombre al pasar por encima; la ficha se lee sin «Pídele que lo
  cambie» y vuelve a la principal.
- [x] 4. Conversación nueva debajo de la tarjeta y fuera de Ayuda; con la pieza apagada, vuelve a Ayuda. El tope de
  cosas a la vista pasa de cinco a seis, decidido por mí con el visto bueno de Jose.
- [x] 5. Solo cuentan las carpetas con `.env.example`, `.env`, `CREDENTIALS.md`, fichero de acceso o prueba.
- [x] 6. Diccionario, decisión 202, versión 0.62.0, cierre de la 201.
- [x] 7. Batería entera, contrato, empresas, `--con-arnes`. GitHub, en la PR.
- [x] 8. PR abierta: #112.

## Evidence

- **1 a 5.** Una prueba por punto en `humo.js`, con «(decisión 202)» en el nombre. Las cinco, vistas caer antes del
  arreglo, cada una por lo suyo: el pie sin el botón, la pieza sin encender, «Volver» que lleva a `verCerebro`, la
  ficha que no va aparte y `conectadas` que no existe. Con ellas cayeron también las tres que cambian: la tabla de
  piezas, el orden de Ayuda y los botones de cada proyecto. Después del arreglo, las ocho en verde, y la batería
  entera 580 de 580.
- **5.** La prueba monta una carpeta con siete en `01-TOOLS`: unas notas, unos guiones sueltos, y cinco conexiones
  (Holded entera, y cuatro con una sola pieza cada una). Cuentan cinco en Acciones, en Conexiones y en Qué falta por
  montar, y las siete siguen viéndose donde se tapan las claves.
- **6.** `node docs/comprobar-diccionario.js`: en verde. 0.62.0 en `extension/package.json` y en el instalador.
- **4, el tope.** `empresas-distintas.js` cayó en 13 pantallas: «6 cosas a la vista», con un tope de cinco. Jose:
  *«lo que consideres, ya que queremos mantenerla simple pero que sea útil»*. El tope pasa a seis (`TOPE`). Con eso
  pasan las tres empresas y la recién montada. Con un séptimo botón suelto puesto a mano, cae («7 cosas a la vista»).

- **7.** Sobre el código final: `humo.js` 580 de 580, `contrato.js` 15 de 15, las tres empresas y la recién montada
  enteras, `mapeos-codex.js` 30 de 30, diccionario y PowerShell sin pegas. `humo.js --con-arnes` dio 590 de 590 antes
  de los dos últimos cambios, que no tocan lo que añade: el fichero de acceso de la prueba de conexiones, sin clave
  dentro, y un comentario.
- **Riesgo.** `rsc risk --base origin/main`: nivel 1. Salía nivel 2 por la clave privada de mentira de la prueba de
  conexiones; la cuenta de servicio se reconoce por su tipo, y la clave sobraba. Revisión en línea, caso por caso:
  sin hallazgos. Jose eligió no lanzar un revisor independiente. La prueba de conexiones cae con tres roturas a mano
  (sin fichero de acceso, sin `.env`, sin filtrar).

- **Publicada.** GitHub en verde en la PR #112: Windows, el `.exe`, el `.dmg` y la barra en un VS Code de verdad.
  Jose: *«Fusiona tu»*, y la PR se fusionó (4c08c20). Jose: *«si, publica de una vez.»*, y salió la release
  `v0.62.0` el 16-11-2026, con el `.vsix` y su huella. En el Mac, la prueba en un VS Code de verdad cayó dos
  veces por tiempo en `refrescar` (más de 8 s) y pasó a la tercera, 9 de 9; la 0.61 tardaba lo mismo.

## Next

- Nada. Lo siguiente va en la 0.63 (`la-0.63.md`).
