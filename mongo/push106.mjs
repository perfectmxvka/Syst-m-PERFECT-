import crypto from 'node:crypto';
export function validSub(s){const u=new URL(s?.endpoint);if(u.protocol!=='https:'||u.port||u.username||u.password||!['fcm.googleapis.com','updates.push.services.mozilla.com','web.push.apple.com'].includes(u.hostname)||!/^[-\w]{80,150}$/.test(s?.keys?.p256dh||'')||!/^[-\w]{16,50}$/.test(s?.keys?.auth||''))throw Error('Neplatný odběr');return s;}
export const defaults={enabled:true,assigned:true,shared:true,changed:true,revenue:true,earnings:true,details:true};
export function cleanPreferences(value){if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).some(k=>!Object.hasOwn(defaults,k)||typeof value[k]!=='boolean'))throw Error('Neplatné nastavení oznámení');return value;}
export function payload(event,prefs){return {title:prefs.details?String(event.title||'PERFECT').slice(0,100):'PERFECT',body:prefs.details?String(event.body||'V aplikaci máš nové oznámení.').slice(0,1000):'V aplikaci máš nové oznámení. Pro podrobnosti se přihlas.',tag:event.tag||crypto.createHash('sha256').update(JSON.stringify(event)).digest('hex'),url:typeof event.url==='string'&&/^\/#perfect-(?:order|day|month)=/.test(event.url)?event.url:'/'};}
export async function pushService(db,{env=process.env,transport}={}){
 if(env.PUSH_ENABLED==='false')return {enabled:false,reason:'Server má PUSH_ENABLED=false. Nastav na Renderu PUSH_ENABLED=true a restartuj službu.'};
 const webpush=transport||(await import('web-push')).default;let publicKey=env.VAPID_PUBLIC_KEY,privateKey=env.VAPID_PRIVATE_KEY;
 if(Boolean(publicKey)!==Boolean(privateKey))throw Error('Nastav oba VAPID klíče, nebo oba odstraň pro automatické vytvoření.');
 if(!publicKey){const config=db.collection('perfect108_push_config');let keys=await config.findOne({_id:'vapid'});if(!keys){await config.updateOne({_id:'vapid'},{$setOnInsert:webpush.generateVAPIDKeys()},{upsert:true});keys=await config.findOne({_id:'vapid'});}publicKey=keys.publicKey;privateKey=keys.privateKey;}
 const subject=env.VAPID_SUBJECT||env.PUBLIC_ORIGIN||env.RENDER_EXTERNAL_URL;if(!/^https:\/\//.test(subject||'')&&!/^mailto:/.test(subject||''))throw Error('Pro push nastav PUBLIC_ORIGIN na HTTPS adresu aplikace nebo VAPID_SUBJECT.');webpush.setVapidDetails(subject,publicKey,privateKey);

 const subs=db.collection('perfect106_push'),prefs=db.collection('perfect106_push_preferences');await subs.createIndex({expiresAt:1},{expireAfterSeconds:0});
 async function preferences(user,value){const id=String(user.id);if(value!==undefined){cleanPreferences(value);await prefs.updateOne({_id:id},{$set:value},{upsert:true});}const saved=await prefs.findOne({_id:id});return Object.fromEntries(Object.entries(defaults).map(([k,v])=>[k,typeof saved?.[k]==='boolean'?saved[k]:v]));}
 return {enabled:true,publicKey,preferences,
 async status(user){const preferencesValue=await preferences(user);const subscriptions=await subs.find({user:String(user.id),expiresAt:{$gt:new Date()}}).toArray();return {enabled:preferencesValue.enabled,subscriptions:subscriptions.length};},
 async subscribe(user,s){validSub(s);const id=crypto.createHash('sha256').update(s.endpoint).digest('hex');await subs.replaceOne({_id:id},{_id:id,user:String(user.id),s,expiresAt:new Date(Date.now()+180*86400000)},{upsert:true});},
 async unsubscribe(user,endpoint){await subs.deleteOne({user:String(user.id),'s.endpoint':endpoint});},
 async notify(user,event={}){const p=await preferences(user);if(!p.enabled||(event.type&&p[event.type]===false))return {sent:0,disabled:true};let failed=false,sent=0;for(const sub of await subs.find({user:String(user.id),expiresAt:{$gt:new Date()}}).limit(20).toArray()){try{await webpush.sendNotification(sub.s,JSON.stringify(payload(event,p)),{TTL:3600,timeout:10000});sent++;}catch(e){if([404,410].includes(e.statusCode))await subs.deleteOne({_id:sub._id});else failed=true;}}if(failed)throw Error('Push dočasně nedostupný');return {sent};}
 };
}
