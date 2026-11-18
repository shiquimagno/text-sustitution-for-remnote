import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { invocationBeforeCaret, matches, plainTextOnly } from '../src/core/probe';
test('detecta invocación contigua en cualquier posición', () => {
  assert.deepEqual(invocationBeforeCaret('Antes ;obj'), { query: 'obj', literal: ';obj' });
  assert.deepEqual(invocationBeforeCaret(';'), { query: '', literal: ';' });
  assert.deepEqual(invocationBeforeCaret('Antes; ;;obj'), { query: 'obj', literal: ';;obj' });
  assert.deepEqual(invocationBeforeCaret('Antes ::::obj', '::'), { query: 'obj', literal: '::::obj' });
  assert.equal(invocationBeforeCaret('Antes ;obj después'), undefined);
  assert.equal(invocationBeforeCaret('Sin invocación'), undefined);
});
test('coincide con mayúsculas y tildes', () => {
  assert.equal(matches('ÓBJ'), true); assert.equal(matches(''), true); assert.equal(matches('otra'), false);
});
test('referencias, fórmulas y código no son abreviaturas', () => {
  assert.equal(plainTextOnly([';', { i: 'm', text: 'obj', b: true }]), ';obj');
  for (const element of [{ i: 'q', _id: 'ref' }, { i: 'x', text: ';obj' }, { i: 'm', text: ';obj', code: true }, { i: 'm', text: ';obj', q: true }]) assert.equal(plainTextOnly([element]), undefined);
});
