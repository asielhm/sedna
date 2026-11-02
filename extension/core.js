(function(root) {
  const competencies = ['Colaboración','Creatividad','Pens.Crítico','Comunicación','Carácter','Ciudadanía'];
  const periods = {
    cuatrimestrales: ['Primer cuatrimestre','Segundo cuatrimestre'],
    rendimientos: ['PRIMERA VALORACIÓN PRELIMINAR','SEGUNDA VALORACIÓN PRELIMINAR','VALORACION PRELIMINAR FINAL','Segundo Rendimiento','Tercer Rendimiento','Cuarto Rendimiento']
  };
  function columns(mode, period) {
    return mode === 'cuatrimestrales' ? ['Alumno','Nota'] : ['Alumno', ...(period === 'VALORACION PRELIMINAR FINAL' ? [] : ['Logros Académicos']), ...competencies];
  }
  function parse(book, mode, period) {
    if (!periods[mode]?.includes(period)) throw Error('Período inválido.');
    if (!book.worksheets.length || book.worksheets.length > 100) throw Error('El archivo debe tener entre 1 y 100 hojas.');
    let total = 0;
    return book.worksheets.map(sheet => {
      const headers = sheet.getRow(1).values.slice(1).map(v => String(v ?? '').trim());
      const required = columns(mode, period);
      if (new Set(headers).size !== headers.length || required.some(c => !headers.includes(c))) throw Error(`${sheet.name}: faltan columnas o hay encabezados duplicados. Se requieren: ${required.join(', ')}.`);
      const students = [], seen = new Set();
      sheet.eachRow((row, number) => {
        if (number === 1) return;
        if (++total > 10000) throw Error('Máximo 10.000 filas.');
        const values = row.values.slice(1);
        if (!values.some(v => v !== null && v !== undefined && v !== '')) return;
        const record = {};
        for (const key of required) {
          const cell = row.getCell(headers.indexOf(key) + 1);
          const value = cell.value;
          if (value && typeof value === 'object') throw Error(`${sheet.name}, fila ${number}: no se admiten fórmulas ni valores especiales.`);
          if (key === 'Alumno') {
            const name = String(value ?? '').trim();
            if (!name || name.startsWith('=') || seen.has(name)) throw Error(`${sheet.name}, fila ${number}: alumno vacío o duplicado.`);
            seen.add(name); record[key] = name;
          } else {
            const n = Number(value);
            if (value === null || value === undefined || String(value).trim() === '' || typeof value === 'boolean' || !Number.isSafeInteger(n)) throw Error(`${sheet.name}, fila ${number}: ${key} debe ser un entero.`);
            if (key === 'Logros Académicos' && (n < 1 || n > 4)) throw Error('Logros Académicos debe ser 1–4.');
            record[key] = n;
          }
        }
        students.push(record);
      });
      if (!students.length) throw Error(`${sheet.name}: no hay alumnos.`);
      return {name: sheet.name, students};
    });
  }
  root.SednaCore = {competencies, periods, columns, parse};
})(globalThis);
