/**
 * AUTOMYČKA PERFECT 2.0 – 25_PROFIL_STATISTIKY.gs
 * Read-only statistiky přihlášeného pracovníka.
 * Vyžaduje existující autentizaci perfectRepairRequireUser_ a centrální databaseGetAllOrders.
 * NEZAPISUJE do objednávek, nemění ceny, IDs ani přihlášení.
 * Vrací pouze datum, číslo objednávky, vozidlo a program – NIKDY tržby.
 */
function perfect40Original_perfectStaffGetMyStatistics_(token) {
  const user=perfectRepairRequireUser_(token);
  if(typeof databaseGetAllOrders!=='function')throw new Error('Chybí funkce centrální databáze databaseGetAllOrders.');
  const normalize=v=>String(v==null?'':v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toLowerCase().replace(/\s+/g,' ');
  const names=[user.firstName,user.surname].filter(Boolean).join(' ').trim();
  const id=normalize(user.id), username=normalize(user.username), full=normalize(names);
  // Identita podle stabilního ID nebo uživatelského jména. Samotné jméno
  // uznáme jen pokud je mezi účty jednoznačné, aby se data nepletla.
  const users=typeof perfectRepairUsers_==='function'?perfectRepairUsers_():[];
  const sameName=full?users.filter(u=>normalize([u.firstName,u.surname].filter(Boolean).join(' '))===full).length:0;
  const mine=raw=>{const v=normalize(raw);return !!v&&(v===id||v===username||(sameName===1&&v===full));};
  const dateStr=value=>{
    if(value instanceof Date){return isNaN(value.getTime())?'':Utilities.formatDate(value,'Europe/Prague','yyyy-MM-dd');}
    const s=String(value==null?'':value).trim();
    let m=/^(\d{4})-(\d{1,2})-(\d{1,2})/.exec(s);
    if(m)return m[1]+'-'+m[2].padStart(2,'0')+'-'+m[3].padStart(2,'0');
    m=/^(\d{1,2})\.(\d{1,2})\.(\d{4})/.exec(s);
    return m?m[3]+'-'+m[2].padStart(2,'0')+'-'+m[1].padStart(2,'0'):'';
  };
  // V60: stejné ruční přiřazení a směny jako přehled boxů.
  // Ruční zařazení má přednost před starým polem PRACOVNIK.
  const since='2026-08-01',until=Utilities.formatDate(new Date(),'Europe/Prague','yyyy-MM-dd');
  const sourceOrders=databaseGetAllOrders().filter(o=>{const d=dateStr(o.DATUM_OBJEDNANI);return d>=since&&d<=until;});
  const relevant=new Set(sourceOrders.map(o=>String(o.ORDER_ID||'')));
  const assignments=perfectBoxes29Rows_('order',null,null,relevant),shifts=perfectBoxes29Rows_('shift',since,until);
  const byOrder=new Map(),ownShifts=new Set();
  assignments.forEach(r=>{
    const key=String(r.ORDER_ID||'');if(!key)return;
    if(byOrder.has(key))throw Error('Více záznamů přiřazení pro zakázku '+key+'. Nutná kontrola boxů.');
    byOrder.set(key,r);
  });
  const occupied=new Set();
  shifts.filter(r=>r.ACTIVE===true).forEach(r=>{
    const key=String(r.DATE)+'|'+String(r.STATION);
    if(occupied.has(key))throw Error('Více aktivních směn pro '+key+'. Nutná kontrola směn.');
    occupied.add(key);
    if(String(r.USER_ID)===String(user.id))ownShifts.add(key);
  });
  const seen=new Set(),orders=[];
  sourceOrders.forEach(o=>{
    const orderId=String(o.ORDER_ID||'').trim();
    if(!orderId)return;
    if(seen.has(orderId))throw Error('Duplicitní číslo zakázky '+orderId+'. Statistiku nelze bezpečně spočítat.');
    seen.add(orderId);
    if(!/^(dokonceno|vyhotoveno)$/.test(normalize(o.STAV_OBJEDNAVKY)))return;
    const date=dateStr(o.DATUM_OBJEDNANI);if(!date)return;
    const override=byOrder.get(orderId),manual=override&&override.ACTIVE===true;
    let belongs=false;
    if(manual){
      if(override.STATION==='SHARED'){
        const split=perfectBoxes49ReadSplit_(override,perfectRepairMoney_(o.CENA_CELKEM));
        if(!split.valid)throw Error('Neplatné rozdělení zakázky '+orderId+'. '+split.error);
        belongs=(split.box1>0&&ownShifts.has(date+'|BOX1'))||(split.box2>0&&ownShifts.has(date+'|BOX2'));
      }else if(['BOX1','BOX2','DETAILING'].indexOf(override.STATION)>=0){
        belongs=ownShifts.has(date+'|'+override.STATION);
      }
      // QUEUE znamená výslovné odebrání z boxů, bez návratu ke starému pracovníkovi.
    }else{
      const split=perfectShared33Read_(o);
      if(split){
        if(!split.valid)throw Error('Neplatné historické rozdělení zakázky '+orderId+'.');
        belongs=(split.box1>0&&ownShifts.has(date+'|BOX1'))||(split.box2>0&&ownShifts.has(date+'|BOX2'));
      }else if(/^D\d{4}-/.test(orderId)){
        belongs=ownShifts.has(date+'|DETAILING');
      }else belongs=mine(o.PRACOVNIK);
    }
    if(belongs)orders.push({orderId,date,vehicle:String(o.VOZIDLO||''),program:String(o.MYCI_PROGRAM||'')});
  });
  orders.sort((a,b)=>b.date.localeCompare(a.date)||b.orderId.localeCompare(a.orderId));
  const ranking=field=>{const counts=new Map();orders.forEach(o=>{const label=o[field]||'Neuvedeno',key=normalize(label);if(!counts.has(key))counts.set(key,{name:label,count:0});counts.get(key).count++;});return Array.from(counts.values()).sort((a,b)=>b.count-a.count||a.name.localeCompare(b.name));};
  return {success:true,since,orders,vehicles:ranking('vehicle'),programs:ranking('program')};
}
