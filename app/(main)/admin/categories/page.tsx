"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AlertCircle, ChevronRight, FolderTree, Pencil, Plus } from "lucide-react";
import { toast } from "sonner";
import { RequireAuth } from "@/components/auth/guards";
import { EmptyState } from "@/components/shop/ProductGrid";
import { Button } from "@/components/ui/Button";
import { SelectField, TextField } from "@/components/ui/Field";
import { Modal } from "@/components/ui/Modal";
import { api } from "@/lib/api";
import { handleFormError } from "@/lib/forms";
import type { Category } from "@/lib/shop";
import { useApi } from "@/lib/useApi";
import { resetCategories } from "@/lib/useCategories";
import { categorySchema, type CategoryValues } from "@/lib/validation";

type Editing = { category: Category | null; parentId: number | null };

function CategoryModal({ state, tops, onClose, onSaved }: { state: Editing | null; tops: Category[]; onClose: () => void; onSaved: () => void }) {
  const [formError, setFormError] = useState("");
  const editing = state?.category ?? null;

  const { register, handleSubmit, setError, reset, formState: { errors, isSubmitting } } = useForm<CategoryValues>({
    resolver: zodResolver(categorySchema),
    defaultValues: { name: "", parentId: "", position: "" },
  });

  useEffect(() => {
    if (!state) return;
    setFormError("");
    reset({
      name: state.category?.name ?? "",
      parentId: state.category?.parent_id ? String(state.category.parent_id) : state.parentId ? String(state.parentId) : "",
      position: state.category ? String(state.category.position) : "",
    });
  }, [state, reset]);

  const submit = handleSubmit(async (v) => {
    setFormError("");
    const body = {
      name: v.name,
      parentId: v.parentId ? Number(v.parentId) : null,
      ...(v.position ? { position: Number(v.position) } : {}),
    };
    try {
      if (editing) await api.patch(`/admin/categories/${editing.id}`, body);
      else await api.post("/admin/categories", body);
      toast.success(editing ? "Category updated" : "Category created");
      resetCategories();
      onClose();
      onSaved();
    } catch (e) {
      setFormError(handleFormError(e, setError, ["name", "parentId", "position"]));
    }
  });

  return (
    <Modal open={!!state} onClose={onClose} title={editing ? "Edit category" : state?.parentId ? "Add a subcategory" : "Add a category"}>
      <form onSubmit={submit} noValidate className="grid gap-4">
        {formError && <div className="alert alert-danger" role="alert"><AlertCircle size={18} aria-hidden /><span>{formError}</span></div>}
        <TextField label="Name" error={errors.name?.message} {...register("name")} />
        <SelectField label="Parent category" hint="Leave empty for a top-level category" error={errors.parentId?.message} {...register("parentId")}>
          <option value="">None (top level)</option>
          {tops.filter((t) => t.id !== editing?.id).map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
        </SelectField>
        <TextField label="Sort position" optional inputMode="numeric" hint="Lower numbers appear first" error={errors.position?.message} {...register("position")} />
        <div className="mt-1 flex justify-end gap-3">
          <Button variant="ghost" onClick={onClose} disabled={isSubmitting}>Cancel</Button>
          <Button type="submit" loading={isSubmitting}>{editing ? "Save changes" : "Create"}</Button>
        </div>
      </form>
    </Modal>
  );
}

function Categories() {
  const { data, loading, error, reload } = useApi<{ categories: Category[] }>("/categories");
  const [state, setState] = useState<Editing | null>(null);
  const tops = data?.categories ?? [];

  return (
    <>
      <nav className="mb-4 flex items-center gap-1.5 text-[0.9rem] text-ink-soft" aria-label="Breadcrumb">
        <Link href="/admin" className="text-ink-soft">Admin</Link><ChevronRight size={14} aria-hidden />
        <span aria-current="page">Categories</span>
      </nav>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="mb-1">Categories</h1>
          <p className="m-0 max-w-xl text-ink-soft">Sellers pick one of these when listing. The API can add and rename categories but not delete them.</p>
        </div>
        <Button size="lg" onClick={() => setState({ category: null, parentId: null })} icon={<Plus size={18} aria-hidden />}>Add category</Button>
      </div>

      {loading && !data ? (
        <div className="grid gap-4" aria-busy="true">{[0, 1, 2].map((i) => <div key={i} className="skeleton h-28 rounded-lg" />)}</div>
      ) : error && !data ? (
        <EmptyState icon={<FolderTree size={32} aria-hidden />} title="We couldn't load categories" action={<Button onClick={reload}>Try again</Button>} />
      ) : tops.length === 0 ? (
        <EmptyState icon={<FolderTree size={32} aria-hidden />} title="No categories yet" text="Add your first one. Sellers can't list items until at least one exists." action={<Button onClick={() => setState({ category: null, parentId: null })}>Add category</Button>} />
      ) : (
        <ul className="m-0 grid list-none gap-4 p-0">
          {tops.map((c) => (
            <li key={c.id} className="card p-5 sm:p-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-0">
                  <strong className="font-heading text-lg">{c.name}</strong>
                  <span className="ml-3 text-[0.8rem] text-ink-faint">/{c.slug} · position {c.position} · #{c.id}</span>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="clay" onClick={() => setState({ category: c, parentId: null })} icon={<Pencil size={14} aria-hidden />}>Edit</Button>
                  <Button size="sm" variant="clay" onClick={() => setState({ category: null, parentId: c.id })} icon={<Plus size={14} aria-hidden />}>Subcategory</Button>
                </div>
              </div>
              {c.children.length > 0 && (
                <ul className="m-0 mt-4 grid list-none gap-2 p-0 sm:grid-cols-2">
                  {c.children.map((ch) => (
                    <li key={ch.id} className="clay-inset flex items-center justify-between gap-3 px-4 py-2.5 text-[0.92rem]">
                      <span className="min-w-0 truncate font-semibold">{ch.name}<span className="ml-2 text-[0.75rem] font-normal text-ink-faint">#{ch.id}</span></span>
                      <button type="button" className="icon-btn size-8!" onClick={() => setState({ category: ch, parentId: c.id })} aria-label={`Edit ${ch.name}`}><Pencil size={13} aria-hidden /></button>
                    </li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ul>
      )}

      <CategoryModal state={state} tops={tops} onClose={() => setState(null)} onSaved={reload} />
    </>
  );
}

export default function AdminCategoriesPage() {
  return (
    <RequireAuth role="admin">
      <Categories />
    </RequireAuth>
  );
}
