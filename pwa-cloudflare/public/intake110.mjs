// Telefon: stejná normalizace ve formuláři, databázi i importu. Vlajka se neukládá do dat.
function perfectPhoneParse_(value){
 const raw=String(value??'').trim();
 if(!raw||!/^\+?[\d\s().-]+$/.test(raw))return null;
 let digits=raw.replace(/\D/g,''),international=raw.startsWith('+')||digits.startsWith('00');
 if(digits.startsWith('00'))digits=digits.slice(2);
 if(!international){if(digits.length===9)digits='420'+digits;else if(!(digits.length===12&&digits.startsWith('420')))return null;}
 if(!/^[1-9]\d{6,14}$/.test(digits))return null;
 const codes={"1":"US","7":"RU","20":"EG","27":"ZA","30":"GR","31":"NL","32":"BE","33":"FR","34":"ES","36":"HU","39":"IT","40":"RO","41":"CH","43":"AT","44":"GB","45":"DK","46":"SE","47":"NO","48":"PL","49":"DE","51":"PE","52":"MX","53":"CU","54":"AR","55":"BR","56":"CL","57":"CO","58":"VE","60":"MY","61":"AU","62":"ID","63":"PH","64":"NZ","65":"SG","66":"TH","81":"JP","82":"KR","84":"VN","86":"CN","90":"TR","91":"IN","92":"PK","93":"AF","94":"LK","95":"MM","98":"IR","211":"SS","212":"MA","213":"DZ","216":"TN","218":"LY","220":"GM","221":"SN","222":"MR","223":"ML","224":"GN","225":"CI","226":"BF","227":"NE","228":"TG","229":"BJ","230":"MU","231":"LR","232":"SL","233":"GH","234":"NG","235":"TD","236":"CF","237":"CM","238":"CV","239":"ST","240":"GQ","241":"GA","242":"CG","243":"CD","244":"AO","245":"GW","246":"IO","247":"AC","248":"SC","249":"SD","250":"RW","251":"ET","252":"SO","253":"DJ","254":"KE","255":"TZ","256":"UG","257":"BI","258":"MZ","260":"ZM","261":"MG","262":"RE","263":"ZW","264":"NA","265":"MW","266":"LS","267":"BW","268":"SZ","269":"KM","290":"SH","291":"ER","297":"AW","298":"FO","299":"GL","350":"GI","351":"PT","352":"LU","353":"IE","354":"IS","355":"AL","356":"MT","357":"CY","358":"FI","359":"BG","370":"LT","371":"LV","372":"EE","373":"MD","374":"AM","375":"BY","376":"AD","377":"MC","378":"SM","380":"UA","381":"RS","382":"ME","383":"XK","385":"HR","386":"SI","387":"BA","389":"MK","420":"CZ","421":"SK","423":"LI","500":"FK","501":"BZ","502":"GT","503":"SV","504":"HN","505":"NI","506":"CR","507":"PA","508":"PM","509":"HT","590":"GP","591":"BO","592":"GY","593":"EC","594":"GF","595":"PY","596":"MQ","597":"SR","598":"UY","599":"CW","670":"TL","672":"NF","673":"BN","674":"NR","675":"PG","676":"TO","677":"SB","678":"VU","679":"FJ","680":"PW","681":"WF","682":"CK","683":"NU","685":"WS","686":"KI","687":"NC","688":"TV","689":"PF","690":"TK","691":"FM","692":"MH","850":"KP","852":"HK","853":"MO","855":"KH","856":"LA","880":"BD","886":"TW","960":"MV","961":"LB","962":"JO","963":"SY","964":"IQ","965":"KW","966":"SA","967":"YE","968":"OM","970":"PS","971":"AE","972":"IL","973":"BH","974":"QA","975":"BT","976":"MN","977":"NP","992":"TJ","993":"TM","994":"AZ","995":"GE","996":"KG","998":"UZ","800":"","808":"","870":"","878":"","881":"","882":"","883":"","888":"","979":""};
 let code='';for(let size=3;size>=1;size--){if(Object.prototype.hasOwnProperty.call(codes,digits.slice(0,size))){code=digits.slice(0,size);break;}}
 if(!code||digits.length<=code.length)return null;
 if(code==='420'&&digits.length!==12)return null;
 let country=codes[code];
 const shared={"1242":"BS","1246":"BB","1264":"AI","1268":"AG","1284":"VG","1340":"VI","1345":"KY","1441":"BM","1473":"GD","1649":"TC","1664":"MS","1670":"MP","1671":"GU","1684":"AS","1721":"SX","1758":"LC","1767":"DM","1784":"VC","1787":"PR","1809":"DO","1829":"DO","1849":"DO","1868":"TT","1869":"KN","1876":"JM","1939":"PR","1658":"JM","76":"KZ","77":"KZ","35818":"AX","5993":"BQ","5994":"BQ","5997":"BQ","262269":"YT","262639":"YT","1204":"CA","1226":"CA","1236":"CA","1249":"CA","1250":"CA","1257":"CA","1263":"CA","1289":"CA","1306":"CA","1343":"CA","1354":"CA","1365":"CA","1367":"CA","1368":"CA","1382":"CA","1403":"CA","1416":"CA","1418":"CA","1428":"CA","1431":"CA","1437":"CA","1438":"CA","1450":"CA","1468":"CA","1474":"CA","1506":"CA","1514":"CA","1519":"CA","1548":"CA","1579":"CA","1581":"CA","1584":"CA","1587":"CA","1604":"CA","1613":"CA","1639":"CA","1647":"CA","1672":"CA","1683":"CA","1705":"CA","1709":"CA","1742":"CA","1753":"CA","1778":"CA","1780":"CA","1782":"CA","1807":"CA","1819":"CA","1825":"CA","1867":"CA","1873":"CA","1879":"CA","1902":"CA","1905":"CA"};
 for(const prefix of Object.keys(shared).sort((a,b)=>b.length-a.length)){if(digits.startsWith(prefix)){country=shared[prefix];break;}}
 const national=digits.slice(code.length),formatted='+'+code+' '+(code==='420'?national.match(/.{1,3}/g).join(' '):national);
 return {digits,key:digits,formatted,country};
}

