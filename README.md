# Nausilus

**Nausilus** is a lightweight macOS desktop companion app featuring a gently pulsing jellyfish that floats at the center of its window.

> **Current download:** [Nausilus tester v0.0.2](https://github.com/TheCountOfSaintGermain/nausilus/releases/tag/tester-v0.0.2)
>
> This is the current working Mac tester build for trusted users.
> It is unsigned and not notarized.

## Install on macOS

1. Download `Nausilus_tester_0.0.2_aarch64.app.zip`
2. Open **Terminal**
3. Run this exact block:

```bash
APP_ZIP="$HOME/Downloads/Nausilus_tester_0.0.2_aarch64.app.zip"
APP_SRC="$HOME/Downloads/Nausilus.app"
TMP_DIR="$(mktemp -d)"

if [ -f "$APP_ZIP" ]; then
  ditto -x -k "$APP_ZIP" "$TMP_DIR"
  APP_SRC="$TMP_DIR/Nausilus.app"
fi

if [ ! -d "$APP_SRC" ]; then
  echo "Could not find Nausilus.app or Nausilus_tester_0.0.2_aarch64.app.zip in Downloads."
  exit 1
fi

sudo ditto "$APP_SRC" "/Applications/Nausilus.app"
xattr -dr com.apple.quarantine "/Applications/Nausilus.app"
open "/Applications/Nausilus.app"
```

## How to Use

- The jellyfish animates continuously in the center of the window
- Resize the window freely — the jellyfish stays centered and scales within the bounds
- The animation runs at minimal CPU usage, suitable for leaving open as a live wallpaper substitute

## Features

- Smooth, continuously animated jellyfish with depth-shaded bell and tentacles
- Centered layout with responsive resize
- Color modes (day/night compatible rendering)
- Standalone macOS app — no browser required

## Notes & Limitations

- The app is a visual companion only — it does not interact with the mouse or keyboard
- Resize limits prevent the window from becoming too small to see the animation or impractically large
- No system tray integration in this version

## Inspiration

Inspired by **Denki Kurage** ("Electric Jellyfish") — a popular ESP32 animation project for the Cheap Yellow Display (CYD). This macOS port brings the same meditative jellyfish animation to the desktop.

- Original Denki Kurage project: [https://github.com/joeycast/The-Complete-Guide-for-CYD-with-Arduino/tree/main/denki-kurage](https://github.com/joeycast/The-Complete-Guide-for-CYD-with-Arduino/tree/main/denki-kurage)

## License

License details to be determined. See the repository for more information.
