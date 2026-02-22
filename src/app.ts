import { initImageLoader } from "./imageLoader";
import { EffectEngine } from "./effectEngine";
import { copyAsPng, copyAsSvg } from "./clipboard";
import { exportGif } from "./gifExport";
import { MaskManager } from "./maskManager";
import type { EffectParam, EffectState, MaskMode } from "./types";
import rgbShift from "./effects/rgbShift";
import scanLines from "./effects/scanLines";
import channelSplit from "./effects/channelSplit";
import blockGlitch from "./effects/blockGlitch";
import waveDistort from "./effects/waveDistort";
import corruption from "./effects/corruption";
import pixelSort from "./effects/pixelSort";

const sourceCanvas = document.getElementById("sourceCanvas") as HTMLCanvasElement;
const outputCanvas = document.getElementById("outputCanvas") as HTMLCanvasElement;
const dropZone = document.getElementById("dropZone") as HTMLElement;
const fileInput = document.getElementById("fileInput") as HTMLInputElement;
const canvasContainer = document.getElementById("canvasContainer") as HTMLElement;
const effectControls = document.getElementById("effectControls") as HTMLElement;
const randomizeBtn = document.getElementById("randomizeBtn") as HTMLButtonElement;
const resetBtn = document.getElementById("resetBtn") as HTMLButtonElement;
const copyPngBtn = document.getElementById("copyPngBtn") as HTMLButtonElement;
const copySvgBtn = document.getElementById("copySvgBtn") as HTMLButtonElement;
const exportGifBtn = document.getElementById("exportGifBtn") as HTMLButtonElement;
const changeImageBtn = document.getElementById("changeImageBtn") as HTMLButtonElement;
const fileInputAlt = document.getElementById("fileInputAlt") as HTMLInputElement;
const imageModal = document.getElementById("imageModal") as HTMLElement;
const modalImage = document.getElementById("modalImage") as HTMLImageElement;

// Selection toolbar
const selectionToolbar = document.getElementById("selectionToolbar") as HTMLElement;
const selToolRect = document.getElementById("selToolRect") as HTMLButtonElement;
const selToolBrush = document.getElementById("selToolBrush") as HTMLButtonElement;
const selToolClear = document.getElementById("selToolClear") as HTMLButtonElement;
const selToolInvert = document.getElementById("selToolInvert") as HTMLButtonElement;
const brushSizeSlider = document.getElementById("brushSizeSlider") as HTMLInputElement;
const brushSizeControl = document.getElementById("brushSizeControl") as HTMLElement;

const engine = new EffectEngine(sourceCanvas, outputCanvas);
engine.registerEffect(rgbShift);
engine.registerEffect(scanLines);
engine.registerEffect(channelSplit);
engine.registerEffect(blockGlitch);
engine.registerEffect(waveDistort);
engine.registerEffect(corruption);
engine.registerEffect(pixelSort);

const maskManager = new MaskManager(canvasContainer, outputCanvas);
engine.setMaskManager(maskManager);
maskManager.onChange = () => engine.render();

let currentSelectionMode: MaskMode = "none";

function loadImageToCanvas(img: HTMLImageElement, width: number, height: number): void {
  sourceCanvas.width = width;
  sourceCanvas.height = height;
  outputCanvas.width = width;
  outputCanvas.height = height;

  const ctx = sourceCanvas.getContext("2d", { willReadFrequently: true })!;
  ctx.drawImage(img, 0, 0, width, height);
  outputCanvas.getContext("2d")!.drawImage(img, 0, 0, width, height);

  maskManager.resize(width, height);

  dropZone.hidden = true;
  canvasContainer.hidden = false;
  selectionToolbar.hidden = false;
  changeImageBtn.disabled = false;
  randomizeBtn.disabled = false;
  resetBtn.disabled = false;
  copyPngBtn.disabled = false;
  copySvgBtn.disabled = false;
  exportGifBtn.disabled = false;

  engine.render();
}

initImageLoader(dropZone, fileInput, loadImageToCanvas);

buildControls();

// Action buttons
randomizeBtn.addEventListener("click", () => {
  engine.randomizeAll();
  syncControlsFromEngine();
});

resetBtn.addEventListener("click", () => {
  engine.resetAll();
  syncControlsFromEngine();
});

