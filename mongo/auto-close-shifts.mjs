import {createRuntime} from './performance107.mjs';

const formatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Europe/Prague', year: 'numeric', month: '2-digit', day: '2-digit',
  hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
});
export function dueDate(now = new Date()) {
  const p = Object.fromEntries(formatter.formatToParts(now).map(p => [p.type, p.value]));
  return p.hour + ':' + p.minute >= '20:15' ? `${p.year}-${p.month}-${p.day}` : null;
}

// Run inside Store.run: shift, audit and completion marker commit atomically.
export function closeShifts(state, date) {
  const c = createRuntime(state).ctx;
  return c.perfect40Trusted_(() => {
    const rows = c.perfectBoxes29Rows_('shift', date, date);
    const closed = [];
    for (const station of ['BOX1', 'BOX2']) {
      const key = `${date}|${station}`, marker = `PERFECT_AUTO_CLOSE_${key}`;
      if (state.properties[marker]) continue;
      const matches = rows.filter(r => r.STATION === station && r.ACTIVE);
      if (matches.length > 1) throw Error(`Duplicate active shift: ${key}`);
      const row = matches[0];
      if (row && row.USER_ID && !row.WORKED) {
        if (row.KEY !== key) throw Error(`Invalid shift key: ${key}`);
        c.databaseBoxes25Commit_('shift', key, {...row, WORKED: true}, row.VERSION,
          {id: 'SYSTEM_AUTO_CLOSE_20_15'});
        closed.push(key);
      }
      // Preserve later manual corrections, including reopening an already closed shift.
      state.properties[marker] = 'done';
    }
    return closed;
  });
}

export function scheduleShiftClosing(store, serialized, {onError = console.error} = {}) {
  let busy = false, completedDate;
  async function tick() {
    const date = dueDate();
    if (!date || date === completedDate || busy) return;
    busy = true;
    try {
      await serialized(() => store.run(state => closeShifts(state, date)));
      completedDate = date;
    } catch (error) {
      onError('Automatic shift closing failed; retrying next minute:', error.name);
    } finally { busy = false; }
  }
  // Startup retry also covers a restart after 20:15 on the same day.
  void tick();
  const timer = setInterval(tick, 60_000);
  timer.unref();
  return () => clearInterval(timer);
}
