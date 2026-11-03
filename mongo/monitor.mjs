import {monitorEventLoopDelay} from 'node:perf_hooks';
const lag=monitorEventLoopDelay({resolution:20});lag.enable();
let requests=0,errors=0,totalMs=0,maxMs=0;const counts={full:0,cached:0,targeted:0};
export function trace(name,detail={}){if(name==='db.read.mode'&&Object.hasOwn(counts,detail.mode))counts[detail.mode]++;}
export function observe(method,ms,ok){requests++;errors+=ok?0:1;totalMs+=ms;maxMs=Math.max(maxMs,ms);if(!ok||ms>2000)console.log(JSON.stringify({event:'perfect105.request',method,ms:Math.round(ms),ok}));}
const timer=setInterval(()=>{console.log(JSON.stringify({event:'perfect105.performance',requests,errors,meanMs:requests?Math.round(totalMs/requests):0,maxMs:Math.round(maxMs),reads:counts,rssMB:Math.round(process.memoryUsage().rss/1048576),eventLoopP95Ms:Math.round(lag.percentile(95)/1e6)}));requests=errors=totalMs=maxMs=0;for(const k of Object.keys(counts))counts[k]=0;lag.reset();},60000);timer.unref();
