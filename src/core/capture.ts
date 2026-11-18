import { KEYS } from './probe';
import { probeKey, ProbeKey } from './keys';
interface CaptureApi {
  addListener(event: string, windowId: string, listener: (data: unknown) => void): void;
  removeListener(event: string, windowId: string, listener: (data: unknown) => void): void;
  stealKeys(windowId: string, keys: string[]): Promise<void>;
  releaseKeys(windowId: string, keys: string[]): Promise<void>;
}
// StealKeyEvent is keyed by floatingWidgetId. Register before capturing keys.
export function connectKeyCapture(api: CaptureApi, eventId: string, windowId: string,
  onKey: (key: ProbeKey) => void, onStatus: (message: string) => void) {
  let disposed = false;
  const listener = (data: unknown) => {
    if (disposed) return;
    const key = probeKey(data);
    if (key) onKey(key);
    else onStatus('Tecla recibida con formato no reconocido.');
  };
  api.addListener(eventId, windowId, listener);
  const release = () => api.releaseKeys(windowId, KEYS).catch(() => undefined);
  void api.stealKeys(windowId, KEYS).then(() => {
    if (disposed) return release();
    onStatus('Teclado conectado.');
  }).catch(() => {
    if (disposed) return;
    api.removeListener(eventId, windowId, listener);
    onStatus('No se pudo capturar el teclado.');
    void release();
  });
  return () => {
    disposed = true;
    api.removeListener(eventId, windowId, listener);
    void release();
  };
}
