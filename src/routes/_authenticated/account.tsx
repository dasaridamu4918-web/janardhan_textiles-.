import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { SiteHeader } from "@/components/SiteHeader";
import { SareeCard } from "@/components/SareeCard";
import { useAuth, useProducts, useWishlist } from "@/lib/store";

export const Route = createFileRoute("/_authenticated/account")({
  head: () => ({ meta: [
    { title: "My Account — Janardhan Textile" }, { name: "description", content: "Your saved address and wishlist." },
    { property: "og:title", content: "My Account — Janardhan Textile" }, { property: "og:description", content: "Manage your Janardhan Textile account." },
  ] }),
  component: Account,
});
const field = "mt-1 min-h-11 w-full border bg-card px-3 py-2";

function Account() {
  const { user } = useAuth();
  const { data: products = [] } = useProducts();
  const { ids } = useWishlist();
  const [f, setF] = useState({ full_name: "", phone: "", address: "" });
  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("full_name, phone, address").eq("id", user.id).maybeSingle().then(({ data }) => data && setF(data));
  }, [user?.id]);
  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = { full_name: f.full_name.trim().slice(0, 120), phone: f.phone.trim().slice(0, 20), address: f.address.trim().slice(0, 500) };
    const { error } = await supabase.from("profiles").update(clean).eq("id", user!.id);
    if (error) toast.error(error.message); else toast.success("Saved");
  };
  const wish = products.filter((p) => ids.includes(p.id));
  return (
    <div className="min-h-screen"><SiteHeader />
      <main className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
        <h1 className="text-4xl font-semibold">My Account</h1>
        <p className="mt-1 text-sm text-muted-foreground">{user?.email} · <Link to="/orders" className="underline">My orders</Link></p>
        <form onSubmit={save} className="mt-8 max-w-lg space-y-4">
          <h2 className="text-2xl">Saved delivery address</h2>
          <label className="block text-sm">Full name<input value={f.full_name} onChange={(e) => setF({ ...f, full_name: e.target.value })} className={field} /></label>
          <label className="block text-sm">Phone<input value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} className={field} /></label>
          <label className="block text-sm">Address<textarea rows={3} value={f.address} onChange={(e) => setF({ ...f, address: e.target.value })} className={field} /></label>
          <button className="min-h-11 bg-primary px-6 text-sm uppercase tracking-widest text-primary-foreground">Save</button>
        </form>
        <h2 id="wishlist" className="mt-14 text-2xl">Wishlist ({wish.length})</h2>
        {wish.length === 0 && <p className="mt-2 text-sm text-muted-foreground">Tap the heart on any saree to save it here.</p>}
        <div className="mt-6 grid grid-cols-2 gap-x-3 gap-y-8 sm:gap-x-6 md:grid-cols-4">
          {wish.map((p) => <Link key={p.id} to="/saree/$id" params={{ id: String(p.id) }}><SareeCard p={p} onOpen={() => {}} /></Link>)}
        </div>
      </main>
    </div>
  );
}
