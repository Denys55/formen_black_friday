import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createSpinLimit, formatRemaining, STORAGE_KEY, COOLDOWN_MS } from '../js/spin-limit.js';

const prize = { code: 'BF10', discount: 10, label: '-10%', weight: 1 };

function fakeStorage(initial = {}) {
  const data = { ...initial };
  return { getItem: (k) => (k in data ? data[k] : null), setItem: (k, v) => { data[k] = String(v); } };
}

test('constants', () => {
  assert.equal(COOLDOWN_MS, 3_600_000);
  assert.equal(STORAGE_KEY, 'formen_bf_spin_v1');
});

test('fresh user can spin', () => {
  const s = createSpinLimit({ storage: fakeStorage(), now: () => 0 }).getState();
  assert.equal(s.canSpin, true);
  assert.equal(s.remainingMs, 0);
  assert.equal(s.lastPrize, null);
});

test('blocks for an hour after record', () => {
  let t = 0;
  const limit = createSpinLimit({ storage: fakeStorage(), now: () => t });
  limit.record(prize);
  t = 1000;
  let s = limit.getState();
  assert.equal(s.canSpin, false);
  assert.equal(s.remainingMs, 3_599_000);
  assert.deepEqual(s.lastPrize, prize);
  assert.equal(s.spunAt, 0);
  t = 3_600_000;
  s = limit.getState();
  assert.equal(s.canSpin, true);
  assert.deepEqual(s.lastPrize, prize);
});

test('works when storage throws', () => {
  const boom = () => { throw new Error('denied'); };
  for (const storage of [{ getItem: boom, setItem: boom }, null]) {
    const limit = createSpinLimit({ storage, now: () => 0 });
    assert.equal(limit.getState().canSpin, true);
    assert.doesNotThrow(() => limit.record(prize));
  }
});

test('ignores corrupt stored value', () => {
  for (const bad of ['not json', '{}', '{"spunAt":"x"}', 'null', '{"spunAt":5}']) {
    const s = createSpinLimit({ storage: fakeStorage({ [STORAGE_KEY]: bad }), now: () => 10 }).getState();
    assert.equal(s.canSpin, true, bad);
    assert.equal(s.lastPrize, null, bad);
  }
});

test('future timestamp does not lock user', () => {
  const now = 1_000_000;
  const stored = JSON.stringify({ spunAt: now + 10 * 3_600_000, prize });
  const s = createSpinLimit({ storage: fakeStorage({ [STORAGE_KEY]: stored }), now: () => now }).getState();
  assert.equal(s.canSpin, true);
});

test('formatRemaining', () => {
  assert.equal(formatRemaining(3_599_000), '59:59');
  assert.equal(formatRemaining(61_000), '01:01');
  assert.equal(formatRemaining(500), '00:01');
  assert.equal(formatRemaining(0), '00:00');
});
