---
type: ftd
title: Los instaladores, en cada release
date: 2026-11-26
status: en curso
---

# Los instaladores, en cada release

## Intent

Jose, 26-11-2026: «Si, dale!» a que los instaladores se suban solos en cada versión. Hasta la 0.64.0
se subían a mano, y las releases salían sin ellos: el enlace que se da a los alumnos
(`releases/latest`) llevaba a una página sin nada que instalar. La 0.64.0 los tiene porque se subieron
a mano el 25-11.

## Scope

**Dentro**
- `windows.yml` arranca también al publicar una release. Construye y prueba los dos instaladores como
  en cada cambio, y el trabajo nuevo `a-la-release` sube los que pasan.
- `instalador/a-la-release.sh`: comprueba que la etiqueta es la versión del código, pone la versión en
  el nombre y la etiqueta «sin firmar», los sube y mira que lo subido es lo construido. Con `--ensayo`,
  solo dice qué subiría.
- `publicar.sh`: las notas traen el apartado «O con el instalador, sin tocar VS Code», y el aviso final
  dice que los instaladores llegan solos.
- `README.md` e `instalador/README.md`.

**Fuera**
- Firmarlos: se reparten sin firmar (Jose, 25-11-2026).
- Crear la release desde GitHub: la sigue creando a mano quien publica, con su cuenta. La barra solo se
  pone al día con el `.vsix` subido por `QUIEN_PUBLICA`.
- La 0.64.0 y las anteriores. Una release usa el flujo del commit de su etiqueta, así que esto vale para
  las que se etiqueten después de fusionarlo.

## Checklist

- [x] 1. `a-la-release.sh`, con ensayo.
- [x] 2. El trabajo `a-la-release` en `windows.yml`, solo al publicar una release.
- [x] 3. Notas y aviso de `publicar.sh`; `README.md` e `instalador/README.md`.
- [ ] 4. GitHub en verde en la rama, con el trabajo nuevo saltado porque no es una release.
- [ ] 5. La primera release de verdad (0.65.0) sale con los dos instaladores.

## Evidence

- 26-11-2026 · Ensayo con los instaladores que GitHub construyó de `main` (run 45673472305, 0.65.0):
  - `v0.65.0` → `ExecutiveLab-0.65.0.dmg` (8 MB) y `ExecutiveLab-Setup-0.65.0.exe` (31 MB), con las
    mismas huellas que los ficheros.
  - `v0.64.0` → «La release es v0.64.0 y el código es la 0.65.0: no se sube nada.», salida 1.
  - Sin el `.exe` → «Falta ExecutiveLab-Setup.exe en …: no se sube nada.», salida 1.
  - Sin argumentos → salida 1.
- La comprobación de huellas, solo leyendo, contra la 0.64.0 y con `GH_REPO` desde fuera del repositorio:
  devuelve `sha256:bc394eae…` y `sha256:6ddd2836…`, las de la subida a mano del 25-11.
- `gh release upload --help`: la etiqueta va tras `#` en el nombre del fichero. El YAML se lee: `on` es
  push, workflow_dispatch y release; el trabajo nuevo va solo con release, después de `el-dmg` y
  `el-exe`, y es el único con permiso de escritura.
- `docs/comprobar-diccionario.js`: en verde. La prueba de `humo.js` que lee `README.md` y `publicar.sh`
  (números de otro día), a mano: nada.
- **Sin probar:** la subida de verdad. Solo se prueba publicando una release; la primera será la 0.65.0.

## Next

- Jose fusiona. Después, publicar la 0.65.0 desde `main`, ya con esto dentro, y mirar en Actions que
  `a-la-release` sale en verde y que la release trae los dos.
- Si falla, relanzar el trabajo en Actions, o subirlos a mano como en la 0.64.0.
