import test from 'node:test';
import assert from 'node:assert/strict';
import {fixture, token} from './fixture110.mjs';
import {createRuntime} from '../runtime.mjs';
import {closeShifts, dueDate} from '../auto-close-shifts.mjs';

test('20:15 Prague respects winter and summer time', () => {
  assert.equal(dueDate(new Date('2026-11-05T19:14:59Z')), null);
  assert.equal(dueDate(new Date('2026-11-05T19:15:00Z')), '2026-11-05');
  assert.equal(dueDate(new Date('2026-07-05T18:14:59Z')), null);
  assert.equal(dueDate(new Date('2026-07-05T18:15:00Z')), '2026-07-05');
  assert.equal(dueDate(new Date('2026-11-05T23:00:00Z')), null);
});
test('closes both assigned boxes once, preserving workers, pay and audit', () => {
  const state = fixture(), c = createRuntime(state).ctx, date = '2026-10-27';
  for (const [station,userId] of [['BOX1','admin'],['BOX2','other']])
    c.perfectBoxesSaveShiftV25(token,{date,station,userId,worked:false});
  assert.equal(closeShifts(state,date).length,2);
  const after = JSON.stringify(state);
  assert.deepEqual(closeShifts(state,date),[]);
  assert.equal(JSON.stringify(state),after);
  const reader = createRuntime(state).ctx;
  const view = reader.perfect40Trusted_(() => reader.perfectBoxes49Overview_({from:date,to:date}));
  assert.deepEqual(Array.from(view.daily,d=>[d.station,d.userId,d.worked,d.reward]), [['BOX1','admin',true,1900],['BOX2','other',true,1400]]);
});
test('empty boxes do not create shifts', () => {
  const state=fixture();
  assert.deepEqual(closeShifts(state,'2026-10-27'),[]);
  assert.equal(createRuntime(state).ctx.databaseBoxes25Read_('shift').length,0);
});

test('already confirmed shifts and later manual corrections are preserved', () => {
  const state=fixture(), c=createRuntime(state).ctx, date='2026-10-27';
  c.perfectBoxesSaveShiftV25(token,{date,station:'BOX1',userId:'admin',worked:true});
  const original=c.databaseBoxes25Read_('shift')[0];
  assert.deepEqual(closeShifts(state,date),[]);
  assert.equal(createRuntime(state).ctx.databaseBoxes25Read_('shift')[0].VERSION,original.VERSION);
  const editor=createRuntime(state).ctx;
  editor.perfectBoxesSaveShiftV25(token,{date,station:'BOX1',userId:'admin',worked:false,version:original.VERSION});
  assert.deepEqual(closeShifts(state,date),[]);
  assert.equal(createRuntime(state).ctx.databaseBoxes25Read_('shift')[0].WORKED,false);
});
