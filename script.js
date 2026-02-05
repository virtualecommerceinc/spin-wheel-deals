const wheel = document.getElementById('wheel');
const ctx = wheel.getContext('2d');
const btn = document.getElementById('spin-btn');
const msg = document.getElementById('message');
const pointer = document.querySelector('.paw-pointer');
let sectors = [];
let size, center, radius;

// Load toy sectors
fetch('data/toys.json')
  .then(res => res.json())
  .then(data => {
    sectors = data;
    drawWheel();
  })
  .catch(err => console.error('Error loading toys:', err));

// Draw the wheel segments
function drawWheel() {
  size = wheel.width;
  center = size / 2;
  radius = size / 2 - 10;
  ctx.clearRect(0, 0, size, size);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `${Math.floor(size / 15)}px sans-serif`;

  sectors.forEach((s, i) => {
    const angle = (i / sectors.length) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(center, center);
    ctx.arc(center, center, radius, angle, angle + (Math.PI * 2 / sectors.length));
    ctx.fillStyle = s.color;
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.save();
    ctx.translate(center, center);
    ctx.rotate(angle + Math.PI / sectors.length);
    ctx.fillText(s.label, radius * 0.65, 0);
    ctx.restore();
  });
}

// Spin button handler
btn.addEventListener('click', () => {
  if (!sectors.length) return;
  btn.disabled = true;
  msg.textContent = '';
  pointer.hidden = true;

  const spins = Math.random() * 6 + 6;
  const finalAngle = spins * Math.PI * 2;
  wheel.style.transition = 'transform 5s ease-out';
  wheel.style.transform = `rotate(${finalAngle}rad)`;

  // After spin completes
  setTimeout(() => {
    const normalized = finalAngle % (Math.PI * 2);
    const idx = Math.floor(((Math.PI * 2 - normalized) / (Math.PI * 2)) * sectors.length) % sectors.length;
    const sector = sectors[idx];

    // Display result with image and link
    msg.innerHTML = `Congratulations! You got <strong>${sector.label}</strong>!<br>` +
                    `<img src="${sector.svg}" alt="${sector.label}" class="toy-img" /><br>` +
                    `<a href="result.html${sector.link}">Claim Your Toy</a>`;
    pointer.hidden = false;
    btn.disabled = false;

    // Reset wheel rotation for next spin
    wheel.style.transition = '';
    wheel.style.transform = `rotate(${normalized}rad)`;
  }, 5000);
});
