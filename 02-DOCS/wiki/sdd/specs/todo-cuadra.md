---
type: spec
title: Todo cuadra — lo que la barra enseña y hace cuadra con lo que RSC monta, en cualquier carpeta
description: Spec paraguas del programa todo-cuadra. El arranque monta con cualquier respuesta y en cualquier carpeta sin tocar lo de nadie. El alumno tiene freno y raíles de verdad. Las credenciales no se escapan. Cada pantalla dice lo que hay.
timestamp: 2026-09-24T15:45:00Z
topic: sdd
slug: todo-cuadra
status: shipped
approval: aprobada en autopilot, no punto por punto
shipped_in: 0.41.0 (verificación del 28-09-2026; C2 en Windows, medido en la decisión 129)
---

# Todo cuadra

> Slug: `todo-cuadra` · Hereda: [la constitución](../constitution.md) · Investigación, con fichero y
> línea: [la propuesta](../proposals/todo-cuadra.md) · Creada: 24-09-2026

## Problema y por qué

La barra existe para que alguien que no programa trabaje con un arnés de IA sin ver sus tripas. Su
promesa central es que **lo que enseña es lo que hay** (P3, decisión 7). La auditoría del
24-09-2026 encontró que esa promesa se rompe justo donde más importa:

- **El primer minuto.** Dos respuestas del arranque impiden montar el arnés: «Un poco de todo», y
  «Construir algo» cuando va para largo. El alumno ve «No he podido montar el arnés» y no puede hacer
  nada.
- **La protección.** La mayoría de los alumnos no tienen el freno que para una orden capaz de borrar
  sin vuelta atrás, y la barra dice que sí lo tienen. Son los que llevan el día a día, los que crean
  contenido y los que estudian un tema. Si además no hay Node en el ordenador, no corre ninguna de
  las piezas automáticas del arnés.
- **El día a día:**
  - las reglas que fijan el español y prohíben mandar a la terminal pueden no cargarse;
  - una contraseña con un símbolo se guarda rota;
  - un fichero de credenciales suelto sube a GitHub con «Guardar en git»;
  - «Resolver una incidencia» no funciona;
  - varias pantallas enseñan un cero, un texto en crudo o «ya estaba montado» donde hay otra cosa.

## Coste de no construirlo

- **Carpetas sin arnés.** Cada alumno que elija «Un poco de todo», la opción de quien «todavía no lo
  tiene claro» (o sea, de muchos el primer día), se queda sin arnés en la primera clase, y el tutor
  con él.
- **Sin freno.** La mayoría trabaja sin freno creyendo que lo tiene. La primera orden de borrado
  equivocada del asistente se ejecuta sin preguntar. Es el fallo más caro de todos y el único que no
  se deshace.
- **Credenciales en GitHub.** Una cuenta de servicio de Google no caduca; lo único que la inutiliza
  es revocarla.
- **Desgaste.** Una pantalla que miente un poco cada vez enseña al alumno a no fiarse de la barra, y
  la barra es lo único que tiene.

## La alternativa más barata

**Decirlo sin arreglarlo.** Quitar las dos respuestas que no montan, cambiar el texto de los frenos
por «puede que no haya freno» y apuntar lo demás para el tutor. Cuesta una tarde.

**Por qué no basta:**
- Quitar respuestas deja sin opción a quien no sabe qué es lo suyo. La respuesta es del alumno, no
  nuestra (decisión 18).
- Decirle «puede que no haya freno» a alguien que no es técnico no le protege de nada.

**Lo que sí se toma de esta alternativa:** donde no se pueda arreglar (lo que es de RSC), decirlo es
obligatorio.

### Encuadre

- **Quién sufre**: un alumno de pyme no técnico, el primer día y los siguientes; y su tutor.
- **Qué hace hoy**:
  - si alguien le avisa, cambia de respuesta;
  - con los frenos no hace nada, porque no sabe que faltan;
  - con el resto, el tutor lo arregla a mano o no se entera.
- **Qué tiene que cambiar**:
  - montar con cualquier respuesta, en cualquier carpeta, sin tocar lo de nadie;
  - que haya freno;
  - que cada pantalla diga lo que hay.
- **Restricciones**:
  - RSC 2.0.5 va fijado y no es nuestro;
  - P1–P8;
  - nada pide permisos de administrador;
  - Windows no se puede probar aquí.
- **Sabido y supuesto**. Sabido: todo lo de la propuesta, leído con fichero y línea y con la línea
  base de 198 comprobaciones. Supuesto: dos cosas que se miden en el plan:
  - que el relevo de Node funciona con Claude Code dentro de VS Code;
  - cómo se comporta todo en Windows.

### Direcciones que se pesaron

1. **No construirlo: decirlo.** Es la de arriba, descartada por lo que queda escrito.
2. **Solo los críticos y los altos.** Es más barata, pero los medios son la misma clase de fallo y se
   volverían a descubrir uno a uno.
3. **Todo, por fases, cada una con su comprobación.** Es la elegida: la pidió Jose (*«todo, todo,
   todo, tiene que estar todo perfecto»*).

### La objeción que se hizo

Lo más fuerte que se puede decir en contra es **la anchura**. Son unos 25 módulos, en un proyecto
donde otras sesiones escriben a la vez, y los arreglos medios y bajos suman riesgo a cambio de poco
valor cada uno. Jose eligió el alcance entero. Queda escrito aquí, y se acota con tres cosas:

