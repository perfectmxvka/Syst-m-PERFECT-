/** 1.08: one authenticated read for the access-management screen. No stored credential or session is returned. */
function perfect108AccessBootstrap(token){
 return perfect101Context_(token,['users.manage','roles.manage'],function(actor){
  return {success:true,users:perfect40Can_(actor,'users.manage')?perfectAdminUsersList(token).users:[],policy:perfect40Can_(actor,'roles.manage')?perfectSecurity40Get(token):null};
 });
}
