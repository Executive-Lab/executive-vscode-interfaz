#!/bin/bash
# Sube el .dmg y el .exe a la release de su versión.
#
#   instalador/a-la-release.sh v0.65.0 <carpeta>            los sube
#   instalador/a-la-release.sh v0.65.0 <carpeta> --ensayo   dice qué subiría, sin subir nada
#
# <carpeta> es donde están los dos tal como salen al construirlos: `Executive Lab <versión>.dmg`
# (mac/construir.sh) y `ExecutiveLab-Setup.exe` (Inno). Lo lanza GitHub al publicar una release
# (windows.yml, trabajo `a-la-release`), cuando los dos ya se han instalado y comprobado en una
# máquina limpia: lo que no pasa sus pruebas no llega aquí.
#
# Por qué existe: publicar.sh corre en un Mac, y el .exe solo se compila en Windows. Hasta la 0.64.0
# los instaladores se subían a mano, y las releases salían sin ellos: el enlace que se da a los
# alumnos (`releases/latest`) llevaba a una página sin nada que instalar.
#
# Van sin firmar, a propósito (Jose, 25-11-2026; instalador/README.md, «Firma»). Los sube la cuenta
# de GitHub Actions, no la de quien publica, y da igual: la barra solo se pone al día con el .vsix
# subido por QUIEN_PUBLICA (extension/src/version.js).
set -euo pipefail

ETIQUETA="${1:?Falta la etiqueta de la release, como v0.65.0}"
CARPETA="${2:?Falta la carpeta con el .dmg y el .exe}"
ENSAYO=0
[ "${3:-}" = "--ensayo" ] && ENSAYO=1
R="$(cd "$(dirname "$0")/.." && pwd)"
VERSION=$(node -p "require('$R/extension/package.json').version")

# La etiqueta y el código tienen que ser la misma versión. Si no, se colgarían de una release
# instaladores que instalan otra, con el número de la release en el nombre.
if [ "$ETIQUETA" != "v$VERSION" ]; then
  echo "La release es $ETIQUETA y el código es la $VERSION: no se sube nada." >&2
  echo "La etiqueta tiene que ser «v» y el número de extension/package.json." >&2
  exit 1
fi

DMG="$CARPETA/Executive Lab $VERSION.dmg"
EXE="$CARPETA/ExecutiveLab-Setup.exe"
for f in "$DMG" "$EXE"; do
  if [ ! -s "$f" ]; then
    echo "Falta $(basename "$f") en $CARPETA: no se sube nada." >&2
    ls -la "$CARPETA" >&2 || true
    exit 1
  fi
done

# Con la versión en el nombre, y sin espacios: GitHub los cambiaría por puntos.
SALIDA="$CARPETA/para-la-release"
mkdir -p "$SALIDA"
MAC="ExecutiveLab-$VERSION.dmg"
WIN="ExecutiveLab-Setup-$VERSION.exe"
cp "$DMG" "$SALIDA/$MAC"
cp "$EXE" "$SALIDA/$WIN"

huella() { echo "sha256:$(shasum -a 256 "$1" | cut -d' ' -f1)"; }

echo "Para la release $ETIQUETA:"
for n in "$MAC" "$WIN"; do
  printf '  %-34s %3s MB  %s\n' "$n" "$(( $(wc -c < "$SALIDA/$n") / 1048576 ))" "$(huella "$SALIDA/$n")"
done

if [ "$ENSAYO" = "1" ]; then
  echo "Ensayo: no se ha subido nada."
  exit 0
fi

# --clobber: si se relanza, se pone encima la misma versión, construida otra vez del mismo commit.
gh release upload "$ETIQUETA" --clobber \
  "$SALIDA/$MAC#Instalador para Mac (sin firmar)" \
  "$SALIDA/$WIN#Instalador para Windows (sin firmar)"

# Y se mira que lo que hay en la release es lo que se ha construido, byte a byte.
for n in "$MAC" "$WIN"; do
  esperada=$(huella "$SALIDA/$n")
  subida=""
  for intento in 1 2 3 4 5; do
    subida=$(gh api "repos/{owner}/{repo}/releases/tags/$ETIQUETA" --jq ".assets[] | select(.name == \"$n\") | .digest")
    [ "$subida" = "$esperada" ] && break
    sleep 3
  done
  if [ "$subida" != "$esperada" ]; then
    echo "$n en la release no es el que se ha construido: «$subida» en vez de «$esperada»." >&2
    exit 1
  fi
done
echo "Subidos y comprobados: $(gh release view "$ETIQUETA" --json url --jq .url)"
