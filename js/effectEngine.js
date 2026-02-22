export class EffectEngine {
  constructor(sourceCanvas, outputCanvas) {
    this.sourceCanvas = sourceCanvas;
    this.outputCanvas = outputCanvas;
    this.sourceCtx = sourceCanvas.getContext("2d", { willReadFrequently: true });
    this.outputCtx = outputCanvas.getContext("2d");
    this.effects = [];
    this.activeEffects = new Map();
    this.maskManager = null;
    this._frameRequest = null;
  }

  setMaskManager(maskManager) {
    this.maskManager = maskManager;
  }

  registerEffect(effectModule) {
    this.effects.push(effectModule);
    const params = {};
    for (const p of effectModule.params) {
      params[p.id] = p.default;
    }
    this.activeEffects.set(effectModule.id, { enabled: false, params });
  }

  setEffectEnabled(id, enabled) {
    const state = this.activeEffects.get(id);
    if (state) {
      state.enabled = enabled;
      this.render();
    }
  }

  setEffectParam(id, paramId, value) {
    const state = this.activeEffects.get(id);
    if (state) {
      state.params[paramId] = value;
      if (state.enabled) {
        this.render();
      }
    }
  }

  render() {
    if (this._frameRequest) cancelAnimationFrame(this._frameRequest);
    this._frameRequest = requestAnimationFrame(() => this._doRender());
  }

  _doRender() {
    const { width, height } = this.sourceCanvas;
    if (width === 0 || height === 0) return;

    try {
      const useMask = this.maskManager && this.maskManager.isMaskActive();
      let imageData = this.sourceCtx.getImageData(0, 0, width, height);
      const originalData = useMask ? new Uint8ClampedArray(imageData.data) : null;

      for (const effect of this.effects) {
        const state = this.activeEffects.get(effect.id);
        if (state && state.enabled) {
          imageData = effect.apply(imageData, state.params);
        }
      }

      if (useMask) {
        const mask = this.maskManager.getMaskData();
        const src = originalData;
        const dst = imageData.data;
        for (let i = 0, p = 0; i < mask.length; i++, p += 4) {
          if (mask[i] === 0) {
            dst[p] = src[p];
            dst[p + 1] = src[p + 1];
            dst[p + 2] = src[p + 2];
            dst[p + 3] = src[p + 3];
          }
        }
      }

      this.outputCtx.putImageData(imageData, 0, 0);
    } catch (err) {
      console.error("Effect rendering failed:", err);
    }
  }

  randomizeAll() {
    for (const effect of this.effects) {
      const state = this.activeEffects.get(effect.id);
      state.enabled = Math.random() > 0.3;
      for (const p of effect.params) {
        if (p.type === "range") {
          const range = p.max - p.min;
          state.params[p.id] = p.min + Math.random() * range;
          if (p.step >= 1) {
            state.params[p.id] = Math.round(state.params[p.id]);
          } else {
            state.params[p.id] = Math.round(state.params[p.id] / p.step) * p.step;
          }
        } else if (p.type === "select") {
          const options = p.options;
          state.params[p.id] = options[Math.floor(Math.random() * options.length)];
        } else if (p.type === "checkbox") {
          state.params[p.id] = Math.random() > 0.5;
        }
      }
    }
    this.render();
  }

  resetAll() {
    for (const effect of this.effects) {
      const state = this.activeEffects.get(effect.id);
      state.enabled = false;
      for (const p of effect.params) {
        state.params[p.id] = p.default;
      }
    }
    this.render();
  }
}
