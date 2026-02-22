const MAX_DIMENSION = 2048;

type ImageLoadedCallback = (
  img: HTMLImageElement,
  width: number,
  height: number,
) => void;

export function initImageLoader(
  dropZone: HTMLElement,
  fileInput: HTMLInputElement,
  onImageLoaded: ImageLoadedCallback,
): void {
  dropZone.addEventListener("dragover", (e) => {
    e.preventDefault();
    dropZone.classList.add("dragover");
  });

  dropZone.addEventListener("dragleave", () => {
    dropZone.classList.remove("dragover");
  });

  dropZone.addEventListener("drop", (e) => {
    e.preventDefault();
    dropZone.classList.remove("dragover");
    const file = e.dataTransfer?.files[0];
    if (file && file.type.startsWith("image/")) {
      loadImage(file, onImageLoaded);
    }
  });

  fileInput.addEventListener("change", () => {
    const file = fileInput.files?.[0];
    if (file) {
      loadImage(file, onImageLoaded);
    }
  });
}

function loadImage(file: File, callback: ImageLoadedCallback): void {
  const reader = new FileReader();
  reader.onload = (e) => {
    const img = new Image();
    img.onload = () => {
      let { width, height } = img;
      if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
        const scale = MAX_DIMENSION / Math.max(width, height);
        width = Math.round(width * scale);
        height = Math.round(height * scale);
      }
      callback(img, width, height);
    };
    img.src = e.target?.result as string;
  };
  reader.readAsDataURL(file);
}
