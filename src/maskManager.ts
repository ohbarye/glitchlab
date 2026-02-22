import type { MaskMode } from "./types";

export class MaskManager {
  private container: HTMLElement;
  private outputCanvas: HTMLCanvasElement;
  private overlayCanvas: HTMLCanvasElement;
  private overlayCtx: CanvasRenderingContext2D;
  private maskData: Uint8Array | null = null;
  private width = 0;
  private height = 0;
  private mode: MaskMode = "none";
  private brushSize = 20;
  onChange: (() => void) | null = null;
  private _painting = false;
  private _rectStart: { x: number; y: number } | null = null;
  private _maskActiveCache: boolean | null = null;

  constructor(canvasContainer: HTMLElement, outputCanvas: HTMLCanvasElement) {
    this.container = canvasContainer;
    this.outputCanvas = outputCanvas;
    this.overlayCanvas = document.getElementById(
      "maskOverlayCanvas",
    ) as HTMLCanvasElement;
    this.overlayCtx = this.overlayCanvas.getContext("2d")!;
    this._attachEvents();
  }

  resize(width: number, height: number): void {
    this.width = width;
    this.height = height;
    this.overlayCanvas.width = width;
    this.overlayCanvas.height = height;
    this.maskData = new Uint8Array(width * height);
    this.selectAll();
    requestAnimationFrame(() => this.syncOverlayPosition());
  }

  syncOverlayPosition(): void {
    const rect = this.outputCanvas.getBoundingClientRect();
    const containerRect = this.container.getBoundingClientRect();
    this.overlayCanvas.style.left = rect.left - containerRect.left + "px";
    this.overlayCanvas.style.top = rect.top - containerRect.top + "px";
    this.overlayCanvas.style.width = rect.width + "px";
    this.overlayCanvas.style.height = rect.height + "px";
  }

  isMaskActive(): boolean {
    if (!this.maskData) return false;
    if (this._maskActiveCache !== null) return this._maskActiveCache;
    for (let i = 0; i < this.maskData.length; i++) {
      if (this.maskData[i] === 0) {
        this._maskActiveCache = true;
        return true;
      }
    }
    this._maskActiveCache = false;
    return false;
  }

  getMaskData(): Uint8Array | null {
    return this.maskData;
  }

  selectAll(): void {
    if (this.maskData) this.maskData.fill(255);
    this._maskActiveCache = false;
    this.renderOverlay();
  }

  clearMask(): void {
    if (this.maskData) this.maskData.fill(0);
    this._maskActiveCache = true;
    this.renderOverlay();
  }

  invertMask(): void {
    if (!this.maskData) return;
    for (let i = 0; i < this.maskData.length; i++) {
      this.maskData[i] = this.maskData[i] === 255 ? 0 : 255;
    }
    this._maskActiveCache = null;
    this.renderOverlay();
    if (this.onChange) this.onChange();
  }

  setMode(mode: MaskMode): void {
    this.mode = mode;
    this.overlayCanvas.style.pointerEvents =
      mode === "none" ? "none" : "auto";
    this.overlayCanvas.style.cursor =
      mode !== "none" ? "crosshair" : "default";
  }

  setBrushSize(size: number): void {
    this.brushSize = size;
  }

  renderOverlay(): void {
    const ctx = this.overlayCtx;
    const { width, height } = this;
    ctx.clearRect(0, 0, width, height);
    if (!this.maskData || !this.isMaskActive()) return;

    const imgData = ctx.createImageData(width, height);
    const d = imgData.data;
    for (let i = 0; i < this.maskData.length; i++) {
      if (this.maskData[i] === 0) {
        const p = i * 4;
        d[p] = 255;
        d[p + 1] = 0;
        d[p + 2] = 64;
        d[p + 3] = 60;
      }
    }
    ctx.putImageData(imgData, 0, 0);
  }

  private _toImageCoords(e: PointerEvent): { x: number; y: number } {
    const rect = this.overlayCanvas.getBoundingClientRect();
    const scaleX = this.overlayCanvas.width / rect.width;
    const scaleY = this.overlayCanvas.height / rect.height;
    return {
      x: Math.max(
        0,
        Math.min(this.width - 1, Math.floor((e.clientX - rect.left) * scaleX)),
      ),
      y: Math.max(
        0,
        Math.min(
          this.height - 1,
          Math.floor((e.clientY - rect.top) * scaleY),
        ),
      ),
    };
  }

