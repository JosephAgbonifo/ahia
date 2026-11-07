import type { Metadata } from "next";
import Link from "next/link";
import { ChevronDown, CreditCard, LifeBuoy, Lock, ShoppingBag, Store, UserCog } from "lucide-react";

export const metadata: Metadata = { title: "Help centre" };

interface Topic {
  id: string;
  title: string;
  icon: typeof ShoppingBag;
  faqs: { q: string; a: React.ReactNode }[];
}

const TOPICS: Topic[] = [
  {
    id: "buying",
    title: "Buying",
    icon: ShoppingBag,
    faqs: [
      { q: "Why can't I see items from other universities?", a: "When you're logged in you only see items from your own campus, so meetups are easy. Visitors who aren't logged in can browse every campus." },
      { q: "How do I pay?", a: "Naira orders can be paid by card or bank transfer through Paystack. Any order can also be paid in RLUSD, a US dollar stablecoin on the XRP Ledger, with the Xaman wallet: you'll see the exact RLUSD amount at checkout and the price is locked for 5 minutes. Card payments in Canadian dollars aren't available yet." },
      { q: "How does paying with RLUSD work?", a: "At checkout choose RLUSD, then scan the QR code with Xaman (or tap Open in Xaman on your phone) and sign the payment. We confirm it on the XRP Ledger and update your order automatically. Your wallet needs enough RLUSD and a trust line to the RLUSD issuer, and Xaman tells you if either is missing. If you pay from another wallet, send RLUSD (not XRP) and include the destination tag shown on the page." },
      { q: "Can I buy from several sellers at once?", a: "Yes. Your cart groups items by seller. One checkout pays for everything, but each seller's part is delivered, confirmed and refunded on its own." },
      { q: "I paid but my order still says awaiting payment.", a: <>Open the order and tap <strong>Check payment</strong>. Bank transfers can take a few minutes. Unpaid orders expire after a while and the items go back on sale.</> },
    ],
  },
  {
    id: "escrow",
    title: "Payments and escrow",
    icon: Lock,
    faqs: [
      { q: "What is escrow?", a: "When you pay, Ahia holds the money instead of sending it to the seller. The seller is only paid after you confirm you received the item, or after the refund window closes." },
      { q: "When does the seller get paid?", a: "When the seller marks an item delivered, you're asked to confirm. Once you confirm, a 3 day refund window starts, then the seller is paid. If you never confirm, the seller is paid automatically 7 days after delivery." },
      { q: "What happens if I don't confirm?", a: "The seller is paid automatically after 7 days and your account may be flagged for review. Always confirm, or request a refund, before the window closes." },
      { q: "What does Ahia charge?", a: "Sellers pay a 5% fee on each sale. Buyers pay no extra fees." },
    ],
  },
  {
    id: "refunds",
    title: "Refunds",
    icon: CreditCard,
    faqs: [
      { q: "How do I ask for a refund?", a: <>Open the order, find the seller&apos;s part and tap <strong>Request a refund</strong>. Pick a reason and add details. You can do this until the refund window closes.</> },
      { q: "What happens to the seller's payout?", a: "It's paused while our team reviews your request. If we reject it, the order goes back to its previous status and the seller is paid when the window ends." },
      { q: "How do I get my money back?", a: "Naira refunds go back to you automatically through Paystack once approved. RLUSD refunds are sent by our team, so they can take a little longer." },
      { q: "Can I cancel a refund request?", a: "Yes. Open the order and tap Withdraw refund request while it's still open." },
    ],
  },
  {
    id: "selling",
    title: "Selling",
    icon: Store,
    faqs: [
      { q: "How do I start selling?", a: <>Verify your email, then <Link href="/kyc">verify your ID</Link>. Once it&apos;s approved you can create listings and add a payout account.</> },
      { q: "How many photos can I add?", a: "Up to 6 per listing, each up to 5 MB, in JPG, PNG or WebP. The first photo is the cover, and you need at least one to publish." },
      { q: "How do I get paid?", a: <>Add a bank account or an XRPL address (for RLUSD, it needs a trust line) on the <Link href="/payouts">payouts page</Link>, then withdraw your available balance. Our team sends the money and marks it paid. If a payout fails, the money returns to your balance.</> },
      { q: "Why can't I buy my own item?", a: "To keep reviews and sales honest, sellers can't add their own listings to a cart." },
    ],
  },
  {
    id: "account",
    title: "Your account",
    icon: UserCog,
    faqs: [
      { q: "I didn't get the verification email.", a: "Check your spam folder, then use the Resend email button in the banner at the top of the page. Verification links work once and last 24 hours." },
      { q: "I forgot my password.", a: <>Use <Link href="/forgot-password">Forgot password</Link> on the login page. The reset link works once and lasts 1 hour.</> },
      { q: "Why was my ID rejected?", a: <>The reason is shown on the <Link href="/kyc">verification page</Link>. It&apos;s usually a blurry photo or a name that doesn&apos;t match. You can submit again.</> },
      { q: "How do I log out of other devices?", a: <>Go to <Link href="/settings">Settings</Link> and choose Log out of all devices.</> },
    ],
  },
];

