import type {
  InputHTMLAttributes,
  LabelHTMLAttributes,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from "react";
import { cn } from "@/lib/utils";

const control =
  "min-h-11 w-full rounded-2xl border-[1.5px] border-line bg-bg px-4 py-2.5 text-[17px] text-ink placeholder:text-ink-2";

export function Label({ className, ...props }: LabelHTMLAttributes<HTMLLabelElement>) {
  return <label className={cn("mb-1.5 block text-[15px] text-ink-2", className)} {...props} />;
}

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(control, className)} {...props} />;
}

export function Select({ className, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className={cn(control, "appearance-auto", className)} {...props} />;
}

export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cn(control, "min-h-24", className)} {...props} />;
}

export function FormMessage({ kind, children }: { kind: "error" | "success"; children?: string | null }) {
  if (!children) return null;
  return (
    <p
      role={kind === "error" ? "alert" : "status"}
      className={cn("mt-3 text-[15px]", kind === "error" ? "text-danger" : "text-ink")}
    >
      {kind === "error" ? "⚠ " : "✓ "}
      {children}
    </p>
  );
}
