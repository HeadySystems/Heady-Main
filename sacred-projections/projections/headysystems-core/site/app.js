const indicator = document.querySelector('[data-pulse]');
const cycle = 29034;
let state = false;
setInterval(() => {
  state = !state;
  indicator.textContent = state ? `Auto-Success pulse · ${cycle}ms` : 'Projection surface online';
}, 4236);
