const wheel = document.getElementById('wheel');
const ctx = wheel.getContext('2d');
const btn = document.getElementById('spin-btn');
const msg = document.getElementById('message');
const wheelContainer = document.getElementById('wheel-container');

let sectors = [];
let rotation = 0; // stable rotation state (radians)
let isSpinning = false;

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

function resizeCanvasToDisplaySize() {
  // Match canvas internal pixels to its CSS size (fixes blur + prevents clipping weirdness)
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

  // Helper to measure current font
  function setFont(px) {
    ctx.font = `800 ${px}px system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif`;
  }

  // 1) Try single-line shrink-to-fit
  let px = startPx;
  setFont(px);
  while (px > minPx && ctx.measureText(clean).width > maxWidth) {
    px -= 1;
    setFont(px);
  }

  // Fits single line
  if (ctx.measureText(clean).width <= maxWidth) {
    ctx.fillText(clean, 0, 0);
    return;
  }

  // 2) Still too long: try 2-line split on space
  const parts = clean.split(/\s+/);
  if (parts.length === 1) {
    // single word too long even at minPx; just draw it anyway at minPx
    setFont(minPx);
    ctx.fillText(clean, 0, 0);
    return;
  }

  // Build a reasonable two-line split
  let best = null;
  for (let i = 1; i < parts.length; i++) {
    const a = parts.slice(0, i).join(' ');
    const b = parts.slice(i).join(' ');
    best = { a, b };
    break; // simplest split; labels are short now
  }

  // Slightly smaller for two lines
  px = Math.max(minPx, Math.floor(startPx * 0.85));
  setFont(px);

  // Shrink until both lines fit
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

    // Base font sizing:
    // - slightly bigger on small canvases (mobile) so it doesn't look tiny
    // - but still capped so desktop doesn't get goofy
    const startPx = clamp(Math.floor(size / 16), 16, 28);
    const minPx = 12;

    // Max width allowed for label in this slice
    const maxWidth = radius * 0.58;

    // Position label at a consistent radius
    ctx.translate(radius * 0.62, 0);

    // We drew by translating, so fillText at (0,0)
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

function spinOnce() {
  if (!sectors.length) return;
  if (isSpinning) return;

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
    const safeLabel = (sector.label || 'Mystery Toy').toString();

    const imgSrc = sector.image || sector.svg || '';
    const imgHtml = imgSrc
      ? `<img src="${imgSrc}" alt="${safeLabel}" class="toy-img" />`
      : '';

    const amazonLink = sector.link || '';

    msg.innerHTML =
      `🎉 Your pup picked <strong>${safeLabel}</strong>!<br>` +
      `${imgHtml}<br>` +
      (amazonLink
        ? `<a href="${amazonLink}" target="_blank" rel="nofollow sponsored noopener noreferrer">See this toy on Amazon</a>`
        : `<span>Link coming soon.</span>`);

    btn.disabled = false;
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
  })
  .catch(err => {
    console.error('Error loading toys:', err);
    msg.innerHTML = `⚠️ Couldn’t load toy list. Please refresh in a moment.<br><small>${String(err.message || err)}</small>`;
  });

window.addEventListener('resize', () => {
  window.clearTimeout(window.__wheelResizeTimer);
  window.__wheelResizeTimer = window.setTimeout(resizeCanvasToDisplaySize, 120);
});

btn.addEventListener('click', () => spinOnce());
wheelContainer.addEventListener('click', () => spinOnce());
wheelContainer.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault();
    spinOnce();
  }
});
