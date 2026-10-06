import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { SiteHeader } from "@/components/SiteHeader";
import { SAREES, DEFAULT_BRAND, listingText, imagePrompt, flatLayPrompt, videoPrompt } from "@/lib/sarees";

export const Route = createFileRoute("/studio")({
  head: () => ({
    meta: [
      { title: "Saree Content Studio — Prompts & Listings" },
      { name: "description", content: "Generate video reel prompts, product photo prompts and listing text for any saree brand." },
      { property: "og:title", content: "Saree Content Studio" },
      { property: "og:description", content: "Ready-made reel, photo and listing copy for 100 saree designs." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Studio,
});

function Block({ label, text }: { label: string; text: string }) {
  const [done, setDone] = useState(false);
  return (
    <div className="border bg-card p-5">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="font-display text-xl">{label}</h3>
        <button
          onClick={() => { navigator.clipboard.writeText(text); setDone(true); setTimeout(() => setDone(false), 1500); }}
          className="border border-primary px-3 py-1 text-xs uppercase tracking-widest text-primary hover:bg-primary hover:text-primary-foreground"
        >{done ? "Copied" : "Copy"}</button>
      </div>
      <pre className="whitespace-pre-wrap text-sm text-muted-foreground font-sans">{text}</pre>
    </div>
  );
}

function Studio() {
  const [brand, setBrand] = useState(DEFAULT_BRAND);
  const [a, setA] = useState(1);
  const [b, setB] = useState(2);
  const sa = SAREES[a - 1], sb = SAREES[b - 1];
  const pick = (v: number, set: (n: number) => void) => (
    <select value={v} onChange={(e) => set(+e.target.value)} className="w-full border bg-card px-3 py-2">
      {SAREES.map((s) => <option key={s.id} value={s.id}>#{s.id} {s.color} · {s.style} · {s.fabric}</option>)}
    </select>
  );
  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto max-w-5xl px-6 py-14">
        <p className="text-xs uppercase tracking-[0.3em] text-primary">For your MSME clients</p>
        <h1 className="mt-2 text-5xl font-semibold">Content Studio</h1>
        <p className="mt-3 text-muted-foreground">Pick a brand and two sarees — get the reel prompt, photo prompts and listing text ready to copy.</p>

        <div className="mt-10 grid gap-4 md:grid-cols-3">
          <label className="text-sm">Brand name
            <input value={brand} onChange={(e) => setBrand(e.target.value)} className="mt-1 w-full border bg-card px-3 py-2" />
          </label>
          <label className="text-sm">Saree (start){pick(a, setA)}</label>
          <label className="text-sm">Transitions to{pick(b, setB)}</label>
        </div>

        <div className="mt-10 grid gap-6">
          <Block label="Reel transition prompt (Sora / Runway)" text={videoPrompt(sa, sb, brand)} />
          <Block label="Product photo prompt" text={imagePrompt(sa)} />
          <Block label="Flat-lay prompt" text={flatLayPrompt(sa)} />
          <Block label="Listing text" text={`${brand} — ${listingText(sa)}`} />
        </div>
      </main>
    </div>
  );
}