export default function HelpPage() {
  const support = process.env.NEXT_PUBLIC_SUPPORT_EMAIL;

  return (
    <div className="mx-auto max-w-4xl">
      <header className="clay-brand mb-10 rounded-xl p-7 sm:p-10">
        <h1 className="mb-2">How can we help?</h1>
        <p className="m-0 max-w-xl text-[1.05rem]">Answers about buying, selling, payments and your account.</p>
        <nav className="mt-6 flex flex-wrap gap-2" aria-label="Help topics">
          {TOPICS.map((t) => (
            <a key={t.id} href={`#${t.id}`} className="inline-flex items-center gap-2 rounded-full bg-white/80 px-4 py-2 text-[0.9rem] font-bold text-ink no-underline hover:bg-white">
              <t.icon size={15} aria-hidden />
              {t.title}
            </a>
          ))}
        </nav>
      </header>

      <div className="grid gap-10">
        {TOPICS.map((t) => (
          <section key={t.id} id={t.id} className="scroll-mt-36" aria-labelledby={`${t.id}-h`}>
            <h2 id={`${t.id}-h`} className="mb-4 flex items-center gap-3 text-2xl">
              <span className="grid size-10 place-items-center rounded-full bg-brand-50 text-brand-700"><t.icon size={20} aria-hidden /></span>
              {t.title}
            </h2>
            <div className="grid gap-3">
              {t.faqs.map((f) => (
                <details key={f.q} className="card group p-0 open:shadow-[var(--clay-out-sm)]">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 font-heading font-semibold marker:hidden [&::-webkit-details-marker]:hidden">
                    {f.q}
                    <ChevronDown size={18} className="flex-none text-ink-faint transition group-open:rotate-180" aria-hidden />
                  </summary>
                  <div className="px-5 pb-5 text-ink-soft [&_a]:font-bold">{f.a}</div>
                </details>
              ))}
            </div>
          </section>
        ))}
      </div>

      <aside className="card mt-12 flex flex-wrap items-center gap-5 p-6 sm:p-8">
        <span className="grid size-14 flex-none place-items-center rounded-full bg-brand-50 text-brand-700"><LifeBuoy size={26} aria-hidden /></span>
        <div className="min-w-0 flex-1">
          <h2 className="mb-1 text-xl">Still stuck?</h2>
          <p className="m-0 text-ink-soft">
            {support ? <>Email us at <a href={`mailto:${support}`} className="font-bold">{support}</a> and include your order number if you have one.</> : "For a problem with an order, message the seller from the order page first."}
          </p>
        </div>
      </aside>
    </div>
  );
}
