import Link from "next/link";
import { ChevronLeft, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export type Tint = "mint" | "lilac" | "butter" | "peach" | "sky";

export const tintClass: Record<Tint, string> = {
  mint: "bg-mint",
  lilac: "bg-lilac",
  butter: "bg-butter",
  peach: "bg-peach",
  sky: "bg-sky",
};

/** Cadre d'écran de la maquette (`.screen`). */
export function Screen({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <main
      className={cn(
        "screen-in mx-auto flex min-h-dvh w-full max-w-[1180px] flex-col px-5 py-7 md:px-14 md:pt-11 md:pb-10",
        className,
      )}
    >
      {children}
    </main>
  );
}

export function BackLink({ href = "/", label = "Accueil" }: { href?: string; label?: string }) {
  return (
    <Link
      href={href}
      className="mb-5 inline-flex min-h-11 items-center gap-1.5 self-start text-[17px] text-ink-2"
    >
      <ChevronLeft size={18} strokeWidth={1.8} aria-hidden />
      {label}
    </Link>
  );
}

/** En-tête de page secondaire : pastille de couleur + titre + sous-titre. */
export function PageHead({
  icon: Icon,
  tint,
  title,
  subtitle,
}: {
  icon: LucideIcon;
  tint: Tint;
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="mb-7 flex items-center gap-[18px]">
      <div className={cn("grid size-16 flex-none place-items-center rounded-[18px]", tintClass[tint])}>
        <Icon size={32} strokeWidth={1.6} aria-hidden />
      </div>
      <div>
        <h1 className="text-[32px] leading-[1.1] font-bold tracking-[-0.02em] md:text-[40px]">{title}</h1>
        {subtitle ? <p className="mt-1.5 text-[17px] text-ink-2">{subtitle}</p> : null}
      </div>
    </div>
  );
}

export function SectionTitle({ children }: { children: ReactNode }) {
  return <h2 className="mt-9 mb-3 text-[22px] font-bold tracking-[-0.01em]">{children}</h2>;
}

/** Liste à séparateurs fins (`.list` / `.row`). */
export function List({
  children,
  ordered,
  className,
}: {
  children: ReactNode;
  ordered?: boolean;
  className?: string;
}) {
  const Tag = ordered ? "ol" : "ul";
  return <Tag className={cn("max-w-[760px] list-none border-t-[1.5px] border-line", className)}>{children}</Tag>;
}

export function Row({
  n,
  main,
  detail,
  meta,
  done,
  children,
}: {
  n?: number;
  main: ReactNode;
  detail?: ReactNode;
  meta?: ReactNode;
  done?: boolean;
  children?: ReactNode;
}) {
  return (
    <li className="border-b-[1.5px] border-line px-1 py-[18px] text-lg">
      <div className="flex items-center gap-[18px]">
        {n !== undefined ? <span className="w-7 text-ink-2 tabular-nums">{n}</span> : null}
        <span className={cn("min-w-0 flex-1", done && "text-ink-2 line-through decoration-1")}>
          {main}
          {detail ? <small className="mt-0.5 block text-[15px] text-ink-2">{detail}</small> : null}
        </span>
        {meta ? <span className="text-right text-base text-ink-2">{meta}</span> : null}
      </div>
      {children}
    </li>
  );
}

export function EmptyState({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="max-w-[760px] rounded-3xl border-[1.5px] border-line px-7 py-8">
      <p className="text-[19px] font-bold">{title}</p>
      {children ? <div className="mt-1.5 text-[17px] text-ink-2">{children}</div> : null}
    </div>
  );
}
