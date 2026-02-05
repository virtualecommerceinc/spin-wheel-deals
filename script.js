const wheel = document.getElementById('wheel');
const ctx = wheel.getContext('2d');
const btn = document.getElementById('spin-btn');
const btnText = document.getElementById('spin-btn-text');
const msg = document.getElementById('message');
const wheelContainer = document.getElementById('wheel-container');

let sectors = [];
let rotation = 0;            // stable rotation state (radians)
let isSpinning = false;
let pendingAmazonLink = '';  // set after spin; click button to open

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
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

  // simplest split (labels are short now)
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

function drawWheel() {
  if (!sectors.length) return;

  const size = wheel.width;
  const center = size / 2;
  const radius = center * 0.92;

  ctx.clearRect(0, 0, size, size);

  // Outer subtle ring
  ctx.beginPath();
  ctx.arc(center, center, radius, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(255,255,255,0.06)';
  ctx.fill();

  const slice = (Math.PI * 2) / sectors.length;

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

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

    // Label
    ctx.save();
    ctx.translate(center, center);
    ctx.rotate(start + slice / 2);

    ctx.fillStyle = 'rgba(255,255,255,0.95)';
    ctx.shadowColor = 'rgba(0,0,0,0.25)';
    ctx.shadowBlur = Math.floor(size / 90);

    const startPx = clamp(Math.floor(size / 16), 16, 28);
    const minPx = 12;
    const maxWidth = radius * 0.58;

    ctx.translate(radius * 0.62, 0);
    drawFittedLabel((s.label || ''), maxWidth, startPx, minPx);

    ctx.restore();
  }

  // Center hub
  ctx.beginPath();
  ctx.arc(center, center, radius * 0.18, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(0,0,0,0.18)';
  ctx.fill();

  ctx.beginPath();
  ctx.arc(center, center, radius * 0.12, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(255,255,255,0.16)';
  ctx.fill();
}

function resetCTA() {
  pendingAmazonLink = '';
  btn.disabled = false;
  btnText.textContent = 'Let Your Dog Choose!';
  msg.textContent = '';
}

function openPupPick() {
  if (!pendingAmazonLink) return;

  // User-initiated navigation (safe). Open in new tab.
  window.open(pendingAmazonLink, '_blank', 'noopener,noreferrer');

  // Reset UI for next spin (optional; keeps experience clean)
  resetCTA();
}

function spinOnce() {
  if (!sectors.length) return;
  if (isSpinning) return;

  // If we already have a pending pick, button click should open it (not spin again)
  if (pendingAmazonLink) {
    openPupPick();
    return;
  }

  isSpinning = true;
  btn.disabled = true;
  msg.textContent = '';

  const targetIndex = Math.floor(Math.random() * sectors.length);

  const slice = (Math.PI * 2) / sectors.length;
  const targetAngle = targetIndex * slice + slice / 2;

  const extraSpins = (Math.random() * 3 + 6) * Math.PI * 2; // 6–9 full spins
  const finalRotation = (Math.PI * 2 - targetAngle) + extraSpins;

  wheel.style.transition = 'transform 5s cubic-bezier(0.12, 0.85, 0.12, 1)';
  setWheelRotation(finalRotation);

  window.setTimeout(() => {
    const normalized = ((finalRotation % (Math.PI * 2)) + (Math.PI * 2)) % (Math.PI * 2);
    wheel.style.transition = 'none';
    setWheelRotation(normalized);

    const sector = sectors[targetIndex] || {};
    const amazonLink = (sector.link || '').toString().trim();

    // IMPORTANT: No on-page reveal. Amazon is the reveal.
    pendingAmazonLink = amazonLink;

    msg.textContent = '🐾 Your pup made a pick…';

    if (pendingAmazonLink) {
      btnText.textContent = "See your pup’s pick";
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
// - If pending link => open Amazon
btn.addEventListener('click', () => spinOnce());

// Click/tap wheel spins only (not open link)
wheelContainer.addEventListener('click', () => {
  if (!pendingAmazonLink) spinOnce();
});

wheelContainer.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault();
    if (!pendingAmazonLink) spinOnce();
  }
});
