const wheel = document.getElementById('wheel');
const ctx = wheel.getContext('2d');
const btn = document.getElementById('spin-btn');
const msg = document.getElementById('message');

let sectors = [];
let rotation = 0; // stable rotation state (radians)

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

    const label = (s.label || '').toString();
    ctx.fillText(label, radius * 0.62, 0);

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

// Keep wheel crisp + correctly sized on resize
window.addEventListener('resize', () => {
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

    const sector = sectors[targetIndex] || {};
    const safeLabel = (sector.label || 'Mystery Toy').toString();

    // Support either "image" (new) or "svg" (legacy)
    const imgSrc = sector.image || sector.svg || '';
    const imgHtml = imgSrc
      ? `<img src="${imgSrc}" alt="${safeLabel}" class="toy-img" />`
      : '';

    // Amazon link (direct)
    const amazonLink = sector.link || '';

    msg.innerHTML =
      `🎉 Your pup picked <strong>${safeLabel}</strong>!<br>` +
      `${imgHtml}<br>` +
      (amazonLink
        ? `<a href="${amazonLink}" target="_blank" rel="nofollow sponsored noopener noreferrer">See this toy on Amazon</a>`
        : `<span>Link coming soon.</span>`);

    btn.disabled = false;
  }, 5050);
});
