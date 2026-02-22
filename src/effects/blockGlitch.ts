import type { EffectModule } from "../types";
import { seedRng } from "../utils/rng";

export default {
  name: "Block Glitch",
  id: "blockGlitch",
  params: [
    { id: "count", label: "Block Count", type: "range", min: 1, max: 40, default: 12, step: 1 },
    { id: "maxWidth", label: "Max Width", type: "range", min: 10, max: 300, default: 100, step: 5 },
    { id: "maxHeight", label: "Max Height", type: "range", min: 5, max: 80, default: 30, step: 1 },
    { id: "displacement", label: "Displacement", type: "range", min: 5, max: 200, default: 50, step: 5 },
    { id: "seed", label: "Seed", type: "range", min: 0, max: 999, default: 42, step: 1 },
  ],
  apply(imageData, params) {
    const { width, height, data } = imageData;
    const src = new Uint8ClampedArray(data);
    const count = params.count as number;
    const maxWidth = params.maxWidth as number;
    const maxHeight = params.maxHeight as number;
    const displacement = params.displacement as number;
    const seed = params.seed as number;
    const rng = seedRng(seed);

    for (let i = 0; i < count; i++) {
      const bw = Math.min(Math.floor(rng() * maxWidth) + 5, width);
      const bh = Math.min(Math.floor(rng() * maxHeight) + 3, height);
      const sx = Math.floor(rng() * Math.max(1, width - bw));
      const sy = Math.floor(rng() * Math.max(1, height - bh));
      const dx = Math.floor((rng() - 0.5) * 2 * displacement);
      const dy = Math.floor((rng() - 0.5) * 2 * displacement);

      for (let by = 0; by < bh; by++) {
        for (let bx = 0; bx < bw; bx++) {
          const srcIdx = ((sy + by) * width + (sx + bx)) * 4;
          const tx = sx + bx + dx;
          const ty = sy + by + dy;
          if (tx >= 0 && tx < width && ty >= 0 && ty < height) {
            const dstIdx = (ty * width + tx) * 4;
            data[dstIdx] = src[srcIdx];
            data[dstIdx + 1] = src[srcIdx + 1];
            data[dstIdx + 2] = src[srcIdx + 2];
            data[dstIdx + 3] = src[srcIdx + 3];
          }
        }
      }
    }
    return imageData;
  },
} satisfies EffectModule;
