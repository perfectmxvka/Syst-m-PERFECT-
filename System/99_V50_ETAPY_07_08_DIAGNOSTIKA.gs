/** V50 03+06 – diagnostika bez zápisu a bez spuštění Gmail importu. */
function perfectV50Kontrola0306_(){
 var expected=['perfectUsers50Get','perfectUsers50Save','perfectUsers50EffectiveCaps_','perfectBoxes50CloseDay','databaseBoxes50ReadClosures_','perfectBoxes49Overview_','perfectBoxes42Pay_'];
 var missing=expected.filter(function(k){return typeof this[k]!=='function';},this);
 var formula=[perfectBoxes42Pay_(0,0).total,perfectBoxes42Pay_(6000,0).total,perfectBoxes42Pay_(8600,0).total,perfectBoxes42Pay_(11000,0).total];
 var correct=JSON.stringify(formula)===JSON.stringify([1400,1400,2050,2650]);
 var split=perfectShared33Amounts_({box1:1100,box2:1900},3000);
 var splitOk=Math.round((split.box1+split.box2)*100)===300000;
 var roles=perfect40Policy_();
 var db=perfectDatabaseGetSpreadsheet_();
 var closures=databaseBoxes50ReadClosures_();
 var out={success:!missing.length&&correct&&splitOk,build:'V50-03-06',missing:missing,payFormula:formula,payMatches:correct,split:split,splitMatches:splitOk,roleNames:Object.keys(roles.roles),closureRecords:closures.length,databaseId:db.getId(),hint:'Porovnej databázové ID s TEST tabulkou.'};
 Logger.log(JSON.stringify(out,null,2));if(!out.success)throw Error('Kontrola etap 03/06 selhala – viz protokol.');return out;
}
