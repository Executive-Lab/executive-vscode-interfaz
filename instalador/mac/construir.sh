#!/bin/bash
# Construye el instalador de macOS: una app dentro de un .dmg.
#
#   ./construir.sh                # usa la versión del package.json de la extensión
#   ./construir.sh 0.1.0
#   ./construir.sh --sin-descargas  # no vuelve a bajar Node si ya está la carga
#
# Lo que sale: instalador/mac/Executive Lab <version>.dmg, sin la firma de Apple
# y con la firma provisional (ad hoc) de macOS. Se reparte así (Jose, 25-11-2026):
# la primera vez el Mac pregunta y se abre con Ajustes del sistema › Privacidad y
# seguridad › «Abrir igualmente». Con un certificado Developer ID, ./firmar.sh
# lo firma y lo notariza, y ya no pregunta.
#
# Por qué una app y no un .pkg: instalador/mac/instalar.applescript lo explica.

set -euo pipefail

AQUI="$(cd "$(dirname "$0")" && pwd)"
RAIZ="$(cd "$AQUI/../.." && pwd)"
CARGA="$AQUI/carga"

NODE_VERSION="v24.21.0"          # la misma que lleva el instalador de Windows
# El arnés ya no se instala aquí: viaja dentro del .vsix, con su versión fijada
# en extension/media/harness/package.json.

SIN_DESCARGAS=0
CON_NODE=0
VERSION=""
for arg in "$@"; do
  case "$arg" in
    --sin-descargas) SIN_DESCARGAS=1 ;;
    # El Node dentro del paquete. Por defecto NO va: son 236 de los 242 MB de
    # la carga, y `arrancar.sh` lo descarga al instalar, igual que el editor.
    # Esto es para repartir a un sitio sin red.
    --con-node) CON_NODE=1 ;;
    *) VERSION="$arg" ;;
  esac
done
if [ -z "$VERSION" ]; then
  VERSION="$(node -p "require('$RAIZ/extension/package.json').version" 2>/dev/null || echo 0.1.0)"
fi

paso() { printf '\n\033[1m▸ %s\033[0m\n' "$1"; }

# ─────────────────────────────────────────────────────────── 1. la carga

paso "La carga (Node, el arnés, los raíles, la extensión)"
mkdir -p "$CARGA"

# --- Node. Por defecto NO viaja: lo descarga arrancar.sh durante la
#     instalación, solo para la arquitectura de ese Mac. Eran 236 de los 242 MB
#     de la carga, o sea el 97% del .dmg para algo que se baja en 20 segundos.
if [ "$CON_NODE" = "0" ]; then
  rm -rf "$CARGA/runtime"
  echo "  Node: no viaja dentro (lo descarga arrancar.sh). --con-node para meterlo."
elif [ ! -x "$CARGA/runtime/bin/node" ] || [ "$SIN_DESCARGAS" = "0" ]; then
  if [ -x "$CARGA/runtime/bin/node" ] && [ "$SIN_DESCARGAS" = "1" ]; then
    echo "  El Node de la carga ya está."
  else
    TMP="$(mktemp -d)"
    trap 'rm -rf "$TMP"' EXIT
    for arco in arm64 x64; do
      echo "  Bajando Node $NODE_VERSION para ${arco}…"
      curl -fL --retry 3 -o "$TMP/node-$arco.tar.gz" \
        "https://nodejs.org/dist/$NODE_VERSION/node-$NODE_VERSION-darwin-$arco.tar.gz"
      tar -xzf "$TMP/node-$arco.tar.gz" -C "$TMP"
    done

    rm -rf "$CARGA/runtime"
    mkdir -p "$CARGA/runtime"
    # De base, el árbol de Apple Silicon: npm y las bibliotecas son JavaScript
    # y valen para los dos. Solo el binario de node es de una arquitectura.
    cp -R "$TMP/node-$NODE_VERSION-darwin-arm64/bin" "$CARGA/runtime/"
    cp -R "$TMP/node-$NODE_VERSION-darwin-arm64/lib" "$CARGA/runtime/"
    cp "$TMP/node-$NODE_VERSION-darwin-arm64/LICENSE" "$CARGA/runtime/" 2>/dev/null || true

    # Lo bonito es un solo binario para las dos arquitecturas. lipo pasa por
    # xcrun, y xcrun se niega mientras no se haya aceptado la licencia de
    # Xcode (sudo xcodebuild -license accept). Si no se puede, se llevan los
    # dos binarios y un elector de tres líneas: pesa 50 MB más y funciona igual.
    if lipo -create \
      "$TMP/node-$NODE_VERSION-darwin-arm64/bin/node" \
      "$TMP/node-$NODE_VERSION-darwin-x64/bin/node" \
      -output "$CARGA/runtime/bin/node" 2>/dev/null; then
      chmod 755 "$CARGA/runtime/bin/node"
      echo "  Node universal: $(lipo -archs "$CARGA/runtime/bin/node")"
    else
      echo "  AVISO: lipo no está disponible (¿licencia de Xcode sin aceptar?)."
      echo "         Se llevan los dos binarios y un elector."
      cp "$TMP/node-$NODE_VERSION-darwin-arm64/bin/node" "$CARGA/runtime/bin/node-arm64"
      cp "$TMP/node-$NODE_VERSION-darwin-x64/bin/node" "$CARGA/runtime/bin/node-x64"
      cat > "$CARGA/runtime/bin/node" <<'ELECTOR'
