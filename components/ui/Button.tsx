import Link from "next/link";
import { Loader2 } from "lucide-react";
import {
  forwardRef,
  type ButtonHTMLAttributes,
  type ComponentProps,
  type ReactNode,
} from "react";
import { cx } from "@/lib/cx";

type Variant = "primary" | "clay" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

interface StyleProps {
  variant?: Variant;
  size?: Size;
  block?: boolean;
  icon?: ReactNode;
}

export function buttonClass({
  variant = "primary",
  size = "md",
  block = false,
}: StyleProps = {}) {
  return cx(
    "btn",
    `btn-${variant}`,
    size !== "md" && `btn-${size}`,
    block && "btn-block"
  );
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement>, StyleProps {
  loading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant, size, block, icon, loading, className, disabled, type = "button", children, ...rest },
  ref
) {
  return (
    <button
      ref={ref}
      type={type}
      className={cx(buttonClass({ variant, size, block }), className)}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...rest}
    >
      {loading ? <Loader2 className="spin" size={18} aria-hidden /> : icon}
      {children}
    </button>
  );
});

type LinkProps = Omit<ComponentProps<typeof Link>, "href"> & StyleProps & { href: string };

export function ButtonLink({ variant, size, block, icon, className, children, href, ...rest }: LinkProps) {
  return (
    <Link href={href} className={cx(buttonClass({ variant, size, block }), className)} {...rest}>
      {icon}
      {children}
    </Link>
  );
}
