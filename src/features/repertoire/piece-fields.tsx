import { Input, Label, Select, Textarea } from "@/components/ui/field";
import { PIECE_STATUS_LABEL } from "@/lib/domain/domains";
import { GENRE_LABEL, type Genre } from "./domain/catalog-search";

export interface PieceValues {
  title: string;
  composer: string;
  genre: Genre;
  status: string;
  level: number | null;
  currentStep: string;
  notes: string;
  sourceUrl: string | null;
}

const scale = [1, 2, 3, 4, 5];

/**
 * Champs communs à l'ajout et à la modification d'un morceau.
 * Le statut n'est demandé qu'à l'ajout : ensuite il se change d'un geste en haut de la fiche.
 */
export function PieceFields({ values, withStatus = false }: { values?: Partial<PieceValues>; withStatus?: boolean }) {
  return (
    <div className="grid max-w-[760px] gap-4 md:grid-cols-2">
      <div className="md:col-span-2">
        <Label htmlFor="title">Titre</Label>
        <Input id="title" name="title" required maxLength={200} defaultValue={values?.title} />
      </div>
      <div className="md:col-span-2">
        <Label htmlFor="composer">Compositeur</Label>
        <Input id="composer" name="composer" maxLength={120} defaultValue={values?.composer} />
      </div>
      <div>
        <Label htmlFor="genre">Genre</Label>
        <Select id="genre" name="genre" defaultValue={values?.genre ?? "other"}>
          {Object.entries(GENRE_LABEL).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </Select>
      </div>
      <div>
        <Label htmlFor="level">Difficulté estimée</Label>
        <Select id="level" name="level" defaultValue={values?.level ?? ""}>
          <option value="">Non précisée</option>
          {scale.map((n) => (
            <option key={n} value={n}>
              {n} sur 5
            </option>
          ))}
        </Select>
      </div>
      {withStatus ? (
        <div className="md:col-span-2">
          <Label htmlFor="status">Je veux…</Label>
          <Select id="status" name="status" defaultValue={values?.status ?? "to_discover"}>
            <option value="to_discover">Le garder pour plus tard ({PIECE_STATUS_LABEL.to_discover.toLowerCase()})</option>
            <option value="active">Le travailler dès maintenant ({PIECE_STATUS_LABEL.active.toLowerCase()})</option>
          </Select>
        </div>
      ) : (
        <div className="md:col-span-2">
          <Label htmlFor="currentStep">Étape en cours (si le morceau n’est pas découpé en passages)</Label>
          <Input
            id="currentStep"
            name="currentStep"
            maxLength={200}
            placeholder="Mesures 9 à 16, mains séparées…"
            defaultValue={values?.currentStep}
          />
        </div>
      )}
      <div className="md:col-span-2">
        <Label htmlFor="sourceUrl">Lien (partition en ligne, vidéo…)</Label>
        <Input id="sourceUrl" name="sourceUrl" type="url" placeholder="https://…" defaultValue={values?.sourceUrl ?? ""} />
      </div>
      <div className="md:col-span-2">
        <Label htmlFor="notes">Notes</Label>
        <Textarea id="notes" name="notes" maxLength={4000} defaultValue={values?.notes} />
      </div>
    </div>
  );
}
