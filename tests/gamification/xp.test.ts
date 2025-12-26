import { describe, it, expect } from 'vitest';
import { XP_VALUES, LEVELS } from '@/types/gamification';

describe('XP System', () => {
  describe('XP Values', () => {
    it('should have positive XP values for all actions', () => {
      Object.values(XP_VALUES).forEach((value) => {
        expect(value).toBeGreaterThan(0);
      });
    });

    it('should reward daily login', () => {
      expect(XP_VALUES.daily_login).toBeDefined();
      expect(XP_VALUES.daily_login).toBeGreaterThanOrEqual(10);
    });

    it('should reward transactions more than daily login', () => {
      expect(XP_VALUES.send).toBeGreaterThan(XP_VALUES.daily_login);
    });
  });

  describe('Level System', () => {
    it('should have increasing XP thresholds', () => {
      for (let i = 1; i < LEVELS.length; i++) {
        expect(LEVELS[i].minXP).toBeGreaterThan(LEVELS[i - 1].minXP);
      }
    });

    it('should start at level 1 with 0 XP', () => {
      expect(LEVELS[0].number).toBe(1);
      expect(LEVELS[0].minXP).toBe(0);
    });

    it('should have unique level numbers', () => {
      const numbers = LEVELS.map((l) => l.number);
      const uniqueNumbers = new Set(numbers);
      expect(uniqueNumbers.size).toBe(numbers.length);
    });

    it('should have proper tier titles', () => {
      const titles = [...new Set(LEVELS.map((l) => l.title))];
      expect(titles).toContain('Noob');
      expect(titles).toContain('Whale');
    });
  });
});
