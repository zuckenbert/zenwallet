import { describe, it, expect } from 'vitest';

describe('WhatsApp Webhook', () => {
  describe('Phone normalization', () => {
    function normalizePhone(phone: string): string {
      let cleaned = phone.replace(/\D/g, '');
      if (!cleaned.startsWith('55')) {
        cleaned = '55' + cleaned;
      }
      return cleaned;
    }

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

  describe('Message extraction', () => {
    function extractPhone(remoteJid: string): string {
      return remoteJid.replace('@s.whatsapp.net', '').replace('@g.us', '');
    }

    it('should extract phone from individual chat JID', () => {
      expect(extractPhone('5511999990000@s.whatsapp.net')).toBe('5511999990000');
    });

    it('should extract identifier from group JID', () => {
      expect(extractPhone('120363000000@g.us')).toBe('120363000000');
    });
  });
});
