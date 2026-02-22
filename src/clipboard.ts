export async function copyAsPng(canvas: HTMLCanvasElement): Promise<void> {
  try {
    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((b) => {
        if (b) resolve(b);
        else reject(new Error("Failed to create PNG blob"));
      }, "image/png");
    });
    await navigator.clipboard.write([
      new ClipboardItem({ "image/png": blob }),
    ]);
    showCopyFeedback("PNG copied!");
  } catch (err) {
    console.error("Copy PNG failed:", err);
    showCopyFeedback("Copy failed", true);
  }
}

export async function copyAsSvg(canvas: HTMLCanvasElement): Promise<void> {
  try {
    const dataUrl = canvas.toDataURL("image/png");
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${canvas.width}" height="${canvas.height}">
  <image href="${dataUrl}" width="${canvas.width}" height="${canvas.height}"/>
</svg>`;
    await navigator.clipboard.writeText(svg);
    showCopyFeedback("SVG copied!");
  } catch (err) {
    console.error("Copy SVG failed:", err);
    showCopyFeedback("Copy failed", true);
  }
}

function showCopyFeedback(message: string, isError = false): void {
  const toast = document.createElement("div");
  toast.className = `copy-toast ${isError ? "copy-toast-error" : ""}`;
  toast.textContent = message;
  document.body.appendChild(toast);
  requestAnimationFrame(() => toast.classList.add("show"));
  setTimeout(() => {
    toast.classList.remove("show");
    setTimeout(() => toast.remove(), 300);
  }, 1500);
}
