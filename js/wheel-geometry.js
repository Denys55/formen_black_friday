// Pointer is fixed at 12 o'clock. Segment i covers [i*seg, (i+1)*seg) degrees
// clockwise from the top at rotation 0; the wheel turns clockwise as rotation grows.

const mod = (a, m) => ((a % m) + m) % m;

export function segmentAngle(n) {
  return 360 / n;
}

/**
 * Absolute rotation (deg) that lands the pointer inside segment `index`,
 * always at least (fullTurns - 1) full turns ahead of `current`.
 */
export function targetRotation(current, index, n, rng = Math.random, fullTurns = 6) {
  const seg = segmentAngle(n);
  const jitter = (rng() - 0.5) * 0.7 * seg; // stay inside the segment, away from its edges
  const desired = mod(360 - (index + 0.5) * seg + jitter, 360);
  let result = current - mod(current, 360) + fullTurns * 360 + desired;
  if (result - current < (fullTurns - 1) * 360) result += 360;
  return result;
}

/** 0/1 alternate; with an odd count the last segment gets 2 so it never matches segment 0. */
export function segmentColorIndex(i, n) {
  if (n % 2 === 1 && i === n - 1) return 2;
  return i % 2;
}
