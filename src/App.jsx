import { useState, useEffect, useRef, useCallback, lazy, Suspense } from 'react';
import { Capacitor } from '@capacitor/core';
import { App as CapacitorApp } from '@capacitor/app';
import { Directory, Filesystem } from '@capacitor/filesystem';
import { StatusBar, Style } from '@capacitor/status-bar';
import Dashboard from './components/Dashboard';
import PaymentModal from './components/PaymentModal';
import DeleteModal from './components/DeleteModal';
import LiveClock from './components/LiveClock';
import NotificationDebugPanel from './components/NotificationDebugPanel';
import {
  getLoans,
  saveLoans,
  addLoan,
  updateLoan,
  collectPayment,
  deleteLoan,
  getProfitIntervalDays,
  saveProfitIntervalDays,
  applyProfitIntervalToActiveLoans,
  getProfitPreset,
  saveProfitPreset,
  getAutoBackupConfig,
  saveAutoBackupConfig,
  getLastAutoBackupAt,
  saveLastAutoBackupAt,
} from './utils/loanManager';
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

const FIRST_RUN_SETTINGS_KEY = 'usuryFirstRunSettingsShown';
const DASHBOARD_FILTERS_KEY = 'usuryDashboardFilters';
const LAST_MANUAL_BACKUP_AT_KEY = 'usuryLastManualBackupAt';
const AUTO_BACKUP_SOURCE_PATH = 'Dena/auto-backup-source.json';
const AUTO_BACKUP_META_PATH = 'Dena/auto-backup-meta.json';
const AddLoanForm = lazy(() => import('./components/AddLoanForm'));
const LoanDetailsModal = lazy(() => import('./components/LoanDetailsModal'));

const normalizeDashboardFilters = (value) => {
  const currentDate = new Date();
  const parsedYear = Number.parseInt(value?.selectedYear, 10);
  const parsedMonth = Number.parseInt(value?.selectedMonth, 10);
  const activeTab = value?.activeTab === 'DONE' ? 'DONE' : 'ACTIVE';
  const selectedYear = Number.isNaN(parsedYear) ? currentDate.getFullYear() : parsedYear;
  const selectedMonth = Number.isNaN(parsedMonth)
    ? currentDate.getMonth()
    : Math.min(11, Math.max(0, parsedMonth));

  return { activeTab, selectedYear, selectedMonth };
};

const getDashboardFilters = () => {
  const raw = localStorage.getItem(DASHBOARD_FILTERS_KEY);
  if (!raw) return normalizeDashboardFilters({});
  try {
    return normalizeDashboardFilters(JSON.parse(raw));
  } catch {
    return normalizeDashboardFilters({});
  }
};

