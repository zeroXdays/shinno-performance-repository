import type { Metadata } from "next";
import Link from "next/link";
import { LEGAL_NAME, PRIVACY_BODY, PRIVACY_TITLE, SITE_URL, SUPPORT_EMAIL } from "@/lib/legal";

export const metadata: Metadata = {
  title: `${PRIVACY_TITLE} — Shinno Lights`,
  description: `Privacy policy for Shinno Lights by ${LEGAL_NAME}. Local-only storage, Bluetooth control, no account.`,
};

export default function PrivacyPage() {
  return (
    <main className="mx-auto min-h-dvh w-full max-w-lg px-5 py-10">
      <p className="text-xs tracking-[0.2em] text-white/40 uppercase">Shinno Lights</p>
      <h1 className="mt-2 text-2xl font-semibold">{PRIVACY_TITLE}</h1>
      <p className="mt-1 text-sm text-white/45">{LEGAL_NAME}</p>
      <article className="mt-6 whitespace-pre-line text-sm leading-relaxed text-white/80">{PRIVACY_BODY}</article>
      <p className="mt-8 text-sm text-white/50">
        <a className="underline" href={`mailto:${SUPPORT_EMAIL}`}>
          {SUPPORT_EMAIL}
        </a>
        {" · "}
        <a className="underline" href={SITE_URL}>
          shinnoperformance.com
        </a>
      </p>
      <p className="mt-6 text-sm">
        <Link className="text-white/70 underline" href="/">
          Back to Shinno Lights
        </Link>
      </p>
    </main>
  );
}
