import type { EffectModule } from "../types";
import { seedRng } from "../utils/rng";

export default {
  name: "Corruption",
  id: "corruption",
  params: [
    { id: "chunkCount", label: "Chunks", type: "range", min: 1, max: 50, default: 10, step: 1 },
    { id: "chunkSize", label: "Chunk Size", type: "range", min: 100, max: 10000, default: 2000, step: 100 },
    { id: "mode", label: "Mode", type: "select", options: ["shift", "duplicate", "zero"], default: "shift" },
    { id: "seed", label: "Seed", type: "range", min: 0, max: 999, default: 77, step: 1 },
  ],
  apply(imageData, params) {
    const { data } = imageData;
    const src = new Uint8ClampedArray(data);
    const chunkCount = params.chunkCount as number;
    const chunkSize = params.chunkSize as number;
    const mode = params.mode as string;
    const seed = params.seed as number;
    const len = data.length;
    const rng = seedRng(seed);

    for (let i = 0; i < chunkCount; i++) {
      const start = Math.floor(rng() * Math.max(1, len - chunkSize));
      const size = Math.floor(rng() * chunkSize) + 50;

      if (mode === "shift") {
        const offset = Math.floor((rng() - 0.5) * chunkSize * 2);
        for (let j = 0; j < size && start + j < len; j++) {
          const srcIdx = start + j + offset;
          if (srcIdx >= 0 && srcIdx < len) {
            data[start + j] = src[srcIdx];
          }
        }
      } else if (mode === "duplicate") {
        const dest = Math.floor(rng() * Math.max(1, len - size));
        for (let j = 0; j < size && dest + j < len && start + j < len; j++) {
          data[dest + j] = src[start + j];
        }
      } else if (mode === "zero") {
        const val = rng() > 0.5 ? 0 : 255;
        for (let j = 0; j < size && start + j < len; j++) {
          if ((start + j) % 4 !== 3) {
            data[start + j] = val;
          }
        }
      }
    }
    return imageData;
  },
} satisfies EffectModule;
