import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
const require = createRequire(import.meta.url);
const { patchSdk, loadPatchedSdk } = require('../scripts/sdk-security.cjs');
const libPath = require.resolve('@remnote/plugin-sdk/dist/lib');
const indexPath = require.resolve('@remnote/plugin-sdk');

test('backport verifies both official embedded bundles and refuses unknown input', () => {
  for (const file of [libPath, indexPath]) {
    const source = readFileSync(file, 'utf8');
    assert.notEqual(patchSdk(source, file), source);
    assert.throws(() => patchSdk(source + ' ', file), /integrity/);
  }
});
test('negative control reproduces the element walk in the unpatched SDK', () => {
  const sdk = require('@remnote/plugin-sdk/dist/lib');
  const result = sdk.stringValidatorSig.array().max(2).safeParse(new Array(100).fill(0));
  assert.equal(result.success, false);
  assert.ok(result.error.issues.length > 100);
});
test('embedded Zod rejects oversized arrays before parsing elements, sync and async', async () => {
  const originalSelf = (globalThis as any).self;
  (globalThis as any).self = globalThis;
  try { for (const sdk of [loadPatchedSdk(), loadPatchedSdk(indexPath)]) {
    let parsed = 0, refined = 0;
    const item = sdk.stringValidatorSig.transform((x: unknown) => { parsed++; return x; });
    const schema = item.array().max(2).refine(() => { refined++; return true; });
    const tooMany = new Array(10000).fill(0);
    for (const result of [schema.safeParse(tooMany), await schema.safeParseAsync(tooMany)]) {
      assert.equal(result.success, false);
      assert.equal(result.error.issues.length, 1);
      assert.equal(result.error.issues[0].code, 'too_big');
    }
    assert.equal(parsed, 0); assert.equal(refined, 0);
    assert.equal(item.array().length(2).safeParse(tooMany).error.issues.length, 1);
    assert.equal(schema.safeParse([{ type: 'email' }]).success, true);
    assert.equal(parsed, 1); assert.equal(refined, 1);
    assert.equal(schema.safeParse([0]).error.issues[0].code, 'invalid_union');
  } } finally {
    if (originalSelf === undefined) delete (globalThis as any).self;
    else (globalThis as any).self = originalSelf;
  }
});
test('actual embedded set parser stops before accessing the element parser', () => {
  for (const file of [libPath, indexPath]) {
    const source = patchSdk(readFileSync(file, 'utf8'), file);
    // Locate the SDK ZodSet method by its unique maxSize validation, not a copy.
    const marker = source.indexOf('maxSize!==null');
    const start = source.lastIndexOf('_parse(', marker);
    const methodEnd = source.indexOf('get minSize', marker);
    // Find the next class method using the known SDK .min() declaration.
    const chunk = source.slice(start, methodEnd > 0 ? methodEnd : marker + 1600);
    const closing = chunk.indexOf('}min(');
    assert.ok(closing > 0);
    const method = chunk.slice('_parse'.length, closing + 1);
    const issues: any[] = [];
    const status = { dirty() {} };
    const context = { parsedType: 'set', data: new Set([1, 2]), common: { async: false } };
    const invalid = { status: 'aborted' };
    const scope = { y: { set: 'set' }, F: { set: 'set' }, m: { too_big: 'too_big' }, M: { too_big: 'too_big' },
      _: (_ctx: unknown, issue: unknown) => issues.push(issue), j: (_ctx: unknown, issue: unknown) => issues.push(issue),
      A: invalid, E: invalid };
    const parser = runInNewContext('(function' + method + ')', scope);
    const def = { minSize: null, maxSize: { value: 1 }, get valueType() { throw new Error('element parser reached'); } };
    const result = parser.call({ _def: def, _processInputParams: () => ({ ctx: context, status }) }, {});
    assert.equal(result, invalid); assert.equal(issues.length, 1);
  }
});
