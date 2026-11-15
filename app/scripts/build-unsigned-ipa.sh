#!/usr/bin/env bash
set -euo pipefail

APP_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$APP_ROOT"
if [[ "$(uname -s)" != "Darwin" ]]; then
  echo "iOS requires macOS with Xcode. Use the iOS GitHub Actions workflow." >&2
  exit 1
fi

npm run build:native
npx cap sync ios
mkdir -p ../artifacts
BUILD_DIR="${RUNNER_TEMP:-$APP_ROOT/.native-build}/finance-demo-ios"
mkdir -p "$BUILD_DIR"

xcodebuild \
  -project ios/App/App.xcodeproj \
  -scheme App \
  -configuration Release \
  -sdk iphoneos \
  -destination 'generic/platform=iOS' \
  -derivedDataPath "$BUILD_DIR/DerivedData" \
  ARCHS=arm64 \
  ONLY_ACTIVE_ARCH=NO \
  CODE_SIGNING_ALLOWED=NO \
  CODE_SIGNING_REQUIRED=NO \
  CODE_SIGN_IDENTITY='' \
  build

APP_PATH="$BUILD_DIR/DerivedData/Build/Products/Release-iphoneos/App.app"
test -d "$APP_PATH"
STAGE_DIR="$(mktemp -d "$BUILD_DIR/package.XXXXXX")"
mkdir -p "$STAGE_DIR/Payload"
ditto "$APP_PATH" "$STAGE_DIR/Payload/App.app"
find "$STAGE_DIR/Payload/App.app" -type d -name _CodeSignature -prune -exec rm -rf {} +
find "$STAGE_DIR/Payload/App.app" -type f -name embedded.mobileprovision -delete
EXECUTABLE=$(/usr/libexec/PlistBuddy -c 'Print CFBundleExecutable' "$APP_PATH/Info.plist")
lipo -archs "$APP_PATH/$EXECUTABLE" | tee ../artifacts/ios-architectures.txt
lipo -archs "$APP_PATH/$EXECUTABLE" | grep -q arm64
OUTPUT="$APP_ROOT/../artifacts/finance-demo-unsigned.ipa"
(cd "$STAGE_DIR" && /usr/bin/zip -qry "$OUTPUT" Payload)
unzip -t "$OUTPUT"
echo "Created $OUTPUT (unsigned; requires signing before installation)"
