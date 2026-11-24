#!/bin/bash
set -e

echo "=========================================================="
echo " Techno CRM - Local Play Store AAB Builder"
echo "=========================================================="

# 1. Setup Java and Android environment from local Android Studio
export JAVA_HOME="/Applications/Android Studio.app/Contents/jbr/Contents/Home"
export ANDROID_HOME="$HOME/Library/Android/sdk"
export PATH="$JAVA_HOME/bin:$ANDROID_HOME/platform-tools:$PATH"

echo "Using Java at: $JAVA_HOME"
echo "Using Android SDK at: $ANDROID_HOME"

# 2. Ensure dependencies are installed
if [ ! -d "node_modules" ]; then
    echo "Installing npm dependencies..."
    npm install
fi

# 3. Build AAB using EAS CLI locally
echo "Building Production Android App Bundle (.aab) locally..."
npx eas-cli build --platform android --profile production --local

echo ""
echo "=========================================================="
echo " Build finished successfully!"
echo "=========================================================="
