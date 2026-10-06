import { Link } from "@tanstack/react-router";
import { DEFAULT_BRAND } from "@/lib/sarees";

export function SiteHeader() {
  return (
    <header className="border-b bg-card">
      <div className="bg-primary py-1.5 text-center text-xs tracking-widest text-primary-foreground uppercase">
        Free shipping across India · Handloom & silk sarees
      </div>
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        <Link to="/" className="font-display text-2xl font-semibold tracking-wide text-primary">
          {DEFAULT_BRAND}
        </Link>
        <nav className="flex gap-6 text-sm uppercase tracking-wider">
          <Link to="/" hash="catalog" className="hover:text-primary">Shop</Link>
          <Link to="/studio" className="hover:text-primary" activeProps={{ className: "text-primary" }}>Content Studio</Link>
        </nav>
      </div>
      <div className="zari-rule" />
    </header>
  );
}
