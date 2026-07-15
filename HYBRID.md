# Hybrid Option B — Akash scroll-story skin (stable)

**Branch:** `feat/hybrid-b-scroll-story`

## Distinct from C
| | B | C |
|--|---|---|
| 3D | **Inline** hero in the landing section | **Fixed** full-viewport stage + mouse look |
| Default | `desktop_pc` | `character_stage` |
| CharacterStage portal | No | Yes |

## Stability
- Content always visible (no `display:none` / opacity traps)
- `flex-end` CSS (no Vite mixed-support warning)
- Skin scoped under `.skin-akash`
- Platform configurator preserved

## Run
```bash
git checkout feat/hybrid-b-scroll-story
npm install
npm run dev
```
