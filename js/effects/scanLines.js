export default {
  name: "Scan Lines",
  id: "scanLines",
  params: [
    { id: "lineWidth", label: "Line Width", type: "range", min: 1, max: 8, default: 2, step: 1 },
    { id: "spacing", label: "Spacing", type: "range", min: 2, max: 16, default: 4, step: 1 },
    { id: "opacity", label: "Opacity", type: "range", min: 0, max: 1, default: 0.4, step: 0.05 },
  ],
  apply(imageData, params) {
    const { width, height, data } = imageData;
    const { lineWidth, spacing, opacity } = params;
    const period = lineWidth + spacing;
    const factor = 1 - opacity;

    for (let y = 0; y < height; y++) {
      if ((y % period) < lineWidth) {
        const rowStart = y * width * 4;
        for (let x = 0; x < width; x++) {
          const i = rowStart + x * 4;
          data[i] = Math.round(data[i] * factor);
          data[i + 1] = Math.round(data[i + 1] * factor);
          data[i + 2] = Math.round(data[i + 2] * factor);
        }
      }
    }
    return imageData;
  },
};
