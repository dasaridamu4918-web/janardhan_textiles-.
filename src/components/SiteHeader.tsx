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
      <div className="bg-primary py-1.5 text-center px-4 text-[10px] uppercase tracking-widest text-primary-foreground sm:text-xs">
        Handloom & silk sarees · Demo store — no real payments
      </div>
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-x-3 gap-y-1 px-4 py-3 sm:px-6 sm:py-4">
        <Link to="/" className="font-display text-xl font-semibold tracking-wide text-primary sm:text-2xl">{DEFAULT_BRAND}</Link>
        <nav className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm uppercase sm:gap-5 tracking-wider">
          <Link to="/" hash="catalog" className="inline-flex min-h-11 items-center hover:text-primary">Shop</Link>
          <Link to="/studio" className="inline-flex min-h-11 items-center hover:text-primary" activeProps={{ className: "text-primary" }}>Studio</Link>
          {user ? <button onClick={signOut} className="min-h-11 uppercase hover:text-primary">Sign out</button>
            : <Link to="/auth" search={{ redirect: undefined }} className="inline-flex min-h-11 items-center hover:text-primary">Sign in</Link>}
          <button aria-label="Open bag" onClick={() => setOpen(true)} className="relative inline-flex min-h-11 min-w-11 items-center justify-center">
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
