# Black Friday Discount Wheel Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A one-page Ukrainian-language Black Friday site for For Men. The visitor spins a discount wheel once per hour and gets a promo code. Online, they copy the code and paste it into the cart on for-men.ua. In the store, they show the screen (code + QR) to the cashier.

**Architecture:** Static files only. `index.html` loads ES modules from `js/`. Pure logic (config parsing, prize choice, wheel geometry, hourly limit) lives in DOM-free modules covered by `node --test`. Two thin view modules (`wheel-view.js`, `result-view.js`) and `app.js` wire the logic to the DOM. The wheel is an SVG built at runtime from `data/promocodes.json`.

**Tech Stack:** HTML, CSS, vanilla JS (ES modules). `node --test` (Node 20, built in, no npm packages) for unit tests. `qrcode-generator@1.4.4` from cdnjs for QR codes. Google Fonts Montserrat. `python3 -m http.server` for local serving.

**Spec:** `CLAUDE.md` (project requirements) + this plan.

## Global Constraints

- Allowed stack: HTML + CSS + vanilla JS. No frameworks, bundlers or `npm install`. `package.json` exists only to set `"type": "module"` and the `test` script.
- All user-facing text is in Ukrainian and uses the exact copy in Task 4. "Black Friday" / "BLACK FRIDAY" is the only English allowed.
- Cooldown: one spin per **3 600 000 ms**, stored in `localStorage` key `formen_bf_spin_v1`.
- Wheel segments come **only** from `data/promocodes.json`. Nothing about the segments is hard-coded.
- Brand: red `#C62440` (sampled from the logo), black `#0B0B0B`, white `#FFFFFF`, font Montserrat (400/700/900, `latin,cyrillic`). The live for-men.ua could not be fetched from this environment (HTTP 403), so the palette and font are approximations. Every color and font is a CSS custom property in `:root` so they can be swapped in one place.
- Links: main site `https://for-men.ua`, Instagram `https://www.instagram.com/formenua`, Telegram `https://t.me/formenuaclub`, all with `target="_blank" rel="noopener"`.
- Redemption online = the customer **copies the code** and pastes it into the for-men.ua cart. The copy button is the primary action on the result screen. The "go to site" link is plain `https://for-men.ua`, with no promo URL parameter. The QR code encodes **the promo code text itself**, so a cashier can scan it, or the code can be moved to another device.
- Must work on mobile from 320px wide, including in-app browsers (Instagram, Telegram) where `localStorage` may throw.

## Review Focus

1. **`localStorage` unavailable or throwing** (Safari private mode, in-app browsers): spinning must still work, just without the limit. Test: `spin-limit.test.js › works when storage throws`.
2. **Corrupt or old stored value** (bad JSON, missing fields): treat it as "never spun", don't crash. Test: `spin-limit.test.js › ignores corrupt stored value`.
3. **Device clock moved backward** (stored timestamp in the future): don't lock the user out for longer than an hour. Test: `spin-limit.test.js › future timestamp does not lock user`.
4. **Odd number of prizes**: the first and last segments must not share a color. Test: `wheel-geometry.test.js › odd count has no adjacent equal colors`.
5. **Owner breaks `promocodes.json`** (syntax error, empty list, every entry invalid): show the Ukrainian error message, not a blank page. Test: `config.test.js › throws ConfigError when no valid prizes`, plus the manual check in Task 6.

---

## File Structure

```
index.html              page markup, loads css + js/app.js (module) + qrcode lib
css/styles.css          all styles; tokens in :root
data/promocodes.json    owner-edited prizes (the only place prizes live)
assets/logo.png         web export of materials/logo/Логотип Формэн.jpg
js/config.js            parse/validate JSON
js/picker.js            weighted random prize choice
js/wheel-geometry.js    angles, target rotation, segment colors
js/spin-limit.js        hourly limit over localStorage, countdown format
js/wheel-view.js        render SVG wheel, animate spin
js/result-view.js       render result block (code, copy, QR, link)
js/app.js               orchestration
tests/*.test.js         node --test unit tests for the four pure modules
package.json            {"type":"module","private":true,"scripts":{"test":"node --test"}}
README.md               how to edit promocodes.json and run locally (Ukrainian)
```

