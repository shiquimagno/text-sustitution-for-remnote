export type ProbeKey = 'up' | 'down' | 'tab' | 'enter' | 'escape';
// SDK widgets can receive a key string or an object, depending on the host.
export function probeKey(data: unknown): ProbeKey | undefined {
  let event: unknown = data;
  if (event && typeof event === 'object' && 'event' in event) event = (event as { event: unknown }).event;
  if (event && typeof event === 'object') {
    const e = event as Record<string, unknown>;
    if (e.repeat || e.shiftKey || e.ctrlKey || e.altKey || e.metaKey) return;
    event = e.key;
  }
  if (typeof event !== 'string') return;
  const aliases: Record<string, ProbeKey> = { up: 'up', arrowup: 'up', down: 'down', arrowdown: 'down', tab: 'tab', enter: 'enter', escape: 'escape', esc: 'escape' };
  return aliases[event.toLowerCase()];
}
