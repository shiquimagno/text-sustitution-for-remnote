import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { coalesceAsync } from '../src/core/coalesce';
test('cien eventos concurrentes conservan un trabajo activo y uno pendiente', async () => {
  let release!: () => void;
  const gate = new Promise<void>(resolve => { release = resolve; });
  let calls = 0, active = 0, max = 0;
  const queue = coalesceAsync(async () => {
    calls++; active++; max = Math.max(max, active);
    if (calls === 1) await gate;
    active--;
  }, async error => { throw error; });
  const first = queue.request();
  for (let i = 0; i < 100; i++) void queue.request();
  release(); await first;
  assert.equal(calls, 2); assert.equal(max, 1);
  queue.cancel(); await queue.request(); assert.equal(calls, 2);
});
