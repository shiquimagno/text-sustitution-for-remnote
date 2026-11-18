import { renderWidget, useTrackerPlugin } from '@remnote/plugin-sdk';
import { ProbeState, STATE } from '../core/probe';
import '../probe.css';
function Status() {
  const state = useTrackerPlugin(plugin => plugin.storage.getSession<ProbeState>(STATE));
  return <section className="suggestions"><h2>Sustituciones de texto</h2><p role="status">{state?.message ?? 'Cargando…'}</p></section>;
}
renderWidget(Status);
