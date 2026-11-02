// Self-contained function injected into the selected Sedna tab, in an isolated world.
function sednaPage(action, payload) {
  const norm = text => String(text).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
  const exact = text => String(text).replace(/\s+/g,' ').trim();
  function selected(element) {
    if (!element || element.tagName !== 'SELECT' || element.disabled) throw Error('Abrí la pantalla de ingreso de calificaciones de Sedna y seleccioná período y clase.');
    const option = element.selectedOptions[0];
    if (!option || option.disabled) throw Error('Seleccioná una opción válida en Sedna.');
    return {value: element.value, text: option.textContent.trim()};
  }
  try {
    if (location.origin !== 'https://sedna.sanandres.esc.edu.ar') throw Error('La pestaña no es Sedna.');
    const classElement = document.querySelector('[name="ctl00$ContentPlaceHolder1$CmbOpcion"]');
    const periodElement = document.getElementById('ContentPlaceHolder1_' + (payload.mode === 'cuatrimestrales' ? 'CmbPeriodo' : 'CmbRendimiento'));
    const current = {class: selected(classElement), period: selected(periodElement), url: location.href};
    if (norm(current.period.text) !== norm(payload.period)) throw Error('El período de Sedna no coincide con el seleccionado en la extensión.');
    if (action === 'inspect') return {ok: true, current};
    if (JSON.stringify(current) !== JSON.stringify(payload.expected)) throw Error('La clase o período cambió. Volvé a revisar la correspondencia.');
    const changes = [], used = new Set();
    const competencies = ['Colaboración','Creatividad','Pens.Crítico','Comunicación','Carácter','Ciudadanía'];
    for (const student of payload.students) {
      const matches = [...document.querySelectorAll('span[id]')].filter(e => exact(e.textContent) === exact(student.Alumno));
      if (matches.length !== 1) throw Error(`No se encontró un alumno único: ${student.Alumno}. No se completó ningún campo.`);
      const sid = matches[0].id.split('_').pop();
      const fields = payload.mode === 'cuatrimestrales' ? [['cmbNota',student.Nota]] : competencies.map((c,i) => [`cmb${i+1}`,student[c]]);
      if (payload.mode === 'rendimientos' && 'Logros Académicos' in student) fields.push(['cmbacademicas',5-student['Logros Académicos']]);
      for (const [prefix, value] of fields) {
        const element = document.getElementById(`ContentPlaceHolder1_${prefix}_${sid}`);
        if (!element || element.tagName !== 'SELECT' || element.disabled || used.has(element) || ![...element.options].some(o => o.value === String(value) && !o.disabled)) throw Error(`Campo o nota no disponible para ${student.Alumno}. No se completó ningún campo.`);
        used.add(element); changes.push({element, value:String(value), previous:element.value});
      }
    }
    // Do not dispatch change: ASP.NET onchange handlers may submit the form mid-fill.
    // Native Aceptar submits the selected values together after the teacher's review.
    try {
      for (const item of changes) item.element.value = item.value;
      if (changes.some(item => item.element.value !== item.value)) throw Error('No se pudieron completar todos los campos.');
    } catch (error) {
      for (const item of changes) item.element.value = item.previous;
      throw error;
    }
    return {ok:true, count:payload.students.length, fields:changes.length, current};
  } catch (error) { return {ok:false, error:error.message}; }
}
