import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import {test} from 'node:test';
const html=readFileSync(new URL('../../system/Index.html',import.meta.url),'utf8');
const base=html.slice(html.indexOf('function perfectOpenCardV9('),html.indexOf('renderDashboard=()=>PerfectDashboardV6.render(app);'));
const wrapper=html.slice(html.indexOf('const customerBefore36=perfectOpenCardV9;'),html.indexOf('const logoutBefore36=perfectLogout;'));
for(const kind of ['customer','vehicle'])for(const deferred of [false,true])test(`${kind} card opens once through voucher wrapper (${deferred?'deferred':'cached'} data)`,async()=>{
 let opens=0,loads=0,vouchers=0,callback;const overlays=[];
 const modal={dataset:{},querySelector:()=>({}),querySelectorAll:()=>Array(5).fill({}),append:()=>{}};
 const open=()=>{opens++;overlays.push({querySelector:()=>modal});};
 const lazy={records(fn){if(++loads>3)throw Error('Card loading recursively re-entered');if(deferred)callback=fn;else fn();}};
 const context={window:{PerfectLazy110:lazy,PerfectDesign:{}},PerfectLazy110:lazy,PerfectDesign:{openCustomer:open,openVehicle:open},state:{customers:[{CUSTOMER_ID:'c1'}],vehicles:[{VEHICLE_ID:'v1'}]},val:(r,...keys)=>keys.map(k=>r[k]).find(v=>v!=null),alert:msg=>{throw Error(msg);},console,document:{querySelectorAll:selector=>selector==='.overlay'?overlays:[modal],createElement:()=>({isConnected:false})},PerfectVouchers36:{call:()=>{vouchers++;return Promise.resolve({vouchers:[]});}}};
 vm.createContext(context);vm.runInContext(base+'\n'+wrapper,context);
 vm.runInContext(`perfectOpenCardV9('${kind}','${kind==='customer'?'c1':'v1'}')`,context);
 if(deferred){assert.equal(opens,0);callback();}
 assert.equal(loads,1);assert.equal(opens,1);assert.equal(vouchers,kind==='customer'?1:0);
});
