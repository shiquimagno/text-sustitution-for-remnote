import { AppEvents, declareIndexPlugin, ReactRNPlugin, RemType, RichTextInterface, SelectionType, WidgetLocation } from '@remnote/plugin-sdk';
import { invocationBeforeCaret, KEYS, plainTextOnly, ProbeState, STATE } from '../core/probe';
import { CATALOG_KEY, Catalog, ENABLED_SETTING, emptyCatalog, filterEntries, PREFIX_SETTING, Substitution, validPrefix, withoutPrefix } from '../core/catalog';
import { catalogRepository } from '../catalog-repository';
import { coalesceAsync } from '../core/coalesce';
import { probeKey } from '../core/keys';
import { moveSelection, probeMessageKey } from '../core/messages';
type Snapshot = { remId: string; pane: string; start: number; end: number; literal: string; query: string; richText: RichTextInterface };
let dispose: (() => Promise<void>) | undefined;

async function onActivate(plugin: ReactRNPlugin) {
  let armedRem: string | undefined, windowId: string | undefined, ignored: string | undefined;
  let current: Snapshot | undefined;
  let revision = 0, selected = 0, accepting = false, disposed = false;
  let pendingArm = false;
  let candidateEdit = false;
  let checkedRem: { id: string; usable: boolean } | undefined;
  let lastMessage = '';
  let catalog: Catalog = emptyCatalog();
  let options: Substitution[] = [];
  let nameCounts = new Map<string, number>();
  let hasActiveEntries = false;
  let prefix = ';';
  let enabled = true;
  let catalogError = '';
  const repository = catalogRepository(plugin);
  const listeners: Array<[string, (data: any) => void]> = [];
  const publish = async (message: string) => {
    const firstVisible = Math.max(0, selected - 4);
    const state: ProbeState = { message, selected, prefix, firstVisible, optionCount: options.length,
      options: options.slice(firstVisible, firstVisible + 9).map(e => ({
        id: e.id,
        name: e.name,
        abbreviation: e.abbreviations.map(a => withoutPrefix(a, prefix)).find(Boolean) ?? '',
        excerpt: nameCounts.get(e.name)! > 1 ? e.text.slice(0, 120) : undefined,
      })),
      preview: options[selected]?.text ?? '' };
    const value = JSON.stringify(state);
    if (value === lastMessage) return;
    await plugin.storage.setSession(STATE, state);
    lastMessage = value;
  };
  const close = async () => {
    const id = windowId; windowId = undefined; current = undefined;
    options = [];
    nameCounts.clear();
    if (id) {
      try { await plugin.window.releaseKeys(id, KEYS); }
      finally { await plugin.window.closeFloatingWidget(id); }
    }
  };
  const disarm = () => {
    ++revision; armedRem = undefined; ignored = undefined; pendingArm = false;
    candidateEdit = false; checkedRem = undefined;
    return close();
  };
  const stop = async () => {
    await disarm();
    await publish('Prueba detenida. El editor funciona normalmente.');
  };
  const snapshot = async (): Promise<Snapshot | undefined> => {
    const selection = await plugin.editor.getSelection();
    if (selection?.type !== SelectionType.Text ||
        (armedRem && selection.remId !== armedRem) || selection.range.start !== selection.range.end) return;
    const [richText, pane] = await Promise.all([
      plugin.editor.getFocusedEditorText(),
      plugin.window.getFocusedPaneId(),
    ]);
    if (!richText || richText.some(part => typeof part !== 'string' && part.i === 'm' &&
      (part.workInProgressRem || part.workInProgressTag || part.workInProgressPortal))) return;
    const end = selection.range.end;
    const before = await plugin.richText.substring(richText, 0, end);
    const invocation = invocationBeforeCaret(plainTextOnly(before) ?? await plugin.richText.toString(before), prefix);
    if (!invocation) return;
    const { literal, query } = invocation;
    const length = /^[\x20-\x7e]+$/u.test(literal) ? literal.length : await plugin.richText.length([literal]);
    const start = end - length;
    if (start < 0 || plainTextOnly(await plugin.richText.substring(richText, start, end)) !== literal) return;
    return { remId: selection.remId, pane, start, end, literal, query, richText };
  };
  const prepareReplacement = async ({ start, end, richText }: Snapshot, text: string) => {
    const [before, after, length] = await Promise.all([
      plugin.richText.substring(richText, 0, start),
      plugin.richText.substring(richText, end),
      plugin.richText.length([text]),
    ]);
    const parts = [...before, text, ...after];
    const nextText = parts.every(part => typeof part === 'string') ? [parts.join('')] : parts;
    return { nextText, caret: start + length };
  };
  const readEditor = () => Promise.all([
    plugin.editor.getSelection(),
    plugin.editor.getFocusedEditorText(),
    plugin.window.getFocusedPaneId(),
  ]);
  const sameText = async (first: RichTextInterface | undefined, second: RichTextInterface) => {
    if (!first) return false;
    if (JSON.stringify(first) === JSON.stringify(second)) return true;
    const [actual, planned] = await Promise.all([plugin.richText.normalize(first), plugin.richText.normalize(second)]);
    return plugin.richText.equals(actual, planned);
  };
  const isSupportedRem = async (rem: NonNullable<Awaited<ReturnType<ReactRNPlugin['rem']['findOne']>>>) =>
    rem.type !== RemType.PORTAL && !rem.backText?.some(part => part !== '') && !await rem.isCode();
  const replace = async (expected: Snapshot, nextText: RichTextInterface, caret: number): Promise<string | undefined> => {
    const editRevision = revision;
    const aborted = () => current !== expected || revision !== editRevision || (armedRem && armedRem !== expected.remId);
    const changed = 'El Rem o el cursor cambió mientras se preparaba la sustitución.';
    const checkTarget = async () => {
      const rem = await plugin.rem.findOne(expected.remId);
      if (!rem) return { error: 'RemNote no dio acceso al Rem seleccionado.' };
      const [supported, matches] = await Promise.all([isSupportedRem(rem), sameText(rem.text, expected.richText)]);
      if (!supported) return { error: 'Las sustituciones admiten Rems de texto, sin reverso, portal ni bloque de código.' };
      return { rem, matches };
    };
    let target = await checkTarget();
    if (aborted()) return changed;
    if (target.rem && !target.matches) {
      // The visible editor can briefly be ahead of the saved Rem.
      await new Promise<void>(resolve => setTimeout(resolve, 100));
      if (aborted()) return changed;
      target = await checkTarget();
    }
    if (!target.rem) return target.error;
    if (!target.matches) return 'El Rem guardado y el editor muestran textos distintos. Se canceló la sustitución.';
    const [selection, original, pane] = await readEditor();
    if (aborted() || pane !== expected.pane || selection?.type !== SelectionType.Text ||
        selection.remId !== expected.remId || selection.range.start !== expected.end ||
        selection.range.end !== expected.end || JSON.stringify(original) !== JSON.stringify(expected.richText)) return changed;

    // The Rem API targets the verified ID using the existing modification scope.
    await target.rem.setText(nextText);
    const [saved, [updatedSelection, updated, updatedPane]] = await Promise.all([
      plugin.rem.findOne(expected.remId),
      readEditor(),
    ]);
    if (!await sameText(saved?.text, nextText)) {
      return 'RemNote no confirmó el cambio en el Rem seleccionado.';
    }
    if (await sameText(updated, nextText) && current === expected && updatedPane === expected.pane &&
        updatedSelection?.type === SelectionType.Text && updatedSelection.remId === expected.remId &&
        (updatedSelection.range.start !== caret || updatedSelection.range.end !== caret)) {
      await plugin.editor.selectText({ start: caret, end: caret });
    }
  };
  const fail = async (error: unknown) => {
    await stop().catch(() => undefined);
    await publish('Error de sustituciones. ' + (error instanceof Error ? error.message : String(error)));
  };
  const refresh = async () => {
    if (accepting || disposed) return;
    if (!enabled || catalogError || !validPrefix(prefix)) {
      await close();
      await publish(catalogError || (!enabled ? 'Sustituciones desactivadas en Ajustes.' : 'Configura un prefijo no vacío y sin espacios en Ajustes.'));
      return;
    }
    if (pendingArm) {
      const selection = await plugin.editor.getSelection();
      if (disposed || !pendingArm) return;
      if (selection?.type !== SelectionType.Text) {
        await publish('Esperando cursor dentro de un Rem hijo de «Prueba de sustituciones». El SDK devuelve selección: ' + (selection?.type ?? 'ninguna') + '.');
        return;
      }
      // Confirm the Rem is readable under the restricted test-document scope.
      const scopedRem = await plugin.rem.findOne(selection.remId);
      if (disposed || !pendingArm) return;
      if (!scopedRem) {
        await publish('Ese Rem no es accesible con el permiso de prueba. Haz clic en un Rem hijo del documento raíz «Prueba de sustituciones».');
        return;
      }
      armedRem = selection.remId;
      pendingArm = false;
      await publish('Sustituciones activas en este Rem. Escribe ' + prefix + ' y una abreviatura guardada.');
      await plugin.app.toast('Sustituciones activas en este Rem.');
    }
    if ((!candidateEdit && !armedRem) || !hasActiveEntries) { await close(); return; }
    const version = ++revision;
    const next = await snapshot();
    if (version !== revision || disposed || accepting) return;
    if (!next || JSON.stringify(next) === ignored) { await close(); return; }
    const nextOptions = filterEntries(catalog.entries, next.query, prefix);
    if (!nextOptions.length) { await close(); return; }
    if (checkedRem?.id !== next.remId) {
      const rem = await plugin.rem.findOne(next.remId);
      const usable = Boolean(rem && await isSupportedRem(rem));
      if (version !== revision || disposed || accepting) return;
      checkedRem = { id: next.remId, usable };
    }
    if (!checkedRem.usable) {
      await close();
      if (armedRem) await publish('La prueba admite un Rem de texto sin reverso, portal ni bloque de código.');
      return;
    }
    const selectedId = options[selected]?.id;
    const sameInvocation = JSON.stringify(current) === JSON.stringify(next);
    options = nextOptions;
    nameCounts = new Map();
    for (const { name } of options) nameCounts.set(name, (nameCounts.get(name) ?? 0) + 1);
    selected = sameInvocation ? Math.max(0, options.findIndex(e => e.id === selectedId)) : 0;
    const [windowOpen, caret] = await Promise.all([
      windowId ? plugin.window.isFloatingWidgetOpen(windowId) : true,
      plugin.editor.getCaretPosition(),
    ]);
    if (version !== revision || accepting || disposed) return;
    if (!windowOpen) {
      ignored = current && JSON.stringify(current);
      windowId = undefined;
      await close();
      return;
    }
    if (!caret) return;
    current = next;
    await publish('↑/↓ para elegir · Tab o Enter para insertar · Escape para cancelar');
    if (version !== revision || disposed) return;
    const position = { top: caret.bottom + 6, left: Math.max(8, caret.left) };
    if (!windowId) {
      const id = await plugin.window.openFloatingWidget('probe', position);
      if (current !== next || disposed) { await plugin.window.closeFloatingWidget(id); return; }
      windowId = id;
    } else await plugin.window.setFloatingWidgetPosition(windowId, position);
  };
  const refreshQueue = coalesceAsync(refresh, fail);
  const keypress = async (data: any) => {
    if (!current || !windowId || accepting || disposed) return;
    const key = probeKey(data);
    if (!key) return;
    if (key === 'escape') {
      ++revision; ignored = JSON.stringify(current);
      await close(); await publish('Cancelado. La abreviatura permanece escrita.');
    } else if (key === 'down' || key === 'up') {
      selected = moveSelection(selected, key, options.length);
      await publish('Elige una frase con Tab o Enter.');
    } else if (key === 'tab' || key === 'enter') {
      accepting = true; ++revision;
      const acceptedAt = performance.now();
      try {
        const expected = current;
        const choice = options[selected];
        if (!choice) { await close(); return; }
        const [latest, replacement] = await Promise.all([
          repository.load(),
          prepareReplacement(expected, choice.text),
        ]);
        const fresh = latest.entries.find(e => e.id === choice.id && e.enabled);
        if (!fresh || JSON.stringify(fresh) !== JSON.stringify(choice)) {
          catalog = latest;
          hasActiveEntries = latest.entries.some(entry => entry.enabled);
          await close(); await publish('La sustitución cambió. Vuelve a escribir la abreviatura.'); return;
        }
        const error = await replace(expected, replacement.nextText, replacement.caret);
        await close();
        await publish(error ?? `Frase insertada. Reemplazo en ${Math.round(performance.now() - acceptedAt)} ms.`);
      } finally { accepting = false; }
    }
  };
  await plugin.app.registerWidget('probe', WidgetLocation.FloatingWidget, { dimensions: { width: 370, height: 'auto' } });
  await plugin.app.registerWidget('probe_status', WidgetLocation.RightSidebar, { dimensions: { width: '100%', height: 'auto' } });
  await plugin.app.registerWidget('catalog', WidgetLocation.Popup, { dimensions: { width: 'min(620px, 92vw)', height: 500 } });
  await plugin.settings.registerStringSetting({ id: PREFIX_SETTING, title: 'Prefijo de sustituciones',
    description: 'Ejemplo: usa ; para escribir ;obj.', defaultValue: ';' });
  await plugin.settings.registerBooleanSetting({ id: ENABLED_SETTING, title: 'Activar sustituciones',
    description: 'Usa /sustitutions para abrir el catálogo. Las sugerencias aparecen al escribir en un Rem autorizado.', defaultValue: true });
  await plugin.app.registerCommand({ id: 'manage-substitutions', name: 'Sustitutions', keywords: 'substitutions mis sustituciones texto frases abreviaturas configuración',
    action: async () => {
      const wasArmed = Boolean(armedRem || pendingArm);
      await disarm();
      await Promise.all([
        plugin.widget.openPopup('catalog'),
        wasArmed && publish('Prueba detenida. El editor funciona normalmente.'),
      ]);
    } });
  await plugin.app.registerCommand({ id: 'start-probe', name: 'Sustituciones: iniciar prueba en este Rem', action: async () => {
    try {
      await stop();
      try {
        catalog = await repository.load();
        hasActiveEntries = catalog.entries.some(e => e.enabled);
        catalogError = '';
      }
      catch (error) { catalogError = error instanceof Error ? error.message : 'No se pudo cargar el catálogo.'; }
      if (catalogError) { await publish(catalogError); await plugin.app.toast(catalogError); return; }
      if (!catalog.entries.some(e => e.enabled)) {
        await Promise.all([
          plugin.app.toast('Crea una frase activa con /sustitutions para empezar.'),
          plugin.widget.openPopup('catalog'),
        ]);
        return;
      }
      pendingArm = true;
      await publish('Haz clic en un Rem hijo de «Prueba de sustituciones» y escribe el prefijo y tu abreviatura.');
      await plugin.app.toast('Ahora haz clic en el Rem de prueba y escribe tu abreviatura.');
    } catch (error) { await fail(error); }
  }});
  await plugin.app.registerCommand({ id: 'stop-probe', name: 'Sustituciones: detener prueba', action: stop });
  await plugin.app.registerCommand({ id: 'probe-status', name: 'Sustituciones: ver estado', keywords: 'estado de prueba diagnóstico', action: async () => {
    const state = await plugin.storage.getSession<ProbeState>(STATE);
    await plugin.app.toast(state?.message ?? 'El plugin todavía no ha publicado su estado.');
  }});
  const keyedListeners: Array<[string, string, (data: any) => void]> = [];
  const listen = (event: string, callback: (data: any) => void, listenerKey?: string) => {
    plugin.event.addListener(event, listenerKey, callback);
    if (listenerKey) keyedListeners.push([event, listenerKey, callback]);
    else listeners.push([event, callback]);
  };
  listen(AppEvents.EditorTextEdited, data => {
    ++revision;
    candidateEdit = enabled && hasActiveEntries && validPrefix(prefix) &&
      (!Array.isArray(data) || (plainTextOnly(data)?.includes(prefix) ?? true));
    if (candidateEdit || pendingArm || current || windowId) void refreshQueue.request().catch(fail);
  });
  listen(AppEvents.EditorSelectionChanged, () => {
    ++revision;
    if (candidateEdit || pendingArm || armedRem || current || windowId) void refreshQueue.request().catch(fail);
  });
  for (const event of [AppEvents.FocusedRemChange, AppEvents.FocusedPaneChange]) listen(event, () => {
    ++revision; ignored = undefined; candidateEdit = false; checkedRem = undefined;
    const closed = close();
    if (pendingArm) void closed.then(() => refreshQueue.request()).catch(fail);
    else void closed.catch(fail);
  });
  // A key belongs to the window that captured it. Accept one forwarded event
  // path only, so Enter cannot insert twice if the host broadcasts other events.
  listen(AppEvents.MessageBroadcast, data => {
    const key = probeMessageKey(data, windowId);
    if (key) void keypress(key).catch(fail);
  });
  const loadConfiguration = async () => {
    const [loaded, newPrefix, newEnabled] = await Promise.all([
      repository.load().then(value => ({ value, error: '' })).catch(error => ({
        value: catalog,
        error: error instanceof Error ? error.message : 'No se pudo cargar el catálogo.',
      })),
      plugin.settings.getSetting<string>(PREFIX_SETTING),
      plugin.settings.getSetting<boolean>(ENABLED_SETTING),
    ]);
    catalog = loaded.value;
    hasActiveEntries = catalog.entries.some(entry => entry.enabled);
    catalogError = loaded.error;
    prefix = newPrefix ?? ';';
    enabled = newEnabled ?? true;
  };
  const configurationQueue = coalesceAsync(async () => { ++revision; await loadConfiguration(); await refreshQueue.request(); }, fail);
  listen(AppEvents.StorageSyncedChange, () => { void configurationQueue.request().catch(fail); }, CATALOG_KEY);
  for (const id of [PREFIX_SETTING, ENABLED_SETTING]) listen(AppEvents.SettingChanged, () => {
    ++revision; candidateEdit = false; checkedRem = undefined;
    void close().then(() => configurationQueue.request()).catch(fail);
  }, id);
  await loadConfiguration();
  await publish('Usa /sustitutions para gestionar tus frases. El modo de prueba se activa por separado.');
  dispose = async () => {
    disposed = true;
    refreshQueue.cancel();
    configurationQueue.cancel();
    for (const [event, callback] of listeners) plugin.event.removeListener(event, undefined, callback);
    for (const [event, key, callback] of keyedListeners) plugin.event.removeListener(event, key, callback);
    await stop();
  };
}
declareIndexPlugin(onActivate, async () => { await dispose?.(); dispose = undefined; });
