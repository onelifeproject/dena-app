import CryptoJS from 'crypto-js';

const LEGACY_LOANS_KEY = 'usuryLoans';
const ENCRYPTED_LOANS_KEY = 'usuryLoansEncrypted';
const SECURITY_SETTINGS_KEY = 'usurySecuritySettings';

const HASH_ITERATIONS = 150000;
const KEY_SIZE = 256 / 32;

let sessionPin = null;

const defaultSecuritySettings = {
  lockEnabled: false,
  biometricEnabled: false,
  lockOnResume: true,
  resumeGraceSeconds: 0,
  pinSalt: null,
  pinHash: null,
};

const parseJson = (raw, fallback) => {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
};

const normalizeSettings = (settings) => ({
  ...defaultSecuritySettings,
  ...settings,
  resumeGraceSeconds: Number(settings?.resumeGraceSeconds ?? defaultSecuritySettings.resumeGraceSeconds),
});

const saveSecuritySettings = (settings) => {
  localStorage.setItem(SECURITY_SETTINGS_KEY, JSON.stringify(normalizeSettings(settings)));
};

export const getSecuritySettings = () => {
  const settings = parseJson(localStorage.getItem(SECURITY_SETTINGS_KEY), defaultSecuritySettings);
  return normalizeSettings(settings);
};

const ensureValidPin = (pin) => {
  if (!/^\d{4}$/.test(pin)) {
    throw new Error('PIN must be exactly 4 digits.');
  }
};

const deriveHash = (pin, salt) =>
  CryptoJS.PBKDF2(pin, salt, {
    keySize: KEY_SIZE,
    iterations: HASH_ITERATIONS,
  }).toString();

const deriveAesKey = (pin, salt) =>
  CryptoJS.PBKDF2(`usury-lock:${pin}`, salt, {
    keySize: KEY_SIZE,
    iterations: HASH_ITERATIONS,
  });

const deriveMacKey = (pin, salt) =>
  CryptoJS.PBKDF2(`usury-lock-mac:${pin}`, salt, {
    keySize: KEY_SIZE,
    iterations: HASH_ITERATIONS,
  });

const buildMacPayload = (ivHex, cipherText) => `${ivHex}:${cipherText}`;

export const verifyPin = (pin) => {
  ensureValidPin(pin);
  const settings = getSecuritySettings();
  if (!settings.pinSalt || !settings.pinHash) return false;
  return deriveHash(pin, settings.pinSalt) === settings.pinHash;
};

export const createOrResetPin = (pin) => {
  ensureValidPin(pin);
  const settings = getSecuritySettings();
  const pinSalt = CryptoJS.lib.WordArray.random(16).toString();
  const pinHash = deriveHash(pin, pinSalt);

  saveSecuritySettings({
    ...settings,
    lockEnabled: true,
    pinSalt,
    pinHash,
  });
  sessionPin = pin;
};

export const updateSecurityPreferences = (partialSettings) => {
  const current = getSecuritySettings();
  const next = normalizeSettings({ ...current, ...partialSettings });
  saveSecuritySettings(next);
  return next;
};

export const setSessionPin = (pin) => {
  ensureValidPin(pin);
  sessionPin = pin;
};

export const getSessionPin = () => sessionPin;

export const clearSessionPin = () => {
  sessionPin = null;
};

export const hasUnlockedSession = () => !!sessionPin;

export const isLockConfigured = () => {
  const settings = getSecuritySettings();
  return settings.lockEnabled && Boolean(settings.pinHash && settings.pinSalt);
};

export const readStoredLoansRaw = () => {
  const settings = getSecuritySettings();
  if (!settings.lockEnabled) {
    return parseJson(localStorage.getItem(LEGACY_LOANS_KEY), []);
  }

  const encryptedPayload = parseJson(localStorage.getItem(ENCRYPTED_LOANS_KEY), null);
  if (!encryptedPayload) {
    return parseJson(localStorage.getItem(LEGACY_LOANS_KEY), []);
  }

  const pinToUse = sessionPin;
  if (!pinToUse) {
    throw new Error('Session is locked');
  }

  const key = deriveAesKey(pinToUse, settings.pinSalt);
  const macKey = deriveMacKey(pinToUse, settings.pinSalt);
  if (encryptedPayload.v === 2) {
    const expectedMac = CryptoJS.HmacSHA256(
      buildMacPayload(encryptedPayload.iv, encryptedPayload.cipher),
      macKey,
    ).toString();
    if (!encryptedPayload.mac || expectedMac !== encryptedPayload.mac) {
      throw new Error('Encrypted payload failed integrity check');
    }
  }

  const iv = CryptoJS.enc.Hex.parse(encryptedPayload.iv);
  const decrypted = CryptoJS.AES.decrypt(encryptedPayload.cipher, key, {
    iv,
    mode: CryptoJS.mode.CBC,
    padding: CryptoJS.pad.Pkcs7,
  });
  const text = decrypted.toString(CryptoJS.enc.Utf8);
  if (!text) {
    throw new Error('Failed to decrypt loans');
  }
  return parseJson(text, []);
};

export const saveStoredLoansRaw = (loans) => {
  const settings = getSecuritySettings();
  if (!settings.lockEnabled) {
    localStorage.setItem(LEGACY_LOANS_KEY, JSON.stringify(loans));
    localStorage.removeItem(ENCRYPTED_LOANS_KEY);
    return;
  }

  if (!sessionPin || !settings.pinSalt) {
    throw new Error('Session is locked');
  }

  const key = deriveAesKey(sessionPin, settings.pinSalt);
  const macKey = deriveMacKey(sessionPin, settings.pinSalt);
  const iv = CryptoJS.lib.WordArray.random(16);
  const cipher = CryptoJS.AES.encrypt(JSON.stringify(loans), key, {
    iv,
    mode: CryptoJS.mode.CBC,
    padding: CryptoJS.pad.Pkcs7,
  }).toString();
  const ivHex = iv.toString();
  const mac = CryptoJS.HmacSHA256(buildMacPayload(ivHex, cipher), macKey).toString();

  localStorage.setItem(
    ENCRYPTED_LOANS_KEY,
    JSON.stringify({
      v: 2,
      iv: ivHex,
      cipher,
      mac,
    }),
  );
  localStorage.removeItem(LEGACY_LOANS_KEY);
};

export const migrateLegacyLoansToEncrypted = () => {
  const settings = getSecuritySettings();
  if (!settings.lockEnabled || !sessionPin) return;
  const legacyLoans = parseJson(localStorage.getItem(LEGACY_LOANS_KEY), null);
  if (!legacyLoans) return;
  saveStoredLoansRaw(legacyLoans);
};
