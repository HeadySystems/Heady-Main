#!/bin/bash
# HeadyAI-IDE — Rebrand Windsurf .deb as HeadyAI-IDE
# Run inside a Debian container with /work mounted to C:\Dropzone
set -e

DEB_IN="/work/Windsurf-linux-x64-1.9552.21.deb"
WORK_DIR="/tmp/heady-rebrand"
OUT_DEB="/work/HeadyAI-IDE-linux-x64-1.0.0.deb"

echo "═══ HeadyAI-IDE .deb Rebranding ═══"

# 1. Extract the .deb
echo "[1/6] Extracting original .deb..."
mkdir -p "$WORK_DIR/extract"
dpkg-deb -R "$DEB_IN" "$WORK_DIR/extract"

echo "[2/6] Rebranding control file..."
# Update the control file
CTRL="$WORK_DIR/extract/DEBIAN/control"
if [ -f "$CTRL" ]; then
    sed -i 's/Package: windsurf/Package: headyai-ide/g' "$CTRL"
    sed -i 's/Package: codium/Package: headyai-ide/g' "$CTRL"
    sed -i 's/Package: code/Package: headyai-ide/g' "$CTRL"
    sed -i 's/Windsurf/HeadyAI-IDE/g' "$CTRL"
    sed -i 's/windsurf/headyai-ide/g' "$CTRL"
    sed -i 's/Codeium/Heady Systems/g' "$CTRL"
    sed -i 's/codeium/headysystems/g' "$CTRL"
    # Update maintainer
    sed -i 's/Maintainer:.*/Maintainer: Heady Systems <dev@headysystems.com>/' "$CTRL"
    sed -i 's/Homepage:.*/Homepage: https:\/\/headyme.com/' "$CTRL"
    sed -i 's/Description:.*/Description: HeadyAI-IDE — Sacred Geometry AI Development Environment/' "$CTRL"
    echo "   Control file updated:"
    cat "$CTRL"
else
    echo "   WARNING: No DEBIAN/control found"
    ls -la "$WORK_DIR/extract/DEBIAN/" 2>/dev/null || echo "   No DEBIAN dir"
fi

echo "[3/6] Rebranding .desktop launcher..."
# Find and rebrand .desktop files
find "$WORK_DIR/extract" -name "*.desktop" -exec sed -i \
    -e 's/Windsurf/HeadyAI-IDE/g' \
    -e 's/windsurf/headyai-ide/g' \
    -e 's/Codeium/Heady Systems/g' \
    {} \;

# Also rename desktop file if it exists
for f in $(find "$WORK_DIR/extract" -name "*windsurf*" -o -name "*Windsurf*" 2>/dev/null); do
    newname=$(echo "$f" | sed 's/[Ww]indsurf/headyai-ide/g')
    if [ "$f" != "$newname" ]; then
        dir=$(dirname "$newname")
        mkdir -p "$dir"
        mv "$f" "$newname" 2>/dev/null || true
        echo "   Renamed: $(basename $f) → $(basename $newname)"
    fi
done

echo "[4/6] Rebranding binary symlinks..."
# Rebrand usr/bin symlinks
if [ -L "$WORK_DIR/extract/usr/bin/windsurf" ]; then
    target=$(readlink "$WORK_DIR/extract/usr/bin/windsurf")
    newtarget=$(echo "$target" | sed 's/windsurf/headyai-ide/g')
    rm "$WORK_DIR/extract/usr/bin/windsurf"
    ln -s "$newtarget" "$WORK_DIR/extract/usr/bin/headyai-ide" 2>/dev/null || true
    echo "   Symlink: headyai-ide → $newtarget"
fi

# Rename the main application directory
for d in "$WORK_DIR/extract/usr/share/windsurf" "$WORK_DIR/extract/opt/windsurf"; do
    if [ -d "$d" ]; then
        newdir=$(echo "$d" | sed 's/windsurf/headyai-ide/g')
        mv "$d" "$newdir"
        echo "   Moved: $d → $newdir"
    fi
done

