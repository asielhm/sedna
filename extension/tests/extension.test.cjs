const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const {JSDOM} = require('jsdom');
const ExcelJS = require('../vendor/exceljs.min.js');
require('../core.js');
const core = globalThis.SednaCore;
function book(values) {
 const b = new ExcelJS.Workbook(), s = b.addWorksheet('Clase');
 s.addRow(core.columns('rendimientos','SEGUNDA VALORACIÓN PRELIMINAR'));
 s.addRow(values); return b;
}
test('reads XLSX roundtrip, preserves zero and academic score', async () => {
 const b = book(['Alumno',4,3,0,2,0,0,0]);
 const loaded = new ExcelJS.Workbook(); await loaded.xlsx.load(await b.xlsx.writeBuffer());
 const result = core.parse(loaded,'rendimientos','SEGUNDA VALORACIÓN PRELIMINAR');
 assert.equal(result[0].students[0]['Creatividad'],0);
 assert.equal(result[0].students[0]['Logros Académicos'],4);
});
test('rejects formulas, fractions, blanks and duplicates', () => {
 for (const value of [{formula:'1+1'},1.5,null]) assert.throws(() => core.parse(book(['Alumno',value,3,0,2,0,0,0]),'rendimientos','SEGUNDA VALORACIÓN PRELIMINAR'));
 const b = book(['Alumno',4,3,0,2,0,0,0]); b.worksheets[0].addRow(['Alumno',4,3,0,2,0,0,0]);
 assert.throws(() => core.parse(b,'rendimientos','SEGUNDA VALORACIÓN PRELIMINAR'));
});
function page(mode='cuatrimestrales') {
 const p = mode === 'cuatrimestrales' ? 'CmbPeriodo' : 'CmbRendimiento';
 const label = mode === 'cuatrimestrales' ? 'Primer Cuatrimestre' : 'SEGUNDA VALORACIÓN PRELIMINAR';
 const dom = new JSDOM(`<select name="ctl00$ContentPlaceHolder1$CmbOpcion"><option value="a">Clase A</option><option value="b">Clase B</option></select><select id="ContentPlaceHolder1_${p}"><option value="1">${label}</option></select><span id="alumno_1">Alumno</span>`,{url:'https://sedna.sanandres.esc.edu.ar/pages/marks.aspx',runScripts:'outside-only'});
 vm.runInContext(fs.readFileSync(require.resolve('../page.js'),'utf8'),dom.getInternalVMContext());
 function field(prefix,values) {
 const select = dom.window.document.createElement('select'); select.id = `ContentPlaceHolder1_${prefix}_1`;
 for (const v of values) select.add(new dom.window.Option(String(v),String(v)));
 dom.window.document.body.append(select); return select;
 }
 return {dom,field,run:(action,payload)=>dom.window.sednaPage(action,payload)};
}
test('fills marks without submitting and refuses changed class', () => {
 const p = page(), select = p.field('cmbNota',[0,8]);
 const payload = {mode:'cuatrimestrales',period:'Primer cuatrimestre'};
 const expected = p.run('inspect',payload).current;
 assert.equal(p.run('fill',{...payload,expected,students:[{Alumno:'Alumno',Nota:8}]}).ok,true);
 assert.equal(select.value,'8'); select.value='0';
 p.dom.window.document.querySelector('select').value='b';
 assert.equal(p.run('fill',{...payload,expected,students:[{Alumno:'Alumno',Nota:8}]}).ok,false);
 assert.equal(select.value,'0');
});
test('preflight failure changes nothing, including earlier valid students', () => {
 const p = page(), select = p.field('cmbNota',[0,8]);
 const payload = {mode:'cuatrimestrales',period:'Primer cuatrimestre'};
 const expected = p.run('inspect',payload).current;
 const r = p.run('fill',{...payload,expected,students:[{Alumno:'Alumno',Nota:8},{Alumno:'Ausente',Nota:8}]});
 assert.equal(r.ok,false); assert.equal(select.value,'0');
});
test('maps academic score to 5 minus score and keeps competencies zero', () => {
 const p = page('rendimientos'), academic = p.field('cmbacademicas',[0,1,2,3,4]);
 for(let i=1;i<=6;i++) p.field(`cmb${i}`,[0,1,2,3,4]);
 const payload = {mode:'rendimientos',period:'SEGUNDA VALORACIÓN PRELIMINAR'};
 const expected = p.run('inspect',payload).current;
 const student = {Alumno:'Alumno','Logros Académicos':4}; core.competencies.forEach(c=>student[c]=0);
 assert.equal(p.run('fill',{...payload,expected,students:[student]}).ok,true);
 assert.equal(academic.value,'1');
});
