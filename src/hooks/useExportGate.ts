/**
 * Export gate hook.
 *
 * Every export requires watching a short ad — there are no free credits.
 * The hook simply tracks whether the ad has been completed for the current
 * export attempt via `unlockExport` / `consumeExport`.
 */
import { useState, useCallback } from 'react';

export function useExportGate() {
  const [unlocked, setUnlocked] = useState(false);

  /** Mark the current export as unlocked (ad was watched). */
  const unlockExport = useCallback(() => {
    setUnlocked(true);
  }, []);

  /** Consume the unlock after a successful export. */
  const consumeExport = useCallback(() => {
    setUnlocked(false);
  }, []);

  return {
    /** Whether the current export attempt has been unlocked by an ad */
    canExport: unlocked,
    unlockExport,
    consumeExport,
  };
}
