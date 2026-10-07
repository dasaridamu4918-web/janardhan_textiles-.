import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { COLOR_HEX } from "@/lib/sarees";

const PHOTOS = import.meta.glob("../assets/sarees/*.jpg", { eager: true, import: "default" }) as Record<string, string>;
export const photoFor = (key: number | null | undefined) =>
  key == null ? undefined : Object.entries(PHOTOS).find(([k]) => k.endsWith(`/${key}.jpg`))?.[1];

export type Product = {
  id: number; title: string; style: string; fabric: string; color: string; pattern: string; occasion: string;
  description: string; price_paise: number; stock: number; status: "published" | "hidden" | "archived";
  image_key: number | null; image_url: string | null;
};
export const productImage = (p: Pick<Product, "image_url" | "image_key">) => p.image_url || photoFor(p.image_key);
export const productHex = (p: Pick<Product, "color">) => COLOR_HEX[p.color] ?? "#888";
export const rupees = (paise: number) => "₹" + (paise / 100).toLocaleString("en-IN", { maximumFractionDigits: 2 });

export const productsQuery = {
  queryKey: ["products"],
  queryFn: async (): Promise<Product[]> => {
    const { data, error } = await supabase.from("products").select("*").order("id");
    if (error) throw error;
    return data as Product[];
  },
};
export function useProducts() { return useQuery(productsQuery); }

/* ---------------- Auth ---------------- */
type AuthCtx = { session: Session | null; user: User | null; isAdmin: boolean; ready: boolean };
const AuthContext = createContext<AuthCtx>({ session: null, user: null, isAdmin: false, ready: false });
export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const qc = useQueryClient();

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((event, s) => {
      setSession(s);
      if (event === "SIGNED_IN" || event === "SIGNED_OUT" || event === "USER_UPDATED") qc.invalidateQueries();
    });
    supabase.auth.getSession().then(({ data }) => { setSession(data.session); setReady(true); });
    return () => sub.subscription.unsubscribe();
  }, [qc]);

  useEffect(() => {
    if (!session) { setIsAdmin(false); return; }
    supabase.rpc("am_i_admin").then(({ data }) => setIsAdmin(!!data));
  }, [session?.user.id]);

  return <AuthContext.Provider value={{ session, user: session?.user ?? null, isAdmin, ready }}>{children}</AuthContext.Provider>;
}

/* ---------------- Cart ---------------- */
export type CartLine = { product_id: number; quantity: number };
type CartCtx = {
  lines: CartLine[]; count: number; open: boolean; setOpen: (o: boolean) => void;
  add: (id: number, qty?: number) => Promise<void>; setQty: (id: number, qty: number) => Promise<void>;
  remove: (id: number) => Promise<void>; reload: () => Promise<void>;
};
const CartContext = createContext<CartCtx | null>(null);
export const useCart = () => useContext(CartContext)!;
const LS = "jt-guest-cart";
const MAX = 10;
const readLocal = (): CartLine[] => { try { return JSON.parse(localStorage.getItem(LS) || "[]"); } catch { return []; } };
const writeLocal = (l: CartLine[]) => localStorage.setItem(LS, JSON.stringify(l));

export function CartProvider({ children }: { children: ReactNode }) {
  const { user, ready } = useAuth();
  const [lines, setLines] = useState<CartLine[]>([]);
  const [open, setOpen] = useState(false);

  const reload = useCallback(async () => {
    if (!user) { setLines(readLocal()); return; }
    const { data } = await supabase.from("cart_items").select("product_id, quantity").order("updated_at");
    setLines(data ?? []);
  }, [user]);

  useEffect(() => {
    if (!ready) return;
    (async () => {
      if (user) {
        const guest = readLocal();
        if (guest.length) {
          const { data: existing } = await supabase.from("cart_items").select("product_id, quantity");
          const map = new Map((existing ?? []).map((e) => [e.product_id, e.quantity]));
          const rows = guest.map((g) => ({ user_id: user.id, product_id: g.product_id, quantity: Math.min(MAX, Math.max(g.quantity, map.get(g.product_id) ?? 0)) }));
          await supabase.from("cart_items").upsert(rows);
          localStorage.removeItem(LS);
        }
      }
      await reload();
    })();
  }, [user?.id, ready]);

  const setQty = useCallback(async (id: number, qty: number) => {
    const q = Math.max(0, Math.min(MAX, Math.floor(qty)));
    if (!user) {
      const next = q === 0 ? readLocal().filter((l) => l.product_id !== id)
        : (() => { const l = readLocal(); const f = l.find((x) => x.product_id === id); if (f) f.quantity = q; else l.push({ product_id: id, quantity: q }); return l; })();
      writeLocal(next); setLines(next); return;
    }
    if (q === 0) await supabase.from("cart_items").delete().eq("product_id", id);
    else await supabase.from("cart_items").upsert({ user_id: user.id, product_id: id, quantity: q, updated_at: new Date().toISOString() });
    await reload();
  }, [user, reload]);

  const add = useCallback(async (id: number, qty = 1) => {
    const cur = lines.find((l) => l.product_id === id)?.quantity ?? 0;
    await setQty(id, cur + qty); setOpen(true);
  }, [lines, setQty]);
  const remove = useCallback((id: number) => setQty(id, 0), [setQty]);
  const count = useMemo(() => lines.reduce((a, l) => a + l.quantity, 0), [lines]);

  return <CartContext.Provider value={{ lines, count, open, setOpen, add, setQty, remove, reload }}>{children}</CartContext.Provider>;
}

export const STATUS_LABEL: Record<string, string> = {
  pending: "Pending", confirmed: "Confirmed", packed: "Packed", shipped: "Shipped", delivered: "Delivered", cancelled: "Cancelled",
};
export const ORDER_STATUSES = ["pending", "confirmed", "packed", "shipped", "delivered", "cancelled"] as const;
