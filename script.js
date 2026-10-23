/* =========================================
   Click Frenzy – game logic
   ========================================= */

const scoreEl    = document.getElementById('score');
const cpsEl      = document.getElementById('cps');
const bestEl     = document.getElementById('best');
const clickBtn   = document.getElementById('clickBtn');
const resetBtn   = document.getElementById('resetBtn');
const installBtn = document.getElementById('installBtn');

// Settings
const DECAY_GRACE  = 400;
const DECAY_TICK   = 100;
const DECAY_AMOUNT = 1;

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
  clickBtn._pressTimer = setTimeout(() => clickBtn.classList.remove('pressed'), 90);

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

function renderScore(pop) {
  scoreEl.textContent = score;
  if (pop) {
    scoreEl.classList.remove('pop');
    void scoreEl.offsetWidth;
    scoreEl.classList.add('pop');
  }
}

// ---------- Main loop ----------
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

// ---------- Effects ----------
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
  } catch (err) {}
}

// ---------- Reset Button ----------
// Switched to 'pointerdown' so it fires instantly on mobile
resetBtn.addEventListener('pointerdown', (e) => {
  e.preventDefault(); // Prevents weird focus/zoom behavior on mobile
  score = 0;
  clickTimes = [];
  lastClickTime = performance.now();
  scoreEl.classList.remove('melting');
  renderScore(true);
  const rect = resetBtn.getBoundingClientRect();
  spawnEmoji(rect.left + rect.width / 2, rect.top);
});

// ---------- Install Button (PWA) ----------
const isStandalone =
  window.matchMedia('(display-mode: standalone)').matches ||
  window.navigator.standalone === true;

const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
let deferredPrompt = null;

// If already installed, hide the button completely
if (isStandalone) {
  installBtn.hidden = true;
}

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
});

installBtn.addEventListener('click', async (e) => {
  e.preventDefault();

  if (isIOS) {
    alert('To install on iPhone/iPad:\n\n1. Tap the Share button (square with arrow)\n2. Scroll down and tap "Add to Home Screen"\n3. Tap "Add"');
    return;
  }

  // If the browser didn't trigger beforeinstallprompt (like DuckDuckGo, Firefox, etc.)
  if (!deferredPrompt) {
    alert('To install this game as an app on Android:\n\n1. Open this link in Google Chrome.\n2. Tap the three-dot menu (top right).\n3. Select "Install app" or "Add to Home screen".');
    return;
  }

  deferredPrompt.prompt();
  const { outcome } = await deferredPrompt.userChoice;
  if (outcome === 'accepted') {
    installBtn.hidden = true;
  }
  deferredPrompt = null;
});

window.addEventListener('appinstalled', () => {
  installBtn.hidden = true;
  deferredPrompt = null;
});
