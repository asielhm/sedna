const {test} = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
test('browser transport waits for fresh documents, accepts save dialogs and releases debugger', async()=>{
 let token=1, selected='a',saved=false; const commands=[]; const listeners=new Set();
 const detached = new Set();
 const event = (set = listeners)=>({addListener:f=>set.add(f),removeListener:f=>set.delete(f)});
 const context={setTimeout,Date,sednaPage(){},chrome:{
 tabs:{get:async()=>({url:'https://sedna.sanandres.esc.edu.ar/marks.aspx'}),update:async()=>{token++;}},
 scripting:{executeScript:async({args:[action,payload]})=>{
  let result={ok:true,token,ready:true,current:{url:'https://sedna.sanandres.esc.edu.ar/marks.aspx'}};
  if(action==='select') {result.changed=true; selected=payload.value; token++;}
  if(action==='save') { saved=true; token++; for(const listener of listeners) listener({tabId:42},'Page.javascriptDialogOpening',{type:'confirm'}); }
  return [{result}];
 }},
 debugger:{attach:async()=>commands.push('attach'),detach:async()=>commands.push('detach'),onEvent:event(),onDetach:event(detached),sendCommand:async(t,method,args)=>commands.push([method,args])}
 }};
 vm.createContext(context);vm.runInContext(fs.readFileSync(require.resolve('../automation.js'),'utf8'),context);
 const automation=context.createSednaAutomation(42,{mode:'cuatrimestrales',period:'Primer cuatrimestre'});
 await automation.open(); await automation.fresh();
 await automation.execute('selectReady',{kind:'class',value:'b'});
 await automation.execute('saveReady',{}); await automation.close();
 assert.equal(selected,'b'); assert.equal(saved,true);
 assert.ok(commands.some(c=>c[0]==='Page.handleJavaScriptDialog' && c[1].accept));
 assert.ok(commands.some(c=>c[0]==='Network.setCacheDisabled' && c[1].cacheDisabled));
 assert.equal(commands.at(-1),'detach'); assert.equal(listeners.size,0);
});
