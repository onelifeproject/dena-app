import { useState, useEffect, useRef } from 'react';
import { Capacitor } from '@capacitor/core';
import { App as CapacitorApp } from '@capacitor/app';
import { StatusBar, Style } from '@capacitor/status-bar';
import { AccessControl, NativeBiometric } from '@capgo/capacitor-native-biometric';
import Dashboard from './components/Dashboard';
import AddLoanForm from './components/AddLoanForm';
import PaymentModal from './components/PaymentModal';
import DeleteModal from './components/DeleteModal';
import LoanDetailsModal from './components/LoanDetailsModal';
import LiveClock from './components/LiveClock';
import NotificationDebugPanel from './components/NotificationDebugPanel';
import SecuritySettingsModal from './components/SecuritySettingsModal';
import LockScreen from './components/LockScreen';
import { getLoans, addLoan, collectPayment, deleteLoan, saveLoans } from './utils/loanManager';
import {
  clearSessionPin,
  createOrResetPin,
  getSecuritySettings,
  getSessionPin,
  hasUnlockedSession,
  migrateLegacyLoansToEncrypted,
  setSessionPin,
  updateSecurityPreferences,
  verifyPin,
} from './utils/securityManager';
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

const MAX_PIN_ATTEMPTS = 5;
const PIN_COOLDOWN_SECONDS = 30;
const BIOMETRIC_SERVER_KEY = 'com.dena.app.lock-pin';

const resolveInitialSecurityState = () => {
  const settings = getSecuritySettings();
  const pinReady = Boolean(settings.pinSalt && settings.pinHash);
  const unlocked = hasUnlockedSession();
  const locked = settings.lockEnabled && (!pinReady || !unlocked);
  const pinSetupMode = settings.lockEnabled && !pinReady;
  return { settings, locked, pinSetupMode };
};