export default function App() {
  const copyrightStartYear = 2026;
  const currentYear = new Date().getFullYear();
  const footerYearText = currentYear > copyrightStartYear
    ? `${copyrightStartYear.toLocaleString('bn-BD', { useGrouping: false })}–${currentYear.toLocaleString('bn-BD', { useGrouping: false })}`
    : copyrightStartYear.toLocaleString('bn-BD', { useGrouping: false });

  const [loans, setLoans] = useState(() => getLoans());
  const [dashboardFilters, setDashboardFilters] = useState(() => getDashboardFilters());
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isSettingsTestOpen, setIsSettingsTestOpen] = useState(false);
  const [profitIntervalDraft, setProfitIntervalDraft] = useState(() => String(getProfitIntervalDays()));
  const [profitPreset, setProfitPreset] = useState(() => getProfitPreset());
  const [profitPresetDraft, setProfitPresetDraft] = useState(() => {
    const preset = getProfitPreset();
    return {
      principal: String(preset.principal),
      interest: String(preset.interest),
    };
  });
  const [settingsStatus, setSettingsStatus] = useState('');
  const [autoProfitSavedText, setAutoProfitSavedText] = useState('');
  const [autoBackupConfig, setAutoBackupConfig] = useState(() => getAutoBackupConfig());
  const [autoBackupIntervalDraft, setAutoBackupIntervalDraft] = useState(() => String(getAutoBackupConfig().intervalDays));
  const [lastAutoBackupAt, setLastAutoBackupAt] = useState(() => getLastAutoBackupAt());
  const [lastManualBackupAt, setLastManualBackupAt] = useState(() => localStorage.getItem(LAST_MANUAL_BACKUP_AT_KEY) || '');
  const [pendingRestoreLoans, setPendingRestoreLoans] = useState(null);
  const [pendingRestoreProfitIntervalDays, setPendingRestoreProfitIntervalDays] = useState(null);
  const [pendingRestoreProfitPreset, setPendingRestoreProfitPreset] = useState(null);
  const [pendingRestoreAutoBackupConfig, setPendingRestoreAutoBackupConfig] = useState(null);
  const [pendingRestoreDashboardFilters, setPendingRestoreDashboardFilters] = useState(null);
  const [pendingRestoreFirstRunSettingsShown, setPendingRestoreFirstRunSettingsShown] = useState(null);
  const [pendingRestoreLastAutoBackupAt, setPendingRestoreLastAutoBackupAt] = useState(null);
  const [pendingRestoreLastManualBackupAt, setPendingRestoreLastManualBackupAt] = useState(null);
  const [pendingRestoreFileName, setPendingRestoreFileName] = useState('');
  const [isAddingLoan, setIsAddingLoan] = useState(false);
  const [editingLoanId, setEditingLoanId] = useState(null);
  const [activePaymentModal, setActivePaymentModal] = useState({ show: false, loan: null, isSettle: false });
  const [activeDeleteModal, setActiveDeleteModal] = useState({ show: false, loan: null });
  const [activeLoanDetailsId, setActiveLoanDetailsId] = useState(null);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const restoreFileInputRef = useRef(null);
  const isSettingsOpenRef = useRef(isSettingsOpen);
  const pendingRestoreLoansRef = useRef(pendingRestoreLoans);
  const isAddingLoanRef = useRef(isAddingLoan);
  const isEditingLoanRef = useRef(Boolean(editingLoanId));
  const isPaymentModalOpenRef = useRef(activePaymentModal.show);
  const isDeleteModalOpenRef = useRef(activeDeleteModal.show);
  const activeLoanDetailsIdRef = useRef(activeLoanDetailsId);
  const isAutoBackupRunningRef = useRef(false);

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
    const hasShownFirstRunSettings = localStorage.getItem(FIRST_RUN_SETTINGS_KEY);
    if (hasShownFirstRunSettings) return;

    setIsSettingsOpen(true);
    localStorage.setItem(FIRST_RUN_SETTINGS_KEY, '1');
    setSettingsStatus('প্রথমবার ব্যবহার: অটো মুনাফা ও ব্যাকআপ সেটিংস একবার দেখে নিন।');
  }, []);

  useEffect(() => {
    if (!notificationsEnabled) return;
    syncLoanNotifications(loans);
  }, [loans, notificationsEnabled]);

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
          setIsSettingsTestOpen(false);
          return;
        }

        if (pendingRestoreLoansRef.current) {
          setPendingRestoreLoans(null);
          setPendingRestoreProfitIntervalDays(null);
          setPendingRestoreProfitPreset(null);
          setPendingRestoreAutoBackupConfig(null);
          setPendingRestoreDashboardFilters(null);
          setPendingRestoreFirstRunSettingsShown(null);
          setPendingRestoreLastAutoBackupAt(null);
          setPendingRestoreLastManualBackupAt(null);
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

  const handleDashboardFiltersChange = useCallback((nextFilters) => {
    const normalized = normalizeDashboardFilters(nextFilters);
    setDashboardFilters(normalized);
    localStorage.setItem(DASHBOARD_FILTERS_KEY, JSON.stringify(normalized));
  }, []);

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

  const formatBackupFileName = (includeTime = false) => {
    const now = new Date();
    const dateText = now.toISOString().slice(0, 10);
    if (!includeTime) return `dena_${dateText}_backup.json`;
    const timeText = now
      .toISOString()
      .slice(11, 19)
      .replace(/:/g, '-');
    return `dena_${dateText}_${timeText}_backup.json`;
  };

  const toBase64 = (value) => {
    const bytes = new TextEncoder().encode(value);
    let binary = '';
    bytes.forEach((byte) => {
      binary += String.fromCharCode(byte);
    });
    return btoa(binary);
  };

  const buildBackupPayload = useCallback(() => ({
    app: 'Dena',
    version: 1,
    createdAt: new Date().toISOString(),
    profitIntervalDays: getProfitIntervalDays(),
    profitPreset: getProfitPreset(),
    autoBackupConfig: getAutoBackupConfig(),
    lastAutoBackupAt: getLastAutoBackupAt(),
    lastManualBackupAt: localStorage.getItem(LAST_MANUAL_BACKUP_AT_KEY) || '',
    firstRunSettingsShown: localStorage.getItem(FIRST_RUN_SETTINGS_KEY) === '1',
    dashboardFilters,
    loans,
  }), [dashboardFilters, loans]);

  const runBackup = useCallback(async ({ isAuto = false } = {}) => {
    try {
      const backupFileName = formatBackupFileName(isAuto);
      const backupPayload = buildBackupPayload();
      const backupJson = JSON.stringify(backupPayload, null, 2);

      if (isAuto && !Capacitor.isNativePlatform()) {
        localStorage.setItem('usuryAutoBackupSnapshot', backupJson);
        const backupTime = saveLastAutoBackupAt();
        setLastAutoBackupAt(backupTime);
        setSettingsStatus(`অটো ব্যাকআপ সম্পন্ন (লোকাল কপি): ${new Date(backupTime).toLocaleString('bn-BD')}`);
        return;
      }

      if (Capacitor.isNativePlatform()) {
        await Filesystem.writeFile({
          path: `Dena/${backupFileName}`,
          data: toBase64(backupJson),
          directory: Directory.Documents,
          recursive: true,
        });
        const backupTime = new Date().toISOString();
        if (isAuto) {
          const autoBackupTime = saveLastAutoBackupAt(backupTime);
          setLastAutoBackupAt(autoBackupTime);
        } else {
          localStorage.setItem(LAST_MANUAL_BACKUP_AT_KEY, backupTime);
          setLastManualBackupAt(backupTime);
        }
        setSettingsStatus(`${isAuto ? 'অটো ব্যাকআপ' : 'ব্যাকআপ'} সম্পন্ন: Documents/Dena/${backupFileName}`);
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
      const backupTime = new Date().toISOString();
      if (isAuto) {
        const autoBackupTime = saveLastAutoBackupAt(backupTime);
        setLastAutoBackupAt(autoBackupTime);
      } else {
        localStorage.setItem(LAST_MANUAL_BACKUP_AT_KEY, backupTime);
        setLastManualBackupAt(backupTime);
      }
      setSettingsStatus(`${isAuto ? 'অটো ব্যাকআপ' : 'ব্যাকআপ'} ডাউনলোড হয়েছে: ${backupFileName}`);
    } catch (error) {
      console.error('Backup failed:', error);
      setSettingsStatus(`${isAuto ? 'অটো ব্যাকআপ' : 'ব্যাকআপ'} করা যায়নি। আবার চেষ্টা করুন।`);
    }
  }, [buildBackupPayload]);

  const handleBackup = async () => runBackup({ isAuto: false });

  const parseRestoreContent = (content) => {
    const parsed = JSON.parse(content);
    if (Array.isArray(parsed)) {
      return {
        loans: parsed,
        profitIntervalDays: null,
        profitPreset: null,
        autoBackupConfig: null,
        dashboardFilters: null,
        firstRunSettingsShown: null,
        lastAutoBackupAt: null,
        lastManualBackupAt: null,
      };
    }
    if (Array.isArray(parsed?.loans)) {
      return {
        loans: parsed.loans,
        profitIntervalDays: parsed.profitIntervalDays ?? null,
        profitPreset: parsed.profitPreset ?? null,
        autoBackupConfig: parsed.autoBackupConfig ?? null,
        dashboardFilters: parsed.dashboardFilters ?? null,
        firstRunSettingsShown: parsed.firstRunSettingsShown ?? null,
        lastAutoBackupAt: parsed.lastAutoBackupAt ?? null,
        lastManualBackupAt: parsed.lastManualBackupAt ?? null,
      };
    }
    throw new Error('অকার্যকর ব্যাকআপ ফরম্যাট');
  };

  const handleRestoreFilePick = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    try {
      const text = await file.text();
      const restoredData = parseRestoreContent(text);
      setPendingRestoreLoans(restoredData.loans);
      setPendingRestoreProfitIntervalDays(restoredData.profitIntervalDays);
      setPendingRestoreProfitPreset(restoredData.profitPreset);
      setPendingRestoreAutoBackupConfig(restoredData.autoBackupConfig);
      setPendingRestoreDashboardFilters(restoredData.dashboardFilters);
      setPendingRestoreFirstRunSettingsShown(restoredData.firstRunSettingsShown);
      setPendingRestoreLastAutoBackupAt(restoredData.lastAutoBackupAt);
      setPendingRestoreLastManualBackupAt(restoredData.lastManualBackupAt);
      setPendingRestoreFileName(file.name);
    } catch (error) {
      console.error('Restore failed:', error);
      setSettingsStatus('ব্যাকআপ ফিরিয়ে আনা যায়নি। সঠিক ব্যাকআপ ফাইল দিন।');
    }
  };

  const handleRestoreConfirm = () => {
    if (!pendingRestoreLoans) return;
    saveLoans(pendingRestoreLoans);
    if (pendingRestoreProfitIntervalDays !== null && pendingRestoreProfitIntervalDays !== undefined) {
      const appliedDays = saveProfitIntervalDays(pendingRestoreProfitIntervalDays);
      setProfitIntervalDraft(String(appliedDays));
    }
    if (pendingRestoreProfitPreset) {
      const appliedPreset = saveProfitPreset(pendingRestoreProfitPreset);
      setProfitPreset(appliedPreset);
      setProfitPresetDraft({
        principal: String(appliedPreset.principal),
        interest: String(appliedPreset.interest),
      });
    }
    if (pendingRestoreAutoBackupConfig) {
      const appliedAutoBackupConfig = saveAutoBackupConfig(pendingRestoreAutoBackupConfig);
      setAutoBackupConfig(appliedAutoBackupConfig);
      setAutoBackupIntervalDraft(String(appliedAutoBackupConfig.intervalDays));
    }
    if (pendingRestoreDashboardFilters) {
      const normalizedFilters = normalizeDashboardFilters(pendingRestoreDashboardFilters);
      setDashboardFilters(normalizedFilters);
      localStorage.setItem(DASHBOARD_FILTERS_KEY, JSON.stringify(normalizedFilters));
    }
    if (pendingRestoreFirstRunSettingsShown !== null && pendingRestoreFirstRunSettingsShown !== undefined) {
      if (pendingRestoreFirstRunSettingsShown) {
        localStorage.setItem(FIRST_RUN_SETTINGS_KEY, '1');
      } else {
        localStorage.removeItem(FIRST_RUN_SETTINGS_KEY);
      }
    }
    if (pendingRestoreLastAutoBackupAt) {
      const restoredBackupAt = saveLastAutoBackupAt(pendingRestoreLastAutoBackupAt);
      setLastAutoBackupAt(restoredBackupAt);
    }
    if (pendingRestoreLastManualBackupAt) {
      localStorage.setItem(LAST_MANUAL_BACKUP_AT_KEY, pendingRestoreLastManualBackupAt);
      setLastManualBackupAt(pendingRestoreLastManualBackupAt);
    }
    setLoans(getLoans());
    setActiveLoanDetailsId(null);
    setEditingLoanId(null);
    setActivePaymentModal({ show: false, loan: null, isSettle: false });
    setActiveDeleteModal({ show: false, loan: null });
    setPendingRestoreLoans(null);
    setPendingRestoreProfitIntervalDays(null);
    setPendingRestoreProfitPreset(null);
    setPendingRestoreAutoBackupConfig(null);
    setPendingRestoreDashboardFilters(null);
    setPendingRestoreFirstRunSettingsShown(null);
    setPendingRestoreLastAutoBackupAt(null);
    setPendingRestoreLastManualBackupAt(null);
    setPendingRestoreFileName('');
    setSettingsStatus(`ব্যাকআপ ফিরিয়ে আনা সম্পন্ন: ${pendingRestoreFileName}`);
  };

  const handleRestoreCancel = () => {
    setPendingRestoreLoans(null);
    setPendingRestoreProfitIntervalDays(null);
    setPendingRestoreProfitPreset(null);
    setPendingRestoreAutoBackupConfig(null);
    setPendingRestoreDashboardFilters(null);
    setPendingRestoreFirstRunSettingsShown(null);
    setPendingRestoreLastAutoBackupAt(null);
    setPendingRestoreLastManualBackupAt(null);
    setPendingRestoreFileName('');
  };

  const handleSaveAutoProfitSettings = () => {
    const appliedPreset = saveProfitPreset({
      principal: profitPresetDraft.principal,
      interest: profitPresetDraft.interest,
    });
    const { intervalDays, loans: updatedLoans } = applyProfitIntervalToActiveLoans(profitIntervalDraft);
    setLoans(updatedLoans);
    setProfitIntervalDraft(String(intervalDays));
    setProfitPreset(appliedPreset);
    setProfitPresetDraft({
      principal: String(appliedPreset.principal),
      interest: String(appliedPreset.interest),
    });
    setAutoProfitSavedText(
      `সংরক্ষিত সেটিংস: ${appliedPreset.principal.toLocaleString('bn-BD')} টাকায় ${appliedPreset.interest.toLocaleString('bn-BD')} টাকা মুনাফা, ব্যবধান ${intervalDays.toLocaleString('bn-BD')} দিন।`
    );
    setSettingsStatus(
      `অটো মুনাফা সেটিংস সংরক্ষণ হয়েছে: ${appliedPreset.principal.toLocaleString('bn-BD')} টাকায় ${appliedPreset.interest.toLocaleString('bn-BD')} টাকা মুনাফা, ব্যবধান ${intervalDays.toLocaleString('bn-BD')} দিন। এটি নতুন ও চলতি উভয় হিসাবেই প্রযোজ্য।`
    );
  };

  const handleSetAutoBackupEnabled = (enabled) => {
    const applied = saveAutoBackupConfig({ enabled, intervalDays: autoBackupIntervalDraft });
    setAutoBackupConfig(applied);
    setAutoBackupIntervalDraft(String(applied.intervalDays));
    setSettingsStatus(
      enabled
        ? `অটো ব্যাকআপ চালু হয়েছে (${applied.intervalDays.toLocaleString('bn-BD')} দিন পরপর)।`
        : 'অটো ব্যাকআপ বন্ধ করা হয়েছে।'
    );
  };

  const handleSaveAutoBackupInterval = () => {
    const applied = saveAutoBackupConfig({
      enabled: autoBackupConfig.enabled,
      intervalDays: autoBackupIntervalDraft,
    });
    setAutoBackupConfig(applied);
    setAutoBackupIntervalDraft(String(applied.intervalDays));
    setSettingsStatus(`অটো ব্যাকআপ ব্যবধান সেট: ${applied.intervalDays.toLocaleString('bn-BD')} দিন।`);
  };

  useEffect(() => {
    if (!autoBackupConfig.enabled) return;

    const intervalMs = autoBackupConfig.intervalDays * 24 * 60 * 60 * 1000;
    const maybeRunAutoBackup = async () => {
      if (isAutoBackupRunningRef.current) return;
      const lastBackupAt = getLastAutoBackupAt();
      const lastTime = lastBackupAt ? new Date(lastBackupAt).getTime() : 0;
      const due = !lastTime || Number.isNaN(lastTime) || Date.now() - lastTime >= intervalMs;
      if (!due) return;

      isAutoBackupRunningRef.current = true;
      try {
        await runBackup({ isAuto: true });
      } finally {
        isAutoBackupRunningRef.current = false;
      }
    };

    maybeRunAutoBackup();
    const timerId = window.setInterval(maybeRunAutoBackup, 60 * 60 * 1000);
    return () => window.clearInterval(timerId);
  }, [autoBackupConfig.enabled, autoBackupConfig.intervalDays, runBackup]); // loans change হলে runBackup আপডেট হয়

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    const syncAutoBackupMirror = async () => {
      try {
        const backupJson = JSON.stringify(buildBackupPayload(), null, 2);
        const metaJson = JSON.stringify({
          enabled: autoBackupConfig.enabled,
          intervalDays: autoBackupConfig.intervalDays,
          lastBackupAt: getLastAutoBackupAt() || '',
          updatedAt: new Date().toISOString(),
        });

        await Filesystem.writeFile({
          path: AUTO_BACKUP_SOURCE_PATH,
          data: toBase64(backupJson),
          directory: Directory.Data,
          recursive: true,
        });
        await Filesystem.writeFile({
          path: AUTO_BACKUP_META_PATH,
          data: toBase64(metaJson),
          directory: Directory.Data,
          recursive: true,
        });
      } catch (error) {
        console.error('Auto backup mirror sync failed:', error);
      }
    };

    syncAutoBackupMirror();
  }, [autoBackupConfig.enabled, autoBackupConfig.intervalDays, buildBackupPayload, lastAutoBackupAt]);

  const closeSettingsModal = () => {
    setIsSettingsOpen(false);
    setIsSettingsTestOpen(false);
  };

  const modalLoadingFallback = (
    <div className="modal-overlay">
      <div className="modal-content">
        <p className="text-sm text-muted">লোড হচ্ছে...</p>
      </div>
    </div>
  );

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
          activeTab={dashboardFilters.activeTab}
          selectedYear={dashboardFilters.selectedYear}
          selectedMonth={dashboardFilters.selectedMonth}
          onFiltersChange={handleDashboardFiltersChange}
        />

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
        <p className="text-xs text-muted">© {footerYearText} হিসাব রক্ষক - আপনার লোন ও সুদের বিশ্বস্ত হিসাবসাথী। নির্মাতা: সুজিৎ বিশ্বাস</p>
      </footer>

      {isAddingLoan && (
        <Suspense fallback={modalLoadingFallback}>
          <AddLoanForm 
            onSave={handleAddLoanSave}
            onCancel={() => setIsAddingLoan(false)}
            profitPreset={profitPreset}
          />
        </Suspense>
      )}

      {editingLoan && (
        <Suspense fallback={modalLoadingFallback}>
          <AddLoanForm
            mode="edit"
            initialLoan={editingLoan}
            onSave={handleEditLoanSave}
            onCancel={() => setEditingLoanId(null)}
            profitPreset={profitPreset}
          />
        </Suspense>
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
        <Suspense fallback={modalLoadingFallback}>
          <LoanDetailsModal
            loan={activeLoanDetails}
            onEdit={(loan) => {
              setActiveLoanDetailsId(null);
              setEditingLoanId(loan.id);
            }}
            onClose={() => setActiveLoanDetailsId(null)}
          />
        </Suspense>
      )}

      {isSettingsOpen && (
        <div className="modal-overlay" onClick={closeSettingsModal}>
          <div
            className="modal-content settings-modal-content"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-6 flex justify-between items-center settings-modal-header">
              <h2 className="text-2xl font-bold text-brand-gradient">সেটিংস</h2>
              <button
                type="button"
                className="loan-details-close-btn"
                onClick={closeSettingsModal}
                aria-label="বন্ধ করুন"
              >
                &times;
              </button>
            </div>

            <div className="settings-actions-wrap">
              <div className="settings-interval-card settings-profit-card">
                <p className="text-sm font-semibold">অটো মুনাফা হিসাব</p>
                <p className="text-xs text-muted settings-interval-help">
                  ১) আসল টাকা, ২) মুনাফা, ৩) মুনাফা নেওয়ার ব্যবধান (দিন) - এই ৩টি ঘর ধারাবাহিকভাবে পূরণ করুন।
                </p>
                <div className="settings-profit-row">
                  <div className="settings-profit-input-wrap">
                    <label className="text-xs text-muted">আসল টাকা (৳)</label>
                    <input
                      type="number"
                      min="1"
                      className="form-input settings-interval-input"
                      value={profitPresetDraft.principal}
                      onChange={(event) =>
                        setProfitPresetDraft((prev) => ({
                          ...prev,
                          principal: event.target.value.replace(/[^\d]/g, ''),
                        }))
                      }
                    />
                  </div>
                  <div className="settings-profit-input-wrap">
                    <label className="text-xs text-muted">মুনাফা (৳)</label>
                    <input
                      type="number"
                      min="1"
                      className="form-input settings-interval-input"
                      value={profitPresetDraft.interest}
                      onChange={(event) =>
                        setProfitPresetDraft((prev) => ({
                          ...prev,
                          interest: event.target.value.replace(/[^\d]/g, ''),
                        }))
                      }
                    />
                  </div>
                  <div className="settings-profit-input-wrap">
                    <label className="text-xs text-muted">মুনাফা নেওয়ার ব্যবধান (দিন)</label>
                    <input
                      type="number"
                      min="1"
                      max="365"
                      className="form-input settings-interval-input"
                      value={profitIntervalDraft}
                      onChange={(event) => setProfitIntervalDraft(event.target.value.replace(/[^\d]/g, ''))}
                    />
                  </div>
                </div>
                <button
                  type="button"
                  className="btn btn-primary settings-interval-save-btn settings-auto-profit-save-btn"
                  onClick={handleSaveAutoProfitSettings}
                >
                  অটো মুনাফা সেটিংস সংরক্ষণ করুন
                </button>
                {autoProfitSavedText && (
                  <p className="text-xs settings-auto-profit-saved-note">{autoProfitSavedText}</p>
                )}
                <p className="text-xs text-muted settings-profit-preview">
                  এখনকার সেটিংস: {profitPreset.principal.toLocaleString('bn-BD')} টাকায় {profitPreset.interest.toLocaleString('bn-BD')} টাকা মুনাফা, ব্যবধান {Number(profitIntervalDraft || 0).toLocaleString('bn-BD')} দিন।
                </p>
                <p className="text-xs text-muted settings-interval-help">
                  উদাহরণ: ৫০০০ টাকায় ৫০০ মুনাফা, ব্যবধান ৭ দিন।
                </p>
              </div>

              <div className="settings-interval-card settings-tools-card">
                <p className="text-sm font-semibold">অটো ব্যাকআপ</p>
                <p className="text-xs text-muted settings-card-help">
                  নির্ধারিত দিন পরপর স্বয়ংক্রিয় ব্যাকআপ চালু/বন্ধ করুন।
                </p>
                <div className="settings-auto-backup-head">
                  <p className="text-sm font-semibold">অটো ব্যাকআপ স্ট্যাটাস</p>
                  <button
                    type="button"
                    className={`btn btn-sm ${autoBackupConfig.enabled ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={() => handleSetAutoBackupEnabled(!autoBackupConfig.enabled)}
                  >
                    {autoBackupConfig.enabled ? 'চালু আছে' : 'বন্ধ আছে'}
                  </button>
                </div>
                <p className="text-xs text-muted settings-card-help">
                  {lastAutoBackupAt
                    ? `সর্বশেষ ব্যাকআপ: ${new Date(lastAutoBackupAt).toLocaleString('bn-BD')}`
                    : 'এখনও কোনো অটো ব্যাকআপ হয়নি।'}
                </p>
                <div className="settings-auto-backup-custom">
                  <input
                    type="number"
                    min="1"
                    max="365"
                    className="form-input settings-interval-input"
                    value={autoBackupIntervalDraft}
                    onChange={(event) => setAutoBackupIntervalDraft(event.target.value.replace(/[^\d]/g, ''))}
                  />
                  <button
                    type="button"
                    className="btn btn-secondary settings-action-btn"
                    onClick={handleSaveAutoBackupInterval}
                  >
                    দিন সেট করুন
                  </button>
                </div>
                <p className="text-xs text-muted settings-card-help">
                  ডিফল্ট ১ দিন। চাইলে এখানে যেকোনো দিন সেট করতে পারবেন।
                </p>
              </div>

              <div className="settings-interval-card settings-tools-card">
                <p className="text-sm font-semibold">ম্যানুয়াল ব্যাকআপ</p>
                <p className="text-xs text-muted settings-card-help">
                  প্রয়োজন হলে এখনই পুরো অ্যাপের ব্যাকআপ ফাইল তৈরি করুন।
                </p>
                <p className="text-xs text-muted settings-card-help">
                  {lastManualBackupAt
                    ? `সর্বশেষ ম্যানুয়াল ব্যাকআপ: ${new Date(lastManualBackupAt).toLocaleString('bn-BD')}`
                    : 'এখনও কোনো ম্যানুয়াল ব্যাকআপ হয়নি।'}
                </p>
                <div className="settings-backup-actions">
                  <button
                    type="button"
                    className="btn btn-primary settings-action-btn"
                    onClick={handleBackup}
                  >
                    ব্যাকআপ নিন
                  </button>
                </div>
              </div>

              <div className="settings-interval-card settings-tools-card">
                <p className="text-sm font-semibold">রিস্টোর</p>
                <p className="text-xs text-muted settings-card-help">
                  ব্যাকআপ ফাইল থেকে আগের সব ডেটা পুনরুদ্ধার করুন।
                </p>
                <div className="settings-backup-actions">
                  <button
                    type="button"
                    className="btn btn-secondary settings-action-btn"
                    onClick={() => restoreFileInputRef.current?.click()}
                  >
                    ব্যাকআপ ফিরিয়ে আনুন
                  </button>
                </div>
              </div>

              <div className="settings-interval-card settings-tools-card">
                <p className="text-sm font-semibold">টেস্ট অপশন</p>
                <p className="text-xs text-muted settings-card-help">
                  নোটিফিকেশন টেস্ট ও ডিবাগ অপশন চালু/বন্ধ করুন।
                </p>
                <button
                  type="button"
                  className="btn btn-secondary settings-action-btn settings-test-toggle-btn"
                  onClick={() => setIsSettingsTestOpen((prev) => !prev)}
                >
                  {isSettingsTestOpen ? 'টেস্ট অপশন বন্ধ করুন' : 'টেস্ট অপশন খুলুন'}
                </button>
              </div>
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

            {isSettingsTestOpen && (
              <div className="settings-test-panel-wrap">
                <NotificationDebugPanel
                  loans={loans}
                  onRequestPermission={handleDebugPermissionCheck}
                  onResync={handleDebugResync}
                  onGetPending={handleDebugGetPending}
                  onSendTest={handleDebugTest}
                  onSendRealPreview={handleDebugRealPreview}
                  onClearAll={handleDebugClearAll}
                />
              </div>
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
