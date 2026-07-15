# Hybrid Option B — Scroll story flow

**Branch:** `feat/hybrid-b-scroll-story`  
**Builds on:** Option A motion polish

## Idea
Restructure the **public page narrative** closer to [akashrmalhotra/3d-portfolio](https://github.com/akashrmalhotra/3d-portfolio) while keeping your data platform:

1. **Landing** — large name, dual-role loop, hero 3D stage
2. **About** — compact glass card
3. **What I Do** — services grid (dashed borders)
4. **Career** — scrub-growing timeline from Experience data
5. **Work** — project carousel
6. **Tech** — infinite marquee of skills
7. **Contact** — existing form + stars

All copy/media still comes from `PortfolioContext` / configurator.

## Run
```bash
git checkout feat/hybrid-b-scroll-story
npm install
npm run dev
```

## Kill-switches
Same as Option A (`motionRuntime`): e2e, reduced-motion, touch → no cursor / scrub / smoother / heavy FX.

## Platform preserved
Configurator FAB, multi-profile, history, multi-tab conflict recovery, theme packs.

## Known gaps
- Feedbacks section still uses original layout when testimonials exist
- No fixed “character bone” timeline (see Option C)
- Nav hash ids: `about`, `work` (career), `projects`, `tech` — ensure navLinks match your data

## Compare
| | A | B |
|--|---|---|
| Section order | Original | Story narrative |
| Motion | Polish on classic layout | Scrub storytelling + landing loop |
| 3D lead actor | Scene packs only | Scene packs only (scroll-shifted) |
