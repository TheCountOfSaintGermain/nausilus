# Nausilus

**Nausilus** is a lightweight macOS desktop companion app featuring a gently pulsing jellyfish that floats at the center of its window.

> **Current download:** [Nausilus tester v0.0.2](https://github.com/TheCountOfSaintGermain/nausilus/releases/tag/tester-v0.0.2)
>
> This is the current working Mac tester build for trusted users.
> It is unsigned and not notarized.
> **If macOS blocks it**
>
> After unzipping, move `Nausilus.app` to your Applications folder, then run:
>
>     xattr -dr com.apple.quarantine "/Applications/Nausilus.app"

## Download & Getting Started

**macOS (pre-built):**
1. Download the latest `.app` bundle from the Releases section
2. Drag `Nausilus.app` into your Applications folder
3. Double-click to launch

**First Launch:** On first launch, macOS may ask you to confirm opening an app from the internet. Click "Open" in the dialog.

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
