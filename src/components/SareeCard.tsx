import { type Product, productImage, productHex, rupees } from "@/lib/store";

export function SareeCard({ p, onOpen }: { p: Product; onOpen: () => void }) {
  const img = productImage(p);
  return (
    <button onClick={onOpen} className="group flex min-w-0 flex-col justify-start text-left">
      <div className="relative aspect-[3/4] overflow-hidden bg-muted" style={img ? undefined : { background: productHex(p) }}>
        {img && <img src={img} alt={p.title} loading="lazy" width={704} height={944}
          className="h-full w-full object-cover object-top transition-transform duration-500 group-hover:scale-105" />}
        <span className="absolute left-2 top-2 bg-card/90 max-w-[85%] truncate px-2 py-0.5 text-[10px] uppercase tracking-widest">{p.occasion}</span>
        {p.stock === 0 && <span className="absolute inset-x-0 bottom-0 bg-card/90 py-1 text-center text-xs uppercase tracking-widest">Sold out</span>}
      </div>
      <p className="mt-3 text-xs uppercase tracking-wider text-muted-foreground">{p.fabric}</p>
      <h3 className="font-display text-base leading-tight break-words sm:text-lg">{p.color} · {p.style}</h3>
      <p className="text-sm text-muted-foreground">{p.pattern}</p>
      <p className="mt-1 font-medium text-primary">{rupees(p.price_paise)}</p>
    </button>
  );
}
