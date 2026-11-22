import { loadConfig } from './config.js';
import { pickPrizeIndex } from './picker.js';
import { targetRotation } from './wheel-geometry.js';
import { createSpinLimit, formatRemaining } from './spin-limit.js';
import { renderWheel, spinWheel } from './wheel-view.js';
import { showResult } from './result-view.js';

const $ = (id) => document.getElementById(id);

function getStorage() {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

async function init() {
  const rotor = $('wheel-rotor');
  const spinBtn = $('spin-btn');
  const cooldownEl = $('cooldown');
  const resultEl = $('result');

  let prizes;
  try {
    ({ prizes } = await loadConfig());
  } catch (e) {
    console.error(e);
    $('wheel-block').hidden = true;
    const err = $('error');
    err.textContent = 'Не вдалося завантажити акцію. Спробуйте оновити сторінку пізніше.';
    err.hidden = false;
    return;
  }

  renderWheel(rotor, prizes);
  const limit = createSpinLimit({ storage: getStorage() });
  let rotation = 0;
  let spinning = false;
  let cooldownTimer = null;

  function updateCooldown() {
    const { canSpin, remainingMs } = limit.getState();
    if (canSpin) {
      clearInterval(cooldownTimer);
      cooldownTimer = null;
      cooldownEl.hidden = true;
      spinBtn.disabled = false;
      spinBtn.textContent = 'Крутити';
      return;
    }
    spinBtn.disabled = true;
    cooldownEl.innerHTML = '';
    cooldownEl.append('Наступна спроба через ');
    const b = document.createElement('b');
    b.textContent = formatRemaining(remainingMs);
    cooldownEl.append(b);
    cooldownEl.hidden = false;
  }

  function startCooldown() {
    updateCooldown();
    if (!cooldownTimer && !limit.getState().canSpin) {
      cooldownTimer = setInterval(updateCooldown, 1000);
    }
  }

  const initial = limit.getState();
  if (!initial.canSpin && initial.lastPrize) {
    showResult(resultEl, initial.lastPrize, initial.spunAt);
    startCooldown();
  }

  spinBtn.addEventListener('click', async () => {
    if (spinning || !limit.getState().canSpin) return;
    spinning = true;
    spinBtn.disabled = true;
    spinBtn.textContent = 'Крутимо…';
    resultEl.hidden = true;

    const index = pickPrizeIndex(prizes);
    rotation = targetRotation(rotation, index, prizes.length);
    await spinWheel(rotor, rotation);

    const prize = prizes[index];
    limit.record(prize);
    showResult(resultEl, prize, limit.getState().spunAt ?? Date.now());
    resultEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
    spinning = false;
    spinBtn.textContent = 'Крутити';
    startCooldown();
  });
}

init();
