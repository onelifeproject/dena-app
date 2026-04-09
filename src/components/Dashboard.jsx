import { useState } from 'react';
import LoanCard from './LoanCard';
import { getSummaryStats } from '../utils/loanManager';

export default function Dashboard({ loans, onPaymentClick, onSettleClick, onDeleteClick, onAddNewClick }) {
  const [activeTab, setActiveTab] = useState('ACTIVE'); // ACTIVE or DONE
  
  const { totalActivePrincipal, totalInterestCollected } = getSummaryStats(loans);
  
  const displayedLoans = loans.filter(loan => loan.status === activeTab).sort((a, b) => {
    return new Date(a.nextPaymentDate) - new Date(b.nextPaymentDate);
  });

  return (
    <div className="w-full">
      <div className="glass-card mb-8">
        <div style={{ padding: '1.5rem 1.5rem 0' }}>
            <h2 className="text-sm text-secondary font-semibold" style={{ letterSpacing: '0.02em' }}>হিসাবের সারাংশ</h2>
        </div>
        
        <div className="summary-grid" style={{ padding: '1.5rem' }}>
          <div className="stat-box">
            <span className="text-xs text-muted">বাজারে দেওয়া মোট আসল</span>
            <div className="stat-value text-gradient" style={{color: 'var(--color-warning)'}}>
                {totalActivePrincipal.toLocaleString('bn-BD')} 
                <span className="stat-currency">৳</span>
            </div>
          </div>
          <div className="stat-box">
            <span className="text-xs text-muted">আদায়কৃত মোট লাভ</span>
            <div className="stat-value text-gradient" style={{color: 'var(--color-success)'}}>
                {totalInterestCollected.toLocaleString('bn-BD')}
                <span className="stat-currency">৳</span>
            </div>
          </div>
        </div>
      </div>

      <div className="tabs-container">
         <button 
            className={`tab-btn ${activeTab === 'ACTIVE' ? 'active' : ''}`}
            onClick={() => setActiveTab('ACTIVE')}
         >
            চলতি হিসাব
         </button>
         <button 
            className={`tab-btn ${activeTab === 'DONE' ? 'active' : ''}`}
            onClick={() => setActiveTab('DONE')}
         >
            পরিশোধিত
         </button>
      </div>

      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold">{activeTab === 'ACTIVE' ? 'সক্রিয় গ্রাহক' : 'সম্পূর্ণ হওয়া হিসাব'}</h2>
        {activeTab === 'ACTIVE' && (
            <button className="btn btn-primary btn-sm" onClick={onAddNewClick}>
              + নতুন হিসাব
            </button>
        )}
      </div>

      <div className="flex flex-col gap-4">
        {displayedLoans.length === 0 ? (
           <div className="glass-card" style={{ padding: '3rem 2rem', textAlign: 'center' }}>
              <div style={{ fontSize: '3rem', opacity: 0.5, marginBottom: '1rem' }}>📭</div>
              <p className="text-secondary font-medium">এই তালিকায় কোনো হিসাব নেই!</p>
              {activeTab === 'ACTIVE' && (
                 <p className="text-sm text-muted mt-2">শুরু করতে "+ নতুন হিসাব" এ ক্লিক করুন।</p>
              )}
           </div>
        ) : (
          displayedLoans.map(loan => (
            <LoanCard 
              key={loan.id} 
              loan={loan} 
              onPaymentClick={onPaymentClick} 
              onSettleClick={onSettleClick}
              onDeleteClick={() => onDeleteClick(loan)}
            />
          ))
        )}
      </div>
    </div>
  );
}
