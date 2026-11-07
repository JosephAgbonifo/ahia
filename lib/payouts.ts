import type { Currency } from "./api";

export interface PayoutAccount {
  id: number;
  type: "bank" | "xrp";
  currency: Currency;
  isDefault: boolean;
  bankName: string | null;
  bankCode: string | null;
  accountName: string | null;
  accountNumberMasked: string | null;
  xrpAddress: string | null;
  xrpDestTag: number | null;
}

export type PayoutStatus = "requested" | "processing" | "paid" | "failed";

export interface Payout {
  id: number;
  currency: Currency;
  amount_minor: number;
  status: PayoutStatus;
  requested_at: string;
  completed_at: string | null;
  failure_reason: string | null;
}

export interface SellerSummary {
  balances: Record<string, { pending: number; available: number; withdrawn: number }>;
  pendingPayout: Record<string, number>;
  availableToWithdraw: Record<string, number>;
}

export const PAYOUT_STATUS: Record<PayoutStatus, { label: string; tone: string }> = {
  requested: { label: "Requested", tone: "badge-warning" },
  processing: { label: "Processing", tone: "badge-brand" },
  paid: { label: "Paid", tone: "badge-success" },
  failed: { label: "Failed", tone: "badge-danger" },
};

export const accountLabel = (a: PayoutAccount) =>
  a.type === "bank"
    ? `${a.bankName ?? "Bank"} ${a.accountNumberMasked ?? ""}`.trim()
    : `XRPL ${a.xrpAddress ? `${a.xrpAddress.slice(0, 6)}…${a.xrpAddress.slice(-4)}` : ""}${a.xrpDestTag !== null ? ` (tag ${a.xrpDestTag})` : ""}`;
