// Compatibility data layer: original business rules, MongoDB persistence, no Google API calls.
export const decode=v=>v&&typeof v==='object'&&v.$date?new Date(v.$date):v;
export const encode=v=>v instanceof Date?{$date:v.toISOString()}:v;
export function workbook(state){
 const sheets=new Map();
 class Range{
  constructor(sh,r,c,n=1,w=1){if(![r,c,n,w].every(x=>Number.isInteger(x)&&x>0))throw Error('Neplatný rozsah.');Object.assign(this,{sh,r,c,n,w});}
  getValues(){return Array.from({length:this.n},(_,i)=>Array.from({length:this.w},(_,j)=>decode(this.sh.data.rows[this.r+i-1]?.[this.c+j-1]??'')));}
  setValues(values){if(values.length!==this.n||values.some(r=>r.length!==this.w))throw Error('Rozměr zápisu nesouhlasí.');values.forEach((row,i)=>{const target=this.sh.data.rows[this.r+i-1]??=[];row.forEach((v,j)=>target[this.c+j-1]=encode(v));});return this;}
  getValue(){return this.getValues()[0][0];} setValue(v){return this.setValues([[v]]);}
  getDisplayValues(){return this.getValues().map(r=>r.map(v=>v==null?'':v instanceof Date?v.toISOString():String(v)));}getDisplayValue(){return this.getDisplayValues()[0][0];}
  clearContent(){return this.setValues(Array.from({length:this.n},()=>Array(this.w).fill('')));}clearContents(){return this.clearContent();}
  getRow(){return this.r;}getColumn(){return this.c;}getSheet(){return this.sh;}getMergedRanges(){return [];}isPartOfMerge(){return false;}
  getA1Notation(){return 'R'+this.r+'C'+this.c;}getFormulas(){return this.getValues().map(r=>r.map(()=>''));}getFontColors(){return this.getValues().map(r=>r.map(()=>'#000000'));}
  createTextFinder(text){let entire=false;return {matchEntireCell(v){entire=v;return this;},findNext:()=>{const rows=this.getValues();for(let i=0;i<rows.length;i++)for(let j=0;j<rows[i].length;j++)if(entire?String(rows[i][j])===String(text):String(rows[i][j]).includes(String(text)))return new Range(this.sh,this.r+i,this.c+j);return null;}};}
 }
 for(const method of ['setNumberFormat','setFontWeight','setFontSize','setFontFamily','setBackground','setBackgrounds','setFontColor','setFontColors','setBorder','setHorizontalAlignment','setVerticalAlignment','setWrap','setWrapStrategy','setNote','setDataValidation','merge','breakApart','createFilter'])Range.prototype[method]=function(){return this;};
 class Sheet{
  constructor(data){this.data=data;}getName(){return this.data.name;}getParent(){return ss;}
  getLastRow(){let n=this.data.rows.length;while(n&&!this.data.rows[n-1]?.some(v=>v!==''&&v!=null))n--;return n;}
  getLastColumn(){return Math.max(0,...Array.from(this.data.rows,r=>{let n=r?.length||0;while(n&&(r[n-1]===''||r[n-1]==null))n--;return n;}));}
  getMaxColumns(){return Math.max(26,this.getLastColumn());}getMaxRows(){return Math.max(1000,this.data.rows.length);}
  getRange(r,c,n,w){if(typeof r==='string'){const m=/^([A-Z]+)(\d+)(?::([A-Z]+)(\d+))?$/.exec(r);if(!m)throw Error('Nepodporovaný rozsah: '+r);const col=s=>[...s].reduce((v,ch)=>v*26+ch.charCodeAt(0)-64,0);return new Range(this,Number(m[2]),col(m[1]),m[4]?Number(m[4])-Number(m[2])+1:1,m[3]?col(m[3])-col(m[1])+1:1);}return new Range(this,r,c,n,w);}
  getDataRange(){return this.getRange(1,1,Math.max(1,this.getLastRow()),Math.max(1,this.getLastColumn()));}
  appendRow(row){this.getRange(this.getLastRow()+1,1,1,row.length).setValues([row]);return this;}
  deleteRow(r){this.data.rows.splice(r-1,1);return this;}insertRowsAfter(r,n){this.data.rows.splice(r,0,...Array.from({length:n},()=>[]));return this;}
  clearContents(){this.data.rows=[];return this;}isSheetHidden(){return !!this.data.hidden;}hideSheet(){this.data.hidden=true;return this;}showSheet(){this.data.hidden=false;return this;}
  getFilter(){return null;}getImages(){return [];}getConditionalFormatRules(){return [];}getRangeList(a){const ranges=a.map(r=>this.getRange(r));return {getRanges:()=>ranges,setValue(v){for(const range of ranges)range.setValues(Array.from({length:range.n},()=>Array(range.w).fill(v)));return this;}};}
 }
 for(const method of ['setFrozenRows','insertColumnsAfter','setHiddenGridlines','setColumnWidth','setRowHeight','setRowHeights','setTabColor','autoResizeColumns','setConditionalFormatRules','hideColumns','activate'])Sheet.prototype[method]=function(){return this;};
 const ss={getId:()=>state.spreadsheetId||'mongo',getName:()=> 'PERFECT MongoDB',getSpreadsheetTimeZone:()=> 'Europe/Prague',getSheets:()=>[...sheets.values()],getSheetByName:name=>sheets.get(name)||null,insertSheet(name){if(sheets.has(name))throw Error('List již existuje.');const data={name,rows:[],hidden:false};state.sheets.push(data);const sh=new Sheet(data);sheets.set(name,sh);return sh;},toast(){},setActiveSheet(){}};
 for(const data of state.sheets)sheets.set(data.name,new Sheet(data));
 return ss;
}
