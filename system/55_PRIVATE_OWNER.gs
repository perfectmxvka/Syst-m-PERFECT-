/** Owner identity is bound to its existing immutable ID, never a username. */
function perfectPrivate115Check_(actor,args){
 var owners=perfectRepairUsers_().filter(function(u){return perfect40Super_(u)&&String(u.id)!==String(actor.id);});
 var blocked=[];owners.forEach(function(u){blocked.push(String(u.id));if(u.avatarFileId)blocked.push(String(u.avatarFileId));});
 function contains(v){if(typeof v==='string')return blocked.indexOf(v)>=0;if(!v||typeof v!=='object')return false;return Object.keys(v).some(function(k){return contains(v[k]);});}
 if(Array.prototype.slice.call(args||[],1).some(contains))throw Error('Záznam není dostupný.');
}
