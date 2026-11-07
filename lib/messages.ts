export interface Conversation {
  id: number;
  product_id: number;
  buyer_id: number;
  seller_id: number;
  last_message_at: string | null;
  product_title: string;
  product_image: string | null;
  other_user_id: number;
  other_name: string;
  other_avatar: string | null;
  last_message: string | null;
  unread: number;
}

export interface Message {
  id: number;
  sender_id: number;
  body: string;
  read_at: string | null;
  created_at: string;
  conversation_id?: number;
}

const sameDay = (a: Date, b: Date) => a.toDateString() === b.toDateString();

/** "2:30 PM" */
export const chatTime = (iso: string) => new Date(iso).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });

/** "Today", "Yesterday" or "12 Oct 2026" */
export function dayLabel(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (sameDay(d, now)) return "Today";
  if (sameDay(d, yesterday)) return "Yesterday";
  return d.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}

/** Inbox timestamp: time if today, otherwise a short date */
export function listTime(iso: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  return sameDay(d, new Date()) ? chatTime(iso) : d.toLocaleDateString(undefined, { day: "numeric", month: "short" });
}
