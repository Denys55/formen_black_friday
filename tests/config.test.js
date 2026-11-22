import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseConfig, ConfigError } from '../js/config.js';

test('defaults label and weight', () => {
  const { prizes } = parseConfig({ prizes: [{ code: 'A', discount: 10 }] });
  assert.deepEqual(prizes, [{ code: 'A', discount: 10, label: '-10%', weight: 1 }]);
});

test('keeps custom label', () => {
  const { prizes } = parseConfig({ prizes: [{ code: 'A', discount: 10, label: 'Подарунок' }] });
  assert.equal(prizes[0].label, 'Подарунок');
});

test('skips invalid entries', () => {
  const { prizes } = parseConfig({
    prizes: [
      { discount: 10 },
      { code: '', discount: 5 },
      { code: 'X', discount: 0 },
      { code: 'Y', discount: 150 },
      { code: 'Z', discount: 10, weight: -1 },
      { code: 'OK', discount: 20, weight: 2 },
    ],
  });
  assert.deepEqual(prizes, [{ code: 'OK', discount: 20, label: '-20%', weight: 2 }]);
});

test('throws ConfigError when no valid prizes', () => {
  for (const raw of [{ prizes: [] }, {}, null, { prizes: [{ code: '' }] }]) {
    assert.throws(() => parseConfig(raw), (e) => e instanceof ConfigError);
  }
});

test('trims code', () => {
  const { prizes } = parseConfig({ prizes: [{ code: '  BF5 ', discount: 5 }] });
  assert.equal(prizes[0].code, 'BF5');
});
