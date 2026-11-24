---
type: constitution
title: Las no-negociables de la interfaz del arnés
description: Las reglas que este proyecto no rompe, numeradas y comprobables. Salen de lo que ya ha fallado, no de buenas intenciones.
timestamp: 2026-09-21T12:00:00Z
topic: harness
---

# Las no-negociables

Este proyecto pone una barra lateral sin fricción encima del arnés RSC, para gente
que lleva una pyme y no es técnica. Todo lo de abajo está escrito **después** de
romperlo al menos una vez; el registro está en `docs/decisiones.md`.

Cada regla es comprobable. Si no se puede comprobar, no es una regla: es un deseo.

## P1 · Ninguna pantalla sin salida

Toda pieza que la barra diga que falta tiene que traer un botón que haga algo. Una
lista de problemas sin nada que pulsar es peor que no tener la lista.

**Se comprueba**: `humo.js` recorre tres carpetas distintas y exige `arreglo` en
toda pieza que no esté en `si` o `noAplica`.

## P2 · Ni una palabra que no esté en el diccionario

Todo texto que sale en pantalla pasa por `docs/diccionario.md` **antes** de
escribirse. Lo que no esté, se propone y se espera; no se inventa sobre la marcha.
Lo que lee el asistente y no el alumno se marca `// diccionario: interno`.

**Se comprueba**: `node docs/comprobar-diccionario.js`, y está en `publicar.sh`.

## P3 · Nunca un fallo silencioso

Un fallo que no da error, no se ve y deja la pantalla llena es la forma de fallar
que este proyecto no se permite. Todo lo que se apunta por dentro acaba en el
informe de «Algo va mal»; ningún `false` de retorno se tira sin mirarlo.

**Se comprueba**: la prueba del informe de incidencia exige que el motivo viaje con
el código que se le dicta al tutor.

## P4 · Lo de esa persona no se toca

En una carpeta que ya era de alguien no se borra, no se mueve, no se renombra y
**no se escribe en su historial**. Si hay otro montaje puesto a mano, se pide
permiso antes de nada; si dice que no, no se instala nada.

**Se comprueba**: ninguna rama sobre historial ajeno lleva el paso
`puntoDePartida`, y hay una prueba que lo recorre estado por estado.

**Enmienda del 24-09-2026, decisión 3 de Jose en el programa `todo-cuadra`.** RSC borra la
habilidad, el comando o el agente de esa persona que se llame como uno suyo, y enlaza el suyo
encima. Por cada choque se le pregunta, y solo con su sí explícito se hace una de dos cosas:

- **sobrescribir** la suya con la del arnés, que la guarda en sus copias (`.rsc/backups/`), y se le
  dice dónde;
- **cambiarle el nombre** a la suya para que quepan las dos.

Sin respuesta no se monta nada. Su historial sigue sin escribirse. **Se comprueba**: la prueba de
choques exige que, sin respuesta, no cambie ni un fichero suyo.

## P5 · Determinista lo que se puede leer del disco

Clasificar, decidir la rama, calcular qué preguntar, los mapeos de conexiones,
credenciales, comandos, habilidades y ayudantes: todo eso se lee, no se adivina.
Lo que hace falta **entender** —a qué pertenece una clave suelta, de qué va una
carpeta desordenada— se delega al asistente con un encargo de cuatro partes y una
función que comprueba el resultado mirando el disco.

**Se comprueba**: `rumbo.js` es una función pura y se prueba con partes inventados;
cada encargo tiene `comprobar()`, y hay una prueba que lo pone a falso y a
verdadero.

## P6 · La acción de un botón se coge tal cual viene

Quien construye la acción es quien tiene los datos. La pantalla la pinta, no la
rehace. Rehacerla costó tres versiones y acabó escribiendo la palabra `undefined`
en la conversación de alguien.

**Se comprueba**: ningún botón de la pantalla puede pedir algo sin texto.

## P7 · La serie de la clase, y la lleva la barra

La barra trae una versión exacta, sin rangos, de la serie con la que va la clase. Subir de versión es
una decisión que se toma y se escribe, nunca un efecto secundario de un `npm install`.

**Enmienda del 14-10-2026, decisión 145.** La clase montó RSC desde el chat con la 3.0.22, y la 3.x se
pone al día sola dentro de su serie. «La misma versión exacta para todos» ya no describía la clase.
Ahora:
- lo que va **por detrás** (una 3 más vieja, o una 2) se pone al día, y solo (P9);
- lo que va **por delante** está al día: la barra trabaja ahí con la versión de esa carpeta y nunca
  corre encima la suya, que la bajaría sin avisar (RSC no compara versiones), ni ofrece bajarla;
