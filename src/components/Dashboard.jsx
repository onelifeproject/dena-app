import { useState } from 'react';
import LoanCard from './LoanCard';
import { getSummaryStats, getAvailableYears } from '../utils/loanManager';

const banglaMonths = [
    'জানুয়ারি', 'ফেব্রুয়ারি', 'মার্চ', 'এপ্রিল', 'মে', 'জুন',
    'জুলাই', 'আগস্ট', 'সেপ্টেম্বর', 'অক্টোবর', 'নভেম্বর', 'ডিসেম্বর'
];

// Helper to reliably translate years without thousand separators locally
const toBnYear = (year) => Number(year).toLocaleString('bn-BD', { useGrouping: false });

export default function Dashboard({ loans, onPaymentClick, onSettleClick, onDeleteClick, onAddNewClick }) {
  const [activeTab, setActiveTab] = useState('ACTIVE'); // ACTIVE or DONE
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  
  const { totalActivePrincipal, totalInterestCollected, monthlyInterest } = getSummaryStats(loans, selectedYear, selectedMonth);
  const availableYears = getAvailableYears(loans);
  
  const displayedLoans = loans.filter(loan => loan.status === activeTab).sort((a, b) => {
    return new Date(a.nextPaymentDate) - new Date(b.nextPaymentDate);
  });

  return (
    <div className="w-full">
      <div className="glass-card mb-6">
        <div className="flex justify-between items-center flex-wrap gap-4" style={{ padding: '1rem 1.25rem 0' }}>
            <h2 className="text-sm text-secondary font-semibold" style={{ letterSpacing: '0.02em', margin: 0 }}>
               হিসাবের সারাংশ
            </h2>
            
            {/* Monthly Report Timeline Selector */}
            <div className="flex gap-2">
               <select 
                  className="report-select" 
                  value={selectedMonth} 
                  onChange={(e) => setSelectedMonth(Number(e.target.value))}
               >
                  {banglaMonths.map((m, i) => <option key={i} value={i}>{m}</option>)}
               </select>
               <select 
                  className="report-select" 
                  value={selectedYear} 
                  onChange={(e) => setSelectedYear(Number(e.target.value))}
               >
                  {availableYears.map(y => <option key={y} value={y}>{toBnYear(y)}</option>)}
               </select>
            </div>
        </div>
        
        <div className="summary-grid" style={{ padding: '1rem 1.25rem 1.25rem' }}>
          <div className="stat-box">
            <span className="text-xs text-muted">বাজারে দেওয়া মোট আসল</span>
            <div className="stat-value text-gradient" style={{color: 'var(--color-warning)'}}>
                {totalActivePrincipal.toLocaleString('bn-BD')} 
                <span className="stat-currency">৳</span>
            </div>
          </div>
          <div className="stat-box" style={{ position: 'relative' }}>
            <span className="text-xs text-muted">
               {banglaMonths[selectedMonth]} মাসের লাভ
            </span>
            <div className="stat-value text-gradient" style={{color: 'var(--color-success)'}}>
                {monthlyInterest.toLocaleString('bn-BD')}
                <span className="stat-currency">৳</span>
            </div>
            
            {/* Show all time total subtly beneath */}
            <div className="text-xs text-muted" style={{ marginTop: '0.75rem', opacity: 0.8, borderTop: '1px solid var(--border-subtle)', paddingTop: '0.5rem' }}>
               সর্বমোট আয়: <span className="font-bold">{totalInterestCollected.toLocaleString('bn-BD')} ৳</span>
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
