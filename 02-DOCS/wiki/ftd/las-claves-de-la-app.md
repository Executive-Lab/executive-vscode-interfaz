---
type: ftd
title: Las claves de una aplicación están en su sitio
date: 2026-09-29
status: hecho
---

# Las claves de una aplicación están en su sitio

## Intent

Jose, con una captura de norte-presupuestos: la barra decía *«Hay 9 claves fuera de sitio»* (Resend
2, Supabase 5, y NORTE y USE «por montar») y ofrecía «Que las ordene». Estaban en
`03-APP/.env.local`, junto al `package.json` de una aplicación Next.js, que es de donde ella las
lee. Su diagnóstico: *«creo que es porque al ser una app y tener una app se guarda también ahí en el
.env.local»*. Era eso: `sueltas.js` contaba los `.env*` de cualquier carpeta de primer nivel, sin
distinguir si esa carpeta es una aplicación.

## Scope

**Dentro**

- `sueltas.js`: una carpeta de primer nivel con `package.json`, `pyproject.toml`, `pubspec.yaml`,
  `Cargo.toml` o `go.mod` es una aplicación, con la misma definición que RSC usa para los
  subproyectos en `skills/harness`, fase 1. Sus claves y sus ficheros de acceso no son desorden.
- La protección no pierde nada: `paraProteger()` las sigue dando a quien las deja fuera de las
  copias (`guardar.js`) y a quien tapa valores en lo que se enseña (`conexiones.js`).
- El raíl `executive-lab` (las dos copias): lo de una aplicación no se mueve, y si ya está en git
  se saca de las copias sin borrarla.
- Las que ya estaban en las copias (añadido el 05-10-2026, a petición de Jose): `deLasAppsEnLasCopias()`,
  su tarjeta en Conexiones (tools) con **Que deje de guardarlas**, la línea del informe de «Algo va
  mal» y la fila del diccionario.
- Decisión 135.

**Fuera, a propósito**

- La raíz: un `.env` ahí sigue contando aunque haya `package.json`. Para RSC es el espacio de
  trabajo, no un subproyecto.
- `requirements.txt` solo no hace una aplicación: el protocolo de `harness` no lo cuenta, y una
  carpeta así suele ser un guion.
- Parar «Subir a GitHub» si hay claves de una aplicación en las copias: el sitio es privado, y se
  dice igual que con las de fuera de sitio, sin bloquear.

## Checklist

- [x] Con solo la aplicación, `resumen()` es `null` y `ficherosDeAcceso()` vacío: comprobación nueva.
- [x] La herramienta RESEND no tiene su clave «fuera de sitio» (`fueraDeSitio: 0`) y le falta la suya (`faltan: 1`): comprobación nueva.
- [x] Los valores de la aplicación, también los de su cuenta de servicio, se tapan: comprobación nueva.
- [x] Una copia de verdad con git deja fuera `03-APP/.env.local` y la cuenta de servicio, y mete `package.json` y `src/`: comprobación nueva.
- [x] `auto/.env` y `scripts/.env` (con `requirements.txt`) siguen contando, y el encargo no nombra `03-APP`: comprobación nueva.
- [x] La lista de manifiestos es la de `skills/harness` del arnés que va dentro: comprobación nueva.
- [x] Las pruebas de antes de claves y ficheros de acceso siguen en verde.
- [x] Ocho mutaciones tumban las pruebas nuevas.
- [x] Las dos copias del raíl, iguales.
- [x] Una clave de una aplicación guardada en git se ve; sin git, nada; la suelta sigue en su tarjeta: comprobación nueva.
- [x] El encargo nombra el fichero, `git rm --cached`, el `.gitignore` y los nombres de las claves, dice «No las muevas» y no lleva ningún valor: comprobación nueva.
- [x] La tarjeta se pinta sin ficheros ni órdenes a la vista, y sin nada en git no sale: comprobación nueva.
- [x] La extensión se lo manda a Conexiones y el informe de «Algo va mal» lo dice: comprobación nueva.
- [x] Seis mutaciones tumban la prueba nueva.
- [x] Las suites en verde.

## Evidence

Observado el 29-09-2026 sobre la rama `las-claves-de-la-app`, sacada de `main` (`da5a059`) en una
copia aparte (`.claude/worktrees/`), porque otra sesión trabajaba en el árbol compartido.

- Antes del arreglo, la prueba nueva fallaba con `las claves de la app no son desorden:
  ["03-APP/.env.local"]`, que es la captura.
- Después: `✓ las claves de una aplicación están en su sitio, y siguen sin salir de este ordenador
  — nada fuera de sitio · tapadas · fuera de la copia · lo de fuera sigue contando` y `✓ una
  aplicación es lo mismo que para RSC — package.json, pyproject.toml, pubspec.yaml, Cargo.toml,
  go.mod`.
- Mutaciones, las ocho muertas: `buscar` cuenta las apps · `ficherosDeAcceso` las cuenta ·
  `paraProteger` sin sus claves · sin sus ficheros · `guardar` solo con lo de fuera de sitio · tapar
  solo con lo de fuera de sitio · `requirements.txt` hace una app · la clave de la app cuenta como
  la de la herramienta.
- Suites: `humo.js` → **348 comprobaciones pasadas** (346 antes, más las dos nuevas) · `contrato.js`
  → 14 · `empresas-distintas.js` → las tres empresas, enteras · `comprobar-diccionario.js` → limpio.
  Para correrlas en la copia aparte hizo falta `node preparar-paquete.js` y enlazar
  `media/harness/node_modules` del árbol principal, que es el mismo `package-lock.json`: sin eso
  fallan 19 que no tienen que ver con esto.
- Con `main` al día (`89f7dad`, con la 133 y la 134 dentro): `humo.js` → **353 comprobaciones
  pasadas**, y las otras tres suites igual. Lo nuevo de `main` que tapa claves —los avisos a
  Executive Lab— pasa por `valoresDeClaves`, así que también tapa las de las aplicaciones.
- 05-10-2026, el aviso de las que ya estaban en las copias, sobre la misma rama (con `main` en
  `89f7dad`): `✓ las claves de una aplicación que ya están en las copias se dicen — se ven · la suelta
  sigue en lo suyo · encargo sin valores · tarjeta sin jerga`. Mutaciones, las seis muertas: nunca
  hay nada en las copias · se cuelan las de fuera de sitio · el encargo no dice que no se muevan ·
  sin tarjeta cuando no hay conexiones · Conexiones no lo recibe · el informe no lo dice. Suites:
  `humo.js` → **354 comprobaciones pasadas** · `contrato.js` · `empresas-distintas.js` ·
  `comprobar-diccionario.js`, todas en verde.

## Next

Un hueco que ya había y no abre esto, apuntado por el revisor de seguridad: la barra solo mira el
primer nivel. Un monorepo con `03-APP/apps/web/.env.local` no se deja fuera de las copias ni se
avisa; lo cubre el `.gitignore` de la aplicación, si lo tiene.

Y publicar, que es decisión de Jose: hasta entonces, norte-presupuestos sigue viendo el aviso.
