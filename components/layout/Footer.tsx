"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Lock, MapPin, MessageCircle, ShieldCheck } from "lucide-react";
import { Logo } from "@/components/ui/Logo";

const TRUST = [
  { icon: ShieldCheck, title: "Verified sellers", text: "ID-checked before they list" },
  { icon: Lock, title: "Escrow payments", text: "Paid out after you confirm" },
  { icon: MapPin, title: "Campus pickup", text: "Meet at safe, set spots" },
  { icon: MessageCircle, title: "Chat with sellers", text: "Ask before you buy" },
];

const COLUMNS = [
  { title: "Shop", links: [["Browse all", "/products"], ["Cart", "/cart"], ["My orders", "/orders"], ["Saved items", "/wishlist"]] },
  { title: "Sell", links: [["Start selling", "/sell"], ["Verify your ID", "/kyc"], ["Earnings and payouts", "/payouts"], ["Seller dashboard", "/dashboard"]] },
  { title: "Support", links: [["Help centre", "/help"], ["Refunds and returns", "/help#refunds"], ["Safety tips", "/help#escrow"], ["Contact us", "/help"]] },
];

export function Footer() {
  // Read the date after mount: Next 16 rejects new Date() during prerender
  const [year, setYear] = useState<number | null>(null);
  useEffect(() => setYear(new Date().getFullYear()), []);

  return (
    <footer className="mt-16 bg-[#2a201b] text-[#e9ddd5]">
      <div className="container">
        <div className="grid gap-5 border-b border-white/10 py-7 sm:grid-cols-2 md:grid-cols-4">
          {TRUST.map(({ icon: Icon, title, text }) => (
            <div key={title} className="flex items-center gap-3.5">
              <span className="grid size-11 flex-none place-items-center rounded-full bg-white/7 text-brand-300">
                <Icon size={22} aria-hidden />
              </span>
              <div>
                <strong className="block text-[0.95rem] text-white">{title}</strong>
                <span className="text-[0.85rem] text-[#bfaea3]">{text}</span>
              </div>
            </div>
          ))}
        </div>

        <div className="grid gap-10 pt-14 pb-10 sm:grid-cols-2 md:grid-cols-[1.6fr_1fr_1fr_1fr]">
          <div>
            <div className="text-white"><Logo size={38} /></div>
            <p className="mt-4 mb-0 max-w-88 text-[#bfaea3]">
              The marketplace for students. Buy and sell on your campus with verified sellers and protected payments.
            </p>
          </div>
          {COLUMNS.map((col) => (
            <nav key={col.title} aria-label={col.title}>
              <h3 className="mb-4 text-base text-white">{col.title}</h3>
              <ul className="m-0 grid list-none gap-2.5 p-0">
                {col.links.map(([label, href]) => (
                  <li key={label}>
                    <Link href={href} className="text-[0.94rem] text-[#d4c4ba] hover:text-brand-300 hover:underline">{label}</Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>

        <div className="flex flex-wrap justify-between gap-x-6 gap-y-2 border-t border-white/10 py-6 text-[0.85rem] text-[#a8978c]">
          <span>© {year ?? ""} Ahia. All rights reserved.</span>
          <span>Made for campuses in Nigeria and Canada.</span>
        </div>
      </div>
    </footer>
  );
}
