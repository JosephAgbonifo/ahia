import { Suspense, type ReactNode } from "react";
import { GuestOnly } from "@/components/auth/guards";

export default function GuestLayout({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={null}>
      <GuestOnly>{children}</GuestOnly>
    </Suspense>
  );
}
