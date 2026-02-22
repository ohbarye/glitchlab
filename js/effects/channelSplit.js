export default {
  name: "Channel Split",
  id: "channelSplit",
  params: [
    { id: "red", label: "Red", type: "checkbox", default: true },
    { id: "green", label: "Green", type: "checkbox", default: true },
    { id: "blue", label: "Blue", type: "checkbox", default: true },
    { id: "swap", label: "Swap", type: "select", options: ["none", "RG", "RB", "GB"], default: "none" },
  ],
  apply(imageData, params) {
    const { data } = imageData;
    const { red, green, blue, swap } = params;
    const len = data.length;

    for (let i = 0; i < len; i += 4) {
      let r = data[i], g = data[i + 1], b = data[i + 2];

      if (swap === "RG") { [r, g] = [g, r]; }
      else if (swap === "RB") { [r, b] = [b, r]; }
      else if (swap === "GB") { [g, b] = [b, g]; }

      data[i] = red ? r : 0;
      data[i + 1] = green ? g : 0;
      data[i + 2] = blue ? b : 0;
    }
    return imageData;
  },
};
