import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseConfig, ConfigError, pickCode } from '../js/config.js';

test('defaults label and weight', () => {
  const { prizes } = parseConfig({ prizes: [{ discount: 10, codes: ['A1'] }] });
  assert.deepEqual(prizes, [{ discount: 10, label: '-10%', weight: 1, codes: ['A1'] }]);
});

test('keeps custom label', () => {
  const { prizes } = parseConfig({ prizes: [{ discount: 10, label: 'Подарунок', codes: ['A1'] }] });
  assert.equal(prizes[0].label, 'Подарунок');
});

test('skips invalid entries', () => {
  const { prizes } = parseConfig({
    prizes: [
      { discount: 10 },
      { discount: 10, codes: [] },
      { discount: 10, codes: ['', '  ', 5] },
      { discount: 0, codes: ['X'] },
      { discount: 150, codes: ['Y'] },
      { discount: 10, weight: -1, codes: ['Z'] },
      { discount: 20, weight: 2, codes: ['OK'] },
    ],
  });
  assert.deepEqual(prizes, [{ discount: 20, label: '-20%', weight: 2, codes: ['OK'] }]);
});

test('drops invalid codes but keeps the rest of the entry', () => {
  const { prizes } = parseConfig({ prizes: [{ discount: 30, codes: ['  FM-AAA ', '', null, 'FM-BBB'] }] });
  assert.deepEqual(prizes[0].codes, ['FM-AAA', 'FM-BBB']);
});

test('a code used twice is kept only in the first entry', () => {
  const { prizes } = parseConfig({
    prizes: [
      { discount: 10, codes: ['DUP', 'A'] },
      { discount: 50, codes: ['DUP', 'B'] },
      { discount: 40, codes: ['DUP'] },
    ],
  });
  assert.deepEqual(prizes.map((p) => p.codes), [['DUP', 'A'], ['B']]);
});

test('throws ConfigError when no valid prizes', () => {
  for (const raw of [{ prizes: [] }, {}, null, { prizes: [{ discount: 10, codes: [''] }] }]) {
    assert.throws(() => parseConfig(raw), (e) => e instanceof ConfigError);
  }
});

test('pickCode picks uniformly from the entry codes', () => {
  const tier = { discount: 30, label: '-30%', weight: 1, codes: ['A', 'B', 'C', 'D', 'E'] };
  assert.equal(pickCode(tier, () => 0), 'A');
  assert.equal(pickCode(tier, () => 0.5), 'C');
  assert.equal(pickCode(tier, () => 0.999), 'E');
});

test('shipped promocodes.json: 6 discounts, 5 unique codes each, 30% average', async () => {
  const { readFile } = await import('node:fs/promises');
  const raw = JSON.parse(await readFile(new URL('../data/promocodes.json', import.meta.url), 'utf8'));
  const { prizes } = parseConfig(raw);
  assert.deepEqual(prizes.map((p) => p.discount), [10, 15, 20, 30, 40, 50]);
  for (const p of prizes) assert.equal(p.codes.length, 5, `discount ${p.discount}`);
  const all = prizes.flatMap((p) => p.codes);
  assert.equal(new Set(all).size, 30);
  for (const c of all) assert.match(c, /^FM-[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{5}$/);
  const W = prizes.reduce((s, p) => s + p.weight, 0);
  assert.equal(prizes.reduce((s, p) => s + p.discount * p.weight, 0) / W, 30);
});
