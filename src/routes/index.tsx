import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import hero from "@/assets/hero.jpg";
import reel from "@/assets/reel.mp4.asset.json";
import { SiteHeader } from "@/components/SiteHeader";
import { SareeCard } from "@/components/SareeCard";
import { DEFAULT_BRAND } from "@/lib/sarees";
import { useProducts, useCart, productImage, productHex, rupees, type Product } from "@/lib/store";
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

const PRICE_BANDS = [
  { label: "Any price", min: 0, max: Infinity },
  { label: "Under ₹1,500", min: 0, max: 150000 },
  { label: "₹1,500 – ₹3,000", min: 150000, max: 300000 },
  { label: "₹3,000 – ₹6,000", min: 300000, max: 600000 },
  { label: "Above ₹6,000", min: 600000, max: Infinity },
];

function Index() {
  const { data: products = [], isLoading, error } = useProducts();
  const { add } = useCart();
  const [q, setQ] = useState("");
  const [fabric, setFabric] = useState("All");
  const [color, setColor] = useState("All");
  const [occasion, setOccasion] = useState("All");
  const [band, setBand] = useState(0);
  const [open, setOpen] = useState<Product | null>(null);
  const published = products.filter((p) => p.status === "published");
  const uniq = (k: keyof Product) => [...new Set(published.map((p) => String(p[k])))].sort();
  const list = useMemo(() => {
    const term = q.trim().toLowerCase();
    const b = PRICE_BANDS[band]!;
    return published.filter((p) =>
      (!term || `${p.title} ${p.pattern}`.toLowerCase().includes(term)) &&
      (fabric === "All" || p.fabric === fabric) && (color === "All" || p.color === color) &&
      (occasion === "All" || p.occasion === occasion) && p.price_paise >= b.min && p.price_paise < b.max);
  }, [published, q, fabric, color, occasion, band]);

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <section className="relative">
        <img src={hero} alt="Model in magenta Kanjivaram silk saree" width={1600} height={1008} className="h-[78vh] w-full object-cover object-right" />
        <div className="absolute inset-0 flex items-center">
          <div className="mx-auto w-full max-w-7xl px-6">
            <div className="max-w-md">
              <p className="text-xs uppercase tracking-[0.3em] text-primary">The Festive Edit</p>
              <h1 className="mt-3 text-6xl font-semibold leading-none">Woven in tradition, draped in grace.</h1>
              <p className="mt-4 text-muted-foreground">Kanjivaram, Banarasi, Tussar and handloom cottons — 100 sarees for every occasion.</p>
              <a href="#catalog" className="mt-8 inline-block bg-primary px-8 py-3 text-sm uppercase tracking-widest text-primary-foreground hover:opacity-90">Shop the collection</a>
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
          <div className="flex flex-wrap gap-2 text-sm">
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search sarees…" aria-label="Search" className="border bg-card px-3 py-2" />
            <select aria-label="Fabric" value={fabric} onChange={(e) => setFabric(e.target.value)} className="border bg-card px-3 py-2"><option>All</option>{uniq("fabric").map((f) => <option key={f}>{f}</option>)}</select>
            <select aria-label="Colour" value={color} onChange={(e) => setColor(e.target.value)} className="border bg-card px-3 py-2"><option>All</option>{uniq("color").map((f) => <option key={f}>{f}</option>)}</select>
            <select aria-label="Occasion" value={occasion} onChange={(e) => setOccasion(e.target.value)} className="border bg-card px-3 py-2"><option>All</option>{uniq("occasion").map((f) => <option key={f}>{f}</option>)}</select>
            <select aria-label="Price" value={band} onChange={(e) => setBand(+e.target.value)} className="border bg-card px-3 py-2">{PRICE_BANDS.map((b, i) => <option key={b.label} value={i}>{b.label}</option>)}</select>
          </div>
        </div>
        {isLoading && <p className="mt-8 text-muted-foreground">Loading sarees…</p>}
        {error && <p className="mt-8 text-destructive">Couldn't load sarees. Please refresh.</p>}
        <div className="mt-8 grid grid-cols-2 gap-x-6 gap-y-10 md:grid-cols-3 lg:grid-cols-4">
          {list.map((p) => <SareeCard key={p.id} p={p} onOpen={() => setOpen(p)} />)}
        </div>
      </section>

      <footer className="border-t bg-card py-10 text-center text-sm text-muted-foreground">
        <div className="zari-rule mb-8" />© {new Date().getFullYear()} {DEFAULT_BRAND}
      </footer>

      <Dialog open={!!open} onOpenChange={(o) => !o && setOpen(null)}>
        <DialogContent className="max-w-3xl">
          {open && (
            <div className="grid gap-6 md:grid-cols-2">
              <div className="aspect-[3/4] bg-muted" style={productImage(open) ? undefined : { background: productHex(open) }}>
                {productImage(open) && <img src={productImage(open)} alt={open.title} className="h-full w-full object-cover" />}
              </div>
              <div>
                <DialogTitle className="font-display text-2xl">{open.title}</DialogTitle>
                <p className="mt-2 text-2xl text-primary">{rupees(open.price_paise)}</p>
                <p className="mt-4 text-sm text-muted-foreground">{open.description}</p>
                <p className="mt-3 text-xs uppercase tracking-widest">{open.stock > 0 ? `${open.stock} in stock` : "Sold out"}</p>
                <button disabled={open.stock === 0} onClick={() => { add(open.id); setOpen(null); }}
                  className="mt-6 w-full bg-primary py-3 text-sm uppercase tracking-widest text-primary-foreground disabled:opacity-40">Add to bag</button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
