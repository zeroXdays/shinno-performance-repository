export type ThemeId = "night" | "graphite" | "studio";
export type LangId = "system" | "en" | "es";

export interface AppSettings {
  autoAdd: boolean;
  autoConnect: boolean;
  rememberConnect: boolean;
  theme: ThemeId;
  language: LangId;
}

export const SETTINGS_KEY = "shinno-settings-v1";
export const APP_VERSION = "1.0";
export { LEGAL_NAME, SUPPORT_EMAIL } from "./legal";

export const DEFAULT_SETTINGS: AppSettings = {
  // Auto-add removed — Scan still lists devices; user taps Add.
  autoAdd: false,
  autoConnect: true,
  rememberConnect: true,
  theme: "night",
  language: "system",
};

/** Cached getServerSnapshot — must be the same object reference every call. */
const SERVER_SETTINGS: AppSettings = DEFAULT_SETTINGS;

const listeners = new Set<() => void>();

function read(): AppSettings {
  if (typeof window === "undefined") return SERVER_SETTINGS;
  try {
    const raw = window.localStorage.getItem(SETTINGS_KEY);
    if (!raw) return SERVER_SETTINGS;
    const parsed = JSON.parse(raw) as Partial<AppSettings>;
    // Force auto-add off for anyone who still had it enabled.
    return { ...DEFAULT_SETTINGS, ...parsed, autoAdd: false };
  } catch {
    return SERVER_SETTINGS;
  }
}

let snapshot = read();

export function getSettings(): AppSettings {
  return snapshot;
}

export function subscribeSettings(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function updateSettings(patch: Partial<AppSettings>) {
  snapshot = { ...snapshot, ...patch };
  try {
    window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(snapshot));
  } catch {
    /* ignore */
  }
  listeners.forEach((listener) => listener());
}

export function getServerSettings(): AppSettings {
  return SERVER_SETTINGS;
}
