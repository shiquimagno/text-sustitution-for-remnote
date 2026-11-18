import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { probeKey } from '../src/core/keys';
test('interpreta teclas en string, objeto y evento anidado', () => {
  assert.equal(probeKey('ArrowDown'), 'down');
  assert.equal(probeKey({ key: 'ArrowUp' }), 'up');
  assert.equal(probeKey({ event: { key: 'Tab' } }), 'tab');
  assert.equal(probeKey('Enter'), 'enter');
  assert.equal(probeKey('Escape'), 'escape');
});
test('no acepta atajos modificados, repeticiones ni mensajes desconocidos', () => {
  assert.equal(probeKey({ key: 'Tab', shiftKey: true }), undefined);
  assert.equal(probeKey({ key: 'Enter', repeat: true }), undefined);
  assert.equal(probeKey({ key: 'Enter', metaKey: true }), undefined);
  for (const value of [null, {}, 'other', 1]) assert.equal(probeKey(value), undefined);
});
