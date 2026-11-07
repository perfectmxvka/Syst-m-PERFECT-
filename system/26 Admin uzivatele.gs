/** AUTOMYČKA PERFECT 2.0 — 26_ADMIN_UZIVATELE.gs
 * Samostatný modul, bez doGet, bez přepisování existujících účtů.
 * Vyžaduje stávající backend: perfectAuthRequireAdmin_, perfectRepairUsers_,
 * perfectRepairProps_, perfectRepairLock_, perfectAuthSetPasswordFields_, PERFECT_REPAIR.
 */
const PERFECT_ADMIN_USERS_AUDIT_KEY_ = 'PERFECT_ADMIN_USERS_AUDIT_V1';

function perfectAdminUsersPublic_(u) {
  return {id:String(u.id||''),username:String(u.username||''),firstName:String(u.firstName||''),
    surname:String(u.surname||''),role:['ADMINISTRATOR','SMENAR'].indexOf(u.role)>=0?u.role:'PRACOVNIK',
    active:u.active!==false,mustChangePassword:!!u.mustChangePassword,hasAvatar:!!u.avatarFileId};
}
function perfectAdminUsersValidateText_(value,max,label,required){
  var s=String(value==null?'':value).trim();
  if((required&&!s)||s.length>max||/[<>\r\n\x00-\x1f]/.test(s)) throw new Error('Neplatné pole: '+label+'.');
  return s;
}
function perfectAdminUsersAudit_(actor,action,target,details){
  var props=perfectRepairProps_(),arr=[];
  try{arr=JSON.parse(props.getProperty(PERFECT_ADMIN_USERS_AUDIT_KEY_)||'[]');if(!Array.isArray(arr))arr=[];}catch(e){arr=[];}
  arr.push({at:new Date().toISOString(),actorId:actor.id,actor:actor.username,
    action:action,targetId:target.id,target:target.username,details:details||''});
  props.setProperty(PERFECT_ADMIN_USERS_AUDIT_KEY_,JSON.stringify(arr.slice(-100)));
}
function perfect40Original_perfectAdminUsersList_(token){
  perfectAuthRequireAdmin_(token);
  return {users:perfectRepairUsers_().filter(function(u){return !u.deleted115;}).map(perfectAdminUsersPublic_)
    .sort(function(a,b){return (a.firstName+' '+a.surname).localeCompare(b.firstName+' '+b.surname,'cs');})};
}
function perfect40Original_perfectAdminUsersHistory_(token){
  perfectAuthRequireAdmin_(token);
  var items=[];
  try{items=JSON.parse(perfectRepairProps_().getProperty(PERFECT_ADMIN_USERS_AUDIT_KEY_)||'[]');}catch(e){}
  return {items:Array.isArray(items)?items.slice(-50).reverse():[]};
}
function perfect40Original_perfectAdminUsersSave_(token,input){
  var actor=perfectAuthRequireAdmin_(token);
  if(!input||typeof input!=='object'||Array.isArray(input))throw new Error('Chybí údaje účtu.');
  return perfectRepairLock_(function(){
    // Ověřit znovu uvnitř zámku kvůli souběžným změnám oprávnění.
    actor=perfectAuthRequireAdmin_(token);
    var props=perfectRepairProps_(),users=perfectRepairUsers_();
    var id=String(input.id||'').trim(),isNew=!id;
    var username=perfectAdminUsersValidateText_(input.username,40,'uživatelské jméno',true).toLowerCase();
    if(!/^[a-z0-9._-]{3,40}$/.test(username))throw new Error('Uživatelské jméno: 3–40 znaků, pouze a-z, 0-9, tečka, pomlčka a podtržítko.');
    var firstName=perfectAdminUsersValidateText_(input.firstName,70,'jméno',true);
    var surname=perfectAdminUsersValidateText_(input.surname,70,'příjmení',false);
    var role=String(input.role||'PRACOVNIK');
    if(['PRACOVNIK','SMENAR','ADMINISTRATOR'].indexOf(role)<0)throw new Error('Neplatná role.');
    var active=input.active!==false;
    var user=isNew?null:users.find(function(u){return u.id===id;});
    if(!isNew&&!user)throw new Error('Účet nebyl nalezen.');
    if(users.some(function(u){return u.username.toLowerCase()===username&&(!user||u.id!==user.id);}))throw new Error('Uživatelské jméno už existuje.');
    if(user&&user.id===actor.id&&(!active||role!=='ADMINISTRATOR'))throw new Error('Nemůžeš deaktivovat ani odebrat roli svému administrátorskému účtu.');
    var password=String(input.password||'');
    if(isNew&&!password)throw new Error('Nový účet musí mít dočasné heslo (alespoň 10 znaků).');
    if(password&&(password.length<10||password.length>128))throw new Error('Heslo musí mít 10–128 znaků.');
    if(!user){user={id:Utilities.getUuid(),username:username,active:true};users.push(user);}
    var previous={username:user.username,role:user.role,active:user.active!==false};
    user.username=username;user.firstName=firstName;user.surname=surname;user.role=role;user.active=active;
    if(password){perfectAuthSetPasswordFields_(user,password);user.mustChangePassword=true;}
    if(!users.some(function(u){return u.role==='ADMINISTRATOR'&&u.active!==false;}))throw new Error('Musí zůstat alespoň jeden aktivní administrátor.');
    // Uchovat ostatní vlastnosti uživatele (ID, avatarFileId, ...).
    props.setProperty(PERFECT_REPAIR.USERS,JSON.stringify(users));
    // Zneplatnit relace při resetu hesla, deaktivaci nebo změně role.
    if(!isNew&&(password||previous.role!==role||previous.active!==active)){
      var all=props.getProperties();Object.keys(all).filter(function(k){return k.indexOf('PERFECT_REPAIR_SESSION_')===0;}).forEach(function(k){
        try{var s=JSON.parse(all[k]);if(s.userId===user.id)props.deleteProperty(k);}catch(e){}
      });
    }
    try{perfectAdminUsersAudit_(actor,isNew?'CREATE':'UPDATE',user,
      (previous.username!==username?'uživatelské jméno; ':'')+
      (previous.role!==role?'role; ':'')+(previous.active!==active?'aktivace; ':'')+
      (password?'reset hesla; ':'')+'profil');}
    catch(err){console.error('Audit účtu se nepodařilo zapsat: '+err.message);}
    return {success:true,user:perfectAdminUsersPublic_(user),sessionRevoked:!isNew&&(!!password||previous.role!==role||previous.active!==active)};
  });
}
function perfect40Original_perfectAdminUsersGetAvatar_(token,id){
  perfectAuthRequireAdmin_(token);
  var u=perfectRepairUsers_().find(function(x){return x.id===String(id||'');});
  if(!u||!u.avatarFileId)return {data:''};
  try{
    var blob=DriveApp.getFileById(u.avatarFileId).getBlob(),mime=blob.getContentType();
    if(!/^image\/(jpeg|png|webp)$/.test(mime)||blob.getSize()>180000)return {data:''};
    return {data:'data:'+mime+';base64,'+Utilities.base64Encode(blob.getBytes())};
  }catch(e){return {data:''};}
}

/** Remove access and hide the account from management while preserving payroll history. */
function perfectAdminUsersDelete(token,input){
 return perfect40Enter_('perfectAdminUsersDelete',function(t,p){
  var actor=perfect43Require_(t,'users.manage');
  return perfectRepairLock_(function(){
   var users=perfectRepairUsers_(),target=users.find(function(u){return String(u.id)===String(p&&p.id);});
   if(!target||target.deleted115)throw Error('Účet není dostupný.');
   perfect40GuardUser_(actor,{id:target.id});
   if(String(actor.id)===String(target.id))throw Error('Vlastní účet nelze odstranit.');
   target.active=false;target.deleted115=true;
   var props=perfectRepairProps_();props.setProperty(PERFECT_REPAIR.USERS,JSON.stringify(users));
   var all=props.getProperties();Object.keys(all).filter(function(k){return k.indexOf('PERFECT_REPAIR_SESSION_')===0;}).forEach(function(k){try{if(String(JSON.parse(all[k]).userId)===String(target.id))props.deleteProperty(k);}catch(e){}});
   perfectAdminUsersAudit_(actor,'DELETE',target,'Odebrán přístup; historické směny zachovány.');
   return {success:true};
  });
 },arguments,'users.manage');
}
