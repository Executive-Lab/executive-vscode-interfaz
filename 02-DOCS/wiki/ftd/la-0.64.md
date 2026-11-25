---
type: ftd
title: La 0.64, la marca de la empresa entera
date: 2026-11-25
author: Jose Sanchis
branch: la-0.64
status: in-progress
---

# La 0.64, la marca de la empresa entera

## Intent

Jose, 16-11-2026: *«asegurar que lo del kit de marca funciona y funciona bien. Para que se ponga con el logo, y con
los colores, y la tipografía, y la identidad de marca, y que sea visual igualmente la extensión, la barra, para que lo
utilice un no técnico»*.

Jose, 25-11-2026: *«en el caso de la comunidad voy a decir que se construyan ellos mismos sus propias extensiones y
que pueden utilizar como base la mía. De GitHub. Pero sí, hazlo de marca, revisa que está todo bien y que funciona
bien. Y listo.»*

Lo que se vio al revisarla, con cinco marcas de prueba en claro y en oscuro:

1. **El botón principal no lleva nunca el color de la empresa.** Lleva un tono calculado de su paleta, con la
   saturación recortada. Con un amarillo (#ffd400) sale marrón mostaza; con un cian (#22d3ee), azul pastel.
2. **La tipografía sigue siendo la nuestra.** Con la marca de una empresa, los títulos y su nombre salen en DM Serif
   y el texto en Lato, las de Executive Lab. La de la empresa no se puede poner.
3. **Las reglas del asistente lo prohíben.** El `SKILL.md` dice «No toques la tipografía ni los tamaños», pide un
   campo que la barra no lee (`superficie`) y no cita uno que sí (`logo_lleva_el_nombre`).
4. **«Contárselo con mis palabras» no dice dónde escribirlo.** Ni el fichero ni los campos: lo que haga el asistente
   puede no llegar a la barra.
5. **Quien parta de la barra en GitHub recibe la nuestra.** La barra busca versiones en nuestro sitio y las pone sola.
   Una copia con otro nombre instalaría la nuestra al lado.

## Scope

**Dentro**

- `color.js`: el relleno del botón, con el color de la empresa tal cual cuando su letra se lee encima.
- `marca.js`: `--acento-texto`; la tipografía de la empresa (`tipografia`, `fuente`); sin la suya, la del sistema.
- `extension.js`: la dirección del fichero de la fuente; «Contárselo con mis palabras» con el encargo entero.
- `panel.css`: los enlaces y lo de encima, con `--acento-texto`. `panel.js`: el botón de contarlo.
- `web.js`: el primer intento apunta la tipografía de la web, y si es de Google Fonts, se baja su fichero.
- `SKILL.md` (las tres copias) y `queLePedimos`: los campos de verdad, con la tipografía.
- `sitio.js` y `version.js`: solo se buscan versiones si la barra se llama como la nuestra.
- README: «Hazte tu propia barra»; el número de comprobaciones, el de verdad.
- Pruebas, diccionario, decisión 204, versión 0.64.0. Cierre de la 203.

**Fuera**

- El kit de arnés (empaquetar un arnés en un instalador propio): Jose lo cambia por que cada uno parta de la barra.
- Publicar la 0.64.0: con el sí de Jose.
- El color de los enlaces y los bordes: sigue el tono que se lee, también con el amarillo.

## Checklist

- [x] 1. El botón principal lleva el color de la empresa tal cual si su letra se lee; si no, el tono de su paleta.
- [x] 2. La tipografía de la empresa en los títulos y su nombre; sin la suya, la del sistema, nunca la nuestra.
- [x] 3. El primer intento desde la web apunta la tipografía y baja la de Google Fonts.
- [x] 4. Las reglas del asistente y lo que se le pide, con los campos que la barra lee de verdad.
- [x] 5. «Contárselo con mis palabras» le dice dónde y cómo dejarlo.
- [x] 6. Una barra con otro nombre no busca versiones en nuestro sitio; el README dice qué cambiar.
- [x] 7. Las marcas de prueba (cinco, y una sexta con su tipografía), fotografiadas antes y después.
- [x] 8. Diccionario, decisión 204, versión 0.64.0, cierre de la 203.
- [x] 9. Batería entera, contrato, empresas, `--con-arnes`, mapeos, PowerShell y VS Code de verdad.
- [ ] 10. PR abierta, con GitHub en verde.

## Evidence

- **1.** «204: el botón principal lleva el color de la empresa tal cual, si su letra se lee encima»: amarilla
  #ffd400, azul #0057b8, verde #2e7d32, naranja #ff6b00 y cian #22d3ee en oscuro, tal cual; la lavanda pálida
  (#eeeaff sobre blanco) no se distingue de la página y lleva el tono de antes. Exige 4,5 o más para la letra del
  botón y para `--acento-texto` sobre la página y las tarjetas, y que ninguna letra de `panel.css` use el relleno.
- **2.** «204: con la marca de una empresa, su tipografía va en los títulos, y la nuestra no se queda»: sin la suya,
  la del sistema y seminegrita; con su fichero, `@font-face` de `'Marca EL'`, la suya en los títulos, el texto en la
  del sistema y grosor 400; solo con el nombre, la suya delante y seminegrita (vista caer antes del arreglo:
  `'400' !== '600'`); las de la lista, igual; un fichero que sale de la carpeta, que no es de tipografía o que no
  está, fuera; un nombre con comillas y llaves no rompe la hoja. «204: la página le da a su tipografía la dirección
  de su carpeta…»: la página apunta al fichero con la dirección de `asWebviewUri`, y la seguridad lleva `font-src`. La
  carpeta de la marca ya estaba entre las que la página puede leer, por el logotipo.
- **3.** «204: el primer intento desde la web apunta su tipografía…»: con una web de mentira que enlaza Montserrat de
  Google Fonts, el récord lleva `tipografia: Montserrat` y `fuente: fuente.woff2`, bajada de `fonts.gstatic.com`;
  sin red, solo el nombre. Con Google de verdad, la barra recibe un `.ttf` de Montserrat (180 KB).
- **4, 5.** «204: al asistente se le piden los campos que la barra lee…»: los ocho campos en `queLePedimos`, en
  «Contárselo con mis palabras» y en las tres copias del `SKILL.md`, sin `superficie` ni «No toques la tipografía».
  El botón manda `contarLaCara`, y lo que llega al asistente es el encargo entero.
- **4b. El encargo cabe.** La primera pasada de GitHub cayó en Windows en dos pruebas. Una era de la 166: el encargo
  de la marca, con la tipografía, medía más de 2.000 caracteres en el enlace (1.350–1.500 en la 0.63) y ya no cabía;
  en Windows iba al portapapeles y no se decía «Dale a enviar». Se acortó: 1.308–1.439 en los cuatro casos. «204:
  el encargo de la marca cabe entero en el enlace del asistente» cayó antes (2.191) y pasa después. La otra era de la
  204: la `asWebviewUri` de mentira devolvía la ruta con `\`, que la de verdad nunca lleva; ahora va con `/`.
- **6.** «204: una barra con otro nombre no busca versiones en nuestro sitio»: `sitio.ID` es el `publisher.name` del
  `package.json`; con otro nombre, cero peticiones a GitHub; con el nuestro, una. El README tiene «Hazte tu propia
  barra».
- **7.** Seis marcas pintadas en Chromium con la seguridad de la página puesta, en claro y en oscuro, antes y
  después, vistas una a una. Con el amarillo, el botón pasa de mostaza a #ffd400; con el cian, de azul pastel a
  #22d3ee. La captura del README, nueva a doble resolución: la nuestra, un naranja #c2410c con Montserrat en el título
  y una oscura con cian.
- **8.** `node docs/comprobar-diccionario.js`: en verde. 0.64.0 en `extension/package.json` y en el instalador.
  Decisión 204 escrita; la 203, «publicado en la 0.63.0», y `la-0.63.md`, hecho.
- **9.** Sobre el código final: `humo.js` 591 de 591, `humo.js --con-arnes` 601 de 601, `contrato.js` 15 de 15, las tres
  empresas y la recién montada enteras, `mapeos-codex.js` 30 de 30, PowerShell sin pegas. En un VS Code de verdad
  (1.148.0, en el Mac), 9 de 9 a la primera, con la 0.64.0.
- **Riesgo.** `rsc risk --base origin/main`: nivel 2, solo por `.claude/skills/executive-lab/SKILL.md`, una de las
  tres copias de las reglas del asistente, que tiene que decir lo mismo que las otras dos. Revisión en línea, fichero
  por fichero: dos arreglos (el grosor con solo el nombre, y `cromaDe` en medio del comentario de otra función).
  Ningún nombre privado en lo añadido. La PR la fusiona Jose.
- **No se corrió aquí.** `windows.js`, el `.exe` y el `.dmg`: en un Mac no se pueden probar, y los corre GitHub en la PR.
- **Cómo se deshace.** `git revert` del commit de la fusión. No hay datos que migrar: los campos nuevos del récord
  (`tipografia` con un nombre, `fuente`) los ignora una barra anterior, que pinta la marca como antes.

## Next

- Jose: fusionar la PR y publicar la 0.64.0.
- Con el amarillo, el ✨ del botón casi no se ve. No se toca: es un emoji, y su color no es nuestro.
