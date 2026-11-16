---
type: spec
title: Tres mejoras tras la 4 — el vigía de RSC, los dibujos a un clic y las habilidades de venta
description: Un aviso en GitHub en cuanto sale una RSC más nueva que la de la barra, un interruptor para los emoji en Las reglas y las habilidades de venta de la 4 en los objetivos del montaje.
timestamp: 2026-11-16T12:00:00Z
topic: sdd
status: approved
branch: mejoras-tras-la-4
---

# Tres mejoras tras la 4

**Aprobación.** Lo pedido lo aprobó Jose el 16-11-2026: *«de las mejoras, haz 1, 3 y 4»*, y, cuando el freno de RSC
paró la subida, *«Por ASDD completo»*. Esta especificación se escribió después del código, al saltar el freno
(`asdd-gate`, riesgo 2 por el fichero de GitHub Actions). Lo que se decidió sin él va en *Puntos a clarificar* como
suposición tomada, para revisar después. FTD: `02-DOCS/wiki/ftd/tres-mejoras-tras-la-4.md`. Decisión 201.

## Problema y por qué

- **RSC va por delante sin que nadie se entere.** Con la 4, quien montaba RSC desde el chat se quedó con una barra que
  miraba y no hacía, y se vio tarde. Para la barra, cualquier versión más nueva que la suya va por delante
  (`comoEsLaVersion`, P7), no solo una serie nueva: una carpeta que se pone al día sola a una 4.2 deja de recibir lo
  que escribe la barra. RSC saca versiones cada pocos días.
- **Los emoji son una preferencia que nadie pregunta.** La 4 pregunta por ellos al montar; la barra, en la 200, no
  añadió la pregunta y los deja encendidos. P9 dice que una preferencia no se rellena por defecto.
- **Las habilidades de venta de la 4 no se sugieren.** Embudo de venta, Diseño de la oferta, Investigación de clientes y
  Guion de vídeo de venta, hechas para una pyme, no están en ninguna fila de `objetivos.json`.

## Objetivos

1. Saber, sin mirar a mano, que hay una RSC más nueva y si el contrato pasa con ella, a la semana como mucho.
2. Que el alumno quite o ponga los emoji con un clic, sin preguntas nuevas en el montaje.
3. Que quien dijo «vender más», «atender mejor a mis clientes» o «hacer vídeos» vea las habilidades de venta de la 4.

## Fuera de alcance

- Subir la barra de versión de RSC sola: el vigía avisa, no cambia nada.
- Preguntar por los emoji en el montaje (decisión 184: el primer día, con menos preguntas).
- Publicar la 0.61.0: con el sí de Jose.
- Que el vigía vigile otros paquetes o las versiones de VS Code.

## Usuarios y contexto

- **Jose**, que lleva la barra y decide cuándo sube de RSC. Recibe la incidencia del vigía.
- **El alumno**, que no es técnico. Ve el interruptor en Las reglas › Cómo trabaja el asistente y las sugerencias en
  Ayuda › Sugerencias y en la idea del primer día.

## Comportamiento

- **El vigía.** Cada lunes (y a mano desde Actions) mira la última versión de `@ericrisco/rsc` en npm y la que lleva la
  barra (`extension/media/harness/package.json`). Si la última es más nueva, la instala en una copia desechable del
  arnés, pone la barra de esa copia como si ya la llevara (si no, la ve por delante y el contrato cae siempre por la
  versión), pasa `contrato.js` y abre una incidencia con el resultado: pasa, falla (con cuántas) o no se pudo pasar.
  Una por versión, abierta o cerrada, y solo cuentan las que abrió el propio vigía. Se puede lanzar en seco, y con
  una versión de prueba (siempre en seco).
- **El interruptor.** En una carpeta con Claude y con la pieza de la 4 (`.rsc/emoji-policy.mjs`) o con los emoji ya
  apagados (`.rsc/.no-emoji`), Las reglas enseña «Dibujos en las respuestas (emoji)», cómo está y un botón: «Quitar los
  dibujos» o «Poner los dibujos». El clic llama a `rsc emoji off|on`, mira el disco y dice lo que ha pasado.
