import { Bell, Banknote, Flag, PackageCheck, ShieldCheck, ShoppingBag, Truck, Undo2, Wallet, type LucideIcon } from "lucide-react";

export interface AppNotification {
  id: number;
  type: string;
  title: string;
  body: string | null;
  data: Record<string, unknown> | null;
  read_at: string | null;
  created_at: string;
}

export const NOTIFICATION_ICON: Record<string, LucideIcon> = {
  new_order: ShoppingBag,
  payment_received: Wallet,
  order_shipped: Truck,
  order_delivered: PackageCheck,
  receipt_confirmed: PackageCheck,
  payout_available: Banknote,
  payout_paid: Banknote,
  payout_failed: Banknote,
  refund_requested: Undo2,
  refund_approved: Undo2,
  refund_rejected: Undo2,
  kyc_approved: ShieldCheck,
  kyc_rejected: ShieldCheck,
  account_flagged: Flag,
};

export const iconFor = (type: string): LucideIcon => NOTIFICATION_ICON[type] ?? Bell;

const SELLER_SIDE = new Set(["new_order", "receipt_confirmed", "refund_requested"]);

export type Target = { href: string } | { sellerOrderId: number } | null;

/** Where tapping a notification should go. Buyer order links need a lookup, so they return the seller order id. */
export function notificationTarget(n: AppNotification): Target {
  switch (n.type) {
    case "payout_available":
    case "payout_paid":
    case "payout_failed":
      return { href: "/payouts" };
    case "kyc_approved":
    case "kyc_rejected":
      return { href: "/kyc" };
    case "account_flagged":
      return { href: "/orders" };
  }
  const d = n.data ?? {};
  const orderId = Number(d.orderId);
  const sellerOrderId = Number(d.sellerOrderId);
  if (orderId) return { href: `/orders/${orderId}` };
  if (sellerOrderId) return SELLER_SIDE.has(n.type) ? { href: `/sell/orders/${sellerOrderId}` } : { sellerOrderId };
  return null;
}
