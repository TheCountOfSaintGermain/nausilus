# Contributing

Nausilus is a small source-first macOS companion app. Contributions should keep the project easy to inspect, build, and credit correctly.

## Local Checks

Before opening a pull request, run:

```bash
npm ci
npm audit
npm run build
cargo check --manifest-path src-tauri/Cargo.toml
```

For app bundle changes, also run:

```bash
npx tauri build --bundles app
```

## Contribution Guidelines

- Keep changes narrow and easy to review
- Preserve Denki Kurage attribution in `CREDITS.md`
- Do not add signing, notarization, publishing, telemetry, or update infrastructure without maintainer approval
- Do not commit generated Tauri schema files or local build outputs
- Prefer source and documentation clarity over installer polish until Developer ID signing exists

## Useful Entry Points

- `src/main.ts` owns canvas setup, interaction handling, and the animation frame loop
- `src/denki_upstream_static/` contains the adapted renderer modules
- `src-tauri/tauri.conf.json` owns the macOS app shell configuration
- `.github/workflows/ci.yml` is the baseline verification workflow
