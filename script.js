const wheel = document.getElementById('wheel');
const ctx = wheel.getContext('2d');

const btn = document.getElementById('spin-btn');
// Robust: support either #spin-btn-text OR the existing .paw-btn__text span
const btnText =
  document.getElementById('spin-btn-text') ||
  btn.querySelector('.paw-btn__text') ||
  btn;

const msg = document.getElementById('message');
const wheelContainer = document.getElementById('wheel-container');

let sectors = [];
let rotation = 0;            // stable rotation state (radians)
let isSpinning = false;
let pendingAmazonLink = '';  // set after spin; click button to open

// Crossfade control (0 = labels only, 1 = mystery only)
let mysteryMix = 0;

// Fun, generic icons that DON'T directly reveal the toy type.
const MYSTERY_ICONS = ['🐾', '🐶', '❤️', '🌈', '⭐', '🎁', '👀', '💥', '✨', '🦴'];

const TAU = Math.PI * 2;

// IMPORTANT:
// Your pointer is now at 3 o’clock (right side), so the pointer angle is 0 radians.
// If you ever move the pointer again:
// - top (12 o’clock) would be -Math.PI/2
// - left (9 o’clock) would be Math.PI
// - bottom (6 o’clock) would be Math.PI/2
const POINTER_ANGLE = 0;

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

function normAngle(rad) {
  return ((rad % TAU) + TAU) % TAU;
}

function resizeCanvasToDisplaySize() {
  const rect = wheel.getBoundingClientRect();
  const cssSize = Math.floor(Math.min(rect.width, rect.height));
  const dpr = window.devicePixelRatio || 1;

  const px = Math.floor(cssSize * dpr);
  if (wheel.width !== px || wheel.height !== px) {
    wheel.width = px;
    wheel.height = px;
  }
  drawWheel();
}

function setWheelRotation(rad) {
  rotation = rad;
  wheel.style.transform = `rotate(${rotation}rad)`;
}

/**
 * Compute which sector is under the pointer based on the wheel’s final rotation.
 * This is the key fix: it makes the button reveal ALWAYS match what the pointer shows.
 */
function getIndexUnderPointer(rotRad) {
  if (!sectors.length) return 0;

  const n = sectors.length;
  const slice = TAU / n;

  // CSS rotate(rad) rotates clockwise visually.
  // Sectors are drawn starting at 0 rad on the right (3 o’clock).
  // The angle under the pointer corresponds to "where the wheel's 0 ended up",
  // so we invert the rotation to map pointer space back to sector space.
  const r = normAngle(rotRad);

  // Angle in sector-space that currently sits under the pointer
  const angleAtPointer = normAngle(POINTER_ANGLE - r);

  // Convert angle to index:
  // Each sector occupies [i*slice, (i+1)*slice)
  let idx = Math.floor(angleAtPointer / slice);

  // Safety clamp
  idx = ((idx % n) + n) % n;
  return idx;
}

/**
 * Draw label that:
 * - uses a starting font size
 * - shrinks until it fits maxWidth
 * - if still too wide, splits into 2 lines (best effort)
 */
function drawFittedLabel(text, maxWidth, startPx, minPx) {
  const clean = (text || '').toString().trim();
  if (!clean) return;

  function setFont(px) {
    ctx.font = `800 ${px}px system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif`;
  }

  // 1) single-line shrink-to-fit
  let px = startPx;
  setFont(px);
  while (px > minPx && ctx.measureText(clean).width > maxWidth) {
    px -= 1;
    setFont(px);
  }

  if (ctx.measureText(clean).width <= maxWidth) {
    ctx.fillText(clean, 0, 0);
    return;
  }

  // 2) two-line split on spaces
  const parts = clean.split(/\s+/);
  if (parts.length === 1) {
    setFont(minPx);
    ctx.fillText(clean, 0, 0);
    return;
  }

  const best = { a: parts[0], b: parts.slice(1).join(' ') };

  px = Math.max(minPx, Math.floor(startPx * 0.85));
  setFont(px);

  while (
    px > minPx &&
    (ctx.measureText(best.a).width > maxWidth || ctx.measureText(best.b).width > maxWidth)
  ) {
    px -= 1;
    setFont(px);
  }

  const lineGap = Math.max(4, Math.floor(px * 0.25));
  ctx.fillText(best.a, 0, -lineGap);
  ctx.fillText(best.b, 0, lineGap);
}

