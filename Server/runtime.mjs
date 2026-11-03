import crypto from 'node:crypto';
import {Buffer} from 'node:buffer';
import {createBusiness} from './business.mjs';
import templates from './templates.mjs';
export function encode(x){if(x instanceof globalThis.Date)return {$date:x.toISOString()};if(Array.isArray(x))return x.map(encode);if(x&&typeof x==='object')return Object.fromEntries(Object.entries(x).map(([k,v])=>[k,encode(v)]));return x;}
export function decode(x){if(x&&typeof x==='object'&&Object.keys(x).length===1&&typeof x.$date==='string')return new globalThis.Date(x.$date);if(Array.isArray(x))return x.map(decode);if(x&&typeof x==='object')return Object.fromEntries(Object.entries(x).map(([k,v])=>[k,decode(v)]));return x;}
export function createRuntime(state,options={}){
 if(!state||state.schemaVersion!==1)throw Error('Neplatná verze převodních dat.');
 let now=options.now===undefined?Date.now():Number(options.now);
 class ClockDate extends Date{constructor(...args){super(...(args.length?args:[now]));}static now(){return now;}}
 const copy=x=>x instanceof Date?new ClockDate(x.getTime()):Array.isArray(x)?x.map(copy):x&&typeof x==='object'?Object.fromEntries(Object.entries(x).map(([k,v])=>[k,copy(v)])):x;
 const propsStore=decode(state.properties||{}),userStore=decode(state.userProperties||{}),writes=[],logs=[],sheets=new Map(),files=new Map(),folders=new Map(),triggers=[];const pendingFiles=new Map();
 function properties(store){return {getProperty:k=>store[k]??null,setProperty:(k,v)=>{store[k]=String(v);return properties(store)},setProperties:values=>{Object.entries(values).forEach(([k,v])=>store[k]=String(v));return properties(store)},getProperties:()=>({...store}),deleteProperty:k=>{delete store[k]},deleteAllProperties:()=>{Object.keys(store).forEach(k=>delete store[k])}};}
 function coord(s){const m=/^([A-Z]+)(\d+)$/i.exec(s);if(!m)throw Error('Unsupported A1 '+s);return [+m[2],m[1].toUpperCase().split('').reduce((n,c)=>n*26+c.charCodeAt(0)-64,0)]}
 class Range{
  constructor(sheet,row,col,count=1,width=1){Object.assign(this,{sheet,row,col,count,width});}
  getValues(){return Array.from({length:this.count},(_,i)=>Array.from({length:this.width},(_,j)=>copy(this.sheet.rows[this.row+i-1]?.[this.col+j-1]??'')));}
  getValue(){return this.getValues()[0][0]}
  setValues(values){if(values.length!==this.count||values.some(r=>r.length!==this.width))throw Error('Range dimension mismatch');for(let i=0;i<this.count;i++){this.sheet.rows[this.row+i-1]??=[];for(let j=0;j<this.width;j++)this.sheet.rows[this.row+i-1][this.col+j-1]=copy(values[i][j]);}writes.push({sheet:this.sheet.name,row:this.row,col:this.col,count:this.count,width:this.width});return this;}
  setValue(value){return this.setValues(Array.from({length:this.count},()=>Array(this.width).fill(value)))}
  getDisplayValues(){return this.getValues().map(r=>r.map(String))}
  getRow(){return this.row}getColumn(){return this.col}getNumRows(){return this.count}getNumColumns(){return this.width}getSheet(){return this.sheet}
  clearContent(){return this.setValue('')}clear(){return this.clearContent()}getMergedRanges(){return[]}isPartOfMerge(){return false}breakApart(){return this}merge(){return this}mergeAcross(){return this}
 }
 for(const name of ['setNumberFormat','setNumberFormats','setFontColor','setFontColors','setFontWeight','setFontFamily','setFontSize','setBackground','setBackgrounds','setHorizontalAlignment','setVerticalAlignment','setBorder','setWrap','setDataValidation','clearDataValidations','setFontLine','setNote'])Range.prototype[name]=function(){return this};
 class Sheet{
  constructor(name,rows=[]){this.name=name;this.rows=copy(rows);this.hidden=false;this.maxRows=1000;this.maxCols=30;this.id=sheets.size+1;}
  getName(){return this.name}getSheetId(){return this.id}getLastRow(){let n=this.rows.length;while(n&&!this.rows[n-1]?.some(v=>v!==''&&v!=null))n--;return n}getLastColumn(){return Math.max(1,...this.rows.map(r=>r?.length||0))}getMaxColumns(){return this.maxCols}getMaxRows(){return Math.max(this.maxRows,this.rows.length)}
  getRange(row,col,count=1,width=1){if(typeof row==='string'){const parts=row.split(':');const a=coord(parts[0]),b=parts[1]?coord(parts[1]):a;return new Range(this,a[0],a[1],b[0]-a[0]+1,b[1]-a[1]+1)}return new Range(this,row,col,count,width)}
  getDataRange(){return this.getRange(1,1,Math.max(1,this.getLastRow()),this.getLastColumn())}
  getRangeList(names){return {setValue:value=>{names.forEach(name=>this.getRange(name).setValue(value));return this}}}
  appendRow(row){this.getRange(this.getLastRow()+1,1,1,row.length).setValues([row]);return this}
  hideSheet(){this.hidden=true;return this}showSheet(){this.hidden=false;return this}isSheetHidden(){return this.hidden}
  deleteRow(n){this.rows.splice(n-1,1);writes.push({sheet:this.name,deletedRow:n});return this}deleteRows(n,k){for(let i=0;i<k;i++)this.deleteRow(n);return this}
  insertColumnsAfter(n,count){this.maxCols+=count;return this}insertRowsAfter(n,count){this.maxRows+=count;return this}
  copyTo(ss){const sh=ss.insertSheet('Copy of '+this.name);sh.rows=copy(this.rows);return sh}
  setName(name){sheets.delete(this.name);this.name=name;sheets.set(name,this);return this}
 }
 for(const name of ['setFrozenRows','setFrozenColumns','hideColumns','showColumns','setRowHeight','setRowHeights','setColumnWidth','setColumnWidths','autoResizeColumns','setTabColor','activate'])Sheet.prototype[name]=function(){return this};
 const ss={getSheetByName:n=>sheets.get(n)||null,insertSheet:n=>{if(sheets.has(n))throw Error('Sheet exists');const s=new Sheet(n);sheets.set(n,s);writes.push({createdSheet:n});return s},getSheets:()=>[...sheets.values()],getId:()=> state.spreadsheetId||propsStore.PERFECT_REPAIR_SPREADSHEET_ID||'perfect',getSpreadsheetTimeZone:()=> 'Europe/Prague'};
 function blob(bytes,mime='image/jpeg',name='image.jpg'){const b=typeof bytes==='string'?Buffer.from(bytes):Buffer.from(bytes||[]);return {getBytes:()=>[...b],getDataAsString:()=>b.toString(),getContentType:()=>mime,getName:()=>name,setName:n=>blob(b,mime,n),copyBlob:()=>blob(b,mime,name)};}
 const iterator=items=>{let i=0;return {hasNext:()=>i<items.length,next:()=>items[i++]}};
 function fileFromMeta(meta,b){const obj={...meta,getId:()=>obj.id,getName:()=>obj.name,setName:n=>{obj.name=n;return obj},getBlob:()=>{if(!b)throw Error('Soubor nebyl přednačten: '+obj.id);return b;},getThumbnail:()=>b||null,getSize:()=>obj.size,getMimeType:()=>obj.mimeType,setTrashed:v=>{obj.trashed=!!v;return obj}};files.set(obj.id,obj);return obj;}
 function file(b,parentId=''){const id=crypto.randomUUID(),meta={id,name:b.getName(),mimeType:b.getContentType(),size:b.getBytes().length,parentId,trashed:false};pendingFiles.set(id,b);return fileFromMeta(meta,b);}
 function folder(name,id=crypto.randomUUID(),parentId=''){const f={id,name,parentId,getId:()=>id,getName:()=>f.name,createFile:b=>file(b,id),getFolders:()=>iterator([...folders.values()].filter(x=>x.parentId===id)),getFiles:()=>iterator([...files.values()].filter(x=>x.parentId===id&&!x.trashed)),getFoldersByName:n=>iterator([...folders.values()].filter(x=>x.parentId===id&&x.name===n)),getFilesByName:n=>iterator([...files.values()].filter(x=>x.parentId===id&&x.name===n&&!x.trashed)),createFolder:n=>folder(n,crypto.randomUUID(),id)};folders.set(id,f);return f;}
 for(const sh of state.sheets||[]){const obj=new Sheet(sh.name,decode(sh.rows));obj.hidden=!!sh.hidden;sheets.set(sh.name,obj);}
 for(const f of state.drive?.folders||[])folder(f.name,f.id,f.parentId||'');
 for(const f of state.drive?.files||[]){const bytes=options.blobs?.get(f.id);fileFromMeta(f,bytes?blob(bytes,f.mimeType,f.name):null);}
 const cache=new Map();let locked=false;
 const parts=(d,tz)=>Object.fromEntries(new Intl.DateTimeFormat('en-GB',{timeZone:tz,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'}).formatToParts(d).filter(p=>p.type!=='literal').map(p=>[p.type,p.value]));
 function formatDate(d,tz,pattern){const p=parts(d,tz);const values={yyyy:p.year,yy:p.year.slice(-2),MM:p.month,dd:p.day,HH:p.hour,mm:p.minute,ss:p.second};return pattern.replace(/yyyy|yy|MM|dd|HH|mm|ss/g,k=>values[k])}
 function parseDate(text,tz,pattern){const match=/^(\d{4})-(\d{1,2})-(\d{1,2})(?: (\d{1,2}):(\d{2})(?::(\d{2}))?)?$/.exec(text);if(!match)throw Error('Bad parsed date '+text);const desired=Date.UTC(+match[1],+match[2]-1,+match[3],+match[4]||0,+match[5]||0,+match[6]||0);let t=desired;for(let n=0;n<3;n++){const p=parts(new Date(t),tz),actual=Date.UTC(+p.year,+p.month-1,+p.day,+p.hour,+p.minute,+p.second);t+=desired-actual;}return new ClockDate(t)}
 const Utilities={DigestAlgorithm:{SHA_256:'sha256'},Charset:{UTF_8:'utf8'},computeDigest:(algorithm,input)=>[...crypto.createHash('sha256').update(typeof input==='string'?input:Buffer.from(input)).digest()],computeHmacSha256Signature:(value,key)=>[...crypto.createHmac('sha256',typeof key==='string'?key:Buffer.from(key)).update(typeof value==='string'?value:Buffer.from(value)).digest()],newBlob:blob,base64Encode:bytes=>Buffer.from(bytes).toString('base64'),base64Decode:s=>[...Buffer.from(s,'base64')],getUuid:()=>crypto.randomUUID(),formatDate,parseDate,sleep(){},getValidationCode:()=>''};
 function html(name){if(!Object.hasOwn(templates,name))throw Error('Chybí interní HTML '+name);return templates[name];}
 function render(name){return html(name);}
 const htmlOut=content=>({getContent:()=>content,setTitle(){return this},addMetaTag(){return this},setFaviconUrl(){return this}});
 const services={Date:ClockDate,console:{log(){},warn(){},error(){},info(){}},Utilities,PropertiesService:{getScriptProperties:()=>properties(propsStore),getUserProperties:()=>properties(userStore)},SpreadsheetApp:{openById:()=>ss,getActiveSpreadsheet:()=>ss,flush(){},newDataValidation:()=>({requireValueInList(){return this},setAllowInvalid(){return this},build(){return {}}})},LockService:{getScriptLock:()=>({waitLock(){if(locked)throw Error('Nested GAS lock');locked=true},tryLock(){if(locked)return false;locked=true;return true},releaseLock(){locked=false}})},CacheService:{getScriptCache:()=>({get:k=>cache.get(k)??null,put:(k,v)=>cache.set(k,v),remove:k=>cache.delete(k),getAll:keys=>Object.fromEntries(keys.filter(k=>cache.has(k)).map(k=>[k,cache.get(k)])),putAll:obj=>Object.entries(obj).forEach(([k,v])=>cache.set(k,v))})},Session:{getScriptTimeZone:()=> 'Europe/Prague',getActiveUser:()=>({getEmail:()=> options.activeUserEmail||''}),getEffectiveUser:()=>({getEmail:()=> options.effectiveUserEmail||''})},Logger:{log:v=>logs.push(v)},DriveApp:{createFile:b=>file(b),getFolderById:id=>{if(!folders.has(id))throw Error('Folder not found '+id);return folders.get(id)},createFolder:folder,getFileById:id=>{if(!files.has(id))throw Error('File not found');return files.get(id)}},ScriptApp:{getProjectTriggers:()=>triggers.slice(),deleteTrigger:t=>{const i=triggers.indexOf(t);if(i>=0)triggers.splice(i,1)},newTrigger:name=>({timeBased(){return this},everyMinutes(n){this.minutes=n;return this},create(){const t={name,minutes:this.minutes,getHandlerFunction:()=>name};triggers.push(t);return t}})},HtmlService:{createHtmlOutputFromFile:n=>htmlOut(html(n)),createTemplateFromFile:n=>({evaluate:()=>htmlOut(render(n))}),createHtmlOutput:s=>htmlOut(s)},GmailApp:options.gmail||{search(){throw Error('Gmail není připojen.');},getMessageById(){throw Error('Gmail není připojen.');}}};
 services.LockService.getUserLock=services.LockService.getScriptLock;
 services.__nativePassword=(password,salt,iterations)=>{if(!Number.isSafeInteger(iterations)||iterations<1||iterations>1000000)throw Error('Neplatný počet iterací hesla.');return crypto.pbkdf2Sync(password,salt,iterations,32,'sha256').toString('hex');};
 const business=createBusiness(services);
 function exportState(){return {schemaVersion:1,spreadsheetId:ss.getId(),properties:{...propsStore},userProperties:{...userStore},sheets:[...sheets.values()].map(x=>({name:x.name,hidden:x.hidden,rows:encode(x.rows)})),drive:{folders:[...folders.values()].map(x=>({id:x.id,name:x.name,parentId:x.parentId})),files:[...files.values()].map(x=>({id:x.id,name:x.name,mimeType:x.mimeType,size:x.size,parentId:x.parentId,trashed:!!x.trashed}))}};}
 function invoke(name,args=[]){if(typeof business[name]!=='function')throw Error('Neexistující operace '+name);return business[name](...args);}
 return {business,invoke,exportState,pendingFiles,files,folders,propsStore,userStore,sheets,ss,blob,logs,writes,triggers,ClockDate,copy,formatDate,parseDate,setNow:t=>now=typeof t==='string'?Date.parse(t):t};
}
