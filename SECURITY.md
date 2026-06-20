# Security Policy

Nausilus is early tester software. The public source is the primary artifact; downloadable tester builds are unsigned and not notarized.

## Supported Versions

Only the current `main` branch and the latest tester release are considered active.

## Reporting Issues

For ordinary bugs, open a GitHub issue.

For a suspected vulnerability, avoid posting exploit details publicly. Use GitHub's private vulnerability reporting flow if it is available for this repository. If that is not available, contact the maintainer through the GitHub profile before sharing sensitive details.

## Distribution Trust

The current tester build is not Developer ID signed or Apple-notarized. That means macOS Gatekeeper warnings are expected. Checksums can verify file integrity, but they do not replace code signing or notarization.
