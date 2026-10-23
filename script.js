/* =========================================
   Click Frenzy – game logic
   ========================================= */

// ---------- Elements ----------
const scoreEl    = document.getElementById('score');
const cpsEl      = document.getElementById('cps');
const bestEl     = document.getElementById('best');
const clickBtn   = document.getElementById('clickBtn');
const resetBtn   = document.getElementById('resetBtn');
const installBtn = document.getElementById('installBtn');

// ---------- Settings (tweak to change difficulty) ----------
const DECAY_GRACE  = 400;  // ms of quiet time before score starts melting
const DECAY_TICK   = 100;  // ms between melt steps
const DECAY_AMOUNT = 1;    // points lost per melt step

// ---------- State ----------
let score         = 0;
let best          = Number(localStorage.getItem('clickFrenzyBest') || 0);
let clickTimes    = [];
let lastClickTime = 0;

bestEl.textContent = best;

// ---------- Clicking ----------

clickBtn.addEventListener('pointerdown', handlePress);

clickBtn.addEventListener('keydown', (e) => {
  if ((e.key === ' ' || e.key === 'Enter') && !e.repeat) {
    e.preventDefault();
    handlePress(e);
  }
});

function handlePress(e) {
  score += 1;
  lastClickTime = performance.now();
  clickTimes.push(lastClickTime);

  renderScore(true);

  clickBtn.classList.add('pressed');
  clearTimeout(clickBtn._pressTimer);
  clickBtn._pressTimer = setTimeout(
    () => clickBtn.classList.remove('pressed'),
    90
  );

  let x = e.clientX;
  let y = e.clientY;
  if (x === undefined || y === undefined) {
    const rect = clickBtn.getBoundingClientRect();
    x = rect.left + rect.width / 2;
    y = rect.top + rect.height / 2;
  }

  spawnEmoji(x, y);
  playBoop(score);

  if (score > best) {
    best = score;
    bestEl.textContent = best;
    localStorage.setItem('clickFrenzyBest', best);
  }
}

// ---------- Rendering ----------

function renderScore(pop) {
  scoreEl.textContent = score;

  if (pop) {
    scoreEl.classList.remove('pop');
    void scoreEl.offsetWidth;
    scoreEl.classList.add('pop');
  }
}

// ---------- Main loop: CPS meter + melting decay ----------
setInterval(() => {
  const now = performance.now();

  clickTimes = clickTimes.filter(t => now - t < 1000);
  cpsEl.textContent = clickTimes.length;

  const melting = score > 0 && now - lastClickTime > DECAY_GRACE;
  scoreEl.classList.toggle('melting', melting);

  if (melting) {
    score = Math.max(0, score - DECAY_AMOUNT);
    renderScore(false);
  }
}, DECAY_TICK);

// ---------- Fun effects ----------

const EMOJIS = ['⭐', '✨', '🔥', '💥', '🎉', '💖', '🚀', '🌈'];

function spawnEmoji(x, y) {
  const el = document.createElement('span');
  el.className = 'pop-emoji';
  el.textContent = EMOJIS[Math.floor(Math.random() * EMOJIS.length)];
  el.style.left = x + 'px';
  el.style.top  = y + 'px';
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 800);
}

let audioCtx = null;

function playBoop(step) {
  try {
    audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
    const osc  = audioCtx.createOscillator();
    const gain = audioCtx.createGain();

    osc.type = 'sine';
    osc.frequency.value = 300 + Math.min(step, 30) * 20;

    gain.gain.setValueAtTime(0.08, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.12);

    osc.connect(gain).connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.12);
  } catch (err) {
    /* Audio not available – game still works */
  }
}

/* =========================================
   NEW: Reset button
   Resets the current score and CPS meter,
   but keeps the best score as a record.
   ========================================= */
resetBtn.addEventListener('click', () => {
  score = 0;
  clickTimes = [];
  lastClickTime = performance.now();
  scoreEl.classList.remove('melting');
  renderScore(true);

  // Quick visual flourish so kids know something happened
  const rect = resetBtn.getBoundingClientRect();
  spawnEmoji(rect.left + rect.width / 2, rect.top);
});

/* =========================================
   NEW: Install button (PWA)
   - Android/Chrome: shows the native install prompt
   - iOS Safari: shows step-by-step instructions
   - Already installed: button stays hidden
   ========================================= */

const isStandalone =
  window.matchMedia('(display-mode: standalone)').matches ||
  window.navigator.standalone === true;

const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);

let deferredPrompt = null;

// If already installed, never show the button
if (isStandalone) {
  installBtn.hidden = true;
}
// iOS never fires beforeinstallprompt – show the button with manual instructions
else if (isIOS) {
  installBtn.hidden = false;
}

// Android/Chrome/Edge: browser tells us the app is installable
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
  installBtn.hidden = false;
});

// Handle the install button tap
installBtn.addEventListener('click', async () => {
  if (isIOS) {
    alert(
      'To install on iPhone / iPad:\n\n' +
      '1. Tap the Share button (square with an arrow)\n' +
      '2. Scroll down and tap "Add to Home Screen"\n' +
      '3. Tap "Add"\n\n' +
      'The game will appear as an app icon on your home screen!'
    );
    return;
  }

  if (!deferredPrompt) return;

  deferredPrompt.prompt();
  const { outcome } = await deferredPrompt.userChoice;

  if (outcome === 'accepted') {
    installBtn.hidden = true;
  }
  deferredPrompt = null;
});

// Hide button once installation succeeds
window.addEventListener('appinstalled', () => {
  installBtn.hidden = true;
  deferredPrompt = null;
});
