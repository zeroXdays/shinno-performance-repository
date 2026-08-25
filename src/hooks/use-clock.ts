"use client";

import { useSyncExternalStore } from "react";

let now = 0;
const listeners = new Set<() => void>();
let raf = 0;
let origin = 0;

function start() {
  if (raf) return;
  origin = performance.now() - now;
  const loop = (time: number) => {
    now = time - origin;
    listeners.forEach((listener) => listener());
    raf = requestAnimationFrame(loop);
  };
  raf = requestAnimationFrame(loop);
}

function stop() {
  cancelAnimationFrame(raf);
  raf = 0;
}

function subscribe(onStoreChange: () => void) {
  listeners.add(onStoreChange);
  start();
  return () => {
    listeners.delete(onStoreChange);
    if (listeners.size === 0) stop();
  };
}

function noopSubscribe() {
  return () => undefined;
}

function getNow() {
  return now;
}

function getZero() {
  return 0;
}

export function useClock(active: boolean): number {
  return useSyncExternalStore(active ? subscribe : noopSubscribe, active ? getNow : getZero, getZero);
}