- fases pequeñas, con prueba roja primero;
- un commit por fase, que se puede revertir solo;
- una rama propia, que no entra en `main` sin él.

## Objetivos

- Montar funciona con cualquier combinación de respuestas del arranque.
- En una carpeta que ya era de alguien, nada suyo cambia sin que lo sepa y lo acepte.
- Todo alumno no técnico o intermedio con Claude tiene freno ante órdenes peligrosas, en cualquier
  clase de proyecto, y la barra dice cuál tiene. Con Codex no hay freno, y la barra lo dice.
- Las reglas de Executive Lab están en cada sesión desde el primer mensaje, con Claude y con Codex.
- Una credencial no entra en una copia sin querer, y una clave guardada funciona tal como se pegó.
- Cada pantalla dice lo que hay: nada de ceros donde no puede haber otra cosa, nada de «ya estaba»
  donde falta algo, nada de textos en crudo.
- Lo que es de RSC y no se puede arreglar aquí queda contado a Eric.

## No-objetivos / fuera de alcance

- Cambiar RSC. Lo suyo se cuenta, no se parchea dentro de su paquete.
- Publicar la barra, subir a GitHub o unir a `main`: lo decide Jose.
- Probar en Windows: se deja la prueba escrita.
- Firmar los instaladores.
- Ofrecer asistentes nuevos (Cursor, Copilot…). Solo que una carpeta ya montada para ellos no se rompa
  ni mienta.
- Rediseñar pantallas: solo lo necesario para que digan la verdad.
- Traducir los mensajes que el propio RSC escribe en inglés dentro de la conversación.
- Frenos para Codex: RSC no le engancha piezas automáticas, y aquí no se inventa un mecanismo que
  Codex no tiene. Se dice.
- Replicar los otros guardianes de RSC (el de git con emoji y el de trabajo a medias) donde RSC no
  los pone: el freno propio es solo el de órdenes peligrosas.

## Usuarios y contexto

- **El alumno.** Lleva una pyme o trabaja en una y no programa (perfil de la constitución). Usa
  Claude o Codex, en Mac o en Windows, sobre una carpeta vacía o sobre una con sus cosas: facturas,
  una web, un proyecto de otro.
- **El tutor.** Recibe el código de «Algo va mal» y tiene que poder fiarse de lo que dice.
- **Jose.** Mantiene esto y usa la barra sobre repositorios suyos que ya existían. Es el brownfield
  real, y de ahí salieron la mitad de los hallazgos.

## Comportamiento

**El camino principal.**
1. El alumno abre una carpeta, contesta las preguntas y el arnés queda montado.
2. Al terminar, el asistente recibe lo que necesita para empezar: de quién es la carpeta, qué falta
   por saber y si hay freno.
3. En cada sesión, el asistente trae las reglas de Executive Lab.
4. Cuando el alumno guarda en git, en la copia entra su trabajo y no sus credenciales.
5. Cada pantalla enseña lo que hay en disco, en español.

**Carpetas que no son la de siempre:**
- **Una carpeta de alguien:** se dice qué se va a tocar y se pide el sí. Si choca un nombre, se
  pregunta si sobrescribir o renombrar.
- **Un clon:** se reconoce y se trae lo que le falta.
- **La carpeta personal, la raíz del disco o una del sistema:** no se preparan, y se explica por qué.
- **Una carpeta dentro de otro proyecto:** se avisa antes de preparar nada.
- **Un montaje a medias, nuestro:** se ofrece terminarlo.
- **Una versión del arnés más nueva que la de la clase:** se dice, y no se baja sin permiso.

**Cuando algo falla:**
- Nunca se queda en silencio (P3): se dice qué pasó, con una salida (P1).
- Lo que no se puede arreglar aquí, porque es de RSC o de Windows, se dice en pantalla y se deja
  apuntado.
- Nunca se enseña el valor entero de una credencial. Como mucho, sus cuatro últimos caracteres,
  para reconocerla, que es lo que la barra ya hace.

## Criterios de aceptación

Cada criterio lleva el identificador del hallazgo de la propuesta que cierra. Todos son binarios y se
comprueban en `verify`, **en un Mac**. Lo de Windows se entrega con su prueba escrita (decisión
diferida).

**Qué quiere decir «queda montado».** RSC aplicó el plan y la barra puso sus raíles. Hay dos casos:

- RSC dice que está listo;
- RSC dice que falta el suelo, y la barra lo ofrece con un botón (A3).

**«Listo»** es más estricto: solo cuando el arnés también lo daría por listo (G7).

### A · El arranque

- **A1.** Dada una carpeta vacía, cuando el alumno elige «Un poco de todo» y contesta el resto,
  entonces el arnés queda montado.
- **A2.** Dada una carpeta vacía y «Construir algo», cuando elige cualquier combinación de alcance y,
  si sale, de qué va a construir, entonces el arnés queda montado.
- **A13.** El arranque hace tres preguntas nuevas.
  - A todo el mundo, **qué va a llevar la carpeta**: una tarea concreta, un proyecto, un departamento
    o un área, o la empresa entera.
  - A todo el mundo, **cuántas personas están metidas**: solo yo, de 2 a 10, de 11 a 50 o más de 50.
  - Con «Construir algo» y con «Un poco de todo», **qué va a construir**. Las respuestas llevan
    ejemplos: una cosa concreta, algo que irá sumando piezas, una plataforma completa, y «No lo sé
    todavía». Con «Un poco de todo», además, «Nada, o casi nada».

  El tamaño que se le manda a RSC sale solo de la tercera. Las dos primeras van en el perfil y en el
  primer mensaje al asistente, y la primera decide además cómo se pregunta el nombre. Volver a montar
  las conserva.
