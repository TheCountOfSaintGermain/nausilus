# Third-Party / Upstream Sources

## Denki Kurage

**Upstream repo**: https://github.com/likeablob/denki-kurage
**Local clone**: `third_party/denki-kurage/`
**Checked-out commit**: `62b3fc1714d439572a88b746e0e41ee74c65887a`
**Branch**: `main`

This clone is the canonical source of truth for all future Denki Kurage extraction work.
It is read-only. No upstream files have been modified.

**Upstream structure**:
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

No extraction or porting work has begun. The next step is source-faithful extraction from `src/` into the project.
