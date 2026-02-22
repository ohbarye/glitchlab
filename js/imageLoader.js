const MAX_DIMENSION = 2048;

export function initImageLoader(dropZone, fileInput, onImageLoaded) {
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
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith("image/")) {
      loadImage(file, onImageLoaded);
    }
  });

  fileInput.addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (file) {
      loadImage(file, onImageLoaded);
    }
  });
}

function loadImage(file, callback) {
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
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
}
