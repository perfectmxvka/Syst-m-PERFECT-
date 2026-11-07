import test from 'node:test';import assert from 'node:assert/strict';
import {fixture,token,other} from './fixture110.mjs';import {createRuntime} from '../runtime.mjs';import {completeDueOrders} from '../auto-complete-orders.mjs';
const ownerId='aa98c729-1ef3-44ca-9594-bb5e79f007c3';
function setup(){const s=fixture();const u=JSON.parse(s.properties.PERFECT_REPAIR_USERS);u.push({id:ownerId,username:'vojtad',firstName:'Private',surname:'Owner',role:'ADMINISTRATOR',active:true});s.properties.PERFECT_REPAIR_USERS=JSON.stringify(u);return s;}
test('automatic elapsed-program completion feeds revenue; confirmed shifts feed earnings',()=>{
 const s=setup(),sh=s.sheets.find(x=>x.name==='__PERFECT_DB_OBJEDNAVKY'),h=sh.rows[1];sh.rows[2][h.indexOf('STAV_OBJEDNAVKY')]='ČEKÁ SE';sh.rows[2][h.indexOf('MYCI_PROGRAM')]='COMFORT';
 assert.equal(completeDueOrders(s).completed,1);assert.equal(completeDueOrders(s).completed,0);
 const r=createRuntime(s);r.call('perfectBoxes46SaveShift',[token,{date:'2026-10-27',station:'BOX1',userId:'admin',worked:true}]);
 const report=r.call('perfectReports39Get',[token,{month:'2026-10'}]);assert.equal(report.current.revenue,107999);
 const pay=r.call('perfect101Employees',[token,{month:'2026-10'}]);assert.equal(pay.employees.find(e=>e.id==='admin').gross,1900);
});
test('private owner is hidden from ordinary administrators and other superadmins',()=>{
 for(const superAdmin of [false,true]){const s=setup();if(superAdmin)s.properties.PERFECT40_SUPER_IDS=JSON.stringify(['admin']);const r=createRuntime(s);
 for(const [method,input] of [['perfectAdminUsersList',{}],['perfectReports39Get',{month:'2026-10'}],['perfect101Employees',{month:'2026-10'}],['perfectBoxes49GetOverview',{from:'2026-10-27',to:'2026-10-27'}]]){
  const result=JSON.stringify(r.call(method,[token,input]));assert.ok(!result.includes(ownerId),method);assert.ok(!result.includes('vojtad'),method);
 }
 assert.throws(()=>r.call('perfectAdminUsersSave',[token,{id:ownerId,username:'renamed',firstName:'X',role:'PRACOVNIK'}]));
 assert.throws(()=>r.call('perfect101Employees',[token,{month:'2026-10',userId:ownerId}]));
 }
});
test('administrator can create and remove a worker, preserving historical identity',()=>{
 const s=setup(),r=createRuntime(s);const created=r.call('perfectAdminUsersSave',[token,{username:'testworker',firstName:'Test',role:'PRACOVNIK',password:'Test-password-115',active:true}]);assert.equal(created.success,true);
 const id=created.user.id;assert.equal(r.call('perfectAdminUsersDelete',[token,{id}]).success,true);
 assert.ok(!r.call('perfectAdminUsersList',[token]).users.some(u=>u.id===id));
 const raw=JSON.parse(s.properties.PERFECT_REPAIR_USERS).find(u=>u.id===id);assert.equal(raw.active,false);assert.equal(raw.deleted115,true);
 assert.throws(()=>r.call('perfectAdminUsersDelete',[token,{id:'admin'}]));assert.throws(()=>r.call('perfectAdminUsersDelete',[token,{id:ownerId}]));
});

test('closing a box completes assigned waiting jobs but leaves cancelled and unassigned jobs',()=>{
 const s=setup(),sh=s.sheets.find(x=>x.name==='__PERFECT_DB_OBJEDNAVKY'),h=sh.rows[1];
 sh.rows[2][h.indexOf('STAV_OBJEDNAVKY')]='ČEKÁ SE';
 sh.rows[3][h.indexOf('STAV_OBJEDNAVKY')]='NEDORAZIL';
 const r=createRuntime(s);r.call('perfectBoxes46SaveShift',[token,{date:'2026-10-27',station:'BOX1',userId:'admin',worked:true}]);
 assert.equal(sh.rows[2][h.indexOf('STAV_OBJEDNAVKY')],'DOKONČENO');assert.equal(sh.rows[3][h.indexOf('STAV_OBJEDNAVKY')],'NEDORAZIL');
});
test('future, unknown and terminal jobs are untouched by the time worker',()=>{
 const s=setup(),sh=s.sheets.find(x=>x.name==='__PERFECT_DB_OBJEDNAVKY'),h=sh.rows[1];
 sh.rows[2][h.indexOf('STAV_OBJEDNAVKY')]='ČEKÁ SE';sh.rows[2][h.indexOf('DATUM_OBJEDNANI')]='2099-01-01';sh.rows[2][h.indexOf('MYCI_PROGRAM')]='COMFORT';
 sh.rows[3][h.indexOf('STAV_OBJEDNAVKY')]='ČEKÁ SE';sh.rows[3][h.indexOf('MYCI_PROGRAM')]='UNKNOWN';
 assert.equal(completeDueOrders(s).completed,0);assert.equal(sh.rows[2][h.indexOf('STAV_OBJEDNAVKY')],'ČEKÁ SE');assert.equal(sh.rows[3][h.indexOf('STAV_OBJEDNAVKY')],'ČEKÁ SE');
});
