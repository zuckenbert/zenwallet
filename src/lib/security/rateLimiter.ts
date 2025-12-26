const STORAGE_KEY = 'zenwallet-pin-attempts';
const MAX_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 30 * 60 * 1000; // 30 minutes

interface AttemptData {
  count: number;
  firstAttempt: number;
  lockedUntil: number | null;
}

function getAttemptData(): AttemptData {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) {
    return { count: 0, firstAttempt: 0, lockedUntil: null };
  }
  return JSON.parse(stored);
}

function setAttemptData(data: AttemptData): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export function isLocked(): { locked: boolean; remainingMs: number } {
  const data = getAttemptData();

  if (data.lockedUntil) {
    const remaining = data.lockedUntil - Date.now();
    if (remaining > 0) {
      return { locked: true, remainingMs: remaining };
    }
    // Lockout expired, reset
    setAttemptData({ count: 0, firstAttempt: 0, lockedUntil: null });
  }

  return { locked: false, remainingMs: 0 };
}

export function recordFailedAttempt(): { locked: boolean; attemptsRemaining: number; lockoutMs: number } {
  const data = getAttemptData();
  const now = Date.now();

  // Reset if first attempt was more than lockout duration ago
  if (data.firstAttempt && now - data.firstAttempt > LOCKOUT_DURATION_MS) {
    data.count = 0;
    data.firstAttempt = 0;
  }

  // Record this attempt
  data.count += 1;
  if (data.count === 1) {
    data.firstAttempt = now;
  }

  // Check if should lock
  if (data.count >= MAX_ATTEMPTS) {
    data.lockedUntil = now + LOCKOUT_DURATION_MS;
    setAttemptData(data);
    return { locked: true, attemptsRemaining: 0, lockoutMs: LOCKOUT_DURATION_MS };
  }

  setAttemptData(data);
  return {
    locked: false,
    attemptsRemaining: MAX_ATTEMPTS - data.count,
    lockoutMs: 0,
  };
}

export function resetAttempts(): void {
  localStorage.removeItem(STORAGE_KEY);
}

export function formatLockoutTime(ms: number): string {
  const minutes = Math.ceil(ms / 60000);
  if (minutes >= 60) {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  }
  return `${minutes} minute${minutes !== 1 ? 's' : ''}`;
}
