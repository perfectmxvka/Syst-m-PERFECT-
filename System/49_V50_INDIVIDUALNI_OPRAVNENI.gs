/** PERFECT V50 E03 – individ. oprávnění uživatelů. BEZ doGet a bez změny přihlášení. */
const PERFECT_USERS50_PROPERTY_='PERFECT50_USER_CAPABILITIES';
function perfectUsers50Store_(){
 var raw=perfectRepairProps_().getProperty(PERFECT_USERS50_PROPERTY_);
 if(!raw)return {};
 var parsed=JSON.parse(raw);
 if(!parsed||typeof parsed!=='object'||Array.isArray(parsed))throw Error('Neplatná uložená oprávnění účtů.');
 return parsed;
}
function perfectUsers50EffectiveCaps_(user){
 var catalog=perfect40Catalog_().map(function(c){return c.key;});
 var policy=perfect40Policy_(),role=user.role==='SMENAR'?'SMENAR':user.role==='ADMINISTRATOR'?'ADMINISTRATOR':'PRACOVNIK';
 var fromRole=(policy.roles[role]||[]).filter(function(k){return catalog.indexOf(k)>=0;});
 var own=perfectUsers50Store_()[String(user.id)];
 if(!own||!Array.isArray(own.capabilities))return fromRole;
 // Fail closed: no admin-only permissions to non-admin roles, no unknown keys.
 return Array.from(new Set(own.capabilities.filter(function(k){return catalog.indexOf(k)>=0&&(role==='ADMINISTRATOR'||k!=='roles.manage');})));
}
function perfectUsers50Admin_(token,targetId){
 var actor=perfect40Require_(token,['users.manage','roles.manage']);
 if(actor.role!=='ADMINISTRATOR'&&!perfect40Super_(actor))throw Error('Oprávnění uživatelů spravuje pouze vedení.');
 if(!perfect40Can_(actor,'roles.manage')||!perfect40Can_(actor,'users.manage'))throw Error('Chybí oprávnění ke správě uživatelů a rolí.');
 var target=perfectRepairUsers_().find(function(u){return String(u.id)===String(targetId);});
 if(!target||perfect40Super_(target))throw Error('Tento účet není dostupný.');
 if(!perfect40Super_(actor)&&target.role==='ADMINISTRATOR')throw Error('Správu práv administrátora má pouze superadmin.');
 return {actor:actor,target:target};
}
function perfectUsers50Validate_(keys,role,actor){
 var catalog=perfect40Catalog_().map(function(c){return c.key;});
 if(!Array.isArray(keys)||keys.length>catalog.length||keys.some(function(k){return typeof k!=='string'||catalog.indexOf(k)<0}))throw Error('Neplatný seznam oprávnění.');
 var values=Array.from(new Set(keys));
 if(role!=='ADMINISTRATOR'&&values.indexOf('roles.manage')>=0)throw Error('Správu rolí lze dát pouze administrátorovi.');
 if(!perfect40Super_(actor)&&values.some(function(k){return !perfect40Can_(actor,k);}))throw Error('Nemůžeš přidělit právo, které sám nemáš.');
 [['orders.create','orders.read'],['orders.edit','orders.read'],['customers.edit','customers.read'],['vehicles.edit','vehicles.read'],['vouchers.issue','vouchers.read'],['vouchers.redeem','vouchers.read'],['media.write','media.read'],['prices.edit','orders.edit'],['services.edit','services.read'],['duplicates.manage','orders.read']].forEach(function(pair){if(values.indexOf(pair[0])>=0&&values.indexOf(pair[1])<0)throw Error('Oprávnění '+pair[0]+' vyžaduje také '+pair[1]+'.');});
 return values;
}
function perfectUsers50Get(token,input){
 return perfect40Enter_('perfectUsers50Get',function(t,p){
  var x=perfectUsers50Admin_(t,p&&p.userId),own=perfectUsers50Store_()[String(x.target.id)];
  return {success:true,userId:String(x.target.id),username:String(x.target.username),role:x.target.role,version:String(own&&own.version||'0'),individual:!!(own&&Array.isArray(own.capabilities)),capabilities:perfectUsers50EffectiveCaps_(x.target),roleCapabilities:(perfect40Policy_().roles[x.target.role]||[]).slice(),catalog:perfect40Catalog_()};
 },arguments,'roles.manage');
}
function perfectUsers50Save(token,input){
 return perfect40Enter_('perfectUsers50Save',function(t,p){
  var x=perfectUsers50Admin_(t,p&&p.userId);
  if(String(x.actor.id)===String(x.target.id))throw Error('Svůj účet nelze měnit touto funkcí.');
  var response=perfectRepairLock_(function(){
   x=perfectUsers50Admin_(t,p.userId);
   var props=perfectRepairProps_(),store=perfectUsers50Store_(),old=store[String(x.target.id)];
   if(String(p.version||'0')!==String(old&&old.version||'0'))throw Error('Oprávnění se změnila. Načti uživatele znovu.');
   var inherit=p.inherit===true,capabilities=inherit?null:perfectUsers50Validate_(p.capabilities,x.target.role,x.actor);
   if(inherit)delete store[String(x.target.id)];
   else store[String(x.target.id)]={version:Utilities.getUuid(),capabilities:capabilities};
   props.setProperty(PERFECT_USERS50_PROPERTY_,JSON.stringify(store));
   var all=props.getProperties();Object.keys(all).filter(function(k){return k.indexOf('PERFECT_REPAIR_SESSION_')===0;}).forEach(function(k){try{var s=JSON.parse(all[k]);if(String(s.userId)===String(x.target.id))props.deleteProperty(k);}catch(e){}});
   // Audit proběhne mimo zámek: databaseSecurity40Audit_ si bere vlastní script lock.
   return {success:true,version:String(store[String(x.target.id)]&&store[String(x.target.id)].version||'0'),individual:!inherit,capabilities:perfectUsers50EffectiveCaps_(x.target),sessionRevoked:true};
  });
  try{databaseSecurity40Audit_(x.actor,'perfectUsers50Save',String(x.target.id),{status:'UPDATED'},{inherit:p.inherit===true},'OK','');}catch(e){console.error('Audit individuálních práv: '+e.message);}
  return response;
 },arguments,'roles.manage');
}
