---
type: ftd
title: Documentos en una pantalla, y la foto del cerebro
date: 2026-10-15
branch: documentos-y-el-cerebro
status: hecho
---

# Documentos en una pantalla, y la foto del cerebro

## Intent

Dos encargos que viven en el mismo sitio.

- **F7 de [simplificar-la-barra](../sdd/proposals/simplificar-la-barra.md).** Documentos era un plegable con
  tres botones que llevaban a tres pantallas. El plan pide *«una pantalla con tres cosas»*: darle documentos,
  los que tiene sin leer con «Que los lea», y los resultados.
- **El punto 11 de [lo que se puede, se hace solo](lo-que-se-puede-se-hace-solo.md).** En la clase del
  13-10, Eric mandó instalar Obsidian para hacerle una foto al cerebro, el conocimiento que el asistente
  escribe en `02-DOCS/wiki/`. Con P9, la foto la hace la barra, sin instalar nada y sin red.

## Decisión

Decisión 151, en `docs/decisiones.md`.

- **Documentos** es una fila de la principal que abre su pantalla. El botón y el título dicen lo mismo. El
  plegable de antes se apaga en `piezas.json` (`documentosPlegable`), sin borrarlo.
- **La foto del cerebro** tiene un punto por concepto y una línea por enlace. Se pulsa un punto y se lee
  el concepto en la barra. «Guardar la foto» la deja en PNG en Resultados (out) y lo dice en una frase.
- Se llega desde Documentos, debajo de Resultados, y desde Conocimiento en la barra completa. En la
  sencilla, Conocimiento está apagado porque se le pregunta mejor al asistente. Una foto es justo lo que la
  conversación no puede dar.
- El dibujo y dónde va cada punto, en `extension/src/foto.js`, puro y determinista.

## Scope

**Dentro**

- La pantalla Documentos:
  - darle documentos, arrastrando o eligiéndolos;
  - lo que tiene sin leer, también lo suelto en la carpeta;
  - Resultados, con lo de cada conexión y las fotos.
- Volver a Documentos al soltar, elegir o quitar desde ella.
- Leer los enlaces de markdown y los `[[wikilinks]]`, con nombre, alias y título.
- La disposición de fuerzas y el tope de 300 puntos, dicho en pantalla.
- La foto en el panel, en SVG, sin tocar la política de contenido.
- Guardarla en PNG en `02-DOCS/wiki/out/`, sin pisar ninguna, y abrirla o llevársela.
- Las pruebas, el diccionario y la decisión.

**Fuera, y por qué**

- **Acercarse y arrastrar**, colores por tema y recorrer los puntos con el teclado: con la foto y el lector
  basta para el reto de la clase. Los conceptos siguen en Conocimiento.
- **Una pestaña del editor para la foto**: la barra es una sola vista, y la versión grande es la foto
  guardada, que «Abrirla» abre al lado.
- **Publicar la versión**: lo decide Jose.

## Checklist

- [x] 1. `foto.js`: leer los enlaces de las dos formas, el dibujo, el tope, la disposición, y guardar,
  listar y abrir las fotos.
- [x] 2. La pantalla Documentos y su fila en la principal; el plegable de antes, apagado en la tabla.
- [x] 3. La pantalla de la foto, con su salida sin conceptos y sin enlaces, y el PNG desde el lienzo.
- [x] 4. La extensión: las pantallas, guardar, abrir y llevársela, y volver a Documentos. El vigía las
  repinta con el aviso que tenían.
- [x] 5. Seis comprobaciones nuevas en `humo.js`, y la de la principal sencilla, al día.
- [x] 6. Mutaciones a mano: 65, las 65 tumbadas.
- [x] 7. Diccionario, decisión 151, F7 en el plan y el punto 11 en `lo-que-se-puede-se-hace-solo.md`.
- [x] 8. Verlo en VS Code de verdad: el lienzo solo se ha probado con uno de mentira. · Visto el 20-10-2026: Jose
      guardó una foto desde VS Code con la 0.58.0, y el PNG lleva el título, el día, los puntos, las líneas y los nombres.
