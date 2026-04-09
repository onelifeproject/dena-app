import { calculateDaysLeft } from '../utils/loanManager';

export default function LoanCard({ loan, onPaymentClick, onSettleClick, onDeleteClick }) {
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
    <div className={`glass-card loan-card-container ${isOverdue && loan.status === 'ACTIVE' ? 'overdue-alert' : ''}`}>
      
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
                 <p className="text-sm text-primary mt-1">
                     পরবর্তী কিস্তি: <span style={{ color: isOverdue ? 'var(--color-danger)' : 'var(--color-warning)', paddingRight: '4px' }}>
                         {formatBnDate(loan.nextPaymentDate)}
                     </span>
                     <span className="font-bold inline-block sm-mt-0" style={{ color: isOverdue ? 'var(--color-danger)' : 'var(--color-success)' }}>
                         ({isOverdue ? `মেয়াদোত্তীর্ণ: ${toBn(Math.abs(daysLeft))} দিন` : `বাকি: ${toBn(daysLeft)} দিন`})
                     </span>
                 </p>
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

      {/* Right side actions (Stacking horizontally on mobile via flex) */}
      <div className="loan-card-actions">
        {loan.status === 'ACTIVE' ? (
            <div className="action-btn-group">
               <button 
                  className="btn btn-primary compact-btn" 
                  onClick={() => onPaymentClick(loan)}
                >
                  লাভ জমা
               </button>
               <button 
                  className="btn btn-secondary compact-btn" 
                  onClick={() => onSettleClick(loan)}
                >
                  পরিশোধ
               </button>
            </div>
        ) : (
            <span className="badge badge-done mb-1 sm-mb-0">বন্ধ</span>
        )}
        
        <button 
           className="btn btn-danger compact-btn delete-btn" 
           onClick={onDeleteClick}
        >
          মুছে ফেলুন
        </button>
      </div>
    </div>
  );
}
