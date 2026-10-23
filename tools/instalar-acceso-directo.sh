#!/bin/sh
# Crea el acceso directo "Catan Virtual" (menú de aplicaciones y barra de tareas) en Linux.
# Uso: sh tools/instalar-acceso-directo.sh   (desde la carpeta del proyecto, después de npm install)
set -e
DIR="$(cd "$(dirname "$0")/.." && pwd)"
APPS="$HOME/.local/share/applications"
mkdir -p "$APPS"
cat > "$APPS/catan-virtual.desktop" <<EOF
[Desktop Entry]
Type=Application
Name=Catan Virtual
Comment=Colonos de Catan: contra la máquina o en red local
Exec="$DIR/node_modules/electron/dist/electron" "$DIR" --no-sandbox
Path=$DIR
Icon=$DIR/build/icon.png
Terminal=false
Categories=Game;BoardGame;
StartupWMClass=Catan Virtual
EOF
chmod +x "$APPS/catan-virtual.desktop"
update-desktop-database "$APPS" 2>/dev/null || true
echo "Acceso directo creado: $APPS/catan-virtual.desktop"
