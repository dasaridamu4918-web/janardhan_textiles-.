import { Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { ShoppingBag } from "lucide-react";
import { DEFAULT_BRAND } from "@/lib/sarees";
import { useAuth, useCart } from "@/lib/store";
import { supabase } from "@/integrations/supabase/client";
import { CartDrawer } from "./CartDrawer";

export function SiteHeader() {
  const { user } = useAuth();
  const { count, setOpen } = useCart();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const signOut = async () => {
    await qc.cancelQueries(); qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/", replace: true });
  };
  return (
    <header className="border-b bg-card">
      <div className="bg-primary py-1.5 text-center text-xs uppercase tracking-widest text-primary-foreground">
        Handloom & silk sarees · Demo store — no real payments
      </div>
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-6 py-4">
        <Link to="/" className="font-display text-2xl font-semibold tracking-wide text-primary">{DEFAULT_BRAND}</Link>
        <nav className="flex flex-wrap items-center gap-5 text-sm uppercase tracking-wider">
          <Link to="/" hash="catalog" className="hover:text-primary">Shop</Link>
          <Link to="/studio" className="hover:text-primary" activeProps={{ className: "text-primary" }}>Studio</Link>
          {user ? <button onClick={signOut} className="uppercase hover:text-primary">Sign out</button>
            : <Link to="/auth" className="hover:text-primary">Sign in</Link>}
          <button aria-label="Open bag" onClick={() => setOpen(true)} className="relative">
            <ShoppingBag className="h-5 w-5" />
            {count > 0 && <span className="absolute -right-2 -top-2 rounded-full bg-primary px-1.5 text-[10px] text-primary-foreground">{count}</span>}
          </button>
        </nav>
      </div>
      <div className="zari-rule" />
      <CartDrawer />
    </header>
  );
}
