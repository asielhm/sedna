/* Injectable transport makes the entire save/readback sequence testable. */
(function(root) {
  async function runSednaBatch({groups, mapping, execute, fresh, progress, check = () => {}}) {
    const results = groups.map(g => ({sheet:g.name, status:'pendiente'}));
    const values = mapping.map(m => m.value);
    if (mapping.length !== groups.length || new Set(values).size !== groups.length) throw Error('Asigná una clase distinta a cada hoja.');
    let active = 0;
    async function enter(index) {
      check();
      await fresh();
      await execute('selectReady',{kind:'period'});
      await execute('selectReady',{kind:'class',value:mapping[index].value});
      const state = await execute('state');
      if (state.current.class.value !== mapping[index].value || state.current.class.text !== mapping[index].text) throw Error('La clase no coincide con la correspondencia confirmada.');
      return state.current;
    }
    try {
      // Validate all classes before the first write.
      for (active = 0; active < groups.length; active++) {
        progress(`Validando ${active+1}/${groups.length}: ${groups[active].name}`,results);
        const expected = await enter(active);
        await execute('preflight',{expected,students:groups[active].students});
      }
      for (active = 0; active < groups.length; active++) {
        check();
        progress(`Cargando ${active+1}/${groups.length}: ${groups[active].name}`,results);
        const expected = await enter(active);
        await execute('fill',{expected,students:groups[active].students});
        check();
        results[active].status = 'guardado incierto';
        await execute('saveReady',{expected});
        // A new GET of the grades page discards client-side values. Never verify
        // against the DOM that was filled or the immediate save response.
        const reloaded = await enter(active);
        await execute('verify',{expected:reloaded,students:groups[active].students});
        results[active].status = 'persistencia verificada al releer Sedna';
        progress(`Verificada ${active+1}/${groups.length}`,results);
      }
      return {ok:true,results};
    } catch (error) {
      if (results[active]?.status === 'pendiente') results[active].status = 'detenida antes de guardar';
      return {ok:false,error:error.message,results};
    }
  }
  root.runSednaBatch = runSednaBatch;
})(globalThis);
