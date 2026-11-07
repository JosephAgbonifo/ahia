"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AlertCircle, BadgeCheck, Camera, KeyRound, LogOut, MapPin, Phone, Save, User as UserIcon } from "lucide-react";
import { toast } from "sonner";
import { RequireAuth } from "@/components/auth/guards";
import { useAuth } from "@/components/auth/AuthProvider";
import { PersonAvatar } from "@/components/messages/Avatar";
import { Button } from "@/components/ui/Button";
import { checkFile } from "@/components/ui/FileDrop";
import { TextAreaField, TextField } from "@/components/ui/Field";
import { ConfirmDialog } from "@/components/ui/Modal";
import { WalletsCard } from "@/components/xrp/WalletsCard";
import { api, ApiError } from "@/lib/api";
import { handleFormError } from "@/lib/forms";
import { formatDate } from "@/lib/shop";
import { changePasswordSchema, profileSchema, type ChangePasswordValues, type ProfileValues } from "@/lib/validation";

const KYC_TEXT = { none: "Not verified", pending: "Under review", approved: "Verified seller", rejected: "Rejected" } as const;
const KYC_TONE = { none: "", pending: "badge-warning", approved: "badge-success", rejected: "badge-danger" } as const;

function PhotoCard() {
  const { user, refreshUser } = useAuth();
  const input = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  if (!user) return null;

  const pick = async (file?: File) => {
    if (!file) return;
    const problem = checkFile(file, false);
    if (problem) return void toast.error(problem);
    setUploading(true);
    try {
      const form = new FormData();
      form.append("avatar", file);
      await api.upload("/users/me/avatar", form);
      await refreshUser();
      toast.success("Profile photo updated");
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Couldn't upload your photo");
    } finally {
      setUploading(false);
      if (input.current) input.current.value = "";
    }
  };

  return (
    <section className="card flex flex-wrap items-center gap-5 p-5 sm:p-7" aria-label="Profile photo">
      <span className="relative">
        <span className="block size-24 overflow-hidden rounded-full"><PersonAvatar name={user.display_name} src={user.avatar_url} size="md" /></span>
      </span>
      <div className="min-w-0 flex-1">
        <h2 className="m-0 text-xl">{user.display_name}</h2>
        <p className="mb-3 truncate text-[0.9rem] text-ink-soft">{user.email}</p>
        <Button size="sm" variant="clay" loading={uploading} onClick={() => input.current?.click()} icon={<Camera size={15} aria-hidden />}>Change photo</Button>
        <p className="mt-2 mb-0 text-[0.8rem] text-ink-faint">JPG, PNG or WebP, up to 5 MB</p>
        <input ref={input} type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" aria-label="Upload a profile photo" onChange={(e) => pick(e.target.files?.[0])} />
      </div>
    </section>
  );
}

function ProfileCard() {
  const { user, refreshUser } = useAuth();
  const [formError, setFormError] = useState("");

  const { register, handleSubmit, setError, watch, reset, formState: { errors, isSubmitting, dirtyFields } } = useForm<ProfileValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      firstName: user?.first_name ?? "",
      lastName: user?.last_name ?? "",
      displayName: user?.display_name ?? "",
      campusLocation: user?.campus_location ?? "",
      bio: user?.bio ?? "",
      phone: user?.phone ?? "",
    },
  });
  if (!user) return null;

  const onSubmit = handleSubmit(async (v) => {
    setFormError("");
    const body: Record<string, string | null> = {};
    if (dirtyFields.firstName) body.firstName = v.firstName;
    if (dirtyFields.lastName) body.lastName = v.lastName;
    if (dirtyFields.displayName) body.displayName = v.displayName;
    if (dirtyFields.campusLocation) body.campusLocation = v.campusLocation?.trim() || null;
    if (dirtyFields.bio) body.bio = v.bio?.trim() || null;
    if (dirtyFields.phone) body.phone = v.phone?.replace(/[\s\-()]/g, "") || null;
    if (Object.keys(body).length === 0) return void toast.info("There's nothing to save yet.");

    try {
      await api.patch("/users/me", body);
      await refreshUser();
      reset(v);
      toast.success("Profile saved");
    } catch (e) {
      setFormError(handleFormError(e, setError, ["firstName", "lastName", "displayName", "campusLocation", "bio", "phone"]));
    }
  });

  return (
    <form onSubmit={onSubmit} noValidate className="card grid gap-5 p-5 sm:p-7" aria-labelledby="profile-h">
      <h2 id="profile-h" className="m-0 text-xl">Profile</h2>
      {formError && <div className="alert alert-danger" role="alert"><AlertCircle size={18} aria-hidden /><span>{formError}</span></div>}
      <div className="form-grid-2">
        <TextField label="First name" icon={UserIcon} autoComplete="given-name" error={errors.firstName?.message} {...register("firstName")} />
        <TextField label="Last name" autoComplete="family-name" error={errors.lastName?.message} {...register("lastName")} />
      </div>
      <TextField label="Display name" hint="This is the name other students see" error={errors.displayName?.message} {...register("displayName")} />
      <div className="form-grid-2">
        <TextField label="Phone" optional type="tel" icon={Phone} autoComplete="tel" error={errors.phone?.message} {...register("phone")} />
        <TextField label="Where on campus" optional icon={MapPin} placeholder="e.g. Hostel B" error={errors.campusLocation?.message} {...register("campusLocation")} />
      </div>
      <TextAreaField label="About you" optional placeholder="A line or two for buyers and sellers" count={(watch("bio") ?? "").length} limit={500} error={errors.bio?.message} {...register("bio")} />
      <div className="flex justify-end">
        <Button type="submit" loading={isSubmitting} icon={<Save size={16} aria-hidden />}>Save changes</Button>
      </div>
    </form>
  );
}

