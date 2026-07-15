# Hybrid Option C — Character-led scroll stage

**Branch:** `feat/hybrid-c-character-led`  
**Builds on:** Option B (full Akash skin + scroll story)

## What this is (distinct from A and B)

Same **Akash skin/DOM** as B, plus a **fixed lead-actor 3D stage** driven by scroll — the missing core of the reference’s `Character` + `GsapScroll.setCharTimeline`:

| Feature | B | C |
|---------|---|---|
| Akash CSS skin + section DOM | ✅ | ✅ |
| Intro FX + career scrub | ✅ | ✅ |
| Fixed `position:fixed` stage outside scroll content | ❌ | ✅ |
| Mouse look (yaw/pitch) | ❌ | ✅ |
| Multi-section camera path (landing → about → whatIDO) | ❌ | ✅ |
| DOM stage slide/exit (`.character-model-fixed`, rim fade) | ❌ | ✅ |
| Encrypted personal mesh | never | never (uses your `desktop_pc`) |

Default `theme3d.heroScene = "character_stage"`. Switch back to `desktop_pc` / packs in Customize if you want the classic hero.

## Run
```bash
git checkout feat/hybrid-c-character-led
npm install
npm run dev
```

Desktop-only stage (touch / narrow / e2e / reduced-motion kill-switches via `motionRuntime`).

## Platform preserved
Configurator, multi-profile, history, multi-tab recovery.
