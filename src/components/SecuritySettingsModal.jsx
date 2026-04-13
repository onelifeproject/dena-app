import { useState } from 'react';

const RESUME_OPTIONS = [
  { value: 0, label: 'সাথে সাথে' },
  { value: 30, label: '৩০ সেকেন্ড' },
  { value: 60, label: '১ মিনিট' },
  { value: 300, label: '৫ মিনিট' },
];

export default function SecuritySettingsModal({
  isOpen,
  settings,
  onClose,
  onSavePreferences,
  onSetPin,
}) {
  const [lockEnabled, setLockEnabled] = useState(settings.lockEnabled);
  const [biometricEnabled, setBiometricEnabled] = useState(settings.biometricEnabled);
  const [lockOnResume, setLockOnResume] = useState(settings.lockOnResume);
  const [resumeGraceSeconds, setResumeGraceSeconds] = useState(settings.resumeGraceSeconds);
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  if (!isOpen) return null;

  const handleSave = async () => {
    try {
      await onSavePreferences({
        lockEnabled,
        biometricEnabled,
        lockOnResume,
        resumeGraceSeconds: Number(resumeGraceSeconds),
      });
      setSuccess('সিকিউরিটি সেটিংস আপডেট হয়েছে।');
      setError('');
    } catch {
      setError('সেটিংস সেভ করতে সমস্যা হয়েছে।');
      setSuccess('');
    }
  };

  const handlePinSave = async () => {
    if (!/^\d{4}$/.test(newPin)) {
      setError('পিন অবশ্যই ৪ ডিজিট হতে হবে।');
      return;
    }
    if (newPin !== confirmPin) {
      setError('দুটি পিন এক নয়।');
      return;
    }
    try {
      await onSetPin(newPin);
      setNewPin('');
      setConfirmPin('');
      setError('');
      setSuccess('পিন সফলভাবে সেট হয়েছে।');
    } catch {
      setError('পিন সেভ করতে সমস্যা হয়েছে।');
      setSuccess('');
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content security-modal" onClick={(event) => event.stopPropagation()}>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-brand-gradient">সিকিউরিটি সেটিংস</h2>
          <button type="button" className="btn btn-secondary btn-sm" onClick={onClose}>
            বন্ধ
          </button>
        </div>

        <div className="security-setting-list">
          <label className="security-setting-item">
            <span>অ্যাপ লক চালু</span>
            <input type="checkbox" checked={lockEnabled} onChange={(event) => setLockEnabled(event.target.checked)} />
          </label>

          <label className="security-setting-item">
            <span>রিজিউম করলে লক</span>
            <input
              type="checkbox"
              checked={lockOnResume}
              onChange={(event) => setLockOnResume(event.target.checked)}
              disabled={!lockEnabled}
            />
          </label>

          <label className="security-setting-item">
            <span>বায়োমেট্রিক আনলক (ফিঙ্গারপ্রিন্ট/ফেস)</span>
            <input
              type="checkbox"
              checked={biometricEnabled}
              onChange={(event) => setBiometricEnabled(event.target.checked)}
              disabled={!lockEnabled}
            />
          </label>

          <div className="security-setting-item security-setting-select">
            <span>রিজিউম গ্রেস টাইম</span>
            <select
              className="form-input"
              value={resumeGraceSeconds}
              onChange={(event) => setResumeGraceSeconds(Number(event.target.value))}
              disabled={!lockEnabled || !lockOnResume}
            >
              {RESUME_OPTIONS.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="security-pin-block">
          <h3 className="text-lg font-semibold text-gradient">৪ ডিজিট পিন সেট/চেঞ্জ</h3>
          <div className="security-pin-grid">
            <input
              type="password"
              className="form-input lock-pin-input"
              inputMode="numeric"
              placeholder="নতুন PIN"
              value={newPin}
              maxLength={4}
              onChange={(event) => setNewPin(event.target.value.replace(/\D/g, '').slice(0, 4))}
            />
            <input
              type="password"
              className="form-input lock-pin-input"
              inputMode="numeric"
              placeholder="PIN নিশ্চিত করুন"
              value={confirmPin}
              maxLength={4}
              onChange={(event) => setConfirmPin(event.target.value.replace(/\D/g, '').slice(0, 4))}
            />
          </div>
          <button type="button" className="btn btn-primary w-full mt-4" onClick={handlePinSave}>
            পিন সেভ করুন
          </button>
        </div>

        <p className="text-xs" style={{ color: 'var(--text-muted)', marginTop: '0.85rem' }}>
          ডেটা এখন এনক্রিপটেড স্টোরেজে রাখা হবে যখন অ্যাপ লক চালু থাকবে।
        </p>
        {biometricEnabled && (
          <p className="text-xs" style={{ color: 'var(--text-muted)', marginTop: '0.4rem' }}>
            নোট: বায়োমেট্রিক টগলটি সেটিংস-এ সংরক্ষিত হচ্ছে; ডিভাইস-লেভেল বায়োমেট্রিক ভেরিফিকেশন পরবর্তী আপডেটে যুক্ত করা হবে।
          </p>
        )}

        {error && (
          <p className="text-sm" style={{ color: '#fca5a5', marginTop: '0.8rem' }}>
            {error}
          </p>
        )}

        {success && (
          <p className="text-sm" style={{ color: '#86efac', marginTop: '0.8rem' }}>
            {success}
          </p>
        )}

        <div className="flex gap-3 mt-6 mobile-btn-stack">
          <button type="button" className="btn btn-secondary w-full" onClick={onClose}>
            বাতিল
          </button>
          <button type="button" className="btn btn-success w-full" onClick={handleSave}>
            সেটিংস সেভ করুন
          </button>
        </div>
      </div>
    </div>
  );
}