function drawMysteryIcon(icon, sizePx) {
  ctx.font = `900 ${sizePx}px system-ui, Apple Color Emoji, Segoe UI Emoji, Noto Color Emoji, sans-serif`;
  ctx.fillText(icon, 0, 0);
}

function drawWheel() {
  if (!sectors.length) return;

  const size = wheel.width;
  const center = size / 2;
  const radius = center * 0.92;

  ctx.clearRect(0, 0, size, size);

  // Outer subtle ring
  ctx.beginPath();
  ctx.arc(center, center, radius, 0, TAU);
  ctx.fillStyle = 'rgba(255,255,255,0.06)';
  ctx.fill();

  const slice = TAU / sectors.length;

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // Label sizing
  const labelStartPx = clamp(Math.floor(size / 16), 16, 28);
  const labelMinPx = 12;
  const labelMaxWidth = radius * 0.58;

  // Icon sizing
  const iconPx = clamp(Math.floor(size / 10), 22, 44);

  for (let i = 0; i < sectors.length; i++) {
    const s = sectors[i];
    const start = i * slice;
    const end = start + slice;

    // Segment fill
    ctx.beginPath();
    ctx.moveTo(center, center);
    ctx.arc(center, center, radius, start, end);
    ctx.closePath();
    ctx.fillStyle = s.color || '#ffcc00';
    ctx.fill();

    // Segment divider
    ctx.strokeStyle = 'rgba(255,255,255,0.28)';
    ctx.lineWidth = Math.max(2, Math.floor(size / 180));
    ctx.stroke();

    // Content (labels and/or icons with crossfade mix)
    ctx.save();
    ctx.translate(center, center);
    ctx.rotate(start + slice / 2);

    // Position at consistent radius
    ctx.translate(radius * 0.62, 0);

    // Shadows
    ctx.shadowColor = 'rgba(0,0,0,0.25)';
    ctx.shadowBlur = Math.floor(size / 90);

    const labelText = (s.label || '').toString();
    const icon = MYSTERY_ICONS[i % MYSTERY_ICONS.length];

    const labelAlpha = clamp(1 - mysteryMix, 0, 1);
    const iconAlpha = clamp(mysteryMix, 0, 1);

    if (labelAlpha > 0.001) {
      ctx.save();
      ctx.fillStyle = `rgba(255,255,255,${0.95 * labelAlpha})`;
      drawFittedLabel(labelText, labelMaxWidth, labelStartPx, labelMinPx);
      ctx.restore();
    }

    if (iconAlpha > 0.001) {
      ctx.save();
      ctx.fillStyle = `rgba(255,255,255,${0.95 * iconAlpha})`;
      drawMysteryIcon(icon, iconPx);
      ctx.restore();
    }

    ctx.restore();
  }

  // Center hub
  ctx.beginPath();
  ctx.arc(center, center, radius * 0.18, 0, TAU);
  ctx.fillStyle = 'rgba(0,0,0,0.18)';
  ctx.fill();

  ctx.beginPath();
  ctx.arc(center, center, radius * 0.12, 0, TAU);
  ctx.fillStyle = 'rgba(255,255,255,0.16)';
  ctx.fill();
}

function resetCTA() {
  pendingAmazonLink = '';
  btn.disabled = false;
  btnText.textContent = 'Let Your Dog Choose!';
  msg.textContent = '';
  mysteryMix = 0;
  drawWheel();
}

