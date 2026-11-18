export const CATALOG_KEY = 'substitution-catalog-v1';
export const PREFIX_SETTING = 'substitution-prefix';
export const ENABLED_SETTING = 'substitutions-enabled';
export interface Substitution { id: string; name: string; text: string; abbreviations: string[]; enabled: boolean }
export interface Catalog { version: 1; entries: Substitution[] }
export const emptyCatalog = (): Catalog => ({ version: 1, entries: [] });
export const normalize = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('es');
export function validPrefix(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0 && value.length <= 16 && !/\s/u.test(value);
}
export function withoutPrefix(abbreviation: string, prefix: string): string {
  let key = abbreviation.trim();
  if (!validPrefix(prefix)) return key;
  while (key.startsWith(prefix)) key = key.slice(prefix.length);
  return key;
}
export function validateEntry(value: unknown): Substitution {
  if (!value || typeof value !== 'object') throw new Error('La sustitución no tiene un formato válido.');
  const e = value as Record<string, unknown>;
  if (typeof e.id !== 'string' || !e.id || e.id.length > 100) throw new Error('Identificador inválido.');
  if (typeof e.name !== 'string' || !e.name.trim() || e.name.length > 160) throw new Error('Escribe un nombre de hasta 160 caracteres.');
  if (typeof e.text !== 'string' || !e.text.trim() || e.text.length > 4000) throw new Error('Escribe una frase de hasta 4000 caracteres.');
  if (/\r|\n/u.test(e.text)) throw new Error('Usa una sola línea de texto en esta versión.');
  if (!Array.isArray(e.abbreviations) || !e.abbreviations.length || e.abbreviations.length > 20) throw new Error('Añade entre 1 y 20 abreviaturas.');
  const abbreviations: string[] = [], seen = new Set<string>();
  for (const value of e.abbreviations) {
    if (typeof value !== 'string' || !value.trim() || value.length > 64 || /\s/u.test(value.trim())) throw new Error('Cada abreviatura debe tener hasta 64 caracteres, sin espacios.');
    const key = value.trim();
    if (!seen.has(normalize(key))) { abbreviations.push(key); seen.add(normalize(key)); }
  }
  if (typeof e.enabled !== 'boolean') throw new Error('Estado de activación inválido.');
  return { id: e.id, name: e.name.trim(), text: e.text, abbreviations, enabled: e.enabled };
}
export function readCatalog(value: unknown): Catalog {
  // A missing synced value can arrive as null across the RemNote widget boundary.
  if (value === undefined || value === null) return emptyCatalog();
  if (typeof value !== 'object' || Array.isArray(value)) {
    const kind = Array.isArray(value) ? 'lista' : typeof value === 'string' ? 'texto' : 'valor escalar';
    throw new Error(`El catálogo guardado tiene un formato inesperado (${kind}). Se conservaron los datos.`);
  }
  const c = value as Record<string, unknown>;
  if (c.version !== 1) throw new Error('El catálogo usa una versión desconocida; no se modificó.');
  if (!Array.isArray(c.entries) || c.entries.length > 1000) throw new Error('El catálogo no es válido o supera 1000 entradas.');
  const entries = c.entries.map(validateEntry);
  if (new Set(entries.map(e => e.id)).size !== entries.length) throw new Error('El catálogo contiene identificadores repetidos.');
  return { version: 1, entries };
}
export function filterEntries(entries: Substitution[], query: string, prefix = ';') {
  const key = normalize(query);
  return entries.filter(e => e.enabled && e.abbreviations.some(abbreviation => {
    const effective = withoutPrefix(abbreviation, prefix);
    return effective.length > 0 && normalize(effective).startsWith(key);
  }))
    .sort((a, b) => normalize(a.name).localeCompare(normalize(b.name), 'es') || a.id.localeCompare(b.id));
}
interface CatalogStorage { wait(): Promise<void>; read(): Promise<unknown>; write(value: Catalog): Promise<void> }
export class CatalogRepository {
  private queue: Promise<unknown> = Promise.resolve();
  constructor(private storage: CatalogStorage) {}
  async load() { await this.storage.wait(); return readCatalog(await this.storage.read()); }
  async loadForDisplay(showAvailable: (catalog: Catalog) => void) {
    let finished = false;
    // Give a quick initial sync a chance to finish before issuing a second read.
    const previewTimer = setTimeout(() => {
      void Promise.resolve().then(() => this.storage.read()).then(value => {
        if (!finished && value != null) showAvailable(readCatalog(value));
      }).catch(() => {});
    }, 50);
    try {
      await this.storage.wait();
      clearTimeout(previewTimer);
      return readCatalog(await this.storage.read());
    } finally {
      finished = true;
      clearTimeout(previewTimer);
    }
  }
  private mutate(edit: (entries: Substitution[]) => Substitution[]) {
    const work = async () => {
      const latest = await this.load();
      const next = readCatalog({ version: 1, entries: edit(latest.entries) });
      await this.storage.write(next);
      return next;
    };
    const result = this.queue.then(work, work);
    this.queue = result;
    return result;
  }
  save(draft: unknown, expected?: Substitution) {
    const entry = validateEntry(draft);
    if (!expected) return this.addVariants([entry]);
    return this.mutate(entries => {
      const current = entries.find(e => e.id === entry.id);
      if (JSON.stringify(current) !== JSON.stringify(expected)) throw new Error('Esta entrada cambió en otro panel o dispositivo. Recarga el catálogo antes de editarla.');
      return [...entries.filter(e => e.id !== entry.id), entry];
    });
  }
  addVariants(drafts: readonly Substitution[]) {
    return this.mutate(entries => {
      const ids = new Set(entries.map(entry => entry.id));
      if (drafts.some(draft => ids.has(draft.id))) throw new Error('Ya existe una entrada con ese identificador.');
      return [...entries, ...drafts];
    });
  }
  remove(entry: Substitution) {
    return this.mutate(entries => {
      if (JSON.stringify(entries.find(e => e.id === entry.id)) !== JSON.stringify(entry)) throw new Error('La entrada cambió. Recarga el catálogo antes de eliminarla.');
      return entries.filter(e => e.id !== entry.id);
    });
  }
}
