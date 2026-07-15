# Hybrid Option A — Motion polish

**Branch:** `feat/hybrid-a-motion-polish`

## Idea
Keep your existing section order and platform (configurator, multi-profile, history).
Borrow animation *feel* from [akashrmalhotra/3d-portfolio](https://github.com/akashrmalhotra/3d-portfolio):

- GSAP hero char-stagger intro (DOM split — no Club SplitText required)
- Custom magnetic cursor (desktop only)
- Navbar HoverLinks letter stack
- Scroll scrub on experience cards
- Optional ScrollSmoother when the GSAP build includes it (else native scroll)
- Work **carousel** (default) with toggle back to holo grid

## Run
```bash
git checkout feat/hybrid-a-motion-polish
npm install
npm run dev
```

## Kill-switches (robustness)
| Signal | Effect |
|--------|--------|
| `?e2e=1` / session `portfolio-e2e` | No cursor, scrub, smoother, WebGL |
| `prefers-reduced-motion` | Same as e2e for motion FX |
| Touch / coarse pointer | No custom cursor; no smoother |
| Width ≤ 1024 | Treated as non-desktop for smoother/cursor |

Policy lives in `src/utils/motionRuntime.ts`.

## What stayed
- PortfolioContext, configurator, multi-tab conflict recovery, storage health
- Theme packs, boot screen, tests

## Known gaps
- ScrollSmoother only if available in installed `gsap` (graceful no-op otherwise)
- Not a full page-flow redesign (see Option B)
