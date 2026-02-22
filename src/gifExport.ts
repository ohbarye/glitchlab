import { GIFEncoder, quantize, applyPalette } from "gifenc";
import type { EffectEngine } from "./effectEngine";

const FRAME_COUNT = 20;
const FRAME_DELAY = 80;
const OSCILLATION_RATIO = 0.15;

interface AnimationTarget {
  effectId: string;
  paramId: string;
  baseValue: number;
  animate: (frame: number, total: number, base: number) => number;
}

function buildAnimationTargets(engine: EffectEngine): AnimationTarget[] {
  const targets: AnimationTarget[] = [];

  for (const effect of engine.effects) {
    const state = engine.activeEffects.get(effect.id);
    if (!state || !state.enabled) continue;

    for (const param of effect.params) {
      if (param.type !== "range") continue;

      const baseValue = state.params[param.id] as number;

      if (param.id === "phase") {
        // Phase: full 0→2π sweep for perfect loop
        targets.push({
          effectId: effect.id,
          paramId: param.id,
          baseValue,
          animate: (_frame, total) =>
            (_frame / total) * 2 * Math.PI,
        });
      } else if (param.id === "seed") {
        // Seed: increment by 1 per frame
        targets.push({
          effectId: effect.id,
          paramId: param.id,
          baseValue,
          animate: (frame, _total, base) =>
            Math.round(base + frame),
        });
      } else {
        // Other range params: sine oscillation ±15% of range
        const range = param.max - param.min;
        const amplitude = range * OSCILLATION_RATIO;
        targets.push({
          effectId: effect.id,
          paramId: param.id,
          baseValue,
          animate: (frame, total, base) => {
            const t = (frame / total) * 2 * Math.PI;
            let val = base + amplitude * Math.sin(t);
            val = Math.max(param.min, Math.min(param.max, val));
            if (param.step >= 1) val = Math.round(val);
            else val = Math.round(val / param.step) * param.step;
            return val;
          },
        });
      }
    }
  }

  return targets;
}

function snapshotParams(engine: EffectEngine): Map<string, Record<string, number | string | boolean>> {
  const snapshot = new Map<string, Record<string, number | string | boolean>>();
  for (const [id, state] of engine.activeEffects) {
    snapshot.set(id, { ...state.params });
  }
  return snapshot;
}

function restoreParams(engine: EffectEngine, snapshot: Map<string, Record<string, number | string | boolean>>): void {
  for (const [id, params] of snapshot) {
    const state = engine.activeEffects.get(id);
    if (state) {
      state.params = { ...params };
    }
  }
}

export async function exportGif(
  engine: EffectEngine,
  onProgress?: (current: number, total: number) => void,
): Promise<Blob> {
  const { width, height } = engine.sourceCanvas;
  const saved = snapshotParams(engine);
  const targets = buildAnimationTargets(engine);
  const gif = GIFEncoder();

  try {
    for (let frame = 0; frame < FRAME_COUNT; frame++) {
      // Apply animated parameter values
      for (const target of targets) {
        const val = target.animate(frame, FRAME_COUNT, target.baseValue);
        engine.setEffectParam(target.effectId, target.paramId, val);
      }

      // Render frame synchronously
      const imageData = engine.renderToImageData();
      if (!imageData) continue;

      // Encode frame
      const palette = quantize(imageData.data, 256);
      const index = applyPalette(imageData.data, palette);
      gif.writeFrame(index, width, height, {
        palette,
        delay: FRAME_DELAY,
      });

      onProgress?.(frame + 1, FRAME_COUNT);

      // Yield to UI thread
      await new Promise((r) => setTimeout(r, 0));
    }
  } finally {
    // Restore original parameters
    restoreParams(engine, saved);
    engine.render();
  }

  gif.finish();
  const bytes = gif.bytes();
  return new Blob([bytes.buffer as ArrayBuffer], { type: "image/gif" });
}
