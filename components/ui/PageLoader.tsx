"use client";

import { motion } from "framer-motion";
import { ShoppingBag } from "lucide-react";

export function PageLoader({ label = "Loading" }: { label?: string }) {
  return (
    <div
      role="status"
      aria-live="polite"
      style={{ minHeight: "60vh", display: "grid", placeItems: "center" }}
    >
      <div style={{ display: "grid", justifyItems: "center", gap: "1rem" }}>
        <motion.div
          className="clay-sm"
          style={{
            width: 64,
            height: 64,
            display: "grid",
            placeItems: "center",
            color: "var(--brand-600)",
          }}
          animate={{ y: [0, -10, 0], rotate: [0, -6, 0] }}
          transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }}
        >
          <ShoppingBag size={28} aria-hidden />
        </motion.div>
        <span className="text-muted" style={{ fontWeight: 600 }}>
          {label}
        </span>
      </div>
    </div>
  );
}
