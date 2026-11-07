import type { FieldValues, Path, UseFormSetError } from "react-hook-form";
import { ApiError } from "./api";

/**
 * Turns an API error into field errors where it can, and returns a
 * form-level message for everything else (empty string = fully handled).
 */
export function handleFormError<T extends FieldValues>(
  err: unknown,
  setError: UseFormSetError<T>,
  fields: Path<T>[]
): string {
  if (!(err instanceof ApiError)) {
    return "Can't reach the server. Check your connection and try again.";
  }

  const place = (field: string, message: string) => {
    if (!(fields as string[]).includes(field)) return false;
    setError(field as Path<T>, { type: "server", message });
    return true;
  };

  switch (err.code) {
    case "VALIDATION_ERROR": {
      let placed = false;
      for (const [path, message] of Object.entries(err.fieldErrors)) {
        placed = place(path, message) || placed;
      }
      return placed ? "" : err.message;
    }
    case "EMAIL_TAKEN":
      return place("email", "An account with this email already exists")
        ? ""
        : err.message;
    case "PHONE_TAKEN":
      return place("phone", "An account with this phone number already exists")
        ? ""
        : err.message;
    case "RATE_LIMITED":
      return "Too many attempts. Wait a few minutes and try again.";
    default:
      return err.message;
  }
}
