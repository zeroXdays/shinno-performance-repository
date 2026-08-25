"use client";

import { useLayoutEffect, useSyncExternalStore } from "react";
import { resolveLang } from "./i18n";
import { getServerSettings, getSettings, subscribeSettings } from "./settings";

export function ThemeRoot({ children }: { children: React.ReactNode }) {
  const settings = useSyncExternalStore(subscribeSettings, getSettings, getServerSettings);
  useLayoutEffect(() => {
    document.documentElement.dataset.theme = settings.theme;
    document.documentElement.lang = resolveLang(settings.language);
  }, [settings.language, settings.theme]);

  return (
    <div data-theme={settings.theme} className="app-shell min-h-dvh">
      {children}
    </div>
  );
}