- **Las sugerencias.** Las cuatro van detrás de las de siempre en sus filas; la barra ofrece la primera que no esté
  puesta.

## Qué podrá hacer el usuario

- Jose: enterarse por una incidencia de que hay una RSC nueva y de si la barra la aguanta, y probar el vigía a mano.
- El alumno: quitar o volver a poner los emoji con un clic, y recibir la sugerencia de una habilidad de venta cuando ya
  tiene las primeras de su objetivo.

## Qué resultado obtiene

- Una incidencia con la versión nueva, la de la barra, si cambia la serie, el resultado del contrato, el enlace a la
  ejecución y qué hacer.
- Una carpeta con `.rsc/.no-emoji` y `emoji` en `optOuts` de `.rsc.json` (o sin ellos), y el «Hecho.» de siempre.
- En Ayuda › Sugerencias, la habilidad de venta que toca, con su nombre en español.

## Qué debe respetar

- **El vigía corre código bajado de internet.** El trabajo que lo corre solo lee el repositorio y no guarda
  credenciales; el que abre la incidencia no corre nada de fuera. Ningún valor de GitHub entra a pelo en una orden ni
  en el script. Solo pasan versiones de tres números exactos (revisión de seguridad de P9, L1). El repositorio es
  público: una incidencia de cualquiera no puede callar el aviso.
- **El interruptor**, las guardas de los otros cuatro (decisión 172): confianza, carpeta preparada, arnés ocupado,
  carpeta por delante; la orden la elige la barra de su tabla, nunca el panel; la barra no escribe la marca a mano.
- **Todo texto de pantalla**, por el diccionario (P2). **Nada privado** en el repositorio público.

## Cómo lo demuestra

- `humo.js`: «201: el vigía de RSC…» (decide como `comoEsLaVersion`, no se fía de versiones raras, la línea de órdenes
  calla con una rara, el aviso, una por versión y solo las suyas, la barra como si la llevara, también por la línea de
  órdenes y sobre una copia, y el YAML mirado por su estructura: claves de arriba, disparadores y trabajos en lista
  cerrada, permisos exactos, pasos de cada trabajo, órdenes por línea entera, orden y condiciones, y lo que llama el
  script que escribe); «201: los dibujos…» (con RSC fingido, con Codex, con Codex delante y sin asistentes
  declarados); la prueba de los objetivos con las cuatro en su turno.
- `humo.js --con-arnes`: el interruptor con el RSC de verdad, la marca y su apunte en `optOuts`, y vuelta.
- Las pruebas nuevas, vistas caer: el vigía con las roturas de la primera ronda y con las dieciocho que la revisión
  de pruebas dejó vivas o que tocan los arreglos; en la segunda ronda, veintidós de veintitrés (la que queda, un valor
  de GitHub en una variable de entorno, es el diseño); las otras, antes de escribir su arreglo.
- El contrato con paquetes de verdad, en una copia: una barra que cree llevar la 4.1.6 con la 4.1.7 instalada cae en
  4 comprobaciones sin `como-si`, y pasa 15 de 15 con él.
- El vigía contra npm de verdad, y en GitHub por los dos caminos (al día, y con una versión de prueba) después de
  fusionar, porque GitHub solo lanza a mano los flujos que ya están en `main`.
- La revisión de tres lentes (corrección, seguridad, pruebas), apuntada en el registro de revisiones.

## Criterios de aceptación

1. Con la última igual a la de la barra, el vigía dice `como=igual` y no abre nada.
2. Con una más nueva, dice `como=nueva`, pasa el contrato con ella con la barra como si la llevara (y, si RSC no ha
   cambiado lo que la barra le manda, pasa) y abre una incidencia; con una ya avisada por el vigía, abierta o cerrada,
   no abre otra; una incidencia de otra persona con ese título no lo calla.
