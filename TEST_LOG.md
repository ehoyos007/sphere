# TEST_LOG.md

> QA activities, bug investigations, and fixes.

## Status Icons
| Status | Meaning |
|--------|---------|
| PASS | Test passed |
| FAIL | Test failed |
| FLAKY | Intermittent |
| FIXED | Bug resolved |

## Active Issues
- None.

## Prevention Rules
- Always use `0.866025` for Hex SDF tiling to avoid concentric ring artifacts.
- Keep `bloomStrength` low (~0.15) and rely on emissive intensity for glow.
