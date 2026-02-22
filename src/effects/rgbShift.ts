import type { EffectModule } from "../types";

function clamp(val: number, min: number, max: number): number {
  return val < min ? min : val > max ? max : val;
}

export default {
  name: "RGB Shift",
  id: "rgbShift",
  params: [
    { id: "redX", label: "Red X", type: "range", min: -40, max: 40, default: 8, step: 1 },
    { id: "redY", label: "Red Y", type: "range", min: -40, max: 40, default: 0, step: 1 },
    { id: "blueX", label: "Blue X", type: "range", min: -40, max: 40, default: -8, step: 1 },
    { id: "blueY", label: "Blue Y", type: "range", min: -40, max: 40, default: 0, step: 1 },
  ],
  apply(imageData, params) {
    const { width, height, data } = imageData;
    const src = new Uint8ClampedArray(data);
    const redX = params.redX as number;
    const redY = params.redY as number;
    const blueX = params.blueX as number;
    const blueY = params.blueY as number;

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const i = (y * width + x) * 4;

        const rsx = clamp(x + redX, 0, width - 1);
        const rsy = clamp(y + redY, 0, height - 1);
        const ri = (rsy * width + rsx) * 4;
        data[i] = src[ri];

        const bsx = clamp(x + blueX, 0, width - 1);
        const bsy = clamp(y + blueY, 0, height - 1);
        const bi = (bsy * width + bsx) * 4;
        data[i + 2] = src[bi + 2];
      }
    }
    return imageData;
  },
} satisfies EffectModule;
