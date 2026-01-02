// src/hooks/useSanitizeOnSave.ts

import { useCallback } from 'react';
import { sanitizeObject } from '../utils/textSanitizer';

/**
 * Hook to sanitize all form data before saving
 * Use this in your form submission handlers
 *
 * @example
 * const sanitizeBeforeSave = useSanitizeOnSave();
 *
 * const handleSave = () => {
 *   const cleanData = sanitizeBeforeSave(formData);
 *   await api.save(cleanData);
 * };
 */
export function useSanitizeOnSave() {
  const sanitize = useCallback(<T,>(data: T): T => {
    console.log('🧹 [SANITIZE] Cleaning form data before save...');

    const before = JSON.stringify(data);
    const cleaned = sanitizeObject(data);
    const after = JSON.stringify(cleaned);

    if (before !== after) {
      console.warn('⚠️ [SANITIZE] Data was modified during sanitization', {
        originalSize: before.length,
        cleanedSize: after.length,
        removedBytes: before.length - after.length,
      });
    } else {
      console.log('✅ [SANITIZE] Data is clean (no changes needed)');
    }

    return cleaned;
  }, []);

  return sanitize;
}