Shared type, used by every module:

```js
/** @typedef {{ code: string, discount: number, label: string, weight: number }} Prize */
```

---

### Task 1: Scaffold + config module

**Files:**
- Create: `package.json`, `.gitignore` (`.DS_Store`, `.idea/`), `data/promocodes.json`, `js/config.js`, `tests/config.test.js`, `README.md`

**Interfaces:**
- Produces:
  - `parseConfig(raw: unknown) -> { prizes: Prize[] }`
  - `class ConfigError extends Error`
  - `loadConfig(url = 'data/promocodes.json') -> Promise<{ prizes: Prize[] }>`: `fetch` with `cache: 'no-cache'`, then `parseConfig`. Network or JSON errors are rethrown as `ConfigError`.

- [ ] **Step 1: Init repo and scaffold**

Run `git init`. Create `package.json` and `.gitignore` as listed. Create `data/promocodes.json`:

```json
{
  "prizes": [
    { "code": "BF5",  "discount": 5,  "weight": 30 },
    { "code": "BF10", "discount": 10, "weight": 25 },
    { "code": "BF15", "discount": 15, "weight": 20 },
    { "code": "BF20", "discount": 20, "weight": 12 },
    { "code": "BF25", "discount": 25, "weight": 8 },
    { "code": "BF30", "discount": 30, "weight": 5 }
  ]
}
```

Per-entry rules: `code` is a required non-empty string (trimmed). `discount` is a required number in the range 0–100 (exclusive of 0, inclusive of 100). `label` is an optional string and defaults to `` `-${discount}%` ``. `weight` is an optional positive number and defaults to `1`.

- [ ] **Step 2: Write failing tests** in `tests/config.test.js`:
  - `defaults label and weight`: `{prizes:[{code:'A',discount:10}]}` → prize `{code:'A',discount:10,label:'-10%',weight:1}`.
  - `keeps custom label`: `label:'Подарунок'` is kept.
  - `skips invalid entries`: entries `{discount:10}`, `{code:'',discount:5}`, `{code:'X',discount:0}`, `{code:'Y',discount:150}`, `{code:'Z',discount:10,weight:-1}` plus one valid entry → only the valid one is returned.
  - `throws ConfigError when no valid prizes`: for `{prizes:[]}`, `{}`, `null`, `{prizes:[{code:''}]}`, it throws and the error is an `instanceof ConfigError`.
  - `trims code`: `code:'  BF5 '` → `'BF5'`. Stray spaces would break pasting the code into the cart.

- [ ] **Step 3: Run** `npm test`. Expected: FAIL (module not found).
- [ ] **Step 4: Implement `js/config.js`.** Skip invalid entries with `console.warn`. No DOM access.
- [ ] **Step 5: Run** `npm test`. Expected: all config tests PASS.
- [ ] **Step 6: Write `README.md`** (Ukrainian): how to edit `promocodes.json` (field meanings, what `weight` does; each `code` must also exist as an active promo code in the for-men.ua shop admin), how to run locally with `python3 -m http.server 8000`, and how to run tests with `npm test`.
- [ ] **Step 7: Commit** `feat: scaffold project and promo config parser`.

---

### Task 2: Prize picker + wheel geometry

**Files:**
- Create: `js/picker.js`, `js/wheel-geometry.js`, `tests/picker.test.js`, `tests/wheel-geometry.test.js`

**Interfaces:**
- Consumes: `Prize` (Task 1).
- Produces:
  - `pickPrizeIndex(prizes: Prize[], rng = Math.random) -> number`: weighted choice.
  - `segmentAngle(n: number) -> number`: `360 / n`.
  - `targetRotation(current: number, index: number, n: number, rng = Math.random, fullTurns = 6) -> number`: the absolute rotation in degrees.
  - `segmentColorIndex(i: number, n: number) -> 0 | 1 | 2`.

