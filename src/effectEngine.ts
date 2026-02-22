import type { EffectModule, EffectState } from "./types";
import type { MaskManager } from "./maskManager";

export class EffectEngine {
  sourceCanvas: HTMLCanvasElement;
  outputCanvas: HTMLCanvasElement;
  private sourceCtx: CanvasRenderingContext2D;
  private outputCtx: CanvasRenderingContext2D;
  effects: EffectModule[] = [];
  activeEffects: Map<string, EffectState> = new Map();
  private maskManager: MaskManager | null = null;
  private _frameRequest: number | null = null;

  constructor(sourceCanvas: HTMLCanvasElement, outputCanvas: HTMLCanvasElement) {
    this.sourceCanvas = sourceCanvas;
    this.outputCanvas = outputCanvas;
    this.sourceCtx = sourceCanvas.getContext("2d", {
      willReadFrequently: true,
    })!;
    this.outputCtx = outputCanvas.getContext("2d")!;
  }

  setMaskManager(maskManager: MaskManager): void {
    this.maskManager = maskManager;
  }

  registerEffect(effectModule: EffectModule): void {
    this.effects.push(effectModule);
    const params: Record<string, number | string | boolean> = {};
    for (const p of effectModule.params) {
      params[p.id] = p.default;
    }
    this.activeEffects.set(effectModule.id, { enabled: false, params });
  }

  setEffectEnabled(id: string, enabled: boolean): void {
    const state = this.activeEffects.get(id);
    if (state) {
      state.enabled = enabled;
      this.render();
    }
  }

  setEffectParam(id: string, paramId: string, value: number | string | boolean): void {
    const state = this.activeEffects.get(id);
    if (state) {
      state.params[paramId] = value;
      if (state.enabled) {
        this.render();
      }
    }
  }

  render(): void {
    if (this._frameRequest) cancelAnimationFrame(this._frameRequest);
    this._frameRequest = requestAnimationFrame(() => this._doRender());
  }

  renderToImageData(): ImageData | null {
    const { width, height } = this.sourceCanvas;
    if (width === 0 || height === 0) return null;
    return this._computeFrame();
  }

  private _doRender(): void {
    const frame = this._computeFrame();
    if (frame) {
      this.outputCtx.putImageData(frame, 0, 0);
    }
  }

  private _computeFrame(): ImageData | null {
    const { width, height } = this.sourceCanvas;
    if (width === 0 || height === 0) return null;

    try {
      const useMask = this.maskManager && this.maskManager.isMaskActive();
      let imageData = this.sourceCtx.getImageData(0, 0, width, height);
      const originalData = useMask
        ? new Uint8ClampedArray(imageData.data)
        : null;

      for (const effect of this.effects) {
        const state = this.activeEffects.get(effect.id);
        if (state && state.enabled) {
          imageData = effect.apply(imageData, state.params);
        }
      }

      if (useMask && originalData) {
        const mask = this.maskManager!.getMaskData()!;
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

      return imageData;
    } catch (err) {
      console.error("Effect rendering failed:", err);
      return null;
    }
  }

  randomizeAll(): void {
    for (const effect of this.effects) {
      const state = this.activeEffects.get(effect.id);
      if (!state) continue;
      state.enabled = Math.random() > 0.3;
      for (const p of effect.params) {
        if (p.type === "range") {
          const range = p.max - p.min;
          state.params[p.id] = p.min + Math.random() * range;
          if (p.step >= 1) {
            state.params[p.id] = Math.round(state.params[p.id] as number);
          } else {
            state.params[p.id] =
              Math.round((state.params[p.id] as number) / p.step) * p.step;
          }
        } else if (p.type === "select") {
          state.params[p.id] =
            p.options[Math.floor(Math.random() * p.options.length)];
        } else if (p.type === "checkbox") {
          state.params[p.id] = Math.random() > 0.5;
        }
      }
    }
    this.render();
  }

  resetAll(): void {
    for (const effect of this.effects) {
      const state = this.activeEffects.get(effect.id);
      if (!state) continue;
      state.enabled = false;
      for (const p of effect.params) {
        state.params[p.id] = p.default;
      }
    }
    this.render();
  }
}
