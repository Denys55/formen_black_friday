/** @typedef {{ code: string, discount: number, label: string, weight: number }} Prize */

export class ConfigError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ConfigError';
  }
}

const isPositiveNumber = (v) => typeof v === 'number' && Number.isFinite(v) && v > 0;

/** @returns {Prize | null} */
function parsePrize(entry) {
  if (!entry || typeof entry !== 'object') return null;
  const code = typeof entry.code === 'string' ? entry.code.trim() : '';
  if (!code) return null;
  const { discount } = entry;
  if (!isPositiveNumber(discount) || discount > 100) return null;
  const weight = entry.weight === undefined ? 1 : entry.weight;
  if (!isPositiveNumber(weight)) return null;
  const label =
    typeof entry.label === 'string' && entry.label.trim() ? entry.label.trim() : `-${discount}%`;
  return { code, discount, label, weight };
}

/** @returns {{ prizes: Prize[] }} */
export function parseConfig(raw) {
  const list = raw && Array.isArray(raw.prizes) ? raw.prizes : [];
  const prizes = [];
  list.forEach((entry, i) => {
    const prize = parsePrize(entry);
    if (prize) prizes.push(prize);
    else console.warn(`promocodes.json: запис #${i + 1} пропущено (некоректні дані)`, entry);
  });
  if (prizes.length === 0) throw new ConfigError('promocodes.json: немає жодного коректного промокоду');
  return { prizes };
}

/** @returns {Promise<{ prizes: Prize[] }>} */
export async function loadConfig(url = 'data/promocodes.json') {
  let raw;
  try {
    const res = await fetch(url, { cache: 'no-cache' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    raw = await res.json();
  } catch (e) {
    throw new ConfigError(`Не вдалося завантажити ${url}: ${e.message}`);
  }
  return parseConfig(raw);
}
