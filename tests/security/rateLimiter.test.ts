import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  isLocked,
  recordFailedAttempt,
  resetAttempts,
  formatLockoutTime,
} from '@/lib/security/rateLimiter';

describe('Rate Limiter', () => {
  beforeEach(() => {
    // Clear localStorage mock
    vi.mocked(localStorage.getItem).mockReturnValue(null);
    vi.mocked(localStorage.setItem).mockClear();
    vi.mocked(localStorage.removeItem).mockClear();
  });

  describe('isLocked', () => {
    it('should not be locked initially', () => {
      expect(isLocked().locked).toBe(false);
    });

    it('should return remaining time when locked', () => {
      const lockedData = {
        count: 5,
        firstAttempt: Date.now() - 1000,
        lockedUntil: Date.now() + 1800000, // 30 min from now
      };
      vi.mocked(localStorage.getItem).mockReturnValue(JSON.stringify(lockedData));

      const result = isLocked();
      expect(result.locked).toBe(true);
      expect(result.remainingMs).toBeGreaterThan(0);
    });
  });

  describe('recordFailedAttempt', () => {
    it('should track attempts', () => {
      let storedData: string | null = null;
      vi.mocked(localStorage.getItem).mockImplementation(() => storedData);
      vi.mocked(localStorage.setItem).mockImplementation((_, value) => {
        storedData = value;
      });

      const result = recordFailedAttempt();
      expect(result.locked).toBe(false);
      expect(result.attemptsRemaining).toBe(4);
    });

    it('should lock after 5 attempts', () => {
      let storedData: string | null = null;
      vi.mocked(localStorage.getItem).mockImplementation(() => storedData);
      vi.mocked(localStorage.setItem).mockImplementation((_, value) => {
        storedData = value;
      });

      // Make 5 attempts
      for (let i = 0; i < 4; i++) {
        const result = recordFailedAttempt();
        expect(result.locked).toBe(false);
      }

      const finalResult = recordFailedAttempt();
      expect(finalResult.locked).toBe(true);
      expect(finalResult.attemptsRemaining).toBe(0);
    });
  });

  describe('resetAttempts', () => {
    it('should clear stored attempts', () => {
      resetAttempts();
      expect(localStorage.removeItem).toHaveBeenCalledWith('zenwallet-pin-attempts');
    });
  });

  describe('formatLockoutTime', () => {
    it('should format minutes correctly', () => {
      expect(formatLockoutTime(60000)).toBe('1 minute');
      expect(formatLockoutTime(120000)).toBe('2 minutes');
      expect(formatLockoutTime(300000)).toBe('5 minutes');
    });

    it('should format hours correctly', () => {
      expect(formatLockoutTime(3600000)).toBe('1h 0m');
      expect(formatLockoutTime(5400000)).toBe('1h 30m');
    });
  });
});
