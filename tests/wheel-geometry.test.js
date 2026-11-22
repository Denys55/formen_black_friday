import { test } from 'node:test';
import assert from 'node:assert/strict';
import { segmentAngle, targetRotation, segmentColorIndex } from '../js/wheel-geometry.js';

const mod = (a, m) => ((a % m) + m) % m;

test('segmentAngle', () => {
  assert.equal(segmentAngle(6), 60);
});

test('lands pointer on chosen segment', () => {
  for (const n of [2, 3, 6, 7, 12]) {
    const seg = segmentAngle(n);
    for (let index = 0; index < n; index++) {
      for (const rng of [() => 0, () => 0.5, () => 0.999]) {
        const r = targetRotation(123, index, n, rng);
        const under = Math.floor(mod(360 - mod(r, 360), 360) / seg);
        assert.equal(under, index, `n=${n} index=${index} r=${r}`);
        assert.ok(r - 123 >= 5 * 360, `too few turns: n=${n} index=${index} r=${r}`);
      }
    }
  }
});

test('odd count has no adjacent equal colors', () => {
  for (let n = 2; n <= 13; n++) {
    for (let i = 0; i < n; i++) {
      assert.notEqual(segmentColorIndex(i, n), segmentColorIndex((i + 1) % n, n), `n=${n} i=${i}`);
    }
  }
});
