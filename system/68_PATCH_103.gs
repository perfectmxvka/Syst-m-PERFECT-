/** PERFECT 1.03 — měsíční bonusy, přesné haléře, audit a ochrana souběhu. */
function perfect103BonusSave(token,input){return perfect102Write_(token,'shifts.manage',true,input,function(p,actor){
 var month=perfect101Month_(p.month),userId=String(p.userId||'');perfect102Target_(actor,userId);
 if(typeof p.health!=='boolean')throw Error('Neplatný stav zdravotního příspěvku.');
 // Pokuta je zadána jako záporná hodnota; v uložišti je kladná velikost srážky.
 var fine=String(p.fines==null?'':p.fines).trim().replace(',','.');
 if(!/^-?\d+(?:\.\d{1,2})?$/.test(fine)||Number(fine)>0)throw Error('Pokutu zadej jako zápornou částku nebo nulu.');
 return {type:'bonus',id:'B103_'+perfect101Hash_(userId+'|'+month).slice(0,32),userId:userId,month:month,health:p.health,
 healthCents:p.health?300000:0,otherCents:perfect102Money_(p.otherBonus),fineCents:perfect102Money_(fine.replace(/^-/,'')),note:perfect102Text_(p.note,1000),expectedVersion:perfect102Version_(p)};
});}
function perfect103ApplyBonuses_(employees,month,events){
 var state=perfect102State_(events);
 employees.forEach(function(e){var id='B103_'+perfect101Hash_(e.id+'|'+month).slice(0,32),r=state.latest.get('bonus|'+id);
  if(r&&(r.userId!==e.id||r.month!==month||typeof r.health!=='boolean'||r.healthCents!==(r.health?300000:0)||![r.otherCents,r.fineCents].every(function(n){return Number.isSafeInteger(n)&&n>=0&&n<=100000000;})))throw Error('Poškozený záznam bonusů. Výpočet byl zastaven.');
  e.health=r?r.healthCents/100:0;e.otherBonus=r?r.otherCents/100:0;e.fines=r?r.fineCents/100:0;
  e.bonus=r?Object.assign({},r,{history:state.history.get('bonus|'+id)||[]}):null;
  e.net=(Math.round(e.net*100)+Math.round(e.health*100)+Math.round(e.otherBonus*100)-Math.round(e.fines*100))/100;
 });
}
/** Metadata ceníku jsou uložena v sedmém sloupci stejného řádku. */
function perfect103ServiceMeta_(p){
 p=p||{};var duration=Number(p.duration||0),position=Number(p.position||0);
 if(!Number.isInteger(duration)||duration<0||duration>1440||!Number.isInteger(position)||position<0||position>9999)throw Error('Délka musí být 0–1440 minut, pořadí 0–9999.');
 var variants=Array.isArray(p.variants)?p.variants:[];if(variants.length>12)throw Error('Nejvýše 12 cenových variant.');
 var names=new Set();variants=variants.map(function(v){var name=perfect102Text_(v.name,60);if(!name||names.has(name.toLowerCase()))throw Error('Varianty musí mít jedinečný název.');names.add(name.toLowerCase());return {name:name,price:perfect102Money_(v.price)/100};});
 return {description:perfect102Text_(p.description,2000),included:perfect102Text_(p.included,3000),duration:duration,position:position,badge:perfect102Text_(p.badge,40),variants:variants};
}
function perfect103ServiceRevision_(row){return perfect101Hash_(JSON.stringify(row));}

/** Jediný formát české sedmimístné SPZ. Ostatní registrační značky zůstávají celé. */
function perfect103PlateDisplay_(value){var key=String(value||'').toUpperCase().replace(/[^A-Z0-9]/g,'');return key.length===7?key.slice(0,3)+' '+key.slice(3):key;}