- [x] 9. La revisión adversaria (PR #39): 6 de seguridad y 6 de corrección, más 17 mutantes vivos, arreglados
  con su prueba. Mutaciones: 119, las 119 tumbadas.

## Evidence

- `humo.js`: 380 comprobaciones, antes 374. Las nuevas:
  - «la foto del cerebro: un punto por concepto y una línea por enlace, en markdown o con [[ ]]»: 19 formas de
    escribir un enlace, una a una, y de dónde sale cada título;
  - «… cada punto en su sitio, siempre el mismo, dentro del cuadro y sin pisarse»;
  - «… con cientos de conceptos: no se cuelga, enseña los que más enlazan y dice cuántos hay»: 700 conceptos
    en menos de un segundo, también con el ordenador cargado;
  - «la foto del cerebro se guarda en PNG, sin pisar ninguna, y solo se abre una de las nuestras»;
  - «Documentos en una pantalla: darle documentos, los que tiene sin leer con «Que los lea», y los resultados»;
  - «la foto del cerebro: se ve, se pulsa un punto y se lee, y se guarda en Resultados diciendo dónde».
- La batería entera de `sdd/config.yaml`, pasada de nuevo después del último cambio: `humo.js` (380),
  `contrato.js` (14), `empresas-distintas.js` (las tres empresas), `comprobar-diccionario.js` y
  `revisar-powershell.js`, en verde.
- Las pantallas se miraron pintadas con su hoja de estilo: los nombres que se pisaban dejaron de escribirse,
  y la fila de Documentos se alineó con las plegables.
- **Mutaciones: 65 de 65.** Una línea cambiada cada vez, y `humo.js` entero en una copia:
  - 20 en cómo se leen los enlaces, y en las expresiones que volvían atrás;
  - 6 en la disposición: al azar, sin encajar, sin repelerse, sin muelles, sin gravedad y el tamaño sin enlaces;
  - 6 en el tope y en lo que no se lee;
  - 6 en guardar y abrir la foto;
  - 16 en el panel, de la fila de Documentos a un estilo en línea;
  - 10 en la extensión, del vigía a abrir un fichero que no es una foto;
  - y 1 en la tabla de piezas: el plegable de antes, encendido.
- Al escribirlas salieron dos fallos, arreglados con su prueba:
  - con un fichero preparado, las expresiones de los enlaces volvían atrás sin fin: 60 KB tardaban seis segundos;
  - si la carpeta de las fotos era un enlace a otro sitio del disco, la foto se escribía allí.

- **La revisión adversaria encontró esto, y está arreglado** (decisión 151):
  - *seguridad*:
    - la foto congelaba el editor con 2.000 artículos del mismo nombre: 15,8 s, y ahora menos de 100 ms;
    - 5.000 alias en 2.000 ficheros: 17,5 s, y ahora 0,8 s;
    - la foto se escribía fuera de la carpeta a través de una wiki enlazada;
    - un concepto con `[` sin cerrar colgaba el editor al abrirlo;
    - un `.md` enlazado a `~/.ssh/config` se enseñaba;
    - y no había ningún `.rscignore`: la wiki la deja fuera del barrido el protocolo de RSC, y lo mira una
      prueba;
  - *corrección*:
    - los avisos de Documentos y de la foto se los comía el vigía;
    - soltar algo ilegible no decía nada;
    - la fila y «Sin leer todavía» contaban distinto;
    - enlaces con mayúsculas, tildes del Mac, paréntesis u otros alfabetos no llevaban a nada;
    - los puntos no se usaban con el teclado;
    - y `empresas-distintas.js` no pasaba las dos pantallas nuevas;
  - y 17 mutantes vivos, ahora tumbados.
- Después: `humo.js` 385, `contrato.js` 14, `empresas-distintas.js` (dieciocho pantallas y cinco cosas a la
  vista en las tres), diccionario y `revisar-powershell.js`, en verde. Mutaciones: 119 de 119. Dos vivían en
  la primera pasada y se cerraron con una prueba más. Con el ordenador cargado por otras pruebas, cada
  mutación se corrió con el trozo de `humo.js` que toca esto, que pasa entero sin mutar; la batería entera,
  al final.

## Next

- Verlo en VS Code de verdad: el lienzo, la foto guardada y abrirla al lado.
- Si en clase hace falta, acercarse y arrastrar, o colores por tema.
- F8: la versión, con un «Qué trae» que cuente que Documentos es una pantalla y que está la foto.
