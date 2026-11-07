"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { AlertCircle, Boxes, Save, Send, Tag } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { SelectField, TextAreaField, TextField } from "@/components/ui/Field";
import { api, ApiError, type Currency } from "@/lib/api";
import { handleFormError } from "@/lib/forms";
import type { ProductDetail } from "@/lib/shop";
import { useCategories } from "@/lib/useCategories";
import { CONDITIONS, productSchema, type ProductValues } from "@/lib/validation";
import { ImagePicker } from "./ImagePicker";

interface Props {
  mode: "create" | "edit";
  product?: ProductDetail;
  currency: Currency;
  /** Called after a successful edit so the page can reload the listing */
  onSaved?: () => void;
}

const FIELDS = ["title", "categoryId", "condition", "price", "stock", "description"] as const;

async function uploadImages(productId: number, files: File[]) {
  const form = new FormData();
  files.forEach((f) => form.append("images", f));
  await api.upload(`/products/${productId}/images`, form);
}

export function ProductForm({ mode, product, currency, onSaved }: Props) {
  const router = useRouter();
  const { categories } = useCategories();
  const editing = mode === "edit";

  const [files, setFiles] = useState<File[]>([]);
  const [existing, setExisting] = useState(product?.images.map((i) => ({ id: i.id, url: i.url })) ?? []);
  const [imageError, setImageError] = useState("");
  const [formError, setFormError] = useState("");
  const [intent, setIntent] = useState<"draft" | "publish">("draft");

  const { register, handleSubmit, setError, watch, formState: { errors, isSubmitting } } = useForm<ProductValues>({
    resolver: zodResolver(productSchema(editing)),
    defaultValues: {
      title: product?.title ?? "",
      categoryId: product ? String(product.category_id) : "",
      condition: product?.condition_type ?? "used",
      price: product ? (product.price_minor / 100).toFixed(2) : "",
      stock: product ? String(product.stock) : "1",
      description: product?.description ?? "",
    },
  });

  const payload = (v: ProductValues) => ({
    title: v.title,
    description: v.description ?? "",
    price: Number(v.price),
    categoryId: Number(v.categoryId),
    condition: v.condition,
    stock: Number(v.stock),
  });

  const removeExisting = async (imageId: number) => {
    if (!product) return;
    try {
      await api.delete(`/products/${product.id}/images/${imageId}`);
      setExisting((list) => list.filter((i) => i.id !== imageId));
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Couldn't delete the photo");
    }
  };

  const onSubmit = handleSubmit(async (values) => {
    setFormError("");
    setImageError("");
    const photoCount = existing.length + files.length;
    if (intent === "publish" && photoCount === 0) {
      setImageError("Add at least one photo to publish");
      return;
    }

    let id = product?.id;
    try {
      if (editing && id) {
        await api.patch(`/products/${id}`, payload(values));
      } else {
        const created = await api.post<{ product: { id: number } }>("/products", payload(values));
        id = created.product.id;
      }
    } catch (err) {
      setFormError(handleFormError(err, setError, [...FIELDS]));
      return;
    }

    // The listing exists now; photos and publishing are follow-up steps
    try {
      if (files.length) await uploadImages(id!, files);
      if (!editing && intent === "publish") await api.patch(`/products/${id}`, { status: "active" });
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Saved, but a photo or publishing step failed");
      router.push(`/sell/${id}/edit`);
      return;
    }

    if (editing) {
      setFiles([]);
      toast.success("Changes saved");
      onSaved?.();
    } else {
      toast.success(intent === "publish" ? "Your listing is live" : "Saved as a draft");
      router.push("/sell");
    }
  });

  const parents = categories;

  return (
    <form onSubmit={onSubmit} noValidate className="grid gap-6">
      {formError && (
        <div className="alert alert-danger" role="alert">
          <AlertCircle size={18} aria-hidden />
          <span>{formError}</span>
        </div>
      )}

      <section className="card grid gap-5 p-5 sm:p-8" aria-labelledby="photos-h">
        <h2 id="photos-h" className="m-0 text-xl">Photos</h2>
        <ImagePicker
          existing={existing}
          files={files}
          onAdd={(f) => { setFiles((cur) => [...cur, ...f]); setImageError(""); }}
          onRemoveFile={(i) => setFiles((cur) => cur.filter((_, idx) => idx !== i))}
          onRemoveExisting={removeExisting}
          error={imageError}
        />
      </section>

      <section className="card grid gap-5 p-5 sm:p-8" aria-labelledby="details-h">
        <h2 id="details-h" className="m-0 text-xl">Details</h2>
        <TextField label="Title" icon={Tag} placeholder="e.g. iPhone 12 128GB, clean" error={errors.title?.message} {...register("title")} />

        <div className="form-grid-2">
          <SelectField label="Category" error={errors.categoryId?.message} {...register("categoryId")}>
            <option value="">Choose a category</option>
            {parents.map((c) =>
              c.children.length ? (
                <optgroup key={c.id} label={c.name}>
                  <option value={c.id}>All {c.name}</option>
                  {c.children.map((ch) => <option key={ch.id} value={ch.id}>{ch.name}</option>)}
                </optgroup>
              ) : (
                <option key={c.id} value={c.id}>{c.name}</option>
              )
            )}
          </SelectField>
          <SelectField label="Condition" error={errors.condition?.message} {...register("condition")}>
            {CONDITIONS.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
          </SelectField>
        </div>

        <div className="form-grid-2">
          <TextField label={`Price (${currency})`} inputMode="decimal" placeholder="2500.50" hint="In naira or dollars, not kobo or cents" error={errors.price?.message} {...register("price")} />
          <TextField label="Quantity in stock" icon={Boxes} inputMode="numeric" error={errors.stock?.message} hint={editing ? "Set to 0 to mark it sold out" : undefined} {...register("stock")} />
        </div>

        <TextAreaField label="Description" optional placeholder="Condition, what's included, why you're selling, where you can meet." count={(watch("description") ?? "").length} limit={5000} error={errors.description?.message} {...register("description")} />
      </section>

      <div className="flex flex-wrap justify-end gap-3">
        <Button variant="ghost" size="lg" onClick={() => router.push("/sell")} disabled={isSubmitting}>Cancel</Button>
        {editing ? (
          <Button type="submit" size="lg" loading={isSubmitting} onClick={() => setIntent("draft")} icon={<Save size={18} aria-hidden />}>Save changes</Button>
        ) : (
          <>
            <Button type="submit" variant="clay" size="lg" loading={isSubmitting && intent === "draft"} disabled={isSubmitting && intent !== "draft"} onClick={() => setIntent("draft")} icon={<Save size={18} aria-hidden />}>Save as draft</Button>
            <Button type="submit" size="lg" loading={isSubmitting && intent === "publish"} disabled={isSubmitting && intent !== "publish"} onClick={() => setIntent("publish")} icon={<Send size={18} aria-hidden />}>Publish listing</Button>
          </>
        )}
      </div>
    </form>
  );
}
