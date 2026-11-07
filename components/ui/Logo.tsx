import Link from "next/link";
import { ShoppingBag } from "lucide-react";

export function Logo({ href = "/", size = 40 }: { href?: string; size?: number }) {
  return (
    <Link
      href={href}
      aria-label="Ahia home"
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "0.65rem",
        color: "var(--ink)",
        textDecoration: "none",
      }}
    >
      <span
        className="btn-primary"
        style={{
          width: size,
          height: size,
          borderRadius: size * 0.34,
          display: "grid",
          placeItems: "center",
        }}
      >
        <ShoppingBag size={size * 0.52} aria-hidden />
      </span>
      <span
        style={{
          fontFamily: "var(--font-heading)",
          fontWeight: 800,
          fontSize: size * 0.55,
          letterSpacing: "-0.02em",
        }}
      >
        Ahia
      </span>
    </Link>
  );
}
