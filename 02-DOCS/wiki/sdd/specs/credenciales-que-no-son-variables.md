---
type: spec
title: Las credenciales que no son variables también tienen sitio
description: Una cuenta de servicio .json o un .pem no es una línea en un .env: es un fichero entero. Hoy la barra no los ve, así que una conexión que funciona sale como «sin conectar». Su sitio en RSC es 01-TOOLS/<HERRAMIENTA>/keys/.
timestamp: 2026-09-22T02:00:00Z
topic: sdd
status: shipped
shipped_in: 0.27.0 (verificación del 22-09-2026: pasa)
---

# Las credenciales que no son variables también tienen sitio

## Problema

La decisión 104 enseñó a la barra a inventariar claves sueltas, pero solo las que viven en un
`.env`: líneas `CLAVE=valor`. Hay una clase entera de credenciales que **no tiene esa forma** y que
aparece en cuanto alguien conecta Google, Apple o un servidor:

- una **cuenta de servicio de Google** (`*-service-account.json`, `credentials.json`,
  `client_secret_*.json`) y el `token.json` que deja su primer inicio de sesión;
- una **clave privada o certificado** (`*.pem`, `*.p8`, `*.p12`, `*.key`, `id_rsa`).

Son ficheros enteros que hay que mover, no líneas que copiar. Hoy la barra no los mira, así que:

1. Un Drive conectado con cuenta de servicio sale como **«sin conectar»**, porque su `.env` está
   vacío y el fichero que de verdad la autentica no lo ve nadie.
2. Si está en la raíz o en una carpeta cualquiera, no aparece ni en «claves fuera de sitio»: es
   invisible del todo. Y es la credencial **más peligrosa** de las dos, porque una cuenta de
   servicio no caduca y suele dar acceso a todo un Drive.
3. El encargo que ordena las claves no lo nombra, así que el asistente ordena media casa y deja la
   otra media donde estaba.

Jose, 22-09-2026: *«apunta como pendiente para luego hacer los otros ficheros de credenciales […]
cuentas de servicio, `.json` y `.pem` y tal»*.

## Por qué ahora

Es la mitad que falta de la 104. Mientras no esté, la promesa «la barra sabe dónde está cada
credencial» es falsa para cualquier arnés que toque Google, y eso es casi cualquier pyme.

## A quién sirve

Al alumno que no es técnico y ve «sin conectar» en algo que funciona; y al asistente, que recibe un
plan de mudanza completo en vez de medio.

## Qué tiene que pasar

1. **Se encuentran.** La barra reconoce esos ficheros en la carpeta: raíz, carpetas de primer nivel,
   las de credenciales al uso, y dentro de cada herramienta cuando están sueltos en vez de en
   `keys/`.
2. **Se sabe de quién son.** Por el nombre del fichero y, en una cuenta de servicio, por lo que
   declara dentro (`"type": "service_account"` y su `client_email`, que nombra el proyecto). Lo que
   no se pueda deducir, se pregunta; no se adivina.
3. **Se dicen sin abrirlos del todo.** Nunca se copia ni se enseña el contenido: basta reconocerlo.
   Ni el asistente lo recibe.
4. **Tienen sitio y se dice cuál.** `01-TOOLS/<HERRAMIENTA>/keys/`, que es donde RSC los pone y lo
   que su plantilla ya excluye de las copias de seguridad (`gitignore`: `.env`, `keys/`, `out/`).
5. **Una conexión con cuenta de servicio no sale como «sin conectar».** Si su `keys/` tiene algo,
   la barra lo dice.
6. **Si están dentro de las copias de git, se avisa con todas las letras**, igual que con las
   claves: moverlas no las saca del historial.

## Criterios de aceptación

| # | Se cumple cuando |
|---|---|
| A1 | Un `credentials.json` de cuenta de servicio en la raíz sale en el inventario, dicho como «una cuenta de servicio», no como «un fichero .json». |
| A2 | Un `*.pem` en una carpeta de primer nivel sale, y un `package.json`, un `tsconfig.json` o un `.json` cualquiera **no** salen. |
| A3 | De una cuenta de servicio se deduce la herramienta por su `client_email` o por el nombre del fichero; lo que no se deduce cae en «sin dueño claro». |
| A4 | El encargo al asistente dice el destino `01-TOOLS/<X>/keys/` y **no contiene ni una línea del contenido** del fichero. |
| A5 | Una herramienta cuyo `keys/` tiene un fichero no cuenta como «sin conectar» aunque su `.env` esté vacío. |
| A6 | Un fichero de credenciales guardado en git se marca igual que una clave suelta, con el mismo aviso. |
| A7 | Todo lo que sale en pantalla está en `docs/diccionario.md`, y no aparece «.json», «.pem» ni «clave privada» en un rótulo. **«Certificado digital» sí** — ver C6. |

