import { createFileRoute, Link } from "@tanstack/react-router";
import { Heart, Share2 } from "lucide-react";
import { toast } from "sonner";
import { SiteHeader } from "@/components/SiteHeader";
import { SareeCard } from "@/components/SareeCard";
import { useProducts, useCart, useWishlist, productImage, productHex, rupees, stockLabel } from "@/lib/store";

export const Route = createFileRoute("/saree/$id")({
  head: () => ({ meta: [
    { title: "Saree details — Janardhan Textile" }, { name: "description", content: "Fabric, weave, price and availability for this Janardhan Textile saree." },
    { property: "og:title", content: "Saree — Janardhan Textile" }, { property: "og:description", content: "Silk and handloom sarees from Janardhan Textile." },
    { property: "og:type", content: "product" }, { name: "twitter:card", content: "summary_large_image" },
  ] }),
  component: SareePage,
});

function SareePage() {
  const { id } = Route.useParams();
  const { data: products = [], isLoading } = useProducts();
  const { add, lines } = useCart();
  const { ids, toggle, signedIn } = useWishlist();
  const p = products.find((x) => x.id === Number(id) && x.status === "published");
  if (isLoading) return <div className="min-h-screen"><SiteHeader /><p className="p-10 text-muted-foreground">Loading…</p></div>;
  if (!p) return <div className="min-h-screen"><SiteHeader /><p className="p-10">This saree isn't available. <Link to="/" className="underline">Back to shop</Link></p></div>;
  const inBag = lines.find((l) => l.product_id === p.id)?.quantity ?? 0;
  const related = products.filter((x) => x.id !== p.id && x.status === "published" && (x.fabric === p.fabric || x.occasion === p.occasion)).slice(0, 4);
  const img = productImage(p);
  const share = async () => {
    const url = window.location.href;
    if (navigator.share) await navigator.share({ title: p.title, url }).catch(() => {});
    else { await navigator.clipboard.writeText(url); toast.success("Link copied"); }
  };
  const wish = async () => { if (!(await toggle(p.id))) toast("Sign in to save sarees to your wishlist"); };

  return (
    <div className="min-h-screen"><SiteHeader />
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
        <nav className="text-xs uppercase tracking-widest text-muted-foreground"><Link to="/" hash="catalog" className="hover:text-primary">Shop</Link> / {p.fabric}</nav>
        <div className="mt-6 grid gap-8 md:grid-cols-2 md:gap-12">
          <div className="aspect-[3/4] overflow-hidden bg-muted" style={img ? undefined : { background: productHex(p) }}>
            {img && <img src={img} alt={p.title} className="h-full w-full object-cover object-top animate-in fade-in duration-500" />}
          </div>
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-[0.3em] text-primary">{p.fabric}</p>
            <h1 className="mt-2 text-3xl font-semibold leading-tight sm:text-4xl">{p.title}</h1>
            <p className="mt-1 text-xs text-muted-foreground">SKU JT-{String(p.id).padStart(4, "0")}</p>
            <p className="mt-4 text-3xl text-primary">{rupees(p.price_paise)}</p>
            <p className="text-xs text-muted-foreground">Inclusive of all charges except GST & shipping, shown at checkout</p>
            <p className={`mt-4 text-sm uppercase tracking-widest ${p.stock <= 3 ? "text-destructive" : ""}`}>{stockLabel(p.stock)}</p>
            <div className="mt-6 flex gap-3">
              <button disabled={p.stock === 0 || inBag >= Math.min(10, p.stock)} onClick={() => add(p.id)}
                className="min-h-11 flex-1 bg-primary py-3 text-sm uppercase tracking-widest text-primary-foreground disabled:opacity-40">
                {inBag >= p.stock && p.stock > 0 ? "All available in bag" : "Add to bag"}</button>
              <button onClick={wish} aria-label={ids.includes(p.id) ? "Remove from wishlist" : "Add to wishlist"} className="inline-flex min-h-11 min-w-11 items-center justify-center border">
                <Heart className={`h-5 w-5 ${ids.includes(p.id) ? "fill-primary text-primary" : ""}`} /></button>
              <button onClick={share} aria-label="Share" className="inline-flex min-h-11 min-w-11 items-center justify-center border"><Share2 className="h-5 w-5" /></button>
            </div>
            {!signedIn && <p className="mt-2 text-xs text-muted-foreground">Sign in to save to your wishlist.</p>}
            <dl className="mt-8 grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 border-t pt-6 text-sm">
              <dt className="text-muted-foreground">Colour</dt><dd>{p.color}</dd>
              <dt className="text-muted-foreground">Weave / design</dt><dd>{p.pattern}</dd>
              <dt className="text-muted-foreground">Occasion</dt><dd>{p.occasion}</dd>
            </dl>
            <p className="mt-6 text-sm leading-relaxed text-muted-foreground">{p.description}</p>
            <details className="mt-6 border-t pt-4 text-sm"><summary className="cursor-pointer font-medium">Care</summary>
              <p className="mt-2 text-muted-foreground">Dry clean recommended for silks. Store folded in a muslin cloth, away from direct sunlight.</p></details>
            <details className="mt-3 border-t pt-4 text-sm"><summary className="cursor-pointer font-medium">Shipping & returns</summary>
              <p className="mt-2 text-muted-foreground">Shipping charges and Cash on Delivery availability are shown at checkout. You can request cancellation from My Orders before your order is packed.</p></details>
          </div>
        </div>
        {related.length > 0 && <section className="mt-16">
          <h2 className="text-3xl font-semibold">You may also like</h2>
          <div className="mt-6 grid grid-cols-2 gap-x-3 gap-y-8 sm:gap-x-6 md:grid-cols-4">
            {related.map((r) => <Link key={r.id} to="/saree/$id" params={{ id: String(r.id) }}><SareeCard p={r} onOpen={() => {}} /></Link>)}
          </div>
        </section>}
      </main>
    </div>
  );
}