function AccountCard() {
  const { user } = useAuth();
  if (!user) return null;
  const rows: [string, React.ReactNode][] = [
    ["Email", <span key="e" className="flex flex-wrap items-center gap-2">{user.email}{user.email_verified_at ? <span className="badge badge-success"><BadgeCheck size={12} aria-hidden />Verified</span> : <span className="badge badge-warning">Not verified</span>}</span>],
    ["University", `${user.university_name}${user.university_short_name ? ` (${user.university_short_name})` : ""}`],
    ["Country and currency", `${user.country_name}, ${user.currency}`],
    ["ID verification", <span key="k" className="flex flex-wrap items-center gap-2"><span className={`badge ${KYC_TONE[user.kyc_status]}`}>{KYC_TEXT[user.kyc_status]}</span>{user.kyc_status !== "approved" && user.kyc_status !== "pending" && <Link href="/kyc" className="text-[0.88rem] font-bold">Verify now</Link>}</span>],
    ["Member since", formatDate(user.created_at)],
  ];
  return (
    <section className="card p-5 sm:p-7" aria-labelledby="account-h">
      <h2 id="account-h" className="mb-4 text-xl">Account</h2>
      <dl className="m-0 grid gap-4 text-[0.93rem]">
        {rows.map(([k, v]) => (
          <div key={k} className="grid gap-1 sm:grid-cols-[11rem_1fr] sm:gap-4"><dt className="text-ink-faint">{k}</dt><dd className="m-0 font-semibold">{v}</dd></div>
        ))}
      </dl>
      <p className="mt-5 mb-0 text-[0.85rem] text-ink-faint">Your email and university can&apos;t be changed here.</p>
    </section>
  );
}

function SecurityCard() {
  const { logout, logoutAll } = useAuth();
  const [formError, setFormError] = useState("");
  const [confirmAll, setConfirmAll] = useState(false);
  const [busy, setBusy] = useState(false);

  const { register, handleSubmit, setError, formState: { errors, isSubmitting } } = useForm<ChangePasswordValues>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: { currentPassword: "", newPassword: "", confirm: "" },
  });

  const onSubmit = handleSubmit(async (v) => {
    setFormError("");
    try {
      await api.post("/users/me/change-password", { currentPassword: v.currentPassword, newPassword: v.newPassword });
      toast.success("Password changed. Log in again with your new password.");
      await logout(); // the API signs out every device when the password changes
    } catch (e) {
      if (e instanceof ApiError && e.code === "INVALID_CREDENTIALS") setError("currentPassword", { message: "That isn't your current password" });
      else setFormError(handleFormError(e, setError, ["currentPassword", "newPassword"]));
    }
  });

  const signOutEverywhere = async () => {
    setBusy(true);
    await logoutAll();
  };

  return (
    <section className="card grid gap-6 p-5 sm:p-7" aria-labelledby="security-h">
      <h2 id="security-h" className="m-0 text-xl">Security</h2>
      <form onSubmit={onSubmit} noValidate className="grid gap-4">
        <h3 className="m-0 text-base">Change password</h3>
        {formError && <div className="alert alert-danger" role="alert"><AlertCircle size={18} aria-hidden /><span>{formError}</span></div>}
        <TextField label="Current password" type="password" autoComplete="current-password" error={errors.currentPassword?.message} {...register("currentPassword")} />
        <div className="form-grid-2">
          <TextField label="New password" type="password" autoComplete="new-password" hint="8+ characters with a letter and a number" error={errors.newPassword?.message} {...register("newPassword")} />
          <TextField label="Repeat new password" type="password" autoComplete="new-password" error={errors.confirm?.message} {...register("confirm")} />
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="m-0 text-[0.85rem] text-ink-faint">You&apos;ll be logged out on every device afterwards.</p>
          <Button type="submit" loading={isSubmitting} icon={<KeyRound size={16} aria-hidden />}>Update password</Button>
        </div>
      </form>

      <div className="border-t border-line pt-6">
        <h3 className="mb-1 text-base">Sessions</h3>
        <p className="mb-4 text-[0.9rem] text-ink-soft">Lost a phone or used a shared computer? Log out everywhere, including this device.</p>
        <Button variant="clay" className="text-danger!" onClick={() => setConfirmAll(true)} icon={<LogOut size={16} aria-hidden />}>Log out of all devices</Button>
      </div>

      <ConfirmDialog open={confirmAll} title="Log out of all devices?" text="You'll be signed out here and everywhere else, and you'll need to log in again." confirmLabel="Log out everywhere" danger loading={busy} onConfirm={signOutEverywhere} onClose={() => setConfirmAll(false)} />
    </section>
  );
}

export default function SettingsPage() {
  return (
    <RequireAuth>
      <div className="mx-auto grid max-w-3xl gap-6">
        <div>
          <h1 className="mb-1">Settings</h1>
          <p className="m-0 text-ink-soft">Manage your profile, photo, wallets and password.</p>
        </div>
        <PhotoCard />
        <ProfileCard />
        <AccountCard />
        <WalletsCard />
        <SecurityCard />
      </div>
    </RequireAuth>
  );
}
