// Bounded cache of formatting rules only. No accounts or business data are cached.
const formatters=new Map();
function formatter(zone){
 if(formatters.has(zone))return formatters.get(zone);
 const f=new Intl.DateTimeFormat('en-GB',{timeZone:zone,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'});
 if(formatters.size>=16)formatters.delete(formatters.keys().next().value);
 formatters.set(zone,f);return f;
}
export function formatDate(date,zone,pattern){const parts=Object.fromEntries(formatter(zone).formatToParts(new Date(date)).map(p=>[p.type,p.value]));const dict={yyyy:parts.year,yy:parts.year.slice(-2),MM:parts.month,dd:parts.day,HH:parts.hour,mm:parts.minute,ss:parts.second,M:String(Number(parts.month)),d:String(Number(parts.day))};return pattern.replace(/yyyy|yy|MM|dd|HH|mm|ss|M|d/g,k=>dict[k]);}
export function parseDate(text,zone,pattern){
 const tokens=pattern.match(/yyyy|MM|dd|HH|mm|ss/g)||[],parts=String(text).match(/\d+/g)||[];if(tokens.length!==parts.length)throw Error('Neplatné datum.');const v={yyyy:1970,MM:1,dd:1,HH:0,mm:0,ss:0};tokens.forEach((t,i)=>v[t]=Number(parts[i]));const target=Date.UTC(v.yyyy,v.MM-1,v.dd,v.HH,v.mm,v.ss);let date=new Date(target);
 for(let i=0;i<4;i++){const p=formatDate(date,zone,'yyyy-MM-dd HH:mm:ss').match(/\d+/g).map(Number),local=Date.UTC(p[0],p[1]-1,p[2],p[3],p[4],p[5]),delta=target-local;if(!delta)break;date=new Date(date.getTime()+delta);}
 if(formatDate(date,zone,pattern)!==String(text))throw Error('Neplatné nebo neexistující místní datum.');return date;
}
