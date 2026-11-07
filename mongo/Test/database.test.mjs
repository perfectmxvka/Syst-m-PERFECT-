import {test} from 'node:test';
import assert from 'node:assert/strict';
import {inspect} from 'node:util';
import {openDatabase} from '../database.mjs';

test('invalid database URI does not expose the supplied credential in logs',async()=>{
 const credential='test-password-only';
 await assert.rejects(openDatabase({SUPABASE_DATABASE_URL:credential}),error=>{
  assert.match(error.message,/celou PostgreSQL URI/);
  assert.equal(inspect(error).includes(credential),false);
  assert.equal(Object.hasOwn(error,'input'),false);
  return true;
 });
});