3. Con una versión que no sean tres números exactos, el vigía no dice nada y termina con error.
4. El trabajo que corre la RSC bajada tiene solo `contents: read` y `persist-credentials: false`; el que escribe no
   corre `npm`, `contrato.js` ni `preparar-paquete.js`.
5. Con una versión de prueba, el vigía va en seco.
6. En una carpeta de la 4 con Claude sale el interruptor encendido; con la 3, no; con Codex solo, ni con la pieza ni
   con la marca; con Claude, apagados y sin la pieza, sale para ponerlos.
7. El clic llama a `rsc emoji off|on`; si RSC dice que sí y la marca no cambia, la barra lo dice.
8. Con las dos primeras de su fila puestas, «Vender más y hacer seguimiento» sugiere Diseño de la oferta, y con esa
   también, Embudo de venta; «Atender mejor a mis clientes», Investigación de clientes; «Hacer vídeos», Guion de vídeo
   de venta.
9. Batería, contrato, `--con-arnes`, diccionario y PowerShell en verde, y GitHub en verde.

## Qué pasa si no lo construimos

- La próxima RSC (una 4.2, una 5) vuelve a dejar la barra mirando sin hacer en las carpetas montadas desde el chat, y
  se descubre cuando un alumno lo cuenta en clase.
- Los emoji siguen puestos por defecto sin que el alumno pueda quitarlos desde la barra: tendría que pedírselo al
  asistente, que es lo que la barra existe para ahorrarle.
- Las habilidades de venta solo salen si el alumno las busca en el catálogo.

## La alternativa más barata

- **El vigía:** mirar npm a mano cada semana. Es lo que no se hizo con la 4. Un aviso de Dependabot no sirve: el
  arnés no es una dependencia del manifiesto de la extensión, y no diría si el contrato pasa.
- **Los emoji:** dejar el botón «Cambiar lo que se comprueba», que se lo pide al asistente. Funciona, pero es una
  conversación para un interruptor.
- **Las de venta:** nada, el catálogo ya las tiene. Pero en Sugerencias solo sale lo que encaja con lo que dijo.

## Puntos a clarificar

- **suposición tomada** — El vigía corre los lunes a las 06:23 UTC, una vez a la semana, como se propuso. Base: RSC
  saca versiones cada pocos días y una semana de retraso es aceptable. Revisar si Jose lo quiere a diario.
- **suposición tomada** — Una incidencia por versión, contando las cerradas: cerrar una la da por vista. Base: que
  cerrar no sea inútil. Contrapartida: si se cierra sin subir de versión, no se vuelve a avisar de esa.
- **suposición tomada** — Las de venta van detrás de las de siempre, y Diseño de la oferta antes que Embudo de venta.
  Base: no cambiar lo que ya se sugería; primero qué se vende, luego por dónde.
- **suposición tomada** — Los textos del interruptor («Quitar los dibujos», «Poner los dibujos» y sus frases), escritos
  en el diccionario, sin que Jose los haya visto.
- **suposición tomada** — Versión 0.61.0, menor: el alumno ve dos cosas nuevas.
- **suposición tomada** — Si npm falla o devuelve una versión rara, la ejecución sale en rojo y no abre incidencia.
  Base: GitHub avisa por correo de un flujo con reloj que falla, a quien lo cambió por última vez. Revisión de la 201.
- **decisión diferida** — Fijar las acciones de GitHub por su código en vez de por versión mayor: el resto del
  repositorio va por versión mayor, y se cambia todo junto o nada.
- **decisión diferida** — Un `.rsc/.no-emoji` que sea un enlace colgante en una carpeta de confianza hostil: lo
  escribe RSC al seguir el enlace, igual que las marcas de los otros cuatro interruptores. Se endurece en conjunto,
  en RSC, no en este cambio (revisión de seguridad de la 201).
