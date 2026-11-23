/**
 * One wheel segment: a discount with several interchangeable promo codes.
 * @typedef {{ discount: number, label: string, weight: number, codes: string[] }} Tier
 */
/**
 * What the customer won: the tier plus the one code picked for them.
 * @typedef {{ code: string, discount: number, label: string, weight: number }} Prize
 */

export class ConfigError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ConfigError';
  }
}

const isPositiveNumber = (v) => typeof v === 'number' && Number.isFinite(v) && v > 0;

/** @returns {Tier | null} */
function parseTier(entry, seenCodes) {
  if (!entry || typeof entry !== 'object') return null;
  const { discount } = entry;
  if (!isPositiveNumber(discount) || discount > 100) return null;
  const weight = entry.weight === undefined ? 1 : entry.weight;
  if (!isPositiveNumber(weight)) return null;
  const codes = [];
  for (const raw of Array.isArray(entry.codes) ? entry.codes : []) {
    const code = typeof raw === 'string' ? raw.trim() : '';
    if (!code) continue;
    if (seenCodes.has(code)) {
      console.warn(`promocodes.json: код ${code} вже використано в іншій знижці — пропущено`);
      continue;
    }
    seenCodes.add(code);
    codes.push(code);
  }
  if (codes.length === 0) return null;
  const label =
    typeof entry.label === 'string' && entry.label.trim() ? entry.label.trim() : `-${discount}%`;
  return { discount, label, weight, codes };
}

/** @returns {{ prizes: Tier[] }} */
export function parseConfig(raw) {
  const list = raw && Array.isArray(raw.prizes) ? raw.prizes : [];
  const seenCodes = new Set();
  const prizes = [];
  list.forEach((entry, i) => {
    const tier = parseTier(entry, seenCodes);
    if (tier) prizes.push(tier);
    else console.warn(`promocodes.json: запис #${i + 1} пропущено (некоректні дані)`, entry);
  });
  if (prizes.length === 0) throw new ConfigError('promocodes.json: немає жодного коректного промокоду');
  return { prizes };
}

/**
 * Pick one of the tier's codes uniformly at random.
 * @param {Tier} tier
 * @param {() => number} rng returns [0, 1)
 */
export function pickCode(tier, rng = Math.random) {
  return tier.codes[Math.min(tier.codes.length - 1, Math.floor(rng() * tier.codes.length))];
}

/** @returns {Promise<{ prizes: Tier[] }>} */
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
