#!/usr/bin/env bash
# TK-REL-SEC-34: instrumentatietests op de emulator; uitvoer in een logbestand zodat een volgende stap de oorzaak van
# een fout als annotatie kan tonen (logs zijn niet overal leesbaar). Argument: komma-gescheiden testklassen.
set -o pipefail
cd "$(dirname "$0")/../../android"
./gradlew :app:connectedDebugAndroidTest --no-daemon --stacktrace \
  "-Pandroid.testInstrumentationRunnerArguments.class=$1" 2>&1 | tee ../instrumentatie.log