## Fuera de alcance

- **Leer nada fuera de la carpeta de trabajo** (`~/.aws/credentials`, `~/.config/gcloud`): la regla
  dura de Jose manda. Como mucho se nombran en el encargo, sin mirarlos.
- **Mover los ficheros nosotros.** La barra detecta y explica; mover credenciales sin romper lo que
  las leía es del asistente, con permiso.
- **Validar la credencial** (que la cuenta de servicio funcione): eso es la prueba de conexión de
  cada herramienta, que ya existe.
- Descifrar, abrir o volcar el contenido de ninguno de esos ficheros.

## Aclaraciones (fase `clarify`, 22-09-2026)

Cinco cosas que habrían cambiado el resultado. Resueltas leyendo el código y RSC, no adivinadas.

**C1 · Cómo se llama esto en pantalla.** No se puede decir «.json», «.pem» ni «certificado» (P2 y
palabras prohibidas). El diccionario ya tiene *clave de acceso* para una API key. Su hermano para
un fichero entero: **fichero de acceso**, y en la (i), qué es en concreto («una cuenta de servicio
de Google»). Se añade al diccionario como parte de este trabajo, y queda anotado para que Jose lo
vete si no le convence.

**C2 · Qué cuenta como fichero de acceso.** No basta la extensión: un `package.json` y un
`tsconfig.json` son `.json`. La regla:

- `.pem`, `.p8`, `.p12`, `.key`, `.keystore`, `.jks`, e `id_rsa` / `id_ed25519` sin extensión →
  cuentan por el nombre.
- `.json` → **solo** si su contenido lo declara (`"type": "service_account"`, o trae
  `private_key` / `client_secret`), o si su nombre es inequívoco (`credentials.json`,
  `client_secret*.json`, `*-service-account*.json`, `token.json`).

**C3 · De quién es cada uno.** Por este orden, y lo que no salga cae en «sin dueño claro», que se
pregunta: (1) está dentro de `01-TOOLS/<X>/` → es de X; (2) el nombre del fichero contiene el
identificador de una herramienta montada; (3) es una cuenta de servicio y su `client_email` nombra
un proyecto que casa con una herramienta montada. No se inventa una herramienta a partir del
nombre de un proyecto de Google: eso se pregunta.

**C4 · Qué se lee de dentro, y qué no sale.** De un `.json` se leen como mucho los primeros 64 KB
y se sacan **dos campos que no son secretos**: `type` y `client_email`. Nada más cruza la frontera
de la función: ni `private_key`, ni el fichero entero, ni un trozo. De un `.pem` no se lee nada,
solo su nombre.

**C5 · Cuándo una conexión deja de estar «sin conectar».** Una herramienta cuyo `keys/` tiene algo
está autenticada por fichero aunque su `.env` esté vacío. En la lista deja de decir «faltan N
claves» y dice **«con su fichero de acceso»**. Si además le faltan claves de verdad, manda lo que
falta: las dos cosas pueden ser ciertas y la que bloquea es la que falta.

Y una que ya estaba resuelta en el código: `conexiones.escribir` rechaza un valor de varias líneas
—un PEM pegado en una casilla— y manda al asistente, nombrando `keys/`. Esta feature es la otra
mitad de esa frase: ahora la barra sabe si ese fichero ya está y dónde.

**C6 · «Certificado digital» se queda; «clave privada» se va.** Al pintarlo salió
«Una clave privada o un certificado», y la comprobación de A7 lo paró. Bien parado a medias: *clave
privada* es jerga y además choca con *clave de acceso*, que en el diccionario es otra cosa. Pero
*certificado digital* no es jerga para este público: un gestor español tiene uno de la FNMT y lo usa
para Hacienda cada trimestre — es vocabulario de gestoría, como «archivo» o «carpeta». Se queda,
con su fila en el diccionario, y A7 se corrige en consecuencia: prohibido «clave privada», no
«certificado digital».

## Riesgos

| Riesgo | Cómo se acota |
|---|---|
| Recorrer la carpeta entera cuesta caro y esto se pide en cada repintado | Mismo alcance que el inventario de claves: raíz, primer nivel y carpetas conocidas. Nunca recursivo hondo. |
| Confundir `package.json` con una credencial | No basta la extensión: un `.json` solo cuenta si su contenido lo declara (`private_key`, `service_account`) o su nombre es inequívoco. |
| Filtrar un secreto al leerlo para clasificarlo | Se leen los primeros kilobytes y solo se extraen dos campos no secretos (`type`, `client_email`). El contenido no sale de la función. |
| Un falso positivo mande al asistente a mover algo que no es una credencial | El asistente pregunta antes de mover, y el encargo se lo exige. |
