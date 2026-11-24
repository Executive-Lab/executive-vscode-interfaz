---
type: ftd
title: La 0.63
date: 2026-11-24
author: Jose Sanchis
branch: la-0.63
status: in-progress
---

# La 0.63

## Intent

Jose, 24-11-2026: *«adapta la barra a la última versión de RSC y audita, revisa, corrige, mejora y optimiza todo que
la vamos a enseñar la semana que viene en comunidad»*.

Dos cosas:

1. **RSC 4.1.9.** La barra lleva la 4.1.7. El vigía avisó de la 4.1.8 (#113), y ya está la 4.1.9.
2. **Un repaso entero, como lo verá la comunidad.** La barra sencilla sobre una carpeta de alumno montada de verdad,
   pintada en un navegador con la seguridad de la página puesta. Con nuestra marca, con la de una empresa clara y con
   la de una oscura, y con el editor en claro y en oscuro. Lo que salga, se arregla; lo que no se lea, se corrige; y
   se mide lo que tarda.

## Scope

**Dentro**

- La versión de RSC en sus seis sitios, la copia del freno (`freno-rsc-4.1.9.mjs`) y `.rsc.json`.
- `extension.js` y `marca.js`: el estilo de la marca, con la contraseña de un solo uso de la página.
- `panel.css` y `marca.js`: las fichas de lo de encima, los campos y el código, y el hueco de la tarjeta.
- `limpio.js`, `cerebro.js`, `brujula.js` y `foto.js`: las tildes de los temas. `extension.js` y `panel.js`: las
  migas del artículo.
- `color.js` y `marca.js`: fuera el código que no usaba nadie.
- Los dos README y sus cuatro capturas.
- Pruebas, diccionario, decisión 203, la constitución, la versión 0.63.0.
- Cerrar la 202: su decisión, publicada; su documento FTD, hecho.

**Fuera**

- Publicar la 0.63.0: con el sí de Jose.
- El acento amarillo que se oscurece hasta mostaza: va con el kit de marca, aparte.
- La barra completa: no se toca más que en lo que comparte (el estilo, las tildes).

## Checklist

- [x] 1. RSC 4.1.9 en los seis sitios, el freno renombrado e idéntico al de la 4.1.9, `.rsc.json` al día.
- [x] 2. Los colores de la empresa llegan a la barra con la seguridad de la página puesta, y solo su estilo.
- [x] 3. Con el editor en oscuro y una marca, lo de encima, los campos y el código se leen (4,5 o más).
- [x] 4. Los temas de la wiki, con tilde; las herramientas, como se llaman.
- [x] 5. Las migas de un artículo, con el rótulo del tema.
- [x] 6. Sin hueco en blanco cuando un título abre la tarjeta.
- [x] 7. Fuera `apagadoSobre` y `masApagadoQueSeLea`.
- [x] 8. Los README dicen lo que hay; las capturas son de la barra de ahora.
- [x] 9. Lo que tarda `refrescar`, medido.
- [x] 10. Diccionario, decisión 203, constitución, versión 0.63.0, cierre de la 202.
- [x] 11. Batería entera, contrato, empresas, `--con-arnes`, mapeos, PowerShell y VS Code de verdad.
- [ ] 12. PR abierta, con GitHub en verde.

## Evidence

- **1.** `grep` de la versión: 4.1.9 en el paquete del arnés, `rsc.js`, `preparar-paquete.js`, `demo.sh`, los dos
  README, los tres `siempre.md` y los dos `freno.mjs`. `cmp` de las dos copias del freno y de `shell-unwrap.mjs` con las de
  la 4.1.9 instalada: idénticas. La prueba «la versión del arnés está fijada, y dice lo mismo en todos los sitios donde
  está escrita», en verde. `contrato.js`: «instalar una habilidad desde la barra deja la carpeta en la versión de la
  barra — bookkeeping, y la 4.1.9».
- **2.** Visto en Chromium, el mismo motor que VS Code, con la seguridad de la página intacta: antes, la página con
  marca salía con la nuestra; después, con la de la empresa. La prueba «203: los colores de la empresa llegan a la
  barra…» cae sin el arreglo y pasa con él; comprueba que la seguridad lleva la contraseña y no `'unsafe-inline'`.
- **3.** Medido en Chromium: con una marca clara y el editor en oscuro, al pasar por encima de un botón, contraste
  1,23 antes y 14,3 después. La prueba «203: con la marca de una empresa y el editor en oscuro…» lee las reglas de
  `panel.css` y el estilo de tres marcas, y exige 4,5 o más en lo de encima, los campos y el código.
- **4.** «203: los temas de la wiki recuperan la tilde…»: catorce nombres, entre ellos «Facturacion» → «Facturación»,
  y «Session», «Mission», «Automation», «FACTURACION» y uno que ya trae tilde, sin tocar. Seis pruebas viejas
  esperaban «Facturacion»: ahora, con tilde. Sin el arreglo, cae.
- **5.** «203: las migas de un artículo nombran su tema por su rótulo…»: abre un artículo desde su tema y lee
  «Facturación» en las migas. Sin el arreglo, cae: salía «facturacion».
- **6, 8.** Capturas a doble resolución, vistas una a una: sin hueco encima de «Ayuda» ni de «Las reglas». Las cuatro
  del README salen de la barra de ahora.
- **7.** `grep` de los dos nombres en todo el repositorio: ninguno queda.
- **9.** `refrescar` cronometrado paso a paso sobre la carpeta de alumno, cuatro vueltas: 1.366, 276, 328 y 349 ms. Lo
  más lento es mirar la versión de RSC de la carpeta (988 ms la primera vez, nada después).
- **10.** `node docs/comprobar-diccionario.js`: en verde. 0.63.0 en `extension/package.json` y en el instalador.
- **11.** Sobre el código final: `humo.js` 584 de 584, `humo.js --con-arnes` 594 de 594, `contrato.js` 15 de 15, las
  tres empresas y la recién montada enteras, `mapeos-codex.js` 30 de 30, PowerShell sin pegas. En un VS Code de verdad
  (1.147.0, en el Mac), 9 de 9 a la primera, con la 0.63.0.
- **Riesgo.** `rsc risk --base origin/main`: nivel 2, solo por `siempre.md` (las reglas de la barra), que cambia la
  versión. Es configuración del arnés: el freno de RSC no pide spec, pero sí que lo apruebe una persona, y la PR la
  fusiona Jose. Revisión en línea, fichero por fichero: un comentario con un ejemplo que no venía al caso, corregido.

- **No se corrió aquí.** `windows.js`, el `.exe` y el `.dmg`: en un Mac no se pueden probar, y los corre GitHub en la PR.
- **Cómo se deshace.** `git revert` del commit de la fusión. No hay datos que migrar: una carpeta que la 0.63 puso en
  la 4.1.9 va por delante de una barra 0.62, y esa barra trabaja ahí con la 4.1.9 sin bajarla (constitución, P7).

## Next

- Abrir la PR y esperar a GitHub.
- Jose: fusionar y publicar la 0.63.0. Con ella, cerrar #113 y la PR #108, que la 0.62 ya dejó atrás.
