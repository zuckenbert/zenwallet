import { useState, useCallback, useRef } from 'react';
import { toast } from '@/stores/toastStore';

const AUTO_CLEAR_TIMEOUT = 60000; // 60 seconds

export function useClipboard() {
  const [copied, setCopied] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const copy = useCallback(async (text: string, message?: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);

      // Show toast
      toast.success(message || 'Copied to clipboard');

      // Auto-clear copied state after 2 seconds (UI feedback)
      setTimeout(() => setCopied(false), 2000);

      // Clear clipboard after 60 seconds (security)
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      timeoutRef.current = setTimeout(async () => {
        try {
          // Only clear if clipboard still contains our text
          const current = await navigator.clipboard.readText();
          if (current === text) {
            await navigator.clipboard.writeText('');
            toast.info('Clipboard cleared for security');
          }
        } catch {
          // Clipboard access denied, ignore
        }
      }, AUTO_CLEAR_TIMEOUT);

      return true;
    } catch {
      toast.error('Failed to copy');
      return false;
    }
  }, []);

  return { copied, copy };
}
