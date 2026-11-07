import type { Currency, PageInfo } from "./api";

export type OrderStatus = "pending_payment" | "paid" | "cancelled" | "expired";
export type SellerOrderStatus =
  | "awaiting_payment"
  | "paid"
  | "shipped"
  | "delivered"
  | "completed"
  | "refund_requested"
  | "refunded"
  | "cancelled";

export interface OrderItem {
  id: number;
  seller_order_id: number;
  product_id: number;
  title: string;
  image: string | null;
  unit_price_minor: number;
  quantity: number;
}

export interface RefundRequest {
  id: number;
  reason: string;
  details: string | null;
  status: "open" | "approved" | "rejected" | "cancelled";
  resolution_note: string | null;
  created_at: string;
  resolved_at: string | null;
}

export interface SellerOrder {
  id: number;
  order_id: number;
  seller_id: number;
  buyer_id: number;
  subtotal_minor: number;
  settle_currency: Currency;
  settle_gross_minor: number;
  /** Seller view only */
  fee_bps?: number;
  fee_minor?: number;
  seller_net_minor?: number;
  status: SellerOrderStatus;
  pickup_point_id: number | null;
  shipped_at: string | null;
  delivered_at: string | null;
  buyer_confirmed_at: string | null;
  release_at: string | null;
  completed_at: string | null;
  auto_completed: number;
  created_at: string;
  order_number: string;
  payment_method: string;
  payment_currency: Currency;
  order_status: OrderStatus;
  seller_name: string;
  seller_avatar: string | null;
  buyer_name: string;
  buyer_avatar: string | null;
  pickup_point: string | { name: string; description?: string | null } | null;
  items?: OrderItem[];
  refundRequests?: RefundRequest[];
}

export interface OrderSummary {
  id: number;
  order_number: string;
  status: OrderStatus;
  payment_method: string;
  payment_currency: Currency;
  price_currency: Currency;
  subtotal_minor: number;
  total_paid_minor: number;
  created_at: string;
  paid_at: string | null;
  seller_count: number;
}

export interface OrderDetail extends Omit<OrderSummary, "seller_count"> {
  buyer_id: number;
  university_id: number;
  fx_rate: string | null;
  sellerOrders: SellerOrder[];
  payment: { provider: string; status: string; reference: string; expiresAt: string; destinationTag: number | null; txHash: string | null } | null;
}

export type OrdersPage<T> = { page: PageInfo } & T;

export const ORDER_STATUS: Record<OrderStatus, { label: string; tone: string }> = {
  pending_payment: { label: "Awaiting payment", tone: "badge-warning" },
  paid: { label: "Paid", tone: "badge-success" },
  cancelled: { label: "Cancelled", tone: "badge-danger" },
  expired: { label: "Expired", tone: "badge-danger" },
};

export const SELLER_ORDER_STATUS: Record<SellerOrderStatus, { label: string; tone: string }> = {
  awaiting_payment: { label: "Awaiting payment", tone: "badge-warning" },
  paid: { label: "Paid", tone: "badge-brand" },
  shipped: { label: "Shipped", tone: "badge-brand" },
  delivered: { label: "Delivered", tone: "badge-success" },
  completed: { label: "Completed", tone: "badge-success" },
  refund_requested: { label: "Refund requested", tone: "badge-warning" },
  refunded: { label: "Refunded", tone: "badge-danger" },
  cancelled: { label: "Cancelled", tone: "badge-danger" },
};

export const REFUND_REASONS = [
  { value: "not_received", label: "I didn't receive it" },
  { value: "not_as_described", label: "Not as described" },
  { value: "damaged", label: "It arrived damaged" },
  { value: "other", label: "Something else" },
] as const;

export const pickupName = (pp: SellerOrder["pickup_point"]) => (typeof pp === "string" ? pp : pp?.name ?? null);

/** The refund window is open until release_at (or always, before delivery). */
export const refundWindowOpen = (so: Pick<SellerOrder, "release_at">) => !so.release_at || new Date(so.release_at).getTime() > Date.now();
