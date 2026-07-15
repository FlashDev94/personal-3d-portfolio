# Hybrid Option C — Character-led stage (stable)

**Branch:** `feat/hybrid-c-character-led`

## Distinct from B
| | B | C |
|--|---|---|
| 3D | Inline hero in landing (`desktop_pc` / packs) | **Fixed** full-viewport stage, mouse look + scroll camera |
| Default scene | `desktop_pc` | `character_stage` |
| Content hide-on-scroll | No (soft parallax only) | No (camera only) |

## Stability rules (both B/C)
- Content is **always visible** — GSAP enhances, never gates (`display:none` / opacity traps removed)
- Skin CSS scoped under `.skin-akash` / `html.skin-akash-active`
- Standard flex values (`flex-end` not `end`) for Vite CSS warnings
- Configurator + multi-profile platform preserved

## Run
```bash
git checkout feat/hybrid-c-character-led
npm install
npm run dev
```
