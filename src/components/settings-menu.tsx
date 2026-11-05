"use client";

import { useState, useSyncExternalStore } from "react";
import { Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useI18n } from "@/lib/i18n";
import { PRODUCT_NAME } from "@/lib/legal";
import {
  APP_VERSION,
  SUPPORT_EMAIL,
  getServerSettings,
  getSettings,
  subscribeSettings,
  updateSettings,
  type LangId,
  type ThemeId,
} from "@/lib/settings";

type DocId = "howto" | "privacy" | "terms" | "updates" | "feedback" | null;

export function SettingsMenu() {
  const { t } = useI18n();
  const settings = useSyncExternalStore(subscribeSettings, getSettings, getServerSettings);
  const [open, setOpen] = useState(false);
  const [doc, setDoc] = useState<DocId>(null);
  const [feedback, setFeedback] = useState("");

  return (
    <>
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label={t("settings.title")}
        className="text-white/70 hover:text-white"
        onClick={() => setOpen(true)}
      >
        <Settings className="size-4" />
      </Button>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="right" className="w-[min(100%,22rem)] overflow-y-auto bg-popover/95 p-0 backdrop-blur-md">
          <SheetHeader className="border-b border-white/10">
            <SheetTitle>{t("settings.title")}</SheetTitle>
            <SheetDescription className="sr-only">{t("settings.title")}</SheetDescription>
          </SheetHeader>
          <div className="space-y-6 px-4 py-4">
            <section className="space-y-3">
              <h3 className="text-xs font-medium tracking-[0.16em] text-white/40 uppercase">
                {t("settings.bluetooth")}
              </h3>
              <Toggle
                label={t("settings.autoAdd")}
                hint={t("settings.autoAddHint")}
                checked={settings.autoAdd}
                onChange={(autoAdd) => updateSettings({ autoAdd })}
              />
              <Toggle
                label={t("settings.autoConnect")}
                hint={t("settings.autoConnectHint")}
                checked={settings.autoConnect}
                onChange={(autoConnect) => updateSettings({ autoConnect })}
              />
              <Toggle
                label={t("settings.remember")}
                hint={t("settings.rememberHint")}
                checked={settings.rememberConnect}
                onChange={(rememberConnect) => updateSettings({ rememberConnect })}
              />
            </section>

            <section className="space-y-3">
              <h3 className="text-xs font-medium tracking-[0.16em] text-white/40 uppercase">
                {t("settings.appearance")}
              </h3>
              <Label className="text-sm font-normal text-white/70">{t("settings.theme")}</Label>
              <div className="grid grid-cols-3 gap-1.5">
                {(["night", "graphite", "studio"] as ThemeId[]).map((theme) => (
                  <button
                    key={theme}
                    type="button"
                    onClick={() => updateSettings({ theme })}
                    className={`rounded-full border px-2 py-1.5 text-xs ${
                      settings.theme === theme
                        ? "border-white bg-white text-black"
                        : "border-white/10 text-white/70 hover:bg-white/5"
                    }`}
                  >
                    {t(`settings.theme.${theme}`)}
                  </button>
                ))}
              </div>
              <Label className="text-sm font-normal text-white/70">{t("settings.language")}</Label>
              <div className="grid grid-cols-3 gap-1.5">
                {(["system", "en", "es"] as LangId[]).map((language) => (
                  <button
                    key={language}
                    type="button"
                    onClick={() => updateSettings({ language })}
                    className={`rounded-full border px-2 py-1.5 text-xs ${
                      settings.language === language
                        ? "border-white bg-white text-black"
                        : "border-white/10 text-white/70 hover:bg-white/5"
                    }`}
                  >
                    {t(`settings.language.${language}`)}
                  </button>
                ))}
              </div>
            </section>

            <section className="space-y-2">
              <h3 className="text-xs font-medium tracking-[0.16em] text-white/40 uppercase">
                {t("settings.help")}
              </h3>
              <button type="button" className={linkClass} onClick={() => setDoc("howto")}>
                {t("settings.howTo")}
              </button>
              <button type="button" className={linkClass} onClick={() => setDoc("privacy")}>
                {t("settings.privacy")}
              </button>
              <button type="button" className={linkClass} onClick={() => setDoc("terms")}>
                {t("settings.terms")}
              </button>
              <button type="button" className={linkClass} onClick={() => setDoc("updates")}>
                {t("settings.updates")}
              </button>
              <button type="button" className={linkClass} onClick={() => setDoc("feedback")}>
                {t("settings.feedback")}
              </button>
              <p className="pt-2 text-xs text-white/35">
                {t("settings.version")} {APP_VERSION}
              </p>
            </section>
          </div>
        </SheetContent>
      </Sheet>

      <Dialog open={doc != null} onOpenChange={(open) => !open && setDoc(null)}>
        <DialogContent className="max-h-[80vh] overflow-y-auto sm:max-w-md">
          {doc === "howto" ? (
            <>
              <DialogHeader>
                <DialogTitle>{t("howto.title")}</DialogTitle>
                <DialogDescription className="whitespace-pre-line text-left">
                  {t("howto.body")}
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <DialogClose render={<Button variant="outline" />}>{t("common.close")}</DialogClose>
              </DialogFooter>
            </>
          ) : null}
          {doc === "privacy" ? (
            <>
              <DialogHeader>
                <DialogTitle>{t("privacy.title")}</DialogTitle>
                <DialogDescription className="whitespace-pre-line text-left">{t("privacy.body")}</DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <DialogClose render={<Button variant="outline" />}>{t("common.close")}</DialogClose>
              </DialogFooter>
            </>
          ) : null}
          {doc === "terms" ? (
            <>
              <DialogHeader>
                <DialogTitle>{t("terms.title")}</DialogTitle>
                <DialogDescription className="whitespace-pre-line text-left">{t("terms.body")}</DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <DialogClose render={<Button variant="outline" />}>{t("common.close")}</DialogClose>
              </DialogFooter>
            </>
          ) : null}
          {doc === "updates" ? (
            <>
              <DialogHeader>
                <DialogTitle>{t("updates.title")}</DialogTitle>
                <DialogDescription className="whitespace-pre-line text-left">
                  {t("updates.current")} {t("updates.body", { version: APP_VERSION })}
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <DialogClose render={<Button variant="outline" />}>{t("common.close")}</DialogClose>
              </DialogFooter>
            </>
          ) : null}
          {doc === "feedback" ? (
            <>
              <DialogHeader>
                <DialogTitle>{t("feedback.title")}</DialogTitle>
                <DialogDescription className="sr-only">{t("feedback.title")}</DialogDescription>
              </DialogHeader>
              <textarea
                value={feedback}
                onChange={(event) => setFeedback(event.target.value)}
                placeholder={t("feedback.placeholder")}
                className="min-h-28 w-full rounded-md border border-input bg-transparent p-2 text-sm"
              />
              <DialogFooter>
                <Button variant="outline" onClick={() => setDoc(null)}>
                  {t("feedback.cancel")}
                </Button>
                <Button
                  onClick={() => {
                    const body = encodeURIComponent(feedback.trim() || t("feedback.placeholder"));
                    window.open(
                      `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(`${PRODUCT_NAME} feedback`)}&body=${body}`,
                    );
                    setDoc(null);
                  }}
                >
                  {t("feedback.send")}
                </Button>
              </DialogFooter>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
}

function Toggle({
  label,
  hint,
  checked,
  onChange,
}: {
  label: string;
  hint: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div>
        <p className="text-sm">{label}</p>
        <p className="text-xs text-white/40">{hint}</p>
      </div>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}

const linkClass =
  "block w-full rounded-lg border border-white/10 px-3 py-2 text-left text-sm text-white/80 hover:bg-white/5";
