import { api } from "@/lib/api";

/** Opens (or reuses) the chat for a product and returns its id. Sellers pass the buyer's id. */
export async function startConversation(productId: number, buyerId?: number, message?: string) {
  const res = await api.post<{ conversation: { id: number } }>("/conversations", {
    productId,
    ...(buyerId ? { buyerId } : {}),
    ...(message ? { message } : {}),
  });
  return res.conversation.id;
}
