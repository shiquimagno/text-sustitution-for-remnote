export const STATE = 'compatibility-probe';
export const KEYS = ['up', 'down', 'tab', 'enter', 'esc'];
export const OPTIONS = [
  { name: 'Objetivo breve', text: '¿Cuál es su objetivo?' },
  { name: 'Objetivo del tema', text: '¿Cuál es el objetivo de este tema?' },
];
export function invocationBeforeCaret(text: string, prefix = ';') {
  if (!prefix) return undefined;
  const index = text.lastIndexOf(prefix);
  if (index < 0) return undefined;
  const query = text.slice(index + prefix.length);
  if (/\s/u.test(query)) return undefined;
  // A repeated prefix typed as part of the same invocation belongs to its range.
  let start = index;
  while (start >= prefix.length && text.endsWith(prefix, start)) start -= prefix.length;
  return { query, literal: text.slice(start) };
}
export function matches(query: string) {
  const normalized = query.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  return ['obj', 'objetivo'].some(key => key.startsWith(normalized));
}
export function plainTextOnly(elements: unknown[]): string | undefined {
  let text = '';
  for (const element of elements) {
    if (typeof element === 'string') text += element;
    else if (element && typeof element === 'object') {
      const e = element as Record<string, unknown>;
      if (e.i !== 'm' || typeof e.text !== 'string' || e.code || e.q || e.language) return undefined;
      text += e.text;
    } else return undefined;
  }
  return text;
}
export interface ProbeState {
  message: string; selected: number;
  firstVisible: number;
  optionCount: number;
  options: Array<{ id: string; name: string; abbreviation: string; excerpt?: string }>;
  preview?: string;
  prefix?: string;
}
