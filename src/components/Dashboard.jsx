import { useEffect, useRef, useState } from 'react';
import LoanCard from './LoanCard';
import { getSummaryStats, getAvailableYears } from '../utils/loanManager';

const banglaMonths = [
    'জানুয়ারি', 'ফেব্রুয়ারি', 'মার্চ', 'এপ্রিল', 'মে', 'জুন',
    'জুলাই', 'আগস্ট', 'সেপ্টেম্বর', 'অক্টোবর', 'নভেম্বর', 'ডিসেম্বর'
];

// Helper to reliably translate years without thousand separators locally
const toBnYear = (year) => Number(year).toLocaleString('bn-BD', { useGrouping: false });

export default function Dashboard({ loans, onPaymentClick, onSettleClick, onDeleteClick, onAddNewClick, onLoanSelect }) {
  const [activeTab, setActiveTab] = useState('ACTIVE'); // ACTIVE or DONE
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [openFilterMenu, setOpenFilterMenu] = useState(null);
  const filterMenuRef = useRef(null);
  
  const { totalActivePrincipal, totalInterestCollected, monthlyInterest } = getSummaryStats(loans, selectedYear, selectedMonth);
  const availableYears = getAvailableYears(loans);
  
  const displayedLoans = loans.filter(loan => loan.status === activeTab).sort((a, b) => {
    return new Date(a.nextPaymentDate) - new Date(b.nextPaymentDate);
  });

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!filterMenuRef.current?.contains(event.target)) {
        setOpenFilterMenu(null);
      }
    };

    document.addEventListener('pointerdown', handleClickOutside);
    return () => document.removeEventListener('pointerdown', handleClickOutside);
  }, []);

  return (
    <div className="w-full">
      <div className="text-center mb-4">
         <h2 className="section-title">হিসাবের সারাংশ</h2>
      </div>
      <div className="glass-card mb-6">
        <div className="summary-header flex justify-end items-center flex-wrap gap-4" style={{ padding: '0.75rem 1.25rem' }}>
            
            {/* Monthly Report Timeline Selector */}
            <div ref={filterMenuRef} className="flex gap-2 w-full-mobile justify-end summary-filter-row">
              <div className="custom-select">
                <button
                  type="button"
                  className={`report-select report-select-btn ${openFilterMenu === 'month' ? 'active' : ''}`}
                  onClick={() => setOpenFilterMenu((prev) => (prev === 'month' ? null : 'month'))}
                >
                  {banglaMonths[selectedMonth]}
                </button>
                {openFilterMenu === 'month' && (
                  <div className="custom-select-menu">
                    {banglaMonths.map((month, index) => (
                      <button
                        key={month}
                        type="button"
                        className={`custom-select-option ${index === selectedMonth ? 'selected' : ''}`}
                        onClick={() => {
                          setSelectedMonth(index);
                          setOpenFilterMenu(null);
                        }}
                      >
                        {month}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="custom-select">
                <button
                  type="button"
                  className={`report-select report-select-btn ${openFilterMenu === 'year' ? 'active' : ''}`}
                  onClick={() => setOpenFilterMenu((prev) => (prev === 'year' ? null : 'year'))}
                >
                  {toBnYear(selectedYear)}
                </button>
                {openFilterMenu === 'year' && (
                  <div className="custom-select-menu">
                    {availableYears.map((year) => (
                      <button
                        key={year}
                        type="button"
                        className={`custom-select-option ${year === selectedYear ? 'selected' : ''}`}
                        onClick={() => {
                          setSelectedYear(year);
                          setOpenFilterMenu(null);
                        }}
                      >
                        {toBnYear(year)}
                      </button>
                    ))}
                  </div>
                )}
              </div>
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

      <div className="text-center mb-4 mt-10">
         <h2 className="section-title">{activeTab === 'ACTIVE' ? 'সক্রিয় গ্রাহক' : 'সম্পূর্ণ হওয়া হিসাব'}</h2>
      </div>
      
      {activeTab === 'ACTIVE' && (
        <div className="flex justify-end mb-4 px-2">
            <button onClick={onAddNewClick} className="btn btn-primary w-full-mobile shadow-glow">
               <span className="mr-1">+</span> নতুন হিসাব
            </button>
        </div>
      )}

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
              onOpenDetails={onLoanSelect}
            />
          ))
        )}
      </div>
    </div>
  );
}