  private _paintCircle(cx: number, cy: number): void {
    const r = Math.floor(this.brushSize / 2);
    const r2 = r * r;
    const x0 = Math.max(0, cx - r);
    const y0 = Math.max(0, cy - r);
    const x1 = Math.min(this.width - 1, cx + r);
    const y1 = Math.min(this.height - 1, cy + r);
    for (let y = y0; y <= y1; y++) {
      for (let x = x0; x <= x1; x++) {
        const dx = x - cx,
          dy = y - cy;
        if (dx * dx + dy * dy <= r2) {
          this.maskData![y * this.width + x] = 255;
        }
      }
    }
    this._maskActiveCache = null;
  }

  private _fillRect(x0: number, y0: number, x1: number, y1: number): void {
    const minX = Math.max(0, Math.min(x0, x1));
    const maxX = Math.min(this.width - 1, Math.max(x0, x1));
    const minY = Math.max(0, Math.min(y0, y1));
    const maxY = Math.min(this.height - 1, Math.max(y0, y1));
    for (let y = minY; y <= maxY; y++) {
      for (let x = minX; x <= maxX; x++) {
        this.maskData![y * this.width + x] = 255;
      }
    }
    this._maskActiveCache = null;
  }

  private _renderRectPreview(
    x0: number,
    y0: number,
    x1: number,
    y1: number,
  ): void {
    this.renderOverlay();
    const ctx = this.overlayCtx;
    const rect = this.overlayCanvas.getBoundingClientRect();
    const scale = this.overlayCanvas.width / rect.width;
    ctx.strokeStyle = "rgba(0, 255, 245, 0.8)";
    ctx.lineWidth = Math.max(1, 2 * scale);
    ctx.setLineDash([6 * scale, 4 * scale]);
    const rx = Math.min(x0, x1),
      ry = Math.min(y0, y1);
    const rw = Math.abs(x1 - x0),
      rh = Math.abs(y1 - y0);
    ctx.strokeRect(rx, ry, rw, rh);
    ctx.setLineDash([]);
  }

  private _attachEvents(): void {
    this.overlayCanvas.addEventListener("pointerdown", (e) => {
      if (this.mode === "brush") {
        this._painting = true;
        this.overlayCanvas.setPointerCapture(e.pointerId);
        if (!e.shiftKey && !this.isMaskActive()) {
          this.clearMask();
        }
        const { x, y } = this._toImageCoords(e);
        this._paintCircle(x, y);
        this.renderOverlay();
        if (this.onChange) this.onChange();
      } else if (this.mode === "rect") {
        this.overlayCanvas.setPointerCapture(e.pointerId);
        this._rectStart = this._toImageCoords(e);
        if (!e.shiftKey) {
          this.clearMask();
        }
      }
    });

    this.overlayCanvas.addEventListener("pointermove", (e) => {
      if (this.mode === "brush" && this._painting) {
        const { x, y } = this._toImageCoords(e);
        this._paintCircle(x, y);
        this.renderOverlay();
        if (this.onChange) this.onChange();
      } else if (this.mode === "rect" && this._rectStart) {
        const { x, y } = this._toImageCoords(e);
        this._renderRectPreview(this._rectStart.x, this._rectStart.y, x, y);
      }
    });

    const endHandler = (e: PointerEvent) => {
      if (this.mode === "brush") {
        this._painting = false;
      } else if (this.mode === "rect" && this._rectStart) {
        const { x, y } = this._toImageCoords(e);
        this._fillRect(this._rectStart.x, this._rectStart.y, x, y);
        this._rectStart = null;
        this.renderOverlay();
        if (this.onChange) this.onChange();
      }
    };

    this.overlayCanvas.addEventListener("pointerup", endHandler);
    this.overlayCanvas.addEventListener("pointerleave", (e) => {
      if (this._painting) {
        this._painting = false;
      }
      if (this._rectStart) {
        endHandler(e);
      }
    });

    window.addEventListener("resize", () => this.syncOverlayPosition());
  }
}
