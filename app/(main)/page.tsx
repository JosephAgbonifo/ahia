"use client";

import Link from "next/link";
import {
  Armchair, Backpack, BookOpen, Dumbbell, Gamepad2, Gift, Laptop, Lock, MapPin,
  MessageCircle, Shirt, ShieldCheck, Smartphone, UtensilsCrossed, type LucideIcon,
} from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";
import { ButtonLink } from "@/components/ui/Button";
import { Hero } from "@/components/shop/Hero";
import { EmptyState, ProductGrid } from "@/components/shop/ProductGrid";
import type { ProductList } from "@/lib/shop";
import { useApi } from "@/lib/useApi";
import { useCategories } from "@/lib/useCategories";

const CAT_ICONS: LucideIcon[] = [Smartphone, Laptop, BookOpen, Shirt, Armchair, Dumbbell, UtensilsCrossed, Gamepad2, Backpack, Gift];

const TRUST = [
  { icon: ShieldCheck, title: "Verified sellers", text: "ID-checked before listing" },
  { icon: Lock, title: "Escrow payments", text: "Paid out after you confirm" },
  { icon: MapPin, title: "Campus pickup", text: "Meet at safe, set spots" },
  { icon: MessageCircle, title: "Chat first", text: "Ask the seller before you buy" },
];

function Row({ title, href, query, columns }: { title: string; href: string; query: Record<string, string | number>; columns?: "five" | "wide" }) {
  const { data, loading } = useApi<ProductList>("/products", query);
  return (
    <section className="section" aria-labelledby={`${title}-h`}>
      <div className="section-head">
        <h2 id={`${title}-h`}>{title}</h2>
        <Link href={href}>See all</Link>
      </div>
      <ProductGrid
        products={data?.products}
        loading={loading}
        skeletons={columns ? 5 : 4}
        columns={columns}
        empty={<EmptyState icon={<Gift size={32} aria-hidden />} title="Nothing listed yet" text="Be the first to list something on your campus." action={<ButtonLink href="/sell" size="sm">Start selling</ButtonLink>} />}
      />
    </section>
  );
}

export default function HomePage() {
  const { user } = useAuth();
  const { categories } = useCategories();

  return (
    <>
      <Hero />

      <section className="card mt-6 grid gap-4 p-5 sm:grid-cols-2 md:grid-cols-4" aria-label="Why shop on Ahia">
        {TRUST.map(({ icon: Icon, title, text }) => (
          <div key={title} className="flex items-center gap-3.5">
            <span className="grid size-12 flex-none place-items-center rounded-full bg-brand-50 text-brand-700"><Icon size={22} aria-hidden /></span>
            <div><strong className="block font-heading text-[0.95rem]">{title}</strong><span className="text-[0.85rem] text-ink-soft">{text}</span></div>
          </div>
        ))}
      </section>

      {categories.length > 0 && (
        <section className="section" aria-labelledby="cats-h">
          <div className="section-head">
            <h2 id="cats-h">Shop by category</h2>
            <Link href="/products">All products</Link>
          </div>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-5 xl:grid-cols-6">
            {categories.slice(0, 12).map((c, i) => {
              const Icon = CAT_ICONS[i % CAT_ICONS.length];
              return (
                <Link key={c.id} href={`/products?category=${c.id}`} className="card clay-press grid justify-items-center gap-3 px-4 py-5 text-center font-heading text-[0.95rem] font-bold text-ink no-underline">
                  <span className="grid size-14 place-items-center rounded-full bg-brand-50 text-brand-700"><Icon size={26} aria-hidden /></span>
                  {c.name}
                </Link>
              );
            })}
          </div>
        </section>
      )}

      <Row title={user ? `New on ${user.university_short_name ?? "your campus"}` : "Just listed"} href="/products?sort=newest" query={{ sort: "newest", limit: 10 }} columns="five" />
      <Row title="Budget picks" href="/products?sort=price_asc" query={{ sort: "price_asc", limit: 5 }} columns="five" />

      <section className="clay-brand section grid items-center gap-4 rounded-xl p-7 sm:p-12 md:grid-cols-[1fr_auto]" aria-label="Sell on Ahia">
        <div>
          <h2 className="m-0 mb-2 text-[clamp(1.4rem,3vw,2rem)]">Have something to sell?</h2>
          <p className="m-0 max-w-lg">List it in minutes. Your payment is released once the buyer confirms receipt.</p>
        </div>
        <ButtonLink href={user ? "/sell" : "/register"} variant="clay" size="lg">
          {user ? "Create a listing" : "Create a free account"}
        </ButtonLink>
      </section>
    </>
  );
}
