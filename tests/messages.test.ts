import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { createRequire } from 'node:module';
import { connectKeyCapture } from '../src/core/capture';
import { moveSelection, probeMessageKey } from '../src/core/messages';
import { OPTIONS } from '../src/core/probe';
const require = createRequire(import.meta.url);
const { loadPatchedSdk } = require('../scripts/sdk-security.cjs');

test('tecla capturada → SDK broadcast → envelope del host → selección y aceptación', async () => {
  const { MessagingNamespace } = loadPatchedSdk();
  const deliveries: Promise<void>[] = [];
  let selected = 0, inserted: string | undefined;
  const messaging = new MessagingNamespace(async (method: string, args: { message: unknown }) => {
    assert.equal(method, 'broadcast');
    // Same envelope consumed by the official tabs example: data.message.
    const key = probeMessageKey({ message: args.message }, 'popup-1');
    if (key === 'up' || key === 'down') selected = moveSelection(selected, key, OPTIONS.length);
    if (key === 'tab' || key === 'enter') inserted = OPTIONS[selected].text;
  });
  let receive!: (data: unknown) => void;
  const disconnect = connectKeyCapture({
    addListener: (_event, id, listener) => { assert.equal(id, 'popup-1'); receive = listener; },
    removeListener() {}, stealKeys: async () => undefined, releaseKeys: async () => undefined,
  }, 'keys', 'popup-1', key => {
    deliveries.push(messaging.broadcast({ type: 'probe-key', windowId: 'popup-1', key }));
  }, () => undefined);
  receive({ key: 'down' }); await Promise.all(deliveries);
  assert.equal(selected, 1);
  assert.equal(OPTIONS[selected].text, '¿Cuál es el objetivo de este tema?');
  receive({ key: 'tab' }); await Promise.all(deliveries);
  assert.equal(inserted, OPTIONS[1].text);
  receive({ key: 'up' }); await Promise.all(deliveries);
  assert.equal(selected, 0);
  disconnect();
});
test('ignora mensajes ajenos, ventanas cerradas y formatos sin envelope', () => {
  const message = { type: 'probe-key', windowId: 'popup-1', key: 'down' };
  assert.equal(probeMessageKey({ message }, 'popup-1'), 'down');
  assert.equal(probeMessageKey({ message }, 'popup-2'), undefined);
  assert.equal(probeMessageKey({ message }, undefined), undefined);
  assert.equal(probeMessageKey(message, 'popup-1'), undefined);
  assert.equal(probeMessageKey({ message: { ...message, type: 'other' } }, 'popup-1'), undefined);
});
