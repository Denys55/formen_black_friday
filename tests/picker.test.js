import { test } from 'node:test';
import assert from 'node:assert/strict';
import { pickPrizeIndex } from '../js/picker.js';

const p = (weight) => ({ code: 'X', discount: 10, label: '-10%', weight });

test('respects weights', () => {
  const prizes = [p(1), p(3)];
  assert.equal(pickPrizeIndex(prizes, () => 0.2), 0);
  assert.equal(pickPrizeIndex(prizes, () => 0.3), 1);
  assert.equal(pickPrizeIndex(prizes, () => 0.999), 1);
});

test('equal weights', () => {
  assert.equal(pickPrizeIndex([p(1), p(1), p(1), p(1)], () => 0.5), 2);
});
