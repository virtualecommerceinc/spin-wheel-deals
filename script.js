const wheel = document.getElementById('wheel');
const ctx = wheel.getContext('2d');
const btn = document.getElementById('spin-btn');
const msg = document.getElementById('message');

let sectors = [];
let rotation = 0; // keep a stable rotation state (radians)

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

function resizeCanvasToDisplaySize() {
  // Match canvas internal pixels to its CSS size (fixes blur + prevents weird clipping)
  const rect = wheel.getBoundingClientRect();
  const cssSize = Math.floor(Math.min(rect.width, rect.height));
  const dpr = window.devicePixelRatio || 1;

  const px = Math.floor(cssSize * dpr);

  if (wheel.width !== px || wheel.height !== px) {
    wheel.width = px;
    wheel.height = px;
  }

  // Redraw after resize
  drawWheel();
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

  // Scale font with size
  const fontPx = clamp(Math.floor(size / 18), 16, 34);
  ctx.font = `800 ${fontPx}px system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // Draw segments
  for (let i = 0; i < sectors.length; i++) {
    const s = sectors[i];
    const start = i * slice;
    const end = start + slice;

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

    // Text
    ctx.save();
    ctx.translate(center, center);
    ctx.rotate(start + slice / 2);
    ctx.fillStyle = 'rgba(255,255,255,0.95)';
    ctx.shadowColor = 'rgba(0,0,0,0.25)';
    ctx.shadowBlur = Math.floor(size / 90);
    ctx.fillText(s.label, radius * 0.62, 0);
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

function setWheelRotation(rad) {
  rotation = rad;
  wheel.style.transform = `rotate(${rotation}rad)`;
}

// Load toy sectors
fetch('data/toys.json')
  .then(res => res.json())
  .then(data => {
    sectors = Array.isArray(data) ? data : [];
    resizeCanvasToDisplaySize();
    setWheelRotation(0);
  })
  .catch(err => console.error('Error loading toys:', err));

// Keep wheel crisp + correctly sized on resize/orientation changes
window.addEventListener('resize', () => {
  // debounce a bit to avoid spamming
  window.clearTimeout(window.__wheelResizeTimer);
  window.__wheelResizeTimer = window.setTimeout(resizeCanvasToDisplaySize, 120);
});

// Spin button handler
btn.addEventListener('click', () => {
  if (!sectors.length) return;

  btn.disabled = true;
  msg.textContent = '';

  // Choose a target sector index fairly
  const targetIndex = Math.floor(Math.random() * sectors.length);

  // Pointer is at top. We want the target sector's CENTER to land at angle 0 (top).
  const slice = (Math.PI * 2) / sectors.length;
  const targetAngle = targetIndex * slice + slice / 2;

  // Add extra spins + land precisely
  const extraSpins = (Math.random() * 3 + 6) * Math.PI * 2; // 6–9 full spins
  const finalRotation = (Math.PI * 2 - targetAngle) + extraSpins;

  // Animate from current rotation
  wheel.style.transition = 'transform 5s cubic-bezier(0.12, 0.85, 0.12, 1)';
  setWheelRotation(finalRotation);

  window.setTimeout(() => {
    // Normalize rotation to keep next spins stable
    const normalized = ((finalRotation % (Math.PI * 2)) + (Math.PI * 2)) % (Math.PI * 2);
    wheel.style.transition = 'none';
    setWheelRotation(normalized);

    const sector = sectors[targetIndex];

    // Display result with image and link (keep your current pattern)
    const safeLabel = sector.label || 'Mystery Toy';
    const img = sector.svg ? `<img src="${sector.svg}" alt="${safeLabel}" class="toy-img" />` : '';
    const link = sector.link ? `result.html${sector.link}` : 'result.html';

    msg.innerHTML =
      `🎉 Your pup picked <strong>${safeLabel}</strong>!<br>` +
      `${img}<br>` +
      `<a href="${link}">Claim Your Toy</a>`;

    btn.disabled = false;
  }, 5050);
});
