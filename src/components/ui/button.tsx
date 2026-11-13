import { cva, type VariantProps } from "class-variance-authority";
import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

// Bouton shadcn restylé d'après la maquette (pilule noire `.cta`).
export const buttonVariants = cva(
  "inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-full font-medium transition-transform active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50",
  {
    variants: {
      variant: {
        primary: "bg-btn-bg text-btn-ink",
        outline: "border-[1.5px] border-line bg-transparent text-ink",
        selected: "border-[1.5px] border-ink bg-ink text-bg",
        ghost: "bg-transparent text-ink-2 underline-offset-4 hover:underline",
        danger: "border-[1.5px] border-line bg-transparent text-danger",
      },
      size: {
        lg: "px-[30px] py-4 text-lg",
        md: "px-5 py-2.5 text-base",
        sm: "px-4 py-2 text-[15px]",
      },
    },
    defaultVariants: { variant: "primary", size: "lg" },
  },
);

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof buttonVariants>;

export function Button({ className, variant, size, ...props }: ButtonProps) {
  return <button className={cn(buttonVariants({ variant, size }), className)} {...props} />;
}
