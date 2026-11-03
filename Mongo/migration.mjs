import crypto from 'node:crypto';import fs from 'node:fs';import path from 'node:path';
export const sha256=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
export function validateRelations(state){
 const read=(name,header,id)=>{
  const sheet=state.sheets.find(s=>s.name===name),heads=sheet?.rows[header];
  if(!Array.isArray(heads)||!heads.includes(id))throw Error('Chybí hlavička '+name+'.');
  const records=[],ids=new Set();
  for(const row of sheet.rows.slice(header+1)){
   if(!row.some(v=>v!==''&&v!=null))continue;
   const record=Object.fromEntries(heads.map((h,i)=>[h,row[i]??''])),key=String(record[id]).trim();
   if(!key||ids.has(key))throw Error('Chybějící nebo duplicitní '+id+'.');
   ids.add(key);records.push(record);
  }
  return {records,ids};
 };
 const customers=read('__PERFECT_DB_ZAKAZNICI',0,'CUSTOMER_ID'),vehicles=read('__PERFECT_DB_VOZIDLA',0,'VEHICLE_ID'),orders=read('__PERFECT_DB_OBJEDNAVKY',1,'ORDER_ID');
 for(const [rows,key,target] of [[orders.records,'CUSTOMER_ID',customers.ids],[orders.records,'VEHICLE_ID',vehicles.ids],[vehicles.records,'CUSTOMER_ID',customers.ids]])
  for(const r of rows)if(r[key]!==''&&!target.has(String(r[key])))throw Error('Neplatná vazba '+key+'.');
 for(const key of ['GMAIL_MESSAGE_ID','WEB_REQUEST_ID']){
  const seen=new Set();for(const r of orders.records){if(!r[key])continue;const value=String(r[key]);if(seen.has(value))throw Error('Duplicitní '+key+'.');seen.add(value);}
 }
 return {customers:customers.records.length,vehicles:vehicles.records.length,orders:orders.records.length};
}
export function validateExport(folder){
 const bytes=fs.readFileSync(path.join(folder,'state.json')),manifest=JSON.parse(fs.readFileSync(path.join(folder,'manifest.json'),'utf8'));
 if(manifest.format!=='PERFECT-MIGRATION-1'||manifest.completed!==true||manifest.errors?.length)throw Error('Export není dokončený nebo obsahuje chyby.');
 if(sha256(bytes)!==manifest.stateSha256)throw Error('Kontrolní součet state.json nesouhlasí.');
 const state=JSON.parse(bytes);if(state.schemaVersion!==1||!Array.isArray(state.sheets)||!state.properties||!state.spreadsheetId)throw Error('Neplatný export.');
 const names=new Set();for(const s of state.sheets){if(!s.name||names.has(s.name)||!Array.isArray(s.rows)||s.rows.some(r=>!Array.isArray(r)))throw Error('Neplatné listy.');names.add(s.name);}
 const users=JSON.parse(state.properties.PERFECT_REPAIR_USERS||'[]');if(!users.length)throw Error('Export neobsahuje přihlašovací účty.');const ids=new Set(),usernames=new Set();for(const u of users){if(!u.id||ids.has(u.id)||!u.username||usernames.has(String(u.username).trim().toLowerCase())||!u.passwordHash||!u.salt||!Number.isInteger(Number(u.iterations))||u.iterations<1||u.iterations>1000000)throw Error('Neplatné nebo duplicitní přihlašovací účty.');ids.add(u.id);usernames.add(String(u.username).trim().toLowerCase());}
 const orders=state.sheets.find(s=>s.name==='__PERFECT_DB_OBJEDNAVKY'),customers=state.sheets.find(s=>s.name==='__PERFECT_DB_ZAKAZNICI'),vehicles=state.sheets.find(s=>s.name==='__PERFECT_DB_VOZIDLA');if(!orders||!customers||!vehicles)throw Error('Chybí centrální databáze.');
 const relations=validateRelations(state);
 const heads=orders.rows[1],col=n=>{const i=heads.indexOf(n);if(i<0)throw Error('Chybí '+n);return i;},idCol=col('ORDER_ID'),priceCol=col('CENA_CELKEM'),orderIds=new Set();let totalCents=0,offline=0,count=0;
 for(const row of orders.rows.slice(2)){if(!row[idCol])continue;const id=String(row[idCol]);if(orderIds.has(id))throw Error('Duplicitní objednávka '+id);orderIds.add(id);count++;if(/^OF/i.test(id))offline++;const n=Number(String(row[priceCol]||0).replace(',','.'));if(!Number.isFinite(n))throw Error('Neplatná cena '+id);totalCents+=Math.round(n*100);}
 if(!Number.isSafeInteger(totalCents))throw Error('Součet je mimo rozsah.');
 const mediaIds=new Set(),proofIds=new Set();
 for(const proof of manifest.copied||[]){if(proofIds.has(proof.id))throw Error('Duplicitní důkaz média.');proofIds.add(proof.id);}
 for(const m of state.drive?.files||[]){if(mediaIds.has(m.id))throw Error('Duplicitní ID média.');mediaIds.add(m.id);if(!/^[\w-]+$/.test(m.id))throw Error('Neplatné ID média.');const proof=manifest.copied?.find(x=>x.id===m.id);if(!proof)throw Error('Chybí ověření média '+m.id);const b=fs.readFileSync(path.join(folder,m.id+'.bin'));if(b.length!==proof.bytes||sha256(b)!==proof.sha256)throw Error('Poškozené médium '+m.id);}
 // Relace se nepřenášejí, uživatel se přihlásí původním heslem. Integrační tajemství do nové DB nepatří.
 for(const k of Object.keys(state.properties))if(/SESSION_|FAILURE|FAIL_|^PERFECT_MIGRATION_|^PERFECT65_BRIDGE_SECRET$|^PERFECT101_PUSH_|^PERFECT103_SYNC_SECRET$|^PERFECT103_RESEND_API_KEY$/.test(k))delete state.properties[k];
 return {state,manifest,report:{sheets:state.sheets.length,accounts:users.length,customers:relations.customers,vehicles:relations.vehicles,orders:count,offlineOrders:offline,totalCents,media:(state.drive?.files||[]).length,sourceHash:manifest.stateSha256}};
}
