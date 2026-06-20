# Third-Party / Upstream Sources

## Denki Kurage

**Upstream repo**: https://github.com/likeablob/denki-kurage
**Last referenced upstream commit**: `62b3fc1714d439572a88b746e0e41ee74c65887a`
**Branch**: `main`

This repository does not vendor the full Denki Kurage source tree.
Use the upstream repository as the canonical source of truth for future extraction or comparison work.

Expected upstream structure:
```
third_party/denki-kurage/
├── src/              # firmware source (jellyfish.cpp/h, math_3d.cpp/h, main.cpp, etc.)
├── webflash/         # browser-based flasher (index.html + assets)
├── enclosure/        # OpenSCAD + STL + 3MF for 3D-printed stand
├── platformio.ini    # PlatformIO build config
├── lib/              # third-party libraries
├── include/          # header files
├── test/             # (empty/test directory)
└── assets/           # images/video
```

The current Nausilus renderer already contains adapted TypeScript code under `src/denki_upstream_static/`.
Keep upstream attribution and license notices current when changing that code.
