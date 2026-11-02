const mode = document.querySelector('#mode');
const period = document.querySelector('#period');
function update() {
  for (const option of period.options) { option.hidden = option.dataset.mode !== mode.value; option.disabled = option.hidden; }
  if (period.selectedOptions[0]?.disabled) period.value = [...period.options].find(o => !o.disabled).value;
  document.querySelector('#template').href = '/template?' + new URLSearchParams({mode: mode.value, period: period.value});
}
mode.addEventListener('change', update); period.addEventListener('change', update); update();
document.querySelector('form').addEventListener('submit', () => {
 document.querySelector('#progress').hidden = false;
 // Preserve the clicked button's action in the submitted form.
 setTimeout(() => document.querySelectorAll('button').forEach(b => b.disabled = true), 0);
});
