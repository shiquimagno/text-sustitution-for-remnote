import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { setImmediate } from 'node:timers/promises';
import { CATALOG_KEY, ENABLED_SETTING, PREFIX_SETTING, Catalog } from '../src/core/catalog';
const require = createRequire(import.meta.url);
const Module = require('node:module');
const ts = require('typescript');
const sdk = require('../scripts/sdk-security.cjs').loadPatchedSdk();

async function harness(invocation = ';custom', before = '', after = '', behavior?: 'ignored-write' | 'failed-write' | 'card' | 'unauthorized' | 'many') {
  let activate!: (plugin: any) => Promise<void>, deactivate!: () => Promise<void>;
  const file = resolve('src/widgets/index.tsx');
  const mod = new Module(file, module);
  mod.filename = file;
  const localRequire = createRequire(file);
  mod.require = (id: string) => id === '@remnote/plugin-sdk' ? {
    ...sdk, declareIndexPlugin: (a: typeof activate, d: typeof deactivate) => { activate = a; deactivate = d; },
  } : localRequire(id);
  mod._compile(ts.transpileModule(readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText, file);
  const commands = new Map<string, any>();
  const events = new Map<string, Set<(data: unknown) => void>>();
  let catalog: Catalog = { version: 1, entries: [
    { id: 'a', name: 'Personalizada', abbreviations: ['custom'], text: 'Primera frase propia', enabled: true },
    { id: 'b', name: 'Personalizada', abbreviations: [';custom'], text: 'Segunda frase propia', enabled: true },
  ] };
  if (behavior === 'many') {
    catalog.entries.push(...Array.from({ length: 20 }, (_, index) => ({
      id: `more-${index}`, name: `Variante ${index}`, abbreviations: ['custom'], text: `Frase ${index}`, enabled: true,
    })));
  }
  const caret = before.length + invocation.length;
  let text = before + invocation + after, selection = { start: caret, end: caret }, state: any;
  let savedText = text;
  let inserted = 0, syncWaits = 0;
  let selectionReads = 0, floatingWindows = 0;
  const settings: Record<string, unknown> = { [PREFIX_SETTING]: ';', [ENABLED_SETTING]: true };
  const eventKey = (event: string, key: unknown) => `${event}:${key ?? ''}`;
  const plugin = {
    app: { registerWidget: async () => undefined, registerCommand: async (c: any) => { commands.set(c.id, c); }, toast: async () => undefined, waitForInitialSync: async () => { syncWaits++; } },
    settings: { registerStringSetting: async () => undefined, registerBooleanSetting: async () => undefined, getSetting: async (id: string) => settings[id] },
    storage: { getSynced: async (key: string) => { assert.equal(key, CATALOG_KEY); return catalog; }, setSession: async (_key: string, value: unknown) => { state = value; }, getSession: async () => state },
    editor: { getSelection: async () => {
      selectionReads++;
      return { type: 'Text', remId: 'test-rem', range: { ...selection } };
    }, getFocusedEditorText: async () => [text],
      getCaretPosition: async () => ({ bottom: 30, left: 20 }),
      selectText: async (value: typeof selection) => { selection = value; } },
    rem: { findOne: async (id: string) => id !== 'test-rem' || behavior === 'unauthorized' ? undefined : {
      _id: id,
      text: [savedText],
      backText: behavior === 'card' ? ['Respuesta'] : undefined,
      isCode: async () => false,
      setText: async (value: string[]) => {
        if (behavior === 'ignored-write') return;
        if (behavior === 'failed-write') throw new Error('falló la edición');
        inserted++;
        savedText = text = value.join('');
        selection = { start: text.length, end: text.length };
      },
    } },
    window: { getFocusedPaneId: async () => 'pane', openFloatingWidget: async () => { floatingWindows++; return 'popup-1'; }, isFloatingWidgetOpen: async () => true,
      setFloatingWidgetPosition: async () => undefined, releaseKeys: async () => undefined, closeFloatingWidget: async () => undefined },
    richText: { substring: async (value: string[], start: number, end?: number) => [value.join('').slice(start, end)], toString: async (value: string[]) => value.join(''), length: async (value: string[]) => value.join('').length,
      normalize: async (value: string[]) => [value.join('')], equals: async (first: string[], second: string[]) => first.join('') === second.join('') },
    widget: { openPopup: async () => undefined },
    event: { addListener: (event: string, key: unknown, callback: (data: unknown) => void) => {
      const id = eventKey(event, key); if (!events.has(id)) events.set(id, new Set()); events.get(id)!.add(callback);
    }, removeListener: (event: string, key: unknown, callback: (data: unknown) => void) => { events.get(eventKey(event, key))?.delete(callback); } },
  };
  await activate(plugin);
  const emit = async (event: string, data: unknown, key?: string) => { events.get(eventKey(event, key))?.forEach(fn => fn(data)); await setImmediate(); };
  await emit(sdk.AppEvents.EditorTextEdited, [text]);
  return { state: () => state, text: () => text, inserted: () => inserted, caret: () => selection.start, syncWaits: () => syncWaits,
    selectionReads: () => selectionReads, floatingWindows: () => floatingWindows,
    command: (id: string) => commands.get(id),
    emit,
    changeText: (value: string) => { text = value; },
    changeSavedText: (value: string) => { savedText = value; },
    savedText: () => savedText,
    key: (key: string) => emit(sdk.AppEvents.MessageBroadcast, { message: { type: 'probe-key', windowId: 'popup-1', key } }),
    disableSelected: () => { catalog = { ...catalog, entries: catalog.entries.map(e => e.id === 'b' ? { ...e, enabled: false } : e) }; },
    dispose: deactivate };
}
test('las sugerencias aparecen al escribir y un solo Tab inserta la opción seleccionada', async () => {
  const h = await harness();
  try {
    assert.equal(h.state().options.length, 2);
    assert.equal(h.command('manage-substitutions').name, 'Sustitutions');
    assert.deepEqual(h.state().options.map((option: { excerpt?: string }) => option.excerpt), ['Primera frase propia', 'Segunda frase propia']);
    await h.key('down'); assert.equal(h.state().selected, 1); assert.equal(h.state().preview, 'Segunda frase propia');
    await h.key('tab'); assert.equal(h.text(), 'Segunda frase propia'); assert.equal(h.inserted(), 1);
    assert.equal(h.syncWaits(), 1);
    assert.match(h.state().message, /Reemplazo en \d+ ms/);
  } finally { await h.dispose(); }
});
test('controlador real vuelve a leer el catálogo antes de aceptar una entrada desactivada', async () => {
  const h = await harness();
  try {
    await h.key('down'); h.disableSelected(); await h.key('enter');
    assert.equal(h.inserted(), 0); assert.equal(h.text(), ';custom');
  } finally { await h.dispose(); }
});
test('Enter reemplaza ambos prefijos de una invocación duplicada y conserva el texto alrededor', async () => {
  const h = await harness(';;custom', 'Antes; 😀 ', ' después ;custom');
  try {
    assert.equal(h.state().options.length, 2);
    await h.key('down');
    await h.key('enter');
    assert.equal(h.text(), 'Antes; 😀 Segunda frase propia después ;custom');
    assert.equal(h.caret(), 'Antes; 😀 Segunda frase propia'.length);
    assert.equal(h.inserted(), 1);
  } finally { await h.dispose(); }
});
test('si el editor omite la escritura, se conserva la abreviatura y se indica el fallo', async () => {
  const h = await harness(';custom', 'Antes ', ' después', 'ignored-write');
  try {
    await h.key('enter');
    assert.equal(h.text(), 'Antes ;custom después');
    assert.equal(h.inserted(), 0);
    assert.match(h.state().message, /no confirmó el cambio/);
  } finally { await h.dispose(); }
});
test('si RemNote rechaza la escritura, el atajo original se conserva', async () => {
  const h = await harness(';custom', 'Antes ', ' después', 'failed-write');
  try {
    await h.key('tab');
    assert.equal(h.text(), 'Antes ;custom después');
    assert.equal(h.inserted(), 0);
    assert.match(h.state().message, /falló la edición/);
  } finally { await h.dispose(); }
});
test('si cambia el texto antes de confirmar, se cancela la escritura', async () => {
  const h = await harness(';custom', 'Antes ', ' después');
  const changed = 'Antes ;custom otro final';
  try {
    h.changeText(changed);
    await h.key('tab');
    assert.equal(h.text(), changed);
    assert.equal(h.inserted(), 0);
  } finally { await h.dispose(); }
});
test('espera una actualización breve del Rem guardado y acepta con un solo Tab', async () => {
  const h = await harness();
  h.changeSavedText(';cus');
  const pendingSave = setTimeout(() => h.changeSavedText(';custom'), 20);
  try {
    await h.key('tab');
    await new Promise(resolve => setTimeout(resolve, 130));
    assert.equal(h.inserted(), 1);
    assert.equal(h.text(), 'Primera frase propia');
  } finally {
    clearTimeout(pendingSave);
    await h.dispose();
  }
});
test('un Rem con reverso queda fuera de la prueba de sustitución', async () => {
  const h = await harness(';custom', '', '', 'card');
  try {
    await h.key('tab');
    assert.equal(h.inserted(), 0);
    assert.equal(h.text(), ';custom');
    assert.equal(h.floatingWindows(), 0);
  } finally { await h.dispose(); }
});
test('la escritura sin prefijo no hace lecturas del editor ni abre el selector', async () => {
  const h = await harness('Texto normal');
  try {
    for (let index = 0; index < 100; index++) {
      await h.emit(sdk.AppEvents.EditorTextEdited, [`Texto normal ${index}`]);
      await h.emit(sdk.AppEvents.EditorSelectionChanged, {});
    }
    assert.equal(h.selectionReads(), 0);
    assert.equal(h.floatingWindows(), 0);
  } finally { await h.dispose(); }
});
test('el modo automático deja el teclado y el texto intactos en un Rem fuera de alcance', async () => {
  const h = await harness(';custom', '', '', 'unauthorized');
  try {
    await h.key('tab');
    assert.equal(h.floatingWindows(), 0);
    assert.equal(h.inserted(), 0);
    assert.equal(h.text(), ';custom');
  } finally { await h.dispose(); }
});
test('el selector solo transmite las nueve filas visibles al moverse por el catálogo', async () => {
  const h = await harness(';custom', '', '', 'many');
  try {
    for (let index = 0; index < 8; index++) await h.key('down');
    assert.equal(h.state().optionCount, 22);
    assert.equal(h.state().firstVisible, 4);
    assert.equal(h.state().options.length, 9);
    assert.equal(h.state().options[4].excerpt ?? h.state().preview, h.state().preview);
  } finally { await h.dispose(); }
});
test('conserva una edición guardada que difiere del editor abierto', async () => {
  const h = await harness(';custom', 'Antes ', ' después');
  const remoteEdit = 'Antes ;custom con un final más reciente';
  h.changeSavedText(remoteEdit);
  try {
    await h.key('tab');
    await new Promise(resolve => setTimeout(resolve, 130));
    assert.equal(h.savedText(), remoteEdit);
    assert.equal(h.inserted(), 0);
    assert.match(h.state().message, /textos distintos/);
  } finally { await h.dispose(); }
});
