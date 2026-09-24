#!/bin/bash
# Builds the small Mac installer, public/Install-Dwiddle.zip.
#
# It is an AppleScript app of a few hundred kilobytes that fetches the newest
# Dwiddle from the releases page, checks it, and puts it in Applications. It
# always installs the newest version, so it only needs rebuilding when the
# installer itself changes, not for each release.
set -euo pipefail
cd "$(dirname "$0")/.."

OUT="$(mktemp -d)"
APP="$OUT/Install Dwiddle.app"

osacompile -o "$APP" "installer/mac/Install Dwiddle.applescript"
cp installer/mac/install.sh "$APP/Contents/Resources/install.sh"
chmod +x "$APP/Contents/Resources/install.sh"
# The Dwiddle icon, made from the same PNG the app's own icon comes from.
ICONSET="$OUT/icon.iconset"
mkdir -p "$ICONSET"
for n in 16 32 128 256 512; do
  sips -z $n $n build/icon.png --out "$ICONSET/icon_${n}x${n}.png" >/dev/null
  sips -z $((n * 2)) $((n * 2)) build/icon.png --out "$ICONSET/icon_${n}x${n}@2x.png" >/dev/null
done
iconutil -c icns "$ICONSET" -o "$APP/Contents/Resources/applet.icns"
rm -rf "$ICONSET"
/usr/libexec/PlistBuddy -c "Set :CFBundleName Install Dwiddle" "$APP/Contents/Info.plist"
/usr/libexec/PlistBuddy -c "Add :CFBundleIdentifier string app.dwiddle.installer" "$APP/Contents/Info.plist" 2>/dev/null \
  || /usr/libexec/PlistBuddy -c "Set :CFBundleIdentifier app.dwiddle.installer" "$APP/Contents/Info.plist"
/usr/libexec/PlistBuddy -c "Set :NSAppleEventsUsageDescription The installer closes an open copy of Dwiddle before replacing it." "$APP/Contents/Info.plist" 2>/dev/null \
  || /usr/libexec/PlistBuddy -c "Add :NSAppleEventsUsageDescription string The installer closes an open copy of Dwiddle before replacing it." "$APP/Contents/Info.plist"

# Signed ad hoc, which is what lets it run on Apple Silicon at all.
codesign --force --deep --sign - "$APP"
codesign --verify --deep --strict "$APP"

rm -f public/Install-Dwiddle.zip
ditto -c -k --sequesterRsrc --keepParent "$APP" public/Install-Dwiddle.zip
rm -rf "$OUT"
ls -l public/Install-Dwiddle.zip
