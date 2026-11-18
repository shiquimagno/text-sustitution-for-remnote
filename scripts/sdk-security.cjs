const { createHash } = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');

// Backport the array/set early-size rejection from official Zod v3 commit:
// https://github.com/colinhacks/zod/commit/c987c29
// SDK 0.0.46 embeds Zod; updating a separate installed zod cannot patch it.
const variants = {
  'index.js': { hash: '50553350d166343e7e342482990c33c7812c144c837e6acac1bb6f92a082a6b6',
    ctx: 'r', def: 'i', invalid: 'A',
    array: 'n.dirty()),r.common.async)',
    set: 'r.dirty());const s=this._def.valueType;function o(u)',
    setCtx: 'n', setDef: 'i', setTail: 'const s=this._def.valueType;function o(u)' },
  'lib.js': { hash: '119d0a67842fdf868b55a07230a58dbe06e31bf9f297140b2355a52e29340d70',
    ctx: 'i', def: 'u', invalid: 'E',
    array: 'l.dirty()),i.common.async)',
    set: 'i.dirty());const c=this._def.valueType;function h(g)',
    setCtx: 'l', setDef: 'u', setTail: 'const c=this._def.valueType;function h(g)' },
};
function replaceOnce(source, from, to) {
  if (source.split(from).length !== 2) throw new Error('SDK patch anchor mismatch; refusing to compile an unverified SDK.');
  return source.replace(from, to);
}
function patchSdk(source, filename) {
  const v = variants[path.basename(filename)];
  if (!v || createHash('sha256').update(source).digest('hex') !== v.hash) {
    throw new Error('SDK integrity changed. Review the security backport before upgrading.');
  }
  const { ctx: c, def: d, invalid } = v;
  const bounds = `(${d}.exactLength!==null&&${c}.data.length>${d}.exactLength.value)||(${d}.maxLength!==null&&${c}.data.length>${d}.maxLength.value)`;
  // Preserve existing size issues and abort before the element walk/refinements.
  source = replaceOnce(source, v.array, v.array.replace(`${c}.common.async)`, `(${bounds}))return ${invalid};if(${c}.common.async)`));
  const setBounds = `${v.setDef}.maxSize!==null&&${v.setCtx}.data.size>${v.setDef}.maxSize.value`;
  source = replaceOnce(source, v.set, v.set.replace(v.setTail, `if(${setBounds})return ${invalid};${v.setTail}`));
  return source;
}
function loadPatchedSdk(filename = require.resolve('@remnote/plugin-sdk/dist/lib')) {
  const mod = new Module(filename, module);
  mod.filename = filename;
  mod.paths = Module._nodeModulePaths(path.dirname(filename));
  mod._compile(patchSdk(fs.readFileSync(filename, 'utf8'), filename), filename);
  return mod.exports;
}
module.exports = { patchSdk, loadPatchedSdk };
