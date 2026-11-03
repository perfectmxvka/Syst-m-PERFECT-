/** Fresh, isolated state only. Never reads or mutates an existing database. */
import crypto from 'node:crypto';
import {createRuntime} from './runtime.mjs';
export function buildCleanState({username,password}={}){
 username=String(username||'').trim();password=String(password||'');
 if(!/^[a-z0-9._-]{3,40}$/i.test(username))throw Error('Uživatel musí mít 3–40 znaků (písmena, číslice, tečka, pomlčka, podtržítko).');
 if(password.length<4||password.length>128)throw Error('Heslo musí mít 4–128 znaků.');
 const spreadsheetId='clean_'+crypto.randomUUID();
 const state={schemaVersion:1,spreadsheetId,properties:{PERFECT_REPAIR_SPREADSHEET_ID:spreadsheetId},userProperties:{},sheets:[],drive:{files:[],folders:[]}};
 createRuntime(state).ctx.perfect40Original_databaseInitialize_();
 const salt=crypto.randomBytes(32).toString('hex'),iterations=20000;
 const account={id:crypto.randomUUID(),username,firstName:username,surname:'',role:'ADMINISTRATOR',active:true,mustChangePassword:false,salt,iterations,passwordHash:crypto.pbkdf2Sync(password,salt,iterations,32,'sha256').toString('hex')};
 state.properties.PERFECT_REPAIR_USERS=JSON.stringify([account]);
 return state;
}
