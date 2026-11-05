/**
 * Purchase unlock — customers verify a paid Shopify order (order # + email).
 * Unlock is stored on-device only after the server confirms the order.
 */

const STORAGE_KEY = "shinno.license.v1";

export type LicenseRecord = {
  unlocked: true;
  orderName: string;
  email: string;
  unlockedAt: string;
};

type Listener = () => void;
const listeners = new Set<Listener>();

function readRaw(): LicenseRecord | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<LicenseRecord>;
    if (parsed.unlocked !== true) return null;
    if (typeof parsed.orderName !== "string" || typeof parsed.email !== "string") return null;
    return {
      unlocked: true,
      orderName: parsed.orderName,
      email: parsed.email,
      unlockedAt: typeof parsed.unlockedAt === "string" ? parsed.unlockedAt : new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

let cached = readRaw();

export function getLicense(): LicenseRecord | null {
  return cached;
}

export function getServerLicense(): LicenseRecord | null {
  return null;
}

export function isLicensed(): boolean {
  return cached?.unlocked === true;
}

export function subscribeLicense(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function emit() {
  for (const listener of listeners) listener();
}

export function saveLicense(orderName: string, email: string): LicenseRecord {
  const record: LicenseRecord = {
    unlocked: true,
    orderName,
    email,
    unlockedAt: new Date().toISOString(),
  };
  cached = record;
  if (typeof window !== "undefined") {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(record));
  }
  emit();
  return record;
}

export function clearLicense(): void {
  cached = null;
  if (typeof window !== "undefined") {
    window.localStorage.removeItem(STORAGE_KEY);
  }
  emit();
}

export type VerifyPurchaseResult =
  | { ok: true; orderName: string; email: string }
  | { ok: false; error: string };

export async function verifyPurchase(orderNumber: string, email: string): Promise<VerifyPurchaseResult> {
  const res = await fetch("/api/verify-purchase", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ orderNumber, email }),
  });
  const data = (await res.json().catch(() => null)) as
    | { ok?: boolean; error?: string; orderName?: string; email?: string }
    | null;
  if (!res.ok || !data?.ok) {
    return { ok: false, error: data?.error ?? "Could not verify that order." };
  }
  return {
    ok: true,
    orderName: data.orderName ?? orderNumber,
    email: data.email ?? email,
  };
}
