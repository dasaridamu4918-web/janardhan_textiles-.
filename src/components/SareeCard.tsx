import { type Saree, inr } from "@/lib/sarees";

export function SareeCard({ s, onOpen }: { s: Saree; onOpen: () => void }) {
  return (
    <button onClick={onOpen} className="group text-left">
      <div className="relative aspect-[3/4] overflow-hidden bg-muted">
        {s.photo ? (
          <img src={s.photo} alt={s.title} loading="lazy" width={768} height={1024}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
        ) : (
          <div className="flex h-full w-full flex-col justify-end transition-transform duration-500 group-hover:scale-105"
            style={{ background: `linear-gradient(160deg, ${s.hex} 0%, ${s.hex} 70%, var(--gold) 70%, var(--gold) 76%, ${s.hex} 76%)` }}>
            <span className="m-3 self-start rounded-sm bg-card/90 px-2 py-1 text-[10px] uppercase tracking-widest">
              Photo coming soon
            </span>
          </div>
        )}
        <span className="absolute left-2 top-2 bg-card/90 px-2 py-0.5 text-[10px] uppercase tracking-widest">
          {s.occasion}
        </span>
      </div>
      <p className="mt-3 text-xs uppercase tracking-wider text-muted-foreground">{s.fabric}</p>
      <h3 className="font-display text-lg leading-tight">{s.color} · {s.style}</h3>
      <p className="text-sm text-muted-foreground">{s.pattern}</p>
      <p className="mt-1 font-medium text-primary">{inr(s.price)}</p>
    </button>
  );
}
