import { Fragment, type ReactNode } from "react";
import { FileText } from "lucide-react";
import { Difficulty } from "@/components/ui/difficulty";
import { GENRE_LABEL, type Genre } from "./domain/catalog-search";

/** Pastille « Partition » : un PDF est disponible pour ce morceau. */
export function ScoreBadge() {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-mint px-2 py-0.5 text-[13px] leading-5 font-medium text-ink">
      <FileText size={13} strokeWidth={2} aria-hidden />
      Partition
    </span>
  );
}

/** Ligne d'infos d'un morceau : compositeur · genre · difficulté, et pastille si partition. */
export function PieceInfo({
  composer,
  genre,
  level,
  hasScore = false,
}: {
  composer?: string;
  genre: Genre;
  level: number | null;
  hasScore?: boolean;
}) {
  const parts: ReactNode[] = [];
  if (composer) parts.push(composer);
  if (genre !== "other") parts.push(GENRE_LABEL[genre]);
  if (level) parts.push(<Difficulty level={level} />);
  return (
    <span className="inline-flex flex-wrap items-center gap-x-1.5 gap-y-1">
      {parts.map((part, i) => (
        <Fragment key={i}>
          {i > 0 ? <span aria-hidden>·</span> : null}
          {part}
        </Fragment>
      ))}
      {hasScore ? <ScoreBadge /> : null}
    </span>
  );
}
