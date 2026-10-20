#!/usr/bin/env bash
# TK-REL-SEC-34: instrumentatietests op de emulator; uitvoer in een logbestand zodat een volgende stap de oorzaak van
# een fout als annotatie kan tonen (logs zijn niet overal leesbaar). Argument: komma-gescheiden testklassen.
set -o pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
LOG="$ROOT/instrumentatie.log"
echo "::notice title=emulator-script::gestart; sdk=$(adb shell getprop ro.build.version.sdk 2>&1 | tr -d '\r')"
# Animaties uit (zelf, zodat een fout hierin de test niet blokkeert).
for k in window_animation_scale transition_animation_scale animator_duration_scale; do adb shell settings put global "$k" 0 || true; done
cd "$ROOT/android"
./gradlew :app:connectedDebugAndroidTest --no-daemon --stacktrace \
  "-Pandroid.testInstrumentationRunnerArguments.class=$1" 2>&1 | tee "$LOG"
rc=$?
echo "::notice title=emulator-script::gradle exit=$rc"
# JUnit-XML zoeken (pad verschilt per AGP-versie) en als annotaties tonen.
find "$ROOT/android" -path '*/build/*' -name '*.xml' -newer "$ROOT/package.json" 2>/dev/null | xargs -r grep -l '<testsuite' 2>/dev/null | head -n 5 | while IFS= read -r f; do
  echo "::notice title=emulator-xml::${f#$ROOT/}"
  python3 "$ROOT/tools/ci/junit-annotaties.py" "$f" "emulator-sdk" || true
done
exit $rc
