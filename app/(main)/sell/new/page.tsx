"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { RequireAuth } from "@/components/auth/guards";
import { useAuth } from "@/components/auth/AuthProvider";
import { ProductForm } from "@/components/sell/ProductForm";
import { SellerGate } from "@/components/sell/SellerGate";

function NewListing() {
  const { user } = useAuth();
  if (!user) return null;
  return (
    <div className="mx-auto max-w-3xl">
      <nav className="mb-4 flex items-center gap-1.5 text-[0.9rem] text-ink-soft" aria-label="Breadcrumb">
        <Link href="/sell" className="text-ink-soft">My listings</Link>
        <ChevronRight size={14} aria-hidden />
        <span aria-current="page">New listing</span>
      </nav>
      <h1 className="mb-1">Create a listing</h1>
      <p className="mb-6 text-ink-soft">Good photos and an honest description sell faster.</p>
      <ProductForm mode="create" currency={user.currency} />
    </div>
  );
}

export default function NewListingPage() {
  return (
    <RequireAuth>
      <SellerGate>
        <NewListing />
      </SellerGate>
    </RequireAuth>
  );
}
