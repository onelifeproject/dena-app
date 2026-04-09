export default function DeleteModal({ loan, onConfirm, onCancel }) {
  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: '400px', padding: '2rem' }}>
        <div className="text-center mb-6">
            <div style={{ fontSize: '3rem', marginBottom: '1rem', opacity: 0.8 }}>⚠️</div>
            <h2 className="text-xl font-bold mb-2 text-pure text-center">
              হিসাব মুছে ফেলতে চান?
            </h2>
            <p className="text-sm text-secondary">
              আপনি কি নিশ্চিত যে <strong>{loan?.name}</strong> এর সম্পূর্ণ রেকর্ড মুছে ফেলতে চান? এই অ্যাকশনটি আর পরিবর্তন করা যাবে না!
            </p>
        </div>

        <div className="flex gap-4 mt-6">
          <button type="button" className="btn btn-secondary w-full" onClick={onCancel}>বাতিল</button>
          <button type="button" className="btn btn-danger w-full" onClick={() => onConfirm(loan.id)}>
              হ্যাঁ, মুছে ফেলুন
          </button>
        </div>
      </div>
    </div>
  );
}
