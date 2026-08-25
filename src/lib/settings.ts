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
export const APP_VERSION = "0.1.0";
export const SUPPORT_EMAIL = "support@shinnoperformance.com";
export const LEGAL_NAME = "Shin No Performance LLC";

export const DEFAULT_SETTINGS: AppSettings = {
  autoAdd: true,
  autoConnect: true,
  rememberConnect: true,
  theme: "night",
  language: "system",
};

const listeners = new Set<() => void>();

function read(): AppSettings {
  if (typeof window === "undefined") return DEFAULT_SETTINGS;
  try {
    const raw = window.localStorage.getItem(SETTINGS_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(raw) as Partial<AppSettings>;
    return { ...DEFAULT_SETTINGS, ...parsed };
  } catch {
    return DEFAULT_SETTINGS;
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
  return DEFAULT_SETTINGS;
}
