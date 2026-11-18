import { AppEvents, renderWidget, useAPIEventListener, usePlugin, useTrackerPlugin } from '@remnote/plugin-sdk';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { catalogRepository } from '../catalog-repository';
import { CATALOG_KEY, normalize, PREFIX_SETTING, Substitution, withoutPrefix } from '../core/catalog';
import '../catalog.css';

const emptyVariants = () => [{ id: 0, text: '' }];

function CatalogPanel() {
  const plugin = usePlugin();
  const repository = useMemo(() => catalogRepository(plugin), [plugin]);
  const [entries, setEntries] = useState<Substitution[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set());
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Substitution>();
  const [addingToExisting, setAddingToExisting] = useState(false);
  const [name, setName] = useState('');
  const [variants, setVariants] = useState(emptyVariants);
  const [abbreviations, setAbbreviations] = useState('');
  const [enabled, setEnabled] = useState(true);
  const [deleting, setDeleting] = useState<string>();
  const loadRevision = useRef(0);
  const nextVariantId = useRef(1);
  const nameInput = useRef<HTMLInputElement>(null);
  const prefix = useTrackerPlugin(p => p.settings.getSetting<string>(PREFIX_SETTING)) ?? ';';
  const load = useCallback(async (showAvailable = false) => {
    const revision = ++loadRevision.current;
    setLoading(true);
    try {
      const catalog = await (showAvailable ? repository.loadForDisplay(available => {
        if (revision === loadRevision.current) setEntries(available.entries);
      }) : repository.load());
      if (revision !== loadRevision.current) return;
      setEntries(catalog.entries); setLoaded(true); setError('');
    } catch (e) {
      if (revision === loadRevision.current) { setLoaded(false); setError(e instanceof Error ? e.message : 'No se pudo cargar el catálogo.'); }
    } finally { if (revision === loadRevision.current) setLoading(false); }
  }, [repository]);
  useEffect(() => { void load(true); return () => { ++loadRevision.current; }; }, [load]);
  useAPIEventListener(AppEvents.StorageSyncedChange, CATALOG_KEY, () => { void load(); });
  useEffect(() => { if (showForm) nameInput.current?.focus(); }, [showForm]);
  const reset = () => {
    setShowForm(false);
    setEditing(undefined); setAddingToExisting(false); setName(''); setVariants(emptyVariants());
    setAbbreviations(''); setEnabled(true);
  };
  const edit = (entry: Substitution) => {
    setShowForm(true);
    setEditing(entry); setAddingToExisting(false); setName(entry.name); setVariants([{ id: 0, text: entry.text }]);
    setAbbreviations(entry.abbreviations.join(', ')); setEnabled(entry.enabled); setNotice(''); setError(''); setDeleting(undefined);
  };
  const addToGroup = (key: string, entry: Substitution) => {
    setShowForm(true);
    setAddingToExisting(true);
    setName(entry.name);
    setAbbreviations(key);
    setNotice('');
    setError('');
    setDeleting(undefined);
  };
  const addVariant = () => {
    const id = nextVariantId.current++;
    setVariants(current => [...current, { id, text: '' }]);
  };
  const mutate = async (work: () => Promise<{ entries: Substitution[] }>, success: string, clear = false) => {
    if (busy || !loaded) return;
    setBusy(true); setNotice(''); setError('');
    try {
      const next = await work();
      setEntries(next.entries); setNotice(success);
      if (clear) reset();
      setDeleting(undefined);
    } catch (e) { setError(e instanceof Error ? e.message : 'No se pudo guardar. Tu borrador se conserva.'); }
    finally { setBusy(false); }
  };
  const groups = useMemo(() => {
    const byKey = new Map<string, { label: string; entries: Substitution[] }>();
    const query = normalize(withoutPrefix(search, prefix));
    const sorted = [...entries].sort((a, b) => normalize(a.name).localeCompare(normalize(b.name), 'es') || a.id.localeCompare(b.id));
    for (const entry of sorted) {
      const abbreviations = entry.abbreviations.map(value => withoutPrefix(value, prefix)).filter(Boolean);
      const phraseMatches = !query || normalize(`${entry.name} ${entry.text}`).includes(query);
      const seen = new Set<string>();
      for (const label of abbreviations.length ? abbreviations : ['']) {
        const key = normalize(label);
        if (seen.has(key)) continue;
        seen.add(key);
        if (!phraseMatches && !key.includes(query)) continue;
        const group = byKey.get(key);
        if (group) group.entries.push(entry);
        else byKey.set(key, { label, entries: [entry] });
      }
    }
    return [...byKey].sort(([a], [b]) => Number(!a) - Number(!b) || a.localeCompare(b, 'es'));
  }, [entries, prefix, search]);
  const multipleVariants = variants.length > 1;
  return <main className="catalog">
    <header className="catalog-header">
      <h1>Mis sustituciones</h1>
      {!showForm && <button className="catalog-primary" type="button" disabled={busy || !loaded}
        onClick={() => { setShowForm(true); setNotice(''); setError(''); setDeleting(undefined); }}>Nueva sustitución</button>}
    </header>
    <div className="catalog-content">
    {error && <div className="catalog-alert" role="alert">{error} {!loaded && <button type="button" onClick={() => void load()} disabled={busy || loading}>Volver a cargar</button>}</div>}
    {notice && <p className="catalog-notice" role="status">{notice}</p>}
    {showForm ? <section className="catalog-form-section"><h2>{editing ? 'Editar sustitución' : addingToExisting ? 'Agregar variantes' : 'Nueva sustitución'}</h2>
      <form onSubmit={event => {
        event.preventDefault();
        const shared = {
          name,
          abbreviations: abbreviations.split(',').filter(s => s.trim()).map(s => withoutPrefix(s, prefix)),
          enabled,
        };
        void mutate(
          () => editing
            ? repository.save({ ...shared, id: editing.id, text: variants[0].text }, editing)
            : repository.addVariants(variants.map(({ text }) => ({ ...shared, id: crypto.randomUUID(), text }))),
          multipleVariants ? `${variants.length} sustituciones guardadas.` : 'Sustitución guardada.',
          true,
        );
      }}>
        <fieldset disabled={busy || !loaded}>
          <label>Nombre<input ref={nameInput} value={name} onChange={e => setName(e.target.value)} maxLength={160} placeholder="Objetivo del tema" required /></label>
          <label>Abreviaturas<input value={abbreviations} onChange={e => setAbbreviations(e.target.value)} placeholder="obj, objetivo" maxLength={1300} required />
            <small>Sepáralas con comas. Se aplican a todas las frases de este formulario.</small></label>
          {variants.map((variant, index) => <div className="catalog-variant" key={variant.id}>
            <label>{multipleVariants ? `Frase ${index + 1}` : 'Texto que se insertará'}
              <textarea value={variant.text} onChange={event => {
                const text = event.target.value;
                setVariants(current => current.map(item => item.id === variant.id ? { ...item, text } : item));
              }} maxLength={4000} rows={2} placeholder={index === 0 ? '¿Cuál es el objetivo?' : undefined} required />
            </label>
            {multipleVariants && <button type="button" aria-label={`Quitar frase ${index + 1}`}
              onClick={() => setVariants(current => current.filter(item => item.id !== variant.id))}>Quitar</button>}
          </div>)}
          <small className="catalog-variant-help">Usa una sola línea por frase.</small>
          {!editing && <button type="button" onClick={addVariant}>Agregar variante</button>}
          <label className="catalog-check"><input type="checkbox" checked={enabled} onChange={e => setEnabled(e.target.checked)} /> {multipleVariants ? 'Mostrar estas sustituciones al escribir' : 'Mostrar esta sustitución al escribir'}</label>
          <div className="catalog-actions"><button className="catalog-primary" type="submit">{busy ? 'Guardando…' : multipleVariants ? 'Guardar variantes' : 'Guardar sustitución'}</button>
            <button type="button" onClick={reset}>Cancelar</button></div>
        </fieldset>
      </form>
    </section> : <section aria-label="Catálogo" className="catalog-list">
      <input type="search" aria-label="Buscar sustituciones" placeholder="Buscar por abreviatura, nombre o frase" value={search} onChange={e => setSearch(e.target.value)} />
      {loading && !loaded && <p role="status">{entries.length ? 'Sincronizando catálogo…' : 'Cargando catálogo…'}</p>}
      {!loading && loaded && entries.length === 0 && <p className="catalog-empty">Crea tu primera sustitución para empezar.</p>}
      {!loading && loaded && entries.length > 0 && groups.length === 0 && <p>No hay coincidencias.</p>}
      {groups.map(([key, group]) => <details className="catalog-group" key={key} open={expanded.has(key)}
        onToggle={event => {
          const open = event.currentTarget.open;
          setExpanded(previous => {
            if (previous.has(key) === open) return previous;
            const next = new Set(previous);
            if (open) next.add(key);
            else next.delete(key);
            return next;
          });
        }}>
        <summary>{group.label ? <code>{prefix}{group.label}</code> : 'Sin abreviatura disponible'}
          <span>{group.entries.length === 1 ? '1 frase' : `${group.entries.length} frases`}</span>
        </summary>
        {expanded.has(key) && <div className="catalog-group-content">
        {group.entries.map(entry => <article className="catalog-entry" key={entry.id}>
        <div className="catalog-entry-title"><h3>{entry.name}</h3><label className="catalog-check"><input type="checkbox" aria-label={`Activa: ${entry.text}`} checked={entry.enabled} disabled={busy || !loaded}
          onChange={() => void mutate(() => repository.save({ ...entry, enabled: !entry.enabled }, entry), entry.enabled ? 'Sustitución desactivada.' : 'Sustitución activada.')} />{entry.enabled ? 'Activa' : 'Desactivada'}</label></div>
        <p className="catalog-text">{entry.text}</p>
        <div className="catalog-actions"><button disabled={busy || !loaded} onClick={() => edit(entry)}>Editar</button>
          {deleting !== JSON.stringify([key, entry.id]) ? <button className="catalog-danger" disabled={busy || !loaded} onClick={() => setDeleting(JSON.stringify([key, entry.id]))}>Eliminar</button> : <>
            <span>¿Eliminar esta frase del catálogo?</span><button className="catalog-danger" disabled={busy} onClick={() => void mutate(() => repository.remove(entry), 'Sustitución eliminada.', editing?.id === entry.id)}>Sí, eliminar</button>
            <button disabled={busy} onClick={() => setDeleting(undefined)}>Cancelar</button></>}</div>
      </article>)}
        {group.label && <button className="catalog-add" type="button" disabled={busy || !loaded}
          onClick={() => addToGroup(group.label, group.entries[0])}>Agregar variante</button>}
        </div>}
      </details>)}
    </section>}
    </div>
  </main>;
}
renderWidget(CatalogPanel);
