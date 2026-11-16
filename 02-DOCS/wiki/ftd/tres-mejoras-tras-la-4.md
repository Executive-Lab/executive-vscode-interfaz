---
type: ftd
title: Tres mejoras tras la 4
date: 2026-11-16
author: Jose Sanchis
branch: mejoras-tras-la-4
spec: mejoras-tras-la-4
status: in-progress
---

# Tres mejoras tras la 4

## Intent

Jose, 16-11-2026, de las mejoras propuestas tras publicar la 0.60.0: *«haz 1, 3 y 4»*.

1. **Un vigía de RSC.** RSC saca versiones cada pocos días. Con la 4, quien montaba RSC desde el chat se
   quedaba con una barra que miraba y no hacía, y se vio tarde. Para la barra, cualquier versión más nueva
   que la suya va por delante (`comoEsLaVersion`, P7): una carpeta que se pone al día sola a ella deja de
   recibir lo que escribe la barra. Una prueba semanal en GitHub coge la última RSC, pasa el contrato y
   abre una incidencia que dice si pasa.
2. **Los emoji, con un interruptor en Las reglas.** En la 200 se dejó la pregunta del montaje sin hacer.
   P9 dice que una preferencia se pregunta y no se rellena por defecto: un interruptor a un clic, junto a
   los de la decisión 172, con la orden oficial `rsc emoji on|off`.
3. **Las habilidades de venta de la 4, en los objetivos.** Embudo de venta, Diseño de la oferta,
   Investigación de clientes y Guion de vídeo de venta no salían en ninguna fila de `objetivos.json`.

## Scope

**Dentro**

- `.github/workflows/vigia-rsc.yml` y `herramientas/vigia-rsc.js`, con sus funciones probadas.
- El interruptor de los emoji en `reglas.js`, con las mismas guardas que los otros cuatro.
- Las cuatro habilidades en sus filas de `objetivos.json`, detrás de las de siempre.
- Pruebas, diccionario, decisión 201, la versión 0.61.0.

**Fuera**

- Publicar la 0.61.0: con el sí de Jose.
- Preguntar por los emoji en el montaje: el interruptor basta y no añade preguntas.
- Subir la barra de versión de RSC sola: el vigía avisa, no cambia nada.

## Checklist

- [x] 1. El vigía: decide con tres números, avisa una vez por versión, dice si el contrato pasa, y la parte
  que corre código de fuera no puede escribir en el repositorio.
- [ ] 2. El vigía corre de verdad en GitHub, por los dos caminos (al día y versión nueva).
- [x] 3. El interruptor de los emoji: estado, botones, orden oficial, comprobado en disco, con RSC fingido
  y con el de verdad.
- [x] 4. Las habilidades de venta en los objetivos, cada una en su turno.
- [x] 5. Diccionario, decisión 201, versión 0.61.0.
- [ ] 6. Batería entera, contrato, `--con-arnes`, y GitHub en verde.
- [ ] 7. PR abierta.

## Evidence

- **1.** «201: el vigía de RSC avisa…» en `humo.js`: decide igual que `comoEsLaVersion` con seis versiones alrededor
  de la de la barra, no se fía de nueve versiones raras, la línea de órdenes no dice nada con una versión que lleva
  otra línea dentro, el aviso dice pasa, falla o no se pudo, y en el fichero de GitHub el trabajo que corre RSC solo
  lee y el que escribe no corre nada de fuera. Vista caer con siete roturas a mano: fiarse de espacios, decir una
  versión rara, comparar al revés, dar `issues: write` al trabajo que corre RSC, la versión a pelo en una orden y un
  valor de GitHub dentro del script, y no forzar el modo seco con una versión de prueba. Contra npm de verdad: `fijada=4.1.7 ultima=4.1.7 como=igual`, y con
  `VIGIA_FIJADA=4.1.6`, `como=nueva`. El YAML se lee con un lector de verdad (y uno roto da error).
- **3.** «201: los dibujos en las respuestas…» con RSC fingido: vista caer antes del arreglo. Con el RSC de verdad,
  dentro de la batería larga: `rsc emoji off` pone `.rsc/.no-emoji` y `emoji` en `optOuts`, y `on` lo quita.
- **4.** La prueba de los objetivos pide las cuatro en su turno: vista caer antes de cambiar la tabla («Diseño de la
  oferta no sale»), y en verde después.
- **5.** `node docs/comprobar-diccionario.js`: en verde. Decisión 201 escrita; la 200, marcada publicada. 0.61.0 en
  `extension/package.json` y en el instalador.

### Controles por tarea (`/verify`)