- **A3.** Dado un plan que practica SDD, cuando RSC dice que lo aplicó pero falta el suelo, entonces
  la barra pone sus raíles, sus nombres y sus enganches, y ofrece con un botón levantar lo que falta.
  Y cuando RSC dice que lo deshizo, la barra dice que no se pudo montar.
- **A4.** La pregunta de cuánto explicar ofrece los cuatro niveles que ofrece RSC, con los mismos
  nombres y frases que «Cómo te habla».
- **A5.** Dada una carpeta con un proyecto de software, cuando se prepara, entonces la primera
  opción de objetivo es seguir con lo que ya hay, y el tipo sale sugerido por lo que se ve.
- **A6.** Dado un montaje nuevo, el primer mensaje al asistente hace tres cosas: le pide completar el
  perfil (a qué se dedica, qué herramientas usa, qué no se puede tocar), dice si hay freno y le pide
  preguntar de una en una. En una carpeta ajena, dice además que ya era de alguien.
- **A7.** Dado un montaje que deja trabajo pendiente para el asistente, ese trabajo le llega o sale
  como pieza con su botón. Ninguno se queda solo en el registro interno.
- **A8.** El número de preguntas que anuncia la pantalla es el que se hace.
- **A9.** Dado un ordenador sin ningún asistente instalado, cuando se prepara una carpeta, entonces
  se ofrece instalarlo con un botón, en vez de montar para uno que no está.
- **A10.** Un objetivo escrito con cualquier carácter llega entero al arnés.
- **A11.** Dado un alumno que eligió «irá creciendo», cuando el asistente guarda en git con un
  mensaje en español, entonces no se le deniega.
- **A12.** Dado un nuevo montaje sobre una carpeta que ya tenía uno, cuando el plan nuevo cambia lo
  que se instala, entonces se enseña qué cambia y no se acepta sin su sí.

### B · Las carpetas

- **B1.** Dada la carpeta personal, la raíz del disco o una carpeta del sistema, entonces no se
  prepara, se explica por qué y se ofrece crear una carpeta nueva **dentro de la carpeta
  personal**: nunca en la raíz ni en una del sistema, que pedirían administrador. Si es
  Escritorio, Documentos o Descargas enteras, se pregunta primero.
- **B2.** Dado un clon de una carpeta preparada por la barra, entonces se reconoce como clon y se
  trae lo que le falta. No dice «ya estaba».
- **B3.** Dado un alumno que eligió seguir sin copias, cuando pulsa preparar, entonces se monta sin
  copias. El aviso no vuelve a salir para siempre.
- **B4.** Dada una carpeta ajena, antes de montar se enseña en palabras llanas qué ficheros suyos se
  van a tocar, y se pide el sí. Por cada habilidad, comando o agente suyo con el mismo nombre que uno
  del arnés, se pregunta si sobrescribirlo (y se dice dónde queda la copia) o renombrar el suyo. Sin
  respuesta, no se monta.
- **B5.** Dada una carpeta montada con una versión del arnés más nueva que la de la clase, se dice, y
  no se baja de versión sin pulsar.
- **B6.** Dado un historial creado por la barra, cuando la persona tiene su propia identidad de git,
  entonces el guardado automático sigue funcionando. La barra no escribe **por su cuenta** en un
  historial que no creó: ni el guardado automático ni el punto de partida. Cuando es la persona quien
  lo pide, con el botón o al asistente, es acto suyo y se guarda. Un clon de un historial que creó la
  barra cuenta como suyo.
- **B7.** Toda rama que monta sobre una carpeta sin historial la deja con historial, salvo que el
  alumno eligiera seguir sin copias. La lista de piezas no dice que hay copias cuando no las hay.
- **B8.** Dado un montaje nuestro que quedó a medias, se ofrece terminarlo, y no se pide permiso como
  si fuera de otro.
- **B9.** Dada una carpeta dentro de otro repositorio o de otro arnés, se dice antes de montar. Con
  varias carpetas abiertas, se dice con cuál trabaja.
- **B10.** Dado un punto de partida que no se pudo guardar, se dice.
- **B11.** Dado un nuevo montaje, el dial y los asistentes que la persona tiene hoy se conservan,
  salvo que los cambie en ese mismo montaje.
- **B12.** Lo que alguien escribió en su fichero de instrucciones cuenta como suyo, aunque esté junto
  a un bloque del arnés.

### C · Frenos y piezas automáticas

- **C1.** Dado un alumno no técnico o intermedio con Claude, en cualquier clase de proyecto, cuando
  el asistente va a correr una de las órdenes que deniega el freno de RSC 2.0.5, entonces se le
  deniega. Para `verify` sirve esta lista cerrada:
  - `rm -rf` de una carpeta;
  - `git push --force`;
  - `git reset --hard`;
  - `DROP TABLE`;
  - un `DELETE` sin `WHERE`;
  - `curl … | bash`.

  «Las reglas» dice qué freno hay y de quién es. Con Codex, «Las reglas» y el cambio de asistente
  dicen que no hay freno. Con un perfil técnico, el freno no actúa y se dice por qué.
