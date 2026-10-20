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
exit $rc
