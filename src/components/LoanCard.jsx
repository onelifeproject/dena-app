import { calculateDaysLeft } from '../utils/loanManager';

export default function LoanCard({ loan, onPaymentClick, onSettleClick, onDeleteClick, onOpenDetails }) {
  const daysLeft = calculateDaysLeft(loan.nextPaymentDate);
  const isOverdue = daysLeft < 0;

  const toBn = (num) => Number(num).toLocaleString('bn-BD');
  
  const banglaDays = ['রবিবার', 'সোমবার', 'মঙ্গলবার', 'বুধবার', 'বৃহস্পতিবার', 'শুক্রবার', 'শনিবার'];
  
  const formatBnDate = (isoString) => {
      const d = new Date(isoString);
      const datePart = d.toLocaleDateString('bn-BD');
      const dayName = banglaDays[d.getDay()];
      return `${datePart} (${dayName})`;
  };

  const lastPayment = loan.payments && loan.payments.length > 0 
      ? loan.payments[loan.payments.length - 1] 
      : null;

  return (
    <div
      className={`glass-card loan-card-container clickable-loan-card ${loan.status === 'ACTIVE' ? 'active-loan-highlight' : 'done-loan-highlight'} ${isOverdue && loan.status === 'ACTIVE' ? 'overdue-alert' : ''}`}
      role="button"
      tabIndex={0}
      onClick={() => onOpenDetails(loan)}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onOpenDetails(loan);
        }
      }}
    >
      
      {/* Left side info (Name and dates) */}
      <div className="loan-card-info">
         <h3 className="font-bold text-pure text-lg truncate-text mb-2">
            {loan.name}
         </h3>
         
         <div className="flex flex-col gap-2">
             <p className="text-sm text-muted">
                 নেওয়া হয়েছে: <span style={{opacity: 0.9}}>{formatBnDate(loan.startDate)}</span>
             </p>
             
             {lastPayment && (
                 <p className="text-xs text-secondary opacity-70">
                     শেষ লাভ জমা: {formatBnDate(lastPayment.date)}
                 </p>
             )}
             
             {loan.status === 'ACTIVE' ? (
                 <>
                     <p className="text-sm text-primary mt-1 mb-2">
                         পরবর্তী কিস্তি: <span className="font-bold" style={{ color: isOverdue ? 'var(--color-danger)' : 'var(--color-warning)' }}>
                             {formatBnDate(loan.nextPaymentDate)}
                         </span>
                     </p>
                     <p className="text-sm text-primary mb-4">
                         {isOverdue ? (
                            <>
                               বাকি: <span className="font-bold" style={{ color: 'var(--color-danger)', textShadow: '0 0 8px rgba(239, 68, 68, 0.6)' }}>
                                  <span style={{ fontSize: '1.25rem', margin: '0 0.15rem' }}>{toBn(Math.abs(daysLeft))}</span> দিন হয়ে গেছে টাকা দেয়নি!
                               </span>
                            </>
                         ) : (
                            <>
                               বাকি: <span className="font-bold" style={{ color: 'var(--color-success)', textShadow: '0 0 8px rgba(16, 185, 129, 0.6)' }}>
                                  টাকা দিবে আর <span style={{ fontSize: '1.25rem', margin: '0 0.15rem' }}>{toBn(daysLeft)}</span> দিন পর
                               </span>
                            </>
                         )}
                     </p>
                 </>
             ) : (
                 <p className="text-sm text-muted mt-1">হিসাব সম্পূর্ণ পরিশোধিত</p>
             )}
         </div>
      </div>

      {/* Middle amounts */}
      <div className="loan-card-stats">
         <p className="font-bold text-base text-pure amount-text">{loan.principal.toLocaleString('bn-BD')} ৳</p>
         {loan.status === 'ACTIVE' && (
             <p className="text-sm interest-text" style={{ color: 'var(--color-warning)' }}>
                 +{loan.interestPerWeek.toLocaleString('bn-BD')} ৳
             </p>
         )}
      </div>

      {/* Right side actions (Strictly Equal Widths Globally) */}
      <div className="loan-card-actions">
        {loan.status === 'ACTIVE' ? (
           <>
               <button 
                  className="btn btn-primary compact-btn" 
                  onClick={(event) => {
                    event.stopPropagation();
                    onPaymentClick(loan);
                  }}
                >
                  লাভ জমা
               </button>
               <button 
                  className="btn btn-secondary compact-btn" 
                  onClick={(event) => {
                    event.stopPropagation();
                    onSettleClick(loan);
                  }}
                >
                  পরিশোধ
               </button>
              <button 
                className="btn btn-danger compact-btn delete-btn" 
                onClick={(event) => {
                  event.stopPropagation();
                  onDeleteClick();
                }}
              >
                মুছে ফেলুন
              </button>
           </>
        ) : (
          <button 
            className="btn btn-danger compact-btn delete-btn" 
            onClick={(event) => {
              event.stopPropagation();
              onDeleteClick();
            }}
          >
            মুছে ফেলুন
          </button>
        )}
      </div>
    </div>
  );
}
