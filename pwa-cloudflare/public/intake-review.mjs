import {parseIntake,intakeFromOcr} from './intake110.mjs';

const fields=[['DATUM_OBJEDNANI','Datum','date'],['CAS_PRIJEZDU','Příjezd','time'],['JMENO_PRIJMENI','Jméno zákazníka','text'],['TELEFON','Telefon','tel'],['VOZIDLO','Vozidlo','text'],['SPZ','SPZ','text'],['MYCI_PROGRAM','Program','text'],['DOPLNKY','Služba navíc','text'],['CENA_CELKEM','Celková cena (Kč)','number'],['POZNAMKY','Poznámka','text']];
let loadingReader;
function reader(){
 if(window.Tesseract)return Promise.resolve(window.Tesseract);
 if(!loadingReader)loadingReader=new Promise((resolve,reject)=>{const script=document.createElement('script');script.src='/ocr/tesseract.min.js';script.onload=()=>resolve(window.Tesseract);script.onerror=()=>{loadingReader=null;script.remove();reject(Error('Čtečka se nenačetla. Údaje můžeš vyplnit ručně.'));};document.head.append(script);});
 return loadingReader;
}
export function openIntakeReview(file,{onReview}){
 const dialog=document.createElement('dialog');dialog.className='p101-dialog';dialog.style.cssText='width:min(760px,calc(100vw - 20px));max-height:92dvh;overflow:auto';
 dialog.innerHTML=`<h2>Zkontrolovat fotografii a údaje</h2><p>Porovnej každé pole s fotografií. Nečitelné údaje doplň ručně. Nic se neuloží bez potvrzení objednávky.</p><div data-preview style="position:relative;touch-action:auto"><img alt="Vyfocený objednávkový list" style="display:block;width:100%;height:auto"><div data-crop hidden style="position:absolute;border:3px solid #e6bd69;background:#e6bd6922;pointer-events:none;box-sizing:border-box"></div></div><details><summary>Oříznout fotografii</summary><p>Tažením přes fotografii označ pouze list. Pak zvol Přečíst výřez.</p><button class="btn secondary" type="button" data-read>Přečíst výřez znovu</button> <button class="btn secondary" type="button" data-reset>Celá fotografie</button></details><p role="status" data-status></p><form><label>Rok listu (pokud na fotografii chybí)<input class="field" name="year" type="number" min="2000" max="2100"></label><div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,220px),1fr));gap:12px">${fields.map(([key,label,type])=>`<label>${label}<input class="field" name="${key}" type="${type}" ${type==='number'?'min="0" step="0.01"':''} ${type==='time'?'min="08:00" max="19:30" step="1800"':''} placeholder="Zkontroluj nebo doplň"></label>`).join('')}</div><p data-validation role="alert"></p><label><input type="checkbox" name="confirmed" required> Porovnal/a jsem údaje s fotografií.</label><button class="btn" type="submit">Použít údaje v objednávce</button> <button class="btn secondary" type="button" data-close>Zavřít</button></form><details><summary>Původní rozpoznaný text</summary><pre data-raw style="white-space:pre-wrap;overflow-wrap:anywhere"></pre></details>`;
 document.body.append(dialog);dialog.showModal();
 const image=dialog.querySelector('img'),preview=dialog.querySelector('[data-preview]'),box=dialog.querySelector('[data-crop]'),status=dialog.querySelector('[data-status]'),read=dialog.querySelector('[data-read]'),reset=dialog.querySelector('[data-reset]'),form=dialog.querySelector('form'),year=form.elements.year;
 dialog.querySelector('details').ontoggle=event=>{preview.style.touchAction=event.currentTarget.open?'none':'auto';};
 year.value=new Intl.DateTimeFormat('en',{timeZone:'Europe/Prague',year:'numeric'}).format(new Date());
 const url=URL.createObjectURL(file);image.src=url;let closed=false,busy=false,worker=null,crop=null,start=null,lastResult=null;const edited=new Set();
 for(const [key] of fields)form.elements[key].addEventListener('input',()=>{edited.add(key);form.elements.confirmed.checked=false;});
 const paint=()=>{box.hidden=!crop;if(crop)Object.assign(box.style,{left:crop.x*100+'%',top:crop.y*100+'%',width:crop.w*100+'%',height:crop.h*100+'%'});};
 const point=e=>{const r=image.getBoundingClientRect();return {x:Math.min(1,Math.max(0,(e.clientX-r.left)/r.width)),y:Math.min(1,Math.max(0,(e.clientY-r.top)/r.height))};};
 preview.onpointerdown=e=>{if(busy||!dialog.querySelector('details').open)return;start=point(e);preview.setPointerCapture?.(e.pointerId);};
 preview.onpointermove=e=>{if(!start)return;const p=point(e);crop={x:Math.min(start.x,p.x),y:Math.min(start.y,p.y),w:Math.abs(p.x-start.x),h:Math.abs(p.y-start.y)};paint();};
 preview.onpointerup=()=>{start=null;if(crop&&(crop.w<.05||crop.h<.05)){crop=null;paint();}};
 preview.onpointercancel=()=>{start=null;};
 const apply=data=>{lastResult=data;const result=intakeFromOcr(data,{year:Number(year.value)});for(const [key] of fields)if(!edited.has(key))form.elements[key].value=result.draft[key]??'';dialog.querySelector('[data-raw]').textContent=result.text;form.elements.confirmed.checked=false;status.textContent='Návrhy jsou připravené ke kontrole. Nejasná pole zůstala prázdná. U rukopisu může být nutné údaje přepsat podle fotografie.';};
 year.oninput=()=>{if(lastResult)apply(lastResult);};
 async function recognize(){
  if(busy||closed)return;busy=true;read.disabled=reset.disabled=true;status.textContent='Čtu fotografii… Údaje můžeš také vyplnit ručně.';
  try{
   await image.decode();if(closed)return;
   const r=crop||{x:0,y:0,w:1,h:1},width=image.naturalWidth*r.w,height=image.naturalHeight*r.h,scale=Math.min(2,2600/Math.max(width,height));
   const canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(width*scale));canvas.height=Math.max(1,Math.round(height*scale));
   const ctx=canvas.getContext('2d',{willReadFrequently:true});ctx.fillStyle='#fff';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.drawImage(image,image.naturalWidth*r.x,image.naturalHeight*r.y,width,height,0,0,canvas.width,canvas.height);
   const pixels=ctx.getImageData(0,0,canvas.width,canvas.height);for(let i=0;i<pixels.data.length;i+=4){const gray=Math.round(.299*pixels.data[i]+.587*pixels.data[i+1]+.114*pixels.data[i+2]);pixels.data[i]=pixels.data[i+1]=pixels.data[i+2]=Math.max(0,Math.min(255,(gray-128)*1.25+128));}ctx.putImageData(pixels,0,0);
   const tesseract=await reader();if(closed)return;
   const created=await tesseract.createWorker(['ces','eng'],1,{workerPath:'/ocr/worker.min.js',corePath:'/ocr',langPath:'/ocr',logger:m=>{if(!closed)status.textContent=(m.status==='recognizing text'?'Čtu fotografii':'Připravuji čtečku')+' · '+Math.round((m.progress||0)*100)+' %';}});
   if(closed){await created.terminate();return;}worker=created;
   await worker.setParameters({preserve_interword_spaces:'1',tessedit_pageseg_mode:'3'});
   let result=(await worker.recognize(canvas,{}, {text:true,blocks:true})).data;
   if(!closed&&Object.keys(intakeFromOcr(result,{year:Number(year.value)}).draft).length<3){
    await worker.setParameters({tessedit_pageseg_mode:'11'});
    const second=(await worker.recognize(canvas,{}, {text:true,blocks:true})).data;
    const score=x=>Object.keys(intakeFromOcr(x,{year:Number(year.value)}).draft).length*100+(Number(x.confidence)||0);
    if(score(second)>score(result))result=second;
   }
   if(!closed)apply(result);
  }catch(error){if(!closed)status.textContent='Fotografii se nepodařilo přečíst. Doplň údaje podle náhledu nebo zkus nový výřez.';}
  finally{const current=worker;worker=null;await current?.terminate().catch(()=>{});busy=false;if(!closed)read.disabled=reset.disabled=false;}
 }
 read.onclick=recognize;reset.onclick=()=>{crop=null;paint();recognize();};
 const close=()=>dialog.close();dialog.querySelector('[data-close]').onclick=close;
 dialog.addEventListener('close',()=>{closed=true;URL.revokeObjectURL(url);const current=worker;worker=null;current?.terminate().catch(()=>{});dialog.remove();},{once:true});
 form.onsubmit=event=>{
  event.preventDefault();if(!form.reportValidity())return;
  const labelMap={DATUM_OBJEDNANI:'Datum',CAS_PRIJEZDU:'Příjezd',JMENO_PRIJMENI:'Jméno',TELEFON:'Telefon',VOZIDLO:'Vůz',SPZ:'SPZ',MYCI_PROGRAM:'Program',DOPLNKY:'Služba navíc',CENA_CELKEM:'Cena',POZNAMKY:'Poznámka'};
  const values=Object.fromEntries(fields.map(([key])=>[key,form.elements[key].value.trim()]));
  const draft=parseIntake(fields.map(([key])=>labelMap[key]+': '+values[key]).join('\n'),{year:Number(year.value)});
  const invalid=fields.filter(([key])=>values[key]&&!Object.hasOwn(draft,key));
  if(invalid.length){dialog.querySelector('[data-validation]').textContent='Oprav pole: '+invalid.map(([,label])=>label).join(', ');return;}
  if(!Object.keys(draft).length){dialog.querySelector('[data-validation]').textContent='Doplň alespoň jeden údaj podle fotografie.';return;}
  close();onReview(draft);
 };
 recognize();return dialog;
}
