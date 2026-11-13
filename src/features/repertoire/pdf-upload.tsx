"use client";

import { useRef, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { FormMessage, Label } from "@/components/ui/field";
import { createClient } from "@/lib/supabase/client";
import { PDF_MAX_BYTES } from "@/lib/validation/schemas";
import { registerPdf } from "./server/actions";

/**
 * Envoi direct du PDF vers le bucket privé (les fonctions Vercel limitent la taille des
 * requêtes), puis enregistrement des métadonnées par le serveur, qui revérifie le fichier.
 */
export function PdfUpload({ pieceId, userId, hasPdf }: { pieceId: string; userId: string; hasPdf: boolean }) {
  const input = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, startTransition] = useTransition();

  function upload() {
    const file = input.current?.files?.[0];
    if (!file) return setMessage({ ok: false, text: "Choisis d’abord un fichier PDF." });
    if (file.type !== "application/pdf") return setMessage({ ok: false, text: "Seuls les fichiers PDF sont acceptés." });
    if (file.size > PDF_MAX_BYTES) return setMessage({ ok: false, text: "Ce fichier dépasse 20 Mo." });

    setMessage(null);
    startTransition(async () => {
      const assetId = crypto.randomUUID();
      const { error } = await createClient()
        .storage.from("personal-scores")
        .upload(`${userId}/${assetId}.pdf`, file, { contentType: "application/pdf", upsert: false });
      if (error) {
        setMessage({ ok: false, text: "L’envoi a échoué. Vérifie ta connexion et réessaie." });
        return;
      }
      const data = new FormData();
      data.set("pieceId", pieceId);
      data.set("assetId", assetId);
      data.set("filename", file.name.slice(0, 200));
      const result = await registerPdf(null, data);
      setMessage(result ? { ok: result.ok, text: result.message } : null);
      if (result?.ok && input.current) input.current.value = "";
    });
  }

  return (
    <div className="max-w-[760px]">
      <Label htmlFor="pdf">{hasPdf ? "Remplacer la partition (PDF, 20 Mo max)" : "Importer une partition (PDF, 20 Mo max)"}</Label>
      <div className="flex flex-wrap items-center gap-3">
        <input
          ref={input}
          id="pdf"
          type="file"
          accept="application/pdf"
          disabled={pending}
          className="min-h-11 max-w-full text-[17px] file:mr-3 file:min-h-11 file:rounded-full file:border-[1.5px] file:border-solid file:border-line file:bg-transparent file:px-5 file:text-ink"
        />
        <Button type="button" variant="outline" size="md" onClick={upload} disabled={pending} aria-busy={pending}>
          {pending ? "Envoi en cours…" : "Envoyer"}
        </Button>
      </div>
      <p className="mt-2 text-[15px] text-ink-2">
        N’importe que des partitions que tu possèdes ou qui sont libres de droits. Le fichier reste privé.
      </p>
      <FormMessage kind={message?.ok ? "success" : "error"}>{message?.text}</FormMessage>
    </div>
  );
}
