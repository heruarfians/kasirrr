const DEFAULT_SPREADSHEET_ID='1tZVkuaM1KPSRP3qqt1Wu1dF2Lcm3D1qubH5uq4sSpvY';
function book_(){return SpreadsheetApp.openById(PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID')||DEFAULT_SPREADSHEET_ID)}
function tab_(name){const s=book_().getSheets().find(s=>s.getName().trim().toLowerCase()===name.toLowerCase());if(!s)throw Error('Jalankan setup: tab '+name+' belum ada');return s}
function header_(s){return s.getRange(1,1,1,s.getLastColumn()).getValues()[0].map(v=>String(v).trim())}
function read_(name){const s=tab_(name),v=s.getDataRange().getValues(),h=v.shift().map(x=>String(x).trim());return v.filter(r=>r.some(v=>v!=='')).map(r=>Object.fromEntries(h.map((k,i)=>[k,r[i] instanceof Date?(['tanggal','mulai','selesai','jatuh_tempo','tanggal_masuk'].includes(k)?Utilities.formatDate(r[i],'Asia/Jakarta','yyyy-MM-dd'):r[i].toISOString()):r[i]])))}
function safe_(v){return typeof v==='string'&&/^[=+@\t\r]/.test(v)?"'"+v:v}
function write_(name,rows){const s=tab_(name),h=header_(s),old=s.getLastRow(),values=rows.map(r=>h.map(k=>safe_(r[k]??'')));if(values.length)s.getRange(2,1,values.length,h.length).setValues(values);if(old>values.length+1)s.getRange(values.length+2,1,old-values.length-1,h.length).clearContent()}
function load_(){const db=POS.empty();Object.keys(POS.SCHEMA).forEach(n=>db[n]=read_(n));return POS.normalize(db)}
function hash_(password){return hashSalt_(password,Utilities.getUuid())}
function hashSalt_(p,s){return 'sha256$'+s+'$'+Utilities.base64Encode(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256,s+':'+p,Utilities.Charset.UTF_8))}
function context_(){const now=new Date();return {id:()=>Utilities.getUuid(),hash:hash_,now:now.toISOString(),today:Utilities.formatDate(now,'Asia/Jakarta','yyyy-MM-dd')}}
function setup(){
 const lock=LockService.getScriptLock();lock.waitLock(25000);
 try{const b=book_();Object.entries(POS.SCHEMA).forEach(([name,fields])=>{
 let s=b.getSheets().find(s=>s.getName().trim().toLowerCase()===name.toLowerCase());if(!s)s=b.insertSheet(name);
 if(!s.getLastRow())s.appendRow(fields);let h=header_(s);
 if(name==='transaksi'&&h.includes('status, shift_id')){if(s.getLastRow()>1)throw Error('Pisahkan kolom status dan shift_id dahulu.');s.getRange(1,h.indexOf('status, shift_id')+1).setValue('status');h=header_(s)}
 if(name==='meja'&&h.includes('status (Kosong / Terisi)')){s.getRange(1,h.indexOf('status (Kosong / Terisi)')+1).setValue('status');h=header_(s)}
 const missing=fields.filter(k=>!h.includes(k));if(missing.length)s.getRange(1,h.length+1,1,missing.length).setValues([missing]);s.setFrozenRows(1);
 });
 const db=load_();if(!db.outlets.length)db.outlets.push({id:'TKM',nama:'Warung TKM',alamat:'',Kontak:'',Status:'Aktif'});
 db.Users.forEach(u=>{if(u.password&&!String(u.password).startsWith('sha256$'))u.password=hash_(String(u.password));if(!u.status)u.status='Aktif';if(!u.authVersion)u.authVersion=Utilities.getUuid()});
 db.products.forEach(p=>{if(!db.kategori.some(k=>k.nama===p.kategori&&k.outletId===p.outletId))db.kategori.push({id:Utilities.getUuid(),nama:p.kategori||'Lainnya',status:'Aktif',outletId:p.outletId})});
 ['Users','outlets','kategori'].forEach(n=>write_(n,db[n]));SpreadsheetApp.flush();
 }finally{lock.releaseLock()}
}
function migratePasswords(){const users=read_('Users');users.forEach(u=>{if(u.password&&!String(u.password).startsWith('sha256$'))u.password=hash_(String(u.password))});write_('Users',users)}
function response_(o){return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON)}
function doGet(){return response_({ok:true,data:{name:'Kasirrr API',version:'2.0.0'}})}
function login_(q){
 const cache=CacheService.getScriptCache(),key='attempt:'+String(q.id).slice(0,80),attempt=Number(cache.get(key)||0);if(attempt>=8)throw Error('Terlalu banyak percobaan. Tunggu 15 menit.');
 const users=read_('Users'),u=users.find(u=>String(u.id).toLowerCase()===String(q.id).trim().toLowerCase()),parts=String(u?.password||'').split('$');
 if(!u||u.status==='Nonaktif'||parts.length!==3||hashSalt_(String(q.password),parts[1])!==u.password){cache.put(key,String(attempt+1),900);throw Error('ID atau password salah / akun tidak aktif')}
 if(!POS.DEFAULTS[u.role])throw Error('Role akun tidak valid');if(!read_('outlets').some(o=>o.id===u.outletId&&o.Status==='Aktif')&&u.role!=='Admin')throw Error('Outlet sedang Tutup');
 const token=Utilities.getUuid()+Utilities.getUuid();cache.remove(key);cache.put('session:'+token,JSON.stringify({id:u.id,password:u.password,version:u.authVersion||''}),21600);return {token,user:POS.publicUser(u)}
}
function auth_(token,users){const cache=CacheService.getScriptCache(),raw=cache.get('session:'+token),s=raw?JSON.parse(raw):null,u=s?users.find(u=>u.id===s.id):null;if(!u||u.status==='Nonaktif'||u.password!==s.password||(u.authVersion||'')!==s.version){cache.remove('session:'+token);const e=Error('Sesi berakhir / akun berubah. Silakan login lagi.');e.code='AUTH';throw e}if(!POS.DEFAULTS[u.role])throw Error('Role tidak valid');return u}
function doPost(e){
 const lock=LockService.getScriptLock();try{
 lock.waitLock(25000);const q=JSON.parse(e.postData.contents);if(q.action==='login')return response_({ok:true,data:login_(q)});
 const db=load_(),u=auth_(q.token,db.Users);
 if(q.action==='logout'){CacheService.getScriptCache().remove('session:'+q.token);return response_({ok:true,data:true})}
 if(q.action==='data')return response_({ok:true,data:POS.view(db,u)});
 if(q.action==='report')return response_({ok:true,data:POS.reports(db,u,q.from,q.to,q.type)});
 const before=POS.clone(db),clean={...q};delete clean.token;const result=POS.execute(db,clean,u,context_());
 if(q.action!=='quote'){const changed=Object.keys(POS.SCHEMA).filter(n=>JSON.stringify(before[n])!==JSON.stringify(db[n])),written=[];try{changed.forEach(n=>{written.push(n);write_(n,db[n])});SpreadsheetApp.flush()}catch(err){written.reverse().forEach(n=>write_(n,before[n]));SpreadsheetApp.flush();throw err}}
 return response_({ok:true,data:result});
 }catch(err){return response_({ok:false,error:err.message,code:err.code||'ERROR'})}finally{if(lock.hasLock())lock.releaseLock()}
}