- **Pruebas:** una sola pasada de `./publicar.sh`, después del último cambio: `--con-arnes` 585 de 585 (las 583 de
  la 0.60.0 y las dos nuevas; dentro, el interruptor con el RSC de verdad), `contrato.js` 15 de 15, las tres
  empresas y la recién montada enteras, diccionario y PowerShell sin pegas. Aparte, `mapeos-codex.js` 30 de 30.
- **Construir:** no hay compilación (JavaScript sin transpilar). Construir es empaquetar: `executive-lab-0.61.0.vsix`
  hecho en esa misma pasada.
- **Seguridad**, repasada a mano sobre el diff:
  - El código de fuera (la RSC recién bajada) corre en `probar`, con `contents: read` y sin credenciales guardadas
    (`persist-credentials: false`): no puede subir nada ni abrir incidencias.
  - Desde ahí puede escribir en las salidas de su paso, `contrato` y `fallos`: como mucho, que el aviso diga «pasa»
    cuando falla. No puede tocar `fijada`, `ultima` ni `como`, que salen de un paso anterior, ya cerrado.
  - En `avisar`, la versión se valida otra vez antes de escribirla (`elAviso` → `comoVa`), `contrato` va por una
    tabla y `fallos` por `Number`. Nada de GitHub entra en una orden ni en el script (la prueba lo exige).
  - Las acciones van por versión mayor (`@v4`, `@v7`), como en `windows.yml` y `avisos.yml`. Fijarlas por su
    código sería más fuerte; queda como está el resto del repositorio.
  - El interruptor: la orden sale de la tabla de la barra (`elBoton`, con `hasOwnProperty`), con las mismas guardas
    que los otros cuatro (confianza, carpeta preparada, arnés ocupado, carpeta por delante).
- **Trazabilidad:** cada cambio sale de uno de los tres puntos de Jose, más la versión y la decisión. Ninguno suelto.

### Revisión de tres lentes (pasó a ASDD)

El freno de la 4 (`asdd-gate`) paró la subida: el fichero de GitHub hace la rama de riesgo 2. Jose eligió ASDD
completo. Especificación: `02-DOCS/wiki/sdd/specs/mejoras-tras-la-4.md` (`rsc spec gate`: PASS, 8 puntos con tipo).
Tres revisores independientes, primera ronda:

- **Corrección.** Alta: con una RSC nueva el contrato caía siempre por la versión, y el aviso diría «falla» siempre.
  Arreglado con `como-si`; reproducido con paquetes de verdad en una copia (barra a la 4.1.6, arnés 4.1.7): 4 fallos
  sin, 15 de 15 con. Baja: con Codex solo salía el interruptor; ahora solo con Claude. Baja, se queda: versión rara o
  npm caído, ejecución en rojo sin incidencia (GitHub avisa por correo).
- **Seguridad.** Baja: una incidencia de cualquiera con el título callaba el aviso; ahora solo cuentan las del vigía
  (`queHacer`). Bajas que se quedan, en la especificación: acciones por versión mayor, y la marca que sigue un enlace
  (es de RSC y de los cinco interruptores).
- **Pruebas.** Las del YAML miraban una forma de escribirlo: `run: ${{ … }}` pasaba, y quitar los permisos propios de
  `probar` también. Ahora miran estructura (permisos exactos, lista cerrada de pasos de `avisar`, `--ignore-scripts`,
  `persist-credentials` como clave, orden y condiciones), y el «una por versión» y el «en seco» están en `queHacer`,
  probado. Dieciocho roturas (las que sobrevivían y las de los arreglos) caen todas; sana, pasa.

Segunda ronda, sobre los arreglos (831452c):

- **Corrección** y **seguridad**: resuelto, nada nuevo. Corrección repitió el contrato con paquetes de verdad (15 de 15
  con `como-si`) y lo vio caer con un RSC roto (11 fallos): el «pasa» no es automático.
- **Pruebas**: sin defectos en el código, con huecos en las pruebas. Se han cerrado:
  - `como-si` con una versión buena, por la línea de órdenes, con una copia del vigía en una copia. La batería ya no
    corre nada contra la barra de verdad.
  - Las órdenes del YAML, por línea entera.
  - Las claves de arriba, los disparadores, los trabajos y lo que llama el script que escribe, en lista cerrada.
  - `conClaude` con Codex delante y sin asistentes declarados.

Veintitrés roturas, sobre copias: caen veintidós. La que queda (un valor de GitHub en una variable de entorno) es el
diseño.

## Next

- Apuntar el panel en el registro de revisiones.
- 2 y 6: el vigía en GitHub, por los dos caminos, y GitHub en verde. 7: la PR.
