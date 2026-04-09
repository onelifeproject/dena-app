export default function DeleteModal({ loan, onConfirm, onCancel }) {
  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: '400px', padding: '2rem' }}>
        <div className="text-center mb-6">
            <div style={{ fontSize: '3rem', marginBottom: '1rem', opacity: 0.8 }}>⚠️</div>
            <h2 className="text-xl font-bold mb-2 text-pure text-center">
              হিসাব মুছে ফেলতে চান?
            </h2>
            <p className="text-secondary mb-4 text-center">
              আপনি কি নিশ্চিত যে আপনি <span className="font-bold text-pure">{loan.name}</span> এর সব তথ্য মুছে ফেলতে চান? এটি আর ফিরিয়ে আনা যাবে না।
            </p>
        </div>

        <div className="flex gap-4 mt-8 mobile-btn-stack">
          <button className="btn btn-secondary flex-1" onClick={onCancel}>
             না, বাতিল করুন
          </button>
          <button className="btn flex-1" style={{ background: 'rgba(239, 68, 68, 0.15)', color: 'var(--color-danger)', border: '1px solid rgba(239, 68, 68, 0.3)' }} onClick={() => onConfirm(loan.id)}>
             হ্যাঁ, মুছে ফেলুন
          </button>
        </div>
      </div>
    </div>
  );
}