export default function App() {
  const initialSecurity = resolveInitialSecurityState();
  const [loans, setLoans] = useState(() => {
    if (initialSecurity.locked) return [];
    try {
      return getLoans();
    } catch {
      return [];
    }
  });
  const [isAddingLoan, setIsAddingLoan] = useState(false);
  const [activePaymentModal, setActivePaymentModal] = useState({ show: false, loan: null, isSettle: false });
  const [activeDeleteModal, setActiveDeleteModal] = useState({ show: false, loan: null });
  const [activeLoanDetailsId, setActiveLoanDetailsId] = useState(null);
  const [securitySettings, setSecuritySettings] = useState(initialSecurity.settings);
  const [isLocked, setIsLocked] = useState(initialSecurity.locked);
  const [isPinSetupMode, setIsPinSetupMode] = useState(initialSecurity.pinSetupMode);
  const [lockError, setLockError] = useState('');
  const [failedPinAttempts, setFailedPinAttempts] = useState(0);
  const [cooldownUntil, setCooldownUntil] = useState(null);
  const [cooldownRemaining, setCooldownRemaining] = useState(0);
  const [isSecurityModalOpen, setIsSecurityModalOpen] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [showNotificationDebug, setShowNotificationDebug] = useState(false);
  const [logoTapCount, setLogoTapCount] = useState(0);
  const appBackgroundedAtRef = useRef(null);
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

  const closeTransientUi = () => {
    setIsAddingLoan(false);
    setActivePaymentModal({ show: false, loan: null, isSettle: false });
    setActiveDeleteModal({ show: false, loan: null });
    setActiveLoanDetailsId(null);
  };

  const loadLoansFromStorage = () => {
    try {
      const stored = getLoans();
      setLoans(stored);
    } catch (error) {
      console.error('Failed to load loans', error);
      setLoans([]);
    }
  };

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
    if (!cooldownUntil) return undefined;

    const updateCountdown = () => {
      const remaining = Math.max(0, Math.ceil((cooldownUntil - Date.now()) / 1000));
      setCooldownRemaining(remaining);
      if (remaining === 0) {
        setCooldownUntil(null);
        setFailedPinAttempts(0);
      }
    };

    updateCountdown();
    const timer = setInterval(updateCountdown, 1000);
    return () => clearInterval(timer);
  }, [cooldownUntil]);

  useEffect(() => {
    if (!Capacitor.isNativePlatform() || Capacitor.getPlatform() !== 'android') return undefined;
    const registerBackHandler = async () => {
      const listener = await CapacitorApp.addListener('backButton', ({ canGoBack }) => {
        if (isLocked) {
          CapacitorApp.exitApp();
          return;
        }

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

        if (isSecurityModalOpen) {
          setIsSecurityModalOpen(false);
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
  }, [isLocked, isSecurityModalOpen]);

  useEffect(() => {
    if (!securitySettings.lockEnabled || !securitySettings.lockOnResume || isLocked) return undefined;

    const handleForegroundCheck = () => {
      if (appBackgroundedAtRef.current === null) return;
      const elapsedSeconds = (Date.now() - appBackgroundedAtRef.current) / 1000;
      const grace = Number(securitySettings.resumeGraceSeconds || 0);
      if (elapsedSeconds >= grace) {
        closeTransientUi();
        clearSessionPin();
        setIsLocked(true);
        setLockError('');
      }
      appBackgroundedAtRef.current = null;
    };

    const visibilityListener = () => {
      if (document.hidden) {
        appBackgroundedAtRef.current = Date.now();
        return;
      }
      handleForegroundCheck();
    };

    document.addEventListener('visibilitychange', visibilityListener);

    let listenerHandle = null;
    if (Capacitor.isNativePlatform()) {
      CapacitorApp.addListener('appStateChange', ({ isActive }) => {
        if (!isActive) {
          appBackgroundedAtRef.current = Date.now();
          return;
        }
        handleForegroundCheck();
      }).then((listener) => {
        listenerHandle = listener;
      });
    }

    return () => {
      document.removeEventListener('visibilitychange', visibilityListener);
      if (listenerHandle) listenerHandle.remove();
    };
  }, [isLocked, securitySettings.lockEnabled, securitySettings.lockOnResume, securitySettings.resumeGraceSeconds]);

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

  const savePinForBiometricUnlock = async (pin) => {
    if (!Capacitor.isNativePlatform()) return;
    const availability = await NativeBiometric.isAvailable();
    if (!availability.isAvailable) {
      throw new Error('Biometric authentication is unavailable on this device.');
    }
    await NativeBiometric.setCredentials({
      username: 'lock_pin',
      password: pin,
      server: BIOMETRIC_SERVER_KEY,
      accessControl: AccessControl.BIOMETRY_ANY,
    });
  };

  const clearBiometricCredential = async () => {
    if (!Capacitor.isNativePlatform()) return;
    try {
      await NativeBiometric.deleteCredentials({ server: BIOMETRIC_SERVER_KEY });
    } catch {
      // Ignore delete errors when credentials do not exist.
    }
  };

  const unlockWithVerifiedPin = (pin) => {
    setSessionPin(pin);
    setLockError('');
    setFailedPinAttempts(0);
    setCooldownUntil(null);
    setCooldownRemaining(0);
    setIsLocked(false);
    loadLoansFromStorage();
  };

  const handleBiometricUnlock = async () => {
    if (!securitySettings.biometricEnabled) {
      setLockError('বায়োমেট্রিক আনলক সেটিংস থেকে চালু করুন।');
      return;
    }
    if (!Capacitor.isNativePlatform()) {
      setLockError('বায়োমেট্রিক আনলক শুধুমাত্র মোবাইল অ্যাপে কাজ করবে।');
      return;
    }

    try {
      const availability = await NativeBiometric.isAvailable();
      if (!availability.isAvailable) {
        setLockError('এই ডিভাইসে বায়োমেট্রিক পাওয়া যায়নি।');
        return;
      }

      const credentials = await NativeBiometric.getSecureCredentials({
        server: BIOMETRIC_SERVER_KEY,
        reason: 'হিসাব রক্ষক আনলক করতে যাচাই করুন',
        title: 'বায়োমেট্রিক আনলক',
        subtitle: 'আপনার পরিচয় নিশ্চিত করুন',
        description: 'ডেটা অ্যাক্সেসের আগে ভেরিফিকেশন লাগবে',
        negativeButtonText: 'বাতিল',
      });

      if (!credentials?.password || !verifyPin(credentials.password)) {
        setLockError('সেভ করা বায়োমেট্রিক PIN আর বৈধ নেই, নতুন করে PIN সেট করুন।');
        return;
      }

      unlockWithVerifiedPin(credentials.password);
    } catch (error) {
      console.error('Biometric unlock failed', error);
      setLockError('বায়োমেট্রিক যাচাই বাতিল/ব্যর্থ হয়েছে।');
    }
  };

  const handleUnlock = (pin) => {
    if (cooldownRemaining > 0) {
      setLockError(`অনেকবার ভুল হয়েছে। ${cooldownRemaining} সেকেন্ড পরে আবার চেষ্টা করুন।`);
      return;
    }

    try {
      const isValid = verifyPin(pin);
      if (!isValid) {
        const nextAttempts = failedPinAttempts + 1;
        const remaining = Math.max(0, MAX_PIN_ATTEMPTS - nextAttempts);
        if (remaining === 0) {
          setCooldownUntil(Date.now() + PIN_COOLDOWN_SECONDS * 1000);
          setFailedPinAttempts(nextAttempts);
          setLockError(`অনেকবার ভুল হয়েছে। ${PIN_COOLDOWN_SECONDS} সেকেন্ড অপেক্ষা করুন।`);
          return;
        }
        setFailedPinAttempts(nextAttempts);
        setLockError(`পিন সঠিক নয়। আরও ${remaining} বার চেষ্টা করতে পারবেন।`);
        return;
      }
      unlockWithVerifiedPin(pin);
      if (securitySettings.biometricEnabled) {
        savePinForBiometricUnlock(pin).catch((error) => {
          console.error('Biometric credential refresh failed', error);
        });
      }
    } catch (error) {
      console.error('Unlock failed', error);
      setLockError('আনলক করতে সমস্যা হয়েছে।');
    }
  };

  const handleCreatePin = (pin) => {
    try {
      createOrResetPin(pin);
      migrateLegacyLoansToEncrypted();
      const latest = getSecuritySettings();
      setSecuritySettings(latest);
      if (latest.biometricEnabled) {
        savePinForBiometricUnlock(pin).catch((error) => {
          console.error('Saving biometric credential failed', error);
          setLockError('PIN সেট হয়েছে, কিন্তু বায়োমেট্রিক সক্রিয় করা যায়নি।');
        });
      }
      setIsPinSetupMode(false);
      unlockWithVerifiedPin(pin);
    } catch (error) {
      console.error('Create PIN failed', error);
      setLockError('পিন সেট করতে সমস্যা হয়েছে।');
    }
  };

  const handleSetPinFromSettings = async (pin) => {
    createOrResetPin(pin);
    migrateLegacyLoansToEncrypted();
    const latest = getSecuritySettings();
    setSecuritySettings(latest);
    if (latest.biometricEnabled) {
      await savePinForBiometricUnlock(pin);
    }
    loadLoansFromStorage();
  };

  const handleSaveSecurityPreferences = async (changes) => {
    if (changes.biometricEnabled && !Capacitor.isNativePlatform()) {
      throw new Error('Biometric unlock requires native platform.');
    }

    const next = updateSecurityPreferences(changes);
    setSecuritySettings(next);
    try {
      saveLoans(loans);
    } catch (error) {
      console.error('Failed to remap storage format', error);
    }
    if (next.lockEnabled && !hasUnlockedSession()) {
      setIsLocked(true);
      setIsPinSetupMode(!(next.pinHash && next.pinSalt));
      return;
    }
    if (next.biometricEnabled) {
      const sessionPin = getSessionPin();
      if (sessionPin) {
        await savePinForBiometricUnlock(sessionPin);
      }
    } else {
      await clearBiometricCredential();
    }
    if (!next.lockEnabled) {
      clearSessionPin();
      setIsLocked(false);
      setIsPinSetupMode(false);
    }
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

  if (isLocked) {
    return (
      <LockScreen
        isPinSetupMode={isPinSetupMode}
        onUnlock={handleUnlock}
        onCreatePin={handleCreatePin}
        onBiometricUnlock={handleBiometricUnlock}
        error={lockError}
        lockOnResume={securitySettings.lockOnResume}
        resumeGraceSeconds={securitySettings.resumeGraceSeconds}
        biometricEnabled={securitySettings.biometricEnabled && Capacitor.isNativePlatform()}
        failedAttempts={failedPinAttempts}
        maxAttempts={MAX_PIN_ATTEMPTS}
        cooldownRemaining={cooldownRemaining}
      />
    );
  }

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
          onOpenSecurity={() => setIsSecurityModalOpen(true)}
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

      {isSecurityModalOpen && (
        <SecuritySettingsModal
          isOpen={isSecurityModalOpen}
          settings={securitySettings}
          onClose={() => setIsSecurityModalOpen(false)}
          onSavePreferences={handleSaveSecurityPreferences}
          onSetPin={handleSetPinFromSettings}
        />
      )}

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
