export interface AdminUser {
  id: number;
  email: string;
  phone: string | null;
  role: "user" | "admin";
  status: "active" | "suspended";
  kyc_status: "none" | "pending" | "approved" | "rejected";
  university_id: number;
  created_at: string;
  display_name: string;
}

export interface Report {
  id: number;
  reporter_id: number;
  target_type: "product" | "user" | "message";
  target_id: number;
  reason: string;
  details: string | null;
  status: "open" | "reviewed" | "dismissed";
  created_at: string;
  reporter_name: string;
}

export interface Flag {
  id: number;
  user_id: number;
  seller_order_id: number | null;
  reason: string;
  note: string | null;
  created_at: string;
  resolved_at: string | null;
  display_name: string;
  email: string;
}

export const KYC_TONE = { none: "", pending: "badge-warning", approved: "badge-success", rejected: "badge-danger" } as const;
export const KYC_LABEL = { none: "No ID", pending: "ID pending", approved: "ID verified", rejected: "ID rejected" } as const;

export const REPORT_REASONS = ["Scam or fraud", "Prohibited item", "Misleading listing", "Harassment or abuse", "Something else"] as const;
