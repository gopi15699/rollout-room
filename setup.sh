#!/bin/bash
# Prepares everything the agents use, under ~/.rollout-room:
#   basket.git   the app's repository, holding only the app, so agents can't read this project's docs
#   bin          fake-store and basket-sim
#   store        the simulated rollout state
#   Basket.app   a simulator build of the app
#   work         a folder per agent for its checkout
# Run it again at any time to reset the demo. It reuses the simulator and the app build.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")" && pwd)"
HOME_DIR="${ROLLOUT_ROOM_HOME:-$HOME/.rollout-room}"
SIM_NAME="Rollout Room"
METRO_PORT="${METRO_PORT:-8082}"

mkdir -p "$HOME_DIR/bin" "$HOME_DIR/store"
rm -rf "$HOME_DIR/work" "$HOME_DIR/basket.git" "$HOME_DIR/sim.lock" "$HOME_DIR/store/state.json"
mkdir -p "$HOME_DIR/work"

cp "$ROOT/tools/fake-store" "$ROOT/tools/basket-sim" "$HOME_DIR/bin/"
chmod +x "$HOME_DIR/bin/fake-store" "$HOME_DIR/bin/basket-sim"
cp "$ROOT/tools/scenario.json" "$HOME_DIR/store/scenario.json"

# Rebuild the app's history from the tags. Fixed names and dates keep the hashes stable between resets.
SEED="$(mktemp -d)"
trap 'rm -rf "$SEED"' EXIT
git init -q -b main "$SEED"
export GIT_AUTHOR_NAME="Basket team" GIT_AUTHOR_EMAIL="team@basket.test"
export GIT_COMMITTER_NAME="Basket team" GIT_COMMITTER_EMAIL="team@basket.test"
day=1
for tag in v1.4.0 v1.5.0; do
  find "$SEED" -mindepth 1 -maxdepth 1 ! -name .git -exec rm -rf {} +
  git -C "$ROOT" archive "$tag" demo-app | tar -x --strip-components=1 -C "$SEED"
  git -C "$SEED" add -A
  export GIT_AUTHOR_DATE="2026-10-0${day}T10:00:00+0530" GIT_COMMITTER_DATE="2026-10-0${day}T10:00:00+0530"
  git -C "$SEED" commit -q -m "$(git -C "$ROOT" log -1 --format=%s "$tag")"
  git -C "$SEED" tag "$tag"
  day=$((day + 1))
done
git clone -q --bare "$SEED" "$HOME_DIR/basket.git"

SIM_UDID="$(xcrun simctl list devices available | awk -v name="$SIM_NAME" -F '[()]' 'index($0, name" (") { print $2; exit }')"
if [ -z "$SIM_UDID" ]; then
  RUNTIME="$(xcrun simctl list runtimes available | awk '/^iOS/ { print $NF }' | tail -1)"
  SIM_UDID="$(xcrun simctl create "$SIM_NAME" "iPhone 17" "$RUNTIME")"
fi

printf 'SIM_UDID=%s\nMETRO_PORT=%s\n' "$SIM_UDID" "$METRO_PORT" > "$HOME_DIR/config"

if [ ! -d "$HOME_DIR/Basket.app" ]; then
  echo "Building the app for the simulator. The first build takes several minutes."
  cd "$ROOT/demo-app"
  [ -d node_modules ] || npm ci --no-audit --no-fund
  export LANG=en_US.UTF-8 LC_ALL=en_US.UTF-8
  [ -d ios ] || npx expo prebuild --platform ios --no-install
  [ -d ios/Pods ] || (cd ios && pod install)
  xcodebuild -workspace ios/Basket.xcworkspace -scheme Basket -configuration Debug \
    -destination "id=$SIM_UDID" -derivedDataPath "$HOME_DIR/build" -quiet build
  cp -R "$HOME_DIR/build/Build/Products/Debug-iphonesimulator/Basket.app" "$HOME_DIR/Basket.app"
  rm -rf "$HOME_DIR/build"
fi

echo "Ready. Simulator: $SIM_NAME ($SIM_UDID). App repository: $HOME_DIR/basket.git"