function openPupPick() {
  if (!pendingAmazonLink) return;

  window.open(pendingAmazonLink, '_blank', 'noopener,noreferrer');
  resetCTA();
}

function crossfadeToMystery(durationMs = 220) {
  const start = performance.now();
  const from = mysteryMix;
  const to = 1;

  function step(t) {
    const p = clamp((t - start) / durationMs, 0, 1);
    const eased = p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;
    mysteryMix = from + (to - from) * eased;
    drawWheel();
    if (p < 1) requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}

function spinOnce() {
  if (!sectors.length) return;
  if (isSpinning) return;

  // If we already have a pending pick, button click reveals it (opens Amazon)
  if (pendingAmazonLink) {
    openPupPick();
    return;
  }

  isSpinning = true;
  btn.disabled = true;
  msg.textContent = '';

  crossfadeToMystery(220);

  const n = sectors.length;
  const slice = TAU / n;

  // Choose a target index (still fine)
  const targetIndex = Math.floor(Math.random() * n);

  // Center angle of the target slice in sector-space (0 = right)
  const targetAngle = targetIndex * slice + slice / 2;

  // 6–9 full spins
  const extraSpins = (Math.random() * 3 + 6) * TAU;

  // Rotate so the target center lands at the pointer angle.
  // For pointer at right, POINTER_ANGLE=0; this becomes TAU - targetAngle (mod TAU).
  const finalRotation = (POINTER_ANGLE - targetAngle) + extraSpins;

  wheel.style.transition = 'transform 5s cubic-bezier(0.12, 0.85, 0.12, 1)';
  setWheelRotation(finalRotation);

  window.setTimeout(() => {
    // Normalize and lock-in the final rotation
    const normalized = normAngle(finalRotation);
    wheel.style.transition = 'none';
    setWheelRotation(normalized);

    // ✅ CRITICAL FIX:
    // Determine the sector that is ACTUALLY under the pointer from the final rotation.
    const winnerIndex = getIndexUnderPointer(normalized);
    const sector = sectors[winnerIndex] || {};
    const amazonLink = (sector.link || '').toString().trim();

    pendingAmazonLink = amazonLink;

    // Keep wheel in mystery mode after spin
    mysteryMix = 1;
    drawWheel();

    msg.textContent = '🐾 Your pup made a pick…';

    if (pendingAmazonLink) {
      btnText.textContent = "Reveal your pup’s pick";
      btn.disabled = false;
    } else {
      btnText.textContent = 'Link coming soon';
      btn.disabled = true;
    }

    isSpinning = false;
  }, 5050);
}

// Load toy sectors (ROOT FILE: dog_toys.json)
fetch('dog_toys.json', { cache: 'no-store' })
  .then(res => {
    if (!res.ok) throw new Error(`Failed to load dog_toys.json (${res.status})`);
    return res.json();
  })
  .then(data => {
    sectors = Array.isArray(data) ? data : [];
    resizeCanvasToDisplaySize();
    setWheelRotation(0);
    resetCTA();
  })
  .catch(err => {
    console.error('Error loading toys:', err);
    msg.innerHTML = `⚠️ Couldn’t load toy list. Please refresh in a moment.<br><small>${String(err.message || err)}</small>`;
  });

window.addEventListener('resize', () => {
  window.clearTimeout(window.__wheelResizeTimer);
  window.__wheelResizeTimer = window.setTimeout(resizeCanvasToDisplaySize, 120);
});

// Button click:
// - If no pending link => spin
// - If pending link => open Amazon (reveal)
btn.addEventListener('click', () => spinOnce());

// Click/tap wheel spins only (never opens link)
wheelContainer.addEventListener('click', () => {
  if (!pendingAmazonLink) spinOnce();
});

wheelContainer.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault();
    if (!pendingAmazonLink) spinOnce();
  }
});