copyPngBtn.addEventListener("click", () => copyAsPng(outputCanvas));
copySvgBtn.addEventListener("click", () => copyAsSvg(outputCanvas));

exportGifBtn.addEventListener("click", async () => {
  exportGifBtn.disabled = true;
  const originalText = exportGifBtn.textContent;
  exportGifBtn.textContent = "GENERATING...";
  try {
    const blob = await exportGif(engine, (current, total) => {
      exportGifBtn.textContent = `FRAME ${current}/${total}`;
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "glitch.gif";
    a.click();
    URL.revokeObjectURL(url);
  } finally {
    exportGifBtn.textContent = originalText;
    exportGifBtn.disabled = false;
    syncControlsFromEngine();
  }
});

// Change image
changeImageBtn.addEventListener("click", () => fileInputAlt.click());

fileInputAlt.addEventListener("change", () => {
  const file = fileInputAlt.files?.[0];
  if (file && file.type.startsWith("image/")) {
    const reader = new FileReader();
    reader.onload = (ev) => {
      const img = new Image();
      img.onload = () => {
        let { width, height } = img;
        const MAX = 2048;
        if (width > MAX || height > MAX) {
          const scale = MAX / Math.max(width, height);
          width = Math.round(width * scale);
          height = Math.round(height * scale);
        }
        loadImageToCanvas(img, width, height);
      };
      img.src = ev.target?.result as string;
    };
    reader.readAsDataURL(file);
    fileInputAlt.value = "";
  }
});

// Image zoom modal
outputCanvas.addEventListener("click", () => {
  if (currentSelectionMode !== "none") return;
  modalImage.src = outputCanvas.toDataURL("image/png");
  imageModal.hidden = false;
});

imageModal.addEventListener("click", () => {
  imageModal.hidden = true;
  modalImage.src = "";
});

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && !imageModal.hidden) {
    imageModal.hidden = true;
    modalImage.src = "";
  }
});

// Selection toolbar
selToolRect.addEventListener("click", () => setSelectionMode("rect"));
selToolBrush.addEventListener("click", () => setSelectionMode("brush"));

selToolClear.addEventListener("click", () => {
  maskManager.selectAll();
  setSelectionMode("none");
  engine.render();
});

selToolInvert.addEventListener("click", () => {
  maskManager.invertMask();
});

brushSizeSlider.addEventListener("input", () => {
  maskManager.setBrushSize(parseInt(brushSizeSlider.value));
});

function setSelectionMode(mode: MaskMode): void {
  if (currentSelectionMode === mode) {
    mode = "none";
  }
  currentSelectionMode = mode;
  maskManager.setMode(mode);
  selToolRect.classList.toggle("active", mode === "rect");
  selToolBrush.classList.toggle("active", mode === "brush");
  brushSizeControl.hidden = mode !== "brush";
}

// Controls
function buildControls(): void {
  effectControls.innerHTML = "";
  for (const effect of engine.effects) {
    const state = engine.activeEffects.get(effect.id)!;
    const section = document.createElement("div");
    section.className = "effect-section";
    section.dataset.effectId = effect.id;

    const header = document.createElement("div");
    header.className = "effect-header";

    const toggle = document.createElement("input");
    toggle.type = "checkbox";
    toggle.className = "effect-toggle";
    toggle.checked = state.enabled;
    toggle.addEventListener("change", () => {
      engine.setEffectEnabled(effect.id, toggle.checked);
    });

    const name = document.createElement("span");
    name.className = "effect-name";
    name.textContent = effect.name;

    const chevron = document.createElement("span");
    chevron.className = "effect-chevron";
    chevron.textContent = "\u25BC";

    header.append(toggle, name, chevron);
    header.addEventListener("click", (e) => {
      if (e.target === toggle) return;
      section.classList.toggle("open");
    });

    const paramsDiv = document.createElement("div");
    paramsDiv.className = "effect-params";

    for (const param of effect.params) {
      if (param.type === "range") {
        paramsDiv.appendChild(createRangeControl(effect.id, param, state));
      } else if (param.type === "select") {
        paramsDiv.appendChild(createSelectControl(effect.id, param, state));
      } else if (param.type === "checkbox") {
        paramsDiv.appendChild(createCheckboxControl(effect.id, param, state));
      }
    }

    section.append(header, paramsDiv);
    effectControls.appendChild(section);
  }
}

