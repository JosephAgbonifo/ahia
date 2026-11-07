import type { ReactNode } from "react";
import { Footer } from "@/components/layout/Footer";
import { Header } from "@/components/layout/Header";
import { VerifyEmailBanner } from "@/components/layout/VerifyEmailBanner";

export default function MainLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <a href="#content" className="skip-link">Skip to content</a>
      <Header />
      <VerifyEmailBanner />
      <main id="content" className="container page-main">
        {children}
      </main>
      <Footer />
    </>
  );
}
