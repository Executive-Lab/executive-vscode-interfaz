---
type: ftd
title: La barra en un monorepo
date: 2026-10-19
author: Jose Sanchis
branch: la-barra-en-el-monorepo
status: en curso
---

# La barra en un monorepo

## Intent

Jose, 19-10-2026: *«hay que adaptar la interfaz del arnés a un proyecto monorepo estilo
mono-repo-executive-lab»*. Esa forma es esta:

- **la raíz** lleva el arnés entero (`.rsc.json`, `.claude/`, `.codex/`, `01-TOOLS/`, `02-DOCS/`) y su
  propio git, que solo guarda el arnés y las áreas;
- **`03-PROYECTOS/<proyecto>/`** es, cada uno, un clon de su propio repositorio de GitHub, con su
  propio git. La raíz los deja fuera en su `.gitignore`. No llevan arnés: se trabaja siempre desde la
  raíz;
- **la documentación de cada proyecto** vive en la raíz, en `02-DOCS/wiki/proyectos/<proyecto>/`, con la
  misma forma que la de la raíz (`ftd/`, `sdd/`, `index.md`);
- **las áreas** (`04-OPERACIONES/` … `07-CONSULTORIA/`) son carpetas normales de la raíz.

La barra daba por hecho una carpeta, un git y una documentación. En esa forma, cuatro cosas salían mal:

1. **Lo de dentro de un proyecto se tomaba por desorden.** `sueltas.js` solo reconocía una aplicación por
   su manifiesto (`package.json` y compañía) en la carpeta del primer o del segundo nivel.
   `conectores-pymes` y `panel-inspeccion-fundae` no lo tienen arriba (`apps/`, `services/`, `datos/`).
   Medido con un monorepo de mentira y el código de `main`: una cuenta de servicio en
   `03-PROYECTOS/<proyecto>/` salía como fichero de acceso fuera de sitio, y el `.env` de un proyecto del
   primer nivel, como claves fuera de sitio. Las dos con un botón que se las llevaba a `01-TOOLS/`, y eso
   rompe el proyecto.
2. **«✓ Todo guardado» mentía.** Las copias solo miraban el git de la raíz, que ignora `03-PROYECTOS/`.
   Con un día de trabajo sin guardar en un proyecto, la barra decía que todo estaba guardado.
3. **No había proyectos.** Ni se veían, ni se podía decir «vamos a trabajar en este».
4. **Lo que se documenta de un proyecto no salía.** «En qué estamos» y «Seguir donde lo dejé» solo leían
   `02-DOCS/wiki/sdd/` y `02-DOCS/wiki/ftd/` de la raíz.

Y una quinta, al revés: abrir `03-PROYECTOS/<proyecto>/` sola ofrecía «Preparar esta carpeta», o sea montar
un segundo arnés dentro de un proyecto que no debe llevarlo.

## Decisión (192)

**Qué es un proyecto de dentro, leído del disco (P5).** Una carpeta del primer o del segundo nivel que
tiene su propio `.git` (carpeta o fichero: un clon, un worktree o un submódulo). Sin mirar las carpetas
con punto, `node_modules`, `01-TOOLS/` ni `02-DOCS/`, y con un tope de 30. Se llama como su carpeta. Su
documentación es `02-DOCS/wiki/proyectos/<nombre>/` si existe. No hace falta que la carpeta de arriba se
llame `03-PROYECTOS`: vale cualquier monorepo con esa forma.

1. **Lo de un proyecto no es desorden.** `sueltas.js` trata un proyecto de dentro como una aplicación: lo
   de dentro no se cuenta ni se mueve. Sus claves siguen en `paraProteger` (se tapan si se enseñan), pero
   nunca salen como fuera de sitio.
2. **Las copias dicen la verdad.** La línea de las copias solo dice «✓ Todo guardado» si la raíz **y**
   cada proyecto están guardados. Si un proyecto tiene cambios, la línea lo dice y lleva, para cada uno, su
   botón «Guardar «{proyecto}» en git».
3. **El apartado Proyectos**, en la pantalla principal, solo si hay alguno. Por cada proyecto, cómo está
   (cambios sin guardar, copias sin subir, en qué rama) y tres botones:
   - **Trabajar en «{proyecto}»**: un encargo al asistente con la carpeta, dónde están sus reglas y su
     documentación, y que sus cambios van a su propio git.
   - **Guardar «{proyecto}» en git**, si tiene cambios.
   - **Subir «{proyecto}» a GitHub**, si tiene copias sin subir.

   Guardar y subir **los hace el asistente, no la barra**, con un encargo de cuatro partes. Cada proyecto
   tiene sus reglas (cómo se escriben las copias, en qué rama, si subir a `main` publica una web o
   despliega), y saber cuáles son pide leer su documentación (P5: lo que hay que entender, se delega). La
   barra lee del disco cómo está cada uno; el asistente hace el resto. Subir es salir del ordenador en su
   nombre (P9): solo con el clic, y el encargo pide parar y preguntar si subir publica o despliega algo.
4. **La documentación de cada proyecto se ve.** «En qué estamos» lee también
   `02-DOCS/wiki/proyectos/<proyecto>/sdd/`, y cada cosa lleva el nombre de su proyecto. «Seguir donde lo
   dejé» mira también `02-DOCS/wiki/proyectos/<proyecto>/ftd/`.
5. **Un proyecto abierto solo manda a su monorepo.** Si la carpeta de arriba tiene arnés (`.rsc.json`), la
   barra no ofrece preparar esta: dice que es parte de «{monorepo}», que ya está preparada, y el botón es
   «Abrir «{monorepo}»». «Prepararla igual» sigue ahí, detrás.

**Lo que no cambia.** El guardado solo sigue sin correr en un historial que no creó la barra (P4), y en un
monorepo clonado lo es. La raíz se guarda como siempre, con «Guardar en git». La barra no escribe nunca en
el git de un proyecto: eso lo hace el asistente cuando la persona pulsa.

## Scope

- Dentro: `subproyectos.js` (nuevo), `sueltas.js`, `extension.js` (estado y acciones), `panel.js`
  (Proyectos y la línea de las copias), `piezas.json`, `proyectos.js`, `por-donde-ibas.js`, `terreno.js`
  y `arrancar.js` (el proyecto abierto solo), diccionario, decisión 192 y pruebas.
- Fuera: guardar o subir los proyectos desde la barra sin el asistente; la brújula con zonas por
  proyecto o por área; vigilar `03-PROYECTOS/**` para repintar (con sus `node_modules`, sería caro: se
  mira al repintar); el escaneo de RSC, que ve el código de los proyectos como evidencia del plan (eso es
  de RSC, y en un monorepo es verdad).

## Checklist

- [ ] `subproyectos.js`: reconoce los proyectos de dentro, cómo está cada uno y sus tres encargos.
- [ ] `sueltas.js`: un proyecto de dentro no es desorden.
- [ ] Copias: «✓ Todo guardado» solo con todo guardado; un botón por proyecto con cambios.
- [ ] Apartado Proyectos en la pantalla principal, con su pieza en `piezas.json`.
- [ ] «En qué estamos» y «Seguir donde lo dejé» leen la documentación de cada proyecto.
- [ ] Un proyecto abierto solo ofrece abrir su monorepo.
- [ ] Diccionario, decisión 192 y `humo.js` con un monorepo de mentira.
- [ ] Batería entera y mutaciones de lo importante.

## Evidence

(Se rellena con las pruebas al terminar.)

## Next

Empezar por `subproyectos.js` y `sueltas.js`: es lo que puede romper un proyecto.
