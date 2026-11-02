const $ = id => document.getElementById(id);
let groups = [], expected = null, busy = false;
const tabId = Number(new URLSearchParams(location.hash.slice(1)).get('tab'));
function status(message) { $('status').textContent = message; }
function invalidate() { expected = null; $('confirm').checked = false; $('confirm').disabled = true; $('fill').disabled = true; $('mapping').textContent = 'Volvé a leer la clase y período de Sedna.'; }
function preview() {
  invalidate();
  const group = groups[Number($('sheet').value)];
  $('preview').replaceChildren();
  $('inspect').disabled = !group;
  if (!group) return;
  const summary = document.createElement('p'); summary.textContent = `${group.students.length} alumnos. Se muestran los primeros 10.`; $('preview').append(summary);
  const table = document.createElement('table');
  const header = table.createTHead().insertRow();
  for (const key of Object.keys(group.students[0])) { const th = document.createElement('th'); th.textContent = key; header.append(th); }
  const body = table.createTBody();
  for (const student of group.students.slice(0,10)) {
    const row = body.insertRow(); for (const value of Object.values(student)) row.insertCell().textContent = value;
  }
  $('preview').append(table);
}
function resetFile() { groups = []; $('file').value = ''; $('sheet').replaceChildren(); $('sheet').disabled = true; preview(); status(''); }
function periods() { $('period').replaceChildren(...SednaCore.periods[$('mode').value].map(text => new Option(text,text))); resetFile(); }
$('mode').addEventListener('change', periods);
$('period').addEventListener('change', resetFile);
$('sheet').addEventListener('change', preview);
$('file').addEventListener('change', async () => {
  groups = []; preview(); $('sheet').replaceChildren(); $('sheet').disabled = true;
  const file = $('file').files[0];
  if (!file) return;
  const mode = $('mode').value, period = $('period').value;
  try {
    if (!file.name.toLowerCase().endsWith('.xlsx') || file.size > 5 * 1024 * 1024) throw Error('Seleccioná un .xlsx de hasta 5 MB.');
    status('Leyendo archivo…');
    const book = new ExcelJS.Workbook(); await book.xlsx.load(await file.arrayBuffer());
    if ($('file').files[0] !== file || mode !== $('mode').value || period !== $('period').value) return;
    groups = SednaCore.parse(book, mode, period);
    $('sheet').replaceChildren(...groups.map((g,i) => new Option(`${i+1}. ${g.name}`,String(i))));
    $('sheet').disabled = false; preview(); status('Archivo validado. Elegí la hoja y leé la clase de Sedna.');
  } catch (error) { status(error.message); }
});
async function execute(action, extra = {}) {
  if (!Number.isInteger(tabId) || tabId <= 0) throw Error('Abrí esta extensión haciendo clic en su ícono desde la pestaña de Sedna.');
  const tab = await chrome.tabs.get(tabId);
  if (!tab.url?.startsWith('https://sedna.sanandres.esc.edu.ar/')) throw Error('Volvé a abrir la extensión desde la pestaña de Sedna.');
  const result = await chrome.scripting.executeScript({target:{tabId},func:sednaPage,args:[action,{mode:$('mode').value,period:$('period').value,...extra}]});
  const response = result[0]?.result;
  if (!response?.ok) throw Error(response?.error || 'No se pudo leer Sedna. Recargá la página e intentá de nuevo.');
  return response;
}
function lock(value) {
  busy = value;
  for (const id of ['mode','period','file','sheet','template','inspect','confirm','fill']) $(id).disabled = value;
  if (!value) { $('sheet').disabled = !groups.length; $('inspect').disabled = !groups.length; $('confirm').disabled = !expected; $('fill').disabled = !expected || !$('confirm').checked; }
}
$('inspect').addEventListener('click', async () => {
  if (busy) return;
  invalidate(); lock(true);
  try {
    const response = await execute('inspect'); expected = response.current;
    $('mapping').textContent = `Hoja: ${groups[Number($('sheet').value)].name} → Clase Sedna: ${expected.class.text} · Período: ${expected.period.text}. Verificá esta correspondencia.`;
    status('Revisá la correspondencia y marcá la confirmación.');
  } catch (error) { status(error.message); } finally { lock(false); }
});
$('confirm').addEventListener('change', () => { $('fill').disabled = !expected || !$('confirm').checked; });
$('fill').addEventListener('click', async () => {
  if (busy || !expected || !$('confirm').checked) return;
  lock(true);
  try {
    const response = await execute('fill',{expected,students:groups[Number($('sheet').value)].students});
    status(`Se completaron ${response.count} alumnos (${response.fields} campos). NO se guardaron todavía. Volvé a Sedna, revisá las notas y pulsá Aceptar. Para otra clase, seleccionála en Sedna y elegí su hoja aquí.`);
  } catch (error) { status(error.message); } finally { invalidate(); lock(false); }
});
$('template').addEventListener('click', async () => {
  try {
    const book = new ExcelJS.Workbook(); const sheet = book.addWorksheet('Clase 1');
    sheet.addRow(SednaCore.columns($('mode').value,$('period').value));
    sheet.columns.forEach(c => c.width = 24);
    const url = URL.createObjectURL(new Blob([await book.xlsx.writeBuffer()],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'}));
    const a = document.createElement('a'); a.href = url; a.download = `sedna-${$('mode').value}.xlsx`; a.click(); setTimeout(() => URL.revokeObjectURL(url),1000);
  } catch (error) { status(error.message); }
});
periods();