- **C2.** Dado un ordenador sin Node, cuando se abre una sesión nueva desde la barra, corren las
  piezas automáticas del arnés (la brújula, el freno, la memoria) y no sale ningún aviso de error.
  Todo lo que la barra pone para eso vive fuera de la carpeta del alumno (P8). Si no se consigue, la
  pieza lo dice en «Qué falta por montar», con un botón para intentarlo otra vez, y sin pedir
  administrador.
- **C3.** Después de montar, el fichero de ajustes que viaja en git queda igual que en el
  repositorio, sin rutas de este ordenador.
- **C4.** Dada una versión nueva del arnés publicada, el asistente no ofrece actualizarse.
- **C5.** «Lo que tiene apagado» nombra en español cada pieza apagada, sin repetir ninguna. La
  memoria apagada sale como apagada.
- **C6.** Que haya freno o no no depende de qué orden del arnés corrió la última vez.

### D · Los raíles

- **D1.** Dada una sesión nueva con Claude, las reglas de Executive Lab están en su contexto desde el
  primer mensaje. Con Codex, el fichero que lee siempre nombra la habilidad y le pide leerla antes
  de nada.
- **D2.** Las órdenes del arnés que corre el asistente usan la versión de la clase, e instalar una
  habilidad no cambia la versión de la carpeta.
- **D3.** La habilidad no remite a ficheros que no están en la carpeta, y trae la lista completa de
  palabras prohibidas.
- **D4.** Con Codex, lo que se repite se ofrece como habilidad propia, no como comando.
- **D5.** Después de pedir que explique más o menos, la barra y el asistente leen el mismo valor del
  dial, lo haya escrito quien lo haya escrito.
- **D6.** Unos raíles de una versión anterior se detectan por cualquiera de sus piezas.

### E · Asistentes

- **E1.** Cambiar a otro asistente lo deja montado para él, y la elección sobrevive a cualquier orden
  del arnés. Cambiar **sustituye** con quién se habla y **suma** lo montado: lo del asistente de
  antes se queda donde estaba.
- **E2.** Con dos asistentes declarados, los dos tienen sus raíles, y todas las pantallas coinciden
  en con cuál se habla.
- **E3.** Una carpeta montada fuera para otro asistente se lee en sus formatos, o se dice qué no se
  lee.

### F · Credenciales, conexiones y copias

- **F1.** Dado un fichero de credenciales suelto en la raíz o en una carpeta de primer nivel, cuando
  se guarda en git, entonces no entra en la copia. Se dice, con un botón para ponerlo en su sitio.
  - *Qué cuenta como credencial:* lo que ya reconoce el inventario de claves y de ficheros de acceso
    (decisiones 104 y 105).
  - *Por dónde se guarda:* por los tres caminos, el botón, el guardado automático y el asistente. Por
    los dos primeros, porque la barra lo deja fuera; por el tercero, porque lo que no entra en git
    lo excluye.
- **F2.** Ninguna pantalla ni ningún informe de la barra enseña el valor entero de una credencial.
  Tampoco el token de GitHub, ni siquiera cuando falla una subida.
- **F3.** Dada una clave con cualquier carácter, cuando se guarda y se prueba la conexión, la prueba
  recibe exactamente lo que se pegó, y no se ejecuta nada.
- **F4.** Los guiones nuevos de una herramienta corren en el ordenador del alumno. Si uno necesita un
  programa que no está, se dice cuál falta.
- **F5.** La primera copia de una carpeta nueva no lleva rutas de este ordenador.

### G · Mapeos, diagnóstico y conocimiento

- **G1.** «Resolver una incidencia» abre el encargo con el diagnóstico, sea cual sea el síntoma.
- **G2.** La barra usa el arnés y los módulos que lleva dentro, aunque en el ordenador haya otros de
  un instalador antiguo.
- **G3.** «Algo va mal» dice que el arnés está mal cuando el diagnóstico del arnés lo dice. La lista
  de lo que falta enseña nombres, no textos en crudo ni rutas.
- **G4.** Una habilidad que no está en disco no sale como instalada ni con botón.
- **G5.** Los comandos que monta el arnés salen con su nombre en español y entre los del arnés.
- **G6.** Salen las preguntas sin contestar que apuntó el arnés, y las ya contestadas no. Lo que es
  andamio del arnés no cuenta como conocimiento de la empresa.
- **G7.** La barra solo dice «Listo» cuando el arnés también lo daría por listo.

### H · Documentación y diccionario

- **H1.** La documentación dice lo que hay hoy: el número de preguntas, la versión, los requisitos y
  cómo se comprueba.
- **H2.** Una sola lista de palabras prohibidas vigila todo texto de pantalla, también el del
  catálogo, los nombres y los instaladores. Ninguna comprobación sale siempre saltada.
- **H3.** Ningún fichero está a la vez guardado e ignorado en git. La descripción de la confianza en
  el manifiesto de la barra dice lo que hace el disfraz.
- **H4.** Los mensajes que mandan a «Algo va mal» dicen qué hacer con el código.
- **H5.** Lo que es de RSC queda escrito en `docs/para-rsc.md`, con fichero y línea, listo para
  mandar. Mandarlo lo decide Jose.
- **H6.** Las decisiones siguen numeradas a partir de la 116.

### I · Las pruebas que faltaban

- **I1.** Una comprobación recorre todas las respuestas del arranque contra el arnés empaquetado. En
  los casos que practican SDD, además, las monta.
- **I2.** Una comprobación manda a la extensión cada mensaje que puede mandar el panel, y ninguno
  revienta.
