import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import hero from "@/assets/hero.jpg";
import reel from "@/assets/reel.mp4.asset.json";
import { SiteHeader } from "@/components/SiteHeader";
import { SareeCard } from "@/components/SareeCard";
import { SAREES, FABRICS, OCCASIONS, DEFAULT_BRAND, listingText, inr, type Saree } from "@/lib/sarees";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: `${DEFAULT_BRAND} — Silk & Handloom Sarees` },
      { name: "description", content: "Shop 100 handpicked Kanjivaram, Banarasi, Tussar and cotton sarees for weddings, office and festive wear." },
      { property: "og:title", content: `${DEFAULT_BRAND} — Silk & Handloom Sarees` },
      { property: "og:description", content: "Kanjivaram, Banarasi, Tussar and handloom cotton sarees for every occasion." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Index() {
  const [fabric, setFabric] = useState("All");
  const [occasion, setOccasion] = useState("All");
  const [open, setOpen] = useState<Saree | null>(null);
  const list = useMemo(
    () => SAREES.filter((s) => (fabric === "All" || s.fabric === fabric) && (occasion === "All" || s.occasion === occasion)),
    [fabric, occasion],
  );

  return (
    <div className="min-h-screen">
      <SiteHeader />

      <section className="relative">
        <img src={hero} alt="Model in magenta Kanjivaram silk saree" width={1600} height={1008} className="h-[78vh] w-full object-cover object-right" />
        <div className="absolute inset-0 flex items-center">
          <div className="mx-auto w-full max-w-7xl px-6">
            <div className="max-w-md">
              <p className="text-xs uppercase tracking-[0.3em] text-primary">The Festive Edit</p>
              <h1 className="mt-3 text-6xl leading-none font-semibold">Woven in tradition, draped in grace.</h1>
              <p className="mt-4 text-muted-foreground">Kanjivaram, Banarasi, Tussar and handloom cottons — 100 sarees for every occasion.</p>
              <a href="#catalog" className="mt-8 inline-block bg-primary px-8 py-3 text-sm uppercase tracking-widest text-primary-foreground hover:opacity-90">
                Shop the collection
              </a>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl items-center gap-10 px-6 py-20 md:grid-cols-2">
        <video src={reel.url} autoPlay muted loop playsInline className="mx-auto aspect-[9/16] w-full max-w-xs bg-muted object-cover" />
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-primary">One turn, a new drape</p>
          <h2 className="mt-3 text-5xl font-semibold">See the sarees in motion</h2>
          <p className="mt-4 text-muted-foreground">From the magenta Kanjivaram to the cobalt linen — watch how each weave falls and flows before you choose yours.</p>
          <div className="zari-rule mt-8 w-32" />
        </div>
      </section>

      <section id="catalog" className="mx-auto max-w-7xl px-6 pb-24">
        <div className="flex flex-wrap items-end justify-between gap-4 border-b pb-4">
          <h2 className="text-4xl font-semibold">The Collection <span className="text-lg text-muted-foreground">({list.length})</span></h2>
          <div className="flex gap-3 text-sm">
            <select value={fabric} onChange={(e) => setFabric(e.target.value)} className="border bg-card px-3 py-2">
              <option>All</option>{FABRICS.map((f) => <option key={f}>{f}</option>)}
            </select>
            <select value={occasion} onChange={(e) => setOccasion(e.target.value)} className="border bg-card px-3 py-2">
              <option>All</option>{OCCASIONS.map((f) => <option key={f}>{f}</option>)}
            </select>
          </div>
        </div>
        <div className="mt-8 grid grid-cols-2 gap-x-6 gap-y-10 md:grid-cols-3 lg:grid-cols-4">
          {list.map((s) => <SareeCard key={s.id} s={s} onOpen={() => setOpen(s)} />)}
        </div>
      </section>

      <footer className="border-t bg-card py-10 text-center text-sm text-muted-foreground">
        <div className="zari-rule mb-8" />© {new Date().getFullYear()} {DEFAULT_BRAND}
      </footer>

      <Dialog open={!!open} onOpenChange={(o) => !o && setOpen(null)}>
        <DialogContent className="max-w-3xl">
          {open && (
            <div className="grid gap-6 md:grid-cols-2">
              <div className="aspect-[3/4] bg-muted" style={open.photo ? undefined : { background: open.hex }}>
                {open.photo && <img src={open.photo} alt={open.title} className="h-full w-full object-cover" />}
              </div>
              <div>
                <DialogTitle className="font-display text-2xl">{open.title}</DialogTitle>
                <p className="mt-2 text-2xl text-primary">{inr(open.price)}</p>
                <p className="mt-4 whitespace-pre-line text-sm text-muted-foreground">{listingText(open).split("\n\n").slice(1, 3).join("\n\n")}</p>
                <button className="mt-6 w-full bg-primary py-3 text-sm uppercase tracking-widest text-primary-foreground">Add to bag</button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
