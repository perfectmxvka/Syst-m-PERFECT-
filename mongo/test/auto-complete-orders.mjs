import {createRuntime} from './performance107.mjs';

// The same business rules used by the panel, also when no browser is open.
export function completeDueOrders(state) {
  const c=createRuntime(state).ctx;
  return c.perfect40Trusted_(()=>c.databaseTiming31Apply_(false));
}
export function scheduleOrderCompletion(store,serialized,{onError=console.error}={}) {
  let busy=false;
  async function tick(){
    if(busy)return;
    busy=true;
    try{await serialized(()=>store.run(completeDueOrders));}
    catch(error){onError('Automatic order completion failed; retrying next minute:',error.name);}
    finally{busy=false;}
  }
  void tick();
  const timer=setInterval(tick,60000);timer.unref();
  return ()=>clearInterval(timer);
}