Geometry convention: the pointer is fixed at the top (12 o'clock). Segment `i` covers `[i*seg, (i+1)*seg)` degrees, measured clockwise from the top, when rotation is 0. The wheel rotates clockwise as rotation grows.

`targetRotation` algorithm (not determined by the signature):
```
seg = 360/n
jitter = (rng() - 0.5) * 0.7 * seg          // stay inside segment, away from edges
desired = mod(360 - (index + 0.5) * seg + jitter, 360)
base = current - mod(current, 360) + fullTurns * 360
result = base + desired; if (result - current < fullTurns * 360 - 360) result += 360   // always ≥ (fullTurns-1) turns forward
```

`segmentColorIndex`: returns `i % 2`. When `n` is odd and `i === n - 1`, it returns `2`.

- [ ] **Step 1: Write failing tests**
  - picker: `respects weights`: prizes with weights `[1,3]`; `rng=()=>0.2` → 0; `rng=()=>0.3` → 1; `rng=()=>0.999` → 1.
  - picker: `equal weights`: 4 prizes of weight 1, `rng=()=>0.5` → 2.
  - geometry: `lands pointer on chosen segment`: for every `n` in `[2,3,6,7,12]`, every `index < n`, and `rng` in `[()=>0, ()=>0.5, ()=>0.999]`: let `r = targetRotation(123, index, n, rng)`. The segment under the pointer, `Math.floor(mod(360 - mod(r,360), 360) / seg)`, must equal `index`, and `r - 123 >= 5*360`.
  - geometry: `odd count has no adjacent equal colors`: for `n` in `2..13`, `segmentColorIndex(i,n) !== segmentColorIndex((i+1)%n,n)` for all `i`.
- [ ] **Step 2: Run** `npm test`. Expected: the new tests FAIL.
- [ ] **Step 3: Implement both modules** (pure, no DOM).
- [ ] **Step 4: Run** `npm test`. Expected: all PASS.
- [ ] **Step 5: Commit** `feat: weighted prize picker and wheel geometry`.

---

### Task 3: Hourly spin limit

**Files:**
- Create: `js/spin-limit.js`, `tests/spin-limit.test.js`

**Interfaces:**
- Consumes: `Prize`.
- Produces:
  - `COOLDOWN_MS = 3_600_000`, `STORAGE_KEY = 'formen_bf_spin_v1'`
  - `createSpinLimit({ storage, now = Date.now }) -> { getState(): { canSpin: boolean, remainingMs: number, lastPrize: Prize|null, spunAt: number|null }, record(prize: Prize): void }`
  - `formatRemaining(ms: number) -> string`: `"MM:SS"`, with seconds rounded up.

The stored value is `JSON.stringify({ spunAt: number, prize: Prize })`. The whole prize object is stored so the result can still be shown if the owner later removes that code from the JSON. Every `storage` call is wrapped in try/catch. `storage` may be `null`.

- [ ] **Step 1: Write failing tests** using an in-memory fake storage (`getItem`/`setItem`) and a mutable `now`:
  - `fresh user can spin`: `canSpin:true, remainingMs:0, lastPrize:null`.
  - `blocks for an hour after record`: record at t=0. At t=1000: `canSpin:false`, `remainingMs:3_599_000`, `lastPrize` deep-equals the prize. At t=3_600_000: `canSpin:true`, and `lastPrize` is still returned.
  - `works when storage throws`: a storage whose methods throw → `getState()` gives `canSpin:true` and `record()` doesn't throw. Also `storage:null` → same.
  - `ignores corrupt stored value`: `'not json'`, `'{}'`, `'{"spunAt":"x"}'` → `canSpin:true, lastPrize:null`.
  - `future timestamp does not lock user`: stored `spunAt = now + 10*3_600_000` → `canSpin:true`.
  - `formatRemaining`: `3_599_000→"59:59"`, `61_000→"01:01"`, `500→"00:01"`, `0→"00:00"`.
- [ ] **Step 2: Run** `npm test`. Expected: FAIL.
- [ ] **Step 3: Implement `js/spin-limit.js`.** If `spunAt > now`, treat it as expired.
- [ ] **Step 4: Run** `npm test`. Expected: all PASS.
- [ ] **Step 5: Commit** `feat: hourly spin limit over localStorage`.

---

### Task 4: Page shell, styles, branding

**Files:**
- Create: `index.html`, `css/styles.css`, `assets/logo.png`

**Interfaces:**
- Produces DOM ids used by Tasks 5–6: `#wheel` (`<svg viewBox="-110 -110 220 220">` with an inner `<g id="wheel-rotor">`), `#spin-btn`, `#cooldown` (hidden by default), `#result` (hidden by default), `#error` (hidden by default).

- [ ] **Step 1: Export logo:** `sips -s format png --resampleWidth 600 "materials/logo/Логотип Формэн.jpg" --out assets/logo.png`. Expected: `assets/logo.png` exists and is under 100 KB.
- [ ] **Step 2: Write `index.html`** (`lang="uk"`, viewport meta, `<title>Black Friday у For Men</title>`, Montserrat via Google Fonts, `<script src="https://cdnjs.cloudflare.com/ajax/libs/qrcode-generator/1.4.4/qrcode.min.js">`, `<script type="module" src="js/app.js">`). Structure:
  - **Header:** white bar with the logo linking to `https://for-men.ua`. The logo's wordmark is black, so it needs the white bar.
  - **Hero** (black background): an eyebrow line `BLACK FRIDAY` in huge red/white type, heading `Крути барабан — вигравай знижку!`, and subline `Одна спроба на годину. Знижку можна використати на сайті або в магазині For Men.`
  - **Wheel block:** the SVG with a fixed red pointer triangle at the top, a centre hub with the small red logo mark, the `#spin-btn` button reading `Крутити`, and `#cooldown`.
  - `#result` and `#error` containers.
  - **Footer:** `Перейти на for-men.ua` (button), `Instagram`, `Telegram`, and `© For Men`.
- [ ] **Step 3: Write `css/styles.css`.**
  - `:root` tokens: `--red:#C62440; --black:#0B0B0B; --graphite:#1E1E1E; --white:#FFFFFF; --muted:#9A9A9A; --font:'Montserrat',system-ui,sans-serif`.
  - Dark page with red accents. Uppercase bold buttons with sharp corners (`border-radius:0`), echoing the square logo mark.
  - The wheel is `width:min(90vw,420px)`. `#wheel-rotor` gets `transform-origin:0 0` and `transition: transform var(--spin-ms,5s) cubic-bezier(.17,.67,.12,1)`.
  - `@media (prefers-reduced-motion: reduce)` sets `--spin-ms: 0.6s`.
  - The layout must not scroll horizontally at 320px.
- [ ] **Step 4: Verify:** run `python3 -m http.server 8000` and open http://localhost:8000. Expected: header, hero, empty wheel frame, button and footer render. The links open the correct URLs. No horizontal scroll at 320px in DevTools device mode. All visible text is Ukrainian (plus "Black Friday").
- [ ] **Step 5: Commit** `feat: page shell and For Men styling`.

---

### Task 5: Wheel rendering and animation

**Files:**
- Create: `js/wheel-view.js`

**Interfaces:**
- Consumes: `segmentAngle`, `segmentColorIndex` (Task 2), `#wheel-rotor` (Task 4).
- Produces:
  - `renderWheel(rotor: SVGGElement, prizes: Prize[]) -> void`: one `<path>` sector and one `<text>` label per prize, radius 100, centred at 0,0, segment `i` starting at angle `i*seg` clockwise from the top. Fill colors by index are `[--red, --black, --graphite]`. Labels are white, bold and rotated along the segment's bisector. Font size is `Math.max(8, Math.min(18, 120 / n))`, in SVG units.
  - `spinWheel(rotor: SVGGElement, rotationDeg: number) -> Promise<void>`: sets `rotor.style.transform = rotate(${deg}deg)` and resolves on `transitionend`, with a fallback `setTimeout` of 6000 ms (whichever comes first).

- [ ] **Step 1: Implement `js/wheel-view.js`.**
- [ ] **Step 2: Verify in the browser:** temporarily call `renderWheel` from the console with the 6 default prizes and with 7 prizes. Expected: labels are readable, there are no gaps between sectors, and no two neighbouring sectors share a color in the 7-prize case. Then call `spinWheel(rotor, targetRotation(0, 2, 6))`. Expected: the pointer stops inside segment 2 (`-15%`).
- [ ] **Step 3: Commit** `feat: SVG wheel rendering and spin animation`.

---

### Task 6: Result view + app wiring

**Files:**
- Create: `js/result-view.js`, `js/app.js`

**Interfaces:**
- Consumes: everything above.
- Produces:
  - `showResult(container: HTMLElement, prize: Prize, spunAt: number) -> void`
  - `copyText(text: string, fallbackEl: HTMLElement) -> Promise<boolean>`, exported from `result-view.js`. It tries `navigator.clipboard.writeText` first. If that fails, it selects `fallbackEl`'s text and runs `document.execCommand('copy')`. It returns whether the copy succeeded.
  - `app.js` has no exports and runs `init()` on load.

`showResult` renders, using this exact copy:
- `Вітаємо! Ваша знижка` + a large `{prize.label}`
- `Ваш промокод:` + the code in a large monospace box (`user-select:all`, so a long-press selects the whole code), and a prominent `Скопіювати` button. When `copyText` succeeds, the button shows `Скопійовано!` for 2 s. When it fails, the button shows `Виділіть код і скопіюйте вручну` and the code stays selected.
- The instruction `Скопіюйте промокод і вставте його в кошику на сайті for-men.ua. У магазині — покажіть цей екран касиру.`
- A QR code of `prize.code`: `qrcode(0,'M')`, `addData`, `make`, then `createSvgTag({cellSize:5, margin:2})`, shown on a white background. If `window.qrcode` is missing (CDN blocked), skip the QR code and keep everything else.
- `Отримано: {dd.mm.yyyy, HH:MM}`, using `toLocaleString('uk-UA')`, so the cashier can see when the discount was won.
- A link button `Перейти на for-men.ua` → `https://for-men.ua`.

`init()` flow:
1. `loadConfig()`. If it fails with a `ConfigError`, unhide `#error` with the text `Не вдалося завантажити акцію. Спробуйте оновити сторінку пізніше.`, hide the wheel block, and stop.
2. `renderWheel`. Create the spin limit with `storage = (() => { try { return window.localStorage } catch { return null } })()`.
3. If `!canSpin`: disable `#spin-btn`, show `showResult` for `lastPrize`, and start a 1-second interval that updates `#cooldown` to `Наступна спроба через {MM:SS}`. When it reaches zero, re-enable the button and hide `#cooldown`.
4. When `#spin-btn` is clicked: ignore the click if a spin is already running. Otherwise disable the button, change its text to `Крутимо…`, `pickPrizeIndex`, `targetRotation(currentRotation, ...)`, then `await spinWheel`, `record(prize)`, `showResult`, scroll the result into view, and start the cooldown (step 3).

- [ ] **Step 1: Implement `js/result-view.js` and `js/app.js`.**
- [ ] **Step 2: Run** `npm test`. Expected: all unit tests still PASS.
- [ ] **Step 3: Manual end-to-end check** at http://localhost:8000:
  - The wheel stops on segment X, and the result shows X's label and code. Repeat 3×, clearing `formen_bf_spin_v1` in DevTools between spins.
  - After a spin: reloading shows the same result and a counting-down timer, and the button is disabled. Double-clicking the button during a spin produces only one spin.
  - `Скопіювати` puts exactly the code (no spaces) on the clipboard; paste into a text field to confirm. Repeat inside the Instagram/Telegram in-app browser on a real phone, where the fallback path may be used. Scanning the QR code shows the code text.
  - Rename `promocodes.json` temporarily, or put a syntax error in it → the Ukrainian error message appears. Restore the file afterwards.
  - Set `localStorage` to `'garbage'` and reload → the page works and spinning is allowed.
  - Remove a prize from the JSON while its result is stored → the stored result still displays.
  - Mobile (DevTools at 360px plus a real phone over the LAN IP): the result is readable and nothing overflows.
- [ ] **Step 4: Commit** `feat: result view with QR and app wiring`.

---

## Open questions for the owner (do not block implementation)

1. Every `code` in `promocodes.json` must be created as an active promo code with the same discount in the for-men.ua shop admin. Otherwise the cart will reject it.
2. The real brand palette and font of for-men.ua. The tokens in `:root` are approximations, because the site was not reachable from the build environment.
3. Hosting (GitHub Pages, Netlify, the store's own hosting). Any static host works, and the in-store banner QR should point at the final URL.
