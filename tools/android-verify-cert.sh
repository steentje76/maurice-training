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
  BT="$(ls -d "${ANDROID_HOME:-${ANDROID_SDK_ROOT:-}}"/build-tools/*/ 2>/dev/null | sort -V | tail -n1 || true)"
  APKSIGNER="${BT}apksigner"
fi
"$APKSIGNER" verify --verbose --print-certs "$APK" > "${APK}.signing.txt"
CERT="$(grep -m1 -E 'Signer #1 certificate SHA-256 digest' "${APK}.signing.txt" | awk -F': ' '{print $2}' | tr -d '[:space:]:' | tr 'A-F' 'a-f')"
echo "$CERT" | grep -qE '^[0-9a-f]{64}$' || { echo "Geen geldige certificaatvingerafdruk gevonden"; exit 1; }
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
