import {v2 as cloudinary} from 'cloudinary';
export function media(){
 const cloud=process.env.CLOUDINARY_CLOUD_NAME,key=process.env.CLOUDINARY_API_KEY,secret=process.env.CLOUDINARY_API_SECRET;
 cloudinary.config({cloud_name:cloud,api_key:key,api_secret:secret,secure:true});
 return {url:m=>m.cloud?cloudinary.url(m.cloud.public_id,{secure:true,sign_url:true,type:'authenticated',resource_type:m.cloud.resource_type||'image',version:m.cloud.version,format:m.cloud.format}):'',
 async upload(meta,bytes){if(!cloud||!key||!secret)throw Error('Doplň Cloudinary proměnné na serveru.');const resourceType=/^image\/(jpeg|png|webp|gif|avif|bmp|svg\+xml)$/.test(meta.mimeType)?'image':'raw';const r=await new Promise((resolve,reject)=>{const stream=cloudinary.uploader.upload_stream({public_id:'perfect103/'+meta.id,type:'authenticated',resource_type:resourceType,overwrite:false},(err,result)=>err?reject(err):resolve(result));stream.end(bytes);});meta.cloud={public_id:r.public_id,version:r.version,format:r.format,resource_type:r.resource_type};return meta;}};
}