- **I3.** Hay montajes de verdad para estas carpetas:
  - vacía, para operaciones, para «un poco de todo» y para software que crece;
  - empezada, con historial ajeno;
  - un clon real;
  - otro montaje, con choque de nombres.

## Decisiones de Jose

Tomadas el 24-09-2026, en la fase de plan:

1. **Freno propio** donde RSC no pone el suyo. Es una copia fijada del de RSC (MIT), con el mismo
   interruptor, y se le cuenta a Eric.
2. **Rama propia**, esperando a que las otras sesiones estén paradas.
3. **Carpeta de alguien**: se confirma antes de montar. Por cada nombre que choque, se pregunta si
   sobrescribirlo o renombrar el suyo.
4. **Sin Node**: el Node que ya trae VS Code, con un relevo. Si no sale limpio, se descarga el
   oficial sin administrador.

## Puntos a clarificar

- **suposición tomada** — Una spec paraguas y no siete. *Base:* la aprobó Jose en el plan; cada
  frente es una fase con su verificación, su decisión y su commit. *Riesgo:* si un frente crece, se
  saca a su propia spec.
- **suposición tomada** — El freno propio es una copia exacta del de RSC 2.0.5, envuelta por una
  comprobación que no lo activa cuando el de RSC está puesto. *Base:* la decisión 1 de Jose y la
  licencia MIT. *Riesgo:* si RSC lo cambia en otra versión, la prueba de igualdad avisa al subir.
- **suposición tomada** — En las carpetas de alumno se apaga el guardián de gitmoji (A11). *Base:* la
  decisión 94. Además, la barra enseña el asunto de cada copia como su nombre, y «✨ feat: …» no es
  un nombre para un alumno. *Riesgo:* si Jose prefiere el formato de RSC, se quita el interruptor y
  el raíl de guardar escribe en ese formato. **Jose puede vetarlo en la parada de vocabulario.**
- **suposición tomada** — La puerta SDD de cada turno se queda para quien elige «irá creciendo».
  *Base:* RSC la pone porque el plan practica SDD, y el alumno no la ve. *Riesgo:* si el asistente
  se vuelve ceremonioso con un alumno que no es técnico, se apaga como las demás.
- **suposición tomada** — La carpeta personal, la raíz del disco y las carpetas del sistema no se
  preparan; Escritorio, Documentos y Descargas enteras se preguntan. *Base:* B1. *Riesgo:* quien de
  verdad quiera trabajar en Documentos tiene que confirmarlo una vez.
- **suposición tomada** — El experimento del relevo de Node decide entre el Node de VS Code y el
  oficial (decisión 4). *Base:* es el único punto que depende de cómo lanza Claude Code sus
  procesos, y eso solo se sabe midiéndolo. *Riesgo:* si ninguno de los dos sale limpio en Mac, C2 se
  queda en decirlo y ofrecer el oficial.
- **pregunta abierta** — El vocabulario nuevo de pantalla (P2): la lista se le enseña a Jose en la
  parada de vocabulario, antes de pintar nada.
- **decisión diferida** — Windows: el relevo en Git Bash y en PowerShell, el corte de una dirección
  de más de 2.048 caracteres y el instalador `.exe`. Quedan con su prueba escrita.
- **decisión diferida** — Firmar los instaladores.
- **área no formulable** — Cómo se vive en clase que el freno pare algo. Su mensaje es de RSC y está
  en inglés, y la barra no puede interceptarlo. Sospecho que hará falta explicarlo en la conversación
  y todavía no sé enunciar la pregunta.

## Aclaraciones (`clarify`, 24-09-2026)

Se leyeron la spec, la constitución y el perfil (técnico, L1). Todo lo que se pudo resolver leyendo
el código y RSC está resuelto aquí, con su fuente. Lo único que se le pregunta a Jose es el
vocabulario, en la parada de la sección siguiente.

**Resuelto leyendo el código**

- **C-1 · Qué es «el freno».** Es el freno ante órdenes peligrosas. Los otros dos guardianes de RSC,
  el de git con emoji y el de trabajo a medias, no se replican (ver fuera de alcance). *Base:* la
  decisión 1 de Jose habla de ese freno.
- **C-2 · Qué es «una carpeta de alguien».** Cualquier carpeta que no esté vacía al prepararla: una
  empezada o una con otro montaje. En todas se enseña el resumen, aunque diga «no toco nada tuyo,
  solo añado». *Base:* la decisión 3 de Jose y P4.
- **C-3 · Varios choques de nombre a la vez.** Una sola pantalla con todos, una elección por cada uno
  y un «lo mismo para todos». *Base:* la regla 4 de la habilidad (una pregunta cada vez) y P1.
- **C-4 · Los raíles que se reponen solos y P4.** Hoy los raíles se reponen solos al abrir
  (decisión 108). En una carpeta cuyo historial no creó la barra, las piezas nuevas que tocan ficheros
  de esa persona no se ponen en silencio. Son el bloque de sus instrucciones, el de lo que no entra en
  git y el freno. Se ofrecen, cada una con su botón, en «Qué falta por montar». En las carpetas que
  creó la barra, se reponen como hoy. *Base:* P4.
