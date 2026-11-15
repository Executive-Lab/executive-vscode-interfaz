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

- [ ] 1. El paquete y la versión, en todos los sitios, también en este repositorio. — Prueba: «la
  versión del arnés está fijada, y dice lo mismo en todos los sitios».
- [ ] 2. La copia vieja del freno, retirada al poner los raíles. — Prueba nueva en `humo.js`.
- [ ] 3. Catálogo y nombres: lo nuevo con nombre en español y lo retirado fuera de lo que se ofrece. —
  Pruebas «todo lo que RSC puede montar tiene nombre» y «cada capacidad existe en el catálogo».
- [ ] 4. La regla 7 con `risk`, `spec`, `ingest`, `emoji` y `upgrade`. — Prueba de la regla 7.
- [ ] 5. Lo nuevo que llega al alumno, decidido y probado (emoji, MemSlop, ingesta, `asdd-gate`).
- [ ] 6. Contrato con la 4.1.7 de verdad en verde. — `contrato.js`.
- [ ] 7. Batería larga con el arnés real (`--con-arnes`), `empresas-distintas.js`,
  `mapeos-codex.js`, Windows en GitHub y la barra en un VS Code de verdad.
- [ ] 8. Diccionario, constitución (P7), decisión 200, README y el diario.
- [ ] 9. Revisión adversaria en línea (corrección y seguridad) del diff entero.
- [ ] 10. El `.vsix` empaquetado y la PR abierta.

## Evidence

- Base, 15-11 con la 3.0.22: `humo.js` 569 de 569; `--con-arnes` 578 de 578; `contrato.js`,
  `empresas-distintas.js` y `mapeos-codex.js` en verde.
- Ensayo con la 4.1.7 sin tocar código: 10 fallos en `humo.js` y 6 en `contrato.js`.

## Next

- Punto 1 en curso.
