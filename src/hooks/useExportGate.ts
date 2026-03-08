import { useState, useCallback } from 'react';

const STORAGE_KEY = 'carousel-studio-exports';
const FREE_EXPORTS = 1;
const EXPORTS_PER_AD = 3;

interface ExportCredits {
  /** Total exports the user has performed */
  totalExports: number;
  /** Remaining bonus exports from watching ads */
  bonusCredits: number;
}

function loadCredits(): ExportCredits {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        totalExports: parsed.totalExports ?? 0,
        bonusCredits: parsed.bonusCredits ?? 0,
      };
    }
  } catch {
    // Corrupted data — start fresh
  }
  return { totalExports: 0, bonusCredits: 0 };
}

function saveCredits(credits: ExportCredits) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(credits));
  } catch {
    // localStorage unavailable (private browsing, quota exceeded) — silently fail
  }
}

export function useExportGate() {
  const [credits, setCredits] = useState<ExportCredits>(loadCredits);

  /** Whether the user can export right now without watching an ad */
  const canExport = credits.totalExports < FREE_EXPORTS || credits.bonusCredits > 0;

  /** Consume one export credit. Call this AFTER a successful export. */
  const consumeExport = useCallback(() => {
    setCredits((prev) => {
      const next: ExportCredits = {
        totalExports: prev.totalExports + 1,
        bonusCredits:
          prev.totalExports >= FREE_EXPORTS - 1 && prev.bonusCredits > 0
            ? prev.bonusCredits - 1
            : prev.bonusCredits,
      };
      saveCredits(next);
      return next;
    });
  }, []);

  /** Grant bonus credits after watching an ad */
  const grantAdCredits = useCallback(() => {
    setCredits((prev) => {
      const next: ExportCredits = {
        ...prev,
        bonusCredits: prev.bonusCredits + EXPORTS_PER_AD,
      };
      saveCredits(next);
      return next;
    });
  }, []);

  return {
    canExport,
    credits,
    consumeExport,
    grantAdCredits,
    freeExports: FREE_EXPORTS,
    exportsPerAd: EXPORTS_PER_AD,
  };
}