- **C-5 · Qué carpetas no se preparan.** Hay una lista cerrada para cada sistema, y se compara con
  el sitio real de la carpeta, resolviendo enlaces, iCloud y OneDrive.
  - No se preparan: la carpeta personal, la raíz del disco, las del sistema y cualquiera que contenga
    la personal.
  - Se pregunta antes: Escritorio, Documentos o Descargas enteras, también sus versiones en iCloud y
    OneDrive.
- **C-6 · Los niveles de explicación (A4).** El arranque usa los cuatro escalones que ya tiene «Cómo
  te habla»: *Al grano*, *Corto*, *Te explica por qué* y *De la mano*, con sus frases. Un dial, un
  nombre, y ninguna palabra nueva. *Base:* `trato.js` y la decisión 98.
- **C-7 · El dial con dos nombres (D5).** Ya lo resuelve la barra: lee las dos formas y escribe donde
  estén (decisión 33). Lo que falta es B11, que volver a montar no pise el dial de hoy. El criterio D5
  queda como prueba de que siga así.
- **C-8 · Cuánto recorre la comprobación de contrato (I1).** No recorre todas las combinaciones
  posibles. Cada valor de cada pregunta sale al menos una vez, cada tipo de proyecto se prueba con
  cada tamaño que le corresponde, y los casos que practican SDD se montan de verdad. *Base:* cada
  plan tarda segundos, y RSC valida campo por campo.
- **C-9 · Si falla una escritura.** Si no se puede renombrar una habilidad suya ni escribir el bloque
  de git o los ajustes, se dice y no se monta (P3, P1).
- **C-10 · «Ponerla como la de la clase» (B5).** Nombra antes las habilidades que la versión de la
  clase no trae, y las quita de la declaración solo con el sí. Sin el sí, no se toca nada.
- **C-11 · Cómo se vive el freno en clase.** Era el área no formulable y **se gradúa y se cierra**. El
  mensaje del freno ya le pide al asistente que explique el riesgo en palabras llanas y proponga otra
  orden más segura. Con D1, las reglas de español están cargadas. Los raíles lo dicen explícito en
  sus innegociables.
- **C-12 · Qué es «la versión de la clase».** La del arnés que viaja dentro de la barra: hoy, la
  2.0.5. *Base:* P7.

**Lo que cambió la revisión con ojos frescos** (`specify`, paso 8). Encontró diez cosas; seis
bloqueaban el plan. Todas se arreglan aquí:

- **C-13 · P4 no admitía la decisión 3 de Jose** (renombrar o sobrescribir algo suyo). Se enmienda
  P4 en la constitución: hace falta su sí explícito, la copia tiene que poder recuperarse y, sin
  respuesta, no se monta. Mejor enmendar la regla que saltársela en silencio.
- **C-14 · El freno se acota** a las órdenes que deniega el de RSC 2.0.5, con una lista cerrada para
  `verify`. Actúa con perfil no técnico e intermedio, igual que el de RSC, y el objetivo lo dice.
- **C-15 · Codex tiene su criterio.** Sin freno, y dicho. Las reglas le llegan por su fichero de
  siempre (C1 y D1).
- **C-16 · Qué quiere decir «no se escribe nunca» (B6).** Se refiere a lo que la barra hace por su
  cuenta. Cuando lo pide la persona, es acto suyo. Un clon de un historial de la barra sigue siendo
  suyo.
- **C-17 · C2 es binario también cuando falla.** Si no se consigue, se dice y hay botón. Todo vive
  fuera de la carpeta del alumno (P8) y nada pide administrador.
- **C-18 · Credenciales.** F1 dice qué cuenta como credencial y por qué tres caminos se guarda. F2
  vale para cualquier credencial y cualquier informe. Y el comportamiento pasa a decir «nunca
  entero», porque la barra enseña a propósito los cuatro últimos caracteres (antes decía «ni en
  parte», y eso contradecía lo que ya hay).
- **C-19 · Tres precisiones de una línea:**
  - dónde se verifica (en un Mac) y qué es «montado» frente a «Listo»;
  - B11 cede ante lo que se cambie en ese mismo montaje, y E1 sustituye con quién se habla pero
    suma lo montado;
  - la carpeta nueva de B1 va dentro de la personal.
- **C-20 · H3 y H5, binarios.** H3 se acota a la descripción de la confianza en el manifiesto. H5
  queda en «escrito y listo para mandar»: mandarlo lo decide Jose.

**Lo que decidió Jose en la parada** (24 y 25-09-2026)

- **C-21 · Tres preguntas fáciles en vez de «grande o pequeño».** Jose: *«eso de grande y pequeño
  puede ser difícil de decidir para el alumno […] quiero que sea fácil»*. Después: *«no es lo mismo
  un departamento de 3 personas que de 50»* y *«un arnés para llevar un proyecto de una landing no
  es lo mismo que para una plataforma completa SAAS multiidioma con backoffice»*.

  Cada pregunta contesta una sola cosa, y todas se contestan con un dato, no con una opinión (A13):
  - **qué lleva la carpeta**: el alcance;
  - **cuánta gente hay detrás**: las personas;
  - **qué se va a construir**: el tamaño del software.

  El tamaño que se le manda a RSC sale solo de la tercera, porque una empresa entera puede querer
  una landing:
  - «Una cosa concreta», «No lo sé todavía» y «Nada, o casi nada» van como `small`;
  - «Algo que irá sumando piezas» va como `growing`;
  - «Una plataforma completa» va como `complex`.

  Son las tres de RSC, con sus propias definiciones. RSC solo distingue pequeño de no pequeño
  (`softwareScope !== 'small'`), y sube solo si el objetivo habla de pagos, cobros, bases de datos o
  integraciones, o si lo ve en los ficheros. El alcance y las personas van al perfil, al nombre
  sugerido y al primer mensaje, que es lo que el `init` de RSC pregunta en su descubrimiento. Si el
  proyecto crece, RSC lo detecta y la barra lo propone con su sí: nada queda atado.
