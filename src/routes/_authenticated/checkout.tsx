import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { SiteHeader } from "@/components/SiteHeader";
import { useAuth, useCart, useProducts, useSettings, estimateTotals, productImage, rupees } from "@/lib/store";

export const Route = createFileRoute("/_authenticated/checkout")({
  head: () => ({ meta: [
    { title: "Checkout — Janardhan Textile" }, { name: "description", content: "Review your bag and place your saree order." },
    { property: "og:title", content: "Checkout — Janardhan Textile" }, { property: "og:description", content: "Place your Janardhan Textile order." },
  ] }),
  component: Checkout,
});

const field = "mt-1 min-h-11 w-full border bg-card px-3 py-2";

function Checkout() {
  const { user } = useAuth();
  const { lines, reload } = useCart();
  const { data: products = [] } = useProducts();
  const { data: settings } = useSettings();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [key] = useState(() => crypto.randomUUID());
  const [busy, setBusy] = useState(false);
  const [method, setMethod] = useState<"demo" | "cod">("demo");
  const [f, setF] = useState({ name: "", email: "", phone: "", address: "", pincode: "" });

  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("full_name, phone, address").eq("id", user.id).maybeSingle().then(({ data }) =>
      setF((o) => ({ ...o, email: o.email || user.email || "", name: o.name || data?.full_name || "", phone: o.phone || data?.phone || "", address: o.address || data?.address || "" })));
  }, [user?.id]);

  const rows = lines.map((l) => ({ ...l, p: products.find((p) => p.id === l.product_id) })).filter((r) => r.p);
  const subtotal = rows.reduce((a, r) => a + r.p!.price_paise * r.quantity, 0);
  const t = estimateTotals(subtotal, settings, method);
  const codBlocked = !!settings && (!settings.cod_enabled || subtotal > settings.cod_max_paise);
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setF({ ...f, [k]: e.target.value });

  const place = async (e: React.FormEvent) => {
    e.preventDefault(); setBusy(true);
    const { data, error } = await supabase.rpc("place_order", {
      p_name: f.name, p_email: f.email, p_phone: f.phone, p_address: f.address, p_pincode: f.pincode, p_payment_method: method, p_idempotency_key: key,
    });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    await reload(); qc.invalidateQueries({ queryKey: ["products"] }); qc.invalidateQueries({ queryKey: ["orders"] });
    toast.success(`Order ${data?.[0]?.order_number ?? ""} placed`);
    navigate({ to: "/orders" });
  };

  return (
    <div className="min-h-screen"><SiteHeader />
      <main className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
        <h1 className="text-4xl font-semibold">Checkout</h1>
        {rows.length === 0 ? (
          <p className="mt-6 text-muted-foreground">Your bag is empty. <Link to="/" hash="catalog" className="underline">Browse sarees</Link></p>
        ) : (
          <form onSubmit={place} className="mt-8 grid gap-10 md:grid-cols-[1fr_360px]">
            <section className="min-w-0 space-y-4">
              <h2 className="text-2xl">Delivery details</h2>
              <label className="block text-sm">Full name<input required value={f.name} onChange={set("name")} className={field} /></label>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block text-sm">Email<input required type="email" value={f.email} onChange={set("email")} className={field} /></label>
                <label className="block text-sm">Phone<input required inputMode="tel" value={f.phone} onChange={set("phone")} className={field} /></label>
              </div>
              <label className="block text-sm">Address<textarea required rows={3} value={f.address} onChange={set("address")} className={field} /></label>
              <label className="block text-sm">PIN code<input required inputMode="numeric" maxLength={6} value={f.pincode} onChange={set("pincode")} className={field} /></label>

              <h2 className="pt-4 text-2xl">Payment</h2>
              <label className="flex min-h-11 items-center gap-3 border bg-card p-3 text-sm">
                <input type="radio" name="pay" checked={method === "demo"} onChange={() => setMethod("demo")} />
                <span>Demo payment <span className="text-muted-foreground">— no money is taken, no card details asked</span></span>
              </label>
              <label className={`flex min-h-11 items-center gap-3 border bg-card p-3 text-sm ${codBlocked ? "opacity-50" : ""}`}>
                <input type="radio" name="pay" disabled={codBlocked} checked={method === "cod"} onChange={() => setMethod("cod")} />
                <span>Cash on Delivery {settings && <span className="text-muted-foreground">— {codBlocked ? "not available for this order" : `+${rupees(settings.cod_fee_paise)} fee`}</span>}</span>
              </label>
            </section>

            <aside className="h-fit border bg-card p-5">
              <h2 className="text-2xl">Your order</h2>
              <ul className="mt-4 space-y-3">
                {rows.map(({ p, quantity }) => (
                  <li key={p!.id} className="flex gap-3 text-sm">
                    <img src={productImage(p!)} alt="" className="h-16 w-12 shrink-0 object-cover object-top" />
                    <div className="min-w-0 flex-1"><p className="truncate">{p!.color} · {p!.style}</p><p className="text-muted-foreground">Qty {quantity}</p></div>
                    <span>{rupees(p!.price_paise * quantity)}</span>
                  </li>
                ))}
              </ul>
              <dl className="mt-4 space-y-1 border-t pt-4 text-sm">
                <div className="flex justify-between"><dt>Subtotal</dt><dd>{rupees(t.subtotal)}</dd></div>
                <div className="flex justify-between"><dt>Shipping</dt><dd>{t.shipping ? rupees(t.shipping) : "Free"}</dd></div>
                <div className="flex justify-between"><dt>GST ({settings?.tax_percent ?? 0}%)</dt><dd>{rupees(t.tax)}</dd></div>
                {t.cod > 0 && <div className="flex justify-between"><dt>COD fee</dt><dd>{rupees(t.cod)}</dd></div>}
                <div className="flex justify-between pt-2 text-lg"><dt>Total</dt><dd className="text-primary">{rupees(t.total)}</dd></div>
              </dl>
              {settings && t.shipping > 0 && <p className="mt-2 text-xs text-muted-foreground">Free shipping above {rupees(settings.free_shipping_min_paise)}</p>}
              <button disabled={busy} className="mt-5 min-h-11 w-full bg-primary py-3 text-sm uppercase tracking-widest text-primary-foreground disabled:opacity-50">
                {busy ? "Placing order…" : "Place order"}
              </button>
              <p className="mt-2 text-xs text-muted-foreground">Prices, stock and totals are re-checked when you place the order.</p>
            </aside>
          </form>
        )}
      </main>
    </div>
  );
}
