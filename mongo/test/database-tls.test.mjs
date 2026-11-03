import {test} from 'node:test';
import assert from 'node:assert/strict';
import {X509Certificate} from 'node:crypto';
import {createSecureContext,rootCertificates} from 'node:tls';
import {databaseTls} from '../database-tls.mjs';

test('Supabase uses the verified bundled CA despite a stale Render secret-file path',async()=>{
 const ssl=await databaseTls('aws-1-eu-central-1.pooler.supabase.com',{SUPABASE_CA_CERT_PATH:'/missing/render/secret.crt'});
 assert.equal(ssl.rejectUnauthorized,true);
 assert.equal(ssl.ca.length,rootCertificates.length+1);
 const cert=new X509Certificate(ssl.ca.at(-1));
 assert.equal(cert.fingerprint256,'80:70:25:AD:50:D4:ED:21:9D:2C:9C:7D:29:9C:00:4F:82:4E:B0:0C:F7:F6:5A:FE:F6:07:D0:7B:72:E6:CA:FA');
 assert.equal(cert.ca,true);
 assert.equal(cert.verify(cert.publicKey),true);
 assert.ok(Date.parse(cert.validTo)>Date.now());
 assert.doesNotThrow(()=>createSecureContext(ssl));
 assert.equal((await databaseTls('project.supabase.co')).ca.at(-1),ssl.ca.at(-1));
});

test('TLS stays enforced and the bundled root is scoped to Supabase hosts',async()=>{
 assert.deepEqual(await databaseTls('supabase.com.example.org'),{rejectUnauthorized:true});
 assert.deepEqual(await databaseTls('other.example.org'),{rejectUnauthorized:true});
 await assert.rejects(databaseTls('aws-1-eu-central-1.pooler.supabase.com',{PG_LOCAL_TEST:'true'}),/pouze pro lokální/);
 assert.equal(await databaseTls('localhost',{PG_LOCAL_TEST:'true'}),false);
});
