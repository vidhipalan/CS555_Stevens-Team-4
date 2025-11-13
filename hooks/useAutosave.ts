import { useCallback, useEffect, useRef } from 'react';

/**
 * Custom hook to manage autosave functionality
 * Extracted from God Component to separate autosave/debouncing concern
 */
export function useAutosave<T>(
  onSave: (data: T) => Promise<void>,
  delay: number = 5000
) {
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const triggerAutosave = useCallback((data: T) => {
    // Clear existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Set new timeout for autosave
    timeoutRef.current = setTimeout(async () => {
      try {
        await onSave(data);
      } catch (error) {
        console.error('Autosave failed:', error);
      }
    }, delay);
  }, [onSave, delay]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const cancelAutosave = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  return {
    triggerAutosave,
    cancelAutosave,
  };
}