echo "[5/6] Injecting Heady branding into product.json..."
# Find and modify product.json
PROD_JSON=$(find "$WORK_DIR/extract" -name "product.json" -path "*/resources/*" 2>/dev/null | head -1)
if [ -n "$PROD_JSON" ] && [ -f "$PROD_JSON" ]; then
    # Use Python for safe JSON manipulation if available, otherwise sed
    if command -v python3 &>/dev/null; then
        python3 -c "
import json, sys
with open('$PROD_JSON') as f:
    p = json.load(f)
p['nameShort'] = 'HeadyAI-IDE'
p['nameLong'] = 'HeadyAI-IDE — Sacred Geometry AI Development Environment'
p['applicationName'] = 'headyai-ide'
p['dataFolderName'] = '.headyai-ide'
p['win32MutexName'] = 'headyai-ide'
p['licenseName'] = 'Heady Systems License'
p['licenseUrl'] = 'https://headyme.com/license'
p['reportIssueUrl'] = 'https://github.com/HeadySystems/HeadyAI-IDE/issues'
p['urlProtocol'] = 'headyai-ide'
with open('$PROD_JSON', 'w') as f:
    json.dump(p, f, indent=2)
print('   product.json updated successfully')
"
    else
        sed -i \
            -e 's/"nameShort".*:.*"[^"]*"/"nameShort": "HeadyAI-IDE"/' \
            -e 's/"nameLong".*:.*"[^"]*"/"nameLong": "HeadyAI-IDE — Sacred Geometry AI Development Environment"/' \
            -e 's/"applicationName".*:.*"[^"]*"/"applicationName": "headyai-ide"/' \
            "$PROD_JSON"
        echo "   product.json updated (sed fallback)"
    fi
else
    echo "   No product.json found — skipping"
fi

# Inject Heady default settings
DEFAULTS_DIR=$(find "$WORK_DIR/extract" -type d -name "defaults" -path "*/resources/*" 2>/dev/null | head -1)
if [ -z "$DEFAULTS_DIR" ]; then
    DEFAULTS_DIR=$(find "$WORK_DIR/extract" -type d -name "resources" 2>/dev/null | head -1)
    if [ -n "$DEFAULTS_DIR" ]; then
        DEFAULTS_DIR="$DEFAULTS_DIR/defaults"
        mkdir -p "$DEFAULTS_DIR"
    fi
fi

if [ -n "$DEFAULTS_DIR" ]; then
    cat > "$DEFAULTS_DIR/heady-settings.json" << 'SETTINGS_EOF'
{
  "workbench.colorTheme": "Default Dark Modern",
  "workbench.iconTheme": "vs-seti",
  "editor.fontFamily": "'Geist Mono', 'Fira Code', 'Cascadia Code', 'Consolas', monospace",
  "editor.fontSize": 14,
  "editor.fontLigatures": true,
  "editor.minimap.enabled": true,
  "editor.bracketPairColorization.enabled": true,
  "editor.formatOnSave": true,
  "terminal.integrated.defaultProfile.linux": "bash",
  "workbench.colorCustomizations": {
    "activityBar.background": "#0a0a0c",
    "sideBar.background": "#0e0e12",
    "editor.background": "#0a0a0c",
    "statusBar.background": "#1a0030",
    "titleBar.activeBackground": "#0a0a0c",
    "titleBar.activeForeground": "#00f2ff",
    "tab.activeBackground": "#16161a",
    "activityBarBadge.background": "#bd00ff",
    "statusBar.foreground": "#00f2ff"
  }
}
SETTINGS_EOF
    echo "   Heady default settings injected"
fi

echo "[6/6] Building rebranded .deb..."
# Fix permissions
find "$WORK_DIR/extract" -type d -exec chmod 755 {} \;
find "$WORK_DIR/extract/DEBIAN" -type f -exec chmod 644 {} \;
find "$WORK_DIR/extract/DEBIAN" -name "post*" -o -name "pre*" | xargs chmod 755 2>/dev/null || true

dpkg-deb --build "$WORK_DIR/extract" "$OUT_DEB"

# Show result
echo ""
echo "═══════════════════════════════════════════"
echo "✓ HeadyAI-IDE .deb built successfully!"
echo "  File: $OUT_DEB"
echo "  Size: $(du -h "$OUT_DEB" | cut -f1)"
echo "═══════════════════════════════════════════"

# Cleanup
rm -rf "$WORK_DIR"
