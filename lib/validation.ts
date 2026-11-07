import { z } from "zod";

/** These mirror the API's rules so users get instant feedback. */

export const emailSchema = z
  .string()
  .trim()
  .min(1, "Enter your email")
  .max(255, "Email is too long")
  .email("Enter a valid email address");

export const passwordSchema = z
  .string()
  .min(8, "Use at least 8 characters")
  .max(72, "Use 72 characters or fewer")
  .regex(/[A-Za-z]/, "Include at least one letter")
  .regex(/\d/, "Include at least one number");

const name = (label: string) =>
  z
    .string()
    .trim()
    .min(1, `Enter your ${label}`)
    .max(80, "Use 80 characters or fewer");

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Enter your password"),
});
export type LoginValues = z.infer<typeof loginSchema>;

export const registerSchema = z.object({
  firstName: name("first name"),
  lastName: name("last name"),
  email: emailSchema,
  password: passwordSchema,
  universityId: z.string().min(1, "Choose your university"),
  phone: z
    .string()
    .optional()
    .refine(
      (v) => !v || /^\+?\d{7,15}$/.test(v.replace(/[\s\-()]/g, "")),
      "Use 7 to 15 digits, with an optional leading +"
    ),
});
export type RegisterValues = z.infer<typeof registerSchema>;

export const forgotSchema = z.object({ email: emailSchema });
export type ForgotValues = z.infer<typeof forgotSchema>;

export const resetSchema = z.object({ password: passwordSchema });
export type ResetValues = z.infer<typeof resetSchema>;

export const ID_TYPES = [
  { value: "national_id", label: "National ID" },
  { value: "passport", label: "International passport" },
  { value: "drivers_license", label: "Driver's licence" },
  { value: "student_id", label: "Student ID" },
  { value: "voters_card", label: "Voter's card" },
] as const;

export const kycSchema = z.object({
  idType: z.string().min(1, "Choose an ID type"),
  idNumber: z
    .string()
    .trim()
    .min(4, "Enter at least 4 characters")
    .max(40, "Use 40 characters or fewer"),
});
export type KycValues = z.infer<typeof kycSchema>;

export const CONDITIONS = [
  { value: "new", label: "New" },
  { value: "like_new", label: "Like new" },
  { value: "used", label: "Used" },
  { value: "refurbished", label: "Refurbished" },
] as const;

/** Product form rules (price in major units, as the API expects). Edit allows stock 0. */
export const productSchema = (editing: boolean) =>
  z.object({
    title: z.string().trim().min(3, "Use at least 3 characters").max(200, "Use 200 characters or fewer"),
    categoryId: z.string().min(1, "Choose a category"),
    condition: z.string().min(1, "Choose a condition"),
    price: z
      .string()
      .trim()
      .min(1, "Enter a price")
      .refine((v) => /^\d+(\.\d{1,2})?$/.test(v), "Use numbers only, with at most 2 decimal places")
      .refine((v) => Number(v) > 0, "Price must be greater than 0"),
    stock: z
      .string()
      .trim()
      .min(1, "Enter how many you have")
      .refine((v) => /^\d+$/.test(v), "Use a whole number")
      .refine((v) => Number(v) >= (editing ? 0 : 1) && Number(v) <= 10000, editing ? "Use a number from 0 to 10,000" : "Use a number from 1 to 10,000"),
    description: z.string().max(5000, "Use 5,000 characters or fewer").optional(),
  });
export type ProductValues = z.infer<ReturnType<typeof productSchema>>;

export const bankAccountSchema = z.object({
  bankName: z.string().trim().min(2, "Enter the bank name").max(120, "Use 120 characters or fewer"),
  bankCode: z.string().trim().max(20, "Use 20 characters or fewer").optional(),
  accountNumber: z.string().trim().regex(/^\d{6,20}$/, "Use 6 to 20 digits, numbers only"),
  accountName: z.string().trim().min(2, "Enter the name on the account").max(150, "Use 150 characters or fewer"),
});
export type BankAccountValues = z.infer<typeof bankAccountSchema>;

export const xrpAccountSchema = z.object({
  address: z.string().trim().regex(/^r[1-9A-HJ-NP-Za-km-z]{24,34}$/, "Enter a classic XRPL address starting with r"),
  destinationTag: z
    .string()
    .trim()
    .optional()
    .refine((v) => !v || (/^\d+$/.test(v) && Number(v) <= 4294967295), "Use a whole number from 0 to 4294967295"),
});
export type XrpAccountValues = z.infer<typeof xrpAccountSchema>;

export const profileSchema = z.object({
  firstName: name("first name"),
  lastName: name("last name"),
  displayName: z.string().trim().min(1, "Enter a display name").max(100, "Use 100 characters or fewer"),
  campusLocation: z.string().trim().max(150, "Use 150 characters or fewer").optional(),
  bio: z.string().max(500, "Use 500 characters or fewer").optional(),
  phone: z
    .string()
    .optional()
    .refine((v) => !v || /^\+?\d{7,15}$/.test(v.replace(/[\s\-()]/g, "")), "Use 7 to 15 digits, with an optional leading +"),
});
export type ProfileValues = z.infer<typeof profileSchema>;

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Enter your current password"),
    newPassword: passwordSchema,
    confirm: z.string().min(1, "Repeat your new password"),
  })
  .refine((v) => v.newPassword === v.confirm, { message: "Passwords don't match", path: ["confirm"] });
export type ChangePasswordValues = z.infer<typeof changePasswordSchema>;

export const categorySchema = z.object({
  name: z.string().trim().min(2, "Use at least 2 characters").max(100, "Use 100 characters or fewer"),
  parentId: z.string().optional(),
  position: z
    .string()
    .trim()
    .optional()
    .refine((v) => !v || /^-?\d+$/.test(v), "Use a whole number"),
});
export type CategoryValues = z.infer<typeof categorySchema>;

export const universitySchema = z.object({
  countryCode: z.string().trim().regex(/^[A-Za-z]{2}$/, "Use a 2 letter country code, e.g. NG or CA"),
  name: z.string().trim().min(3, "Use at least 3 characters").max(200, "Use 200 characters or fewer"),
  shortName: z.string().trim().max(30, "Use 30 characters or fewer").optional(),
  city: z.string().trim().max(100, "Use 100 characters or fewer").optional(),
});
export type UniversityValues = z.infer<typeof universitySchema>;

export const pickupSchema = z.object({
  universityId: z.string().min(1, "Choose a university"),
  name: z.string().trim().min(2, "Use at least 2 characters").max(150, "Use 150 characters or fewer"),
  description: z.string().trim().max(300, "Use 300 characters or fewer").optional(),
});
export type PickupValues = z.infer<typeof pickupSchema>;
