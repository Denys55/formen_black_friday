/** @typedef {import('./config.js').Prize} Prize */
import { segmentAngle, segmentColorIndex, labelFontSize, LABEL_RADIUS } from './wheel-geometry.js';

const SVG_NS = 'http://www.w3.org/2000/svg';
const R = 100;

const el = (name, attrs) => {
  const node = document.createElementNS(SVG_NS, name);
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, String(v));
  return node;
};

// Angle in degrees, clockwise from 12 o'clock -> point on circle.
const point = (deg, r) => {
  const rad = (deg * Math.PI) / 180;
  return [r * Math.sin(rad), -r * Math.cos(rad)].map((v) => v.toFixed(3)).join(' ');
};

/**
 * Draw one sector + label per prize into the rotor group.
 * @param {SVGGElement} rotor
 * @param {Prize[]} prizes
 */
export function renderWheel(rotor, prizes) {
  rotor.replaceChildren();
  const n = prizes.length;
  const seg = segmentAngle(n);

  prizes.forEach((prize, i) => {
    const cls = `wheel__segment wheel__segment--${segmentColorIndex(i, n)}`;
    if (n === 1) {
      rotor.append(el('circle', { r: R, class: cls }));
    } else {
      const a0 = i * seg;
      const a1 = a0 + seg;
      const large = seg > 180 ? 1 : 0;
      rotor.append(el('path', {
        d: `M0 0 L${point(a0, R)} A${R} ${R} 0 ${large} 1 ${point(a1, R)} Z`,
        class: cls,
      }));
    }

    const mid = i * seg + seg / 2;
    const label = el('text', {
      class: 'wheel__segment-label',
      'font-size': labelFontSize(prize.label, n).toFixed(2),
      'text-anchor': 'middle',
      'dominant-baseline': 'central',
      // Radial label along the bisector; flipped on the left half so it never reads upside down.
      transform: mid > 180
        ? `rotate(${(mid + 90).toFixed(3)}) translate(${-LABEL_RADIUS} 0)`
        : `rotate(${(mid - 90).toFixed(3)}) translate(${LABEL_RADIUS} 0)`,
    });
    label.textContent = prize.label;
    rotor.append(label);
  });
}

/**
 * Animate the rotor to an absolute rotation. Resolves when the CSS transition ends.
 * @param {SVGGElement} rotor
 * @param {number} rotationDeg
 * @returns {Promise<void>}
 */
export function spinWheel(rotor, rotationDeg) {
  return new Promise((resolve) => {
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      rotor.removeEventListener('transitionend', onEnd);
      clearTimeout(timer);
      resolve();
    };
    const onEnd = (e) => { if (e.target === rotor) finish(); };
    const timer = setTimeout(finish, 6000);
    rotor.addEventListener('transitionend', onEnd);
    rotor.style.transform = `rotate(${rotationDeg}deg)`;
  });
}
