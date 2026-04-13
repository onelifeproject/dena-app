import { useMemo, useState } from 'react';

const RESUME_OPTIONS = [
  { value: 0, label: 'সাথে সাথে লক' },
  { value: 30, label: '৩০ সেকেন্ড পরে' },
  { value: 60, label: '১ মিনিট পরে' },
  { value: 300, label: '৫ মিনিট পরে' },
];

export default function LockScreen({
  isPinSetupMode,
  onUnlock,
  onCreatePin,
  onBiometricUnlock,
  error,
  lockOnResume,
  resumeGraceSeconds,
  biometricEnabled,
  failedAttempts,
  maxAttempts,
  cooldownRemaining,
}) {
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');

  const canSubmit = useMemo(() => {
    if (cooldownRemaining > 0) return false;
    if (!/^\d{4}$/.test(pin)) return false;
    if (!isPinSetupMode) return true;
    return pin === confirmPin;
  }, [confirmPin, cooldownRemaining, isPinSetupMode, pin]);

  const submitLabel = isPinSetupMode ? 'পিন সেভ করুন' : 'আনলক করুন';
  const helperText = isPinSetupMode
    ? 'প্রথমবার ৪ ডিজিট পিন সেট করুন।'
    : 'অ্যাপ ব্যবহার করতে ৪ ডিজিট পিন দিন।';

  const handleSubmit = (event) => {
    event.preventDefault();
    if (!canSubmit) return;
    if (isPinSetupMode) {
      onCreatePin(pin);
    } else {
      onUnlock(pin);
    }
  };

  return (
    <div className="lock-screen-overlay">
      <div className="lock-screen-card glass-card">
        <h2 className="text-2xl font-bold text-brand-gradient text-center">নিরাপত্তা লক</h2>
        <p className="text-sm text-center" style={{ color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
          {helperText}
        </p>

        <form onSubmit={handleSubmit} style={{ marginTop: '1.2rem' }}>
          <div className="form-group">
            <label className="form-label">৪ ডিজিট পিন</label>
            <input
              type="password"
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="\d{4}"
              maxLength={4}
              className="form-input lock-pin-input"
              value={pin}
              disabled={cooldownRemaining > 0}
              onChange={(event) => setPin(event.target.value.replace(/\D/g, '').slice(0, 4))}
              placeholder="****"
            />
          </div>

          {isPinSetupMode && (
            <div className="form-group">
              <label className="form-label">পিন নিশ্চিত করুন</label>
              <input
                type="password"
                inputMode="numeric"
                autoComplete="one-time-code"
                pattern="\d{4}"
                maxLength={4}
                className="form-input lock-pin-input"
                value={confirmPin}
                disabled={cooldownRemaining > 0}
                onChange={(event) => setConfirmPin(event.target.value.replace(/\D/g, '').slice(0, 4))}
                placeholder="****"
              />
            </div>
          )}

          {!isPinSetupMode && (
            <p className="text-xs" style={{ color: 'var(--text-muted)', marginBottom: '0.8rem' }}>
              চেষ্টা: {failedAttempts}/{maxAttempts}
              {cooldownRemaining > 0 ? ` | অপেক্ষা: ${cooldownRemaining} সেকেন্ড` : ''}
            </p>
          )}

          {error && (
            <p className="text-sm" style={{ color: '#fca5a5', marginBottom: '1rem' }}>
              {error}
            </p>
          )}

          <button type="submit" disabled={!canSubmit} className="btn btn-primary w-full">
            {submitLabel}
          </button>

          {biometricEnabled && !isPinSetupMode && (
            <button
              type="button"
              className="btn btn-secondary w-full"
              style={{ marginTop: '0.75rem' }}
              onClick={onBiometricUnlock}
              disabled={cooldownRemaining > 0}
            >
              বায়োমেট্রিক দিয়ে আনলক
            </button>
          )}
        </form>

        <div className="lock-hint-row">
          <span>রিজিউমে লক:</span>
          <strong>{lockOnResume ? RESUME_OPTIONS.find((item) => item.value === resumeGraceSeconds)?.label ?? 'কাস্টম' : 'বন্ধ'}</strong>
        </div>
      </div>
    </div>
  );
}