#!/bin/sh
# Elige el Node de esta máquina. Lo escribe instalador/mac/construir.sh cuando
# no ha podido dejar un binario universal.
AQUI="$(cd "$(dirname "$0")" && pwd)"
case "$(uname -m)" in
  arm64) exec "$AQUI/node-arm64" "$@" ;;
  *) exec "$AQUI/node-x64" "$@" ;;
esac
ELECTOR
      chmod 755 "$CARGA/runtime/bin/node" "$CARGA/runtime/bin/node-arm64" "$CARGA/runtime/bin/node-x64"
    fi
  fi
fi

# --- npm fuera. Son 17 MB que no se usan: desde que el arnés viaja en el
#     .vsix, `preparar.js` solo necesita el node a secas. Se poda aquí para que
#     no vuelva al descargar otro Node.
if [ -d "$CARGA/runtime/lib/node_modules" ]; then
  rm -rf "$CARGA/runtime/lib/node_modules"
  rm -f "$CARGA/runtime/bin/npm" "$CARGA/runtime/bin/npx" "$CARGA/runtime/bin/corepack"
  rm -f "$CARGA/runtime/CHANGELOG.md" "$CARGA/runtime/README.md"
  echo "  Fuera npm: runtime $(du -sm "$CARGA/runtime" | cut -f1)M"
fi

# --- El arnés YA NO viaja en la carga: va dentro del .vsix, que es quien lo
#     usa. Los raíles, igual (extension/media/railes). Y la biblioteca del
#     historial tampoco hace falta, porque git es obligatorio y lo instala el
#     de Apple (decisión 26). Se limpia lo que dejaran las versiones viejas.
rm -rf "$CARGA/harness" "$CARGA/skills" "$CARGA/git"

# --- Lo nuestro. Solo lo que el instalador usa de verdad.
for modulo in preparar.js git.js ajustes.js ajustes-del-editor.js control-remoto.js; do
  cp "$RAIZ/instalador/comun/$modulo" "$CARGA/$modulo"
done
cp "$RAIZ/extension/media/disfraz.json" "$CARGA/disfraz.json"

if [ ! -f "$RAIZ/extension/executive-lab.vsix" ]; then
  echo "  Empaquetando la extensión…"
  (cd "$RAIZ/extension" && npm run --silent empaquetar >/dev/null)
fi
cp "$RAIZ/extension/executive-lab.vsix" "$CARGA/executive-lab.vsix"

# --- El icono. Da igual de dónde salga mientras acabe siendo un .icns.
if [ ! -f "$CARGA/executivelab.icns" ]; then
  # El icono es nuestro y se versiona junto al instalador de Windows.
  ORIGEN=""
  [ -f "$RAIZ/instalador/windows/executivelab.ico" ] && ORIGEN="$RAIZ/instalador/windows/executivelab.ico"
  if [ -n "$ORIGEN" ]; then
    echo "  Icono…"
    TMPI="$(mktemp -d)"
    if sips -s format png "$ORIGEN" --out "$TMPI/base.png" >/dev/null 2>&1; then
      mkdir -p "$TMPI/icono.iconset"
      for tam in 16 32 64 128 256 512; do
        sips -z $tam $tam "$TMPI/base.png" --out "$TMPI/icono.iconset/icon_${tam}x${tam}.png" >/dev/null 2>&1 || true
        sips -z $((tam * 2)) $((tam * 2)) "$TMPI/base.png" --out "$TMPI/icono.iconset/icon_${tam}x${tam}@2x.png" >/dev/null 2>&1 || true
      done
      iconutil -c icns "$TMPI/icono.iconset" -o "$CARGA/executivelab.icns" 2>/dev/null \
        || echo "  AVISO: no he podido armar el icono; la app saldrá con el genérico."
    fi
    rm -rf "$TMPI"
  else
    echo "  AVISO: sin icono de origen; la app saldrá con el genérico."
  fi
