"use client";

import { useState } from "react";
import { ExternalLink, QrCode, Smartphone } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { api, ApiError } from "@/lib/api";
import { PAYMENTS_MOCK, type XamanRequest } from "@/lib/xrp";

/** QR code for desktop, an "Open Xaman" button for phones, and a dev-only fake signer. */
export function XamanPanel({ request, action }: { request: XamanRequest; action: string }) {
  const [qrFailed, setQrFailed] = useState(false);
  const [mocking, setMocking] = useState(false);

  const mockSign = async () => {
    setMocking(true);
    try {
      await api.post(`/dev/mock-sign/${request.payloadUuid}`);
      toast.success("Signed (test mode). This page updates in a moment.");
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Mock signing only works when the API runs with PAYMENTS_MOCK=true");
    } finally {
      setMocking(false);
    }
  };

  return (
    <div className="grid justify-items-center gap-4">
      <div className="clay-inset hidden size-56 place-items-center overflow-hidden p-3 md:grid">
        {qrFailed ? (
          <div className="grid justify-items-center gap-2 text-center text-[0.85rem] text-ink-soft"><QrCode size={30} aria-hidden />QR code unavailable. Use the button instead.</div>
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={request.qrPng} alt={`QR code to ${action} in Xaman`} className="size-full rounded-md bg-white object-contain" onError={() => setQrFailed(true)} />
        )}
      </div>
      <a href={request.deeplink} className="btn btn-primary btn-lg w-full md:w-auto"><Smartphone size={18} aria-hidden />Open in Xaman<ExternalLink size={15} aria-hidden /></a>
      <p className="m-0 text-center text-[0.82rem] text-ink-faint md:hidden">On your phone? Tap the button. On a computer, scan the code with Xaman.</p>
      {PAYMENTS_MOCK && (
        <Button size="sm" variant="clay" loading={mocking} onClick={mockSign}>Simulate signing (test mode only)</Button>
      )}
    </div>
  );
}
