import {MongoStore} from './mongo-store.mjs';
import {CloudinaryStore} from './cloudinary-store.mjs';
export function createStore(env=process.env){
 const options={uri:env.MONGODB_URI,dbName:env.MONGODB_DATABASE||'perfect',project:env.PERFECT_PROJECT_ID||'perfect'};
 const backend=env.MEDIA_STORAGE||'cloudinary';
 if(backend==='gridfs')return new MongoStore(options);
 if(backend!=='cloudinary')throw Error('Neplatná hodnota MEDIA_STORAGE.');
 return new CloudinaryStore({...options,cloudinary:{cloud_name:env.CLOUDINARY_CLOUD_NAME,api_key:env.CLOUDINARY_API_KEY,api_secret:env.CLOUDINARY_API_SECRET}});
}
