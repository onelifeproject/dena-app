import { useRef, useState } from 'react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { TransformComponent, TransformWrapper } from 'react-zoom-pan-pinch';
import { compressImage } from '../utils/imageCompression';
import DocumentCropModal from './DocumentCropModal';

const parseLoanStartDate = (value) => {
  if (!value) return new Date();
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}/.test(value)) {
    const [year, month, day] = value.slice(0, 10).split('-').map(Number);
    return new Date(year, month - 1, day);
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? new Date() : date;
};

export default function AddLoanForm({ onSave, onCancel, initialLoan = null, mode = 'create' }) {
  const [name, setName] = useState(initialLoan?.name || '');
  
  // Use pure JS date for DatePicker, we will format it exactly later on submit.
  const [startDate, setStartDate] = useState(parseLoanStartDate(initialLoan?.startDate));
  
  const [principal, setPrincipal] = useState(initialLoan?.principal ? String(initialLoan.principal) : '');
  const [interestPerWeek, setInterestPerWeek] = useState(
    initialLoan?.interestPerWeek ? String(initialLoan.interestPerWeek) : ''
  );
  const [proofImage, setProofImage] = useState(initialLoan?.proofImage || null);
  const isEditMode = mode === 'edit';

  const [imageError, setImageError] = useState('');
  const [isProcessingImage, setIsProcessingImage] = useState(false);
  const [cropSource, setCropSource] = useState(null);
  const [cropSourceName, setCropSourceName] = useState('proof-image.png');
  const [isPreviewViewerOpen, setIsPreviewViewerOpen] = useState(false);
  const cameraInputRef = useRef(null);
  const galleryInputRef = useRef(null);

  const handlePrincipalChange = (value) => {
    setPrincipal(value);
    if (value && !isNaN(value)) {
      setInterestPerWeek(Math.floor(Number(value) * 0.1).toString());
    } else if (!value) {
      setInterestPerWeek('');
    }
  };

  const fileToDataUrl = (file) =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(new Error('ছবি পড়া যায়নি।'));
      reader.readAsDataURL(file);
    });

  const handleImagePick = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    try {
      setImageError('');
      const source = await fileToDataUrl(file);
      setCropSource(source);
      setCropSourceName(file.name || 'proof-image.png');
    } catch (error) {
      setImageError(error.message || 'ছবি প্রসেস করা যায়নি।');
    }
  };

  const handleCropConfirm = async (blob) => {
    try {
      setIsProcessingImage(true);
      setImageError('');
      const file = new File([blob], cropSourceName, { type: blob.type || 'image/png' });
      const compressed = await compressImage(file);
      setProofImage(compressed);
      setCropSource(null);
    } catch (error) {
      setImageError(error.message || 'ছবি প্রসেস করা যায়নি।');
    } finally {
      setIsProcessingImage(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name || !principal || !interestPerWeek || !startDate) return;

    // Final conversion to ensure strictly accurate Asia timezone string (YYYY-MM-DD) natively
    const tzDate = new Date(startDate.toLocaleString("en-US", {timeZone: "Asia/Dhaka"}));
    const yyyy = tzDate.getFullYear();
    const mm = String(tzDate.getMonth() + 1).padStart(2, '0');
    const dd = String(tzDate.getDate()).padStart(2, '0');
    const dbFormattedDate = `${yyyy}-${mm}-${dd}`;

    onSave({
      name,
      startDate: dbFormattedDate,
      principal: Number(principal),
      interestPerWeek: Number(interestPerWeek),
      proofImage
    });
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="mb-6 flex justify-between items-center">
            <h2 className="text-2xl font-bold text-brand-gradient">{isEditMode ? 'হিসাব এডিট করুন' : 'নতুন লোন দিন'}</h2>
            <button onClick={onCancel} style={{background:'transparent', border:'none', color:'var(--text-muted)', fontSize:'2rem', cursor:'pointer', lineHeight: '1'}}>&times;</button>
        </div>
        
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">যাকে টাকা দিচ্ছেন তার নাম</label>
            <input 
              type="text" 
              className="form-input" 
              placeholder="যেমন: রহিম মিয়া"
              value={name}
              onChange={e => setName(e.target.value)}
              required
            />
          </div>

          <div className="form-group date-picker-wrapper">
            <label className="form-label">টাকা দেওয়ার তারিখ</label>
            <DatePicker 
               selected={startDate} 
               onChange={(date) => setStartDate(date)} 
               className="form-input w-full"
               dateFormat="dd/MM/yyyy"
               placeholderText="তারিখ নির্বাচন করুন"
               required
            />
          </div>

          <div className="form-group">
            <label className="form-label">মোট টাকার পরিমাণ (৳)</label>
            <input 
              type="number" 
              className="form-input" 
              placeholder="যেমন: ২০০০০"
              value={principal}
              onChange={e => handlePrincipalChange(e.target.value)}
              required
            />
          </div>

          <div className="form-group mb-8">
            <label className="form-label">সপ্তাহে লাভের পরিমাণ (৳)</label>
            <input 
              type="number" 
              className="form-input" 
              placeholder="যেমন: ২০০০"
              value={interestPerWeek}
              onChange={e => setInterestPerWeek(e.target.value)}
              required
            />
            <span className="text-xs text-brand-primary" style={{ marginLeft: '0.25rem', marginTop: '0.25rem', opacity: 0.9 }}>
              আপনি চাইলে যেকোনো পরিমাণ বসাতে পারেন, যা আপনি লাভ হিসেবে নিবেন।
            </span>
          </div>

          <div className="form-group mb-8">
            <label className="form-label">ডকুমেন্ট প্রুফ ছবি (ঐচ্ছিক)</label>
            <div className="proof-uploader-card">
              <div className="proof-uploader-head">
                <div>
                  <p className="text-sm font-semibold">Document Proof</p>
                  <p className="text-xs text-muted">স্ক্যান ফ্রেমে ক্রপ করে পরিষ্কার ছবি সেভ হবে</p>
                </div>
                <span className="proof-pill">Optional</span>
              </div>

              <div className="proof-actions-row">
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => cameraInputRef.current?.click()}
                  disabled={isProcessingImage}
                >
                  ক্যামেরা দিয়ে তুলুন
                </button>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => galleryInputRef.current?.click()}
                  disabled={isProcessingImage}
                >
                  গ্যালারি থেকে নিন
                </button>
              </div>

              <input
                ref={cameraInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleImagePick}
                style={{ display: 'none' }}
              />
              <input
                ref={galleryInputRef}
                type="file"
                accept="image/*"
                onChange={handleImagePick}
                style={{ display: 'none' }}
              />
            </div>
            <span className="text-xs text-muted" style={{ marginLeft: '0.25rem', marginTop: '0.25rem' }}>
              ছবি দিলে কমপ্রেস করে সেভ হবে। ছবি না দিলেও হিসাব সেভ হবে।
            </span>
            {isProcessingImage && (
              <span className="text-xs text-brand-primary" style={{ marginLeft: '0.25rem', marginTop: '0.25rem' }}>
                ছবি প্রস্তুত করা হচ্ছে...
              </span>
            )}
            {imageError && (
              <span className="text-xs" style={{ marginLeft: '0.25rem', marginTop: '0.25rem', color: 'var(--color-danger)' }}>
                {imageError}
              </span>
            )}
            {proofImage?.dataUrl && (
              <div className="proof-preview-wrap">
                <img
                  src={proofImage.dataUrl}
                  alt="Proof preview"
                  className="proof-preview-image clickable-proof-image"
                  onClick={() => setIsPreviewViewerOpen(true)}
                />
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => setIsPreviewViewerOpen(true)}
                  style={{ marginTop: '0.75rem' }}
                >
                  ছবি বড় করে দেখুন
                </button>
                <button
                  type="button"
                  className="btn btn-danger btn-sm"
                  onClick={() => setProofImage(null)}
                  style={{ marginTop: '0.75rem' }}
                >
                  ছবি সরান
                </button>
              </div>
            )}
          </div>

          <button
            type="submit"
            className="btn btn-primary w-full text-lg shadow-glow"
            disabled={isProcessingImage}
          >
             {isEditMode ? 'হিসাব আপডেট করুন' : 'হিসাব সেভ করুন'}
          </button>
        </form>
      </div>

      {cropSource && (
        <DocumentCropModal
          imageSrc={cropSource}
          onCancel={() => setCropSource(null)}
          onConfirm={handleCropConfirm}
          isProcessing={isProcessingImage}
        />
      )}

      {isPreviewViewerOpen && proofImage?.dataUrl && (
        <div className="modal-overlay image-viewer-overlay" onClick={() => setIsPreviewViewerOpen(false)}>
          <div className="image-viewer-shell" onClick={(event) => event.stopPropagation()}>
            <div className="image-viewer-toolbar">
              <h3 className="text-base font-bold text-pure">ডকুমেন্ট প্রিভিউ</h3>
              <button
                type="button"
                className="image-viewer-close"
                onClick={() => setIsPreviewViewerOpen(false)}
              >
                &times;
              </button>
            </div>

            <TransformWrapper
              minScale={1}
              maxScale={6}
              initialScale={1}
              wheel={{ step: 0.2 }}
              pinch={{ step: 5 }}
              doubleClick={{ mode: 'toggle', step: 1.4 }}
              panning={{ velocityDisabled: true }}
            >
              {({ zoomIn, zoomOut, resetTransform }) => (
                <>
                  <div className="image-viewer-actions">
                    <button type="button" className="btn btn-secondary btn-sm" onClick={() => zoomOut()}>
                      -
                    </button>
                    <button type="button" className="btn btn-secondary btn-sm" onClick={() => resetTransform()}>
                      Reset
                    </button>
                    <button type="button" className="btn btn-secondary btn-sm" onClick={() => zoomIn()}>
                      +
                    </button>
                  </div>
                  <TransformComponent
                    wrapperClass="image-viewer-transform-wrapper"
                    contentClass="image-viewer-transform-content"
                  >
                    <img
                      src={proofImage.dataUrl}
                      alt="Proof preview zoomed"
                      className="image-viewer-image"
                    />
                  </TransformComponent>
                </>
              )}
            </TransformWrapper>
          </div>
        </div>
      )}
    </div>
  );
}
