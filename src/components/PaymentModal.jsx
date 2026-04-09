import { useState } from 'react';

export default function PaymentModal({ loan, isSettle, onConfirm, onCancel }) {
  const [amount, setAmount] = useState(isSettle ? loan.principal.toString() : loan.interestPerWeek.toString());

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!amount || isNaN(amount)) return;
    onConfirm(loan.id, Number(amount), isSettle);
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="mb-6">
            <h2 className="text-2xl font-bold mb-2 text-pure">
              {isSettle ? 'পুরো টাকা বুঝে নিন' : 'সাপ্তাহিক লাভ জমা নিন'}
            </h2>
            <p className="text-sm text-secondary">
              {isSettle ? `${loan.name} এর হিসাবটি পুরোপুরি পরিশোধ করা হচ্ছে।` : `${loan.name} এর এই সপ্তাহের লাভ জমা করা হচ্ছে।`}
            </p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group mb-8">
             <div style={{ padding: '1rem', background: 'rgba(255,255,255,0.03)', borderRadius: 'var(--radius-md)', marginBottom: '1rem' }}>
                <div className="flex justify-between items-center">
                    <span className="text-sm text-muted">পাওয়ার কথা</span>
                    <span className="font-bold text-lg" style={{ color: isSettle ? 'var(--color-warning)' : 'var(--color-success)'}}>
                        {isSettle ? loan.principal.toLocaleString('bn-BD') : loan.interestPerWeek.toLocaleString('bn-BD')} ৳
                    </span>
                 </div>
             </div>

            <label className="form-label">কত টাকা পেলেন? (৳)</label>
            <input 
              type="number" 
              className="form-input" 
              value={amount}
              onChange={e => setAmount(e.target.value)}
              required
              style={{ fontSize: '1.25rem', padding: '1.25rem', fontWeight: 'bold' }}
            />
            {!isSettle && (
              <span className="text-xs mt-2 text-muted" style={{ marginLeft: '0.25rem' }}>
                জমা দেওয়ার পর পরবর্তী কিস্তির তারিখ ৭ দিন পিছিয়ে যাবে।
              </span>
            )}
          </div>

          <div className="flex justify-between items-center mt-8 gap-4 mobile-btn-stack">
            <button type="button" className="btn btn-secondary flex-1 text-lg" onClick={onCancel}>
               বাতিল করুন
            </button>
            <button type="submit" className={`btn ${isSettle ? 'btn-warning' : 'btn-primary'} flex-1 text-lg shadow-glow`} style={isSettle ? {background: 'var(--gradient-gold)', color: '#000'} : {}}>
               {isSettle ? 'হিসাব সম্পূর্ণ করুন' : 'জমা নিশ্চিত করুন'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
