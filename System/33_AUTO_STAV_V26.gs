/** 33_AUTO_STAV_V26.gs — jediné automatické dokončování podle programu. */
function perfectOrderTimingV26_(order){return perfectTiming31Meta_(order);}
function perfect40Original_perfectAutoStatusRun_(){return databaseTiming31Apply_(false);}
function perfect40Original_perfectAutoStatusPreview_(){return databaseTiming31Apply_(true);}
function perfect40Original_perfectAutoStatusBackfill_(){return databaseTiming31Apply_(false);}
function perfect40Original_perfectControlSetupV26_(token){perfectAuthRequireAdmin_(token);return perfectNastavitAutomatikuV31_();}
function perfect40Original_perfectControlTickV26_(token){return perfectControlTickAddons31(token);}

function perfectProgramColorV26_(name){
 const norm=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase().replace(/[^A-Z0-9]+/g,' ').trim();
 const key=norm(name);let color='';
 try{if(typeof perfectRepairServices_==='function'){const services=perfectProgramColorV26_.services||(perfectProgramColorV26_.services=perfectRepairServices_());const service=services.filter(x=>x.AKTIVNI!==false&&norm(x.NAZEV)&&(' '+key+' ').includes(' '+norm(x.NAZEV)+' ')).sort((a,b)=>norm(b.NAZEV).length-norm(a.NAZEV).length)[0];if(service)color=service.BARVA;}}catch(e){}
 if(!/^#[0-9a-f]{6}$/i.test(color)){try{if(typeof perfectBarvaMycihoProgramu_==='function')color=perfectBarvaMycihoProgramu_(name);}catch(e){}}
 return /^#[0-9a-f]{6}$/i.test(color)?color:'';
}
