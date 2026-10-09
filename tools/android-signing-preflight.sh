#!/usr/bin/env bash
# ADR-ANDROID-SIGNING-001 — preflight zonder sleutelmateriaal.
# Controleert dat de repository geen signing-geheimen bevat en dat de workflows
# sleutelmateriaal nooit naar logs of artefacten kunnen lekken. Leest alleen; wijzigt niets.
# Exitcode 0 = schoon, 1 = overtreding.
set -euo pipefail
cd "$(dirname "$0")/.."

fout=0
meld() { echo "SIGNING-PREFLIGHT: $1"; fout=1; }

# 1. Geen keystores, private keys of keystore.properties in Git.
verboden="$(git ls-files | grep -iE '(\.jks|\.keystore|\.p12|\.pfx|\.pk8|\.pem)$|(^|/)keystore\.properties$' || true)"
[ -z "$verboden" ] || meld "sleutelbestand(en) in Git: $verboden"

# 2. Geen echte PEM-private keys in getrackte tekstbestanden (een korte testfixture zoals
#    "-----BEGIN PRIVATE KEY-----\ntest" telt niet: een echte sleutel heeft base64-regels van 64 tekens).
for f in $(git grep -lI -e '-----BEGIN [A-Z ]*PRIVATE KEY-----' -- . ':(exclude)tools/android-signing-preflight.sh' || true); do
  if awk '/-----BEGIN [A-Z ]*PRIVATE KEY-----/{n=NR; if ($0 ~ /PRIVATE KEY-----(\\n)?[A-Za-z0-9+\/=]{64}/) hit=1} n&&NR==n+1&&$0 ~ /^[A-Za-z0-9+\/=]{64}$/{hit=1} END{exit hit?0:1}' "$f"; then
    meld "private key in $f"
  fi
done

# 3. .gitignore dekt de sleutelbestanden af.
for patroon in 'android/keystore.properties' '*.jks' '*.keystore'; do
  grep -qxF "$patroon" .gitignore || meld ".gitignore mist '$patroon'"
done

# 4. Workflows: secrets nooit echoën, geen set -x in signingstappen, geen sleutel in artefacten.
for wf in .github/workflows/*.yml; do
  if grep -nE 'echo[^#]*\$\{\{ *secrets\.' "$wf" >/dev/null; then meld "$wf echoot een secret"; fi
done
INT=.github/workflows/android-internal-apk.yml
if [ -f "$INT" ]; then
  grep -q 'environment: android-internal' "$INT" || meld "$INT: signing-job zonder beschermde environment"
  grep -q 'RUNNER_TEMP/tk-internal.jks' "$INT" || meld "$INT: keystore niet in RUNNER_TEMP"
  grep -q 'rm -f "\$RUNNER_TEMP/tk-internal.jks"' "$INT" || meld "$INT: keystore wordt niet opgeruimd"
  grep -qE '^\s*set -x' "$INT" && meld "$INT: set -x kan secrets in de log zetten"
  # artefactpaden mogen geen RUNNER_TEMP of keystore bevatten
  awk '/upload-artifact/{f=1} f&&/path:/{p=1;next} p&&/^[[:space:]]*-?[[:space:]]*[A-Za-z]+:/{p=0;f=0} p{print}' "$INT" | grep -qiE 'RUNNER_TEMP|\.jks|\.keystore' && meld "$INT: artefact bevat sleutelmateriaal"
fi

# 5. Vingerafdrukbestand: placeholder of 64 hex.
FP=android/signing/INTERNAL_CERT_SHA256
if [ -f "$FP" ]; then
  waarde="$(grep -vE '^\s*(#|$)' "$FP" | head -n1 | tr -d '[:space:]')"
  echo "$waarde" | grep -qE '^(NOG_NIET_VASTGESTELD|[0-9a-f]{64})$' || meld "$FP heeft een ongeldige waarde"
else
  meld "$FP ontbreekt"
fi

# 6. De release-buildtype valt nooit terug op de debugsleutel.
grep -q 'signingConfig signingConfigs.debug' android/app/build.gradle && meld "release valt terug op de debugsleutel"

if [ "$fout" -ne 0 ]; then echo "SIGNING-PREFLIGHT: MISLUKT"; exit 1; fi
echo "SIGNING-PREFLIGHT: OK"
