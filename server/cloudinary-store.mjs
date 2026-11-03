import crypto from 'node:crypto';
import {v2 as cloudinary} from 'cloudinary';
import {MongoStore} from './mongo-store.mjs';
const MAX_FILE=10*1024*1024,MEDIA_BUDGET=10*1024*1024*1024;
const sha=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
// Original bytes are kept as authenticated raw assets. No public CDN URLs or transformations.
export class CloudinaryStore extends MongoStore{
 constructor(options={}){
  super(options);const c=options.cloudinary||{};
  if(!/^[a-zA-Z0-9_-]+$/.test(c.cloud_name||'')||!c.api_key||!c.api_secret)throw Error('Nastav CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY a CLOUDINARY_API_SECRET pouze na serveru.');
  this.cloud={cloud_name:c.cloud_name,api_key:c.api_key,api_secret:c.api_secret,secure:true,signature_algorithm:'sha256',timeout:60000};
  this.sdk=options.cloudinarySdk||cloudinary;this.fetch=options.fetch||fetch;this.media=this.db.collection('perfect_cloudinary_media');this.mediaBackend='cloudinary';this.quota=null;this.pendingBytes=0;
 }
 async mediaUsage(){
  const rows=await this.media.aggregate([{$match:{project:this.project}},{$group:{_id:null,bytes:{$sum:'size'}}}]).toArray();return Number(rows[0]?.bytes||0);
 }
 async mediaCapacity(extra=0){
  if(await this.mediaUsage()+extra>MEDIA_BUDGET)throw Error('Fotografie překračují místní limit 10 GiB. Import byl zastaven bez změny tarifu.');
  if(!this.quota||Date.now()-this.quota.at>60000){
   let u;try{u=await this.sdk.api.usage({...this.cloud});}catch(_){throw Error('Nelze ověřit bezplatné kredity Cloudinary. Nahrávání bylo zastaveno.');}
   const used=u?.credits?.usage,limit=u?.credits?.limit;
   if(typeof used!=='number'||typeof limit!=='number'||limit<=0)throw Error('Cloudinary nevrátilo ověřitelný kreditní limit. Zkontroluj účet Free.');
   this.quota={at:Date.now(),used,limit};this.pendingBytes=0;
  }
  // Reserve at least 2 of the Free plan's 25 shared credits; usage API is eventually updated.
  if(this.quota.used+(this.pendingBytes+extra)/1e9>Math.min(23,this.quota.limit-2))throw Error('Cloudinary se blíží kreditnímu limitu. Nahrávání bylo zastaveno; placený tarif se nezapíná.');
 }
 async putFile(id,bytes,mime='application/octet-stream'){
  const key=this.id(id);if(bytes.length>MAX_FILE)throw Error('Fotografie překračuje bezpečný limit 10 MiB pro Cloudinary Free. Zdroj se nezměnil.');
  const hash=sha(bytes),existing=await this.media.findOne({_id:key});
  if(existing){if(existing.sha256===hash&&existing.cloudName===this.cloud.cloud_name)return;throw Error('Kolize fotografie nebo jiné Cloudinary úložiště; původní soubor zůstává.');}
  await this.capacity(2048);await this.mediaCapacity(bytes.length);
  const publicId='perfect/'+this.project+'/'+sha(key).slice(0,32)+'-'+hash+'.bin';
  let uploaded;
  try{uploaded=await new Promise((resolve,reject)=>{
   const stream=this.sdk.uploader.upload_stream({...this.cloud,resource_type:'raw',type:'authenticated',public_id:publicId,overwrite:false,unique_filename:false,use_filename:false,backup:false},(err,result)=>err?reject(err):resolve(result));stream.on('error',reject);stream.end(Buffer.from(bytes));
  });}catch(_){throw Error('Cloudinary fotografii nepotvrdilo. Původní záznam zůstává; import lze zopakovat.');}
  if(uploaded?.public_id!==publicId||uploaded?.resource_type!=='raw'||uploaded?.type!=='authenticated'||uploaded?.bytes!==bytes.length)throw Error('Cloudinary nepotvrdilo správnou velikost nebo soukromé uložení fotografie.');
  const record={_id:key,project:this.project,legacyId:id,publicId,cloudName:this.cloud.cloud_name,sha256:hash,size:bytes.length,mimeType:mime,createdAt:new Date()};
  try{await this.media.insertOne(record);}catch(e){if(e.code!==11000)throw e;const actual=await this.media.findOne({_id:key});if(actual?.sha256!==hash||actual?.cloudName!==this.cloud.cloud_name)throw Error('Souběžná kolize fotografie. Nic nebylo přepsáno.');}
  this.pendingBytes+=bytes.length;
 }
 async getFile(id){
  const record=await this.media.findOne({_id:this.id(id)});
  // Allows reading an already imported GridFS project while copying its media to Cloudinary.
  if(!record)return super.getFile(id);
  if(record.cloudName!==this.cloud.cloud_name)throw Error('Fotografie patří do jiného Cloudinary úložiště.');
  const url=this.sdk.utils.private_download_url(record.publicId,undefined,{...this.cloud,resource_type:'raw',type:'authenticated',attachment:false,expires_at:Math.floor(Date.now()/1000)+60});
  let response;try{response=await this.fetch(url,{signal:AbortSignal.timeout(60000),redirect:'error'});}catch(_){throw Error('Soukromou fotografii nelze načíst z Cloudinary.');}
  if(!response.ok)throw Error('Cloudinary odmítlo načtení soukromé fotografie.');
  const parts=[];let count=0;for await(const part of response.body){count+=part.length;if(count>MAX_FILE)throw Error('Fotografie je příliš velká.');parts.push(Buffer.from(part));}
  const bytes=Buffer.concat(parts);if(sha(bytes)!==record.sha256)throw Error('Kontrolní součet fotografie nesouhlasí.');return new Uint8Array(bytes);
 }
 async removeNewFiles(_ids){
  // Do not remove a remotely uploaded immutable object during a retry: another request may share it.
  // Orphans remain private and count towards usage; clean only after an audited backup/reference check.
 }
}
