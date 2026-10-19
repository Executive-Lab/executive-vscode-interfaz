#!/bin/bash
# Comprueba el instalador de macOS: lo que se ha construido y, si ya se ha
# instalado, cómo ha quedado la máquina. Es el espejo de windows/probar.ps1.
#
#   ./probar.sh                       # sobre esta máquina
#   ./probar.sh --casa /tmp/casa-falsa   # sobre una carpeta personal de mentira
#   ./probar.sh --sin-firma              # donde no hay certificado (la máquina macOS de GitHub)
#   ./probar.sh --asistente losDos       # con qué asistente se instaló: claude (por defecto), codex o losDos
#
# Deja un informe de texto al lado. Las comprobaciones que no vienen a cuento
# (por ejemplo, las de "ya instalado" cuando todavía no lo está) salen como "·"
# y no cuentan como fallo.

set -uo pipefail

AQUI="$(cd "$(dirname "$0")" && pwd)"
CASA="$HOME"
SIN_FIRMA=0
ASISTENTE="claude"
while [ $# -gt 0 ]; do
  case "$1" in
    # Sin carpeta detrás, se para: con `--casa --sin-firma` se tomaba «--sin-firma»
    # por la carpeta, en silencio, y la firma se miraba igual.
    --casa)
      if [ -z "${2:-}" ] || [ "${2#--}" != "$2" ]; then
        echo "Falta la carpeta de --casa. Por ejemplo: ./probar.sh --casa /tmp/casa-falsa" >&2
        exit 2
      fi
      CASA="$2"; shift ;;
    --sin-firma) SIN_FIRMA=1 ;;
    --asistente)
      case "${2:-}" in
        claude|codex|losDos) ASISTENTE="$2"; shift ;;
        *) echo "Con --asistente va claude, codex o losDos. Por ejemplo: ./probar.sh --asistente losDos" >&2; exit 2 ;;
      esac ;;
  esac
  shift
done

APP="$CASA/Library/Application Support/ExecutiveLab"
ACCESO="$CASA/Applications/Mi Empresa.app"
AJUSTES="$CASA/Library/Application Support/Code/User/settings.json"
# Los ajustes de Claude, donde los lee él: CLAUDE_CONFIG_DIR si está, y si no ~/.claude.
CLAUDE_AJUSTES="${CLAUDE_CONFIG_DIR:-$CASA/.claude}"
case "$ASISTENTE" in
  claude) CON_CLAUDE=1; CON_CODEX=0 ;;
  codex) CON_CLAUDE=0; CON_CODEX=1 ;;
  losDos) CON_CLAUDE=1; CON_CODEX=1 ;;
esac
INFORME="$AQUI/informe-$(date +%Y%m%d-%H%M%S).txt"

BIEN=0; MAL=0; SALTADAS=0

comprobar() {
  local titulo="$1"; shift
  local salida
  if salida="$("$@" 2>&1)"; then
    if [ "$salida" = "SALTADA" ]; then
      printf '  \033[90m·\033[0m %s\n' "$titulo"
      echo "·  $titulo" >> "$INFORME"
      SALTADAS=$((SALTADAS + 1))
    else
      printf '  \033[32m✓\033[0m %s \033[90m— %s\033[0m\n' "$titulo" "$salida"
      echo "OK $titulo — $salida" >> "$INFORME"
      BIEN=$((BIEN + 1))
    fi
  else
    printf '  \033[31m✗\033[0m %s \033[31m— %s\033[0m\n' "$titulo" "$salida"
    echo "MAL $titulo — $salida" >> "$INFORME"
    MAL=$((MAL + 1))
  fi
}

morir() { echo "$1"; return 1; }
saltar() { echo "SALTADA"; return 0; }

# La ruta del programa que corre el primer enganche del arnés. El valor de
# "command" empieza por ella, entre comillas escapadas si lleva espacios — y
# los lleva, que la carpeta del alumno pasa por "Application Support".
rutaDelPrimerEnganche() {
  sed -n 's/.*"command": "\\\{0,1\}"\{0,1\}\([^"\\]*\).*/\1/p' "$1" | head -1
}

