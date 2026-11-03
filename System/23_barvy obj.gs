/** AUTOMYČKA PERFECT 2.0 – kontrola a oprava BAREV ID bez změny čísel. */
function perfectOrderIdColorsPreview() {
  const sh = databaseGetOrdersSheet_();
  const last = sh.getLastRow();
  if (last < 3) return {checked:0, blue:0, orange:0, invalid:[]};
  const ids = sh.getRange(3,1,last-2,1).getDisplayValues();
  const out={checked:0,blue:0,orange:0,invalid:[]};
  ids.forEach((r,i)=>{const id=String(r[0]||'').trim();if(!id)return;out.checked++;
    if(/^N\d{4}-\d+$/i.test(id))out.blue++;
    else if(/^OF\d{4}-\d+$/i.test(id))out.orange++;
    else out.invalid.push({row:i+3,id});
  });
  Logger.log(JSON.stringify(out,null,2));return out;
}
function perfectOrderIdColorsApply() {
  const lock=LockService.getScriptLock();lock.waitLock(30000);
  try {
    const sh=databaseGetOrdersSheet_(),last=sh.getLastRow();
    if(last<3)return {updated:0};
    const r=sh.getRange(3,1,last-2,1),ids=r.getDisplayValues(),colors=r.getFontColors();let updated=0;
    ids.forEach((v,i)=>{const id=String(v[0]||'').trim();
      const color=/^N\d{4}-\d+$/i.test(id)?'#38bdf8':/^OF\d{4}-\d+$/i.test(id)?'#f59e0b':null;
      if(color&&String(colors[i][0]).toLowerCase()!==color){colors[i][0]=color;updated++;}
    });
    if(updated)r.setFontColors(colors);
    Logger.log('Barvy ORDER_ID opraveny: '+updated);
    return {updated};
  } finally {lock.releaseLock();}
}
