import { useState } from 'react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { compressImage } from '../utils/imageCompression';

export default function AddLoanForm({ onSave, onCancel }) {
  const [name, setName] = useState('');
  
  // Use pure JS date for DatePicker, we will format it exactly later on submit.
  const [startDate, setStartDate] = useState(new Date());
  
  const [principal, setPrincipal] = useState('');
  const [interestPerWeek, setInterestPerWeek] = useState('');
  const [proofImage, setProofImage] = useState(null);
  const [imageError, setImageError] = useState('');
  const [isProcessingImage, setIsProcessingImage] = useState(false);

  const handlePrincipalChange = (value) => {
    setPrincipal(value);
    if (value && !isNaN(value)) {
      setInterestPerWeek(Math.floor(Number(value) * 0.1).toString());
    } else if (!value) {
      setInterestPerWeek('');
    }
  };

  const handleImageChange = async (event) => {
    const file = event.target.files?.[0];
    if (!file) {
      setProofImage(null);
      setImageError('');
      return;
    }

    try {
      setIsProcessingImage(true);
      setImageError('');
      const compressed = await compressImage(file);
      setProofImage(compressed);
    } catch (error) {
      setProofImage(null);
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
            <h2 className="text-2xl font-bold text-brand-gradient">নতুন লোন দিন</h2>
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
            <input
              type="file"
              className="form-input"
              accept="image/*"
              capture="environment"
              onChange={handleImageChange}
            />
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
              <div style={{ marginTop: '0.75rem' }}>
                <img
                  src={proofImage.dataUrl}
                  alt="Proof preview"
                  style={{
                    width: '100%',
                    maxHeight: '170px',
                    objectFit: 'cover',
                    borderRadius: '12px',
                    border: '1px solid var(--border-subtle)',
                  }}
                />
              </div>
            )}
          </div>

          <button
            type="submit"
            className="btn btn-primary w-full text-lg shadow-glow"
            disabled={isProcessingImage}
          >
             হিসাব সেভ করুন
          </button>
        </form>
      </div>
    </div>
  );
}
