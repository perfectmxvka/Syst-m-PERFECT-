/** Personal dashboard preferences. Identity comes exclusively from the session. */
function perfect109Widgets(token,input){
  var user=perfectRepairRequireUser_(token);
  if(!user||!user.id)throw Error('Chybí přihlášený uživatel.');
  var props=PropertiesService.getScriptProperties(),key='PERFECT109_WIDGETS_'+user.id;
  var ids=['orders','visits','spending','calendar','navigation','checks','notes'];
  function defaults(){return {widgets:ids.map(function(id){return {id:id,visible:true,size:id==='visits'||id==='spending'?'half':'full'};}),notes:''};}
  function normalize(value,strict){
    if(!value||!Array.isArray(value.widgets)||value.widgets.length>ids.length){if(strict)throw Error('Neplatné widgety.');return defaults();}
    var seen={},widgets=[];
    value.widgets.forEach(function(w){
      if(!w||ids.indexOf(w.id)<0||seen[w.id]){if(strict)throw Error('Neplatný widget.');return;}
      seen[w.id]=true;widgets.push({id:w.id,visible:w.visible!==false,size:w.size==='half'?'half':'full'});
    });
    defaults().widgets.forEach(function(w){if(!seen[w.id])widgets.push(w);});
    return {widgets:widgets,notes:String(value.notes==null?'':value.notes).slice(0,4000)};
  }
  if(input!==undefined&&input!==null){
    var value=normalize(input,true),json=JSON.stringify(value);
    if(Utilities.newBlob(json).getBytes().length>8500)throw Error('Poznámka je příliš dlouhá. Zkrať ji prosím.');
    props.setProperty(key,json);return {success:true,settings:value};
  }
  var saved=props.getProperty(key),value=defaults();
  if(saved){try{value=normalize(JSON.parse(saved),false);}catch(e){value=defaults();}}
  return {success:true,settings:value};
}
