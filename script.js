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

// State
let score         = 0;
let best          = Number(localStorage.getItem('clickFrenzyBest') || 0);
let sessionMax    = 0; // Tracks the highest score since the last reset
let currentTier   = 0; // 0=default, 1=1000s, 2=3000s, 3=5000s
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
  if (score > sessionMax) sessionMax = score;
  
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

// ---------- Visual Tier System ----------
function checkTiers() {
  let newTier = 0;
  
  // The user wants the background and button to upgrade at 1000, 3000, and 5000
  // We use sessionMax so if they hit 1000 and stop, it stays warp speed for a second
  // before melting back down (making the meltdown more painful!)
  if (sessionMax >= 5000) newTier = 3;
  else if (sessionMax >= 3000) newTier = 2;
  else if (sessionMax >= 1000) newTier = 1;

  // If the tier changed, update the classes
  if (newTier !== currentTier) {
    // Update Body classes (Background)
    document.body.classList.remove('tier-1', 'tier-2', 'tier-3');
    if (newTier > 0) document.body.classList.add(`tier-${newTier}`);

    // Update Button classes
    clickBtn.classList.remove('btn-tier-2', 'btn-tier-3');
    if (newTier === 2) clickBtn.classList.add('btn-tier-2');
    if (newTier === 3) clickBtn.classList.add('btn-tier-3');

    currentTier = newTier;
  }
}

// ---------- Main loop ----------
setInterval(() => {
  const now = performance.now();
  clickTimes = clickTimes.filter(t => now - t < 1000);
  cpsEl.textContent = clickTimes.length;

  // Handle melting
  const melting = score > 0 && now - lastClickTime > DECAY_GRACE;
  scoreEl.classList.toggle('melting', melting);

  if (melting) {
    score = Math.max(0, score - DECAY_AMOUNT);
    renderScore(false);
  }

  // Check if we need to change visuals
  checkTiers();

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
resetBtn.addEventListener('pointerdown', (e) => {
  e.preventDefault();
  score = 0;
  sessionMax = 0; // Resets the tier level
  clickTimes = [];
  lastClickTime = performance.now();
  scoreEl.classList.remove('melting');
  renderScore(true);
  
  // Instantly drop the visual tiers back to normal
  checkTiers();

  const rect = resetBtn.getBoundingClientRect();
  spawnEmoji(rect.left + rect.width / 2, rect.top);
});

// ---------- Install Button (PWA) ----------
const isStandalone =
  window.matchMedia('(display-mode: standalone)').matches ||
  window.navigator.standalone === true;

const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
let deferredPrompt = null;

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
