import { useState, useEffect, useRef } from 'react';
import { Capacitor } from '@capacitor/core';
import { App as CapacitorApp } from '@capacitor/app';
import { StatusBar, Style } from '@capacitor/status-bar';
import Dashboard from './components/Dashboard';
import AddLoanForm from './components/AddLoanForm';
import PaymentModal from './components/PaymentModal';
import DeleteModal from './components/DeleteModal';
import LoanDetailsModal from './components/LoanDetailsModal';
import LiveClock from './components/LiveClock';
import NotificationDebugPanel from './components/NotificationDebugPanel';
import { getLoans, addLoan, collectPayment, deleteLoan } from './utils/loanManager';
import {
  requestNotificationAccess,
  initializeNotificationChannel,
  syncLoanNotifications,
  getLoanPendingNotifications,
  scheduleDebugTestNotification,
  scheduleRealMessagePreviewNotifications,
  clearLoanNotifications,
  clearDebugNotifications,
} from './services/notificationService';

export default function App() {
  const [loans, setLoans] = useState(() => getLoans());
  const [isAddingLoan, setIsAddingLoan] = useState(false);
  const [activePaymentModal, setActivePaymentModal] = useState({ show: false, loan: null, isSettle: false });
  const [activeDeleteModal, setActiveDeleteModal] = useState({ show: false, loan: null });
  const [activeLoanDetailsId, setActiveLoanDetailsId] = useState(null);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [showNotificationDebug, setShowNotificationDebug] = useState(false);
  const [logoTapCount, setLogoTapCount] = useState(0);
  const isAddingLoanRef = useRef(isAddingLoan);
  const isPaymentModalOpenRef = useRef(activePaymentModal.show);
  const isDeleteModalOpenRef = useRef(activeDeleteModal.show);
  const activeLoanDetailsIdRef = useRef(activeLoanDetailsId);

  useEffect(() => {
    isAddingLoanRef.current = isAddingLoan;
    isPaymentModalOpenRef.current = activePaymentModal.show;
    isDeleteModalOpenRef.current = activeDeleteModal.show;
    activeLoanDetailsIdRef.current = activeLoanDetailsId;
  }, [activeDeleteModal.show, activeLoanDetailsId, activePaymentModal.show, isAddingLoan]);

  useEffect(() => {
    const setupSystemBars = async () => {
      if (!Capacitor.isNativePlatform() || Capacitor.getPlatform() !== 'android') return;

      await StatusBar.show();
      await StatusBar.setOverlaysWebView({ overlay: false });
      await StatusBar.setBackgroundColor({ color: '#07070a' });
      await StatusBar.setStyle({ style: Style.Dark });
    };

    setupSystemBars();
  }, []);

  useEffect(() => {
    const setupNotifications = async () => {
      const allowed = await requestNotificationAccess();
      if (!allowed) return;

      await initializeNotificationChannel();
      setNotificationsEnabled(true);
    };

    setupNotifications();
  }, []);

  useEffect(() => {
    if (!notificationsEnabled) return;
    syncLoanNotifications(loans);
  }, [loans, notificationsEnabled]);

  useEffect(() => {
    if (logoTapCount === 0) return;
    const timer = setTimeout(() => setLogoTapCount(0), 6000);
    return () => clearTimeout(timer);
  }, [logoTapCount]);

  useEffect(() => {
    if (!Capacitor.isNativePlatform() || Capacitor.getPlatform() !== 'android') return undefined;
    const registerBackHandler = async () => {
      const listener = await CapacitorApp.addListener('backButton', ({ canGoBack }) => {
        if (activeLoanDetailsIdRef.current) {
          setActiveLoanDetailsId(null);
          return;
        }

        if (isDeleteModalOpenRef.current) {
          setActiveDeleteModal({ show: false, loan: null });
          return;
        }

        if (isPaymentModalOpenRef.current) {
          setActivePaymentModal({ show: false, loan: null, isSettle: false });
          return;
        }

        if (isAddingLoanRef.current) {
          setIsAddingLoan(false);
          return;
        }

        if (canGoBack) {
          window.history.back();
          return;
        }

        CapacitorApp.exitApp();
      });

      return () => listener.remove();
    };

    let disposed = false;
    let cleanup = () => {};
    registerBackHandler().then((listenerCleanup) => {
      if (disposed) {
        listenerCleanup();
        return;
      }
      cleanup = listenerCleanup;
    });

    return () => {
      disposed = true;
      cleanup();
    };
  }, []);

  const handleLogoTap = () => {
    setLogoTapCount((count) => {
      const next = count + 1;
      if (next >= 7) {
        setShowNotificationDebug((prev) => !prev);
        return 0;
      }
      return next;
    });
  };

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
    if (activeLoanDetailsId === loanId) {
      setActiveLoanDetailsId(null);
    }
  };

  const activeLoanDetails = loans.find((loan) => loan.id === activeLoanDetailsId) || null;

  const handleDebugPermissionCheck = async () => {
    const allowed = await requestNotificationAccess();
    if (allowed) {
      await initializeNotificationChannel();
      setNotificationsEnabled(true);
    }
    return allowed;
  };

  const handleDebugResync = async () => {
    await syncLoanNotifications(loans);
  };

  const handleDebugGetPending = async () => getLoanPendingNotifications();

  const handleDebugTest = async () => scheduleDebugTestNotification(30);

  const handleDebugRealPreview = async () => {
    const sourceLoan = loans.find((item) => item.status === 'ACTIVE') || loans[0];
    return scheduleRealMessagePreviewNotifications(sourceLoan);
  };

  const handleDebugClearAll = async () => {
    await clearLoanNotifications();
    await clearDebugNotifications();
  };

  return (
    <div className="app-container" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <header className="app-header">
        <button
          type="button"
          className="logo-link"
          style={{
            textDecoration: 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '100%',
            background: 'transparent',
            border: 'none',
            padding: 0,
            cursor: 'pointer',
          }}
          onPointerDown={handleLogoTap}
        >
          <img src="/favicon.png" alt="App Logo" className="app-main-logo" style={{ width: '2.8rem', height: '2.8rem', marginRight: '1rem', borderRadius: '0.5rem', boxShadow: '0 0 20px rgba(139, 92, 246, 0.4)' }} />
          <div>
            <h1 className="text-3xl font-bold text-brand-gradient" style={{ lineHeight: '1.2', margin: 0, padding: 0 }}>হিসাব রক্ষক</h1>
            <p className="text-base font-medium mt-1" style={{ color: 'var(--text-secondary)', margin: 0, padding: 0 }}>লোন এবং সুদের হিসাব</p>
          </div>
        </button>
      </header>

      <LiveClock />

      <main style={{ flex: 1 }}>
        <Dashboard 
          loans={loans} 
          onPaymentClick={handlePaymentClick} 
          onSettleClick={handleSettleClick}
          onDeleteClick={handleDeleteRequest}
          onAddNewClick={() => setIsAddingLoan(true)}
          onLoanSelect={(loan) => setActiveLoanDetailsId(loan.id)}
        />

        {showNotificationDebug && (
          <NotificationDebugPanel
            loans={loans}
            onRequestPermission={handleDebugPermissionCheck}
            onResync={handleDebugResync}
            onGetPending={handleDebugGetPending}
            onSendTest={handleDebugTest}
            onSendRealPreview={handleDebugRealPreview}
            onClearAll={handleDebugClearAll}
          />
        )}
      </main>

      <footer className="w-full text-center" style={{ marginTop: 'auto', paddingTop: '2rem', paddingBottom: '1rem', borderTop: '1px solid var(--border-subtle)' }}>
        <p className="text-xs text-muted">© ২০২৬ হিসাব রক্ষক - আপনার লোন ও সুদের বিশ্বস্ত হিসাবসাথী। নির্মাতা: সুজিৎ বিশ্বাস</p>
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

      {activeLoanDetails && (
        <LoanDetailsModal
          loan={activeLoanDetails}
          onClose={() => setActiveLoanDetailsId(null)}
        />
      )}
    </div>
  );
}
