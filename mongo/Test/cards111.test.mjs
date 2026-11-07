import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import {test} from 'node:test';
const html=readFileSync(new URL('../../system/Index.html',import.meta.url),'utf8');
test('simultaneous card requests share one load; session change discards response',()=>{
 const source=html.slice(html.indexOf('const PerfectLazy110=(()=>{'),html.indexOf('window.PerfectLazy110=PerfectLazy110;')+'window.PerfectLazy110=PerfectLazy110;'.length);
 let requests=[],token='a',opened=0;
 const context={state:{page:'dashboard'},window:{PerfectStorage62:{session:{getItem:()=>token}}},api:(...args)=>requests.push(args),alert:()=>{}};
 vm.createContext(context);vm.runInContext(source,context);
 const lazy=context.window.PerfectLazy110;
 lazy.records(()=>opened++);lazy.records(()=>opened++);
 assert.equal(requests.length,1);
 requests[0][2]({orders:[],customers:[],vehicles:[]});assert.equal(opened,2);
 lazy.records(()=>opened++);assert.equal(requests.length,1);assert.equal(opened,3);
 lazy.invalidate();lazy.records(()=>opened++);token='b';requests[1][2]({});
 assert.equal(opened,3);
});
