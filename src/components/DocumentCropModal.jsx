import { useRef, useState } from 'react';
import ReactCrop from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';

const getCroppedBlob = async (imageElement, cropPixels) => {
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');

  if (!context) {
    throw new Error('ছবি ক্রপ করা যায়নি।');
  }

  const scaleX = imageElement.naturalWidth / imageElement.width;
  const scaleY = imageElement.naturalHeight / imageElement.height;
  const sourceX = Math.round(cropPixels.x * scaleX);
  const sourceY = Math.round(cropPixels.y * scaleY);
  const sourceWidth = Math.round(cropPixels.width * scaleX);
  const sourceHeight = Math.round(cropPixels.height * scaleY);

  canvas.width = sourceWidth;
  canvas.height = sourceHeight;
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = 'high';

  context.drawImage(
    imageElement,
    sourceX,
    sourceY,
    sourceWidth,
    sourceHeight,
    0,
    0,
    sourceWidth,
    sourceHeight
  );

  const blob = await new Promise((resolve) =>
    canvas.toBlob(resolve, 'image/png')
  );

  if (!blob) {
    throw new Error('ক্রপ করা ছবি তৈরি করা যায়নি।');
  }

  return blob;
};

export default function DocumentCropModal({ imageSrc, onCancel, onConfirm, isProcessing }) {
  const [crop, setCrop] = useState({ unit: '%', x: 10, y: 10, width: 80, height: 80 });
  const [completedCrop, setCompletedCrop] = useState(null);
  const [cropError, setCropError] = useState('');
  const imageRef = useRef(null);

  const handleConfirm = async () => {
    if (!completedCrop?.width || !completedCrop?.height || !imageRef.current) {
      setCropError('ক্রপ এরিয়া ঠিক করুন অথবা "ক্রপ ছাড়া ব্যবহার করুন" দিন।');
      return;
    }

    try {
      setCropError('');
      const blob = await getCroppedBlob(imageRef.current, completedCrop);
      onConfirm(blob);
    } catch (error) {
      setCropError(error.message || 'ছবি ক্রপ করা যায়নি।');
    }
  };

  const handleUseOriginal = async () => {
    try {
      setCropError('');
      const response = await fetch(imageSrc);
      const blob = await response.blob();
      onConfirm(blob);
    } catch (error) {
      setCropError(error.message || 'আসল ছবি ব্যবহার করা যায়নি।');
    }
  };

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal-content crop-modal-content" onClick={(event) => event.stopPropagation()}>
        <div className="mb-4 flex justify-between items-center">
          <h2 className="text-xl font-bold text-brand-gradient">ডকুমেন্ট স্ক্যান ফ্রেম</h2>
          <button
            onClick={onCancel}
            style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', fontSize: '2rem', cursor: 'pointer', lineHeight: '1' }}
          >
            &times;
          </button>
        </div>

        <p className="text-sm text-muted mb-4">কর্নার ধরে ফ্রেম বড়/ছোট করুন। চাইলে ক্রপ না করেও সরাসরি ব্যবহার করতে পারবেন।</p>

        <div className="doc-crop-wrapper">
          <ReactCrop
            crop={crop}
            onChange={(nextCrop) => setCrop(nextCrop)}
            onComplete={(nextCrop) => setCompletedCrop(nextCrop)}
            keepSelection
            minWidth={80}
            minHeight={80}
            className="doc-react-crop"
          >
            <img
              ref={imageRef}
              src={imageSrc}
              alt="Crop source"
              className="doc-crop-image"
            />
          </ReactCrop>
        </div>

        {cropError && <p className="text-sm" style={{ color: 'var(--color-danger)' }}>{cropError}</p>}

        <div className="flex gap-2 mt-4 mobile-btn-stack crop-action-wrap">
          <button type="button" className="btn btn-secondary w-full" onClick={onCancel} disabled={isProcessing}>
            বাতিল
          </button>
          <button type="button" className="btn btn-secondary w-full" onClick={handleUseOriginal} disabled={isProcessing}>
            ক্রপ ছাড়া ব্যবহার করুন
          </button>
          <button type="button" className="btn btn-primary w-full" onClick={handleConfirm} disabled={isProcessing}>
            {isProcessing ? 'প্রসেস হচ্ছে...' : 'ক্রপ করে ব্যবহার করুন'}
          </button>
        </div>
      </div>
    </div>
  );
}
