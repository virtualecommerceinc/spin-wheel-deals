const wheel = document.getElementById('wheel');
const ctx = wheel.getContext('2d');
const btn = document.getElementById('spin-btn');
const msg = document.getElementById('message');
const sectors = [
  {label:'10% OFF', color:'#e74c3c', link:'?deal=off10'},
  {label:'20% OFF', color:'#f1c40f', link:'?deal=off20'},
  {label:'Free Shipping', color:'#2ecc71', link:'?deal=shipfree'},
  {label:'5% Cashback', color:'#3498db', link:'?deal=cash5'}
];
const size = wheel.width;
const center = size/2;
const radius = size/2 - 10;

// draw wheel
sectors.forEach((s,i) => {
  const angle = (i / sectors.length) * 2 * Math.PI;
  ctx.beginPath();
  ctx.moveTo(center, center);
  ctx.arc(center, center, radius, angle, angle + 2*Math.PI/sectors.length);
  ctx.fillStyle = s.color;
  ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.save();
  ctx.translate(center, center);
  ctx.rotate(angle + Math.PI/sectors.length);
  ctx.fillText(s.label, radius*0.65, 0);
  ctx.restore();
});

// spin logic
btn.onclick = () => {
  btn.disabled = true;
  const spins = Math.random() * 10 + 10;
  const finalAngle = spins * 2*Math.PI;
  wheel.style.transition = 'transform 5s ease-out';
  wheel.style.transform = `rotate(${finalAngle}rad)`;
  setTimeout(() => {
    const normalized = finalAngle % (2*Math.PI);
    const idx = Math.floor((2*Math.PI - normalized) / (2*Math.PI) * sectors.length) % sectors.length;
    const sector = sectors[idx];
    msg.innerHTML = `Congratulations! You got <strong>${sector.label}</strong>.<br><a href="result.html${sector.link}">Claim Your Deal</a>`;
  }, 5000);
};
