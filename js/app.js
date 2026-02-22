import { initImageLoader } from "./imageLoader.js";
import { EffectEngine } from "./effectEngine.js";
import { copyAsPng, copyAsSvg } from "./clipboard.js";
import { MaskManager } from "./maskManager.js";
import rgbShift from "./effects/rgbShift.js";
import scanLines from "./effects/scanLines.js";
import channelSplit from "./effects/channelSplit.js";
import blockGlitch from "./effects/blockGlitch.js";
import waveDistort from "./effects/waveDistort.js";
import corruption from "./effects/corruption.js";
import pixelSort from "./effects/pixelSort.js";

const sourceCanvas = document.getElementById("sourceCanvas");
const outputCanvas = document.getElementById("outputCanvas");
const dropZone = document.getElementById("dropZone");
const fileInput = document.getElementById("fileInput");
const canvasContainer = document.getElementById("canvasContainer");
const effectControls = document.getElementById("effectControls");
const randomizeBtn = document.getElementById("randomizeBtn");
const resetBtn = document.getElementById("resetBtn");
const copyPngBtn = document.getElementById("copyPngBtn");
const copySvgBtn = document.getElementById("copySvgBtn");
const changeImageBtn = document.getElementById("changeImageBtn");
const fileInputAlt = document.getElementById("fileInputAlt");
const imageModal = document.getElementById("imageModal");
const modalImage = document.getElementById("modalImage");

// Selection toolbar
const selectionToolbar = document.getElementById("selectionToolbar");
const selToolRect = document.getElementById("selToolRect");
const selToolBrush = document.getElementById("selToolBrush");
const selToolClear = document.getElementById("selToolClear");
const selToolInvert = document.getElementById("selToolInvert");
const brushSizeSlider = document.getElementById("brushSizeSlider");
const brushSizeControl = document.getElementById("brushSizeControl");

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

let currentSelectionMode = "none";

function loadImageToCanvas(img, width, height) {
  sourceCanvas.width = width;
  sourceCanvas.height = height;
  outputCanvas.width = width;
  outputCanvas.height = height;

  const ctx = sourceCanvas.getContext("2d", { willReadFrequently: true });
  ctx.drawImage(img, 0, 0, width, height);
  outputCanvas.getContext("2d").drawImage(img, 0, 0, width, height);

  maskManager.resize(width, height);

  dropZone.hidden = true;
  canvasContainer.hidden = false;
  selectionToolbar.hidden = false;
  changeImageBtn.disabled = false;
  randomizeBtn.disabled = false;
  resetBtn.disabled = false;
  copyPngBtn.disabled = false;
  copySvgBtn.disabled = false;

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

// Change image
changeImageBtn.addEventListener("click", () => fileInputAlt.click());

fileInputAlt.addEventListener("change", (e) => {
  const file = e.target.files[0];
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
      img.src = ev.target.result;
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

function setSelectionMode(mode) {
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
function buildControls() {
  effectControls.innerHTML = "";
  for (const effect of engine.effects) {
    const state = engine.activeEffects.get(effect.id);
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

function createRangeControl(effectId, param, state) {
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
  valueDisplay.textContent = formatValue(state.params[param.id], param.step);

  label.append(labelText, valueDisplay);

  const slider = document.createElement("input");
  slider.type = "range";
  slider.min = param.min;
  slider.max = param.max;
  slider.step = param.step;
  slider.value = state.params[param.id];
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

function createSelectControl(effectId, param, state) {
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

function createCheckboxControl(effectId, param, state) {
  const group = document.createElement("div");
  group.className = "param-checkbox-group";

  const checkbox = document.createElement("input");
  checkbox.type = "checkbox";
  checkbox.className = "param-checkbox";
  checkbox.checked = state.params[param.id];
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

function syncControlsFromEngine() {
  for (const effect of engine.effects) {
    const state = engine.activeEffects.get(effect.id);
    const section = effectControls.querySelector(`[data-effect-id="${effect.id}"]`);
    if (!section) continue;

    const toggle = section.querySelector(".effect-toggle");
    toggle.checked = state.enabled;

    for (const param of effect.params) {
      if (param.type === "range") {
        const slider = section.querySelector(`input[type="range"][data-param-id="${param.id}"]`);
        if (slider) {
          slider.value = state.params[param.id];
          const valueDisplay = section.querySelector(`.param-value[data-param-id="${param.id}"]`);
          if (valueDisplay) valueDisplay.textContent = formatValue(state.params[param.id], param.step);
        }
      } else if (param.type === "select") {
        const select = section.querySelector(`select[data-param-id="${param.id}"]`);
        if (select) select.value = state.params[param.id];
      } else if (param.type === "checkbox") {
        const checkbox = section.querySelector(`input[type="checkbox"][data-param-id="${param.id}"]`);
        if (checkbox) checkbox.checked = state.params[param.id];
      }
    }
  }
}

function formatValue(val, step) {
  if (step >= 1) return String(Math.round(val));
  const decimals = String(step).split(".")[1]?.length || 2;
  return val.toFixed(decimals);
}
