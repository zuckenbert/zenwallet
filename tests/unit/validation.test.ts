import { describe, it, expect } from 'vitest';
import { validateCPF, maskCPF, formatCPF, validatePhone, normalizePhone, validateEmail, sanitizeInput } from '../../src/utils/validation';

describe('CPF Validation', () => {
  it('should validate a correct CPF', () => {
    expect(validateCPF('52998224725')).toBe(true);
    expect(validateCPF('529.982.247-25')).toBe(true);
  });

  it('should reject CPF with wrong check digits', () => {
    expect(validateCPF('52998224726')).toBe(false);
    expect(validateCPF('12345678900')).toBe(false);
  });

  it('should reject CPF with all same digits', () => {
    expect(validateCPF('00000000000')).toBe(false);
    expect(validateCPF('11111111111')).toBe(false);
    expect(validateCPF('99999999999')).toBe(false);
  });

  it('should reject CPF with wrong length', () => {
    expect(validateCPF('1234567890')).toBe(false);
    expect(validateCPF('123456789012')).toBe(false);
    expect(validateCPF('')).toBe(false);
  });

  it('should handle CPF with formatting', () => {
    expect(validateCPF('529.982.247-25')).toBe(true);
  });
});

describe('CPF Masking', () => {
  it('should mask CPF correctly', () => {
    expect(maskCPF('52998224725')).toBe('***.982.247-**');
  });

  it('should handle invalid length', () => {
    expect(maskCPF('123')).toBe('***');
  });
});

describe('CPF Formatting', () => {
  it('should format CPF with dots and dash', () => {
    expect(formatCPF('52998224725')).toBe('529.982.247-25');
  });
});

describe('Phone Validation', () => {
  it('should validate Brazilian mobile numbers', () => {
    expect(validatePhone('5511999990000')).toBe(true);
    expect(validatePhone('11999990000')).toBe(true);
  });

  it('should reject invalid numbers', () => {
    expect(validatePhone('123')).toBe(false);
    expect(validatePhone('551188880000')).toBe(false); // no 9 prefix
  });

  it('should handle formatted numbers', () => {
    expect(validatePhone('+55 (11) 99999-0000')).toBe(true);
  });
});

describe('Phone Normalization', () => {
  it('should add country code if missing', () => {
    expect(normalizePhone('11999990000')).toBe('5511999990000');
  });

  it('should keep existing country code', () => {
    expect(normalizePhone('5511999990000')).toBe('5511999990000');
  });

  it('should strip non-numeric characters', () => {
    expect(normalizePhone('+55 (11) 99999-0000')).toBe('5511999990000');
  });
});

describe('Email Validation', () => {
  it('should validate correct emails', () => {
    expect(validateEmail('user@example.com')).toBe(true);
    expect(validateEmail('user+tag@domain.co.br')).toBe(true);
  });

  it('should reject invalid emails', () => {
    expect(validateEmail('not-an-email')).toBe(false);
    expect(validateEmail('@nodomain')).toBe(false);
    expect(validateEmail('user@')).toBe(false);
    expect(validateEmail('')).toBe(false);
  });
});

describe('Input Sanitization', () => {
  it('should truncate long strings', () => {
    const long = 'a'.repeat(1000);
    expect(sanitizeInput(long, 500).length).toBe(500);
  });

  it('should remove control characters', () => {
    expect(sanitizeInput('hello\x00world')).toBe('helloworld');
    expect(sanitizeInput('test\x08data')).toBe('testdata');
  });

  it('should preserve newlines and tabs', () => {
    expect(sanitizeInput('hello\nworld\ttab')).toBe('hello\nworld\ttab');
  });

  it('should handle empty strings', () => {
    expect(sanitizeInput('')).toBe('');
  });
});
