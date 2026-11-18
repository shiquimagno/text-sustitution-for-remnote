import { probeKey, ProbeKey } from './keys';
// RemNote broadcasts an envelope: { message: theValuePassedToBroadcast }.
export function probeMessageKey(event: unknown, activeWindowId: string | undefined): ProbeKey | undefined {
  if (!activeWindowId || !event || typeof event !== 'object') return;
  const message = (event as { message?: unknown }).message;
  if (!message || typeof message !== 'object') return;
  const data = message as Record<string, unknown>;
  if (data.type !== 'probe-key' || data.windowId !== activeWindowId) return;
  return probeKey(data.key);
}
export function moveSelection(selected: number, key: 'up' | 'down', length: number) {
  return Math.max(0, Math.min(Math.max(0, length - 1), selected + (key === 'down' ? 1 : -1)));
}
