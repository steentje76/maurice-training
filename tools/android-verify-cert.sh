#!/usr/bin/env bash
# ADR-ANDROID-SIGNING-001 — vergelijkt de certificaatvingerafdruk van een gebouwde APK
# met de vastgelegde, publieke vingerafdruk. Leest geen sleutelmateriaal.
#   tools/android-verify-cert.sh <apk> [verwacht-bestand]
# Zonder verwacht-bestand: alleen de vingerafdruk tonen (exit 0).
# Exit 1 = afwijkend, exit 2 = geen vastgestelde vingerafdruk (placeholder).
set -euo pipefail
APK="$1"; VERWACHT_BESTAND="${2:-}"
test -f "$APK" || { echo "APK niet gevonden: $APK"; exit 1; }
if [ -z "${APKSIGNER:-}" ]; then
  SDK="${ANDROID_HOME:-${ANDROID_SDK_ROOT:-}}"
  APKSIGNER="$(find "$SDK/build-tools" -maxdepth 2 -name apksigner -type f 2>/dev/null | sort -V | tail -n1 || true)"
  [ -n "$APKSIGNER" ] || APKSIGNER="$(command -v apksigner || true)"
fi
[ -n "$APKSIGNER" ] || { echo "::error::apksigner niet gevonden (ANDROID_HOME=${ANDROID_HOME:-leeg})"; exit 1; }
set +e
"$APKSIGNER" verify --verbose --print-certs "$APK" > "${APK}.signing.txt" 2> "${APK}.signing.err"
rc=$?
set -e
# Alleen publieke certificaatgegevens; de vingerafdruk staat op een regel "... certificate SHA-256 digest: <hex>".
CERT="$(grep -m1 -iE 'certificate SHA-256 digest' "${APK}.signing.txt" | sed -E 's/.*digest:[[:space:]]*//' | tr -d '[:space:]:' | tr 'A-F' 'a-f')"
if [ "$rc" -ne 0 ] || ! echo "$CERT" | grep -qE '^[0-9a-f]{64}$'; then
  echo "::error::apksigner verify gaf exitcode ${rc}; geen geldige certificaatvingerafdruk. Uitvoer: $(head -c 400 "${APK}.signing.txt" | tr '\n' ' ') $(grep -v -i 'warning' "${APK}.signing.err" | head -c 300 | tr '\n' ' ')"
  exit 1
fi
rm -f "${APK}.signing.err"
echo "cert_sha256=$CERT"
if [ -n "${GITHUB_OUTPUT:-}" ]; then echo "cert_sha256=$CERT" >> "$GITHUB_OUTPUT"; fi
[ -n "$VERWACHT_BESTAND" ] || exit 0
VERWACHT="$(grep -vE '^\s*(#|$)' "$VERWACHT_BESTAND" | head -n1 | tr -d '[:space:]')"
if [ "$VERWACHT" = "NOG_NIET_VASTGESTELD" ]; then
  echo "::error::Er is nog geen interne certificaatvingerafdruk vastgesteld (PO-besluit ADR-ANDROID-SIGNING-001)."
  exit 2
fi
if [ "$CERT" != "$VERWACHT" ]; then
  echo "::error::Certificaat wijkt af van ${VERWACHT_BESTAND}: deze APK kan een bestaande installatie NIET bijwerken. Verwacht ${VERWACHT}, kreeg ${CERT}."
  exit 1
fi
echo "Certificaat komt overeen met ${VERWACHT_BESTAND}: APK is updatebaar over installaties met dezelfde sleutel."
