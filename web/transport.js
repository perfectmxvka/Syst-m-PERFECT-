(function(){'use strict';
function runner(ok,fail){return new Proxy(Object.create(null),{get:(_,key)=>{
 if(key==='withSuccessHandler')return fn=>runner(fn,fail);if(key==='withFailureHandler')return fn=>runner(ok,fn);
 if(typeof key!=='string'||!/^perfect[A-Za-z0-9]+$/.test(key))return undefined;
 return (...args)=>{const url=window.PERFECT_CONFIG?.apiUrl;
  if(!url){fail?.({message:'Nastav adresu API v souboru config.js.'});return;}
  fetch(url,{method:'POST',mode:'cors',cache:'no-store',headers:{'Content-Type':'application/json'},body:JSON.stringify({method:key,args}),signal:AbortSignal.timeout(85000)})
  .then(async r=>{const data=await r.json();if(!r.ok||data.error)throw Error(data.error||'Server nepotvrdil operaci.');return data.data;}).then(data=>ok?.(data)).catch(e=>fail?.({message:e.message||'Server není dostupný.'}));
 };
}});}
// Přechodový adaptér zachovává rozhraní klienta; žádný požadavek nejde do Apps Scriptu.
window.google={script:{run:runner()}};
})();
