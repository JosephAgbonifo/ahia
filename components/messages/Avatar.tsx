import { cx } from "@/lib/cx";

export function PersonAvatar({ name, src, size = "md" }: { name: string; src: string | null; size?: "sm" | "md" }) {
  return (
    <span className={cx("grid flex-none place-items-center overflow-hidden rounded-full bg-linear-to-br from-brand-300 to-brand-500 font-heading font-extrabold text-on-primary", size === "md" ? "size-11" : "size-9 text-[0.8rem]")}>
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt="" className="size-full object-cover" />
      ) : (
        (name[0] ?? "?").toUpperCase()
      )}
    </span>
  );
}
