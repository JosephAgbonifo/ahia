"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ChevronLeft, ChevronRight, Laptop, Lock, ShieldCheck, Store } from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";
import { ButtonLink } from "@/components/ui/Button";
import { useCategories } from "@/lib/useCategories";

const ARROW =
  "absolute top-1/2 z-2 grid size-10 -translate-y-1/2 place-items-center rounded-full bg-white/90 text-ink shadow-md";
const PROMO = "card clay-press grid content-center justify-items-start gap-2 p-5 text-ink no-underline";
const PROMO_ICON = "grid size-11 place-items-center rounded-full bg-brand-50 text-brand-700";

export function Hero() {
  const { user } = useAuth();
  const { categories, loading } = useCategories();
  const reduce = useReducedMotion();
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  const slides = [
    { tone: "from-brand-200 via-brand-400 to-brand-500 text-on-primary", art: Laptop, title: "Back to campus deals", text: "Laptops, textbooks and hostel essentials from students near you.", cta: "Shop now", href: "/products" },
    { tone: "from-brand-700 to-brand-800 text-white", art: Store, title: "Got things to sell?", text: "List in minutes and get paid when the buyer confirms.", cta: user ? "Go to your dashboard" : "Start selling", href: user ? "/dashboard" : "/register" },
    { tone: "from-[#fde9d6] to-[#f9d2b0] text-ink", art: Lock, title: "Shop with escrow protection", text: "We hold your payment until the item is in your hands.", cta: "Browse items", href: "/products" },
  ];

  useEffect(() => {
    if (paused || reduce) return;
    const t = setInterval(() => setIndex((i) => (i + 1) % slides.length), 6000);
    return () => clearInterval(t);
  }, [paused, reduce, slides.length]);

  const go = (n: number) => setIndex((n + slides.length) % slides.length);
  const slide = slides[index];
  const Art = slide.art;

  return (
    <section className="grid gap-5 lg:grid-cols-[15.5rem_minmax(0,1fr)_15rem]" aria-label="Featured">
      <aside className="card hidden p-2.5 lg:block" aria-label="Categories">
        <h2 className="m-0 px-3 pt-3 pb-1.5 text-[0.95rem]">Categories</h2>
        {loading
          ? Array.from({ length: 8 }, (_, i) => <div key={i} className="skeleton mx-2 my-1.5 h-9" />)
          : categories.slice(0, 10).map((c) => (
              <Link
                key={c.id}
                href={`/products?category=${c.id}`}
                className="flex items-center justify-between gap-2 rounded-md px-3 py-2.5 text-[0.93rem] font-semibold text-ink no-underline hover:bg-brand-50 hover:text-brand-700"
              >
                {c.name}
                <ChevronRight size={16} aria-hidden className="text-ink-faint" />
              </Link>
            ))}
      </aside>

      <div
        className="relative min-h-72 overflow-hidden rounded-xl shadow-[var(--clay-out-sm)] md:min-h-88"
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
        onFocus={() => setPaused(true)}
        onBlur={() => setPaused(false)}
        role="group"
        aria-roledescription="carousel"
      >
        <AnimatePresence initial={false} mode="popLayout">
          <motion.div
            key={index}
            className={`absolute inset-0 flex flex-col justify-center gap-3.5 bg-linear-to-br p-7 sm:p-12 ${slide.tone}`}
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -40 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            aria-live="polite"
          >
            <Art className="pointer-events-none absolute -bottom-4 right-8 opacity-20" size={220} aria-hidden strokeWidth={1.2} />
            <h2 className="m-0 max-w-96 text-[clamp(1.7rem,3.4vw,2.6rem)]">{slide.title}</h2>
            <p className="m-0 max-w-104 text-[1.05rem]">{slide.text}</p>
            <ButtonLink href={slide.href} size="lg" variant={index === 1 ? "clay" : "primary"} className="mt-2.5 self-start">
              {slide.cta}
            </ButtonLink>
          </motion.div>
        </AnimatePresence>

        <button type="button" className={`${ARROW} left-3`} onClick={() => go(index - 1)} aria-label="Previous slide"><ChevronLeft size={20} aria-hidden /></button>
        <button type="button" className={`${ARROW} right-3`} onClick={() => go(index + 1)} aria-label="Next slide"><ChevronRight size={20} aria-hidden /></button>
        <div className="absolute inset-x-0 bottom-3.5 z-2 flex justify-center gap-2">
          {slides.map((_, i) => (
            <button
              key={i}
              type="button"
              className={`h-2.5 rounded-full p-0 transition-all ${i === index ? "w-6 bg-white" : "w-2.5 bg-white/55"}`}
              aria-current={i === index}
              aria-label={`Go to slide ${i + 1}`}
              onClick={() => setIndex(i)}
            />
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-5 lg:grid-cols-1">
        <Link href={user ? "/sell" : "/register"} className={PROMO}>
          <span className={PROMO_ICON}><Store size={22} aria-hidden /></span>
          <strong className="font-heading text-base">Sell on Ahia</strong>
          <span className="text-[0.88rem] text-ink-soft">Turn what you don&apos;t use into cash.</span>
        </Link>
        <Link href="/products" className={PROMO}>
          <span className={PROMO_ICON}><ShieldCheck size={22} aria-hidden /></span>
          <strong className="font-heading text-base">Verified sellers</strong>
          <span className="text-[0.88rem] text-ink-soft">Every seller passes an ID check.</span>
        </Link>
      </div>
    </section>
  );
}
