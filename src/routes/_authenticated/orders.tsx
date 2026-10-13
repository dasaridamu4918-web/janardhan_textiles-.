import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { SiteHeader } from "@/components/SiteHeader";
import { useAuth, rupees, STATUS_LABEL } from "@/lib/store";

export const Route = createFileRoute("/_authenticated/orders")({
  head: () => ({ meta: [
    { title: "My Orders — Janardhan Textile" }, { name: "description", content: "Track your Janardhan Textile saree orders." },
    { property: "og:title", content: "My Orders — Janardhan Textile" }, { property: "og:description", content: "Your order history and delivery status." },
  ] }),
  component: Orders,
});

export const ORDER_SELECT = "*, order_items(*), order_status_history(*)";

function Orders() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const { data: orders = [], isLoading } = useQuery({
    queryKey: ["orders", user?.id], enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase.from("orders").select(ORDER_SELECT).eq("user_id", user!.id).order("created_at", { ascending: false });
      if (error) throw error; return data;
    },
  });
  const cancel = async (id: string) => {
    const { error } = await supabase.rpc("request_cancel", { p_order_id: id });
    if (error) toast.error(error.message); else { toast.success("Cancellation requested"); qc.invalidateQueries({ queryKey: ["orders"] }); }
  };

  return (
    <div className="min-h-screen"><SiteHeader />
      <main className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
        <h1 className="text-4xl font-semibold">My Orders</h1>
        {isLoading && <p className="mt-6 text-muted-foreground">Loading…</p>}
        {!isLoading && orders.length === 0 && <p className="mt-6 text-muted-foreground">No orders yet. <Link to="/" hash="catalog" className="underline">Start shopping</Link></p>}
        <div className="mt-8 space-y-6">
          {orders.map((o) => (
            <article key={o.id} className="border bg-card p-5" data-testid="order">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div><p className="font-display text-xl">{o.order_number}</p>
                  <p className="text-xs text-muted-foreground">{new Date(o.created_at).toLocaleString("en-IN")} · {o.payment_method === "cod" ? "Cash on Delivery" : "Demo payment"}</p></div>
                <span className="border border-primary px-3 py-1 text-xs uppercase tracking-widest text-primary" data-testid="status">{STATUS_LABEL[o.status]}</span>
              </div>
              <ul className="mt-4 space-y-1 text-sm">
                {o.order_items.map((i) => <li key={i.id} className="flex justify-between gap-3"><span className="min-w-0">{i.product_title} × {i.quantity}</span><span>{rupees(i.line_total_paise)}</span></li>)}
              </ul>
              <div className="mt-3 border-t pt-3 text-sm text-muted-foreground">
                Subtotal {rupees(o.subtotal_paise)} · Shipping {o.shipping_paise ? rupees(o.shipping_paise) : "Free"} · GST {rupees(o.tax_paise)}{o.cod_fee_paise ? ` · COD ${rupees(o.cod_fee_paise)}` : ""}
                <p className="mt-1 text-base text-foreground">Total <span className="text-primary">{rupees(o.total_paise)}</span></p>
              </div>
              {(o.courier || o.tracking_number) && <p className="mt-2 text-sm">Shipped via {o.courier ?? "courier"} {o.tracking_number && <>· Tracking <b>{o.tracking_number}</b></>}</p>}
              <details className="mt-3 text-sm"><summary className="cursor-pointer">Order history</summary>
                <ul className="mt-2 space-y-1">{[...o.order_status_history].sort((a, b) => a.created_at.localeCompare(b.created_at)).map((h) =>
                  <li key={h.id} className="text-muted-foreground">{new Date(h.created_at).toLocaleString("en-IN")} — {STATUS_LABEL[h.status]}{h.note ? `: ${h.note}` : ""}</li>)}</ul>
              </details>
              {o.cancel_requested ? <p className="mt-3 text-sm text-destructive">Cancellation requested — the store will confirm.</p>
                : ["pending", "confirmed"].includes(o.status) && <button onClick={() => cancel(o.id)} className="mt-3 min-h-11 border px-4 text-sm">Request cancellation</button>}
            </article>
          ))}
        </div>
      </main>
    </div>
  );
}
