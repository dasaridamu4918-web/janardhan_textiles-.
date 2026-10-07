import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { SiteHeader } from "@/components/SiteHeader";
import { useAuth } from "@/lib/store";

const safePath = (p?: string) => (p && p.startsWith("/") && !p.startsWith("//") ? p : "/");

export const Route = createFileRoute("/auth")({
  validateSearch: (s: Record<string, unknown>) => ({ redirect: typeof s.redirect === "string" ? s.redirect : undefined }),
  head: () => ({ meta: [
    { title: "Sign in — Janardhan Textile" }, { name: "description", content: "Sign in or create your Janardhan Textile account." },
    { property: "og:title", content: "Sign in — Janardhan Textile" }, { property: "og:description", content: "Sign in to shop and track your saree orders." },
  ] }),
  component: AuthPage,
});

const schema = z.object({ email: z.string().trim().email().max(255), password: z.string().min(8).max(72) });

function AuthPage() {
  const { redirect } = Route.useSearch();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<"in" | "up" | "forgot">("in");
  const [email, setEmail] = useState(""); const [password, setPassword] = useState(""); const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => { if (user) navigate({ to: safePath(redirect) as "/" }); }, [user]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setBusy(true);
    try {
      if (mode === "forgot") {
        const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: `${window.location.origin}/reset-password` });
        if (error) throw error; toast.success("Check your email for a reset link."); return;
      }
      const parsed = schema.safeParse({ email, password });
      if (!parsed.success) { toast.error("Enter a valid email and a password of at least 8 characters."); return; }
      if (mode === "up") {
        const { error } = await supabase.auth.signUp({ ...parsed.data, options: { emailRedirectTo: window.location.origin, data: { full_name: name.trim().slice(0, 120) } } });
        if (error) throw error; toast.success("Check your email to confirm your account."); setMode("in");
      } else {
        const { error } = await supabase.auth.signInWithPassword(parsed.data);
        if (error) throw error;
      }
    } catch (err) { toast.error(err instanceof Error ? err.message : "Something went wrong"); }
    finally { setBusy(false); }
  };

  const google = async () => {
    if (redirect) sessionStorage.setItem("jt-after-auth", safePath(redirect));
    const r = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin });
    if (r.error) toast.error("Google sign-in failed");
  };

  return (
    <div className="min-h-screen"><SiteHeader />
      <main className="mx-auto max-w-sm px-6 py-16">
        <h1 className="text-4xl font-semibold">{mode === "up" ? "Create account" : mode === "forgot" ? "Reset password" : "Sign in"}</h1>
        <form onSubmit={submit} className="mt-8 space-y-4">
          {mode === "up" && <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Full name" className="w-full border bg-card px-3 py-2" />}
          <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" aria-label="Email" className="w-full border bg-card px-3 py-2" />
          {mode !== "forgot" && <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" aria-label="Password" className="w-full border bg-card px-3 py-2" />}
          <button disabled={busy} className="w-full bg-primary py-3 text-sm uppercase tracking-widest text-primary-foreground disabled:opacity-50">
            {mode === "up" ? "Create account" : mode === "forgot" ? "Send reset link" : "Sign in"}
          </button>
        </form>
        {mode !== "forgot" && <button onClick={google} className="mt-3 w-full border py-3 text-sm">Continue with Google</button>}
        <div className="mt-6 flex justify-between text-sm">
          <button className="underline" onClick={() => setMode(mode === "up" ? "in" : "up")}>{mode === "up" ? "Have an account? Sign in" : "New here? Create account"}</button>
          {mode === "in" && <button className="underline" onClick={() => setMode("forgot")}>Forgot password?</button>}
        </div>
      </main>
    </div>
  );
}
