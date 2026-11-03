import {createRuntime as original} from './runtime.mjs';
import {formatDate,parseDate} from './dates107.mjs';
const pages=new Set(['dashboard','calendar','orders','customers','vehicles','payments','stats','editor','services','detailing','settings','boxes49','vouchers','admin45']);
export function createRuntime(...args){
 const runtime=original(...args),ctx=runtime.ctx;ctx.Utilities.formatDate=formatDate;ctx.Utilities.parseDate=parseDate;
 const bootstrap=ctx.perfect40Original_perfectWebBootstrap36_,call=runtime.call;
 let scope=null;
 ctx.perfect40Original_perfectWebBootstrap36_=function(token){return scope?ctx.perfect109Bootstrap_(token,scope):bootstrap.apply(null,arguments);};
 runtime.call=function(method,args){
  const option=args?.at(-1)?.scope109;
  if(option&&['perfectAuthLoginBootstrap37','perfectWebBootstrap36','perfect101Snapshot'].includes(method)){
   if(!pages.has(option.page)||!Number.isInteger(option.offset??0)||Math.abs(option.offset??0)>520)throw Error('Neplatná sekce.');
   scope={page:option.page,offset:option.offset??0};
  }
  try{return call.call(runtime,method,args);}finally{scope=null;}
 };
 return runtime;
}
