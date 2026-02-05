const wheel = document.getElementById('wheel');
const ctx = wheel.getContext('2d');
const btn = document.getElementById('spin-btn');
const msg = document.getElementById('message');
const dog = document.getElementById('dog');
let sectors = [];
let size, center, radius;

// Fetch sectors data and initialize
fetch('data/toys.json')
  .then(res => res.json())
  .then(data => {
    sectors = data;
    setupWheel();
  })
  .catch(err => console.error('Error loading data:', err));

function setupWheel() {
  size = wheel.width;
  center = size / 2;
  radius = size / 2 - 10;
  ctx.clearRect(0, 0, size, size);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = '14px sans-serif';

  sectors.forEach((s, i) => {
    const angle = (i / sectors.length) * 2 * Math.PI;
    ctx.beginPath();
    ctx.moveTo(center, center);
    ctx.arc(center, center, radius, angle, angle + 2 * Math.PI / sectors.length);
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

btn.addEventListener('click', () => {
  if (!sectors.length) return;
  btn.disabled = true;
  msg.textContent = '';
  dog.hidden = true;
  const spins = Math.random() * 8 + 8;
  const finalAngle = spins * 2 * Math.PI;
  wheel.style.transition = 'transform 4s ease-out';
  wheel.style.transform = `rotate(${finalAngle}rad)`;

  // Dog animation
  setTimeout(() => {
    dog.hidden = false;
    dog.classList.add('spin-animation');
  }, 3500);

  setTimeout(() => {
    const normalized = finalAngle % (2 * Math.PI);
    const idx = Math.floor((2 * Math.PI - normalized) / (2 * Math.PI) * sectors.length) % sectors.length;
    const sector = sectors[idx];

    msg.innerHTML = `Congratulations! You got <strong>${sector.label}</strong>.<br>` +
      `<img src="${sector.svg}" alt="Toy image" class="toy-img" /><br>` +
      `<a href="result.html${sector.link}">Claim Your Toy</a>`;
    dog.classList.remove('spin-animation');
    btn.disabled = false;
  }, 4500);
});