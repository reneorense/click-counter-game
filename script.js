
/* =========================================
   Click Frenzy – game logic
   ========================================= */

// ---------- Elements ----------
const scoreEl  = document.getElementById('score');
const cpsEl    = document.getElementById('cps');
const bestEl   = document.getElementById('best');
const clickBtn = document.getElementById('clickBtn');

// ---------- Settings (tweak to change difficulty) ----------
const DECAY_GRACE  = 400;  // ms of quiet time before score starts melting
const DECAY_TICK   = 100;  // ms between melt steps
const DECAY_AMOUNT = 1;    // points lost per melt step

// ---------- State ----------
let score         = 0;
let best          = Number(localStorage.getItem('clickFrenzyBest') || 0);
let clickTimes    = [];    // timestamps of clicks in the last second
let lastClickTime = 0;

bestEl.textContent = best;

// ---------- Clicking ----------

// pointerdown = works with mouse, touch and pen, and feels instant
clickBtn.addEventListener('pointerdown', handlePress);

// Keyboard support (Space / Enter)
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

  // Squish the button briefly
  clickBtn.classList.add('pressed');
  clearTimeout(clickBtn._pressTimer);
  clickBtn._pressTimer = setTimeout(
    () => clickBtn.classList.remove('pressed'),
    90
  );

  // Find where to spawn the emoji (keyboard presses have no coordinates)
  let x = e.clientX;
  let y = e.clientY;
  if (x === undefined || y === undefined) {
    const rect = clickBtn.getBoundingClientRect();
    x = rect.left + rect.width / 2;
    y = rect.top + rect.height / 2;
  }

  spawnEmoji(x, y);
  playBoop(score);

  // New personal best?
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
    void scoreEl.offsetWidth; // force reflow so the animation replays
    scoreEl.classList.add('pop');
  }
}

// ---------- Main loop: CPS meter + melting decay ----------
setInterval(() => {
  const now = performance.now();

  // 1. Clicks per second = number of clicks in the last 1000 ms
  clickTimes = clickTimes.filter(t => now - t < 1000);
  cpsEl.textContent = clickTimes.length;

  // 2. Melt the score if the player stopped clicking
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

// Simple beep that gets higher in pitch as the score climbs
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
    /* Audio isn't available – the game still works fine */
  }
}