const norm=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
const labels=[
 ['DATUM_OBJEDNANI','datum(?:\\s+(?:prijezdu|objednavky))?'],
 ['CAS_PRIJEZDU','cas(?:\\s+prijezdu)?|prijezd'],
 ['JMENO_PRIJMENI','jmeno(?:\\s+a\\s+prijmeni|\\s+zakaznika)?|zakaznik'],
 ['TELEFON','telefon(?:ni\\s+cislo)?|kontakt|tel[.]?'],
 ['VOZIDLO','vozidlo|typ\\s+vozu|vuz'],['SPZ','spz|registracni\\s+znacka'],
 ['DOPLNKY','sluzb[ay]\\s+navic|doplnkove\\s+sluzby|doplnky'],
 ['MYCI_PROGRAM','myci\\s+program|program|vyber\\s+sluzby|sluzba'],
 ['CENA_CELKEM','celkova\\s+cena|cena\\s+celkem|celkem|cena(?!\\s+(?:programu|doplnku))'],
 ['EMAIL','e-?mail'],['PRACOVNIK','pracovnik|zamestnanec|car\\s+lazebnik'],
 ['POZNAMKY','poznamky?|zprava'],['FIRMA','firma'],['DARKOVY_POUKAZ','darkovy\\s+poukaz|kod\\s+poukazu'],
 // Recognize but never import departure as arrival, nor prices of individual extras.
 [null,'odjezd|cena\\s+(?:programu|doplnku)']
].map(([key,source])=>[key,new RegExp('^(?:'+source+')(?:\\s*[:_–-]\\s*|\\s+|$)')]);
export function parseIntake(text,{year}={}){
 const lines=String(text).replace(/\r/g,'').split('\n').map(s=>s.trim()),out={};
 for(let i=0;i<lines.length;i++){
  const match=labels.map(([key,re])=>({key,match:norm(lines[i]).match(re)})).find(x=>x.match);
  if(!match||!match.key)continue;
  let value=lines[i].slice(match.match[0].length).trim();
  if(!value&&lines[i+1]&&!labels.some(([,re])=>re.test(norm(lines[i+1]))))value=lines[++i].trim();
  if(value&&!Object.hasOwn(out,match.key))out[match.key]=value;
 }
 if(out.DATUM_OBJEDNANI){
  const raw=out.DATUM_OBJEDNANI;
  let m=raw.match(/^(\d{1,2})[./]\s*(\d{1,2})[./]?\s*(20\d{2})?$/);
  const y=m?.[3]||(Number.isInteger(year)?String(year):'');
  const iso=m&&y?`${y}-${m[2].padStart(2,'0')}-${m[1].padStart(2,'0')}`:/^20\d{2}-\d{2}-\d{2}$/.test(raw)?raw:'';
  if(iso&&!isNaN(Date.parse(iso))&&new Date(iso).toISOString().slice(0,10)===iso)out.DATUM_OBJEDNANI=iso;else delete out.DATUM_OBJEDNANI;
 }
 if(out.CAS_PRIJEZDU){const m=out.CAS_PRIJEZDU.match(/^(\d{1,2})(?:[:.]([0-5]\d)|\s*h(?:od)?[.]?)$/i);const minutes=m?.[2]||'00';if(m&&+m[1]>=8&&+m[1]<=19&&['00','30'].includes(minutes))out.CAS_PRIJEZDU=m[1].padStart(2,'0')+':'+minutes;else delete out.CAS_PRIJEZDU;}
 if(out.TELEFON){const phone=perfectPhoneParse_(out.TELEFON);if(phone)out.TELEFON=phone.country==='CZ'?phone.digits.slice(3):phone.formatted;else delete out.TELEFON;}
 if(out.CENA_CELKEM){
  const m=out.CENA_CELKEM.match(/^(\d[\d .,\u00a0]*)(?:\s*(?:Kč|CZK|,-))?$/i);
  if(m){let n=m[1].trim().replace(/\s/g,'');if(n.includes(','))n=n.replace(/\./g,'').replace(',','.');else if(/^\d{1,3}(?:\.\d{3})+$/.test(n))n=n.replace(/\./g,'');out.CENA_CELKEM=Number(n);if(!Number.isFinite(out.CENA_CELKEM)||out.CENA_CELKEM<0)delete out.CENA_CELKEM;else out.CENA_PROGRAMU=out.CENA_CELKEM;}else delete out.CENA_CELKEM;
 }
 if(out.EMAIL&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(out.EMAIL))delete out.EMAIL;
 if(out.SPZ){const raw=out.SPZ.toUpperCase().replace(/\s/g,'');if(/^[A-Z0-9]{5,10}$/.test(raw)&&/\d/.test(raw))out.SPZ=raw.replace(/^(.{3})(.+)$/,'$1 $2');else delete out.SPZ;}
 for(const key of ['JMENO_PRIJMENI','VOZIDLO','MYCI_PROGRAM'])if(out[key]&&(!/\p{L}{2}/u.test(out[key])||/[<>{}]/.test(out[key])))delete out[key];
 return out;
}

// Low-confidence handwriting must not silently become a customer or a phone.
export function intakeFromOcr(data,options={}){
 const lines=(data.blocks||[]).flatMap(b=>(b.paragraphs||[]).flatMap(p=>p.lines||[]));
 const safeText=lines.length?lines.map(line=>{
  const words=line.words||[],conf=words.length?Math.min(...words.map(w=>Number(w.confidence)||0)):Number(line.confidence)||0;
  return conf>=65?line.text.trim():'';
 }).join('\n'):Number(data.confidence)>=75?String(data.text||''):'';
 return {draft:parseIntake(safeText,options),text:String(data.text||''),uncertain:!lines.length||safeText.trim()!==String(data.text||'').trim()};
}
