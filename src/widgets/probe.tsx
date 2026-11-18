import { AppEvents, renderWidget, usePlugin, useRunAsync, useTrackerPlugin, WidgetLocation } from '@remnote/plugin-sdk';
import { useEffect, useRef, useState } from 'react';
import { ProbeState, STATE } from '../core/probe';
import { connectKeyCapture } from '../core/capture';
import '../probe.css';
function Probe() {
  const plugin = usePlugin();
  const context = useRunAsync(() => plugin.widget.getWidgetContext<WidgetLocation.FloatingWidget>(), []);
  const [keyboard, setKeyboard] = useState('Conectando teclado…');
  const [keyboardReady, setKeyboardReady] = useState(false);
  const count = useRef(0);
  useEffect(() => {
    const id = context?.floatingWidgetId;
    if (!id) return;
    setKeyboardReady(false);
    return connectKeyCapture({
      addListener: (event, key, listener) => plugin.event.addListener(event, key, listener),
      removeListener: (event, key, listener) => plugin.event.removeListener(event, key, listener),
      stealKeys: (key, keys) => plugin.window.stealKeys(key, keys),
      releaseKeys: (key, keys) => plugin.window.releaseKeys(key, keys),
    }, AppEvents.StealKeyEvent, id, key => {
      setKeyboard(`Recibida: ${key} · ${++count.current}`);
      void plugin.messaging.broadcast({ type: 'probe-key', windowId: id, key })
        .catch(() => setKeyboard('Tecla recibida, pero falló el envío al controlador.'));
    }, status => {
      setKeyboard(status);
      if (status === 'Teclado conectado.') setKeyboardReady(true);
    });
  }, [plugin, context?.floatingWidgetId]);
  const state = useTrackerPlugin(plugin => plugin.storage.getSession<ProbeState>(STATE));
  const options = state?.options ?? [];
  const firstVisible = state?.firstVisible ?? 0;
  if (!keyboardReady) return <section className="suggestions" role="status">{keyboard}</section>;
  return <section className="suggestions" aria-label="Sustituciones de texto">
    <div className="eyebrow">MIS SUSTITUCIONES · {state?.optionCount ?? 0} opciones</div>
    <div role="listbox" aria-label="Frases guardadas">{options.map((option, offset) => {
      const index = firstVisible + offset;
      return <div key={option.id} role="option" aria-selected={index === state?.selected} className={index === state?.selected ? 'option selected' : 'option'}>
        <span className="option-label">{option.excerpt && `${option.excerpt} · `}{option.name}</span><small>{state?.prefix}{option.abbreviation}</small>
      </div>;
    })}</div>
    <div className="preview">{state?.preview ?? 'Cargando…'}</div>
    <footer>↑ ↓ elegir · Tab / Enter insertar · Esc cerrar</footer>
    <footer role="status">0.2.8 · {keyboard} · opción {(state?.selected ?? 0) + 1}</footer>
  </section>;
}
renderWidget(Probe);