- **C-22 · Los demás textos los decide el plan con un criterio de Jose.** *«gente no técnica que
  va a gestionar proyectos variados […] desde un departamento hasta un proyecto suelto, hasta una
  tarea puntual y hasta una empresa entera»*. Nunca «tu empresa» por defecto (dice lo mismo la
  regla «No se llama empresa» del diccionario). Cada texto entra en el diccionario al usarse, con el
  comprobador en verde, y al cerrar cada fase se le enseñan las pantallas pintadas para que los
  cambie. La tabla de vocabulario de abajo es el punto de partida, no la lista cerrada.
- **C-23 · «La versión de la clase», en D2, es la de `catalogVersion` mientras la carpeta está en la
  de la clase** (revisión de F4, m11; 25-09-2026). En una carpeta montada con una más nueva (B5), la
  regla 7 no la baja ni la sube: el paquete va con la que declara la carpeta, y la barra no añade
  nada hasta que se pulsa «Ponerla como la de la clase» (revisión de F4, I2). Así ninguna vía cambia
  la versión de una carpeta sin que alguien lo decida.
- **Apagar el guardián de gitmoji en las carpetas de alumno:** sí. **La puerta SDD:** se deja.

**Lo que se hizo con cada punto abierto**

| Punto | Tipo | Qué se hizo |
|---|---|---|
| Una spec paraguas | suposición tomada | Validada: se mantiene |
| El freno propio, copia exacta envuelta | suposición tomada | Validada: el freno de RSC es autónomo (solo usa `node:fs` y `node:path`, recibe la carpeta y lee la orden), así que se puede copiar tal cual |
| Apagar el guardián de gitmoji en carpetas de alumno | suposición tomada | **Validada por Jose** en la parada (25-09-2026): «Apagarlo» |
| La puerta SDD se queda | suposición tomada | **Validada por Jose** en la parada (25-09-2026): «Dejarla» |
| Qué carpetas no se preparan | suposición tomada | Validada y afinada en C-5 |
| El experimento del relevo decide | suposición tomada | Validada: se mantiene |
| El vocabulario nuevo de pantalla | pregunta abierta | **Contestada por Jose** (25-09-2026): tres preguntas fáciles en vez del tamaño (C-21), y los demás textos con su criterio, revisados al cerrar cada fase (C-22) |
| Windows | decisión diferida | Se deja |
| Firmar los instaladores | decisión diferida | Se deja |
| Cómo se vive el freno en clase | área no formulable | Graduada y cerrada en C-11 |

## Vocabulario propuesto (P2) — pendiente del sí de Jose

La regla es buscar primero en el diccionario. Lo que ya existe se reutiliza, y aquí solo va lo nuevo,
con dónde sale. Se han esquivado las palabras prohibidas: *Node*, *extensión*, *repositorio*,
*archivo de configuración*, *hook*, *token*…

