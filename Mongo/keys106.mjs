import webpush from 'web-push';
import {randomBytes} from 'node:crypto';
console.log(JSON.stringify({bridgeSecret:randomBytes(32).toString('hex'),vapid:webpush.generateVAPIDKeys(),storageKey:randomBytes(32).toString('hex')},null,2));
