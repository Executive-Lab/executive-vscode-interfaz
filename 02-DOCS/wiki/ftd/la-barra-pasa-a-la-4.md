---
type: ftd
title: La barra pasa a la 4
date: 2026-11-15
author: Jose Sanchis
branch: la-rsc-4
status: in-progress
---

# La barra pasa a la 4

## Intent

Jose, 15-11-2026: *«audita, revisa, adapta a la última versión de RSC y comprueba que todo esté bien
para que los alumnos usen la barra»*.

La barra trae la RSC 3.0.22 y la última publicada es la **4.1.7** (15-11-2026). Por P7 (decisión 145),
una carpeta que va por delante de la barra está al día, y la barra no escribe en ella. Cualquier alumno
que monte RSC desde el chat con la 4 se queda con una barra que mira y no hace: «Añadir», «Arreglar»,
«Poner al día» y cambiar de asistente responden que la carpeta va por delante.

Ensayo del 15-11 con la 4.1.7 y sin tocar el código: fallan 10 comprobaciones de la batería y 6 del
contrato.

## Lo que trae la 4 (comprobado con el paquete, 3.0.22 frente a 4.1.7)

- **Las salidas que la barra lee no cambian.** El plan en seco (`Plan id:`, `Accept exactly this
  plan`, `Managed paths:`, `Selected:`), las seis formas de acabar el montaje, `doctor --json`,
  `repair --dry-run`, `reassess`, `memory resume` y `sync --dry-run` dicen lo mismo.
- **El freno (`danger-guard.mjs`) y `shell-unwrap.mjs` son idénticos.** La copia de los raíles vale;
  solo cambia su nombre, que lleva la versión.
- **Habilidades.** Entran `asdd` (sustituye a `sdd`), `security-audit` (sustituye a `secure-coding`
  y `security-scan`), `ux`, `tidy`, `customer-research`, `offer-design`, `sales-funnel`,
  `scroll-film` y `vsl-script`. Salen `sdd`, `ui-engineering`, `secure-coding`, `security-scan`,
  `design-dna`, `design-loop` y `motion-craft`. En una carpeta de operaciones el suelo lleva ahora
  `design`, `security-audit`, `tidy` y `ux`.
- **Enganches nuevos:** `asdd-gate` (no deja subir una rama de riesgo 2 sin su spec; solo con ASDD),
  `emoji-policy`, `memslop-offer`, `risk-policy`, `spec-completeness` y `claude-lifecycle`.
- **Interruptores nuevos:** `.no-asdd-gate`, `.no-emoji` y `~/.rsc/.no-memslop` (este, por máquina).
- **Órdenes nuevas:** `risk`, `spec gate`, `ingest` (mueve un fichero a `02-DOCS/raw/` y borra el
  original) y `emoji on|off`.
- **El montaje pregunta por los emoji.** El plan trae `Emoji: on (as before)` y pide al asistente que
  lo pregunte. Por defecto, sí.
- **La ingesta mueve.** Con la 3 se copiaba. Con la 4, los ficheros sueltos de la raíz y los de
  `inbox/` se mueven a `raw/` con `ingest`.
- **MemSlop.** En un Mac, al empezar, RSC le pide al asistente que ofrezca instalar MemSlop con
  `curl … | bash`. A un no técnico, su propio freno se lo bloquea.

## Scope

**Dentro**

- La 4.1.7 en `media/harness`, y la versión en todos los sitios donde está escrita, también en el arnés
  de este repositorio.
- La copia del freno con su nombre nuevo, y la vieja retirada de las carpetas de los alumnos.
- El catálogo y los nombres: habilidades, comandos, guardianes y enganches nuevos y retirados.
- La regla 7 de los raíles, con las órdenes nuevas.
- Lo nuevo que llega al alumno: emoji, MemSlop, la ingesta que mueve, `asdd-gate`.
- Las pruebas, el diccionario, la constitución (P7) y la decisión 200.

**Fuera**

- Publicar la versión: la PR la fusiona Jose y `publicar.sh` va después.
- Cambiar lo que la barra ya decide por P9 (decisión 145): sigue igual.

