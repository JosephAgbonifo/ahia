"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AlertCircle, ChevronRight, GraduationCap, MapPin, Plus, Power, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { RequireAuth } from "@/components/auth/guards";
import { EmptyState } from "@/components/shop/ProductGrid";
import { Button } from "@/components/ui/Button";
import { SelectField, TextAreaField, TextField } from "@/components/ui/Field";
import { ConfirmDialog } from "@/components/ui/Modal";
import { api, ApiError, type University } from "@/lib/api";
import { handleFormError } from "@/lib/forms";
import { useApi } from "@/lib/useApi";
import { pickupSchema, universitySchema, type PickupValues, type UniversityValues } from "@/lib/validation";

function AddUniversity({ onAdded }: { onAdded: () => void }) {
  const [formError, setFormError] = useState("");
  const { register, handleSubmit, setError, reset, formState: { errors, isSubmitting } } = useForm<UniversityValues>({
    resolver: zodResolver(universitySchema),
    defaultValues: { countryCode: "", name: "", shortName: "", city: "" },
  });

  const submit = handleSubmit(async (v) => {
    setFormError("");
    try {
      await api.post("/admin/universities", { countryCode: v.countryCode.toLowerCase(), name: v.name, ...(v.shortName ? { shortName: v.shortName } : {}), ...(v.city ? { city: v.city } : {}) });
      toast.success("University added. Students can now choose it when they register.");
      reset();
      onAdded();
    } catch (e) {
      setFormError(handleFormError(e, setError, ["countryCode", "name", "shortName", "city"]));
    }
  });

  return (
    <form onSubmit={submit} noValidate className="card grid gap-4 p-5 sm:p-7" aria-labelledby="add-uni-h">
      <h2 id="add-uni-h" className="m-0 text-xl">Add a university</h2>
      <p className="m-0 -mt-2 text-[0.9rem] text-ink-soft">The currency comes from the country. The country must already exist in your database (for example NG or CA).</p>
      {formError && <div className="alert alert-danger" role="alert"><AlertCircle size={18} aria-hidden /><span>{formError}</span></div>}
      <div className="form-grid-2">
        <TextField label="Full name" icon={GraduationCap} placeholder="University of Lagos" error={errors.name?.message} {...register("name")} />
        <TextField label="Country code" maxLength={2} placeholder="NG" autoCapitalize="characters" error={errors.countryCode?.message} {...register("countryCode")} />
      </div>
      <div className="form-grid-2">
        <TextField label="Short name" optional placeholder="UNILAG" error={errors.shortName?.message} {...register("shortName")} />
        <TextField label="City" optional placeholder="Lagos" error={errors.city?.message} {...register("city")} />
      </div>
      <div className="flex justify-end"><Button type="submit" loading={isSubmitting} icon={<Plus size={16} aria-hidden />}>Add university</Button></div>
    </form>
  );
}

