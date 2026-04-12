const MAX_DIMENSION = 1280;
const OUTPUT_QUALITY = 0.92;
const OUTPUT_TYPE = 'image/webp';

const loadImage = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('Image পড়া যায়নি।'));
      img.src = reader.result;
    };
    reader.onerror = () => reject(new Error('File পড়া যায়নি।'));
    reader.readAsDataURL(file);
  });

const calculateSize = (width, height) => {
  if (width <= MAX_DIMENSION && height <= MAX_DIMENSION) {
    return { width, height };
  }

  const ratio = Math.min(MAX_DIMENSION / width, MAX_DIMENSION / height);
  return {
    width: Math.round(width * ratio),
    height: Math.round(height * ratio),
  };
};

export const compressImage = async (file) => {
  const img = await loadImage(file);
  const { width, height } = calculateSize(img.width, img.height);
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('ছবি কমপ্রেস করা যায়নি।');
  }

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, 0, 0, width, height);

  const dataUrl = canvas.toDataURL(OUTPUT_TYPE, OUTPUT_QUALITY);

  return {
    dataUrl,
    mimeType: OUTPUT_TYPE,
    width,
    height,
    originalName: file.name,
  };
};