## Checklist

- [x] 1. El paquete y la versión, en todos los sitios, también en este repositorio. — Prueba: «la
  versión del arnés está fijada, y dice lo mismo en todos los sitios».
- [x] 2. La copia vieja del freno, retirada al poner los raíles. — Prueba nueva en `humo.js`.
- [x] 3. Catálogo y nombres: lo nuevo con nombre en español y lo retirado fuera de lo que se ofrece. —
  Pruebas «todo lo que RSC puede montar tiene nombre» y «cada capacidad existe en el catálogo».
- [x] 4. La regla 7 con `risk`, `spec`, `ingest`, `emoji` y `upgrade`. — Prueba de la regla 7.
- [x] 5. Lo nuevo que llega al alumno, decidido y probado (emoji, MemSlop, ingesta, `asdd-gate`).
- [x] 6. Contrato con la 4.1.7 de verdad en verde. — `contrato.js`.
- [ ] 7. Batería larga con el arnés real (`--con-arnes`), `empresas-distintas.js`,
  `mapeos-codex.js`, Windows en GitHub y la barra en un VS Code de verdad.
- [ ] 8. Diccionario, constitución (P7), decisión 200, README y el diario.
- [x] 9. Revisión adversaria en línea (corrección y seguridad) del diff entero.
- [ ] 10. El `.vsix` empaquetado y la PR abierta.

## Evidence

- Base, 15-11 con la 3.0.22: `humo.js` 569 de 569; `--con-arnes` 578 de 578; `contrato.js`,
  `empresas-distintas.js` y `mapeos-codex.js` en verde.
- Ensayo con la 4.1.7 sin tocar código: 10 fallos en `humo.js` y 6 en `contrato.js`.
- **1, 3, 4 y 6.** Con los cambios (commit `2128d90`), 16-11: `humo.js` 573 de 573 (las 569 de antes y 4
  nuevas), `contrato.js` 15 de 15 con la 4.1.7 de verdad, `empresas-distintas.js` y `mapeos-codex.js` en
  verde, diccionario en verde. El arnés de este repositorio, con `sync` de la de dentro: `optOuts` intacto.
- **2.** «200: al poner los raíles, la copia del freno de antes se quita, y nada más»: se va la de la 3.0.22,
  se queda un fichero que no es una copia del freno y un enlace con ese nombre, y lo de su otro lado no se
  toca. Cae si se quita la llamada a `retirarLosFrenosDeAntes`.
- **5.** Comprobado con el paquete: con `non-technical`, el freno de RSC deniega la orden de instalar
  MemSlop (lo denegó hasta un `heredoc` que solo la citaba). La barra la calla en un Mac: «200: la oferta de
  MemSlop se calla en un Mac, una vez y sin pisar nada», con la oferta de verdad de RSC callando con esa marca.
  `asdd-gate`: en la rama principal no actúa (`if (branch === trunk) return null`). La ingesta: «Añadir
  documentos» copia a `inbox/`. El suelo que no se quita, comparado con el paquete. Las cuatro pruebas nuevas
  caen quitando su arreglo (tres mutaciones a mano, cada una vista en rojo).
- **7, en parte.** `--con-arnes` con la 4.1.7: 582 de 582. Y el escenario de los alumnos de octubre, «200:
  una carpeta que la barra montó con la 3.0.22 se pone al día sola a la 4, sin perder nada»: en verde, y en
  rojo sin la retirada del freno.
- **9.** Revisión en línea: la marca de MemSlop se escribe con `wx` (un enlace roto ahí da `EEXIST` y no se
  escribe a través de él); el borrado solo toca ficheros normales con el nombre exacto, después de una copia
  que ya rechaza enlaces; nada privado nombrado en este repositorio público. Una cosa que salió: el
  manifiesto contaba lo que hace la barra al abrirse sin confianza y no decía lo de MemSlop. Añadido.

## Next

- Lo que queda de 7: Windows y macOS en GitHub y la barra en un VS Code de verdad.
- 8: el diario. 10: `./publicar.sh` y la PR.
