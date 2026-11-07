import type { Currency, PageInfo } from "./api";

export type Condition = "new" | "like_new" | "used" | "refurbished";

export const CONDITION_LABEL: Record<Condition, string> = {
  new: "New",
  like_new: "Like new",
  used: "Used",
  refurbished: "Refurbished",
};

export interface Category {
  id: number;
  parent_id: number | null;
  name: string;
  slug: string;
  icon: string | null;
  position: number;
  children: Category[];
}

export interface ProductSummary {
  id: number;
  title: string;
  price_minor: number;
  currency: Currency;
  condition_type: Condition;
  stock: number;
  status: string;
  created_at: string;
  university_id: number;
  university_short_name: string | null;
  university_name: string;
  seller_id: number;
  seller_name: string;
  seller_avatar: string | null;
  category_id: number;
  category_name: string;
  image_url: string | null;
}

export interface ProductDetail extends Omit<ProductSummary, "image_url"> {
  description: string | null;
  view_count: number;
  updated_at: string;
  seller_kyc_status: string;
  seller_rating: number | null;
  seller_review_count: number;
  images: { id: number; url: string; position: number }[];
}

export interface Review {
  id: number;
  rating: number;
  body: string | null;
  created_at: string;
  reviewer_name: string;
  reviewer_avatar: string | null;
}

export interface ProductList {
  products: ProductSummary[];
  page: PageInfo;
  scope: "all_universities" | "my_university";
}

export interface CartItem {
  productId: number;
  title: string;
  imageUrl: string | null;
  unitPriceMinor: number;
  quantity: number;
  lineTotalMinor: number;
  availableStock: number;
  issue: null | "unavailable" | "insufficient_stock";
}

export interface CartSeller {
  sellerId: number;
  sellerName: string;
  items: CartItem[];
  subtotalMinor: number;
}

export interface Cart {
  currency: Currency;
  sellers: CartSeller[];
  itemCount: number;
  subtotalMinor: number;
  hasIssues: boolean;
}

export function flattenCategories(list: Category[]): Category[] {
  return list.flatMap((c) => [c, ...flattenCategories(c.children)]);
}

export const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });

export const formatDateTime = (iso: string) =>
  new Date(iso).toLocaleString(undefined, { year: "numeric", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
