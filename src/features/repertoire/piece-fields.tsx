import { Input, Label, Select, Textarea } from "@/components/ui/field";
import { PIECE_STATUS_LABEL, STYLE_LABEL, TIER_LABEL } from "@/lib/domain/domains";

export interface PieceValues {
  title: string;
  composer: string;
  style: string;
  tier: string;
  status: string;
  level: number | null;
  feltDifficulty: number | null;
  currentStep: string;
  notes: string;
  sourceUrl: string | null;
}

const scale = [1, 2, 3, 4, 5];

/** Champs communs à l'ajout et à la modification d'un morceau. */
export function PieceFields({ values }: { values?: PieceValues }) {
  return (
    <div className="grid max-w-[760px] gap-4 md:grid-cols-2">
      <div className="md:col-span-2">
        <Label htmlFor="title">Titre</Label>
        <Input id="title" name="title" required maxLength={200} defaultValue={values?.title} />
      </div>
      <div>
        <Label htmlFor="composer">Compositeur</Label>
        <Input id="composer" name="composer" maxLength={120} defaultValue={values?.composer} />
      </div>
      <div>
        <Label htmlFor="style">Style</Label>
        <Select id="style" name="style" defaultValue={values?.style ?? "classical"}>
          {Object.entries(STYLE_LABEL).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </Select>
      </div>
      <div>
        <Label htmlFor="status">Statut</Label>
        <Select id="status" name="status" defaultValue={values?.status ?? "active"}>
          {Object.entries(PIECE_STATUS_LABEL).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </Select>
      </div>
      <div>
        <Label htmlFor="tier">Pour toi, c’est une pièce…</Label>
        <Select id="tier" name="tier" defaultValue={values?.tier ?? "growth"}>
          {Object.entries(TIER_LABEL).map(([value, label]) => (
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
      <div>
        <Label htmlFor="feltDifficulty">Difficulté ressentie</Label>
        <Select id="feltDifficulty" name="feltDifficulty" defaultValue={values?.feltDifficulty ?? ""}>
          <option value="">Non précisée</option>
          {scale.map((n) => (
            <option key={n} value={n}>
              {n} sur 5
            </option>
          ))}
        </Select>
      </div>
      <div className="md:col-span-2">
        <Label htmlFor="currentStep">Étape en cours</Label>
        <Input
          id="currentStep"
          name="currentStep"
          maxLength={200}
          placeholder="Mesures 9 à 16, mains séparées…"
          defaultValue={values?.currentStep}
        />
      </div>
      <div className="md:col-span-2">
        <Label htmlFor="sourceUrl">Lien de référence</Label>
        <Input id="sourceUrl" name="sourceUrl" type="url" placeholder="https://…" defaultValue={values?.sourceUrl ?? ""} />
      </div>
      <div className="md:col-span-2">
        <Label htmlFor="notes">Notes</Label>
        <Textarea id="notes" name="notes" maxLength={4000} defaultValue={values?.notes} />
      </div>
    </div>
  );
}
