import { useState, useEffect } from 'react';
import Dashboard from './components/Dashboard';
import AddLoanForm from './components/AddLoanForm';
import PaymentModal from './components/PaymentModal';
import DeleteModal from './components/DeleteModal';
import LiveClock from './components/LiveClock';
import { getLoans, addLoan, collectPayment, deleteLoan } from './utils/loanManager';

export default function App() {
  const [loans, setLoans] = useState([]);
  const [isAddingLoan, setIsAddingLoan] = useState(false);
  const [activePaymentModal, setActivePaymentModal] = useState({ show: false, loan: null, isSettle: false });
  const [activeDeleteModal, setActiveDeleteModal] = useState({ show: false, loan: null });

  useEffect(() => {
    setLoans(getLoans());
  }, []);

  const handleAddLoanSave = (loanData) => {
    const updatedLoans = addLoan(loanData);
    setLoans(updatedLoans);
    setIsAddingLoan(false);
  };

  const handlePaymentClick = (loan) => {
    setActivePaymentModal({ show: true, loan, isSettle: false });
  };

  const handleSettleClick = (loan) => {
    setActivePaymentModal({ show: true, loan, isSettle: true });
  };

  const handlePaymentConfirm = (loanId, amount, isFullSettlement) => {
    const updatedLoans = collectPayment(loanId, amount, isFullSettlement);
    setLoans(updatedLoans);
    setActivePaymentModal({ show: false, loan: null, isSettle: false });
  };

  const handleDeleteRequest = (loan) => {
    setActiveDeleteModal({ show: true, loan });
  };

  const handleDeleteConfirm = (loanId) => {
    const updatedLoans = deleteLoan(loanId);
    setLoans(updatedLoans);
    setActiveDeleteModal({ show: false, loan: null });
  };

  return (
    <div className="app-container" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <header className="app-header">
        <a href="/" style={{ textDecoration: 'none', display: 'inline-block' }}>
          <h1 className="text-3xl font-bold text-brand-gradient" style={{ lineHeight: '1.2' }}>হিসাব রক্ষক</h1>
          <p className="text-base font-medium mt-1" style={{ color: 'var(--text-secondary)' }}>লোন এবং সুদের হিসাব</p>
        </a>
      </header>

      <LiveClock />

      <main style={{ flex: 1 }}>
        <Dashboard 
          loans={loans} 
          onPaymentClick={handlePaymentClick} 
          onSettleClick={handleSettleClick}
          onDeleteClick={handleDeleteRequest}
          onAddNewClick={() => setIsAddingLoan(true)}
        />
      </main>

      <footer className="w-full text-center" style={{ marginTop: 'auto', paddingTop: '2rem', paddingBottom: '1rem', borderTop: '1px solid var(--border-subtle)' }}>
        <p className="text-xs text-muted">© ২০২৬ হিসাব রক্ষক। সমস্ত অধিকার সংরক্ষিত।</p>
      </footer>

      {isAddingLoan && (
        <AddLoanForm 
          onSave={handleAddLoanSave}
          onCancel={() => setIsAddingLoan(false)}
        />
      )}

      {activePaymentModal.show && (
        <PaymentModal 
          loan={activePaymentModal.loan}
          isSettle={activePaymentModal.isSettle}
          onConfirm={handlePaymentConfirm}
          onCancel={() => setActivePaymentModal({ show: false, loan: null, isSettle: false })}
        />
      )}

      {activeDeleteModal.show && (
        <DeleteModal 
          loan={activeDeleteModal.loan}
          onConfirm={handleDeleteConfirm}
          onCancel={() => setActiveDeleteModal({ show: false, loan: null })}
        />
      )}
    </div>
  );
}
