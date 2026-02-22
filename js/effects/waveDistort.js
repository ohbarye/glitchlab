export default {
  name: "Wave Distort",
  id: "waveDistort",
  params: [
    { id: "amplitude", label: "Amplitude", type: "range", min: 0, max: 50, default: 15, step: 1 },
    { id: "frequency", label: "Frequency", type: "range", min: 0.01, max: 0.5, default: 0.05, step: 0.01 },
    { id: "phase", label: "Phase", type: "range", min: 0, max: 6.28, default: 0, step: 0.1 },
  ],
  apply(imageData, params) {
    const { width, height, data } = imageData;
    const src = new Uint8ClampedArray(data);
    const { amplitude, frequency, phase } = params;

    for (let y = 0; y < height; y++) {
      const offset = Math.round(amplitude * Math.sin(frequency * y + phase));
      for (let x = 0; x < width; x++) {
        const dstIdx = (y * width + x) * 4;
        const srcX = ((x - offset) % width + width) % width;
        const srcIdx = (y * width + srcX) * 4;
        data[dstIdx] = src[srcIdx];
        data[dstIdx + 1] = src[srcIdx + 1];
        data[dstIdx + 2] = src[srcIdx + 2];
        data[dstIdx + 3] = src[srcIdx + 3];
      }
    }
    return imageData;
  },
};
