/**
 * Export gate hook.
 *
 * Every export requires watching a short ad — there are no free credits.
 * The hook tracks whether the ad has been completed for the current
 * export attempt and resets after each successful export.
 */
import { useCallback } from 'react';

export function useExportGate() {
  /** Reset after a successful export so the next one requires another ad. */
  const consumeExport = useCallback(() => {
    // Currently a no-op placeholder — the ad-gate flow in App.tsx
    // already enforces the modal before every export.  This hook is
    // retained as the single integration point should we add
    // server-side export tokens in the future.
  }, []);

  return { consumeExport };
}
