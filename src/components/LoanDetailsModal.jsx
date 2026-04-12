const banglaDays = ['রবিবার', 'সোমবার', 'মঙ্গলবার', 'বুধবার', 'বৃহস্পতিবার', 'শুক্রবার', 'শনিবার'];

const formatBnDate = (isoString) => {
  const date = new Date(isoString);
  return `${date.toLocaleDateString('bn-BD')} (${banglaDays[date.getDay()]})`;
};

const toBnAmount = (amount) => Number(amount).toLocaleString('bn-BD');

export default function LoanDetailsModal({ loan, onClose }) {
  if (!loan) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content loan-details-modal" onClick={(event) => event.stopPropagation()}>
        <div className="mb-6 flex justify-between items-center">
          <h2 className="text-2xl font-bold text-brand-gradient">হিসাবের বিস্তারিত</h2>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-muted)',
              fontSize: '2rem',
              cursor: 'pointer',
              lineHeight: '1',
            }}
          >
            &times;
          </button>
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
            <span className="text-xs text-muted">সাপ্তাহিক লাভ</span>
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
            <img src={loan.proofImage.dataUrl} alt={`${loan.name} proof`} className="loan-proof-image" />
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
                    {payment.type === 'SETTLEMENT' ? 'পরিশোধ' : 'লাভ'}: {toBnAmount(payment.amount)} ৳
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted">এখনও কোনো পেমেন্ট নেই।</p>
          )}
        </div>
      </div>
    </div>
  );
}
