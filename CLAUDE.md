# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

GLITCHLAB — a static web app for applying glitch effects to images. TypeScript + Vite, deployed to Cloudflare Pages.

## Development

```bash
npm install          # Install dependencies
npm run dev          # Vite dev server with HMR
npm run build        # tsc -b && vite build → dist/
npm run lint         # ESLint
npm run preview      # Preview production build
npm run deploy       # Build + deploy to Cloudflare Pages
```

## Architecture

```
index.html              → Entry point (Vite processes this)
src/app.ts              → Orchestrator: wires engine, effects, mask, UI
src/effectEngine.ts     → Render pipeline: source → effects chain → mask composite → output
src/maskManager.ts      → Selection system (rect/brush) with overlay canvas
src/imageLoader.ts      → Drag-and-drop + file input handling
src/clipboard.ts        → Copy as PNG (ClipboardItem) / SVG (text)
src/types.ts            → Shared TypeScript interfaces (EffectParam, EffectModule, EffectState)
src/effects/*.ts        → 7 effect modules (pluggable, uniform interface)
src/utils/rng.ts        → Seeded PRNG (Lehmer/Park-Miller)
css/style.css           → All styles, CRT/cyberpunk theme with CSS custom properties
```

### Effect Plugin Interface

Every effect module exports a single object:

```ts
import type { EffectModule } from "../types";

export default {
  id: "effectId",
  name: "Display Name",
  params: [
    { id: "paramId", label: "Label", type: "range", min: 0, max: 100, step: 1, default: 10 },
    { id: "mode", label: "Mode", type: "select", options: ["a", "b"], default: "a" },
    { id: "flag", label: "Flag", type: "checkbox", default: false },
  ],
  apply(imageData, params) {
    // Process imageData.data (Uint8ClampedArray) in place or return new ImageData
    return imageData;
  },
} satisfies EffectModule;
```

To add an effect: create `src/effects/newEffect.ts`, import and `engine.registerEffect()` in `app.ts`. No other files need changes — the UI controls are generated dynamically from `params`.

### Rendering Pipeline

1. `EffectEngine._doRender()` reads source canvas pixels
2. Applies each enabled effect sequentially via `effect.apply(imageData, params)`
3. If mask is active, composites: selected pixels get glitched output, unselected pixels keep original
4. Writes result to output canvas
5. Renders are debounced via `requestAnimationFrame`

### Three-Canvas Architecture

- `sourceCanvas` (hidden): holds the original image, never modified after load
- `outputCanvas` (visible): displays the processed result
- `maskOverlayCanvas` (absolute positioned): shows selection overlay, synced to outputCanvas position

### Mask System

- `Uint8Array(width * height)`: 255 = selected (effect applies), 0 = unselected (original preserved)
- Default state is all-255 (full image selected, no masking)
- Rect mode clears mask on pointerdown (Shift for additive), fills rectangle on pointerup
- Brush mode clears mask on first stroke if no active mask, paints circles of configurable radius
- `isMaskActive()` uses a dirty-flag cache (`_maskActiveCache`) to avoid linear scans

### Image Constraints

Images are capped at 2048px max dimension on load (both in `imageLoader.ts` and the change-image handler in `app.ts`).
