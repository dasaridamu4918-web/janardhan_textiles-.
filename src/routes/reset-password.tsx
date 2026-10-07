import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { SiteHeader } from "@/components/SiteHeader";

export const Route = createFileRoute("/reset-password")({
  head: () => ({ meta: [
    { title: "Set a new password — Janardhan Textile" }, { name: "description", content: "Choose a new password for your account." },
    { property: "og:title", content: "Set a new password" }, { property: "og:description", content: "Reset your Janardhan Textile password." },
  ] }),
  component: Reset,
});

function Reset() {
  const [pw, setPw] = useState(""); const navigate = useNavigate();
  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pw.length < 8) return toast.error("Use at least 8 characters.");
    const { error } = await supabase.auth.updateUser({ password: pw });
    if (error) return toast.error(error.message);
    toast.success("Password updated."); navigate({ to: "/" });
  };
  return (
    <div className="min-h-screen"><SiteHeader />
      <main className="mx-auto max-w-sm px-6 py-16">
        <h1 className="text-4xl font-semibold">New password</h1>
        <form onSubmit={save} className="mt-8 space-y-4">
          <input type="password" value={pw} onChange={(e) => setPw(e.target.value)} placeholder="New password" className="w-full border bg-card px-3 py-2" />
          <button className="w-full bg-primary py-3 text-sm uppercase tracking-widest text-primary-foreground">Save password</button>
        </form>
      </main>
    </div>
  );
}
