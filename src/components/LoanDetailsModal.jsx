import { lazy, Suspense, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { Directory, Filesystem } from '@capacitor/filesystem';

const ZoomableImageViewerModal = lazy(() => import('./ZoomableImageViewerModal'));

const banglaDays = ['রবিবার', 'সোমবার', 'মঙ্গলবার', 'বুধবার', 'বৃহস্পতিবার', 'শুক্রবার', 'শনিবার'];

const formatBnDate = (isoString) => {
  const date = new Date(isoString);
  return `${date.toLocaleDateString('bn-BD')} (${banglaDays[date.getDay()]})`;
};

const toBnAmount = (amount) => Number(amount).toLocaleString('bn-BD');

export default function LoanDetailsModal({ loan, onClose, onEdit }) {
  const [isImageViewerOpen, setIsImageViewerOpen] = useState(false);

  if (!loan) return null;
  const safeLoanName = `${loan.name || 'loan'}`
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .toLowerCase();
  const fileName = `${safeLoanName || 'loan'}-proof-${Date.now()}.jpg`;

  const handleJpgDownload = async () => {
    if (!loan.proofImage?.dataUrl) return;

    try {
      const image = new Image();
      image.src = loan.proofImage.dataUrl;

      await new Promise((resolve, reject) => {
        image.onload = resolve;
        image.onerror = reject;
      });

      const canvas = document.createElement('canvas');
      canvas.width = image.width;
      canvas.height = image.height;
      const context = canvas.getContext('2d');
      if (!context) throw new Error('ক্যানভাস পাওয়া যায়নি।');

      context.fillStyle = '#ffffff';
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.drawImage(image, 0, 0);

      const jpgDataUrl = canvas.toDataURL('image/jpeg', 0.92);
      const base64Data = jpgDataUrl.split(',')[1];

      if (Capacitor.isNativePlatform()) {
        const targetPath = `Dena/${fileName}`;
        await Filesystem.writeFile({
          path: targetPath,
          data: base64Data,
          directory: Directory.Documents,
          recursive: true,
        });
        window.alert(`ছবি সেভ হয়েছে: Documents/Dena/${fileName}`);
        return;
      }

      const link = document.createElement('a');
      link.href = jpgDataUrl;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Proof download failed:', error);
      window.alert('ছবি সেভ করা যায়নি। আবার চেষ্টা করুন।');
    }
  };

  const modalLoadingFallback = (
    <div className="modal-overlay">
      <div className="modal-content">
        <p className="text-sm text-muted">লোড হচ্ছে...</p>
      </div>
    </div>
  );

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content loan-details-modal" onClick={(event) => event.stopPropagation()}>
        <div className="mb-6 loan-details-header">
          <div className="loan-details-header-top">
            <h2 className="text-2xl font-bold text-brand-gradient loan-details-title">হিসাবের বিস্তারিত</h2>
            <button
              type="button"
              className="loan-details-close-btn"
              onClick={onClose}
              aria-label="বন্ধ করুন"
            >
              &times;
            </button>
          </div>
          <div className="loan-details-header-actions">
            <button
              type="button"
              className="btn btn-secondary btn-sm loan-details-edit-btn"
              onClick={() => onEdit?.(loan)}
            >
              এডিট করুন
            </button>
          </div>
        </div>

        <div className="loan-details-grid">
          <div className="loan-details-item">
            <span className="text-xs text-muted">নাম</span>
            <p className="text-base font-bold text-pure">{loan.name}</p>
          </div>
          <div className="loan-details-item">
            <span className="text-xs text-muted">স্ট্যাটাস</span>
            <p className="text-base font-bold" style={{ color: loan.status === 'ACTIVE' ? 'var(--color-warning)' : 'var(--color-success)' }}>
              {loan.status === 'ACTIVE' ? 'চলতি' : 'পরিশোধিত'}
            </p>
          </div>
          <div className="loan-details-item">
            <span className="text-xs text-muted">আসল টাকা</span>
            <p className="text-base font-bold text-pure">{toBnAmount(loan.principal)} ৳</p>
          </div>
          <div className="loan-details-item">
            <span className="text-xs text-muted">সাপ্তাহিক মুনাফা</span>
            <p className="text-base font-bold text-pure">{toBnAmount(loan.interestPerWeek)} ৳</p>
          </div>
          <div className="loan-details-item">
            <span className="text-xs text-muted">শুরু</span>
            <p className="text-sm text-secondary">{formatBnDate(loan.startDate)}</p>
          </div>
          <div className="loan-details-item">
            <span className="text-xs text-muted">পরবর্তী কিস্তি</span>
            <p className="text-sm text-secondary">{formatBnDate(loan.nextPaymentDate)}</p>
          </div>
        </div>

        <div className="loan-proof-block">
          <h3 className="text-base font-bold mb-2">ডকুমেন্ট প্রুফ</h3>
          {loan.proofImage?.dataUrl ? (
            <>
              <img
                src={loan.proofImage.dataUrl}
                alt={`${loan.name} proof`}
                className="loan-proof-image clickable-proof-image"
                onClick={() => setIsImageViewerOpen(true)}
              />
              <button
                type="button"
                className="btn btn-secondary btn-sm mt-4"
                onClick={() => setIsImageViewerOpen(true)}
              >
                ছবি বড় করে দেখুন
              </button>
              <div className="mt-4">
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={handleJpgDownload}
                >
                  ছবি ডাউনলোড করুন
                </button>
              </div>
            </>
          ) : (
            <p className="text-sm text-muted">কোনো ছবি যোগ করা হয়নি।</p>
          )}
        </div>

        <div className="loan-proof-block">
          <h3 className="text-base font-bold mb-2">পেমেন্ট হিস্ট্রি</h3>
          {loan.payments?.length ? (
            <div className="loan-history-list">
              {[...loan.payments].reverse().map((payment, index) => (
                <div key={`${payment.date}-${index}`} className="loan-history-item">
                  <span className="text-sm text-secondary">{formatBnDate(payment.date)}</span>
                  <span className="text-sm font-bold" style={{ color: payment.type === 'SETTLEMENT' ? 'var(--color-success)' : 'var(--color-warning)' }}>
                    {payment.type === 'SETTLEMENT' ? 'পরিশোধ' : 'মুনাফা'}: {toBnAmount(payment.amount)} ৳
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted">এখনও কোনো পেমেন্ট নেই।</p>
          )}
        </div>
      </div>

      <Suspense fallback={modalLoadingFallback}>
        <ZoomableImageViewerModal
          isOpen={isImageViewerOpen}
          imageSrc={loan.proofImage?.dataUrl}
          imageAlt={`${loan.name} proof zoomed`}
          title="ডকুমেন্ট প্রিভিউ"
          onClose={() => setIsImageViewerOpen(false)}
        />
      </Suspense>
    </div>
  );
}