function createRangeControl(effectId: string, param: Extract<EffectParam, { type: "range" }>, state: EffectState): HTMLElement {
  const group = document.createElement("div");
  group.className = "param-group";

  const label = document.createElement("div");
  label.className = "param-label";

  const labelText = document.createElement("span");
  labelText.textContent = param.label;

  const valueDisplay = document.createElement("span");
  valueDisplay.className = "param-value";
  valueDisplay.dataset.paramId = param.id;
  valueDisplay.dataset.effectId = effectId;
  valueDisplay.textContent = formatValue(state.params[param.id] as number, param.step);

  label.append(labelText, valueDisplay);

  const slider = document.createElement("input");
  slider.type = "range";
  slider.min = String(param.min);
  slider.max = String(param.max);
  slider.step = String(param.step);
  slider.value = String(state.params[param.id]);
  slider.dataset.effectId = effectId;
  slider.dataset.paramId = param.id;

  slider.addEventListener("input", () => {
    const val = parseFloat(slider.value);
    engine.setEffectParam(effectId, param.id, val);
    valueDisplay.textContent = formatValue(val, param.step);
  });

  group.append(label, slider);
  return group;
}

function createSelectControl(effectId: string, param: Extract<EffectParam, { type: "select" }>, state: EffectState): HTMLElement {
  const group = document.createElement("div");
  group.className = "param-group";

  const label = document.createElement("div");
  label.className = "param-label";
  label.textContent = param.label;

  const select = document.createElement("select");
  select.className = "param-select";
  select.dataset.effectId = effectId;
  select.dataset.paramId = param.id;

  for (const opt of param.options) {
    const option = document.createElement("option");
    option.value = opt;
    option.textContent = opt;
    if (opt === state.params[param.id]) option.selected = true;
    select.appendChild(option);
  }

  select.addEventListener("change", () => {
    engine.setEffectParam(effectId, param.id, select.value);
  });

  group.append(label, select);
  return group;
}

function createCheckboxControl(effectId: string, param: Extract<EffectParam, { type: "checkbox" }>, state: EffectState): HTMLElement {
  const group = document.createElement("div");
  group.className = "param-checkbox-group";

  const checkbox = document.createElement("input");
  checkbox.type = "checkbox";
  checkbox.className = "param-checkbox";
  checkbox.checked = state.params[param.id] as boolean;
  checkbox.dataset.effectId = effectId;
  checkbox.dataset.paramId = param.id;
  checkbox.id = `param-${effectId}-${param.id}`;

  const label = document.createElement("label");
  label.className = "param-checkbox-label";
  label.htmlFor = checkbox.id;
  label.textContent = param.label;

  checkbox.addEventListener("change", () => {
    engine.setEffectParam(effectId, param.id, checkbox.checked);
  });

  group.append(checkbox, label);
  return group;
}

function syncControlsFromEngine(): void {
  for (const effect of engine.effects) {
    const state = engine.activeEffects.get(effect.id)!;
    const section = effectControls.querySelector(`[data-effect-id="${effect.id}"]`);
    if (!section) continue;

    const toggle = section.querySelector(".effect-toggle") as HTMLInputElement;
    toggle.checked = state.enabled;

    for (const param of effect.params) {
      if (param.type === "range") {
        const slider = section.querySelector(`input[type="range"][data-param-id="${param.id}"]`) as HTMLInputElement | null;
        if (slider) {
          slider.value = String(state.params[param.id]);
          const valueDisplay = section.querySelector(`.param-value[data-param-id="${param.id}"]`);
          if (valueDisplay) valueDisplay.textContent = formatValue(state.params[param.id] as number, param.step);
        }
      } else if (param.type === "select") {
        const select = section.querySelector(`select[data-param-id="${param.id}"]`) as HTMLSelectElement | null;
        if (select) select.value = state.params[param.id] as string;
      } else if (param.type === "checkbox") {
        const checkbox = section.querySelector(`input[type="checkbox"][data-param-id="${param.id}"]`) as HTMLInputElement | null;
        if (checkbox) checkbox.checked = state.params[param.id] as boolean;
      }
    }
  }
}

function formatValue(val: number, step: number): string {
  if (step >= 1) return String(Math.round(val));
  const decimals = String(step).split(".")[1]?.length || 2;
  return val.toFixed(decimals);
}