fi

echo "  Carga: $(du -sh "$CARGA" | cut -f1)"

# ─────────────────────────────────────────────────────── 2. la app instaladora

paso "La app"
ESCENARIO="$AQUI/escenario"
APP="$ESCENARIO/Instalar Executive Lab.app"
rm -rf "$ESCENARIO"
mkdir -p "$ESCENARIO"

osacompile -o "$APP" "$AQUI/instalar.applescript"

cp "$AQUI/instalar.js" "$APP/Contents/Resources/instalar.js"
# Lo primero que corre: consigue un Node y le pasa el trabajo a instalar.js.
cp "$AQUI/arrancar.sh" "$APP/Contents/Resources/arrancar.sh"
chmod 755 "$APP/Contents/Resources/arrancar.sh"
cp -R "$CARGA" "$APP/Contents/Resources/carga"
[ -f "$CARGA/executivelab.icns" ] && cp "$CARGA/executivelab.icns" "$APP/Contents/Resources/applet.icns"

# El Info.plist que deja osacompile es el de un applet cualquiera.
PLIST="$APP/Contents/Info.plist"
/usr/libexec/PlistBuddy -c "Set :CFBundleName Instalar Executive Lab" "$PLIST"
/usr/libexec/PlistBuddy -c "Add :CFBundleDisplayName string Instalar Executive Lab" "$PLIST" 2>/dev/null \
  || /usr/libexec/PlistBuddy -c "Set :CFBundleDisplayName Instalar Executive Lab" "$PLIST"
/usr/libexec/PlistBuddy -c "Add :CFBundleIdentifier string ai.executivelab.instalador" "$PLIST" 2>/dev/null \
  || /usr/libexec/PlistBuddy -c "Set :CFBundleIdentifier ai.executivelab.instalador" "$PLIST"
/usr/libexec/PlistBuddy -c "Add :CFBundleShortVersionString string $VERSION" "$PLIST" 2>/dev/null \
  || /usr/libexec/PlistBuddy -c "Set :CFBundleShortVersionString $VERSION" "$PLIST"
/usr/libexec/PlistBuddy -c "Add :CFBundleVersion string $VERSION" "$PLIST" 2>/dev/null \
  || /usr/libexec/PlistBuddy -c "Set :CFBundleVersion $VERSION" "$PLIST"
/usr/libexec/PlistBuddy -c "Add :LSMinimumSystemVersion string 12.0" "$PLIST" 2>/dev/null || true
# Sin esto, el applet enseña en el Dock el nombre del script.
/usr/libexec/PlistBuddy -c "Add :NSHumanReadableCopyright string Executive Lab" "$PLIST" 2>/dev/null || true

# La firma provisional, al final. osacompile firma el applet, y todo lo que se le
# pone después (instalar.js, la carga, el icono, el Info.plist) la rompe. Rota, un
# Mac que baja el .dmg de internet dice que la app «está dañada» y no deja abrirla
# de ninguna manera; válida, sale el aviso de siempre y «Abrir igualmente» la abre.
# Comprobado el 25-11-2026 con syspolicy_check sobre el .dmg de la 0.64.0: «Codesign
# Error, Fatal» sin esto; «Adhoc Signed App, Warning» con esto. firmar.sh la
# sustituye por la de Developer ID.
codesign --force --deep --sign - "$APP"
codesign --verify --deep --strict "$APP" \
  || { echo "La firma provisional de la app no es válida: el Mac diría que está dañada." >&2; exit 1; }

echo "  App: $(du -sh "$APP" | cut -f1)"

# ─────────────────────────────────────────────────────────────── 3. el .dmg

paso "El .dmg"
DMG="$AQUI/Executive Lab $VERSION.dmg"
rm -f "$DMG"
hdiutil create -volname "Executive Lab" -srcfolder "$ESCENARIO" -ov -format UDZO -quiet "$DMG"

echo
echo "Hecho: $DMG  ($(du -sh "$DMG" | cut -f1))"
echo
echo "Sin la firma de Apple: la primera vez, «Abrir igualmente» en Privacidad y seguridad."
echo "Con un certificado Developer ID, para que no pregunte:"
echo "  ./firmar.sh \"$DMG\""
