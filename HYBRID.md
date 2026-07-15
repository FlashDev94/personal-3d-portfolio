# Hybrid Option B — Akash scroll-story skin

**Branch:** `feat/hybrid-b-scroll-story`  
**Builds on:** Option A motion polish (`motionRuntime`, cursor, HoverLinks, SmoothScroll)

## What this is (distinct from A and C)

Faithful **visual + structural port** of [akashrmalhotra/3d-portfolio](https://github.com/akashrmalhotra/3d-portfolio):

| Reference piece | Our implementation |
|-----------------|-------------------|
| Geist + cyan tokens, section CSS | `src/skins/akash/*` (Landing, WhatIDo, Career, Work, Contact, Navbar, Social…) |
| Landing dual-line role loop | `StoryLanding` + `useAkashIntro` (SplitText-free char stagger) |
| What I Do dashed cards | `StoryWhatIDo` exact DOM (`.whatIDO`, `.what-content`, SVG borders) |
| Career scrub timeline | `StoryCareer` + `useStoryScroll` (`setAllTimeline` port) |
| Work carousel | `StoryWork` (`.carousel-*` classes, react-icons arrows) |
| Social rail + header | `SocialRail`, `StoryNavbar` |
| Contact footer grid | `StoryContact` |
| ScrollSmoother | `SmoothScroll` (graceful fallback) |
| Fixed character bone timeline | **Not on B** — see Option C |
| Encrypted character mesh | **Never shipped** (policy) |

All copy/media still comes from `PortfolioContext` / configurator.

## Run
```bash
git checkout feat/hybrid-b-scroll-story
npm install
npm run dev
```

## Kill-switches
`motionRuntime`: e2e, reduced-motion, touch → no cursor / scrub / smoother / heavy FX.

## Platform preserved
Configurator FAB, multi-profile, history, multi-tab conflict recovery, theme packs.

## Compare
| | A | B | C |
|--|---|---|---|
| Layout | Original Tailwind sections | **Akash CSS + DOM** | Akash + character stage |
| Motion | Polish on classic layout | Scrub storytelling (content) | Scrub + camera/look-at bone |
| Skin | Tailwind tokens | Geist/cyan skin | Same skin as B + 3D lead |
