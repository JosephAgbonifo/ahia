"use client";

import type { ReactNode } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { BookOpen, Headphones, Laptop, MapPin, ShieldCheck, Shirt, Wallet } from "lucide-react";
import { Logo } from "@/components/ui/Logo";

const FEATURES = [
  { icon: ShieldCheck, title: "Verified sellers", text: "Every seller passes an ID check before listing." },
  { icon: Wallet, title: "Payment held until you confirm", text: "Sellers are paid once you confirm the item." },
  { icon: MapPin, title: "Meet on campus", text: "Pick up at a spot your university has set." },
];

const TILES = [
  { icon: Laptop, top: "50%", right: "-1rem", size: 76, delay: 0 },
  { icon: BookOpen, top: "62%", right: "9rem", size: 60, delay: 0.6 },
  { icon: Headphones, top: "74%", right: "2rem", size: 68, delay: 1.1 },
  { icon: Shirt, top: "40%", right: "11rem", size: 54, delay: 1.6 },
];

interface AuthShellProps {
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
}

/** Shared frame for every auth screen: brand panel on the left, clay card on the right. */
export function AuthShell({ title, subtitle, children, footer }: AuthShellProps) {
  const reduce = useReducedMotion();

  return (
    <div className="grid min-h-screen grid-cols-1 md:grid-cols-[minmax(380px,5fr)_6fr]">
      <aside className="clay-brand relative m-4 mr-0 hidden flex-col justify-between overflow-hidden rounded-xl p-10 md:flex">
        <Logo />

        <div className="pointer-events-none absolute inset-0" aria-hidden>
          {TILES.map(({ icon: Icon, size, delay, ...pos }, i) => (
            <motion.div
              key={i}
              className="clay-sm absolute grid place-items-center text-brand-700"
              style={{ width: size, height: size, ...pos }}
              animate={reduce ? undefined : { y: [0, -14, 0] }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut", delay }}
            >
              <Icon size={size * 0.42} />
            </motion.div>
          ))}
        </div>

        <div className="relative z-10 max-w-104">
          <h2 className="mb-6 text-[clamp(1.8rem,2.6vw,2.4rem)]">Buy and sell with students you can trust.</h2>
          <ul className="m-0 grid list-none gap-4.5 p-0">
            {FEATURES.map(({ icon: Icon, title, text }) => (
              <li key={title} className="flex items-start gap-3.5">
                <span className="clay-sm grid size-10 flex-none place-items-center text-brand-700">
                  <Icon size={20} aria-hidden />
                </span>
                <div>
                  <strong className="block font-heading">{title}</strong>
                  <span className="text-[0.92rem] opacity-85">{text}</span>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </aside>

      <main className="grid place-items-center px-4 pt-6 pb-12 sm:px-8">
        <div className="w-full max-w-120">
          <div className="mb-6 flex justify-center md:hidden">
            <Logo />
          </div>
          <motion.section
            className="clay p-6 sm:p-10"
            initial={{ opacity: 0, y: 24, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ type: "spring", stiffness: 220, damping: 24 }}
          >
            <header className="mb-7">
              <h1 className="mb-1.5 text-[clamp(1.6rem,3.5vw,2rem)]">{title}</h1>
              {subtitle && <p className="m-0 text-ink-soft">{subtitle}</p>}
            </header>
            {children}
          </motion.section>
          {footer && <div className="mt-6 text-center text-[0.95rem] text-ink-soft [&_a]:font-bold [&_a]:underline">{footer}</div>}
        </div>
      </main>
    </div>
  );
}

/** Animated icon badge for success / error / info states inside the card. */
export function StatusIcon({ children, tone = "brand" }: { children: ReactNode; tone?: "brand" | "success" | "danger" }) {
  const color = tone === "success" ? "text-success" : tone === "danger" ? "text-danger" : "text-brand-600";
  return (
    <motion.div
      className={`clay-sm mx-auto mb-5 grid size-21 place-items-center ${color}`}
      initial={{ scale: 0.4, opacity: 0, rotate: -12 }}
      animate={{ scale: 1, opacity: 1, rotate: 0 }}
      transition={{ type: "spring", stiffness: 300, damping: 18 }}
    >
      {children}
    </motion.div>
  );
}
