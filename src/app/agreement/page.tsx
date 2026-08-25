import type { Metadata } from "next";
import Link from "next/link";
import { LEGAL_NAME, TERMS_BODY, TERMS_TITLE } from "@/lib/legal";

export const metadata: Metadata = {
  title: `${TERMS_TITLE} — Shinno Lights`,
  description: `User agreement for Shinno Lights by ${LEGAL_NAME}.`,
};

export default function AgreementPage() {
  return (
    <main className="mx-auto min-h-dvh w-full max-w-lg px-5 py-10">
      <p className="text-xs tracking-[0.2em] text-white/40 uppercase">Shinno Lights</p>
      <h1 className="mt-2 text-2xl font-semibold">{TERMS_TITLE}</h1>
      <p className="mt-1 text-sm text-white/45">{LEGAL_NAME}</p>
      <article className="mt-6 whitespace-pre-line text-sm leading-relaxed text-white/80">{TERMS_BODY}</article>
      <p className="mt-8 text-sm">
        <Link className="text-white/70 underline" href="/privacy">
          Privacy policy
        </Link>
        {" · "}
        <Link className="text-white/70 underline" href="/">
          Back to Shinno Lights
        </Link>
      </p>
    </main>
  );
}
