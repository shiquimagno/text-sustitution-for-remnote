import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { setImmediate } from 'node:timers/promises';
import { Catalog, CatalogRepository, filterEntries, readCatalog, validateEntry, validPrefix, withoutPrefix } from '../src/core/catalog';
const entry = (id = '1') => ({ id, name: 'Objetivo', text: '¿Cuál es su objetivo?', abbreviations: ['obj', 'objetivo', 'ÓBJ'], enabled: true });
test('valida campos, deduplica abreviaturas sin alterar el texto y admite variantes', () => {
  assert.deepEqual(validateEntry(entry()).abbreviations, ['obj', 'objetivo']);
  assert.equal(validateEntry({ ...entry(), text: ' texto literal ' }).text, ' texto literal ');
  for (const patch of [{ name: '' }, { text: '' }, { text: 'a\nb' }, { abbreviations: [] }, { abbreviations: ['con espacio'] }]) assert.throws(() => validateEntry({ ...entry(), ...patch }));
  assert.equal(readCatalog({ version: 1, entries: [entry('1'), entry('2')] }).entries.length, 2);
  assert.ok(validPrefix(';;')); assert.ok(!validPrefix('')); assert.ok(!validPrefix('a b'));
});
test('filtra entradas activas por abreviatura, sin duplicados y en orden estable', () => {
  const entries = [validateEntry({ ...entry('2'), name: 'B' }), validateEntry({ ...entry('1'), name: 'A' }), validateEntry({ ...entry('3'), enabled: false })];
  assert.deepEqual(filterEntries(entries, 'ÓBJ').map(e => e.id), ['1', '2']);
  assert.equal(filterEntries(entries, '').length, 2); assert.equal(filterEntries(entries, 'ninguna').length, 0);
});
test('abreviaturas pegadas con prefijo y abreviaturas sin prefijo comparten resultados', () => {
  assert.equal(withoutPrefix(';obj', ';'), 'obj');
  assert.equal(withoutPrefix(' ::obj ', '::'), 'obj');
  const entries = [
    validateEntry({ ...entry('1'), abbreviations: [';obj', 'obj'] }),
    validateEntry({ ...entry('2'), abbreviations: ['obj'] }),
    validateEntry({ ...entry('3'), abbreviations: [';'] }),
  ];
  assert.deepEqual(filterEntries(entries, 'obj').map(e => e.id), ['1', '2']);
  assert.deepEqual(filterEntries(entries, '').map(e => e.id), ['1', '2']);
});
test('errores de lectura o formato nunca sobrescriben el catálogo', async () => {
  let writes = 0;
  for (const read of [async () => { throw new Error('offline'); }, async () => '', async () => false,
    async () => [], async () => ({ version: 2, entries: [] }), async () => ({ version: 1, entries: new Array(1001) })]) {
    const repo = new CatalogRepository({ wait: async () => undefined, read, write: async () => { writes++; } });
    await assert.rejects(repo.save(entry()));
  }
  assert.equal(writes, 0);
});
test('una clave ausente que llega como null permite guardar la primera frase', async () => {
  let stored: unknown = null;
  let writes = 0;
  const repo = new CatalogRepository({ wait: async () => undefined, read: async () => stored, write: async catalog => { stored = catalog; writes++; } });
  assert.deepEqual(await repo.load(), { version: 1, entries: [] });
  assert.equal(writes, 0);
  await repo.save(entry());
  assert.deepEqual((await repo.load()).entries, [validateEntry(entry())]);
  assert.equal(writes, 1);
});
test('el catálogo disponible se muestra antes de sincronizar y las escrituras esperan', { timeout: 1000 }, async () => {
  const sync = Promise.withResolvers<void>();
  const displayed = Promise.withResolvers<Catalog>();
  let stored = { version: 1 as const, entries: [entry('local')] };
  let writes = 0;
  const repo = new CatalogRepository({
    wait: () => sync.promise,
    read: async () => stored,
    write: async next => { stored = next; writes++; },
  });

  const confirmed = repo.loadForDisplay(displayed.resolve);
  const save = repo.save(entry('nueva'));
  assert.deepEqual(await displayed.promise, readCatalog(stored));
  assert.equal(writes, 0);

  stored = { version: 1, entries: [entry('sincronizada')] };
  sync.resolve();
  assert.equal((await confirmed).entries[0].id, 'sincronizada');
  await save;
  assert.equal(writes, 1);
  assert.deepEqual(stored.entries.map(item => item.id), ['sincronizada', 'nueva']);
});
test('un dato rápido ausente o inválido no se presenta como catálogo', { timeout: 1000 }, async () => {
  for (const value of [null, undefined, { version: 2, entries: [] }]) {
    const sync = Promise.withResolvers<void>();
    const readStarted = Promise.withResolvers<void>();
    let stored: unknown = value;
    let previews = 0;
    const repo = new CatalogRepository({
      wait: () => sync.promise,
      read: async () => { readStarted.resolve(); return stored; },
      write: async () => { throw new Error('La lectura no debe guardar'); },
    });
    const confirmed = repo.loadForDisplay(() => { previews++; });
    await readStarted.promise;
    await setImmediate();
    stored = { version: 1, entries: [entry()] };
    sync.resolve();
    assert.deepEqual(await confirmed, readCatalog(stored));
    assert.equal(previews, 0);
  }
});
test('una lectura preliminar tardía no reemplaza el catálogo confirmado', { timeout: 1000 }, async () => {
  const sync = Promise.withResolvers<void>();
  const cached = Promise.withResolvers<unknown>();
  const readStarted = Promise.withResolvers<void>();
  const latest = { version: 1, entries: [entry('reciente')] };
  let reads = 0, previews = 0;
  const repo = new CatalogRepository({
    wait: () => sync.promise,
    read: async () => {
      readStarted.resolve();
      return ++reads === 1 ? cached.promise : latest;
    },
    write: async () => { throw new Error('La lectura no debe guardar'); },
  });
  const confirmed = repo.loadForDisplay(() => { previews++; });
  await readStarted.promise;
  sync.resolve();
  assert.deepEqual(await confirmed, readCatalog(latest));
  cached.resolve({ version: 1, entries: [entry('anterior')] });
  await setImmediate();
  assert.equal(previews, 0);
});
test('si la sincronización ya está lista, se lee el catálogo una sola vez', async () => {
  let reads = 0;
  const repo = new CatalogRepository({
    wait: async () => undefined,
    read: async () => { reads++; return { version: 1, entries: [entry()] }; },
    write: async () => { throw new Error('La lectura no debe guardar'); },
  });
  let previews = 0;
  assert.equal((await repo.loadForDisplay(() => { previews++; })).entries.length, 1);
  assert.equal(reads, 1);
  assert.equal(previews, 0);
});
test('guarda sobre la lectura reciente, serializa cambios y conserva otros registros', async () => {
  let stored: unknown;
  const repo = new CatalogRepository({ wait: async () => undefined, read: async () => stored, write: async data => { stored = data; } });
  await Promise.all([repo.save(entry('1')), repo.save(entry('2'))]);
  assert.equal(readCatalog(stored).entries.length, 2);
  const original = readCatalog(stored).entries.find(e => e.id === '1')!;
  await repo.save({ ...original, text: 'Nueva frase' }, original);
  await assert.rejects(repo.save({ ...original, text: 'Edición obsoleta' }, original), /cambió/);
  const current = readCatalog(stored).entries.find(e => e.id === '1')!;
  await repo.remove(current);
  assert.deepEqual(readCatalog(stored).entries.map(e => e.id), ['2']);
});
test('guarda varias frases con abreviaturas compartidas en una sola escritura', async () => {
  const existing = validateEntry(entry('existente'));
  let stored = { version: 1 as const, entries: [existing] };
  let writes = 0;
  const repo = new CatalogRepository({
    wait: async () => undefined,
    read: async () => stored,
    write: async data => { stored = data; writes++; },
  });
  const shared = { name: 'Objetivo', abbreviations: ['obj', 'objetivo'], enabled: true };
  const variants = [
    { ...shared, id: 'singular', text: '¿Cuál es el objetivo?' },
    { ...shared, id: 'plural', text: '¿Cuáles son sus objetivos?' },
  ];

  await assert.rejects(repo.addVariants([variants[0], { ...variants[1], text: 'Dos\nlíneas' }]));
  assert.equal(writes, 0);
  assert.deepEqual(stored.entries, [existing]);

  await repo.addVariants(variants);
  assert.equal(writes, 1);
  for (const abbreviation of shared.abbreviations) {
    const results = filterEntries((await repo.load()).entries, abbreviation);
    assert.deepEqual(results, [existing, variants[1], variants[0]]);
  }
});
test('un fallo al guardar se propaga y permite reintentar conservando el borrador', async () => {
  let fail = true, stored: unknown;
  const repo = new CatalogRepository({ wait: async () => undefined, read: async () => stored, write: async data => { if (fail) throw new Error('write failed'); stored = data; } });
  const draft = entry(); await assert.rejects(repo.save(draft));
  assert.equal(stored, undefined); assert.equal(draft.text, '¿Cuál es su objetivo?');
  fail = false; await repo.save(draft); assert.equal(readCatalog(stored).entries.length, 1);
});
