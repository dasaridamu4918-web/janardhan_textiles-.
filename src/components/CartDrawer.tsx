import { Link, useNavigate } from "@tanstack/react-router";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useCart, useProducts, productImage, rupees, useAuth } from "@/lib/store";

export function CartDrawer() {
  const { lines, open, setOpen, setQty, remove } = useCart();
  const { data: products = [] } = useProducts();
  const { user } = useAuth();
  const navigate = useNavigate();
  const rows = lines.map((l) => ({ ...l, p: products.find((p) => p.id === l.product_id) })).filter((r) => r.p);
  const total = rows.reduce((a, r) => a + r.p!.price_paise * r.quantity, 0);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetContent className="flex w-full flex-col sm:max-w-md">
        <SheetHeader><SheetTitle className="font-display text-2xl">Your bag</SheetTitle></SheetHeader>
        <div className="flex-1 space-y-4 overflow-y-auto py-4">
          {rows.length === 0 && <p className="text-sm text-muted-foreground">Your bag is empty.</p>}
          {rows.map(({ p, quantity }) => (
            <div key={p!.id} className="flex gap-3 border-b pb-4">
              <img src={productImage(p!)} alt="" className="h-24 w-18 bg-muted object-cover" />
              <div className="flex-1">
                <p className="font-display text-base leading-tight">{p!.color} · {p!.style}</p>
                <p className="text-xs text-muted-foreground">{p!.fabric}</p>
                <p className="mt-1 text-sm text-primary">{rupees(p!.price_paise)}</p>
                <div className="mt-2 flex items-center gap-2 text-sm">
                  <button aria-label="Decrease" className="h-7 w-7 border" onClick={() => setQty(p!.id, quantity - 1)}>−</button>
                  <span className="w-6 text-center">{quantity}</span>
                  <button aria-label="Increase" className="h-7 w-7 border disabled:opacity-40" disabled={quantity >= Math.min(10, p!.stock)} onClick={() => setQty(p!.id, quantity + 1)}>+</button>
                  <button className="ml-auto text-xs text-muted-foreground underline" onClick={() => remove(p!.id)}>Remove</button>
                </div>
                {p!.stock < quantity && <p className="mt-1 text-xs text-destructive">Only {p!.stock} left</p>}
              </div>
            </div>
          ))}
        </div>
        {rows.length > 0 && (
          <div className="border-t pt-4">
            <div className="flex justify-between text-lg"><span>Total</span><span className="text-primary">{rupees(total)}</span></div>
            <p className="mt-1 text-xs text-muted-foreground">Final total is confirmed at checkout.</p>
            <button
              className="mt-4 w-full bg-primary py-3 text-sm uppercase tracking-widest text-primary-foreground"
              disabled={!!user} onClick={() => { setOpen(false); navigate({ to: "/auth", search: { redirect: undefined } }); }}
            >{user ? "Checkout coming soon" : "Sign in to checkout"}</button>
            <Link to="/" hash="catalog" onClick={() => setOpen(false)} className="mt-3 block text-center text-xs underline">Continue shopping</Link>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
