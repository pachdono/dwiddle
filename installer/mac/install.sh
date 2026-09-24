#!/bin/bash
# Fetches and installs the newest Dwiddle for this Mac. Run by the small
# "Install Dwiddle" app, which shows the progress this writes to a file.
#
#   install.sh STATUS_FILE [DESTINATION]
#
# Each status line is "stage|percent|message". The destination is only given
# when testing; normally it is Applications.

set -u
STATUS="$1"
DEST="${2:-}"
REPO="pachdono/dwiddle-releases"

say() { printf '%s|%s|%s\n' "$1" "$2" "$3" > "$STATUS.tmp" && mv "$STATUS.tmp" "$STATUS"; }
fail() { say error 0 "$1"; exit 1; }

say find 0 "Finding the newest version"
TAG=$(curl -fsSL "https://api.github.com/repos/$REPO/releases/latest" \
  | grep -m1 '"tag_name"' | sed -E 's/.*"tag_name": *"v?([^"]+)".*/\1/')
[ -n "$TAG" ] || fail "Dwiddle could not be reached. Check your internet connection and try again."

# Apple Silicon or Intel, asked of the hardware rather than of this process,
# which could be running translated.
if [ "$(sysctl -n hw.optional.arm64 2>/dev/null)" = "1" ]; then CHIP=arm64; else CHIP=x64; fi
FILE="Dwiddle-$TAG-$CHIP.dmg"
BASE="https://github.com/$REPO/releases/download/v$TAG"

WANT=$(curl -fsSL "$BASE/latest-mac.yml" | awk -v f="url: $FILE" 'index($0, f) { getline; sub(/.*sha512: */, ""); print; exit }')
[ -n "$WANT" ] || fail "The newest version could not be checked. Try again in a minute."

WORK=$(mktemp -d /tmp/dwiddle-install.XXXXXX)
trap 'hdiutil detach "$WORK/mnt" -quiet >/dev/null 2>&1; rm -rf "$WORK"' EXIT

TOTAL=$(curl -fsSLI "$BASE/$FILE" | tr -d '\r' | awk 'tolower($1) == "content-length:" { n = $2 } END { print n + 0 }')
curl -fsSL -o "$WORK/$FILE" "$BASE/$FILE" &
PID=$!
while kill -0 "$PID" 2>/dev/null; do
  GOT=$(stat -f%z "$WORK/$FILE" 2>/dev/null || echo 0)
  if [ "$TOTAL" -gt 0 ]; then PCT=$(( GOT * 100 / TOTAL )); else PCT=0; fi
  say download "$PCT" "Downloading Dwiddle $TAG, $(( GOT / 1048576 )) of $(( TOTAL / 1048576 )) MB"
  sleep 0.4
done
wait "$PID" || fail "The download stopped part way. Check your internet connection and try again."

# Anything that does not match the published checksum is thrown away.
GOT_HASH=$(shasum -a 512 "$WORK/$FILE" | cut -d' ' -f1 | xxd -r -p | base64)
[ "$GOT_HASH" = "$WANT" ] || fail "The download did not match the published version, so it was not installed. Try again."

say install 100 "Putting Dwiddle in Applications"
if [ -z "$DEST" ]; then
  DEST=/Applications
  [ -w /Applications ] || { DEST="$HOME/Applications"; mkdir -p "$DEST"; }
fi
mkdir -p "$WORK/mnt"
hdiutil attach "$WORK/$FILE" -nobrowse -readonly -noautoopen -mountpoint "$WORK/mnt" >/dev/null \
  || fail "The download could not be opened. Try again."

# An open copy is closed first, or the old version would keep running.
osascript -e 'tell application id "app.dwiddle.desktop" to quit' >/dev/null 2>&1
sleep 1

rm -rf "$DEST/Dwiddle.app.new"
ditto "$WORK/mnt/Dwiddle.app" "$DEST/Dwiddle.app.new" || fail "Dwiddle could not be copied into $DEST."
rm -rf "$DEST/Dwiddle.app" && mv "$DEST/Dwiddle.app.new" "$DEST/Dwiddle.app" || fail "Dwiddle could not be put in $DEST."
xattr -dr com.apple.quarantine "$DEST/Dwiddle.app" 2>/dev/null

say done 100 "$DEST/Dwiddle.app"
