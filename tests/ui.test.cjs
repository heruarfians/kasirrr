const vm=require('node:vm'),fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto'),POS=require('../core.js');
const elements=new Map(),listeners={};function el(k){if(!elements.has(k))elements.set(k,{innerHTML:'',textContent:'',style:{},hidden:false,addEventListener(){},open:false,showModal(){this.open=true},close(){this.open=false}});return elements.get(k)}
const storage={getItem:()=>null,setItem(){},removeItem(){}},context=vm.createContext({POS,crypto,console,Date,Intl,Set,Map,Number,String,JSON,AbortController,TextEncoder,localStorage:storage,sessionStorage:storage,navigator:{},location:{protocol:'file:'},window:{KASIRRR_CONFIG:{},scrollTo(){}},document:{querySelector:el,addEventListener:(t,f)=>listeners[t]=f},setInterval(){},setTimeout(){},clearTimeout(){}});
vm.runInContext(fs.readFileSync(path.join(__dirname,'../app.js'),'utf8'),context);
assert.ok(el('#loginScreen').innerHTML.includes('data-form="login"'));
function run(s){return vm.runInContext(s,context)}
run("isDemo=true;demoDB=makeDemo();user=demoDB.Users[0];refreshDemo();enter()");assert.ok(el('#nav').innerHTML.includes('Pengaturan'));
for(const menu of POS.MENUS){run('navigate('+JSON.stringify(menu)+')');assert.ok(el('#content').innerHTML.length>30,menu)}
run("navigate('Pengguna');userForm(1)");assert.ok(el('#modalBody').innerHTML.includes('<select name="outletId"'));assert.ok(el('#modalBody').innerHTML.includes('data-edit="true"'));
run("navigate('Outlet');editRecord('outlets',0)");assert.ok(el('#modalBody').innerHTML.includes('<select name="Status"'));assert.ok(el('#modalBody').innerHTML.includes('Tutup'));
run("receipt({txId:'TEST',invoice:'TEST',outletId:'TKM',timestamp:'2026-10-31T01:00:00Z',tanggal:'2026-10-31',total:0,subtotal:0,bayar:0,kembalian:0,metode_bayar:'Tunai',status:'Lunas',userId:'Admin'})");assert.ok(el('#modalBody').innerHTML.includes('Pratinjau nota WhatsApp'));assert.ok(el('#modalBody').innerHTML.includes('*FAKTUR ELEKTRONIK*'));
run("user=demoDB.Users[2];refreshDemo();enter()");assert.ok(!el('#nav').innerHTML.includes('Pengaturan'));assert.ok(!el('#nav').innerHTML.includes('Bahan'));
run("navigate('Pengaturan')");assert.ok(el('#pageTitle').textContent==='Kasir');
run("lockScreen()");assert.equal(el('#application').hidden,true);assert.equal(el('#loginScreen').hidden,false);
console.log('PASS UI: login gate, 20 menu renders, user edit/outlet/status dropdowns, restricted navigation and account switch');
