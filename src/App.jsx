import { useState, useEffect, useRef } from 'react';
import { Capacitor } from '@capacitor/core';
import { App as CapacitorApp } from '@capacitor/app';
import { Directory, Filesystem } from '@capacitor/filesystem';
import { StatusBar, Style } from '@capacitor/status-bar';
import Dashboard from './components/Dashboard';
import AddLoanForm from './components/AddLoanForm';
import PaymentModal from './components/PaymentModal';
import DeleteModal from './components/DeleteModal';
import LoanDetailsModal from './components/LoanDetailsModal';
import LiveClock from './components/LiveClock';
import NotificationDebugPanel from './components/NotificationDebugPanel';
import { getLoans, saveLoans, addLoan, updateLoan, collectPayment, deleteLoan } from './utils/loanManager';
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
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [settingsStatus, setSettingsStatus] = useState('');
  const [pendingRestoreLoans, setPendingRestoreLoans] = useState(null);
  const [pendingRestoreFileName, setPendingRestoreFileName] = useState('');
  const [isAddingLoan, setIsAddingLoan] = useState(false);
  const [editingLoanId, setEditingLoanId] = useState(null);
  const [activePaymentModal, setActivePaymentModal] = useState({ show: false, loan: null, isSettle: false });
  const [activeDeleteModal, setActiveDeleteModal] = useState({ show: false, loan: null });
  const [activeLoanDetailsId, setActiveLoanDetailsId] = useState(null);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [showNotificationDebug, setShowNotificationDebug] = useState(false);
  const [logoTapCount, setLogoTapCount] = useState(0);
  const restoreFileInputRef = useRef(null);
  const isSettingsOpenRef = useRef(isSettingsOpen);
  const pendingRestoreLoansRef = useRef(pendingRestoreLoans);
  const isAddingLoanRef = useRef(isAddingLoan);
  const isEditingLoanRef = useRef(Boolean(editingLoanId));
  const isPaymentModalOpenRef = useRef(activePaymentModal.show);
  const isDeleteModalOpenRef = useRef(activeDeleteModal.show);
  const activeLoanDetailsIdRef = useRef(activeLoanDetailsId);

  useEffect(() => {
    isSettingsOpenRef.current = isSettingsOpen;
    pendingRestoreLoansRef.current = pendingRestoreLoans;
    isAddingLoanRef.current = isAddingLoan;
    isEditingLoanRef.current = Boolean(editingLoanId);
    isPaymentModalOpenRef.current = activePaymentModal.show;
    isDeleteModalOpenRef.current = activeDeleteModal.show;
    activeLoanDetailsIdRef.current = activeLoanDetailsId;
  }, [activeDeleteModal.show, activeLoanDetailsId, activePaymentModal.show, editingLoanId, isAddingLoan, isSettingsOpen, pendingRestoreLoans]);

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

        if (isSettingsOpenRef.current) {
          setIsSettingsOpen(false);
          return;
        }

        if (pendingRestoreLoansRef.current) {
          setPendingRestoreLoans(null);
          setPendingRestoreFileName('');
          return;
        }

        if (isEditingLoanRef.current) {
          setEditingLoanId(null);
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

  const handleEditLoanSave = (loanData) => {
    if (!editingLoanId) return;
    const updatedLoans = updateLoan(editingLoanId, loanData);
    setLoans(updatedLoans);
    setEditingLoanId(null);
    setActiveLoanDetailsId(editingLoanId);
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
  const editingLoan = loans.find((loan) => loan.id === editingLoanId) || null;

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

  const formatBackupFileName = () => {
    const dateText = new Date().toISOString().slice(0, 10);
    return `dena_${dateText}_backup.json`;
  };

  const toBase64 = (value) => {
    const bytes = new TextEncoder().encode(value);
    let binary = '';
    bytes.forEach((byte) => {
      binary += String.fromCharCode(byte);
    });
    return btoa(binary);
  };

  const handleBackup = async () => {
    try {
      const backupFileName = formatBackupFileName();
      const backupPayload = {
        app: 'Dena',
        version: 1,
        createdAt: new Date().toISOString(),
        loans,
      };
      const backupJson = JSON.stringify(backupPayload, null, 2);

      if (Capacitor.isNativePlatform()) {
        await Filesystem.writeFile({
          path: `Dena/${backupFileName}`,
          data: toBase64(backupJson),
          directory: Directory.Documents,
          recursive: true,
        });
        setSettingsStatus(`ব্যাকআপ সম্পন্ন: Documents/Dena/${backupFileName}`);
        return;
      }

      const blob = new Blob([backupJson], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = backupFileName;
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      URL.revokeObjectURL(url);
      setSettingsStatus(`ব্যাকআপ ডাউনলোড হয়েছে: ${backupFileName}`);
    } catch (error) {
      console.error('Backup failed:', error);
      setSettingsStatus('ব্যাকআপ করা যায়নি। আবার চেষ্টা করুন।');
    }
  };

  const parseRestoreContent = (content) => {
    const parsed = JSON.parse(content);
    if (Array.isArray(parsed)) return parsed;
    if (Array.isArray(parsed?.loans)) return parsed.loans;
    throw new Error('অকার্যকর ব্যাকআপ ফরম্যাট');
  };

  const handleRestoreFilePick = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    try {
      const text = await file.text();
      const restoredLoans = parseRestoreContent(text);
      setPendingRestoreLoans(restoredLoans);
      setPendingRestoreFileName(file.name);
    } catch (error) {
      console.error('Restore failed:', error);
      setSettingsStatus('ব্যাকআপ ফিরিয়ে আনা যায়নি। সঠিক ব্যাকআপ ফাইল দিন।');
    }
  };

  const handleRestoreConfirm = () => {
    if (!pendingRestoreLoans) return;
    saveLoans(pendingRestoreLoans);
    setLoans(getLoans());
    setActiveLoanDetailsId(null);
    setEditingLoanId(null);
    setActivePaymentModal({ show: false, loan: null, isSettle: false });
    setActiveDeleteModal({ show: false, loan: null });
    setPendingRestoreLoans(null);
    setPendingRestoreFileName('');
    setSettingsStatus(`ব্যাকআপ ফিরিয়ে আনা সম্পন্ন: ${pendingRestoreFileName}`);
  };

  const handleRestoreCancel = () => {
    setPendingRestoreLoans(null);
    setPendingRestoreFileName('');
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

      <section className="settings-section" aria-label="সেটিংস খোলার অংশ">
        <button
          type="button"
          className="btn btn-secondary w-full settings-toggle-btn"
          onClick={() => setIsSettingsOpen(true)}
        >
          সেটিংস
        </button>
      </section>

      <footer className="w-full text-center" style={{ marginTop: 'auto', paddingTop: '2rem', paddingBottom: '1rem', borderTop: '1px solid var(--border-subtle)' }}>
        <p className="text-xs text-muted">© ২০২৬ হিসাব রক্ষক - আপনার লোন ও সুদের বিশ্বস্ত হিসাবসাথী। নির্মাতা: সুজিৎ বিশ্বাস</p>
      </footer>

      {isAddingLoan && (
        <AddLoanForm 
          onSave={handleAddLoanSave}
          onCancel={() => setIsAddingLoan(false)}
        />
      )}

      {editingLoan && (
        <AddLoanForm
          mode="edit"
          initialLoan={editingLoan}
          onSave={handleEditLoanSave}
          onCancel={() => setEditingLoanId(null)}
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
          onEdit={(loan) => {
            setActiveLoanDetailsId(null);
            setEditingLoanId(loan.id);
          }}
          onClose={() => setActiveLoanDetailsId(null)}
        />
      )}

      {isSettingsOpen && (
        <div className="modal-overlay" onClick={() => setIsSettingsOpen(false)}>
          <div
            className="modal-content settings-modal-content"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-6 flex justify-between items-center">
              <h2 className="text-2xl font-bold text-brand-gradient">সেটিংস</h2>
              <button
                type="button"
                onClick={() => setIsSettingsOpen(false)}
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

            <div className="settings-actions-wrap">
              <button
                type="button"
                className="btn btn-primary settings-action-btn"
                onClick={handleBackup}
              >
                ব্যাকআপ নিন
              </button>
              <button
                type="button"
                className="btn btn-secondary settings-action-btn"
                onClick={() => restoreFileInputRef.current?.click()}
              >
                ব্যাকআপ ফিরিয়ে আনুন
              </button>
            </div>

            <input
              ref={restoreFileInputRef}
              type="file"
              accept="application/json,.json"
              onChange={handleRestoreFilePick}
              style={{ display: 'none' }}
            />

            {settingsStatus && (
              <p className="text-xs text-muted settings-status-text">{settingsStatus}</p>
            )}
          </div>
        </div>
      )}

      {pendingRestoreLoans && (
        <div className="modal-overlay" onClick={handleRestoreCancel}>
          <div className="modal-content restore-confirm-modal" onClick={(event) => event.stopPropagation()}>
            <h2 className="text-xl font-bold text-brand-gradient mb-4">ব্যাকআপ নিশ্চিত করুন</h2>
            <p className="text-sm text-secondary restore-confirm-text">
              ব্যাকআপ ফিরিয়ে আনলে বর্তমান সব হিসাব বদলে যাবে। আপনি কি চালিয়ে যেতে চান?
            </p>
            {pendingRestoreFileName && (
              <p className="text-xs text-muted restore-file-name">ফাইল: {pendingRestoreFileName}</p>
            )}
            <div className="flex gap-3 mt-6 mobile-btn-stack">
              <button type="button" className="btn btn-secondary" onClick={handleRestoreCancel}>
                বাতিল
              </button>
              <button type="button" className="btn btn-primary" onClick={handleRestoreConfirm}>
                নিশ্চিত করুন
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
