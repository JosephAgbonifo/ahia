import { Suspense } from "react";
import type { Metadata, Viewport } from "next";
// Self-hosted variable fonts (npm packages): no network fetch at build or dev time
import "@fontsource-variable/open-sans";
import "@fontsource-variable/montserrat";
import { Providers } from "./providers";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Ahia", template: "%s | Ahia" },
  description: "Buy and sell with students on your campus.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#E58963",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        {/* Next 16 needs a Suspense boundary above components that read the URL */}
        <Suspense fallback={null}>
          <Providers>{children}</Providers>
        </Suspense>
      </body>
    </html>
  );
}
