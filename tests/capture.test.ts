import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { connectKeyCapture } from '../src/core/capture';
test('keyed host routes arrows and acceptance to the matching window only', async () => {
  const subscriptions = new Map<string, (data: unknown) => void>();
  const received: string[] = [], released: string[] = [];
  const disconnect = connectKeyCapture({
    addListener: (event, id, listener) => subscriptions.set(`${event}:${id}`, listener),
    removeListener: (event, id) => { subscriptions.delete(`${event}:${id}`); },
    stealKeys: async id => {
      assert.ok(subscriptions.has(`keys:${id}`), 'listener must exist before capture');
      subscriptions.get(`keys:${id}`)?.({ key: 'ArrowDown' });
      subscriptions.get(`keys:other-window`)?.({ key: 'Enter' });
      subscriptions.get(`keys:${id}`)?.({ key: 'Tab' });
    },
    releaseKeys: async id => { released.push(id); },
  }, 'keys', 'popup-1', key => received.push(key), () => undefined);
  await Promise.resolve();
  assert.deepEqual(received, ['down', 'tab']);
  disconnect();
  assert.equal(subscriptions.size, 0);
  assert.deepEqual(released, ['popup-1']);
});
test('closing before async capture completes releases late capture as well', async () => {
  let finish!: () => void;
  const gate = new Promise<void>(resolve => { finish = resolve; });
  let releases = 0;
  const disconnect = connectKeyCapture({ addListener() {}, removeListener() {},
    stealKeys: () => gate, releaseKeys: async () => { releases++; },
  }, 'keys', 'popup-1', () => assert.fail('closed window received a key'), () => undefined);
  disconnect(); finish();
  await gate; await Promise.resolve();
  assert.equal(releases, 2);
});