| Dónde sale | Texto propuesto | Nota |
|---|---|---|
| Arranque: qué abarca, para todo el mundo (decisión de Jose, 25-09) | **¿Qué vas a llevar en esta carpeta?** · **Una tarea concreta** («Preparar un informe, ordenar unos papeles, una web de una página») · **Un proyecto** («Algo con principio y fin: un lanzamiento, una web con reservas, un estudio») · **Un departamento o un área** («Lo de todos los días de un equipo: facturación, personal, marketing») · **La empresa entera** («Un poco de todo, de toda la empresa») | Sustituye a «¿Es algo pequeño o va para largo?» |
| Arranque: cuántas personas, para todo el mundo (Jose, 25-09) | **¿Cuántas personas están metidas en esto?** · **Solo yo** · **De 2 a 10** · **De 11 a 50** · **Más de 50** | Nuevo |
| Arranque: con «Construir algo» o «Un poco de todo» (Jose, 25-09) | **¿Qué vas a construir?** · solo con «Un poco de todo», **Nada, o casi nada** · **Una cosa concreta** («una landing, una web de una página, un aviso por correo») · **Algo que irá sumando piezas** («una web con reservas, automatizaciones que se hablan entre sí») · **Una plataforma completa** («con usuarios, varios idiomas y panel de administración») · **No lo sé todavía** | Nuevo; sustituye al tamaño |
| Arranque: cuánto explica | *Al grano* · *Corto* · *Te explica por qué* · *De la mano*, con sus frases de «Cómo te habla» | Reutiliza; sustituye a «Todo, paso a paso · Lo normal · Poco» |
| Carpeta personal o del sistema | **Esta es tu carpeta personal: si la preparo, el asistente tendría a mano todo tu ordenador. Crea una carpeta aquí dentro y trabaja en ella.** · botón **Crear una carpeta aquí dentro** · para la raíz o una del sistema: **Esta carpeta es del sistema: aquí no preparo nada.** | Nuevo |
| Escritorio, Documentos o Descargas enteras | **Vas a preparar tu carpeta de {Documentos} entera. Mejor una carpeta dentro, solo para esto.** · **Crear una carpeta aquí dentro** · **Prepararla entera** | Nuevo |
| Carpeta de alguien: el resumen | **Aquí ya hay cosas tuyas. Para montar el arnés voy a tocar esto: {lista}. No borro nada tuyo.** · la lista dice *la lista de lo que no entra en git*, *los ajustes de Claude de esta carpeta* y *Cómo se trabaja aquí* · botones *Sí, móntalo encima* / **No, déjalo** | *Cómo se trabaja aquí* y *Sí, móntalo encima* ya existían |
| Carpeta de alguien: un nombre que choca | **Ya tienes una habilidad que se llama «{id}», igual que una del arnés.** · **Cambiarle el nombre a la mía** («pasa a llamarse {id}-propia») · **Que la del arnés ocupe su sitio** («la tuya queda en las copias que guarda el arnés») · **No montar nada** · **Lo mismo para todas** | *Copias que guarda el arnés* ya existía |
| Carpeta montada con una versión más nueva | **Esta carpeta se montó con una versión del arnés más nueva que la de tu clase.** · **Ponerla como la de la clase** · aviso: **Se quitarán estas habilidades, que la versión de tu clase no trae: {lista}.** | Nuevo |
| Seguir sin copias | pieza **Sin copias, porque lo elegiste** · botón **Ponerlas ahora** | Nuevo; el aviso «Sigo sin copias…» ya existía |
| Carpeta dentro de otro proyecto | **Esta carpeta está dentro de otro proyecto, «{nombre}». Si la preparo, sus copias irán aparte.** · **Prepararla igual** · *Elegir otra carpeta* · con varias abiertas: **Trabajo con «{nombre}», la primera de las carpetas abiertas.** | *Elegir una carpeta* ya existía |
| Montaje nuestro a medias | **Aquí se empezó a montar el arnés y se quedó a medias.** · *Terminar de prepararla* | El botón ya existía |
| Punto de partida que no se guardó | **No he podido guardar el punto de partida. Lo demás está listo.** · *Algo va mal* | Nuevo |
| Volver a montar con un plan distinto | **El arnés quiere cambiar lo que tiene montado: {lista}. ¿Lo acepto?** · **Sí, acéptalo** · **No, déjalo como está** | Nuevo |
| Sin ningún asistente en el ordenador | **No tienes ningún asistente en este ordenador. ¿Cuál pongo?** · **Poner Claude** · **Poner Codex** | Nuevo |
| El freno propio, en «Las reglas» | *Freno ante órdenes peligrosas*, y en su (i): **Lo pone Executive Lab: el arnés no lo trae en esta clase de proyecto.** o **Lo pone el arnés.** | El nombre ya existía |
| Las piezas automáticas sin programa para arrancar | pieza **Lo que el arnés hace solo** · **Listo** / **No arranca en este ordenador** · botón **Arreglarlo** · **Cierra la conversación con Claude y ábrela otra vez para que lo coja.** | Nuevo, sin decir *Node* |
| Guardar en git con una credencial suelta | **No he metido «{nombre}» en la copia: es un fichero de acceso y no debe salir de este ordenador.** · para claves: **…es un fichero de claves de acceso…** · botón **Ponerlo en su sitio** | *Fichero de acceso* y *en su sitio* ya existían |
| Una consulta que pide un programa que no está | **Esta consulta necesita {Python}, y en este ordenador no está.** · botón **Pedírselo al asistente** | Nuevo; *Python* es nombre propio (decisión 102) |
| Comandos por lenguaje del arnés | **Revisar el código de {Lenguaje}** · **Arreglar la compilación de {Lenguaje}** | Mismo patrón que *Arreglador de compilación de PyTorch* |
| Primer mensaje al asistente (se ve en la caja) | **La carpeta ya tenía cosas de antes: mira qué hay antes de tocar nada.** · **Completa conmigo el perfil: a qué me dedico, qué herramientas uso y qué no se puede tocar.** · **En esta carpeta hay freno ante órdenes peligrosas.** · **Pregúntame de una en una.** | Nuevo |
| Mensajes que mandan a «Algo va mal» (los doce) | *Pulsa «Algo va mal» y pásale el código a tu tutor.* | Ya existía en `arrancar.js` como modelo |

Y dos suposiciones que Jose puede vetar en la misma parada:
1. **Apagar el guardián de gitmoji en las carpetas de alumno.** La barra enseña el asunto de cada
   copia como su nombre, y «✨ feat: …» no es un nombre para un alumno.
2. **Dejar la puerta SDD** para quien elige «irá creciendo».

## Revisiones

- 24-09-2026 — Escrita en autopilot, a partir de la propuesta y de las cuatro decisiones de Jose.
- 24-09-2026 — `clarify`:
  - doce aclaraciones resueltas leyendo el código;
  - D5 rebajado de medio a bajo, porque la barra ya lee las dos formas del dial;
  - A4 reutiliza los escalones de «Cómo te habla»;
  - el área no formulable del freno, graduada y cerrada;
  - la lista de vocabulario, preparada para la parada.
- 24-09-2026 — Revisión con ojos frescos: diez puntos, seis de ellos bloqueaban el plan. Se
  arreglaron todos (C-13 a C-20). P4 se enmienda en la constitución por la decisión 3 de Jose.
- 25-09-2026 — La revisión de F1 afina A13: el nombre lo sugiere lo que lleva la carpeta, no cuánta
  gente hay, que no dice nada de cómo se llama. Y volver a montar conserva las dos respuestas, que
  RSC borraba al reescribir el perfil.
