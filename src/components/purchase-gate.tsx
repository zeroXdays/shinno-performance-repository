"use client";

import { useState, useSyncExternalStore, type FormEvent, type ReactNode } from "react";
import Image from "next/image";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  clearLicense,
  getLicense,
  getServerLicense,
  saveLicense,
  subscribeLicense,
  verifyPurchase,
} from "@/lib/license";
import { useI18n } from "@/lib/i18n";
import { SUPPORT_EMAIL } from "@/lib/legal";

function useLicenseReady() {
  return useSyncExternalStore(subscribeLicense, () => getLicense(), getServerLicense);
}

/** Flip to true to require Shopify order unlock again. */
const PURCHASE_GATE_ENABLED = false;

export function PurchaseGate({ children }: { children: ReactNode }) {
  const license = useLicenseReady();
  // TEMP: lock screen commented out for upload/testing — re-enable with PURCHASE_GATE_ENABLED.
  if (!PURCHASE_GATE_ENABLED) return <>{children}</>;
  if (license?.unlocked) return <>{children}</>;
  return <UnlockScreen />;
}

function UnlockScreen() {
  const { t } = useI18n();
  const [orderNumber, setOrderNumber] = useState("");
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const result = await verifyPurchase(orderNumber, email);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      saveLicense(result.orderName, result.email);
    } catch {
      setError(t("license.network"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-dvh flex-col text-foreground">
      <div className="mx-auto flex w-full max-w-lg flex-1 flex-col justify-center px-5 py-10">
        <div className="mb-8 flex flex-col items-center gap-3 text-center">
          <Image
            src="/shinno-logo-header.png"
            alt="Shinno Sync"
            width={507}
            height={96}
            className="h-9 w-auto"
            priority
          />
          <h1 className="text-xl font-semibold tracking-wide text-white">{t("license.title")}</h1>
          <p className="max-w-sm text-sm leading-relaxed text-white/65">{t("license.body")}</p>
        </div>

        <form
          onSubmit={(event) => void onSubmit(event)}
          className="space-y-3 rounded-[1.35rem] border border-white/[0.08] bg-[#121212] p-4 shadow-[0_12px_40px_rgba(0,0,0,0.4)]"
        >
          <label className="block space-y-1.5">
            <span className="text-xs tracking-wide text-white/50 uppercase">{t("license.order")}</span>
            <Input
              value={orderNumber}
              onChange={(event) => setOrderNumber(event.target.value)}
              placeholder="1001"
              inputMode="numeric"
              autoComplete="off"
              required
              className="bg-[#0a0a0a]"
            />
          </label>
          <label className="block space-y-1.5">
            <span className="text-xs tracking-wide text-white/50 uppercase">{t("license.email")}</span>
            <Input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@email.com"
              autoComplete="email"
              required
              className="bg-[#0a0a0a]"
            />
          </label>
          {error ? <p className="text-sm text-red-300">{error}</p> : null}
          <Button
            type="submit"
            disabled={busy}
            className="min-h-12 w-full rounded-xl bg-[#c41220] text-white shadow-[0_8px_24px_rgba(196,18,32,0.35)] hover:bg-[#d01a28]"
          >
            {busy ? <Loader2 className="animate-spin" /> : null}
            {t("license.unlock")}
          </Button>
          <p className="text-center text-xs text-white/40">
            {t("license.help", { email: SUPPORT_EMAIL })}
          </p>
        </form>
      </div>
    </div>
  );
}

/** Settings row — unlink this phone from a verified order. */
export function LicenseSettingsRow() {
  const license = useLicenseReady();
  const { t } = useI18n();
  if (!license?.unlocked) return null;
  return (
    <div className="space-y-2 rounded-xl border border-white/[0.08] bg-[#0a0a0a] p-3">
      <p className="text-sm text-white/80">{t("license.unlockedAs", { order: license.orderName })}</p>
      <p className="text-xs text-white/45">{license.email}</p>
      <Button type="button" variant="outline" size="sm" onClick={() => clearLicense()}>
        {t("license.unlink")}
      </Button>
    </div>
  );
}
