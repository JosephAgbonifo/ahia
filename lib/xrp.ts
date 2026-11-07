export interface XamanRequest {
  payloadUuid: string;
  deeplink: string;
  qrPng: string;
}

/** Everything the pay screen needs. The API only returns it once, at checkout. */
export interface XrpSession {
  orderId: number;
  /** Decimal string for display, e.g. "12.5" */
  amountRlusd: string;
  /** Micro-RLUSD (1 RLUSD = 1,000,000) */
  amountMinor: number;
  /** The RLUSD issuer address (needed for the trust line) */
  issuer: string;
  currency: string;
  destination: string;
  destinationTag: number;
  expiresAt: string;
  /** When the price lock ends on THIS computer's clock (ms since epoch) */
  localExpiry: number;
  xaman: XamanRequest;
}

/**
 * How long the price is locked, worked out from two server timestamps so a wrong clock on
 * this computer can't make a fresh payment look expired. Falls back to 5 minutes.
 */
export function lockDurationMs(createdAt?: string, expiresAt?: string) {
  const ms = createdAt && expiresAt ? new Date(expiresAt).getTime() - new Date(createdAt).getTime() : NaN;
  return Number.isFinite(ms) && ms > 30_000 && ms <= 60 * 60_000 ? ms : 5 * 60_000;
}

const key = (orderId: number | string) => `ahia:xrp:${orderId}`;

export function saveXrpSession(s: XrpSession) {
  try {
    sessionStorage.setItem(key(s.orderId), JSON.stringify(s));
  } catch {
    /* storage can be unavailable (private mode); the pay screen then asks to restart */
  }
}

export function loadXrpSession(orderId: number | string): XrpSession | null {
  try {
    const raw = sessionStorage.getItem(key(orderId));
    return raw ? (JSON.parse(raw) as XrpSession) : null;
  } catch {
    return null;
  }
}

export function clearXrpSession(orderId: number | string) {
  try {
    sessionStorage.removeItem(key(orderId));
  } catch {
    /* ignore */
  }
}

/** Dev only: lets you "sign" without the Xaman app when the API runs with PAYMENTS_MOCK=true */
export const PAYMENTS_MOCK = process.env.NEXT_PUBLIC_PAYMENTS_MOCK === "true";

export const formatRlusd = (amount: string | number) => `${amount} RLUSD`;

/** Orders paid on the XRP Ledger: "rlusd" now, "xrp" on older orders */
export const isLedgerPayment = (method: string) => method === "rlusd" || method === "xrp";

export const paymentMethodName = (method: string) =>
  method === "rlusd" ? "RLUSD (Xaman)" : method === "xrp" ? "XRP (Xaman)" : "Card or bank transfer (Paystack)";

export const clock = (seconds: number) => `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
