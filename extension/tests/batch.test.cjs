const {test} = require('node:test');
const assert = require('node:assert/strict');
require('../batch.js');
function simulation({failPreflight, rejectSave, failAfterSave} = {}) {
  const groups = ['A','B'].map((name,index) => ({name,students:[{Alumno:name,Nota:8+index}]}));
  const mapping = groups.map(g => ({value:g.name,text:g.name}));
  let selected, dom = null, saved = {}, writes = [], events = [];
  return {groups,mapping,writes,events,progress:()=>{},
    fresh:async()=> { events.push('GET'); dom = null; if(failAfterSave && writes.length) throw Error('session expired'); },
    execute:async(action,payload={})=> {
      events.push(action);
      if(action === 'selectReady' && payload.kind === 'class') { selected = payload.value; dom = saved[selected] ?? 0; }
      if(action === 'state') return {current:{class:{value:selected,text:selected}}};
      if(action === 'preflight' && selected === failPreflight) throw Error('student missing');
      if(action === 'fill') dom = payload.students[0].Nota;
      if(action === 'saveReady') { writes.push(selected); if(!rejectSave) saved[selected] = dom; }
      if(action === 'verify') {
        if(dom !== payload.students[0].Nota) throw Error('readback mismatch');
      }
    }
  };
}
test('validates all classes then saves and verifies each after a new GET',async()=>{
 const sim=simulation(); const report=await runSednaBatch(sim);
 assert.equal(report.ok,true); assert.deepEqual(sim.writes,['A','B']);
 assert.ok(report.results.every(r=>r.status.includes('verificada')));
 assert.equal(sim.events.filter(e=>e==='GET').length,6);
 assert.equal(sim.events.filter(e=>e==='preflight').length,2);
 assert.ok(sim.events.lastIndexOf('preflight') < sim.events.indexOf('saveReady'));
});
test('preflight failure prevents every save',async()=>{
 const sim=simulation({failPreflight:'B'}); const report=await runSednaBatch(sim);
 assert.equal(report.ok,false); assert.deepEqual(sim.writes,[]);
});
test('server rejection cannot pass verification using filled DOM',async()=>{
 const sim=simulation({rejectSave:true}); const report=await runSednaBatch(sim);
 assert.equal(report.ok,false); assert.deepEqual(sim.writes,['A']);
 assert.equal(report.results[0].status,'guardado incierto');
 assert.equal(report.results[1].status,'pendiente');
});
test('navigation failure after submit remains uncertain and is never retried',async()=>{
 const sim=simulation({failAfterSave:true}); const report=await runSednaBatch(sim);
 assert.equal(report.ok,false); assert.deepEqual(sim.writes,['A']);
 assert.equal(report.results[0].status,'guardado incierto');
});
test('duplicate class mapping is rejected before navigation',async()=>{
 const sim=simulation(); sim.mapping[1]=sim.mapping[0];
 await assert.rejects(()=>runSednaBatch(sim)); assert.equal(sim.events.length,0);
});
