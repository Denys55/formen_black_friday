/** @typedef {import('./config.js').Prize} Prize */

/**
 * Weighted random choice.
 * @param {Prize[]} prizes
 * @param {() => number} rng returns [0, 1)
 * @returns {number} index into prizes
 */
export function pickPrizeIndex(prizes, rng = Math.random) {
  const total = prizes.reduce((sum, p) => sum + p.weight, 0);
  let r = rng() * total;
  for (let i = 0; i < prizes.length; i++) {
    r -= prizes[i].weight;
    if (r < 0) return i;
  }
  return prizes.length - 1;
}
