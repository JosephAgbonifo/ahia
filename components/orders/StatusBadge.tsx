import { cx } from "@/lib/cx";
import { ORDER_STATUS, SELLER_ORDER_STATUS, type OrderStatus, type SellerOrderStatus } from "@/lib/orders";

export function OrderBadge({ status }: { status: OrderStatus }) {
  const s = ORDER_STATUS[status] ?? { label: status, tone: "" };
  return <span className={cx("badge", s.tone)}>{s.label}</span>;
}

export function SellerOrderBadge({ status }: { status: SellerOrderStatus }) {
  const s = SELLER_ORDER_STATUS[status] ?? { label: status, tone: "" };
  return <span className={cx("badge", s.tone)}>{s.label}</span>;
}
