const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),POS=require('../core.js');
const cache=new Map(),ctx=vm.createContext({POS,CacheService:{getScriptCache:()=>({get:k=>cache.get(k),remove:k=>cache.delete(k)})}});vm.runInContext(fs.readFileSync(require('node:path').join(__dirname,'../backend/adapter.js'),'utf8'),ctx);
const users=[{id:'U1',name:'One',role:'Kasir',outletId:'TKM',password:'hash1',authVersion:'v1'}];
cache.set('session:test',JSON.stringify({id:'U1',password:'hash1',version:'v1'}));assert.equal(ctx.auth_('test',users).id,'U1');
users[0].role='Manager';assert.equal(ctx.auth_('test',users).role,'Manager');
users[0].authVersion='v2';assert.throws(()=>ctx.auth_('test',users),/Sesi/);assert.equal(cache.has('session:test'),false);
cache.set('session:gone',JSON.stringify({id:'U1',password:'hash1',version:'v2'}));assert.throws(()=>ctx.auth_('gone',[]),/Sesi/);
cache.set('session:password',JSON.stringify({id:'U1',password:'hash1',version:'v2'}));users[0].password='hash2';assert.throws(()=>ctx.auth_('password',users),/Sesi/);
console.log('PASS auth: live role, edited password/version, deleted account and cache revocation');
