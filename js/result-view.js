/** @typedef {import('./config.js').Prize} Prize */

const SITE_URL = 'https://for-men.ua';

const h = (tag, className, text) => {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
};

function selectText(node) {
  const range = document.createRange();
  range.selectNodeContents(node);
  const sel = window.getSelection();
  sel.removeAllRanges();
  sel.addRange(range);
}

/**
 * Copy text to the clipboard; falls back to selecting `fallbackEl` + execCommand.
 * @returns {Promise<boolean>} whether the copy succeeded
 */
export async function copyText(text, fallbackEl) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      selectText(fallbackEl);
      return document.execCommand('copy');
    } catch {
      return false;
    }
  }
}


/**
 * @param {HTMLElement} container
 * @param {Prize} prize
 * @param {number} spunAt epoch ms
 */
export function showResult(container, prize, spunAt) {
  const card = h('div', 'result__card');

  card.append(h('p', 'result__title', 'Вітаємо! Ваша знижка'));
  card.append(h('p', 'result__discount', prize.label));
  card.append(h('p', 'result__code-label', 'Ваш промокод:'));

  const code = h('code', 'result__code', prize.code);
  card.append(code);

  const copyBtn = h('button', 'btn btn--primary result__copy', 'Скопіювати');
  copyBtn.type = 'button';
  let resetTimer;
  copyBtn.addEventListener('click', async () => {
    clearTimeout(resetTimer);
    if (await copyText(prize.code, code)) {
      copyBtn.textContent = 'Скопійовано!';
      resetTimer = setTimeout(() => { copyBtn.textContent = 'Скопіювати'; }, 2000);
    } else {
      selectText(code);
      copyBtn.textContent = 'Виділіть код і скопіюйте вручну';
    }
  });
  card.append(copyBtn);

  card.append(h('p', 'result__hint',
    'Скопіюйте промокод і вставте його в кошику на сайті for-men.ua. У магазині — покажіть цей екран касиру.'));

  const when = new Date(spunAt).toLocaleString('uk-UA', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
  card.append(h('p', 'result__time', `Отримано: ${when}`));

  const site = h('a', 'btn btn--outline result__site', 'Перейти на for-men.ua');
  site.href = SITE_URL;
  site.target = '_blank';
  site.rel = 'noopener';
  card.append(site);

  container.replaceChildren(card);
  container.hidden = false;
}
