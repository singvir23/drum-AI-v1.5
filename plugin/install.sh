#!/usr/bin/env bash
# Installs (symlinks) the plugin into MuseScore 4's user plugin folder so that a `git pull`
# is the whole update. Run from anywhere:  bash plugin/install.sh
set -euo pipefail

here="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
src="$here/drum-ai-copilot.qml"

case "$(uname -s)" in
  Darwin) plugins="$HOME/Documents/MuseScore4/Plugins" ;;
  Linux)  plugins="$HOME/Documents/MuseScore4/Plugins" ;;
  MINGW*|MSYS*|CYGWIN*) plugins="$USERPROFILE/Documents/MuseScore4/Plugins" ;;
  *) echo "Unsupported OS: $(uname -s)"; exit 1 ;;
esac

dest_dir="$plugins/drum-ai-copilot"
mkdir -p "$dest_dir"

if [ -L "$dest_dir/drum-ai-copilot.qml" ] || [ ! -e "$dest_dir/drum-ai-copilot.qml" ]; then
  ln -sfn "$src" "$dest_dir/drum-ai-copilot.qml"
  echo "Linked $dest_dir/drum-ai-copilot.qml -> $src"
else
  cp "$src" "$dest_dir/drum-ai-copilot.qml"
  echo "Copied plugin to $dest_dir/drum-ai-copilot.qml (existing file was not a symlink)"
fi

echo "Now (re)start MuseScore, open Plugins > Manage plugins…, enable Drum AI Copilot."