enganchesConRutaCompleta() {
  [ -n "$TRABAJO" ] || { saltar; return 0; }
  local fichero="$TRABAJO.claude/settings.json"
  [ -f "$fichero" ] || morir "no hay enganches"

  local ruta
  ruta="$(rutaDelPrimerEnganche "$fichero")"
  case "$ruta" in
    /*) [ -x "$ruta" ] || morir "apuntan a $ruta, que no existe"; echo "a la ruta completa, y está" ;;
    "") morir "no he sabido leer los enganches" ;;
    *) morir "llaman a node por su nombre: dependen del PATH" ;;
  esac
}

echo "Comprobando Executive Lab para macOS" | tee "$INFORME"
echo "sobre $CASA · $(sw_vers -productName) $(sw_vers -productVersion) · $(uname -m)" | tee -a "$INFORME"

# ───────────────────────────────────────────────────── lo que se ha construido

echo
echo "Lo que se ha construido"

comprobar 'el .dmg está hecho' bash -c '
  dmg="$(ls -t "'"$AQUI"'"/*.dmg 2>/dev/null | head -1)"
  [ -n "$dmg" ] || { echo "no hay ningún .dmg; pasa por ./construir.sh"; exit 1; }
  echo "$(basename "$dmg") · $(du -h "$dmg" | cut -f1)"'

comprobar 'la app instaladora está dentro' bash -c '
  app="'"$AQUI"'/escenario/Instalar Executive Lab.app"
  [ -d "$app" ] || { echo "no está"; exit 1; }
  /usr/libexec/PlistBuddy -c "Print :CFBundleIdentifier" "$app/Contents/Info.plist"'

# El Node ya NO viaja dentro: lo descarga arrancar.sh al instalar, solo para la
# arquitectura de ese Mac. Eran 236 de los 242 MB de la carga.
comprobar 'la carga NO lleva el Node' bash -c '
  [ -d "'"$AQUI"'/carga/runtime" ] && { echo "sigue llevando el Node: son 236 MB para nada"; exit 1; }
  echo "lo descarga arrancar.sh"'

comprobar 'arrancar.sh sabe conseguir un Node' bash -c '
  a="'"$AQUI"'/escenario/Instalar Executive Lab.app/Contents/Resources/arrancar.sh"
  [ -f "$a" ] || { echo "SALTADA"; exit 0; }
  [ -x "$a" ] || { echo "no tiene permiso de ejecucion"; exit 1; }
  sh -n "$a" || { echo "no es sh valido"; exit 1; }
  grep -q "nodejs.org/dist" "$a" || { echo "no sabe de donde bajarlo"; exit 1; }
  grep -q "command -v node" "$a" || { echo "no mira si ya hay uno"; exit 1; }
  echo "descarga, o usa el que haya"'

comprobar 'la carga NO lleva el arnés ni los raíles' bash -c '
  [ -d "'"$AQUI"'/carga/harness" ] && { echo "sigue llevando el arnés: eso ahora va en el .vsix"; exit 1; }
  [ -d "'"$AQUI"'/carga/skills" ] && { echo "sigue llevando los raíles: eso ahora va en el .vsix"; exit 1; }
  [ -d "'"$AQUI"'/carga/git" ] && { echo "sigue llevando git: ahora lo instala el de Apple"; exit 1; }
  echo "solo las piezas"'

comprobar 'la extensión viaja, y lleva el arnés dentro' bash -c '
  v="'"$AQUI"'/carga/executive-lab.vsix"
  [ -f "$v" ] || { echo "falta la extensión"; exit 1; }
  unzip -l "$v" | grep -q "media/harness/node_modules/@ericrisco/rsc/scripts/rsc.js" \
    || { echo "el .vsix no lleva el arnés dentro; vuelve a empaquetar"; exit 1; }
  unzip -l "$v" | grep -q "media/comun/historial.js" \
    || { echo "el .vsix no lleva historial.js; las copias quedarían apagadas"; exit 1; }
  echo "arnés e historial dentro"'

comprobar 'preparar.js tiene al lado lo que necesita' bash -c '
  for m in preparar.js git.js ajustes.js ajustes-del-editor.js; do
    [ -f "'"$AQUI"'/carga/$m" ] || { echo "falta $m"; exit 1; }
  done
  echo "los cuatro módulos"'

# Sin certificado Developer ID no se puede firmar, y en la máquina macOS de GitHub
# no lo hay: ahí se anota que no se ha mirado, en vez de darla por mala. Todo lo
# demás cuenta igual.
comprobar 'la app va firmada' bash -c '
  app="'"$AQUI"'/escenario/Instalar Executive Lab.app"
  [ -d "$app" ] || { echo "SALTADA"; exit 0; }
  [ "'"$SIN_FIRMA"'" = "1" ] && { echo "SALTADA"; exit 0; }
  quien="$(codesign -dv "$app" 2>&1 | grep "^Authority=" | head -1 | cut -d= -f2)"
  case "$quien" in
    "Developer ID"*) echo "$quien" ;;
    "") echo "sin firmar: Gatekeeper la bloqueará. Pasa por ./firmar.sh"; exit 1 ;;
    *) echo "firmada con $quien, que NO vale para repartir. Hace falta Developer ID"; exit 1 ;;
  esac'

# ─────────────────────────────────────────────────────────── ya instalado

echo
echo "Cómo ha quedado la máquina"

comprobar 'las herramientas están en la carpeta del alumno, sin administrador' bash -c '
  [ -d "'"$APP"'" ] || { echo "SALTADA"; exit 0; }
  [ -w "'"$APP"'" ] || { echo "la carpeta no es suya"; exit 1; }
  echo "'"$APP"'"'

comprobar 'nada se ha colado en /usr/local' bash -c '
  [ -d "'"$APP"'" ] || { echo "SALTADA"; exit 0; }
  [ -e /usr/local/executive-lab ] && { echo "hay restos de la versión vieja en /usr/local"; exit 1; }
  echo "limpio"'

# El acceso directo es un applet hecho con osacompile (decisión 193), no una app
# escrita a mano: -10669 de LaunchServices en macOS 26.
comprobar 'el acceso directo es un applet de verdad, con nombre e icono' bash -c '
  app="'"$ACCESO"'"
  [ -d "$app" ] || { echo "SALTADA"; exit 0; }
  plist="$app/Contents/Info.plist"
  [ "$(/usr/bin/plutil -extract CFBundleName raw "$plist")" = "Mi Empresa" ] || { echo "no se llama Mi Empresa"; exit 1; }
  ico="$(/usr/bin/plutil -extract CFBundleIconFile raw "$plist" 2>/dev/null)"
  [ -n "$ico" ] || { echo "el Info.plist no tiene icono"; exit 1; }
  [ -f "$app/Contents/Resources/${ico%.icns}.icns" ] || { echo "falta el .icns de $ico"; exit 1; }
  /usr/bin/plutil -extract CFBundleIconName raw "$plist" >/dev/null 2>&1 && { echo "CFBundleIconName tapa nuestro icono"; exit 1; }
  exe="$(/usr/bin/plutil -extract CFBundleExecutable raw "$plist")"
  /usr/bin/file "$app/Contents/MacOS/$exe" | grep -q "Mach-O" || { echo "el ejecutable no es un Mach-O: $exe"; exit 1; }
  /usr/bin/codesign --verify --deep "$app" 2>&1 || { echo "la firma no se verifica"; exit 1; }
  echo "$exe (Mach-O), firmado, con icono"'

comprobar 'el arranque del shell lleva nuestro Node' bash -c '
  [ -d "'"$APP"'" ] || { echo "SALTADA"; exit 0; }
  grep -q ">>> Executive Lab >>>" "'"$CASA"'/.zprofile" 2>/dev/null || { echo "falta el bloque en .zprofile"; exit 1; }
  echo "en .zprofile"'

# Lo del editor y lo del asistente elegido (decisiones 163 y 168), cada clave
# con su valor, y la constancia de lo puesto: sin ella, desinstalar no sabría qué
# es nuestro y qué es suyo. La tabla está escrita aquí a mano, no sacada del
# módulo: si el módulo cambiara un valor, esto debe enterarse.
#
# Node: el que dejó la instalación, o el del sistema.
elNode() {
  if [ -x "$APP/runtime/bin/node" ]; then echo "$APP/runtime/bin/node"; else command -v node; fi
}

losAjustesDelEditor() {
  [ -d "$APP" ] && [ -f "$AJUSTES" ] || { echo "SALTADA"; return 0; }
  local nodo; nodo="$(elNode)"
  [ -n "$nodo" ] || { echo "no hay Node con que leer los ajustes"; return 1; }
  "$nodo" - "$AJUSTES" "$ASISTENTE" "$AQUI/carga/ajustes.js" <<'JS'
const fs = require('fs');
const path = require('path');
const [fichero, asistente, modulo] = process.argv.slice(2);
const conClaude = asistente !== 'codex';
const conCodex = asistente !== 'claude';
const esperado = {
  'security.workspace.trust.enabled': false,
  'update.mode': 'none',
  'update.showReleaseNotes': false,
  'telemetry.telemetryLevel': 'off',
  'extensions.ignoreRecommendations': true,
  'workbench.startupEditor': 'none',
  'workbench.welcomePage.walkthroughs.openOnInstall': false,
  ...(conClaude ? {
    'extensions.confirmedUriHandlerExtensionIds': ['anthropic.claude-code'],
    'claudeCode.focusView': true,
    'claudeCode.hideOnboarding': true,
    'claudeCode.spinnerVerbs': {'mode':'replace','verbs':['Pensando','Dándole vueltas','Revisando','Buscando','Ordenando','Redactando','Atando cabos','Preparando','Mirándolo','Cocinándolo','Trabajando','Casi lo tengo']},
  } : {}),
  ...(conCodex && !conClaude ? { 'chatgpt.openOnStartup': true } : {}),
};
let leer = JSON.parse;
try { leer = require(modulo).leerJsonc || JSON.parse; } catch { /* JSON a secas */ }
const texto = fs.readFileSync(fichero, 'utf8');
const actuales = leer(texto);
if (!actuales) { console.log('no entiendo los ajustes del editor'); process.exit(1); }
const constanciaFichero = path.join(path.dirname(fichero), '.executive-lab-ajustes.json');
if (!fs.existsSync(constanciaFichero)) { console.log('no queda constancia de lo puesto: desinstalar no sabría qué quitar'); process.exit(1); }
const puestas = (JSON.parse(fs.readFileSync(constanciaFichero, 'utf8')).puestas) || {};
const mal = [];
for (const [clave, valor] of Object.entries(esperado)) {
  if (!(clave in actuales)) mal.push(`falta ${clave}`);
  else if (JSON.stringify(actuales[clave]) !== JSON.stringify(valor)) mal.push(`${clave} vale ${JSON.stringify(actuales[clave])} y debía valer ${JSON.stringify(valor)}`);
  else if (JSON.stringify(puestas[clave]) !== JSON.stringify(valor)) mal.push(`la constancia no dice ${clave}`);
}
if (mal.length) { console.log(mal.join('; ')); process.exit(1); }
console.log(`${Object.keys(esperado).length} claves, cada una con su valor y su constancia`);
JS
}
comprobar 'lo del editor y lo del asistente están puestos, con su valor y apuntados para desinstalar' losAjustesDelEditor

