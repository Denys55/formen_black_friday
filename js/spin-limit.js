/** @typedef {import('./config.js').Prize} Prize */

export const COOLDOWN_MS = 3_600_000;
export const STORAGE_KEY = 'formen_bf_spin_v1';

function readRecord(storage) {
  try {
    const raw = storage ? storage.getItem(STORAGE_KEY) : null;
    if (!raw) return null;
    const rec = JSON.parse(raw);
    const p = rec && rec.prize;
    if (
      typeof rec.spunAt !== 'number' || !Number.isFinite(rec.spunAt) ||
      !p || typeof p.code !== 'string' || typeof p.label !== 'string'
    ) return null;
    return rec;
  } catch {
    return null; // storage blocked or corrupt JSON: behave as if never spun
  }
}

/**
 * Client-side "one spin per hour" limit. Storage may be null or throw (private mode, in-app browsers).
 * @param {{ storage: Storage | null, now?: () => number }} opts
 */
export function createSpinLimit({ storage, now = Date.now }) {
  return {
    getState() {
      const rec = readRecord(storage);
      if (!rec) return { canSpin: true, remainingMs: 0, lastPrize: null, spunAt: null };
      const elapsed = now() - rec.spunAt;
      // A future timestamp (clock moved back) counts as expired.
      const remainingMs = elapsed < 0 ? 0 : Math.max(0, COOLDOWN_MS - elapsed);
      return { canSpin: remainingMs === 0, remainingMs, lastPrize: rec.prize, spunAt: rec.spunAt };
    },
    /** @param {Prize} prize */
    record(prize) {
      try {
        storage?.setItem(STORAGE_KEY, JSON.stringify({ spunAt: now(), prize }));
      } catch {
        /* storage unavailable: spin still works, just without the limit */
      }
    },
  };
}

/** "MM:SS", seconds rounded up. */
export function formatRemaining(ms) {
  const total = Math.ceil(Math.max(0, ms) / 1000);
  const pad = (n) => String(n).padStart(2, '0');
  return `${pad(Math.floor(total / 60))}:${pad(total % 60)}`;
}
