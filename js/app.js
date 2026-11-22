import { loadConfig } from './config.js';
import { pickPrizeIndex } from './picker.js';
import { targetRotation } from './wheel-geometry.js';
import { createSpinLimit } from './spin-limit.js';
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

  // The limit is not shown to the customer: the button just stays disabled until the hour passes.
  function updateCooldown() {
    if (limit.getState().canSpin) {
      clearInterval(cooldownTimer);
      cooldownTimer = null;
      spinBtn.disabled = false;
      spinBtn.textContent = 'Крутити';
      return;
    }
    spinBtn.disabled = true;
  }

  function startCooldown() {
    updateCooldown();
    if (!cooldownTimer && !limit.getState().canSpin) {
      cooldownTimer = setInterval(updateCooldown, 15000);
    }
  }

  // Always show the last won code (even after the hour) so it can be shown in the store later.
  const initial = limit.getState();
  if (initial.lastPrize) {
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
    const prize = prizes[index];
    // Record before the animation: reloading mid-spin must not grant a re-spin.
    limit.record(prize);
    rotation = targetRotation(rotation, index, prizes.length);
    await spinWheel(rotor, rotation);

    showResult(resultEl, prize, limit.getState().spunAt ?? Date.now());
    resultEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
    spinning = false;
    spinBtn.textContent = 'Крутити';
    startCooldown();
  });
}

init();