# El control remoto de Claude (decisión 143): su clave en los ajustes de Claude
# y la marca que deja, que es lo que permite quitarlo al desinstalar.
elControlRemoto() {
  [ -d "$APP" ] || { echo "SALTADA"; return 0; }
  [ "$CON_CLAUDE" = "1" ] || { echo "SALTADA"; return 0; }
  local f="$CLAUDE_AJUSTES/settings.json"
  [ -f "$f" ] || { echo "no hay $f"; return 1; }
  tr -d ' \n\t' < "$f" | grep -q '"remoteControlAtStartup":true' || { echo "remoteControlAtStartup no está a true"; return 1; }
  [ -f "$CLAUDE_AJUSTES/.executive-lab-control-remoto" ] || { echo "no queda la marca: desinstalar no sabría que es nuestro"; return 1; }
  echo "remoteControlAtStartup a true, con su marca"
}
comprobar 'el control remoto de Claude está puesto, con su marca' elControlRemoto

lasExtensiones() {
  local ext="$CASA/.vscode/extensions"
  [ -d "$APP" ] && [ -d "$ext" ] || { echo "SALTADA"; return 0; }
  ls "$ext" | grep -q "^executivelab.arnes-ui" || { echo "falta la nuestra"; return 1; }
  if [ "$CON_CLAUDE" = "1" ]; then
    ls "$ext" | grep -q "^anthropic.claude-code" || { echo "falta la de Claude"; return 1; }
  fi
  if [ "$CON_CODEX" = "1" ]; then
    ls "$ext" | grep -q "^openai.chatgpt" || { echo "falta la de Codex"; return 1; }
  fi
  echo "la nuestra y la del asistente elegido ($ASISTENTE)"
}
comprobar 'las piezas del editor están instaladas' lasExtensiones