- en las carpetas de la barra el arnés no se actualiza por su cuenta, porque las versiones las lleva la
  barra (C4).

**16-11-2026, decisión 200.** La serie pasa a la 4: la barra trae la 4.1.7. Una 3 va por detrás y se pone
al día sola, probado con una carpeta montada con la 3.0.22 de verdad.

**24-11-2026, decisión 203.** La barra trae la 4.1.9. De la 4.1.7 a la 4.1.9 no cambian ni las habilidades,
ni el freno, ni las salidas que lee la barra.

**Se comprueba**: la versión tiene que decir lo mismo en todos los sitios donde está escrita. Además,
una carpeta que va por delante se corre con su versión y no con la de la barra, y no sale ningún botón
para bajarla.

## P8 · Lo que se descarga no entra en el proyecto

Editores, perfiles y cachés de prueba viven fuera de la carpeta. El arnés escanea
lo que hay dentro para decidir qué es este proyecto, y no lee el `.gitignore`: un
VS Code descargado le hizo creer que esto era un proyecto de React.

**Se comprueba**: `du -sh .` y la evidencia del plan en `.rsc.json`.

## P9 · Lo que debe hacerse solo, se hace solo

Jose, 14-10-2026: *«lo que se pueda hacer automático (a través de RSC, con la extensión o como sea) se
haga solo. La barra debe ser inteligente y proactiva»*. Sale de la clase del 13-10, la primera sin la
barra: cada atasco era algo que alguien tuvo que hacer a mano.

Jose, 17-10-2026, corrigiéndola: *«ojo: diferencia. debe hacerse solo lo que debe hacerse solo, no lo que
puede. Lo que es mejor que haga el alumno o que requiere info del alumno hay que pedírsela»*. Que la barra
**pueda** hacer algo no basta para que lo haga: lo local, gratis y reversible se leyó como «todo, sin
preguntar», y no es eso.

El criterio, en llano:

- **Se hace solo** lo que protege o mantiene sin que la persona tenga que pensarlo: las copias, poner
  al día, arreglar lo que es de la barra, y lo que hace falta para que funcione. Se hace **en cuanto se
  ve**, sin esperar a que nadie pulse, y se dice en una frase.
- **Se le pregunta** lo que necesita información suya (su nivel, su negocio, su objetivo, sus datos) y lo
  que es mejor que decida o haga él: sus preferencias, cómo trabaja, lo que le enseña algo. Una vez, con
  opciones y a un clic (P1). Un valor por defecto no es una respuesta: no se contesta por la persona.

Y aunque algo deba hacerse solo, hay cuatro casos en los que se propone a un clic y no se hace sin su sí:

- **sale de su ordenador en su nombre**: un aviso, una publicación, subir algo (decisión 131);
- **no se puede deshacer**: borrar, sobrescribir lo suyo o bajar la versión del arnés (P4);
- **cuesta dinero**;
- **lo decide su negocio**: qué conectar, qué permisos tiene una clave o qué se queda fuera.

Incluso entonces se deja todo preparado, a un clic (P1).

Y solo en una carpeta que **este ordenador ya conoce**, porque alguien ha pulsado en ella un botón que
corre el arnés. Una carpeta recién traída de fuera puede venir preparada para hacer daño, y con el
instalador la confianza del editor va apagada para todas, así que no las distingue. La primera vez se
hace con su botón. Proactiva quiere decir que se adelanta: lo que
va a fallar pronto se arregla o se avisa antes de que falle. Por ejemplo, una clave que caduca, un
vídeo enorme que iba a entrar en git o una conexión con más permisos de los que se pidieron.

**Se comprueba**: `humo.js` barre `terreno.js` entero. Cada arreglo que la barra hace ella misma y
que cambia algo dice `alAbrir: true` o `retiene` con uno de los cuatro casos, y lo que se hace solo
tiene quien lo haga al abrir (`solo.js`). Otras pruebas cubren el resto:
- lo que pide información suya o es una preferencia suya se pregunta, y no se rellena por defecto: su
  nivel con el ordenador, qué lleva la carpeta, cuánta gente hay detrás y la vista sencilla (decisión 187);
- no se hace nada solo sin confianza, en una carpeta recién traída ni sobre un arnés más nuevo que el
  de la clase;
- sin nadie delante, el montaje no abre ninguna ventana ni crea el historial;
- lo que se dice arreglado se mira otra vez;
- el arnés no corre si algún nombre suyo sale de la carpeta.
