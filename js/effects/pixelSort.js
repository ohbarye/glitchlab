export default {
  name: "Pixel Sort",
  id: "pixelSort",
  params: [
    { id: "threshold", label: "Threshold", type: "range", min: 0, max: 255, default: 80, step: 1 },
    { id: "intensity", label: "Intensity", type: "range", min: 0.05, max: 1, default: 0.5, step: 0.05 },
    { id: "direction", label: "Direction", type: "select", options: ["horizontal", "vertical"], default: "horizontal" },
  ],
  apply(imageData, params) {
    const { width, height, data } = imageData;
    const { threshold, intensity, direction } = params;

    if (direction === "horizontal") {
      const step = Math.max(1, Math.round(1 / intensity));
      for (let y = 0; y < height; y += step) {
        sortRow(data, width, y, threshold);
      }
    } else {
      const step = Math.max(1, Math.round(1 / intensity));
      for (let x = 0; x < width; x += step) {
        sortColumn(data, width, height, x, threshold);
      }
    }
    return imageData;
  },
};

function brightness(r, g, b) {
  return 0.299 * r + 0.587 * g + 0.114 * b;
}

function sortRow(data, width, y, threshold) {
  let runStart = -1;
  for (let x = 0; x <= width; x++) {
    const i = (y * width + x) * 4;
    const bright = x < width ? brightness(data[i], data[i + 1], data[i + 2]) : -1;

    if (bright > threshold && runStart === -1) {
      runStart = x;
    } else if ((bright <= threshold || x === width) && runStart !== -1) {
      sortRange(data, width, y, runStart, x - 1, true);
      runStart = -1;
    }
  }
}

function sortColumn(data, width, height, x, threshold) {
  let runStart = -1;
  for (let y = 0; y <= height; y++) {
    const i = (y * width + x) * 4;
    const bright = y < height ? brightness(data[i], data[i + 1], data[i + 2]) : -1;

    if (bright > threshold && runStart === -1) {
      runStart = y;
    } else if ((bright <= threshold || y === height) && runStart !== -1) {
      sortRange(data, width, x, runStart, y - 1, false);
      runStart = -1;
    }
  }
}

function sortRange(data, width, fixed, start, end, isRow) {
  const pixels = [];
  for (let i = start; i <= end; i++) {
    const idx = isRow ? (fixed * width + i) * 4 : (i * width + fixed) * 4;
    pixels.push({
      r: data[idx],
      g: data[idx + 1],
      b: data[idx + 2],
      a: data[idx + 3],
      bright: brightness(data[idx], data[idx + 1], data[idx + 2]),
    });
  }
  pixels.sort((a, b) => a.bright - b.bright);
  for (let i = start; i <= end; i++) {
    const idx = isRow ? (fixed * width + i) * 4 : (i * width + fixed) * 4;
    const p = pixels[i - start];
    data[idx] = p.r;
    data[idx + 1] = p.g;
    data[idx + 2] = p.b;
    data[idx + 3] = p.a;
  }
}
