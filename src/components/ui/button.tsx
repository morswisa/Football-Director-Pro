import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "danger";
}

export function Button({ className, variant = "primary", ...props }: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex min-h-11 items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50",
        variant === "primary" && "bg-primary text-white shadow-sm hover:bg-primary-strong",
        variant === "secondary" && "border border-line bg-white text-foreground hover:bg-surface-muted",
        variant === "ghost" && "bg-transparent text-foreground hover:bg-surface-muted",
        variant === "danger" && "bg-danger text-white hover:brightness-95",
        className,
      )}
      {...props}
    />
  );
}
