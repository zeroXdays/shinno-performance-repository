type Tick = () => void;

let tick: Tick | null = null;
let started = false;

/** Register a client-only reconnect pump. Safe to call every render — the interval starts once. */
export function registerAutoReconnect(fn: Tick) {
  tick = fn;
  if (typeof window === "undefined" || started) return;
  started = true;
  const run = () => tick?.();
  window.setInterval(run, 4000);
  window.addEventListener("pageshow", run);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") run();
  });
  queueMicrotask(run);
}
