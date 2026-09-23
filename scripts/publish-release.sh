#!/usr/bin/env bash
# Publish the built installers to the releases repo.
#
# electron-builder can do this itself with --publish always, but only while it
# is building. This uploads what is already sitting in release/, so a build
# does not have to be repeated an hour later just to publish it.
#
# The token is the one the GitHub CLI stored when you signed in. It is read
# here, used, and never written anywhere.
#
#   ./scripts/publish-release.sh 1.0.5

set -euo pipefail

VERSION="${1:-}"
if [ -z "$VERSION" ]; then
  echo "usage: $0 <version>   e.g. $0 1.0.5" >&2
  exit 1
fi

REPO="pachdono/dwiddle-releases"
DIR="$(cd "$(dirname "$0")/.." && pwd)/release"

TOKEN="$(security find-internet-password -s github.com -w 2>/dev/null || true)"
if [ -z "$TOKEN" ]; then
  echo "No GitHub token in the keychain. Sign in with: gh auth login" >&2
  exit 1
fi

api() { curl -sS -H "Authorization: token $TOKEN" -H "Accept: application/vnd.github+json" "$@"; }

# Paths inside release/. Each is uploaded under its own file name, and the
# Windows ones come from nsis-web/, where the web installer writes them.
#
# The .nsis.7z is not optional and its name is not cosmetic: the small Windows
# installer downloads exactly that file from exactly this release, so without
# it every Windows install fails halfway.
FILES=(
  "Dwiddle-$VERSION-arm64.dmg"
  "Dwiddle-$VERSION-arm64.dmg.blockmap"
  "Dwiddle-$VERSION-x64.dmg"
  "Dwiddle-$VERSION-x64.dmg.blockmap"
  "latest-mac.yml"
  "nsis-web/Dwiddle-Setup-$VERSION.exe"
  "nsis-web/dwiddle-$VERSION-x64.nsis.7z"
  "nsis-web/latest.yml"
)

for f in "${FILES[@]}"; do
  [ -f "$DIR/$f" ] || { echo "missing: release/$f" >&2; exit 1; }
done

# The update manifests have to name this version, or an installed copy is told
# to fetch something that is not there.
grep -q "^version: $VERSION$" "$DIR/latest-mac.yml" || { echo "latest-mac.yml is not $VERSION" >&2; exit 1; }
grep -q "^version: $VERSION$" "$DIR/nsis-web/latest.yml" || { echo "nsis-web/latest.yml is not $VERSION" >&2; exit 1; }

echo "Publishing v$VERSION to $REPO"

ID="$(api "https://api.github.com/repos/$REPO/releases/tags/v$VERSION" \
  | python3 -c 'import sys,json;print(json.load(sys.stdin).get("id",""))')"

if [ -z "$ID" ]; then
  ID="$(api -X POST "https://api.github.com/repos/$REPO/releases" \
    -d "{\"tag_name\":\"v$VERSION\",\"name\":\"Dwiddle $VERSION\",\"body\":\"Mac and Windows builds of Dwiddle $VERSION.\",\"draft\":false,\"prerelease\":false}" \
    | python3 -c 'import sys,json;print(json.load(sys.stdin).get("id",""))')"
  [ -n "$ID" ] || { echo "could not create the release" >&2; exit 1; }
  echo "  created, id $ID"
else
  echo "  already exists, id $ID, replacing its files"
fi

# Anything already attached under one of these names is removed first, so a
# second run replaces the files rather than failing on every one of them.
api "https://api.github.com/repos/$REPO/releases/$ID/assets" \
  | python3 -c 'import sys,json;[print(a["id"],a["name"]) for a in json.load(sys.stdin)]' \
  | while read -r aid aname; do
      for f in "${FILES[@]}"; do
        if [ "$aname" = "$(basename "$f")" ]; then
          echo "  removing the old $aname"
          api -X DELETE "https://api.github.com/repos/$REPO/releases/assets/$aid" > /dev/null
        fi
      done
    done

for f in "${FILES[@]}"; do
  name="$(basename "$f")"
  echo "  uploading $name ($(du -h "$DIR/$f" | cut -f1 | tr -d ' '))"
  curl -sS --fail-with-body \
    -H "Authorization: token $TOKEN" \
    -H "Content-Type: application/octet-stream" \
    --data-binary "@$DIR/$f" \
    "https://uploads.github.com/repos/$REPO/releases/$ID/assets?name=$name" > /dev/null
done

echo
echo "Published: https://github.com/$REPO/releases/tag/v$VERSION"
