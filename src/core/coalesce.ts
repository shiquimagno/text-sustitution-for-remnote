// Keep at most one active job and one pending refresh, regardless of event volume.
export function coalesceAsync(job: () => Promise<void>, onError: (error: unknown) => Promise<void>) {
  let running = false;
  let pending = false;
  let cancelled = false;
  const request = async () => {
    if (cancelled) return;
    pending = true;
    if (running) return;
    running = true;
    try {
      while (pending && !cancelled) {
        pending = false;
        try { await job(); }
        catch (error) { pending = false; await onError(error); }
      }
    } finally { running = false; }
  };
  return { request, cancel: () => { cancelled = true; pending = false; } };
}