# El instalador escribe en os.tmpdir(), que en macOS NO es /tmp: es el $TMPDIR
# privado de cada usuario. Mirar solo en /tmp hacía que esto se saltara siempre,
# y una comprobación que nunca se ejecuta no comprueba nada.
comprobar 'el informe de la instalación no tiene errores' bash -c '
  log=""
  for donde in "${TMPDIR:-/tmp}/executive-lab-instalacion.log" /tmp/executive-lab-instalacion.log; do
    [ -f "$donde" ] && log="$donde" && break
  done
  [ -n "$log" ] || { echo "SALTADA"; exit 0; }
  malas="$(grep -c "^ERROR\|ERROR " "$log" || true)"
  [ "$malas" = "0" ] || { echo "$malas líneas con error"; exit 1; }
  echo "limpio"'

# ────────────────────────────────────────────── la carpeta de trabajo, si la hay

echo
echo "La carpeta de trabajo"
echo
printf '  \033[90m·\033[0m ya no la hace el instalador: la elige quien va a trabajar en ella\n'
printf '  \033[90m·\033[0m y la prepara el panel, con el wizard de extension/src/arrancar.js\n'
printf '  \033[90m·\033[0m eso no se puede comprobar sin abrir el editor (demo.sh lo enseña)\n' 
echo

# ────────────────────────────────────────────────────────────────── resumen

echo
[ "$SIN_FIRMA" = "1" ] && echo "  (la firma no se ha mirado: sin certificado en esta máquina)"
printf '\033[1m%s bien · %s mal · %s sin venir a cuento\033[0m\n' "$BIEN" "$MAL" "$SALTADAS"
echo "Informe: $INFORME"
{ echo; echo "$BIEN bien · $MAL mal · $SALTADAS saltadas"; } >> "$INFORME"

[ "$MAL" = "0" ]