function AddPickupPoint({ universities }: { universities: University[] }) {
  const [formError, setFormError] = useState("");
  const { register, handleSubmit, setError, reset, watch, formState: { errors, isSubmitting } } = useForm<PickupValues>({
    resolver: zodResolver(pickupSchema),
    defaultValues: { universityId: "", name: "", description: "" },
  });

  const submit = handleSubmit(async (v) => {
    setFormError("");
    try {
      await api.post("/admin/pickup-points", { universityId: Number(v.universityId), name: v.name, ...(v.description ? { description: v.description } : {}) });
      toast.success("Pickup point added");
      reset({ universityId: v.universityId, name: "", description: "" });
    } catch (e) {
      setFormError(handleFormError(e, setError, ["universityId", "name", "description"]));
    }
  });

  return (
    <form onSubmit={submit} noValidate className="card grid gap-4 p-5 sm:p-7" aria-labelledby="pickup-h">
      <h2 id="pickup-h" className="m-0 text-xl">Add a campus pickup point</h2>
      <p className="m-0 -mt-2 text-[0.9rem] text-ink-soft">Buyers at that university can choose it at checkout. The API doesn&apos;t list or delete pickup points, so check the name before saving.</p>
      {formError && <div className="alert alert-danger" role="alert"><AlertCircle size={18} aria-hidden /><span>{formError}</span></div>}
      <SelectField label="University" error={errors.universityId?.message} {...register("universityId")}>
        <option value="">Choose a university</option>
        {universities.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
      </SelectField>
      <TextField label="Name" icon={MapPin} placeholder="Library Steps" error={errors.name?.message} {...register("name")} />
      <TextAreaField label="Description" optional placeholder="Behind the main library" count={(watch("description") ?? "").length} limit={300} error={errors.description?.message} {...register("description")} />
      <div className="flex justify-end"><Button type="submit" loading={isSubmitting} icon={<Plus size={16} aria-hidden />}>Add pickup point</Button></div>
    </form>
  );
}

function Universities() {
  const { data, loading, error, reload } = useApi<{ universities: University[] }>("/universities");
  const [recent, setRecent] = useState<{ id: number; name: string }[]>([]);
  const [target, setTarget] = useState<University | null>(null);
  const [busy, setBusy] = useState(false);
  const [reactivateId, setReactivateId] = useState("");

  const list = data?.universities ?? [];
  const grouped = useMemo(() => {
    const m = new Map<string, University[]>();
    list.forEach((u) => m.set(u.country_name, [...(m.get(u.country_name) ?? []), u]));
    return [...m.entries()];
  }, [list]);

  const setActive = async (id: number, active: boolean, name?: string) => {
    setBusy(true);
    try {
      await api.patch(`/admin/universities/${id}`, { active });
      toast.success(active ? "University reactivated" : "University deactivated. Existing users are unaffected.");
      if (!active && name) setRecent((r) => [{ id, name }, ...r.filter((x) => x.id !== id)]);
      if (active) setRecent((r) => r.filter((x) => x.id !== id));
      setTarget(null);
      setReactivateId("");
      reload();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Couldn't update the university");
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <nav className="mb-4 flex items-center gap-1.5 text-[0.9rem] text-ink-soft" aria-label="Breadcrumb">
        <Link href="/admin" className="text-ink-soft">Admin</Link><ChevronRight size={14} aria-hidden />
        <span aria-current="page">Universities and campuses</span>
      </nav>
      <h1 className="mb-1">Universities and campuses</h1>
      <p className="mb-6 max-w-2xl text-ink-soft">Students choose a university when they register, and only see items from their own campus.</p>

      <div className="grid gap-6">
        <section aria-labelledby="active-h">
          <h2 id="active-h" className="mb-4 text-xl">Active universities</h2>
          {loading && !data ? (
            <div className="skeleton h-40 rounded-lg" />
          ) : error && !data ? (
            <EmptyState icon={<GraduationCap size={32} aria-hidden />} title="We couldn't load universities" action={<Button onClick={reload}>Try again</Button>} />
          ) : list.length === 0 ? (
            <EmptyState icon={<GraduationCap size={32} aria-hidden />} title="No active universities" text="Add one below, or reactivate one by its ID. Nobody can register without an active university." />
          ) : (
            <div className="grid gap-5">
              {grouped.map(([country, us]) => (
                <div key={country}>
                  <h3 className="mb-2 text-[0.85rem] font-bold text-ink-faint">{country}</h3>
                  <ul className="m-0 grid list-none gap-2.5 p-0">
                    {us.map((u) => (
                      <li key={u.id} className="card flex flex-wrap items-center gap-3 px-5 py-3.5">
                        <div className="min-w-0 flex-1">
                          <strong className="block truncate font-heading">{u.name}</strong>
                          <span className="text-[0.82rem] text-ink-soft">{[u.short_name, u.city].filter(Boolean).join(" · ")} · #{u.id}</span>
                        </div>
                        <span className="badge">{u.currency}</span>
                        <Button size="sm" variant="ghost" className="text-danger!" onClick={() => setTarget(u)} icon={<Power size={14} aria-hidden />}>Deactivate</Button>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="card grid gap-4 p-5 sm:p-7" aria-labelledby="inactive-h">
          <h2 id="inactive-h" className="m-0 text-xl">Reactivate a university</h2>
          <p className="m-0 text-[0.9rem] text-ink-soft">Deactivated universities disappear from every public list, and the API has no way to list them. Use the ones you deactivated this session, or enter an ID.</p>
          {recent.length > 0 && (
            <ul className="m-0 flex list-none flex-wrap gap-2 p-0">
              {recent.map((r) => (
                <li key={r.id}><Button size="sm" variant="clay" disabled={busy} onClick={() => setActive(r.id, true)} icon={<RotateCcw size={14} aria-hidden />}>{r.name}</Button></li>
              ))}
            </ul>
          )}
          <form className="flex flex-wrap items-end gap-3" onSubmit={(e) => { e.preventDefault(); if (/^\d+$/.test(reactivateId)) void setActive(Number(reactivateId), true); }}>
            <div className="field w-44">
              <label className="label" htmlFor="reactivate-id">University ID</label>
              <div className="input-wrap"><input id="reactivate-id" className="input-el" inputMode="numeric" value={reactivateId} onChange={(e) => setReactivateId(e.target.value)} /></div>
            </div>
            <Button type="submit" variant="clay" disabled={!/^\d+$/.test(reactivateId)} loading={busy}>Reactivate</Button>
          </form>
        </section>

        <AddUniversity onAdded={reload} />
        <AddPickupPoint universities={list} />
      </div>

      <ConfirmDialog
        open={!!target}
        title="Deactivate this university?"
        text={target ? `${target.name} will disappear from registration. People who already signed up with it keep their accounts and can still use the site.` : ""}
        confirmLabel="Deactivate"
        danger
        loading={busy}
        onConfirm={() => target && setActive(target.id, false, target.name)}
        onClose={() => setTarget(null)}
      />
    </>
  );
}

export default function AdminUniversitiesPage() {
  return (
    <RequireAuth role="admin">
      <Universities />
    </RequireAuth>
  );
}
