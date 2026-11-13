"use client";

import { useActionState, type ReactNode } from "react";
import { useFormStatus } from "react-dom";
import type { ActionState } from "@/lib/action";
import { Button, type ButtonProps } from "@/components/ui/button";
import { FormMessage } from "@/components/ui/field";

type Action = (prev: ActionState, formData: FormData) => Promise<ActionState>;

/** Formulaire relié à une server action, avec message de succès ou d'erreur en français. */
export function ActionForm({
  action,
  children,
  className,
}: {
  action: Action;
  children: ReactNode;
  className?: string;
}) {
  const [state, formAction] = useActionState(action, null);
  return (
    <form action={formAction} className={className}>
      {children}
      <FormMessage kind={state?.ok ? "success" : "error"}>{state?.message}</FormMessage>
    </form>
  );
}

/** Bouton d'envoi : désactivé et libellé d'attente pendant l'action. */
export function SubmitButton({
  children,
  pendingLabel = "Un instant…",
  ...props
}: ButtonProps & { pendingLabel?: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} aria-busy={pending} {...props}>
      {pending ? pendingLabel : children}
    </Button>
  );
}
